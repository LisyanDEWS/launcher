/**
 * User scripts — the mini-Tampermonkey part of the extension.
 *
 * Scripts are stored in chrome.storage.local inside the extension (and in localStorage when the
 * app runs as a plain page, where they are only editable, not injected). The background worker
 * reads the same key and injects every enabled script into matching tabs — including tabs that
 * were already open when the script was added.
 */

export type UserScript = {
  id: string;
  name: string;
  /** Tampermonkey-style @match / @include patterns, e.g. "*://*.example.com/*". */
  matches: string[];
  code: string;
  /** document_start | document_end | document_idle */
  runAt: "document_start" | "document_end" | "document_idle";
  enabled: boolean;
  createdAt: number;
};

export const USERScript_STORAGE_KEY = "lisyan_userscripts";
export const FAVICON_THEME_STORAGE_KEY = "lisyan_favicon_theme";

type ChromeStorage = {
  local: {
    get: (key: string) => Promise<Record<string, unknown>>;
    set: (items: Record<string, unknown>) => Promise<void>;
  };
  onChanged: { addListener: (fn: (changes: Record<string, unknown>, area: string) => void) => void };
};

const hasChromeStorage = () => {
  const scope = globalThis as unknown as { chrome?: { storage?: ChromeStorage; runtime?: { id?: string } } };
  return Boolean(scope.chrome?.storage?.local && scope.chrome?.runtime?.id);
};

const readLocal = <T>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};

const writeLocal = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage full / unavailable — the in-memory list still works for this session
  }
};

export const isExtensionContext = hasChromeStorage;

export async function listUserScripts(): Promise<UserScript[]> {
  if (hasChromeStorage()) {
    const scope = globalThis as unknown as { chrome: { storage: ChromeStorage } };
    const data = await scope.chrome.storage.local.get(USERScript_STORAGE_KEY);
    const value = data[USERScript_STORAGE_KEY];
    return Array.isArray(value) ? (value as UserScript[]) : [];
  }
  return readLocal<UserScript[]>(USERScript_STORAGE_KEY, []);
}

export async function saveUserScripts(scripts: UserScript[]): Promise<void> {
  if (hasChromeStorage()) {
    const scope = globalThis as unknown as { chrome: { storage: ChromeStorage } };
    await scope.chrome.storage.local.set({ [USERScript_STORAGE_KEY]: scripts });
    return;
  }
  writeLocal(USERScript_STORAGE_KEY, scripts);
}

export function onUserScriptsChanged(listener: (scripts: UserScript[]) => void): () => void {
  if (hasChromeStorage()) {
    const scope = globalThis as unknown as { chrome: { storage: ChromeStorage } };
    const handler = (changes: Record<string, unknown>, area: string) => {
      if (area === "local" && changes[USERScript_STORAGE_KEY]) void listUserScripts().then(listener);
    };
    scope.chrome.storage.onChanged.addListener(handler);
    return () => {
      // chrome.storage.onChanged has no removeListener in all versions; a no-op unsubscribe is fine
      // because the settings page unmounts with the whole app.
    };
  }
  const onStorage = (event: StorageEvent) => {
    if (event.key === USERScript_STORAGE_KEY) void listUserScripts().then(listener);
  };
  window.addEventListener("storage", onStorage);
  return () => window.removeEventListener("storage", onStorage);
}

/* ---------- @match / @include parsing (Tampermonkey-style headers) ---------- */

/** Pulls // @match / // @include / @run-at / @name directives out of a userscript header. */
export function parseUserscriptHeader(code: string): { matches: string[]; runAt: UserScript["runAt"]; name?: string } {
  const matches: string[] = [];
  let runAt: UserScript["runAt"] = "document_idle";
  let name: string | undefined;
  for (const line of code.split("\n").slice(0, 60)) {
    const match = /^\s*\/\/\s*@([\w-]+)\s+(.*)$/.exec(line);
    if (!match) {
      if (/^\s*\/\//.test(line)) continue;
      break;
    }
    const [, directive, value] = match;
    if (directive === "match" || directive === "include") matches.push(value.trim());
    else if (directive === "run-at") {
      if (value.includes("start")) runAt = "document_start";
      else if (value.includes("end")) runAt = "document_end";
      else if (value.includes("idle")) runAt = "document_idle";
    } else if (directive === "name") name = value.trim();
  }
  return { matches, runAt, name };
}

/** Converts a Tampermonkey match pattern to a RegExp. */
export function matchPatternToRegExp(pattern: string): RegExp {
  const trimmed = pattern.trim();
  if (trimmed === "<all_urls>") return /^https?:\/\//;
  let source = "^";
  let index = 0;
  while (index < trimmed.length) {
    const character = trimmed[index];
    if (character === "*") {
      source += ".*";
      index += 1;
    } else {
      source += character.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      index += 1;
    }
  }
  return new RegExp(`${source}$`);
}

/** True when a URL matches any of the script's patterns (@include entries match as substrings). */
export function scriptMatchesUrl(script: UserScript, url: string): boolean {
  if (!url || !/^https?:/i.test(url)) return false;
  for (const pattern of script.matches) {
    if (pattern.includes("*")) {
      try {
        if (matchPatternToRegExp(pattern).test(url)) return true;
      } catch {
        // invalid pattern — ignore it
      }
    } else if (url.includes(pattern)) return true;
  }
  return false;
}

export const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `us-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

export function normalizeScript(input: { name?: string; code: string; matches?: string[]; enabled?: boolean }): UserScript {
  const header = parseUserscriptHeader(input.code);
  const matches = input.matches?.length ? input.matches : header.matches;
  return {
    id: uid(),
    name: input.name?.trim() || header.name || "Untitled script",
    matches: matches.length ? matches : ["<all_urls>"],
    code: input.code,
    runAt: header.runAt,
    enabled: input.enabled ?? true,
    createdAt: Date.now(),
  };
}
