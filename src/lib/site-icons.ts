import { idbDelete, idbGet, idbSet } from "./idb";
import { popularSiteFor, type PopularSite } from "./popular-sites";

/** Shared with the extension background worker. */
export const SITE_ICON_CACHE_KEY = "lisyan_site_icons_v1";
export const SITE_ICON_CACHE_PREFIX = "lisyan_site_icon_v1:";
export const SITE_ICON_CACHE_MAX = 600;
export const DEFAULT_ICON_CACHE_DAYS = 5;

export type CachedSiteIcon = {
  host: string;
  dataUrl: string;
  savedAt: number;
  iconUrl?: string;
};

type BrowserExtensionApi = {
  runtime?: {
    id?: string;
    sendMessage?: (message: unknown) => Promise<unknown>;
  };
};

const chromeApi = () => (globalThis as unknown as { chrome?: BrowserExtensionApi }).chrome;
const browserApi = () => (globalThis as unknown as { browser?: BrowserExtensionApi }).browser;
const inExtension = () => Boolean(chromeApi()?.runtime?.id || browserApi()?.runtime?.id);

export const normalizeHost = (value: string) => {
  try {
    return new URL(value.includes("://") ? value : `https://${value}`).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
};

/** Sharp fallback for sites not in the bundled brand catalog. */
export function siteIconUrl(url: string, size = 256) {
  const host = normalizeHost(url);
  return host ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=${size}` : "";
}

function idbKey(host: string) {
  return `${SITE_ICON_CACHE_PREFIX}${host}`;
}

function withinTtl(icon: CachedSiteIcon, days: number) {
  return Date.now() - icon.savedAt < Math.max(1, days) * 86_400_000;
}

/** Gets the extension's persistent cache first, then the local-page IndexedDB cache. */
export async function getCachedSiteIcon(url: string, cacheDays?: number): Promise<CachedSiteIcon | null> {
  const host = normalizeHost(url);
  const days = cacheDays ?? DEFAULT_ICON_CACHE_DAYS;
  if (!host) return null;
  if (inExtension()) {
    const api = chromeApi() ?? browserApi();
    try {
      const result = (await api?.runtime?.sendMessage?.({ type: "lisyan:get-site-icon", url, cacheDays })) as { icon?: CachedSiteIcon } | null;
      // The background already applied the user's configured retention period.
      if (result?.icon?.dataUrl) return result.icon;
    } catch {
      // The direct website favicon remains a valid fallback.
    }
  }
  try {
    const cached = await idbGet<CachedSiteIcon>(idbKey(host));
    if (cached?.dataUrl && withinTtl(cached, days)) return cached;
  } catch {
    // Private mode or unavailable IndexedDB — load the site's current icon directly.
  }
  return null;
}

function blobAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("bad image"));
    reader.onerror = () => reject(reader.error ?? new Error("icon read failed"));
    reader.readAsDataURL(blob);
  });
}

/** Stores an icon after a visit/load. Extension pages ask the background; web pages use IndexedDB. */
export async function cacheSiteIcon(pageUrl: string, iconUrl: string, cacheDays?: number): Promise<void> {
  const host = normalizeHost(pageUrl);
  const days = cacheDays ?? DEFAULT_ICON_CACHE_DAYS;
  if (!host || !/^https?:\/\//i.test(iconUrl)) return;
  if (inExtension()) {
    const api = chromeApi() ?? browserApi();
    try {
      await api?.runtime?.sendMessage?.({ type: "lisyan:cache-site-icon", pageUrl, iconUrl, cacheDays });
      return;
    } catch {
      // Try local IDB below.
    }
  }
  try {
    const old = await idbGet<CachedSiteIcon>(idbKey(host));
    if (old?.dataUrl && old.iconUrl === iconUrl && withinTtl(old, days)) return;
    const response = await fetch(iconUrl, { mode: "cors", credentials: "omit", cache: "force-cache" });
    if (!response.ok) return;
    const blob = await response.blob();
    if (blob.size > 512 * 1024 || (blob.type && !blob.type.startsWith("image/"))) return;
    const icon: CachedSiteIcon = { host, dataUrl: await blobAsDataUrl(blob), savedAt: Date.now(), iconUrl };
    await idbSet(idbKey(host), icon);
    const index = (await idbGet<string[]>(`${SITE_ICON_CACHE_PREFIX}index`)) ?? [];
    await idbSet(`${SITE_ICON_CACHE_PREFIX}index`, [host, ...index.filter((x) => x !== host)].slice(0, SITE_ICON_CACHE_MAX));
  } catch {
    // A no-CORS host is cached by the extension background when available; otherwise just display it.
  }
}

export async function localSiteIconCount(cacheDays = DEFAULT_ICON_CACHE_DAYS): Promise<number> {
  try {
    const index = (await idbGet<string[]>(`${SITE_ICON_CACHE_PREFIX}index`)) ?? [];
    const rows = await Promise.all(index.map((host) => idbGet<CachedSiteIcon>(idbKey(host))));
    return rows.filter((x): x is CachedSiteIcon => Boolean(x && withinTtl(x, cacheDays))).length;
  } catch {
    return 0;
  }
}

export async function clearLocalSiteIcons() {
  try {
    const index = (await idbGet<string[]>(`${SITE_ICON_CACHE_PREFIX}index`)) ?? [];
    await Promise.all([...index.map((host) => idbDelete(idbKey(host))), idbDelete(`${SITE_ICON_CACHE_PREFIX}index`)]);
  } catch {
    // ignore
  }
}

export async function extensionSiteIconCount(): Promise<number | null> {
  if (!inExtension()) return null;
  try {
    const api = chromeApi() ?? browserApi();
    const response = (await api?.runtime?.sendMessage?.({ type: "lisyan:site-icon-count" })) as { count?: number } | null;
    return typeof response?.count === "number" ? response.count : 0;
  } catch {
    return 0;
  }
}

export async function clearExtensionSiteIcons(): Promise<boolean> {
  if (!inExtension()) return false;
  try {
    const api = chromeApi() ?? browserApi();
    const response = (await api?.runtime?.sendMessage?.({ type: "lisyan:clear-site-icons" })) as { ok?: boolean } | null;
    return Boolean(response?.ok);
  } catch {
    return false;
  }
}

/** A static Simple Icons vector for one of the 500 bundled popular domains. */
export function popularIconDataUrl(site: PopularSite | undefined): string {
  if (!site?.path) return "";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="${site.color || "#52627a"}" d="${site.path}"/></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export { popularSiteFor };
