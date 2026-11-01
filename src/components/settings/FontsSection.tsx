import { CaseSensitive, Grid3x3, Layers, Sparkles, TriangleAlert } from "lucide-react";
import { useSettingsCtx } from "./context";
import Logo, { logoText } from "../Logo";
import { CARD, ChoiceList, INPUT, Notice, SettingsGroup } from "../ui";
import { LANGUAGES } from "../../i18n/languages";
import { formatChars, getLanguage, matrixSupport, missingMatrixChars, useI18n } from "../../lib/i18n";
import type { FontTheme, LogoFont } from "../../lib/settings";
import { cn } from "../../utils/cn";

export default function FontsSection() {
  const { settings, update, matrix, fontTheme, dark } = useSettingsCtx();
  const { t, lang } = useI18n();
  const textMissing = missingMatrixChars(logoText(settings));
  const supportedLanguages = LANGUAGES.filter((language) => matrixSupport(language.code).supported);

  return (
    <div className="space-y-8">
      <SettingsGroup title={t("fo.style")} description={t("fo.styleDesc")}>
        {!matrix.supported && (
          <div className="mb-3">
            <Notice icon={TriangleAlert}>
              <p>{t("fo.unsupported", { lang: getLanguage(lang).name })}</p>
              <p className="mt-1 opacity-80">{t("fo.missing", { chars: formatChars(matrix.missing) })}</p>
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <span className="me-1 text-xs font-medium">{t("fo.supported")}</span>
                {supportedLanguages.map((language) => (
                  <button
                    key={language.code}
                    type="button"
                    lang={language.code}
                    onClick={() => update({ language: language.code })}
                    className="rounded-full bg-[var(--surface)] px-3 py-1 text-xs font-medium text-[var(--fg)] transition hover:bg-[var(--surface-container-high)]"
                  >
                    {language.name}
                  </button>
                ))}
              </div>
            </Notice>
          </div>
        )}
        <ChoiceList<FontTheme>
          label={t("fo.style")}
          value={fontTheme}
          onChange={(value) => update({ fontTheme: value })}
          options={[
            {
              value: "m3",
              label: "M3 Expressive",
              description: t("fo.m3Desc"),
              icon: Sparkles,
              preview: <span className="type-sans text-2xl font-black">Aa</span>,
            },
            {
              value: "matrix",
              label: "NotMatrix",
              description: t("fo.matrixDesc"),
              icon: Grid3x3,
              preview: <span className="type-matrix text-2xl">Aa</span>,
              disabled: !matrix.supported,
              badge: matrix.supported ? undefined : t("common.unavailable"),
            },
          ]}
        />
      </SettingsGroup>

      <SettingsGroup title={t("fo.logoFont")} description={t("fo.logoFontDesc")}>
        {textMissing.length > 0 && (
          <div className="mb-3">
            <Notice icon={TriangleAlert}>{t("fo.textUnsupported", { chars: formatChars(textMissing) })}</Notice>
          </div>
        )}
        <ChoiceList<LogoFont>
          label={t("fo.logoFont")}
          value={settings.logoFont}
          onChange={(logoFont) => update({ logoFont })}
          options={[
            {
              value: "theme",
              label: t("fo.lf.theme"),
              description: t("fo.lf.now", { font: fontTheme === "matrix" ? "LED Dot-Matrix" : "M3 Expressive" }),
              icon: Layers,
            },
            {
              value: "sans",
              label: "M3 Expressive",
              description: t("fo.lf.sansDesc"),
              icon: CaseSensitive,
              preview: <span className="type-sans text-2xl font-black">Aa</span>,
            },
            {
              value: "matrix",
              label: "LED Dot-Matrix",
              description: "Krafti Lab",
              icon: Grid3x3,
              preview: <span className="type-matrix text-2xl">Aa</span>,
              disabled: textMissing.length > 0,
              badge: textMissing.length > 0 ? t("common.unavailable") : undefined,
            },
          ]}
        />
        {settings.logo === "text" ? (
          <input
            value={settings.logoText}
            maxLength={40}
            onChange={(event) => update({ logoText: event.target.value })}
            placeholder={t("ap.logo.placeholder")}
            aria-label={t("ap.logo.text")}
            className={cn(INPUT, "mt-3")}
          />
        ) : (
          <p className="mt-3 px-1 text-sm text-[var(--muted)]">
            {settings.logo === "google" ? t("fo.logoNowGoogle") : t("fo.logoNowNone")}{" "}
            <button
              type="button"
              onClick={() => update({ logo: "text" })}
              className="font-medium text-[var(--fg)] underline decoration-[var(--muted)] underline-offset-4 hover:decoration-[var(--fg)]"
            >
              {t("fo.useText")}
            </button>
          </p>
        )}
      </SettingsGroup>

      <SettingsGroup title={t("sb.preview")} description={t("fo.previewDesc")}>
        <div className={cn(CARD, "p-6")}>
          <Logo settings={settings} dark={dark} compact />
          <div className="mt-6 space-y-1 border-t border-[var(--line)] pt-5">
            <p className="type-matrix text-lg leading-7 sm:text-xl">ABCDEFGHIJKLMNOPQRSTUVWXYZ</p>
            <p className="type-matrix text-lg leading-7 sm:text-xl">abcdefghijklmnopqrstuvwxyz 0123456789</p>
            <p className="type-sans text-lg font-black leading-7 sm:text-xl">M3 Expressive · Aa Бб Ωω 0123456789</p>
          </div>
          <p className="mt-5 text-xs leading-5 text-[var(--muted)]">{t("fo.license")}</p>
        </div>
      </SettingsGroup>
    </div>
  );
}
