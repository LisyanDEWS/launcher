import type { FaviconTheme } from "./settings";
import type { FaviconPalette } from "./favicon-recolor";
import { buildPalette } from "./theme";

/**
 * Bridge between the launcher and the generated Chrome extension.
 *
 * The extension ships `favicon-theme.js` as a content script on every http(s) page, so tabs
 * opened from anywhere (not just from this launcher) are repainted. Everything below is optional:
 * on a plain website the `chrome.*` APIs are absent and the launcher simply keeps its own preview.
 */

type ChromeStorageArea = {
  get: (keys: string | string[] | Record<string, unknown> | null) => Promise<Record<string, unknown>>;
  set: (items: Record<string, unknown>) => Promise<void>;
};

type StorageChange = { oldValue?: unknown; newValue?: unknown };
type ChromeLike = {
  runtime?: { id?: string; sendMessage?: (message: unknown) => Promise<unknown> };
  storage?: { local?: ChromeStorageArea; onChanged?: { addListener: (fn: (changes: Record<string, StorageChange>, area: string) => void) => void } };
};

export const FAVICON_THEME_KEY = "lisyan_favicon_theme";

const chromeApi = (): ChromeLike | undefined => (globalThis as unknown as { chrome?: ChromeLike }).chrome;

/** True when the page is running inside the generated LisYan extension. */
export function isLisyanExtension(): boolean {
  const runtime = chromeApi()?.runtime;
  return Boolean(runtime?.id && chromeApi()?.storage?.local);
}

/** Theme tones the favicon recolour uses — the same mixes as the themed app-menu icons. */
const TONES: Record<keyof FaviconPalette, string> = {
  ink: "var(--primary)",
  paper: "var(--on-primary)",
  tile: "var(--primary-container)",
  accent: "var(--tertiary)",
  middle: "color-mix(in srgb, var(--primary) 65%, var(--tertiary))",
  soft: "color-mix(in srgb, var(--primary) 64%, var(--on-primary))",
  deep: "color-mix(in srgb, var(--primary) 80%, var(--on-primary-container))",
};

const toHex = (r: number, g: number, b: number) => `#${[r, g, b].map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, "0")).join("")}`;

/** Any computed CSS colour (rgb(), color(srgb …), #hex) → #rrggbb. */
function cssColorToHex(value: string): string | null {
  const v = value.trim();
  if (/^#[0-9a-f]{6}$/i.test(v)) return v.toLowerCase();
  let m = v.match(/^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/i);
  if (m) return toHex(+m[1], +m[2], +m[3]);
  m = v.match(/^color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)/i);
  if (m) return toHex(+m[1] * 255, +m[2] * 255, +m[3] * 255);
  // Anything else: let a 1×1 canvas normalise it.
  try {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 1;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = "#000";
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, 1, 1);
    const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
    return toHex(r, g, b);
  } catch {
    return null;
  }
}

/**
 * Resolves the palette from the live theme (or, for a custom colour, from a full Material scheme
 * built from that colour) into plain hex values the content script can use.
 */
export function resolveFaviconPalette(theme: FaviconTheme): FaviconPalette | undefined {
  if (typeof document === "undefined" || !document.body) return undefined;
  const holder = document.createElement("div");
  holder.style.cssText = "position:absolute;width:0;height:0;overflow:hidden;visibility:hidden;pointer-events:none";
  if (!theme.useThemeColor && /^#[0-9a-f]{6}$/i.test(theme.color)) {
    const dark = document.documentElement.dataset.theme === "dark";
    const vars = buildPalette(theme.color, dark, "tonal", 0);
    for (const [name, value] of Object.entries(vars)) holder.style.setProperty(name, value);
  }
  document.body.appendChild(holder);
  const palette = {} as FaviconPalette;
  try {
    for (const key of Object.keys(TONES) as (keyof FaviconPalette)[]) {
      const probe = document.createElement("span");
      probe.style.color = TONES[key];
      holder.appendChild(probe);
      palette[key] = cssColorToHex(getComputedStyle(probe).color) ?? "#888888";
    }
  } finally {
    holder.remove();
  }
  return palette;
}

/** The theme as the extension receives it: tint + every tone of the palette. */
export function resolveFaviconTheme(theme: FaviconTheme): FaviconTheme {
  const palette = resolveFaviconPalette(theme);
  const color = theme.useThemeColor && palette ? palette.ink : theme.color;
  return { ...theme, color, palette };
}

export type FaviconSyncResult = "extension" | "local";

/** Pushes the live palette to the extension; content scripts repaint every open tab. */
export async function pushFaviconTheme(theme: FaviconTheme): Promise<FaviconSyncResult> {
  const resolved = resolveFaviconTheme(theme);
  const storage = chromeApi()?.storage?.local;
  if (!storage) return "local";
  try {
    await storage.set({ [FAVICON_THEME_KEY]: resolved });
    await chromeApi()?.runtime?.sendMessage?.({ type: "lisyan:apply-favicon-theme" });
    return "extension";
  } catch {
    return "local";
  }
}

export async function readFaviconTheme(): Promise<FaviconTheme | null> {
  try {
    const data = await chromeApi()?.storage?.local?.get(FAVICON_THEME_KEY);
    const value = data?.[FAVICON_THEME_KEY];
    return value && typeof value === "object" ? (value as FaviconTheme) : null;
  } catch {
    return null;
  }
}

/** Subscribes to theme changes made by other launcher tabs. Returns an unsubscribe function. */
export function onFaviconThemeChange(callback: (theme: FaviconTheme) => void): () => void {
  const onChanged = chromeApi()?.storage?.onChanged;
  if (!onChanged) return () => undefined;
  onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    const next = changes[FAVICON_THEME_KEY]?.newValue;
    if (next && typeof next === "object") callback(next as FaviconTheme);
  });
  return () => undefined;
}

/** Samples the current Material palette so settings can offer a one-click "take from theme". */
export function paletteTint(): string {
  if (typeof document === "undefined") return "#6750a4";
  const style = getComputedStyle(document.documentElement);
  const primary = style.getPropertyValue("--primary").trim();
  return /^#[0-9a-f]{6}$/i.test(primary) ? primary : "#6750a4";
}
