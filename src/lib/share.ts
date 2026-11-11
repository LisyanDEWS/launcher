/**
 * Sharing that works both on the web and inside the real browser extension.
 *
 * Inside an extension the page address is `chrome-extension://<id>/index.html` (or `moz-extension://…`),
 * which means nothing to anybody else — so what gets shared there is the public project link instead.
 * `navigator.share` is missing in Firefox and in Chrome on Linux/macOS, therefore the share menu always
 * offers a copy button and a few messengers that open through the browser itself.
 */

/** What people receive when the launcher is shared from the extension (or any non-http page). */
export const PUBLIC_SHARE_URL = "https://github.com/LisyanDEWS/launcher";

type ChromeLike = {
  runtime?: { id?: string };
  tabs?: { create?: (options: { url: string; active?: boolean }) => Promise<unknown> | void };
};
const chromeApi = (): ChromeLike | undefined => (globalThis as unknown as { chrome?: ChromeLike }).chrome;
const browserApi = (): ChromeLike | undefined => (globalThis as unknown as { browser?: ChromeLike }).browser;

export type ShareTarget = { title: string; text: string; url: string; fromExtension: boolean };

export function shareTarget(title: string, isRu: boolean): ShareTarget {
  const href = typeof window !== "undefined" ? window.location.href : "";
  const web = /^https?:\/\//i.test(href) && !/^https?:\/\/(localhost|127\.|0\.0\.0\.0)/i.test(href);
  return {
    title,
    text: isRu ? `${title} — стартовая страница в стиле Material You` : `${title} — a Material You start page`,
    url: web ? href : PUBLIC_SHARE_URL,
    fromExtension: !web,
  };
}

/** Copies text; falls back to a hidden textarea where the async Clipboard API is unavailable or refused. */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to the legacy path
  }
  try {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.cssText = "position:fixed;top:0;left:0;opacity:0;pointer-events:none";
    document.body.appendChild(area);
    area.select();
    area.setSelectionRange(0, text.length);
    const ok = document.execCommand("copy");
    area.remove();
    return ok;
  } catch {
    return false;
  }
}

type NavigatorShare = Navigator & { share?: (data: ShareData) => Promise<void>; canShare?: (data?: ShareData) => boolean };

/** True when the browser has its own share sheet (mobile browsers, Chrome on Windows/ChromeOS, Safari). */
export function systemShareAvailable(target: ShareTarget): boolean {
  const nav = navigator as NavigatorShare;
  if (typeof nav.share !== "function") return false;
  try {
    return nav.canShare ? nav.canShare({ title: target.title, text: target.text, url: target.url }) : true;
  } catch {
    return false;
  }
}

export type ShareResult = "shared" | "cancelled" | "failed";

export async function systemShare(target: ShareTarget): Promise<ShareResult> {
  try {
    await (navigator as NavigatorShare).share?.({ title: target.title, text: target.text, url: target.url });
    return "shared";
  } catch (error) {
    // Closing the share sheet rejects with AbortError — that is a choice, not a failure.
    return (error as DOMException)?.name === "AbortError" ? "cancelled" : "failed";
  }
}

/** Opens a link in a new tab: through the extension API when available (always allowed), else window.open. */
export function openLink(url: string) {
  // mail clients are not tabs: hand the address to the browser the way a clicked link would.
  if (/^mailto:/i.test(url)) {
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.rel = "noopener noreferrer";
    anchor.style.display = "none";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    return;
  }
  const api = chromeApi()?.tabs?.create ? chromeApi() : browserApi()?.tabs?.create ? browserApi() : undefined;
  if (api?.tabs?.create) {
    try {
      void api.tabs.create({ url, active: true });
      return;
    } catch {
      // fall back below
    }
  }
  window.open(url, "_blank", "noopener,noreferrer");
}

export type ShareChannel = { id: "telegram" | "whatsapp" | "email" | "x"; label: string; href: string };

export function shareChannels(target: ShareTarget, isRu: boolean): ShareChannel[] {
  const url = encodeURIComponent(target.url);
  const text = encodeURIComponent(target.text);
  const title = encodeURIComponent(target.title);
  return [
    { id: "telegram", label: "Telegram", href: `https://t.me/share/url?url=${url}&text=${text}` },
    { id: "whatsapp", label: "WhatsApp", href: `https://wa.me/?text=${encodeURIComponent(`${target.text} ${target.url}`)}` },
    { id: "x", label: isRu ? "Опубликовать в X" : "Post on X", href: `https://twitter.com/intent/tweet?url=${url}&text=${text}` },
    { id: "email", label: isRu ? "Почта" : "Email", href: `mailto:?subject=${title}&body=${encodeURIComponent(`${target.text}\n${target.url}`)}` },
  ];
}
