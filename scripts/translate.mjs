#!/usr/bin/env node
/**
 * Generates src/i18n/generated.ts — machine translations of src/i18n/en.ts for every
 * interface language except English and Russian (Russian is written by hand).
 *
 *   node scripts/translate.mjs            # all languages
 *   node scripts/translate.mjs de fr ja   # only these, merged into the existing file
 *
 * Providers: Yandex Translate (batch requests, keeps {placeholders}) for most languages,
 * Bing Translator for Traditional Chinese. Strings whose {placeholders} don't survive
 * translation are left empty and fall back to English at runtime.
 */
import { randomUUID } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const ROOT = new URL("../", import.meta.url);
const OUT_PATH = "src/i18n/generated.ts";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const read = (path) => readFileSync(new URL(path, ROOT), "utf8");
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Evaluates the plain-data literal that follows `export const <name>` in a TS file. */
function loadLiteral(path, name, open, close) {
  const source = read(path);
  const start = source.indexOf(`export const ${name}`);
  const from = source.indexOf(open, start);
  const to = source.indexOf(close, from);
  if (start < 0 || from < 0 || to < 0) throw new Error(`Cannot find ${name} in ${path}`);
  return Function(`"use strict"; return (${source.slice(from, to + 2)});`)();
}

const en = loadLiteral("src/i18n/en.ts", "en", "{", "\n};");
const languages = loadLiteral("src/i18n/languages.ts", "LANGUAGES", "[", "\n] as const");
const keys = Object.keys(en);
/** Values copied verbatim (names). */
const KEEP = new Set(["sec.about.d"]);

/* ---------- providers ---------- */

const YANDEX_CODES = { "zh-CN": "zh", fil: "tl", nb: "no" };
const BING_CODES = { "zh-TW": "zh-Hant" };
const YANDEX_ID = `${randomUUID().replaceAll("-", "")}-0-0`;

async function yandex(target, texts) {
  const body = new URLSearchParams();
  texts.forEach((text) => body.append("text", text));
  const response = await fetch(`https://translate.yandex.net/api/v1/tr.json/translate?id=${YANDEX_ID}&srv=android&lang=en-${target}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": UA },
    body,
  });
  if (!response.ok) throw new Error(`Yandex HTTP ${response.status}`);
  const data = await response.json();
  if (data.code !== 200 || !Array.isArray(data.text) || data.text.length !== texts.length) throw new Error(`Yandex: ${JSON.stringify(data).slice(0, 120)}`);
  return data.text;
}

let bingSession = null;
async function bing(target, texts) {
  if (!bingSession) {
    const page = await fetch("https://www.bing.com/translator", { headers: { "User-Agent": UA } });
    const html = await page.text();
    const [, key, token] = html.match(/params_AbusePreventionHelper\s*=\s*\[(\d+),"([^"]+)"/) ?? [];
    const [, ig] = html.match(/IG:"([A-F0-9]+)"/) ?? [];
    if (!key || !token || !ig) throw new Error("Bing session not found");
    const cookies = (page.headers.getSetCookie?.() ?? []).map((cookie) => cookie.split(";")[0]).join("; ");
    bingSession = { key, token, ig, cookies };
  }
  const { key, token, ig, cookies } = bingSession;
  const response = await fetch(`https://www.bing.com/ttranslatev3?isVertical=1&IG=${ig}&IID=translator.5028.1`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": UA, Cookie: cookies },
    body: new URLSearchParams({ fromLang: "en", to: target, text: texts.join("\n"), token, key }),
  });
  if (!response.ok) throw new Error(`Bing HTTP ${response.status}`);
  const data = await response.json();
  const lines = data?.[0]?.translations?.[0]?.text?.split("\n");
  if (!lines || lines.length !== texts.length) throw new Error("Bing: line count mismatch");
  return lines;
}

function providerFor(language) {
  if (BING_CODES[language.code]) return { name: "bing", limit: 900, run: (texts) => bing(BING_CODES[language.code], texts) };
  const code = YANDEX_CODES[language.code] ?? language.code;
  return { name: "yandex", limit: 3000, run: (texts) => yandex(code, texts) };
}

async function withRetry(run, attempts = 4) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await run();
    } catch (error) {
      if (attempt + 1 >= attempts) throw error;
      await sleep(800 * 2 ** attempt);
    }
  }
}

/* ---------- placeholders ---------- */

/** Names that must never be translated (longest first). */
const BRANDS = [
  "Material Color Utilities",
  "LED Dot-Matrix",
  "M3 Expressive",
  "Material You",
  "Material 3",
  "NotMatrix",
  "Roboto Flex",
  "Krafti Lab",
  "Onur Cem Tan",
  "LisYan",
  "Google",
  "Lucide",
  "Material",
];

/** {name} and brand names → {0}, {1}…: numbered tokens survive machine translation much better. */
function protect(text) {
  const names = [];
  let out = text.replace(/\{(\w+)\}/g, (_, name) => `{${names.push(`{${name}}`) - 1}}`);
  for (const brand of BRANDS) {
    if (out.includes(brand)) out = out.split(brand).join(`{${names.push(brand) - 1}}`);
  }
  return { out, names };
}

function restore(text, names) {
  let broken = false;
  const out = text.trim().replace(/\{\s*(\d+)\s*\}/g, (match, index) => {
    const value = names[Number(index)];
    if (value === undefined) {
      broken = true;
      return match;
    }
    return value;
  });
  if (!out || broken || names.some((value) => !out.includes(value))) return null;
  return out;
}

/* ---------- pipeline ---------- */

async function translateLanguage(language) {
  const provider = providerFor(language);
  const prepared = keys.map((key) => protect(en[key]));
  const chunks = [];
  let current = [];
  let size = 0;
  prepared.forEach((item, index) => {
    if (KEEP.has(keys[index])) return;
    if (current.length && size + item.out.length > provider.limit) {
      chunks.push(current);
      current = [];
      size = 0;
    }
    current.push(index);
    size += item.out.length + 1;
  });
  if (current.length) chunks.push(current);

  const result = keys.map((key) => (KEEP.has(key) ? en[key] : ""));
  let fallbacks = 0;
  for (const chunk of chunks) {
    let lines;
    try {
      lines = await withRetry(() => provider.run(chunk.map((index) => prepared[index].out)));
    } catch {
      // Batch failed (e.g. merged lines) — translate this chunk string by string.
      lines = [];
      for (const index of chunk) {
        try {
          lines.push((await withRetry(() => provider.run([prepared[index].out])))[0]);
        } catch {
          lines.push("");
        }
      }
    }
    chunk.forEach((index, line) => {
      const restored = restore(lines[line] ?? "", prepared[index].names);
      if (restored) result[index] = restored;
      else fallbacks += 1;
    });
    await sleep(150);
  }
  return { result, fallbacks, provider: provider.name };
}

function readExisting() {
  if (!existsSync(new URL(OUT_PATH, ROOT))) return {};
  const match = read(OUT_PATH).match(/JSON\.parse\(("(?:[^"\\]|\\.)*")\)/s);
  if (!match) return {};
  try {
    const payload = JSON.parse(JSON.parse(match[1]));
    const data = {};
    for (const [code, values] of Object.entries(payload.data)) {
      const byKey = Object.fromEntries(payload.keys.map((key, index) => [key, values[index]]));
      data[code] = keys.map((key) => byKey[key] ?? "");
    }
    return data;
  } catch {
    return {};
  }
}

const only = process.argv.slice(2);
const targets = languages.filter((language) => language.code !== "en" && language.code !== "ru" && (!only.length || only.includes(language.code)));
const data = readExisting();
let cursor = 0;

async function worker() {
  while (cursor < targets.length) {
    const language = targets[cursor++];
    try {
      const { result, fallbacks, provider } = await translateLanguage(language);
      data[language.code] = result;
      console.log(`✓ ${language.code.padEnd(6)} ${language.english} [${provider}]${fallbacks ? ` — ${fallbacks} string(s) fall back to English` : ""}`);
    } catch (error) {
      console.error(`✗ ${language.code}: ${error.message}`);
      process.exitCode = 1;
    }
  }
}

await Promise.all(Array.from({ length: 3 }, worker));

const ordered = Object.fromEntries(languages.filter((language) => data[language.code]).map((language) => [language.code, data[language.code]]));
const payload = JSON.stringify({ keys, data: ordered });
writeFileSync(
  new URL(OUT_PATH, ROOT),
  `// AUTO-GENERATED by scripts/translate.mjs from src/i18n/en.ts — do not edit by hand.\n` +
    `// Machine translation (Yandex / Bing); corrections by native speakers are welcome.\n` +
    `const payload: { keys: string[]; data: Record<string, string[]> } = JSON.parse(${JSON.stringify(payload)});\n\n` +
    `export const LOCALE_KEYS = payload.keys;\nexport const LOCALE_DATA = payload.data;\n`,
);
console.log(`Wrote ${Object.keys(ordered).length} languages × ${keys.length} strings → ${OUT_PATH}`);
