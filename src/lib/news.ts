import type { NewsSettings, NewsSource, NewsTopic } from "./settings";

export type NewsItem = {
  id: string;
  title: string;
  url: string;
  source: string;
  publishedAt: number;
  topic: NewsTopic;
  excerpt?: string;
  /** Article photo from the feed (media:content / enclosure / first <img>). */
  image?: string;
  /** Hostname the story comes from — used for the source logo. */
  host: string;
};

export type NewsResult = {
  items: NewsItem[];
  provider: NewsSource;
  /** Set when the source could not be reached; items is then empty unless we have a saved copy. */
  error?: string;
  /** True when the items come from the last successful load (the source is currently unreachable). */
  stale?: boolean;
};

const TOPIC_LABEL: Record<NewsTopic, { ru: string; en: string }> = {
  top: { ru: "Главное", en: "Top" },
  tech: { ru: "Технологии", en: "Technology" },
  ai: { ru: "ИИ", en: "AI" },
  science: { ru: "Наука", en: "Science" },
  business: { ru: "Бизнес", en: "Business" },
  world: { ru: "В мире", en: "World" },
  culture: { ru: "Культура", en: "Culture" },
  sport: { ru: "Спорт", en: "Sport" },
};

export const topicLabel = (topic: NewsTopic, lang: "ru" | "en") => TOPIC_LABEL[topic][lang];

export const TOPIC_COLOR: Record<NewsTopic, string> = {
  top: "var(--primary)",
  tech: "var(--tertiary)",
  ai: "var(--secondary)",
  science: "var(--primary)",
  business: "var(--tertiary)",
  world: "var(--secondary)",
  culture: "var(--tertiary)",
  sport: "var(--primary)",
};

function stripHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  return (doc.body.textContent || "").replace(/\s+/g, " ").trim();
}

function safeUrl(raw: string): string {
  try {
    const url = new URL(raw.trim());
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : "";
  } catch {
    return "";
  }
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function classify(title: string): NewsTopic {
  if (/(\bai\b|нейросет|искусственн|llm|gpt|model|машинн\w+ обучен|openai|anthropic|chatgpt|gemini|claude)/i.test(title)) return "ai";
  if (/(iphone|android|pixel|phone|smartphone|apple|google|game|gaming|gta|console|laptop|chip|code|github|software|web|browser|tech|технолог|телефон|смартфон|игр|гта|приставк|процессор|приложен|интернет)/i.test(title)) return "tech";
  if (/(space|science|climate|наук|космос|климат|исслед|физик)/i.test(title)) return "science";
  if (/(market|business|startup|компан|рынок|бизнес|стартап|эконом)/i.test(title)) return "business";
  if (/(sport|football|tennis|олимп|спорт|футбол|теннис)/i.test(title)) return "sport";
  if (/(film|music|art|design|культур|музык|искусств|дизайн|кино)/i.test(title)) return "culture";
  return "top";
}

/** Per-route budget: a proxy that hangs is abandoned after this long instead of stalling the feed. */
const ROUTE_TIMEOUT_MS = 4500;

type Route = { name: string; href: string; decode: "xml" | "allorigins" | "rss2json" };

/**
 * Every way we know to read a public URL from a web page, in no particular order: the direct request
 * (works inside the extension, which has host permissions), two CORS relays that return the body as-is,
 * the allorigins JSON wrapper and the rss2json converter (keyless, CORS open, answers RSS as JSON).
 */
/** A unique query string per manual refresh: most relays cache by full URL, so this is what
 *  makes the refresh button return genuinely new stories instead of the same cached feed. */
function withBust(url: string, bust?: string): string {
  if (!bust) return url;
  try {
    const parsed = new URL(url);
    parsed.searchParams.set("lisyan_ts", bust);
    return parsed.href;
  } catch {
    return `${url}${url.includes("?") ? "&" : "?"}lisyan_ts=${bust}`;
  }
}

function routesFor(url: string, includeRss2json: boolean): Route[] {
  const enc = encodeURIComponent(url);
  const routes: Route[] = [{ name: "direct", href: url, decode: "xml" }];
  routes.push({ name: "corsproxy", href: `https://corsproxy.io/?${enc}`, decode: "xml" });
  routes.push({ name: "codetabs", href: `https://api.codetabs.com/v1/proxy?quest=${enc}`, decode: "xml" });
  routes.push({ name: "allorigins", href: `https://api.allorigins.win/get?url=${enc}`, decode: "allorigins" });
  if (includeRss2json) routes.push({ name: "rss2json", href: `https://api.rss2json.com/v1/api.json?rss_url=${enc}`, decode: "rss2json" });
  return routes;
}

/** Runs jobs in parallel and resolves with the first success; the rest are cancelled. */
async function firstSuccess<T>(jobs: ((signal: AbortSignal) => Promise<T>)[], outer: AbortSignal): Promise<T> {
  const master = new AbortController();
  const onOuter = () => master.abort();
  outer.addEventListener("abort", onOuter, { once: true });
  try {
    return await Promise.any(
      jobs.map((job) => {
        const own = new AbortController();
        const timer = setTimeout(() => own.abort(), ROUTE_TIMEOUT_MS);
        const relay = () => own.abort();
        master.signal.addEventListener("abort", relay, { once: true });
        return job(own.signal).finally(() => {
          clearTimeout(timer);
          master.signal.removeEventListener("abort", relay);
        });
      }),
    );
  } catch (error) {
    if (error instanceof AggregateError) throw new Error("unreachable");
    throw error;
  } finally {
    master.abort();
    outer.removeEventListener("abort", onOuter);
  }
}

async function readBody(route: Route, response: Response): Promise<string> {
  const body = await response.text();
  if (route.decode !== "allorigins") return body;
  const contents = (JSON.parse(body) as { contents?: string | null }).contents;
  if (!contents) throw new Error("empty relay");
  return contents;
}

/** Fetches a feed and returns its items. Resolves only when a route yields real entries. */
async function fetchFeedItems(url: string, settings: NewsSettings, signal: AbortSignal, raw = false, bust?: string): Promise<NewsItem[]> {
  const jobs = routesFor(withBust(url, bust), true).map((route) => async (s: AbortSignal) => {
    const response = await fetch(route.href, { signal: s, cache: "no-store", headers: { Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, application/json, */*" } });
    if (!response.ok) throw new Error(String(response.status));
    if (route.decode === "rss2json") {
      const json = (await response.json()) as { status?: string; items?: Rss2JsonItem[] };
      if (json.status !== "ok" || !json.items?.length) throw new Error("rss2json");
      const items = itemsFromRss2Json(json.items, settings, raw);
      if (!items.length) throw new Error("no items");
      return items;
    }
    const items = parseFeed(await readBody(route, response), settings, raw);
    if (!items.length) throw new Error("no items");
    return items;
  });
  return firstSuccess(jobs, signal);
}

/** Fetches any text page (article HTML) through the same race. */
async function fetchText(url: string, signal: AbortSignal): Promise<string> {
  const jobs = routesFor(url, false).map((route) => async (s: AbortSignal) => {
    const response = await fetch(route.href, { signal: s, cache: "no-store", headers: { Accept: "text/html, application/xml, */*" } });
    if (!response.ok) throw new Error(String(response.status));
    const body = await readBody(route, response);
    if (!body.trim()) throw new Error("empty");
    return body;
  });
  return firstSuccess(jobs, signal);
}

type Rss2JsonItem = { title?: string; link?: string; pubDate?: string; description?: string; content?: string; thumbnail?: string; enclosure?: { link?: string; type?: string } | string };

function itemsFromRss2Json(list: Rss2JsonItem[], settings: NewsSettings, raw = false): NewsItem[] {
  const out: NewsItem[] = [];
  for (const row of list.slice(0, 30)) {
    const url = safeUrl(row.link ?? "");
    const rawTitle = stripHtml(row.title ?? "");
    if (!url || !rawTitle) continue;
    // Google News titles end with " - Publisher"; split it off so the card shows the real outlet.
    const dash = rawTitle.lastIndexOf(" - ");
    const source = dash > 20 ? rawTitle.slice(dash + 3).trim() : hostOf(url);
    const title = dash > 20 ? rawTitle.slice(0, dash).trim() : rawTitle;
    const published = Date.parse((row.pubDate ?? "").replace(" ", "T") + (row.pubDate?.includes("Z") || row.pubDate?.includes("+") ? "" : "Z")) || Date.now();
    const html = row.description || row.content || "";
    const enclosureUrl = typeof row.enclosure === "object" ? row.enclosure?.link : undefined;
    const image = [row.thumbnail, enclosureUrl, html.match(/<img[^>]+src=["']([^"']+)["']/i)?.[1]].find((u): u is string => Boolean(u && /^https?:/.test(u)));
    const excerpt = stripHtml(html).slice(0, 180);
    out.push({ id: `${url}-${published}`, title, url, source, host: hostOf(url) === "news.google.com" ? sourceHost(source) : hostOf(url), publishedAt: published, topic: classify(title), excerpt: excerpt && excerpt !== title ? excerpt : undefined, image });
  }
  return raw ? out : rankTopics(out, settings);
}

/** Best-effort domain for a publisher name, so its logo can still be shown. */
const sourceHost = (name: string) => {
  const known = PUBLISHERS.find((p) => p.name.toLowerCase() === name.toLowerCase());
  if (known) return hostOf(known.feeds.en);
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "");
  return slug ? `${slug}.com` : "news.google.com";
};

/* ---------- images ---------- */

const IMAGE_CACHE = "lisyan_news_img:";

/** Picks a photo out of an RSS/Atom entry if the feed ships one. */
function feedImage(entry: Element, descriptionHtml: string): string | undefined {
  for (const node of Array.from(entry.getElementsByTagNameNS("*", "content"))) {
    const url = node.getAttribute("url");
    if (url && /^https?:/.test(url) && (node.getAttribute("medium") === "image" || node.getAttribute("type")?.startsWith("image") || /\.(jpe?g|png|webp|gif|avif)(\?|$)/i.test(url))) return url;
  }
  const thumb = entry.getElementsByTagNameNS("*", "thumbnail")[0]?.getAttribute("url");
  if (thumb && /^https?:/.test(thumb)) return thumb;
  const enclosure = entry.querySelector("enclosure");
  const enclosureUrl = enclosure?.getAttribute("url");
  if (enclosureUrl && /^https?:/.test(enclosureUrl) && (enclosure?.getAttribute("type")?.startsWith("image") || /\.(jpe?g|png|webp|gif|avif)(\?|$)/i.test(enclosureUrl))) return enclosureUrl;
  const match = descriptionHtml.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (match && /^https?:/.test(match[1]) && !/1x1|pixel|spacer|track/i.test(match[1])) return match[1];
  return undefined;
}

/** Logo of the publisher — always available, used behind the photo and when there is none. */
export const sourceLogo = (host: string, size = 128) => `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=${size}`;

/**
 * Resolves the article's own og:image when the feed had no photo (Google News and Hacker News
 * never include one). The page is fetched through the proxy, only the <head> is scanned, and the
 * answer is cached per URL so a refresh costs nothing.
 */
export async function resolveArticleImage(item: NewsItem, signal?: AbortSignal): Promise<string | null> {
  if (item.image) return item.image;
  const key = IMAGE_CACHE + item.url;
  try {
    const cached = sessionStorage.getItem(key);
    if (cached !== null) return cached || null;
  } catch {
    // ignore
  }
  let result: string | null = null;
  try {
    const html = await fetchText(item.url, signal ?? new AbortController().signal);
    const head = html.slice(0, 200_000);
    const meta =
      head.match(/<meta[^>]+property=["']og:image(?::secure_url)?["'][^>]+content=["']([^"']+)["']/i) ||
      head.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image(?::secure_url)?["']/i) ||
      head.match(/<meta[^>]+name=["']twitter:image(?::src)?["'][^>]+content=["']([^"']+)["']/i) ||
      head.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image(?::src)?["']/i) ||
      head.match(/<link[^>]+rel=["']image_src["'][^>]+href=["']([^"']+)["']/i);
    if (meta) {
      const raw = meta[1].replace(/&amp;/g, "&");
      try {
        const abs = new URL(raw, item.url).href;
        if (/^https?:/.test(abs)) result = abs;
      } catch {
        // malformed
      }
    }
  } catch {
    // unreachable page — leave null
  }
  try {
    sessionStorage.setItem(key, result ?? "");
  } catch {
    // ignore quota
  }
  return result;
}


function parseFeed(xml: string, settings: NewsSettings, raw = false): NewsItem[] {
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  const entries = [...doc.querySelectorAll("item, entry")];
  const items: NewsItem[] = [];
  for (const entry of entries) {
    const title = stripHtml(entry.querySelector("title")?.textContent ?? "");
    const rawLink = entry.querySelector("link")?.getAttribute("href") || entry.querySelector("link")?.textContent || "";
    const url = safeUrl(rawLink);
    if (!title || !url) continue;
    const published = Date.parse(entry.querySelector("pubDate")?.textContent || entry.querySelector("published")?.textContent || entry.querySelector("updated")?.textContent || "") || Date.now();
    const sourceNode = entry.querySelector("source");
    const source = stripHtml(sourceNode?.textContent ?? "") || hostOf(url);
    const sourceUrl = sourceNode?.getAttribute("url") || "";
    const host = (sourceUrl && hostOf(sourceUrl)) || (hostOf(url) === "news.google.com" ? "" : hostOf(url));
    const descriptionHtml = entry.querySelector("description")?.textContent || entry.querySelector("summary")?.textContent || entry.querySelector("content")?.textContent || "";
    const esc = source.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const excerpt = stripHtml(descriptionHtml).replace(new RegExp(`\\s*${esc}\\s*$`), "").slice(0, 180);
    const cleanTitle = title.replace(new RegExp(`\\s+[-–—]\\s+${esc}$`), "");
    items.push({ id: `${url}-${published}`, title: cleanTitle, url, source, host: host || hostOf(url), publishedAt: published, topic: classify(cleanTitle), excerpt: excerpt && excerpt !== cleanTitle ? excerpt : undefined, image: feedImage(entry, descriptionHtml) });
    if (items.length >= 120) break;
  }
  return raw ? items : rankTopics(items, settings);
}

async function hackerNews(settings: NewsSettings, signal: AbortSignal, raw = false): Promise<NewsItem[]> {
  const top = await fetch("https://hacker-news.firebaseio.com/v0/topstories.json", { signal });
  if (!top.ok) throw new Error("HN unavailable");
  const ids = ((await top.json()) as number[]).slice(0, 24);
  const rows = await Promise.all(
    ids.map(async (id) => {
      try {
        const response = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`, { signal });
        return (await response.json()) as { id: number; title?: string; url?: string; time?: number; dead?: boolean; deleted?: boolean; type?: string; score?: number };
      } catch {
        return null;
      }
    }),
  );
  const items = rows
    .filter((row): row is NonNullable<typeof row> => Boolean(row?.title && !row.dead && !row.deleted && row.type !== "job"))
    .map((row) => {
      const url = safeUrl(row.url || `https://news.ycombinator.com/item?id=${row.id}`);
      return {
        id: `hn-${row.id}`,
        title: row.title!,
        url,
        source: hostOf(url) === "news.ycombinator.com" ? "Hacker News" : hostOf(url),
        host: hostOf(url),
        publishedAt: (row.time ?? Math.floor(Date.now() / 1000)) * 1000,
        topic: classify(row.title!),
      } satisfies NewsItem;
    })
    .filter((item) => item.url);
  return raw ? items : rankTopics(items, settings);
}
function rankTopics(items: NewsItem[], settings: NewsSettings): NewsItem[] {
  const wanted = new Set(settings.topics.length ? settings.topics : (["top"] as NewsTopic[]));
  const matching = items.filter((item) => wanted.has(item.topic) || item.topic === "top" || wanted.has("top"));
  const pool = matching.length >= Math.min(settings.count, 4) ? matching : items;
  return pool.slice(0, Math.max(settings.count * 2, 90));
}

/* ---------- catalogue of publishers (all public RSS with photos where the feed offers them) ---------- */

type Publisher = { id: Exclude<NewsSource, "mix" | "google" | "hackernews">; name: string; feeds: { ru?: string; en: string }; topics: NewsTopic[] };

export const PUBLISHERS: Publisher[] = [
  { id: "bbc", name: "BBC News", feeds: { ru: "https://feeds.bbci.co.uk/russian/rss.xml", en: "https://feeds.bbci.co.uk/news/rss.xml" }, topics: ["top", "world"] },
  { id: "guardian", name: "The Guardian", feeds: { en: "https://www.theguardian.com/world/rss" }, topics: ["top", "world"] },
  { id: "nyt", name: "The New York Times", feeds: { en: "https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml" }, topics: ["top", "world", "business"] },
  { id: "verge", name: "The Verge", feeds: { en: "https://www.theverge.com/rss/index.xml" }, topics: ["tech", "ai", "culture"] },
  { id: "wired", name: "WIRED", feeds: { en: "https://www.wired.com/feed/rss" }, topics: ["tech", "ai", "science"] },
  { id: "techcrunch", name: "TechCrunch", feeds: { en: "https://techcrunch.com/feed/" }, topics: ["tech", "ai", "business"] },
  { id: "arstechnica", name: "Ars Technica", feeds: { en: "https://feeds.arstechnica.com/arstechnica/index" }, topics: ["tech", "science"] },
  { id: "nature", name: "Nature", feeds: { en: "https://www.nature.com/nature.rss" }, topics: ["science"] },
  { id: "espn", name: "ESPN", feeds: { en: "https://www.espn.com/espn/rss/news" }, topics: ["sport"] },
];

/** Curated default sources per topic — the fast, photo-rich ones first. */
export const defaultTopicSources = (topic: NewsTopic): NewsSource[] => {
  const byTopic: Record<NewsTopic, NewsSource[]> = {
    top: ["google", "bbc", "guardian", "nyt", "verge"],
    tech: ["google", "verge", "wired", "techcrunch", "arstechnica", "hackernews"],
    ai: ["google", "verge", "wired", "techcrunch", "hackernews"],
    science: ["google", "wired", "arstechnica", "nature"],
    business: ["google", "nyt", "techcrunch"],
    world: ["google", "bbc", "guardian", "nyt"],
    culture: ["google", "verge"],
    sport: ["google", "espn"],
  };
  return byTopic[topic];
};

const GOOGLE_TOPIC_IDS: Partial<Record<NewsTopic, string>> = { tech: "TECHNOLOGY", science: "SCIENCE", business: "BUSINESS", world: "WORLD", culture: "ENTERTAINMENT", sport: "SPORTS" };

function googleUrlForTopic(topic: NewsTopic, settings: NewsSettings): string {
  const lang = settings.region === "ru" ? "ru" : "en";
  const gl = settings.region === "ru" ? "RU" : "US";
  const q = `hl=${lang}&gl=${gl}&ceid=${gl}:${lang}`;
  const id = GOOGLE_TOPIC_IDS[topic];
  return id ? `https://news.google.com/rss/headlines/section/topic/${id}?${q}` : `https://news.google.com/rss?${q}`;
}

export const sourceTitle = (source: NewsSource, lang: "ru" | "en") =>
  source === "mix" ? (lang === "ru" ? "Все источники" : "All sources") : source === "google" ? "Google News" : source === "hackernews" ? "Hacker News" : (PUBLISHERS.find((p) => p.id === source)?.name ?? source);

function rssFor(source: NewsSource, settings: NewsSettings): string {
  const pub = PUBLISHERS.find((p) => p.id === source) ?? PUBLISHERS[0];
  return (settings.region === "ru" && pub.feeds.ru) || pub.feeds.en;
}

/** Google News has several RSS front doors; try them all before giving up. */
async function googleNewsAny(settings: NewsSettings, signal: AbortSignal, bust?: string): Promise<NewsItem[]> {
  const lang = settings.region === "ru" ? "ru" : "en";
  const gl = settings.region === "ru" ? "RU" : "US";
  const q = `hl=${lang}&gl=${gl}&ceid=${gl}:${lang}`;
  const topicIds: Partial<Record<NewsTopic, string>> = { tech: "TECHNOLOGY", science: "SCIENCE", business: "BUSINESS", world: "WORLD", culture: "ENTERTAINMENT", sport: "SPORTS" };
  const urls = [
    `https://news.google.com/rss?${q}`,
    ...settings.topics.filter((t) => topicIds[t]).slice(0, 2).map((t) => `https://news.google.com/rss/headlines/section/topic/${topicIds[t]}?${q}`),
    `https://news.google.com/news/rss/?${q}`,
  ];
  const results = await Promise.allSettled(urls.map((u) => fetchFeedItems(u, settings, signal, false, bust)));
  return results.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
}

/* ---------- local recommendations (what you opened before; never leaves the browser) ---------- */

const INTEREST_KEY = "lisyan_news_interests";
type Interests = { topics: Record<string, number>; hosts: Record<string, number>; words: Record<string, number>; queries: Record<string, number> };

const emptyInterests = (): Interests => ({ topics: {}, hosts: {}, words: {}, queries: {} });

const readInterests = (): Interests => {
  try {
    const parsed = JSON.parse(localStorage.getItem(INTEREST_KEY) || "null") as Partial<Interests> | null;
    if (!parsed || typeof parsed !== "object") return emptyInterests();
    return {
      topics: parsed.topics && typeof parsed.topics === "object" ? parsed.topics : {},
      hosts: parsed.hosts && typeof parsed.hosts === "object" ? parsed.hosts : {},
      words: parsed.words && typeof parsed.words === "object" ? parsed.words : {},
      queries: parsed.queries && typeof parsed.queries === "object" ? parsed.queries : {},
    };
  } catch {
    return emptyInterests();
  }
};

const words = (title: string) => title.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((w) => w.length > 4).slice(0, 12);

/** Called when a story is opened: a tiny, decaying interest profile in localStorage. */
export function rememberInterest(item: NewsItem) {
  const i = readInterests();
  const bump = (bag: Record<string, number>, key: string, by = 1) => {
    for (const k of Object.keys(bag)) bag[k] *= 0.97;
    bag[key] = (bag[key] ?? 0) + by;
  };
  bump(i.topics, item.topic, 2);
  bump(i.hosts, item.host, 1.5);
  for (const w of words(item.title)) bump(i.words, w, 0.6);
  for (const bag of [i.topics, i.hosts, i.words]) for (const k of Object.keys(bag)) if (bag[k] < 0.05) delete bag[k];
  try {
    localStorage.setItem(INTEREST_KEY, JSON.stringify(i));
  } catch {
    // ignore
  }
}

export const clearInterests = () => localStorage.removeItem(INTEREST_KEY);
export const hasInterests = () => Object.keys(readInterests().topics).length > 0;

/** Bumps user interests from a search term typed or selected in the search bar. */
export function rememberSearchQuery(query: string) {
  const q = query.trim().replace(/\s+/g, " ").slice(0, 120);
  if (!q || q.length < 2) return;
  const i = readInterests();
  const bump = (bag: Record<string, number>, key: string, by = 1) => {
    for (const k of Object.keys(bag)) bag[k] *= 0.98;
    bag[key] = (bag[key] ?? 0) + by;
  };
  const topic = classify(q);
  if (topic !== "top") bump(i.topics, topic, 3);
  for (const w of words(q)) bump(i.words, w, 1.4);
  bump(i.queries, q, 2.4);
  for (const bag of [i.topics, i.hosts, i.words, i.queries]) {
    for (const k of Object.keys(bag)) if (bag[k] < 0.05) delete bag[k];
  }
  // Keep the profile small and deterministic.
  for (const bag of [i.words, i.queries]) {
    const entries = Object.entries(bag).sort((a, b) => b[1] - a[1]).slice(0, 40);
    for (const key of Object.keys(bag)) delete bag[key];
    for (const [key, value] of entries) bag[key] = value;
  }
  try {
    localStorage.setItem(INTEREST_KEY, JSON.stringify(i));
    if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("lisyan:interests-updated"));
  } catch {
    // ignore
  }
}

/** Personalized search recommendations from locally stored search and article interests. */
export function getSearchRecommendations(lang: "ru" | "en", limit = 8): string[] {
  const interests = readInterests();
  const candidates: { text: string; score: number }[] = [];
  for (const [query, score] of Object.entries(interests.queries)) {
    if (query.trim()) candidates.push({ text: query, score: score + 1 });
  }
  const topicQueries: Record<Exclude<NewsTopic, "top">, [string, string]> = {
    tech: ["технологии сегодня", "latest technology news"],
    ai: ["последние новости ИИ", "latest AI news"],
    science: ["новости науки", "latest science news"],
    business: ["новости бизнеса", "latest business news"],
    world: ["главные новости мира", "world news today"],
    culture: ["новости культуры", "latest culture news"],
    sport: ["спортивные новости", "latest sports news"],
  };
  for (const [topic, score] of Object.entries(interests.topics)) {
    if (!(topic in topicQueries)) continue;
    const copy = topicQueries[topic as Exclude<NewsTopic, "top">];
    candidates.push({ text: lang === "ru" ? copy[0] : copy[1], score });
  }
  const seen = new Set<string>();
  return candidates
    .sort((a, b) => b.score - a.score)
    .filter(({ text }) => {
      const key = text.toLocaleLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, limit)
    .map(({ text }) => text);
}

export function personalRank(items: NewsItem[], settings: NewsSettings): NewsItem[] {
  if (!settings.personalize) return items;
  const i = readInterests();
  if (!Object.keys(i.topics).length && !Object.keys(i.hosts).length && !Object.keys(i.words).length) return items;
  const now = Date.now();
  const score = (item: NewsItem) => {
    const fresh = Math.max(0, 1 - (now - item.publishedAt) / (36 * 36e5));
    const topic = (i.topics[item.topic] ?? 0) * 0.6;
    const host = (i.hosts[item.host] ?? 0) * 0.5;
    const w = words(item.title).reduce((acc, word) => acc + (i.words[word] ?? 0), 0) * 0.4;
    return fresh * 2 + topic + host + w;
  };
  return [...items].sort((a, b) => score(b) - score(a));
}

/** Interleaves lists so no single publisher floods the feed, deduplicating near-identical titles. */
function interleave(lists: NewsItem[][]): NewsItem[] {
  const queues = lists.map((l) => [...l].sort((a, b) => b.publishedAt - a.publishedAt));
  const seen = new Set<string>();
  const out: NewsItem[] = [];
  let progressed = true;
  while (progressed) {
    progressed = false;
    for (const q of queues) {
      const next = q.shift();
      if (!next) continue;
      progressed = true;
      const key = next.title.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim().slice(0, 48);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(next);
    }
  }
  return out;
}

async function mixedNews(settings: NewsSettings, signal: AbortSignal, bust?: string): Promise<NewsItem[]> {
  const wanted = [...new Set(settings.topics.length ? settings.topics : (["top"] as NewsTopic[]))];
  const sourcesFor = (topic: NewsTopic): NewsSource[] => {
    const custom = settings.topicSources?.[topic];
    return custom && custom.length ? custom : defaultTopicSources(topic);
  };

  // Shared fetches: each publisher / Google mirror / HN is fetched once even if several topics want it.
  const pubCache = new Map<string, Promise<NewsItem[]>>();
  const googleCache = new Map<NewsTopic, Promise<NewsItem[]>>();
  let hnPromise: Promise<NewsItem[]> | null = null;
  const fetchSource = (source: NewsSource, topic: NewsTopic): Promise<NewsItem[]> => {
    if (source === "google") {
      if (!googleCache.has(topic)) googleCache.set(topic, fetchFeedItems(googleUrlForTopic(topic, settings), settings, signal, true, bust).catch(() => []));
      return googleCache.get(topic)!;
    }
    if (source === "hackernews") {
      hnPromise ??= hackerNews(settings, signal, true).catch(() => []);
      return hnPromise;
    }
    if (!pubCache.has(source)) pubCache.set(source, fetchFeedItems(rssFor(source, settings), settings, signal, true, bust).catch(() => []));
    return pubCache.get(source)!;
  };

  // Wave 1: the fast, reliable sources. Wave 2 only runs when wave 1 is thin or a topic came up empty.
  const WAVE1 = new Set<NewsSource>(["google", "bbc", "verge", "guardian", "hackernews"]);
  const fetchWave = async (wave: Set<NewsSource>) => {
    const perTopic = await Promise.all(
      wanted.map(async (topic) => {
        const lists = await Promise.all(sourcesFor(topic).filter((src) => wave.has(src)).map((src) => fetchSource(src, topic)));
        return lists.flat().map((item) => ({ ...item, topic }));
      }),
    );
    return { items: interleave(perTopic.filter((l) => l.length)), covered: perTopic.map((l) => l.length > 0) };
  };

  const rest = new Set<NewsSource>(NEWS_SOURCES_ALL.filter((src) => !WAVE1.has(src)));
  const first = await fetchWave(WAVE1);
  // Manual refresh pulls every source at once, so there is a real chance of catching newer stories.
  if (bust) {
    const second = await fetchWave(rest);
    return interleave([first.items, second.items].filter((l) => l.length));
  }
  const enough = first.items.length >= Math.max(settings.count * 2, 12) && first.covered.every(Boolean);
  if (enough) return first.items;
  const second = await fetchWave(rest);
  return interleave([first.items, second.items].filter((l) => l.length));
}

const NEWS_SOURCES_ALL: NewsSource[] = ["mix", "google", "hackernews", "bbc", "verge", "guardian", "wired", "nyt", "techcrunch", "arstechnica", "nature", "espn"];

const CACHE_PREFIX = "lisyan_news_cache6:";
const SAVED_PREFIX = "lisyan_news_saved:";
const CACHE_MS = 10 * 60 * 1000;

const readSaved = (key: string): NewsItem[] => {
  try {
    const parsed = JSON.parse(localStorage.getItem(SAVED_PREFIX + key) || "null") as { items?: NewsItem[] } | null;
    return Array.isArray(parsed?.items) ? parsed.items : [];
  } catch {
    return [];
  }
};

/**
 * Fetches news without ever throwing. A successful load is kept in localStorage, so when every route
 * is down the feed still shows the last real stories (marked as stale) instead of going blank.
 */
export async function loadNews(settings: NewsSettings, signal: AbortSignal, force = false): Promise<NewsResult> {
  const key = `${settings.source}:${settings.topics.join(",")}:${settings.region}:${JSON.stringify(settings.topicSources ?? {})}`;
  // No hard cap: the feed shows everything the sources delivered for this load.
  const finish = (items: NewsItem[]) => personalRank(items, settings).slice(0, 160);
  try {
    if (force) sessionStorage.removeItem(CACHE_PREFIX + key);
    else {
      const cached = sessionStorage.getItem(CACHE_PREFIX + key);
      if (cached) {
        const parsed = JSON.parse(cached) as { at: number; items: NewsItem[] };
        // The stored list is already ranked, so the same stories stay in the same order.
        if (Date.now() - parsed.at < CACHE_MS && Array.isArray(parsed.items) && parsed.items.length) return { items: parsed.items, provider: settings.source };
      }
    }
  } catch {
    // sessionStorage may be blocked; fetching still works.
  }
  const saved = readSaved(key);
  const bust = force ? String(Date.now()) : undefined;
  try {
    const items = await (settings.source === "mix"
      ? mixedNews(settings, signal, bust)
      : settings.source === "hackernews"
        ? hackerNews(settings, signal)
        : settings.source === "google"
          ? googleNewsAny(settings, signal, bust)
          : fetchFeedItems(rssFor(settings.source, settings), settings, signal, false, bust));
    if (items.length) {
      const stored = finish(items);
      try {
        sessionStorage.setItem(CACHE_PREFIX + key, JSON.stringify({ at: Date.now(), items: stored }));
        localStorage.setItem(SAVED_PREFIX + key, JSON.stringify({ at: Date.now(), items: stored }));
      } catch {
        // ignore quota
      }
      return { items: stored, provider: settings.source };
    }
  } catch (error) {
    if (signal.aborted) return { items: [], provider: settings.source, error: "aborted" };
    if (saved.length) return { items: saved, provider: settings.source, stale: true };
    return { items: [], provider: settings.source, error: (error as Error)?.message || "network" };
  }
  if (saved.length) return { items: saved, provider: settings.source, stale: true };
  return { items: [], provider: settings.source, error: "empty" };
}

export function formatNewsTime(timestamp: number, lang: "ru" | "en"): string {
  const minutes = Math.round((Date.now() - timestamp) / 60_000);
  if (minutes < 1) return lang === "ru" ? "только что" : "just now";
  if (minutes < 60) return lang === "ru" ? `${minutes} мин назад` : `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return lang === "ru" ? `${hours} ч назад` : `${hours} h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return lang === "ru" ? `${days} дн назад` : `${days} d ago`;
  return new Intl.DateTimeFormat(lang === "ru" ? "ru-RU" : "en-US", { day: "numeric", month: "short" }).format(timestamp);
}
