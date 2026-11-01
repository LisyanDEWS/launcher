import { Check, Languages, Search, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { useSettingsCtx } from "./context";
import { CARD, INPUT, Notice, SettingsGroup } from "../ui";
import { LANGUAGES, type LanguageCode } from "../../i18n/languages";
import { getLanguage, matrixSupport, translate, useI18n } from "../../lib/i18n";
import { cn } from "../../utils/cn";

export default function LanguageSection() {
  const { settings, update, toast, browserLang, matrix } = useSettingsCtx();
  const { t, lang } = useI18n();
  const [query, setQuery] = useState("");
  const needle = query.trim().toLocaleLowerCase();
  const list = LANGUAGES.filter(
    (language) =>
      !needle ||
      language.name.toLocaleLowerCase().includes(needle) ||
      language.english.toLowerCase().includes(needle) ||
      language.code.toLowerCase().includes(needle),
  );

  const choose = (choice: "auto" | LanguageCode) => {
    update({ language: choice });
    const next = choice === "auto" ? browserLang : choice;
    // Tell the user (in the new language) when the switch turns NotMatrix off.
    if (settings.fontTheme === "matrix" && !matrixSupport(next).supported) {
      toast(translate(next, "la.matrixOff", { lang: getLanguage(next).name }));
    }
  };

  return (
    <div className="space-y-6">
      {settings.fontTheme === "matrix" && !matrix.supported && (
        <Notice icon={TriangleAlert}>{t("fo.unsupported", { lang: getLanguage(lang).name })}</Notice>
      )}

      <SettingsGroup title={t("la.title")} description={t("la.desc")}>
        <div className={CARD}>
          <button
            type="button"
            onClick={() => choose("auto")}
            aria-pressed={settings.language === "auto"}
            className="flex min-h-16 w-full items-center gap-4 px-5 py-3 text-start transition hover:bg-[var(--surface-container-high)]"
          >
            <span
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center transition-all duration-300",
                settings.language === "auto" ? "rounded-[12px] bg-[var(--primary)] text-[var(--on-primary)]" : "rounded-full bg-[var(--surface-container-high)]",
              )}
            >
              <Languages size={18} aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-medium">{t("la.auto")}</span>
              <span className="mt-0.5 block text-sm text-[var(--muted)]">{t("la.autoNow", { lang: getLanguage(browserLang).name })}</span>
            </span>
            {settings.language === "auto" && <Check size={20} aria-hidden="true" />}
          </button>
        </div>

        <div className="relative mt-4">
          <Search size={18} className="pointer-events-none absolute start-5 top-1/2 -translate-y-1/2 text-[var(--muted)]" aria-hidden="true" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("la.search")} aria-label={t("la.search")} className={cn(INPUT, "ps-12")} />
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {list.map((language) => {
            const selected = settings.language === language.code;
            const led = matrixSupport(language.code).supported;
            return (
              <button
                key={language.code}
                type="button"
                onClick={() => choose(language.code)}
                aria-pressed={selected}
                className={cn(
                  "flex min-h-14 items-center gap-3 rounded-[18px] px-4 py-2.5 text-start transition-all duration-300",
                  selected
                    ? "rounded-[12px] bg-[var(--secondary-container)] text-[var(--on-secondary-container)]"
                    : "bg-[var(--surface)] hover:bg-[var(--surface-container-high)]",
                )}
              >
                <span className="min-w-0 flex-1">
                  <span lang={language.code} dir="auto" className="block truncate font-medium">
                    {language.name}
                  </span>
                  <span className="block truncate text-xs opacity-70">{language.english}</span>
                </span>
                {led && (
                  <span title={t("la.ledTitle")} className="type-matrix shrink-0 rounded-md border border-current px-1.5 py-1 text-[10px] leading-none opacity-80">
                    LED
                  </span>
                )}
                {selected && <Check size={18} className="shrink-0" aria-hidden="true" />}
              </button>
            );
          })}
          {!list.length && <p className="px-1 text-sm text-[var(--muted)]">{t("la.none")}</p>}
        </div>
        <p className="mt-4 text-xs leading-5 text-[var(--muted)]">{t("la.machine")}</p>
      </SettingsGroup>
    </div>
  );
}
