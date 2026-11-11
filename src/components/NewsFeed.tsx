import {
  ArrowUp,
  ArrowUpRight,
  Heart,
  Link2,
  Newspaper,
  RefreshCw,
  Settings2,
  Share2,
  Sparkles,
  WifiOff,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";
import {
  formatNewsTime,
  loadNews,
  personalRank,
  rememberInterest,
  sourceLogo,
  sourceTitle,
  TOPIC_COLOR,
  topicLabel,
  type NewsItem,
  type NewsResult,
} from "../lib/news";
import { NEWS_TOPICS, type NewsSettings, type NewsTopic } from "../lib/settings";
import { cn } from "../utils/cn";
import LoadingIndicator from "./LoadingIndicator";

type Props = {
  onBackToTop?: () => void;
  news: NewsSettings;
  lang: "ru" | "en";
  hasWallpaper: boolean;
  accent: string;
  onConfigure: () => void;
  onToast?: (text: string) => void;
};

type RefreshNote = "new" | "same" | null;

const LIKES_KEY = "lisyan_news_likes";

const sameIds = (a: string[], b: string[]) => a.length === b.length && a.every((id, i) => id === b[i]);

function readLikedIds(): Set<string> {
  try {
    const raw = localStorage.getItem(LIKES_KEY);
    const parsed = raw ? (JSON.parse(raw) as string[]) : [];
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

function writeLikedIds(ids: Set<string>) {
  try {
    localStorage.setItem(LIKES_KEY, JSON.stringify([...ids]));
  } catch {
    // ignore
  }
}

function useNews(news: NewsSettings) {
  const [state, setState] = useState<NewsResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [forceTick, setForceTick] = useState(0);
  const [note, setNote] = useState<RefreshNote>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const previous = useRef<string[] | null>(null);
  const pendingRefresh = useRef(false);
  const topicsKey = news.topics.join(",");
  const topicSourcesKey = JSON.stringify(news.topicSources ?? {});

  const apply = (result: NewsResult) => {
    const ids = result.items.map((item) => item.id);
    setState(result);
    if (pendingRefresh.current) {
      setNote(previous.current && sameIds(previous.current, ids) ? "same" : "new");
      pendingRefresh.current = false;
    }
    previous.current = ids;
  };

  useEffect(() => {
    if (!news.enabled) return;
    const controller = new AbortController();
    let alive = true;
    setLoading(true);
    loadNews(news, controller.signal)
      .then((result) => {
        if (alive) apply(result);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [news.enabled, news.source, news.region, news.count, news.personalize, topicsKey, topicSourcesKey]);

  // When search queries or user actions update interests, re-rank immediately.
  useEffect(() => {
    const handleInterests = () => {
      setState((current) => {
        if (!current || !current.items.length) return current;
        return { ...current, items: personalRank(current.items, news) };
      });
    };
    window.addEventListener("lisyan:interests-updated", handleInterests);
    return () => window.removeEventListener("lisyan:interests-updated", handleInterests);
  }, [news]);

  // Forced refresh skips cache and adds cache-busters.
  useEffect(() => {
    if (!news.enabled || forceTick === 0) return;
    const controller = new AbortController();
    let alive = true;
    setLoading(true);
    loadNews(news, controller.signal, true)
      .then((result) => {
        if (alive) apply(result);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forceTick]);

  useEffect(() => {
    if (!note) return;
    const id = window.setTimeout(() => setNote(null), 4500);
    return () => window.clearTimeout(id);
  }, [note]);

  const [exhausted, setExhausted] = useState(false);

  const refresh = () => {
    pendingRefresh.current = true;
    setExhausted(false);
    setForceTick((value) => value + 1);
  };

  const loadMore = () => {
    if (loading || loadingMore || exhausted) return;
    const controller = new AbortController();
    setLoadingMore(true);
    loadNews(news, controller.signal, true)
      .then((result) => {
        setState((current) => {
          const known = new Set((current?.items ?? []).map((item) => item.id));
          const added = result.items.filter((item) => !known.has(item.id));
          if (!added.length) {
            setExhausted(true);
            return current;
          }
          return { items: [...(current?.items ?? []), ...added], provider: result.provider };
        });
      })
      .finally(() => setLoadingMore(false));
  };

  const resetExhausted = () => setExhausted(false);

  return { state, loading, loadingMore, loadMore, exhausted, resetExhausted, refresh, note };
}

const hasPhoto = (item: NewsItem) =>
  Boolean(item.image && /^https?:/.test(item.image) && !/1x1|pixel|spacer|track/i.test(item.image));

// Expressive Discover aspect ratios: varied heights ("в разнобой") that stack seamlessly in masonry columns
const ASPECT_VARIANTS = [
  "aspect-[16/10]",
  "aspect-[4/3]",
  "aspect-square",
  "aspect-[16/9]",
  "aspect-[3/4]",
  "aspect-[16/10]",
  "aspect-[4/3]",
];

export default function NewsFeed({
  news,
  lang,
  hasWallpaper,
  accent,
  onConfigure,
  onBackToTop,
  onToast,
}: Props) {
  const { state, loading, loadingMore, loadMore, exhausted, resetExhausted, refresh, note } = useNews(news);
  const [topic, setTopic] = useState<NewsTopic | "all">("all");
  const [likedIds, setLikedIds] = useState<Set<string>>(() => readLikedIds());
  const isRu = lang.startsWith("ru");

  const toggleLike = (item: NewsItem, event: ReactMouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setLikedIds((prev) => {
      const next = new Set(prev);
      const isLiked = next.has(item.id);
      if (isLiked) {
        next.delete(item.id);
        onToast?.(isRu ? "Удалено из понравившихся" : "Removed from liked");
      } else {
        next.add(item.id);
        rememberInterest(item);
        onToast?.(isRu ? "Понравилось — учли в рекомендациях" : "Liked — factored into recommendations");
      }
      writeLikedIds(next);
      return next;
    });
  };

  const shareStory = (item: NewsItem, event: ReactMouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    const nav = typeof navigator !== "undefined" ? (navigator as Navigator & { share?: (data: ShareData) => Promise<void> }) : undefined;
    if (nav?.share) {
      void nav.share({ title: item.title, url: item.url }).catch(() => undefined);
    } else {
      void navigator.clipboard?.writeText(item.url).then(() => {
        onToast?.(isRu ? "Ссылка на новость скопирована" : "Article link copied");
      });
    }
  };

  const pool = useMemo(() => {
    const all = state?.items ?? [];
    return topic === "all" ? all : all.filter((item) => item.topic === topic);
  }, [state, topic]);

  // Infinite scroll: observer pulls in the next wave of stories near the bottom.
  const sentinel = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const node = sentinel.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) loadMore();
      },
      { rootMargin: "600px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [loadMore, pool.length]);

  if (!news.enabled) return null;

  const date = new Intl.DateTimeFormat(isRu ? "ru-RU" : "en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());
  const topics = NEWS_TOPICS.filter((item) => news.topics.includes(item) || item === "top");
  const source = sourceTitle(news.source, isRu ? "ru" : "en");

  return (
    <section
      className="news-feed relative mx-auto w-full max-w-[1240px] px-3.5 pb-20 pt-8 sm:px-6"
      aria-label={isRu ? "Новости" : "News"}
    >
      {/* Expressive Google Discover header */}
      <div className="mb-5 flex flex-wrap items-end gap-4 px-1">
        <div className="min-w-0 flex-1">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-[var(--primary-container)] py-1 pe-3 ps-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--on-primary-container)]">
            <span className="grid h-6 w-6 place-items-center rounded-full bg-[var(--primary)] text-[var(--on-primary)]">
              <Newspaper size={13} strokeWidth={2.2} aria-hidden="true" />
            </span>
            {isRu ? "Для вас" : "For you"}
            {news.personalize && <Sparkles size={12} className="opacity-70" aria-hidden="true" />}
          </div>
          <h2 className={cn("type-display text-[32px] font-bold leading-[1.02] tracking-[-0.03em] sm:text-[42px]", hasWallpaper && "wp-text")}>
            {isRu ? "Новости" : "News"}
          </h2>
          <p className={cn("mt-1 flex flex-wrap items-center gap-2 text-sm text-[var(--muted)] first-letter:uppercase", hasWallpaper && "wp-text")}>
            <span>{date} · {source}</span>
            {note && (
              <span
                role="status"
                className={cn(
                  "inline-flex animate-[news-note-in_360ms_var(--ease-spatial)] items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold normal-case",
                  note === "new" ? "bg-[var(--primary-container)] text-[var(--on-primary-container)]" : "bg-[var(--surface-container-high)] text-[var(--muted)]",
                )}
              >
                {note === "new" ? (isRu ? "Новые истории" : "New stories") : isRu ? "Пока без изменений" : "No new stories yet"}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {loading && <LoadingIndicator indicatorSize={26} containerWidth={40} containerHeight={40} />}
          {onBackToTop && (
            <button
              type="button"
              onClick={onBackToTop}
              aria-label={isRu ? "Наверх, к поиску" : "Back to search"}
              title={isRu ? "Наверх, к поиску" : "Back to search"}
              className="grid h-11 w-11 place-items-center rounded-full bg-[var(--surface-container-high)] text-[var(--fg)] transition-all duration-300 hover:-translate-y-0.5 hover:rounded-2xl hover:bg-[var(--surface-container-highest)]"
            >
              <ArrowUp size={18} aria-hidden="true" />
            </button>
          )}
          <button
            type="button"
            onClick={refresh}
            aria-label={isRu ? "Обновить новости" : "Refresh news"}
            className="grid h-11 w-11 place-items-center rounded-full bg-[var(--surface-container-high)] text-[var(--fg)] transition-all duration-300 hover:rotate-90 hover:rounded-2xl hover:bg-[var(--surface-container-highest)]"
          >
            <RefreshCw size={17} className={cn(loading && "animate-spin")} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={onConfigure}
            aria-label={isRu ? "Настроить новости" : "Configure news"}
            className="grid h-11 w-11 place-items-center rounded-full bg-[var(--surface-container-high)] text-[var(--fg)] transition-all duration-300 hover:rotate-90 hover:rounded-2xl hover:bg-[var(--surface-container-highest)]"
          >
            <Settings2 size={18} aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Topic filter chips */}
      {news.showTopicChips && topics.length > 1 && (
        <div className="mb-5 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {(["all", ...topics] as (NewsTopic | "all")[]).map((item) => {
            const active = topic === item;
            return (
              <button
                key={item}
                type="button"
                onClick={() => setTopic(item)}
                aria-pressed={active}
                className={cn(
                  "inline-flex h-9 shrink-0 items-center gap-2 rounded-full px-4 text-xs font-semibold transition-all duration-300 sm:h-10 sm:text-[13px]",
                  active
                    ? "rounded-2xl bg-[var(--primary)] text-[var(--on-primary)] shadow-[0_6px_18px_color-mix(in_srgb,var(--primary)_28%,transparent)]"
                    : "bg-[var(--surface-container-high)] text-[var(--fg)]/80 hover:bg-[var(--surface-container-highest)]",
                )}
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: active ? "currentColor" : TOPIC_COLOR[item === "all" ? "top" : item] }}
                  aria-hidden="true"
                />
                {item === "all" ? (isRu ? "Все" : "All") : topicLabel(item, isRu ? "ru" : "en")}
              </button>
            );
          })}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && !pool.length ? (
        <div className="columns-1 gap-4 sm:columns-2 lg:columns-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className={cn(
                "news-skeleton mb-4.5 inline-block w-full break-inside-avoid rounded-[26px] bg-[var(--surface-container-high)]",
                index % 2 === 0 ? "h-[320px]" : "h-[240px]",
              )}
            />
          ))}
        </div>
      ) : !pool.length ? (
        <div
          className={cn(
            "flex flex-col items-center gap-4 rounded-[36px] px-6 py-14 text-center",
            hasWallpaper ? "bg-[var(--glass-strong)] backdrop-blur-xl" : "bg-[var(--surface-container)]",
          )}
        >
          <span className="grid h-16 w-16 place-items-center rounded-[24px] bg-[var(--surface-container-high)] text-[var(--muted)]">
            <WifiOff size={26} aria-hidden="true" />
          </span>
          <p className="max-w-sm text-[15px] leading-relaxed text-[var(--muted)]">
            {isRu
              ? `Не удалось загрузить «${source}». Проверьте соединение или выберите другой источник.`
              : `Could not load ${source}. Check the connection or pick another source.`}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={refresh}
              className="inline-flex h-11 items-center gap-2 rounded-full bg-[var(--primary)] px-5 text-sm font-semibold text-[var(--on-primary)] transition-all hover:rounded-2xl"
            >
              <RefreshCw size={15} aria-hidden="true" /> {isRu ? "Повторить" : "Try again"}
            </button>
            <button
              type="button"
              onClick={onConfigure}
              className="inline-flex h-11 items-center gap-2 rounded-full bg-[var(--surface-container-high)] px-5 text-sm font-semibold transition-all hover:rounded-2xl"
            >
              {isRu ? "Источники" : "Sources"}
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Authentic Google Discover Masonry Stream ("в разнобой, но красиво правильно стоят") */}
          <div className="columns-1 gap-4.5 sm:columns-2 lg:columns-3 [column-fill:_balance]">
            {pool.map((item, index) => (
              <DiscoverCard
                key={item.id}
                item={item}
                index={index}
                news={news}
                isRu={isRu}
                hasWallpaper={hasWallpaper}
                accent={accent}
                isLiked={likedIds.has(item.id)}
                onToggleLike={toggleLike}
                onShare={shareStory}
              />
            ))}
          </div>

          {/* Endless scroll sentinel */}
          <div ref={sentinel} className="news-sentinel mt-10 flex min-h-14 items-center justify-center">
            {exhausted ? (
              <button
                type="button"
                onClick={() => {
                  resetExhausted();
                  refresh();
                }}
                className="inline-flex h-11 items-center gap-2 rounded-full bg-[var(--surface-container-high)] px-5 text-[13px] font-semibold text-[var(--fg)] transition-all duration-300 hover:rounded-2xl hover:bg-[var(--surface-container-highest)]"
              >
                <RefreshCw size={14} aria-hidden="true" />
                {isRu ? "Проверить новые" : "Check for new stories"}
              </button>
            ) : (
              <span className="inline-flex items-center gap-2.5 text-xs font-medium text-[var(--muted)]">
                <LoadingIndicator indicatorSize={22} containerWidth={32} containerHeight={32} />
                {loadingMore ? (isRu ? "Подгружаем истории" : "Loading more stories") : isRu ? "Прокрутите — подгрузим ещё" : "Scroll for more"}
              </span>
            )}
          </div>
        </>
      )}

      {/* Footer bar */}
      <div className="mt-5 flex items-center justify-between gap-3 px-1 text-[12px] text-[var(--muted)]">
        <span className={cn(hasWallpaper && "wp-text")}>
          {state?.stale && (
            <span className="me-2 rounded-full bg-[var(--surface-container-high)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
              {isRu ? "сохранено" : "saved"}
            </span>
          )}
          {news.personalize
            ? isRu
              ? "Подборка учитывает то, что вы открывали и искали — данные остаются в браузере."
              : "Ranked by what you read and searched — data stays in your browser."
            : isRu
              ? `Источник: ${source}`
              : `Source: ${source}`}
        </span>
        <button
          type="button"
          onClick={onConfigure}
          className={cn("inline-flex items-center gap-1 font-semibold text-[var(--fg)]/75 transition hover:text-[var(--fg)]", hasWallpaper && "wp-text")}
        >
          {isRu ? "Настроить ленту" : "Tune the feed"}
          <ArrowUpRight size={13} aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}

/** Individual Google Discover card matching the tablet / phone Discover screenshot. */
function DiscoverCard({
  item,
  index,
  news,
  isRu,
  hasWallpaper,
  accent,
  isLiked,
  onToggleLike,
  onShare,
}: {
  item: NewsItem;
  index: number;
  news: NewsSettings;
  isRu: boolean;
  hasWallpaper: boolean;
  accent: string;
  isLiked: boolean;
  onToggleLike: (item: NewsItem, event: ReactMouseEvent) => void;
  onShare: (item: NewsItem, event: ReactMouseEvent) => void;
}) {
  const [broken, setBroken] = useState(false);
  const showPhoto = news.showImages && hasPhoto(item) && !broken;
  const photo = showPhoto ? item.image : null;
  const aspect = ASPECT_VARIANTS[index % ASPECT_VARIANTS.length];

  return (
    <a
      href={item.url}
      target={news.openInNewTab ? "_blank" : undefined}
      rel="noopener noreferrer"
      data-news-id={item.id}
      onClick={() => news.personalize && rememberInterest(item)}
      className={cn(
        "news-card group mb-4.5 block w-full break-inside-avoid overflow-hidden rounded-[26px] border border-[color-mix(in_srgb,var(--outline)_14%,transparent)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_38px_rgba(0,0,0,0.22)]",
        hasWallpaper
          ? "bg-[var(--glass-strong)] backdrop-blur-xl"
          : "bg-[var(--surface-container)] hover:bg-[var(--surface-container-high)]",
      )}
    >
      {/* Top Image with domain overlay pill in bottom right (as seen on Discover screenshot) */}
      {photo ? (
        <div
          aria-hidden="true"
          className={cn("news-cover relative w-full overflow-hidden", aspect, `news-cover--${news.imageTone}`)}
          style={{ ["--news-accent" as string]: accent }}
        >
          <img
            src={photo}
            alt=""
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => setBroken(true)}
            className="news-photo absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />
          <span className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/60 via-black/15 to-transparent" />

          {/* Topic tag */}
          <span className="absolute start-3 top-3 inline-flex items-center gap-1 rounded-full bg-black/45 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white backdrop-blur-md">
            {topicLabel(item.topic, isRu ? "ru" : "en")}
          </span>

          {/* Domain badge pill in bottom-right corner — e.g. theverge.com, gamesradar.com */}
          <span className="absolute bottom-2.5 end-2.5 inline-flex items-center gap-1 rounded-full bg-black/65 px-2.5 py-1 text-[11px] font-medium text-white/90 backdrop-blur-md shadow-sm">
            <Link2 size={11} className="opacity-80" />
            <span className="max-w-[140px] truncate">{item.host}</span>
          </span>
        </div>
      ) : (
        /* Text-only accent bar */
        <div className="flex items-center gap-2 px-5 pt-4">
          <span
            className="h-2 w-2 rounded-full"
            style={{ background: TOPIC_COLOR[item.topic] }}
            aria-hidden="true"
          />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
            {topicLabel(item.topic, isRu ? "ru" : "en")}
          </span>
          <span className="ms-auto inline-flex items-center gap-1 rounded-full bg-[var(--surface-container-high)] px-2 py-0.5 text-[11px] text-[var(--muted)]">
            <Link2 size={10} className="opacity-70" />
            <span className="max-w-[120px] truncate">{item.host}</span>
          </span>
        </div>
      )}

      {/* Card Content: Title & Excerpt */}
      <div className="p-4 sm:p-5 pt-3.5">
        <h3
          lang={isRu ? "ru" : "en"}
          className="text-pretty text-[16.5px] font-bold leading-[1.3] tracking-[-0.015em] text-[var(--fg)] transition-colors group-hover:text-[var(--primary)]"
        >
          {item.title}
        </h3>

        {item.excerpt && (
          <p className="mt-2 line-clamp-3 text-[13px] leading-relaxed text-[var(--muted)]">
            {item.excerpt}
          </p>
        )}

        {/* Bottom action row matching Google Discover: Favicon + Source + Time on left, Heart + Share + Link on right */}
        <div className="mt-4 flex items-center justify-between gap-2 border-t border-[color-mix(in_srgb,var(--outline)_10%,transparent)] pt-3 text-[12px]">
          {/* Left: Source Logo & Name & Time */}
          <div className="flex min-w-0 items-center gap-1.5 text-[11.5px] text-[var(--muted)]">
            <img
              src={sourceLogo(item.host, 32)}
              alt=""
              loading="lazy"
              referrerPolicy="no-referrer"
              className="h-4.5 w-4.5 rounded-full bg-white object-contain p-0.5 shadow-xs"
            />
            <span className="max-w-[120px] truncate font-medium text-[var(--fg)]/90">{item.source}</span>
            <span aria-hidden="true" className="opacity-60">·</span>
            <span className="shrink-0">{formatNewsTime(item.publishedAt, isRu ? "ru" : "en")}</span>
          </div>

          {/* Right: Heart (like), Share, Link buttons */}
          <div className="flex shrink-0 items-center gap-0.5">
            {/* Heart button */}
            <button
              type="button"
              onClick={(e) => onToggleLike(item, e)}
              title={isLiked ? (isRu ? "Понравилось" : "Liked") : isRu ? "Нравится" : "Like"}
              aria-label={isLiked ? (isRu ? "Понравилось" : "Liked") : isRu ? "Нравится" : "Like"}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full transition active:scale-90",
                isLiked
                  ? "text-rose-500 hover:bg-rose-500/10"
                  : "text-[var(--muted)] hover:bg-[var(--surface-container-highest)] hover:text-rose-400",
              )}
            >
              <Heart
                size={16}
                strokeWidth={isLiked ? 2.5 : 2}
                className={cn(isLiked && "fill-rose-500 text-rose-500")}
              />
            </button>

            {/* Share button */}
            <button
              type="button"
              onClick={(e) => onShare(item, e)}
              title={isRu ? "Поделиться" : "Share"}
              aria-label={isRu ? "Поделиться" : "Share"}
              className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--muted)] transition hover:bg-[var(--surface-container-highest)] hover:text-[var(--fg)] active:scale-90"
            >
              <Share2 size={15} strokeWidth={2} />
            </button>

            {/* Open link button */}
            <span
              className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--muted)] transition group-hover:bg-[var(--primary)] group-hover:text-[var(--on-primary)]"
              aria-hidden="true"
            >
              <ArrowUpRight size={15} strokeWidth={2.2} />
            </span>
          </div>
        </div>
      </div>
    </a>
  );
}
