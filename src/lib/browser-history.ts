import { getHost } from "./settings";

export type VisitedSite = {
  id: string;
  url: string;
  title: string;
  host: string;
  lastVisitTime: number;
  visitCount: number;
};

type Query = { text: string; startTime: number; maxResults: number };
type Row = { id?: string; url?: string; title?: string; lastVisitTime?: number; visitCount?: number };
type HistoryNamespace = { search?: (...args: unknown[]) => unknown };
type ExtNamespace = { runtime?: { id?: string }; history?: HistoryNamespace };

const extensionApi = (): ExtNamespace | undefined => {
  const root = globalThis as unknown as { chrome?: ExtNamespace; browser?: ExtNamespace };
  return root.chrome?.history ? root.chrome : root.browser?.history ? root.browser : undefined;
};

async function queryHistory(api: HistoryNamespace, query: Query): Promise<Row[]> {
  if (!api.search) return [];
  // Chrome MV3 and Firefox return a promise. Older callback implementations are supported too.
  try {
    const result = api.search(query);
    if (result && typeof (result as Promise<unknown>).then === "function") return (await result) as Row[];
  } catch {
    // Try the callback form below.
  }
  return new Promise<Row[]>((resolve) => {
    try {
      api.search?.(query, (rows: unknown) => resolve(Array.isArray(rows) ? (rows as Row[]) : []));
      window.setTimeout(() => resolve([]), 1800);
    } catch {
      resolve([]);
    }
  });
}

/** Recent browser visits, available in the installed extension after granting the History permission. */
export async function recentVisitedSites(text = "", limit = 8): Promise<VisitedSite[]> {
  const api = extensionApi();
  if (!api?.runtime?.id || !api.history?.search) return [];
  try {
    const rows = await queryHistory(api.history, {
      text: text.trim(),
      startTime: Date.now() - 90 * 86_400_000,
      maxResults: Math.max(32, limit * 5),
    });
    const output: VisitedSite[] = [];
    const seen = new Set<string>();
    for (const row of rows) {
      const url = row.url ?? "";
      if (!/^https?:\/\//i.test(url) || /^(chrome|moz)-extension:/i.test(url)) continue;
      if (seen.has(url)) continue;
      seen.add(url);
      const host = getHost(url);
      if (!host) continue;
      output.push({
        id: row.id || url,
        url,
        title: (row.title || host).slice(0, 160),
        host,
        lastVisitTime: row.lastVisitTime ?? 0,
        visitCount: row.visitCount ?? 0,
      });
      if (output.length >= limit) break;
    }
    return output;
  } catch {
    // History is not available on a regular website, or permission has not been granted.
    return [];
  }
}

export function visitLabel(timestamp: number, lang: "ru" | "en") {
  if (!timestamp) return "";
  const minutes = Math.max(0, Math.round((Date.now() - timestamp) / 60_000));
  const format = new Intl.RelativeTimeFormat(lang === "ru" ? "ru" : "en", { numeric: "auto" });
  if (minutes < 60) return format.format(-minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (hours < 24) return format.format(-hours, "hour");
  const days = Math.round(hours / 24);
  return days < 30
    ? format.format(-days, "day")
    : new Intl.DateTimeFormat(lang === "ru" ? "ru-RU" : "en-US", { month: "short", day: "numeric" }).format(timestamp);
}
