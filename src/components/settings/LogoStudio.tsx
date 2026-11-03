import { Check, EyeOff, RotateCcw, Sparkles, Type } from "lucide-react";
import { useState } from "react";
import Logo, { LogoMark } from "../Logo";
import { CARD, INPUT, Segmented } from "../ui";
import { useFontTheme } from "../../lib/font-theme";
import { useI18n } from "../../lib/i18n";
import { LOGO_STYLES, type LogoAnimation, type LogoColor, type LogoStyle, type LogoSubtitle, type Settings } from "../../lib/settings";
import { cn } from "../../utils/cn";

type Props = {
  settings: Settings;
  update: (patch: Partial<Settings>) => void;
  /** Tighter layout for the home-screen side panel. */
  dense?: boolean;
};

const STYLE_NAMES: Record<LogoStyle, [string, string]> = {
  classic: ["Classic", "Классика"],
  expressive: ["Expressive", "Выразительный"],
  pills: ["Shapes", "Фигуры"],
  shape: ["Cookie", "Печенье"],
  chip: ["Chip", "Чип"],
  duotone: ["Two-tone", "Два тона"],
  outline: ["Echo", "Эхо"],
  dots: ["Dots", "Точки"],
  mark: ["Ring", "Кольцо"],
  stack: ["Playful", "Игривый"],
  matrix: ["Dot matrix", "Матрица"],
};

const COLOR_SWATCH: Record<LogoColor, string[]> = {
  colorful: ["#4285F4", "#EA4335", "#FBBC05", "#34A853"],
  theme: ["var(--primary)", "var(--tertiary)", "var(--secondary)"],
  primary: ["var(--primary)"],
  tertiary: ["var(--tertiary)"],
  mono: ["var(--fg)"],
};

const SUGGESTIONS = ["LisYan", "Lis", "Search", "Hello", "Home"];

type Word = "google" | "lisyan" | "custom" | "none";

export default function LogoStudio({ settings, update, dense = false }: Props) {
  const { lang } = useI18n();
  const ru = lang.startsWith("ru");
  const L = (en: string, rus: string) => (ru ? rus : en);
  const fontTheme = useFontTheme();
  const [replay, setReplay] = useState(0);

  const word: Word =
    settings.logo === "none" ? "none" : settings.logo === "google" ? "google" : settings.logoText.trim() === "" || settings.logoText.trim() === "LisYan" ? "lisyan" : "custom";
  const [customOpen, setCustomOpen] = useState(word === "custom");

  const setWord = (next: Word) => {
    setCustomOpen(next === "custom");
    if (next === "google") update({ logo: "google" });
    else if (next === "none") update({ logo: "none" });
    else if (next === "lisyan") update({ logo: "text", logoText: "LisYan" });
    else update({ logo: "text", logoText: settings.logoText.trim() && settings.logoText.trim() !== "LisYan" ? settings.logoText : "" });
  };

  const words: { id: Word; label: string; icon?: typeof Type }[] = [
    { id: "google", label: "Google" },
    { id: "lisyan", label: "LisYan" },
    { id: "custom", label: L("Custom", "Свой"), icon: Type },
    { id: "none", label: L("None", "Нет"), icon: EyeOff },
  ];

  const colors: { id: LogoColor; label: string }[] = [
    { id: "colorful", label: L("Colorful", "Цветной") },
    { id: "theme", label: L("Theme", "Тема") },
    { id: "primary", label: L("Primary", "Основной") },
    { id: "tertiary", label: L("Accent", "Акцент") },
    { id: "mono", label: L("Mono", "Моно") },
  ];

  const section = "space-y-2";
  const label = "px-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]";

  return (
    <div className={dense ? "space-y-3" : "space-y-5"}>
      {/* Live preview */}
      <div className={cn(CARD, "relative overflow-hidden")}>
        <div className="lg-preview" key={replay}>
          <Logo settings={settings} dark={false} compact={dense} />
        </div>
        <button
          type="button"
          onClick={() => setReplay((n) => n + 1)}
          className="absolute end-2 top-2 flex h-8 w-8 items-center justify-center rounded-full text-[var(--muted)] transition hover:bg-[var(--surface-container-high)] hover:text-[var(--fg)]"
          title={L("Replay animation", "Повторить анимацию")}
          aria-label={L("Replay animation", "Повторить анимацию")}
        >
          <RotateCcw size={15} />
        </button>
      </div>

      {/* Word */}
      <div className={section}>
        <div className={label}>{L("Logo text", "Текст логотипа")}</div>
        <div className="grid grid-cols-4 gap-1 rounded-full bg-[var(--surface-container-high)] p-1">
          {words.map(({ id, label: text, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setWord(id)}
              aria-pressed={word === id}
              className={cn(
                "flex h-9 min-w-0 items-center justify-center gap-1 rounded-full px-2 text-xs font-semibold transition-all duration-300",
                word === id ? "rounded-[12px] bg-[var(--primary)] text-[var(--on-primary)]" : "text-[var(--muted)] hover:text-[var(--fg)]",
              )}
            >
              {Icon && <Icon size={13} className="shrink-0" aria-hidden="true" />}
              <span className="truncate">{text}</span>
            </button>
          ))}
        </div>
        {(word === "custom" || customOpen) && settings.logo === "text" && (
          <div className="space-y-2">
            <input
              value={settings.logoText}
              maxLength={24}
              autoFocus={!dense}
              onChange={(e) => update({ logoText: e.target.value })}
              placeholder={L("Your name or brand", "Ваше имя или бренд")}
              className={cn(INPUT, "h-11")}
            />
            <div className="flex flex-wrap gap-1">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => update({ logoText: s })}
                  className="h-7 rounded-full bg-[var(--surface-container-high)] px-3 text-xs font-medium transition hover:bg-[var(--surface-container-highest)]"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {settings.logo !== "none" && (
        <>
          {/* Style gallery */}
          <div className={section}>
            <div className={label}>{L("Style", "Стиль")}</div>
            <div className={cn("grid gap-1.5", dense ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3")}>
              {LOGO_STYLES.map((style) => {
                const active = settings.logoStyle === style;
                return (
                  <button
                    key={style}
                    type="button"
                    onClick={() => update({ logoStyle: style })}
                    aria-pressed={active}
                    className={cn("lg-tile", active && "is-active")}
                  >
                    <span className="lg-tile-preview">
                      <LogoMark config={{ ...settings, logoStyle: style }} size="thumb" fontTheme={fontTheme} />
                    </span>
                    <span className="lg-tile-name">
                      {active && <Check size={12} strokeWidth={3} aria-hidden="true" />}
                      {STYLE_NAMES[style][ru ? 1 : 0]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Colour */}
          <div className={section}>
            <div className={label}>{L("Color", "Цвет")}</div>
            <div className="flex flex-wrap gap-1.5">
              {colors.map(({ id, label: text }) => {
                const active = settings.logoColor === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => update({ logoColor: id })}
                    aria-pressed={active}
                    className={cn(
                      "flex h-9 items-center gap-2 rounded-full pe-3.5 ps-1.5 text-xs font-semibold transition-all duration-300",
                      active ? "rounded-[12px] bg-[var(--secondary-container)] text-[var(--on-secondary-container)] ring-2 ring-[var(--primary)]" : "bg-[var(--surface-container-high)] hover:bg-[var(--surface-container-highest)]",
                    )}
                  >
                    <span className="lg-swatch" style={{ background: swatch(COLOR_SWATCH[id]) }} />
                    {text}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Animation */}
          <div className={section}>
            <div className={label}>{L("Animation", "Анимация")}</div>
            <Segmented<LogoAnimation>
              label={L("Animation", "Анимация")}
              value={settings.logoAnimation}
              onChange={(logoAnimation) => {
                update({ logoAnimation });
                setReplay((n) => n + 1);
              }}
              options={[
                { value: "none", label: L("None", "Нет") },
                { value: "rise", label: L("Rise", "Подъём") },
                { value: "wave", label: L("Wave", "Волна") },
                { value: "bounce", label: L("Bounce", "Прыжок") },
              ]}
            />
          </div>
        </>
      )}

      {/* Subtitle */}
      <div className={section}>
        <div className={label}>
          <Sparkles size={11} className="mb-0.5 me-1 inline" aria-hidden="true" />
          {L("Line under the logo", "Строка под логотипом")}
        </div>
        <Segmented<LogoSubtitle>
          label={L("Line under the logo", "Строка под логотипом")}
          value={settings.logoSubtitle}
          onChange={(logoSubtitle) => update({ logoSubtitle })}
          options={[
            { value: "none", label: L("None", "Нет") },
            { value: "greeting", label: L("Greeting", "Приветствие") },
            { value: "date", label: L("Date", "Дата") },
            { value: "custom", label: L("Custom", "Свой") },
          ]}
        />
        {settings.logoSubtitle === "custom" && (
          <input
            value={settings.logoSubtitleText}
            maxLength={60}
            onChange={(e) => update({ logoSubtitleText: e.target.value })}
            placeholder={L("e.g. Have a nice day", "Например: Хорошего дня")}
            className={cn(INPUT, "h-11")}
          />
        )}
      </div>
    </div>
  );
}

function swatch(colors: string[]) {
  if (colors.length === 1) return colors[0];
  const step = 100 / colors.length;
  return `conic-gradient(${colors.map((c, i) => `${c} ${i * step}% ${(i + 1) * step}%`).join(", ")})`;
}
