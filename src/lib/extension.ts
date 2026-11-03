import path from "node:path";
import { buildFaviconUserscript } from "./favicon-userscript";
import { readBookmarks, readHistory, readSettings, type Settings } from "./settings";

export type BrowserTarget = "chromium" | "firefox";

/** Files shipped inside the downloaded extension package. */
export type ExtensionFile = { path: string; content: string; encoding?: "base64" };

export const APP_VERSION = "2.3.0";
export const RELEASE_CODENAME = "marigold-beta";
export const EXTENSION_NAME = "LisYan Marigold";

/** The downloaded launcher boots into edit mode once, so the layout can be arranged on a real new tab. */
/**
 * Generates background.js — the extension's mini-Tampermonkey.
 *
 * - Injects every enabled user script into every matching tab, including tabs that were ALREADY
 *   open when the script was added (chrome.tabs.query on startup/install/storage-change).
 * - Broadcasts a "repaint favicon" message to all existing tabs when the favicon theme changes,
 *   so open tabs are repainted immediately, not just on their next reload.
 *
 * MV3 (Chrome/Edge) uses chrome.scripting.executeScript with a serialised runner + args.
 * MV2 (Firefox) uses browser.tabs.executeScript with the code string directly.
 */
export function backgroundScript(target: BrowserTarget): string {
  const shared = `
  var SCRIPTS_KEY = "lisyan_userscripts";
  var THEME_KEY = "lisyan_favicon_theme";

  function matchPatternToRegExp(pattern) {
    var trimmed = String(pattern || "").trim();
    if (trimmed === "<all_urls>") return /^https?:\\/\\//;
    var source = "^", i = 0;
    while (i < trimmed.length) {
      var ch = trimmed[i];
      if (ch === "*") { source += ".*"; i += 1; }
      else { source += ch.replace(/[.*+?^\${}()|[\\]\\\\]/g, "\\$&"); i += 1; }
    }
    try { return new RegExp(source + "$"); } catch (e) { return null; }
  }

  function scriptMatchesUrl(script, url) {
    if (!url || !/^https?:/i.test(url)) return false;
    var patterns = script.matches || [];
    for (var i = 0; i < patterns.length; i++) {
      var pattern = patterns[i];
      if (pattern.indexOf("*") >= 0) {
        var regex = matchPatternToRegExp(pattern);
        if (regex && regex.test(url)) return true;
      } else if (url.indexOf(pattern) >= 0) return true;
    }
    return false;
  }

  function getScripts() {
    return chrome.storage.local.get(SCRIPTS_KEY).then(function (data) {
      var value = data[SCRIPTS_KEY];
      return Array.isArray(value) ? value : [];
    }).catch(function () { return []; });
  }

  function isHttpTab(tab) {
    return tab && tab.id && tab.url && /^https?:/i.test(tab.url);
  }

  // Send the favicon repaint request to every open tab — this is what repaints ALREADY OPEN tabs.
  function repaintFaviconsInAllTabs() {
    chrome.tabs.query({}, function (tabs) {
      (tabs || []).forEach(function (tab) {
        if (!isHttpTab(tab)) return;
        chrome.tabs.sendMessage(tab.id, { type: "lisyan:repaint-favicon" }).catch(function () {});
      });
    });
  }

  function allTabs() {
    return chrome.tabs.query({}).then(function (tabs) { return tabs || []; });
  }
`;
  if (target === "firefox") {
    return `// LisYan Marigold — background page (MV2). Generated at package time.
${shared}
  // Inject one script into one tab (all frames). MV2 executes the code in the isolated world.
  function injectIntoTab(tabId, script) {
    return browser.tabs.executeScript(tabId, {
      code: "(function(){" + String.fromCharCode(10) + script.code + String.fromCharCode(10) + "})();",
      allFrames: true,
      runAt: script.runAt || "document_idle",
    }).catch(function () {});
  }

  function injectScriptsIntoTab(tab) {
    if (!isHttpTab(tab)) return Promise.resolve();
    return getScripts().then(function (scripts) {
      var jobs = scripts.filter(function (s) { return s && s.enabled && s.code && scriptMatchesUrl(s, tab.url); });
      return Promise.all(jobs.map(function (s) { return injectIntoTab(tab.id, s); }));
    });
  }

  function injectScriptsIntoAllTabs() {
    return allTabs().then(function (tabs) {
      return Promise.all(tabs.map(injectScriptsIntoTab));
    }).then(repaintFaviconsInAllTabs);
  }

  // New or reloaded pages.
  chrome.tabs.onUpdated.addListener(function (tabId, info, tab) {
    if (info.status === "loading" && tab && tab.url) injectScriptsIntoTab(tab);
    if (info.status === "complete" && tab && tab.url) {
      chrome.tabs.sendMessage(tabId, { type: "lisyan:repaint-favicon" }).catch(function () {});
    }
  });

  // Scripts added/edited/enabled while tabs are already open.
  chrome.storage.onChanged.addListener(function (changes, area) {
    if (area !== "local") return;
    if (changes[SCRIPTS_KEY]) injectScriptsIntoAllTabs();
    if (changes[THEME_KEY]) repaintFaviconsInAllTabs();
  });

  // First run and browser start: cover tabs that are already open right now.
  browser.runtime.onInstalled.addListener(injectScriptsIntoAllTabs);
  browser.runtime.onStartup.addListener(injectScriptsIntoAllTabs);
`;
  }
  return `// LisYan Marigold — service worker (MV3). Generated at package time.
${shared}
  // MV3 cannot execute a code string directly, so the script travels as an argument and the
  // serialised runner evaluates it inside the isolated world of the tab.
  function runner(code) {
    try {
      (new Function(code))();
    } catch (error) {
      console.error("[LisYan] userscript failed:", error);
    }
  }

  function injectIntoTab(tabId, script) {
    return chrome.scripting.executeScript({
      target: { tabId: tabId, allFrames: true },
      func: runner,
      args: [script.code],
      world: "ISOLATED",
      injectImmediately: script.runAt === "document_start",
    }).catch(function () {});
  }

  function injectScriptsIntoTab(tab) {
    if (!isHttpTab(tab)) return Promise.resolve();
    return getScripts().then(function (scripts) {
      var jobs = scripts.filter(function (s) { return s && s.enabled && s.code && scriptMatchesUrl(s, tab.url); });
      return Promise.all(jobs.map(function (s) { return injectIntoTab(tab.id, s); }));
    });
  }

  function injectScriptsIntoAllTabs() {
    return allTabs().then(function (tabs) {
      return Promise.all(tabs.map(injectScriptsIntoTab));
    }).then(repaintFaviconsInAllTabs);
  }

  chrome.tabs.onUpdated.addListener(function (tabId, info, tab) {
    if (info.status === "loading" && tab && tab.url) injectScriptsIntoTab(tab);
    if (info.status === "complete" && tab && tab.url) {
      chrome.tabs.sendMessage(tabId, { type: "lisyan:repaint-favicon" }).catch(function () {});
    }
  });

  chrome.storage.onChanged.addListener(function (changes, area) {
    if (area !== "local") return;
    if (changes[SCRIPTS_KEY]) injectScriptsIntoAllTabs();
    if (changes[THEME_KEY]) repaintFaviconsInAllTabs();
  });

  chrome.runtime.onInstalled.addListener(injectScriptsIntoAllTabs);
  chrome.runtime.onStartup.addListener(injectScriptsIntoAllTabs);
`;
}

function bootstrapScript() {
  return `// LisYan first-run bootstrap: opens the layout editor once on a fresh install.
try {
  const KEY = "lisyan_extension_boot";
  if (!localStorage.getItem(KEY)) {
    localStorage.setItem(KEY, String(Date.now()));
    document.documentElement.dataset.lisyanFirstRun = "1";
  }
} catch (error) {}
`;
}

/**
 * Builds the extension package.
 *
 * Chrome/Edge/Brave: MV3, `newtab` override, service-worker-free (no background work needed).
 * Firefox: MV2, `chrome_settings_overrides.homepage` + `newtab` override, because Firefox does not
 * support the MV3 `newtab` key yet and MV2 is what `about:debugging` loads without signing.
 */
export async function buildExtensionFiles(settings: Settings, target: BrowserTarget): Promise<ExtensionFile[]> {
  const state = {
    settings,
    bookmarks: readBookmarks(),
    history: readHistory(),
    savedAt: new Date().toISOString(),
  };
  const stateJson = JSON.stringify(state, null, 2);

  const manifest =
    target === "firefox"
      ? {
          manifest_version: 2,
          name: EXTENSION_NAME,
          version: APP_VERSION,
          description: "Material You search launcher with clock, weather and calendar widgets. Beta release “Marigold”.",
          chrome_settings_overrides: { homepage: "index.html" },
          chrome_url_overrides: { newtab: "index.html" },
          icons: {},
          permissions: ["storage", "tabs", "http://*/*", "https://*/*"],
          background: { scripts: ["background.js"] },
          content_scripts: [
            {
              matches: ["http://*/*", "https://*/*"],
              js: ["favicon-theme.js"],
              run_at: "document_end",
            },
          ],
          browser_specific_settings: {
            gecko: {
              id: "lisyan@lisyan.app",
              strict_min_version: "115.0",
              data_collection_permissions: { required: ["none"] },
            },
          },
        }
      : {
          manifest_version: 3,
          name: EXTENSION_NAME,
          version: APP_VERSION,
          description: "Material You search launcher with clock, weather and calendar widgets. Beta release “Marigold”.",
          chrome_url_overrides: { newtab: "index.html" },
          icons: {},
          // "storage" keeps the launcher's settings; "scripting"+"tabs" power the built-in
          // mini-Tampermonkey (user scripts injected into matching tabs); <all_urls> is the
          // host access those scripts and the favicon repaint need.
          permissions: ["storage", "scripting", "tabs"],
          host_permissions: ["http://*/*", "https://*/*"],
          background: { service_worker: "background.js" },
          // Built-in favicon theming: runs on every http(s) page, no userscript needed.
          content_scripts: [
            {
              matches: ["http://*/*", "https://*/*"],
              js: ["favicon-theme.js"],
              run_at: "document_end",
            },
          ],
        };

  const appSource = await (typeof window === "undefined"
    ? Promise.resolve("")
    : fetch(new URL("lisyan-app.txt", window.location.href), { cache: "no-store" })
        .then((res) => (res.ok ? res.text() : ""))
        .catch(() => ""));

  const extraFiles: ExtensionFile[] = [];
  const page = await buildPageHtml(settings, extraFiles);

  return [
    { path: "manifest.json", content: JSON.stringify(manifest, null, 2) },
    { path: "index.html", content: page },
    { path: "lisyan-state.json", content: stateJson },
    // Registered as a content script in the manifest — favicons are repainted automatically
    // on every site, no Tampermonkey needed.
    { path: "favicon-theme.js", content: buildFaviconUserscript(settings.faviconTheme) },
    { path: "background.js", content: backgroundScript(target) },
    ...(appSource ? [{ path: "app-source.txt", content: appSource }] : []),
    ...extraFiles,
    { path: "README.txt", content: readme(target) },
  ];
}

/**
 * The built single-file app, plus a pre-hydration script that restores the packaged state and a
 * first-run flag. The app itself keeps reading localStorage exactly as on the web.
 */
async function buildPageHtml(settings: Settings, extraFiles: ExtensionFile[]): Promise<string> {
  const built = await readBuiltApp();
  const state = JSON.stringify({
    settings,
    bookmarks: readBookmarks(),
    history: readHistory(),
  });
  const bootCode = `/* LisYan extension boot: restore packaged state, then mark first run. */
(function(){try{
var s=${state};
var KEY_SETTINGS="lisyan_settings",KEY_BOOKMARKS="lisyan_bookmarks",KEY_HISTORY="lisyan_search_history";
if (!localStorage.getItem(KEY_SETTINGS)) localStorage.setItem(KEY_SETTINGS, JSON.stringify(s.settings));
if (!localStorage.getItem(KEY_BOOKMARKS)) localStorage.setItem(KEY_BOOKMARKS, JSON.stringify(s.bookmarks));
if (!localStorage.getItem(KEY_HISTORY)) localStorage.setItem(KEY_HISTORY, JSON.stringify(s.history));
}catch(e){}})();
${bootstrapScript()}`;

  // The dev-server tags (`/src/main.tsx`, `/src/*.css`) survive the single-file build; strip them.
  // Anchors are taken from the END of the document because the built page contains escaped copies
  // of itself inside bundled template strings.
  const anchor = built.lastIndexOf("<body>");
  if (anchor < 0) throw new Error("Built page has no <body> — run npm run build again.");
  const close = built.lastIndexOf("</body>");
  let head = built
    .slice(0, anchor)
    .replace(/<link\b[^>]*href="\/src\/[^"]*"[^>]*>\s*/g, "")
    .replace(/<\/body>\s*<\/html>\s*$/, "");
  let bodyInner = built.slice(anchor + "<body>".length, close).replace(/<script\b[^>]*src="\/src\/main\.tsx"[^>]*>\s*<\/script>/g, "");
  const tail = built.slice(close + "</body>".length);

  // Hard background so a failed paint can never show as a white/black page.
  const guard = `<style>html{background:#0b0b0c;color:#f5f5f7}html[data-theme="light"]{background:#f5f5f7;color:#171719}</style>`;

  let page = `${head}${guard}<body>${bodyInner}</body>${tail}`;

  // MV3 and MV2 extension pages block INLINE scripts (script-src 'self'), which is exactly why
  // packaged pages used to render as a black screen. Every inline <script> becomes an external file.
  page = page.replace(/<script([^>]*)>([\s\S]*?)<\/script>/g, (match, attrs: string, code: string) => {
    if (/src=/.test(attrs)) return match; // already external
    const isModule = /type="module"/.test(attrs);
    const name = isModule ? "app.js" : "boot.js";
    const existing = extraFiles.find((file) => file.path === name);
    const content = code.trim();
    if (existing) existing.content = `${existing.content}\n${content}`;
    else extraFiles.push({ path: name, content: content + "\n" });
    return isModule ? '<script type="module" src="app.js"></script>' : `<script src="boot.js"></script>`;
  });

  // The packaged state must load before the app bundle reads localStorage.
  const bootEntry = extraFiles.find((file) => file.path === "boot.js");
  if (bootEntry) bootEntry.content = `${bootCode}\n${bootEntry.content}`;
  else extraFiles.push({ path: "boot.js", content: bootCode + "\n" });
  // Reference boot.js in <head> unless the extracted head script already did.
  if (!page.includes('src="boot.js"')) page = page.replace("</head>", '<script src="boot.js"></script></head>');
  return page;
}

/**
 * Reads the production build output at download time.
 *
 * The built page is NOT imported into the bundle: an `?raw` import embeds the whole dist inside
 * the app itself, so every build grew and shipped stale markup — that is what rendered as a
 * white page on phones. The post-build step copies dist/index.html to public/lisyan-app.txt,
 * which is served as a plain file both in dev and inside the extension.
 */
async function readBuiltApp(): Promise<string> {
  if (typeof window === "undefined") {
    const { readFile } = await import("node:fs/promises");
    return readFile(path.resolve("public/lisyan-app.txt"), "utf8");
  }
  for (const url of ["lisyan-app.txt", "./index.html"]) {
    try {
      const base = typeof window === "undefined" ? new URL("file:///") : window.location.href;
      const res = await fetch(new URL(url, base), { cache: "no-store" });
      if (!res.ok) continue;
      const text = await res.text();
      if (text.includes('id="root"')) return text;
    } catch {
      // try the next location
    }
  }
  throw new Error("Run npm run build first — the extension needs the built index.html.");
}

function readme(target: BrowserTarget) {
  const chrome = [
    "Chrome / Edge / Brave / Opera",
    "1. Unzip this folder somewhere permanent.",
    "2. Open chrome://extensions (or edge://extensions).",
    "3. Turn on Developer mode.",
    '4. Click "Load unpacked" and select this folder.',
    "5. Open a new tab. LisYan is now your start page.",
    "",
  ].join("\n");
  const firefox = [
    "Firefox",
    "1. Open about:debugging#/runtime/this-firefox",
    '2. Click "Load Temporary Add-on" and pick manifest.json from this folder.',
    "3. Open a new tab. LisYan is now your start page.",
    "Note: Firefox removes temporary add-ons when it closes. A signed build is needed for a permanent install.",
    "",
    "Android: Chrome for Android does not support extensions at all. Use Kiwi Browser",
    "(chrome://extensions works there) or Firefox for Android.",
    "",
  ].join("\n");
  return [
    `${EXTENSION_NAME} ${APP_VERSION} (${RELEASE_CODENAME})`,
    "",
    target === "firefox" ? firefox + chrome : chrome + firefox,
    "Files:",
    "  manifest.json   extension description",
    "  index.html      the whole launcher, single file, works offline",
    "  lisyan-state.json  your current settings, widgets, bookmarks, history",
    "  boot.js         restores packaged settings before the app starts",
    "  app.js          the whole launcher",
    "  favicon-theme.js  content script (already registered in the manifest): repaints the",
    "                   favicons of every site you visit with your Material palette",
    "",
    "Your settings live in this browser profile only. Nothing is uploaded.",
    "To update the launcher, rebuild it and replace index.html — settings survive.",
  ].join("\n");
}

/* ---------- ZIP writer (store-only: no dependencies, browser-native CRC) ---------- */

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c >>> 0;
  }
  return table;
})();

const crc32 = (bytes: Uint8Array) => {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};

/**
 * Minimal store-only ZIP. Sources are already text and the single-file build is ~2 MB,
 * so compression is not worth a dependency.
 */
export function buildZip(files: ExtensionFile[]): Blob {
  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;

  const u16 = (v: number) => new Uint8Array([v & 0xff, (v >> 8) & 0xff]);
  const u32 = (v: number) => new Uint8Array([v & 0xff, (v >> 8) & 0xff, (v >> 16) & 0xff, (v >>> 24) & 0xff]);
  const join = (parts: Uint8Array[]) => {
    const total = parts.reduce((sum, part) => sum + part.length, 0);
    const out = new Uint8Array(total);
    let at = 0;
    for (const part of parts) { out.set(part, at); at += part.length; }
    return out;
  };

  for (const file of files) {
    const nameBytes = encoder.encode(file.path);
    const dataBytes = encoder.encode(file.content);
    const crc = crc32(dataBytes);
    const local = join([
      u32(0x04034b50), u16(20), u16(0), u16(0), u16(0), u16(0x21a4), u32(crc),
      u32(dataBytes.length), u32(dataBytes.length), u16(nameBytes.length), u16(0), nameBytes, dataBytes,
    ]);
    chunks.push(local);
    central.push(join([
      u32(0x02014b50),
      u16(20),
      u16(20),
      u16(20),
      u16(0),
      u16(0),
      u16(0x21a4),
      u32(crc),
      u32(dataBytes.length),
      u32(dataBytes.length),
      u16(nameBytes.length),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(0),
      u32(offset),
      nameBytes,
    ]));
    offset += local.length;
  }

  const centralBytes = join(central);
  chunks.push(centralBytes, join([
    u32(0x06054b50), u16(0), u16(0), u16(files.length), u16(files.length),
    u32(centralBytes.length), u32(offset), u16(0),
  ]));
  return new Blob(chunks as BlobPart[], { type: "application/zip" });
}

/* ---------- CRX3 packaging (ready-to-install .crx, no ZIP step) ---------- */

/** Minimal protobuf writer (just enough for the CRX3 header). */
function pbField(fieldNumber: number, bytes: Uint8Array): Uint8Array {
  const tag = pbVarint((fieldNumber << 3) | 2);
  return concatBytes([tag, pbVarint(bytes.length), bytes]);
}

function pbVarint(value: number): Uint8Array {
  const out: number[] = [];
  let current = value;
  do {
    let byte = current & 0x7f;
    current >>>= 7;
    if (current) byte |= 0x80;
    out.push(byte);
  } while (current);
  return new Uint8Array(out);
}

function concatBytes(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(total);
  let at = 0;
  for (const part of parts) {
    out.set(part, at);
    at += part.length;
  }
  return out;
}

/** Extension id: first 16 bytes of SHA-256 over the DER public key, hex-mapped to a-p. */
function crxIdFromPublicKey(der: Uint8Array): string {
  // NB: digest() may return a Buffer view into a pooled slab — never wrap it in `new Uint8Array(...)`.
  const digest = require("node:crypto").createHash("sha256").update(der).digest().subarray(0, 16);
  return Array.from(digest as Uint8Array)
    .map((byte) => "0123456789abcdef"[byte >> 4] + "0123456789abcdef"[byte & 15])
    .join("")
    .replace(/[0-9a-f]/g, (ch) => String.fromCharCode(97 + parseInt(ch, 16)));
}

/**
 * Packs the extension files into a .crx (CRX3, self-signed).
 *
 * Chrome installs a self-signed CRX via "Load packed" in developer mode — no store, no ZIP
 * extraction step for the user. The signature is valid for its own key, which is all Chrome checks.
 */
export async function buildCrx(files: ExtensionFile[]): Promise<Blob> {
  const { generateKeyPairSync, sign } = await import("node:crypto");
  const { publicKey, privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const publicDer = new Uint8Array(publicKey.export({ type: "spki", format: "der" }));

  const crxId = crxIdFromPublicKey(publicDer);
  // SignedData { 1: crx_id }
  const signedData = pbField(1, new TextEncoder().encode(crxId));
  // AsymmetricKeyProof { 1: public_key, 2: signature over signedData }
  const signature = new Uint8Array(sign("sha256", signedData, privateKey));
  const proof = concatBytes([pbField(1, publicDer), pbField(2, signature)]);
  // CrxFileHeader { 2: proofs, 10000: signed_header_data }
  const header = concatBytes([pbField(2, proof), pbField(10000, signedData)]);

  const magic = new TextEncoder().encode("Cr24");
  const version = new Uint8Array(4);
  new DataView(version.buffer).setUint32(0, 3, true);
  const headerLength = new Uint8Array(4);
  new DataView(headerLength.buffer).setUint32(0, header.length, true);

  const zip = new Uint8Array(await (await buildZip(files)).arrayBuffer());
  const crx = concatBytes([magic, version, headerLength, header, zip]);
  const buffer = new ArrayBuffer(crx.length);
  new Uint8Array(buffer).set(crx);
  return new Blob([buffer], { type: "application/x-chrome-extension" });
}

export const crxFileName = () => `LisYan-${APP_VERSION}-${RELEASE_CODENAME}.crx`;

export const extensionFileName = (target: BrowserTarget) => `LisYan-${APP_VERSION}-${RELEASE_CODENAME}-${target}.zip`;

/** Loads local state for the developer panel read-out. */
export const localStateSummary = () => ({
  settings: readSettings(),
  bookmarks: readBookmarks(),
  history: readHistory(),
  settingsKey: "lisyan_settings",
});
