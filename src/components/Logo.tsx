import { useEffect, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { useFontTheme } from "../lib/font-theme";
import { missingMatrixChars, useI18n } from "../lib/i18n";
import type { FontTheme, LogoColor, LogoStyle, Settings } from "../lib/settings";
import { shapePath, type ShapeId } from "../lib/shapes";
import { cn } from "../utils/cn";

type Size = "full" | "compact" | "thumb";

type Props = {
  settings: Settings;
  dark: boolean;
  /** Smaller variant for the settings preview card. */
  compact?: boolean;
};

export type LogoConfig = Pick<Settings, "logo" | "logoText" | "logoFont" | "logoStyle" | "logoColor" | "logoAnimation">;

export const logoText = (settings: Pick<Settings, "logoText">) => settings.logoText.trim() || "LisYan";
export const logoWord = (config: Pick<Settings, "logo" | "logoText">) => (config.logo === "google" ? "Google" : logoText(config));

/** Whether the logo is set in LED Dot-Matrix — only when the font has all its letters. */
export function textLogoMatrix(settings: Pick<Settings, "logo" | "logoText" | "logoFont" | "logoStyle">, fontTheme: FontTheme) {
  const wants = settings.logoStyle === "matrix" || settings.logoFont === "matrix" || (settings.logoFont === "theme" && fontTheme === "matrix");
  return wants && missingMatrixChars(logoWord(settings)).length === 0;
}

/* ---------- colours ---------- */

type Ink = { fg: string; bg: string; on: string };

const G_BLUE = "#4285F4";
const G_RED = "#EA4335";
const G_YELLOW = "#FBBC05";
const G_GREEN = "#34A853";
const GOOGLE_ORDER = [G_BLUE, G_RED, G_YELLOW, G_BLUE, G_GREEN, G_RED];
const GOOGLE_CYCLE = [G_BLUE, G_RED, G_YELLOW, G_GREEN];

const role = (name: "primary" | "secondary" | "tertiary"): Ink => ({ fg: `var(--${name})`, bg: `var(--${name})`, on: `var(--on-${name})` });
const THEME_CYCLE: Ink[] = [role("primary"), role("tertiary"), role("secondary")];

/** One colour set per letter. */
export function letterInks(word: string, color: LogoColor): Ink[] {
  const letters = Array.from(word);
  const isGoogle = word.toLowerCase() === "google";
  return letters.map((_, i) => {
    switch (color) {
      case "colorful": {
        const c = isGoogle ? GOOGLE_ORDER[i] : GOOGLE_CYCLE[i % 4];
        return { fg: c, bg: c, on: c === G_YELLOW ? "#202124" : "#fff" };
      }
      case "theme":
        return THEME_CYCLE[i % 3];
      case "primary":
        return role("primary");
      case "tertiary":
        return role("tertiary");
      default:
        return { fg: "var(--fg)", bg: "var(--fg)", on: "var(--bg)" };
    }
  });
}

/** Where to split a word into two tones: at the first inner capital (LisYan → Lis|Yan), else the middle. */
function splitWord(word: string) {
  const letters = Array.from(word);
  const cap = letters.findIndex((ch, i) => i > 0 && ch !== ch.toLowerCase() && ch === ch.toUpperCase());
  const at = cap > 0 ? cap : Math.ceil(letters.length / 2);
  return [letters.slice(0, at).join(""), letters.slice(at).join("")];
}

const PILL_SHAPES = ["50%", "32%", "50% 50% 50% 14%", "40% 12% 40% 12%", "14% 50% 50% 50%", "36%"];

/** Width factor per style: how many "cqw per letter" fit. */
const DENSITY: Record<LogoStyle, number> = {
  classic: 170,
  expressive: 128,
  pills: 112,
  shape: 140,
  chip: 118,
  duotone: 120,
  outline: 150,
  dots: 132,
  mark: 130,
  stack: 150,
  matrix: 150,
};

const MAX: Record<Size, number> = { full: 88, compact: 46, thumb: 24 };

/* ---------- the mark ---------- */

function Letters({ word, inks, className, style }: { word: string; inks: Ink[]; className?: string; style?: (ink: Ink, i: number) => CSSProperties }) {
  return (
    <>
      {Array.from(word).map((ch, i) => (
        <span key={i} className={cn("lg-l", className)} style={{ "--i": i, color: inks[i]?.fg, ...style?.(inks[i], i) } as CSSProperties}>
          {ch === " " ? "\u00A0" : ch}
        </span>
      ))}
    </>
  );
}

function ShapeBadge({ shape, fill, children, className }: { shape: ShapeId; fill: string; children: ReactNode; className?: string }) {
  return (
    <span className={cn("lg-badge", className)}>
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <path d={shapePath(shape)} fill={fill} />
      </svg>
      <span className="lg-badge-t">{children}</span>
    </span>
  );
}

/** Pure presentational logo; reused by the home screen, settings previews and the style gallery. */
export function LogoMark({ config, size = "full", fontTheme }: { config: LogoConfig; size?: Size; fontTheme: FontTheme }) {
  const word = logoWord(config);
  const letters = Array.from(word);
  const style = config.logoStyle;
  const inks = letterInks(word, config.logoColor);
  const first = inks[0] ?? role("primary");
  const matrix = textLogoMatrix(config, fontTheme);
  const fontSize = `min(${MAX[size]}px, ${(DENSITY[style] / Math.max(3, letters.length)).toFixed(2)}cqw)`;
  const anim = size === "thumb" ? "none" : config.logoAnimation;

  let body: ReactNode;
  switch (style) {
    case "expressive":
      body = <Letters word={word} inks={inks} />;
      break;

    case "pills":
      body = (
        <Letters
          word={word}
          inks={inks}
          className="lg-pill"
          style={(ink, i) => ({ background: ink.bg, color: ink.on, borderRadius: PILL_SHAPES[i % PILL_SHAPES.length] })}
        />
      );
      break;

    case "shape":
      body = (
        <>
          <ShapeBadge shape="cookie12" fill={first.bg}>
            <span style={{ color: first.on }}>{letters[0]}</span>
          </ShapeBadge>
          <Letters word={letters.slice(1).join("")} inks={inks.slice(1)} />
        </>
      );
      break;

    case "chip":
      body = (
        <span className="lg-chip">
          <span className="lg-chip-dot" style={{ background: first.bg, color: first.on }}>
            {letters[0]}
          </span>
          <span className="lg-chip-word">
            <Letters word={word} inks={inks} />
          </span>
        </span>
      );
      break;

    case "duotone": {
      const [a, b] = splitWord(word);
      const second = inks[Array.from(a).length] ?? role("tertiary");
      body = (
        <>
          <span className="lg-duo lg-duo--a" style={{ background: first.bg, color: first.on }}>
            <Letters word={a} inks={Array.from(a).map(() => ({ ...first, fg: first.on }))} />
          </span>
          <span className="lg-duo lg-duo--b" style={{ color: second.fg }}>
            <Letters word={b} inks={Array.from(b).map(() => second)} />
          </span>
        </>
      );
      break;
    }

    case "outline":
      body = (
        <Letters
          word={word}
          inks={inks}
          className="lg-outline"
          style={(ink) => ({ WebkitTextStrokeColor: ink.fg, textShadow: `0.07em 0.07em 0 color-mix(in srgb, ${ink.fg} 32%, transparent)` })}
        />
      );
      break;

    case "dots":
      body = (
        <>
          <span className="lg-dots" aria-hidden="true">
            {[0, 1, 2, 3].map((i) => (
              <i key={i} style={{ background: letterInks("google", config.logoColor)[[0, 1, 2, 4][i]]?.fg ?? first.fg, "--i": i } as CSSProperties} />
            ))}
          </span>
          <Letters word={word} inks={inks.map(() => ({ fg: "var(--fg)", bg: "var(--fg)", on: "var(--bg)" }))} />
        </>
      );
      break;

    case "mark": {
      const ring = letterInks("google", config.logoColor);
      const arc = (color: string, offset: number) => (
        <circle cx={50} cy={50} r={38} fill="none" stroke={color} strokeWidth={14} pathLength={100} strokeDasharray="23 77" strokeDashoffset={-offset} transform="rotate(-90 50 50)" />
      );
      body = (
        <>
          <span className="lg-ring" aria-hidden="true">
            <svg viewBox="0 0 100 100">
              {arc(ring[0]?.fg ?? first.fg, 1)}
              {arc(ring[1]?.fg ?? first.fg, 26)}
              {arc(ring[2]?.fg ?? first.fg, 51)}
              {arc(ring[4]?.fg ?? first.fg, 76)}
            </svg>
            <span className="lg-ring-t" style={{ color: "var(--fg)" }}>
              {letters[0]}
            </span>
          </span>
          <Letters word={letters.slice(1).join("")} inks={inks.slice(1).map(() => ({ fg: "var(--fg)", bg: "var(--fg)", on: "var(--bg)" }))} />
        </>
      );
      break;
    }

    case "stack":
      body = <Letters word={word} inks={inks} className="lg-stack" />;
      break;

    default:
      body = <Letters word={word} inks={inks} />;
  }

  return (
    <span
      key={`${style}|${config.logoColor}|${anim}|${word}`}
      className={cn("lg", `lg--${style}`, `lg-anim-${anim}`, matrix && "lg--matrix", `lg--${size}`)}
      style={{ fontSize }}
      aria-label={word}
      role="img"
    >
      {body}
    </span>
  );
}

/* ---------- subtitle ---------- */

function useMinute() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    let interval = 0;
    const timeout = window.setTimeout(() => {
      setNow(Date.now());
      interval = window.setInterval(() => setNow(Date.now()), 60000);
    }, 60000 - (Date.now() % 60000));
    return () => {
      window.clearTimeout(timeout);
      window.clearInterval(interval);
    };
  }, []);
  return now;
}

const GREETINGS: Record<string, [string, string, string, string]> = {
  en: ["Good night", "Good morning", "Good afternoon", "Good evening"],
  ru: ["Доброй ночи", "Доброе утро", "Добрый день", "Добрый вечер"],
};

export function logoSubtitleText(settings: Pick<Settings, "logoSubtitle" | "logoSubtitleText">, lang: string, now: number) {
  const date = new Date(now);
  switch (settings.logoSubtitle) {
    case "greeting": {
      const h = date.getHours();
      const set = GREETINGS[lang.slice(0, 2)] ?? GREETINGS.en;
      return set[h < 5 ? 0 : h < 12 ? 1 : h < 18 ? 2 : h < 23 ? 3 : 0];
    }
    case "date":
      try {
        return new Intl.DateTimeFormat(lang, { weekday: "long", day: "numeric", month: "long" }).format(date);
      } catch {
        return date.toDateString();
      }
    case "custom":
      return settings.logoSubtitleText.trim();
    default:
      return "";
  }
}

/* ---------- home screen logo ---------- */

export default function Logo({ settings, compact = false }: Props) {
  const fontTheme = useFontTheme();
  const { lang } = useI18n();
  const now = useMinute();
  const subtitle = logoSubtitleText(settings, lang, now);
  const size: Size = compact ? "compact" : "full";

  return (
    <div className={cn("lg-box", compact ? "lg-box--compact" : "lg-box--full")}>
      {settings.logo !== "none" && <LogoMark config={settings} size={size} fontTheme={fontTheme} />}
      {subtitle && (
        <p className="lg-sub" key={subtitle}>
          {subtitle}
        </p>
      )}
      {settings.logo === "none" && !subtitle && <span aria-hidden="true" className="block h-6" />}
    </div>
  );
}
