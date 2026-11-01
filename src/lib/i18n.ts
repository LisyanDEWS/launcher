import { createContext, useContext } from "react";
import { en, type MessageKey } from "../i18n/en";
import { LOCALE_DATA, LOCALE_KEYS } from "../i18n/generated";
import { LANGUAGES, RTL_LANGUAGES, type LanguageCode, type LanguageInfo } from "../i18n/languages";
import { ru } from "../i18n/ru";

export type { MessageKey };
export type Vars = Record<string, string | number>;
type Dictionary = Partial<Record<MessageKey, string>>;

const dictionaries = new Map<LanguageCode, Dictionary>([
  ["en", en],
  ["ru", ru],
]);

export function getDictionary(code: LanguageCode): Dictionary {
  let dictionary = dictionaries.get(code);
  if (!dictionary) {
    const values = LOCALE_DATA[code] ?? [];
    const built: Record<string, string> = {};
    LOCALE_KEYS.forEach((key, index) => {
      const value = values[index];
      if (value) built[key] = value; // empty = not translated → English fallback
    });
    dictionary = built as Dictionary;
    dictionaries.set(code, dictionary);
  }
  return dictionary;
}

export function translate(code: LanguageCode, key: MessageKey, vars?: Vars): string {
  const template = getDictionary(code)[key] ?? en[key];
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) => (name in vars ? String(vars[name]) : match));
}

export function getLanguage(code: LanguageCode): LanguageInfo {
  return LANGUAGES.find((language) => language.code === code) ?? LANGUAGES[1];
}

export const isRtl = (code: LanguageCode) => RTL_LANGUAGES.has(code);

const ALIASES: Record<string, LanguageCode> = { iw: "he", no: "nb", nn: "nb", tl: "fil", in: "id" };

/** Best match for the browser's preferred languages; English when nothing fits. */
export function detectLanguage(): LanguageCode {
  const preferred = typeof navigator === "undefined" ? [] : [...(navigator.languages ?? []), navigator.language];
  for (const tag of preferred) {
    if (!tag) continue;
    const lower = tag.toLowerCase();
    if (lower.startsWith("zh")) return /-(tw|hk|mo)|hant/.test(lower) ? "zh-TW" : "zh-CN";
    const base = lower.split("-")[0];
    const code = ALIASES[base] ?? base;
    const match = LANGUAGES.find((language) => language.code === code);
    if (match) return match.code;
  }
  return "en";
}

/* ---------- LED Dot-Matrix coverage ---------- */

// Letters present in the font (from its cmap). Punctuation is not checked: the browser
// falls back per glyph, which is fine for symbols but breaks the look for whole words.
const MATRIX_LETTERS = new Set(
  Array.from("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyzÀÁÂÃÄÈÉÊÌÍÎÒÓÔÕÖÙÚÛàáâãäèéêìíîòóôõöùúûý"),
);
const LETTER = /[\p{L}\p{M}]/u;

export function missingMatrixChars(text: string): string[] {
  const missing = new Set<string>();
  for (const ch of text) if (LETTER.test(ch) && !MATRIX_LETTERS.has(ch)) missing.add(ch);
  return [...missing];
}

export type MatrixSupport = { supported: boolean; missing: string[] };
const supportCache = new Map<LanguageCode, MatrixSupport>();

/** A language is supported when both its alphabet and its translated UI strings fit the font. */
export function matrixSupport(code: LanguageCode): MatrixSupport {
  const cached = supportCache.get(code);
  if (cached) return cached;
  const info = getLanguage(code);
  const text = info.sample + info.sample.toUpperCase() + Object.values(getDictionary(code)).join("");
  const missing = missingMatrixChars(text);
  const result = { supported: missing.length === 0, missing };
  supportCache.set(code, result);
  return result;
}

export const formatChars = (chars: string[], max = 8) => chars.slice(0, max).join(" ") + (chars.length > max ? " …" : "");

/* ---------- React context ---------- */

export type I18n = { lang: LanguageCode; dir: "ltr" | "rtl"; t: (key: MessageKey, vars?: Vars) => string };

export const I18nContext = createContext<I18n>({ lang: "en", dir: "ltr", t: (key, vars) => translate("en", key, vars) });

export const useI18n = () => useContext(I18nContext);
