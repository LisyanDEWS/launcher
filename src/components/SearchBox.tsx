import { ArrowRight, Bot, Brain, ChevronRight, Globe, Search, Sparkles, Zap } from "lucide-react";
import type { CSSProperties, InputHTMLAttributes, Ref } from "react";
import AnimatedInput from "./AnimatedInput";
import LoadingIndicator from "./LoadingIndicator";
import type { MessageKey } from "../lib/i18n";
import type { SearchStyle, TextAnim } from "../lib/settings";
import { cn } from "../utils/cn";

const ICONS = { search: Search, sparkles: Sparkles, globe: Globe, chevron: ChevronRight } as const;
const AI_ICONS = { sparkles: Sparkles, bot: Bot, brain: Brain, zap: Zap } as const;

const SHADOWS: Record<SearchStyle["shadow"], string> = {
  none: "0 0 0 0 transparent",
  soft: "0 2px 10px rgb(0 0 0 / 0.1)",
  medium: "0 10px 30px rgb(0 0 0 / 0.16)",
  strong: "0 22px 60px rgb(0 0 0 / 0.3)",
  glow: "0 0 0 1px color-mix(in srgb, var(--primary) 35%, transparent), 0 0 36px color-mix(in srgb, var(--primary) 32%, transparent)",
  hard: "6px 6px 0 0 var(--fg)",
};

const RINGS: Record<SearchStyle["focusRing"], string> = {
  none: "",
  ring: "0 0 0 3px color-mix(in srgb, var(--primary) 42%, transparent)",
  glow: "0 0 0 1px var(--primary), 0 0 30px color-mix(in srgb, var(--primary) 45%, transparent)",
};

const BORDERS: Record<SearchStyle["borderColor"], string> = { outline: "var(--outline)", primary: "var(--primary)", fg: "var(--fg)" };

export const searchHints = (t: (key: MessageKey) => string) => [t("hint.1"), t("hint.2"), "github.com", t("hint.3")];

function mix(variable: string, alpha: number) {
  if (alpha <= 0) return "transparent";
  if (alpha >= 100) return `var(${variable})`;
  return `color-mix(in srgb, var(${variable}) ${alpha}%, transparent)`;
}

/** Turns a style object into CSS variables consumed by .sb / .sb-btn in index.css. */
function boxVars(s: SearchStyle, translucent: boolean): CSSProperties {
  const lined = s.fill === "outlined" || s.fill === "underline";
  let alpha = s.fill === "underline" || s.fill === "transparent" ? 0 : s.opacity;
  if (s.fill === "filled" && translucent) alpha = Math.min(alpha, 78);
  const frosted = s.fill === "glass" || (s.fill === "filled" && translucent);
  const border = lined ? Math.max(1, s.borderWidth) : s.borderWidth;
  const buttonHeight = Math.max(32, s.height - 16);
  const buttonRadius = Math.max(0, Math.min(buttonHeight / 2, s.radius - 8));
  return {
    "--sb-h": `${s.height}px`,
    "--sb-r": `${s.radius}px`,
    "--sb-rf": `${s.focusRadius}px`,
    "--sb-scale": String(s.focusScale / 100),
    "--sb-bg": mix("--surface-container-high", alpha),
    "--sb-bg-focus": mix("--surface-container-highest", alpha),
    "--sb-bw": s.fill === "underline" ? `0 0 ${border}px 0` : `${border}px`,
    "--sb-bc": BORDERS[s.borderColor],
    "--sb-bc-focus": lined && s.borderColor !== "fg" ? "var(--primary)" : BORDERS[s.borderColor],
    "--sb-shadow": SHADOWS[s.shadow],
    "--sb-shadow-focus": [SHADOWS[s.shadow], RINGS[s.focusRing]].filter(Boolean).join(", "),
    "--sb-backdrop": frosted && s.blur > 0 ? `blur(${s.blur}px) saturate(1.5)` : "none",
    "--sb-btn-h": `${buttonHeight}px`,
    "--sb-btn-r": `${buttonRadius}px`,
    "--sb-btn-r-hover": `${Math.min(buttonRadius, Math.round(buttonHeight * 0.3))}px`,
    "--sb-ps": `${Math.round(s.height * (s.icon === "none" ? 0.36 : 0.3))}px`,
    "--sb-pe": s.button === "none" ? `${Math.round(s.height * 0.36)}px` : "8px",
    fontSize: `${s.fontSize}px`,
    fontWeight: s.fontWeight,
  } as CSSProperties;
}

type Props = {
  style: SearchStyle;
  anim: TextAnim;
  placeholder: string;
  submitLabel: string;
  value?: string;
  onValueChange?: (value: string) => void;
  onAiSearch?: (query: string) => void;
  hints?: string[];
  going?: boolean;
  translucent?: boolean;
  autoFocus?: boolean;
  inputRef?: Ref<HTMLInputElement>;
  inputProps?: InputHTMLAttributes<HTMLInputElement>;
  compact?: boolean;
};

/** The search field, fully driven by SearchStyle. Must be placed inside a <form>. */
export default function SearchBox({
  style: s,
  anim,
  placeholder,
  submitLabel,
  value = "",
  onValueChange,
  onAiSearch,
  hints = [],
  going = false,
  translucent = false,
  autoFocus,
  inputRef,
  inputProps,
  compact = false,
}: Props) {
  const Icon = s.icon === "none" ? null : ICONS[s.icon];
  const iconSize = Math.round(Math.min(30, Math.max(14, s.height * 0.34)));
  const buttonHeight = Math.max(32, s.height - 16);
  const iconButton = s.button === "icon";

  const buttonClass = cn(
    "sb-btn",
    iconButton ? "aspect-square" : "px-[1.1em]",
    s.button === "tonal" ? "sb-btn--tonal" : "sb-btn--primary",
  );
  const buttonContent = iconButton ? (
    <ArrowRight size={Math.round(buttonHeight * 0.45)} className="rtl:-scale-x-100" aria-hidden="true" />
  ) : (
    submitLabel
  );

  // AI search button
  const showAiButton = s.aiButton !== false;
  const AiIcon = AI_ICONS[s.aiButtonIcon ?? "sparkles"] ?? Sparkles;
  const aiBtnSize = Math.min(s.aiButtonSize ?? 34, buttonHeight);
  const aiStyle = s.aiButtonStyle ?? "accent";

  const aiButtonClasses = cn(
    "group relative flex shrink-0 items-center justify-center rounded-full transition-all duration-300 hover:scale-105 active:scale-95",
    aiStyle === "accent" && "bg-[var(--primary)] text-[var(--on-primary)] shadow-sm",
    aiStyle === "tonal" && "bg-[var(--secondary-container)] text-[var(--on-secondary-container)]",
    aiStyle === "glow" && "bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 text-white shadow-[0_0_12px_rgba(168,85,247,0.45)]",
    aiStyle === "minimal" && "border border-[var(--outline)] bg-transparent text-[var(--fg)] hover:border-[var(--primary)]",
  );

  return (
    <div className="sb flex w-full items-center gap-3 relative" style={boxVars(s, translucent)}>
      {Icon && <Icon size={iconSize} strokeWidth={2.1} className="shrink-0 text-[var(--muted)]" aria-hidden="true" />}
      {compact ? (
        <span className="type-display min-w-0 flex-1 truncate text-[var(--muted)]" style={{ textAlign: s.align === "center" ? "center" : undefined }}>
          {placeholder}
        </span>
      ) : (
        <div className="type-display flex h-full min-w-0 flex-1">
          <AnimatedInput
            value={value}
            onValueChange={onValueChange ?? (() => undefined)}
            anim={anim}
            placeholder={placeholder}
            hints={hints}
            align={s.align}
            autoFocus={autoFocus}
            inputRef={inputRef}
            inputProps={inputProps}
          />
        </div>
      )}

      {/* Round AI Search Button inside search field */}
      {!compact && showAiButton && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onAiSearch?.(value);
          }}
          title="Поиск с ИИ (Google AI • udm=50)"
          aria-label="Поиск с ИИ (Google AI)"
          className={aiButtonClasses}
          style={{ width: `${aiBtnSize}px`, height: `${aiBtnSize}px` }}
        >
          <AiIcon size={Math.round(aiBtnSize * 0.52)} className="transition-transform group-hover:rotate-12" />
        </button>
      )}

      {going ? (
        <LoadingIndicator
          contained
          containerColor="var(--primary)"
          indicatorColor="var(--on-primary)"
          containerWidth={buttonHeight}
          containerHeight={buttonHeight}
          indicatorSize={Math.round(buttonHeight * 0.74)}
        />
      ) : s.button === "none" ? null : compact ? (
        <span className={buttonClass} style={iconButton ? { width: buttonHeight } : undefined}>
          {buttonContent}
        </span>
      ) : (
        <button type="submit" aria-label={iconButton ? submitLabel : undefined} className={buttonClass} style={iconButton ? { width: buttonHeight } : undefined}>
          {buttonContent}
        </button>
      )}
    </div>
  );
}
