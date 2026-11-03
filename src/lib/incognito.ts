/**
 * Opens a private (incognito) window.
 *
 * Inside the extension this uses `chrome.windows.create({ incognito: true })`, which requires
 * "Allow in incognito" to be enabled for the extension. Outside an extension there is no way to
 * force an incognito window from a page, so we say so honestly instead of pretending.
 */

export type IncognitoResult = "opened" | "blocked" | "unsupported" | "failed";

type ChromeWindows = {
  create: (options: { incognito?: boolean; url?: string; focused?: boolean }) => Promise<unknown>;
};

type ChromeRuntime = {
  lastError?: { message?: string };
};

const getChrome = (): { windows?: ChromeWindows; runtime?: ChromeRuntime } | undefined =>
  (globalThis as unknown as { chrome?: { windows?: ChromeWindows; runtime?: ChromeRuntime } }).chrome;

export const isExtension = () => {
  const chrome = getChrome();
  return Boolean(chrome?.runtime?.lastError !== undefined && chrome.windows);
};

/**
 * Opens `url` in an incognito window.
 * Returns what happened so the UI can explain itself.
 */
export async function openIncognito(url: string): Promise<IncognitoResult> {
  const chrome = getChrome();
  if (!chrome?.windows?.create) return "unsupported";

  try {
    await chrome.windows.create({ incognito: true, url, focused: true });
    return "opened";
  } catch {
    // A rejected promise here almost always means "Allow in incognito" is off.
    return chrome.runtime?.lastError ? "blocked" : "failed";
  }
}

/** True when this looks like a real incognito context (best-effort; browsers hide this deliberately). */
export function isProbablyIncognito(): boolean {
  if (typeof navigator === "undefined") return false;
  // Chrome reports an enormous storage quota in incognito when persistent storage is denied.
  return new Promise<boolean>((resolve) => {
    try {
      navigator.storage?.estimate?.().then((estimate) => {
        resolve((estimate.quota ?? 0) < 120 * 1024 * 1024);
      });
    } catch {
      resolve(false);
    }
  }) as unknown as boolean;
}
