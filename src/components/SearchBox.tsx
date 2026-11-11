import { ArrowRight, Bot, Brain, ChevronRight, FolderOpen, Globe, Image as ImageIcon, Mic, MicOff, Paperclip, Plus, Search, Sparkles, X, Zap } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, InputHTMLAttributes, Ref } from "react";
import AnimatedInput from "./AnimatedInput";
import LoadingIndicator from "./LoadingIndicator";
import { useI18n, type MessageKey } from "../lib/i18n";
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
export function boxVars(s: SearchStyle, translucent: boolean): CSSProperties {
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
  /** Toggle state when aiMode === "toggle". */
  aiOn?: boolean;
  onAiToggle?: () => void;
  /** Attached photo or file; searching submits it to Google Lens instead of text. */
  attachment?: File | null;
  onAttach?: (file: File | null) => void;
  attachError?: string | null;
  /** Pick a photo straight from the gallery (routed to Lens). */
  onGallery?: (file: File) => void;
  /** Voice input result. */
  onVoice?: (transcript: string) => void;
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
  aiOn = false,
  onAiToggle,
  attachment = null,
  onAttach,
  attachError,
  onGallery,
  onVoice,
  hints = [],
  going = false,
  translucent = false,
  autoFocus,
  inputRef,
  inputProps,
  compact = false,
}: Props) {
  const { t } = useI18n();
  const Icon = s.icon === "none" ? null : ICONS[s.icon];
  const iconSize = Math.round(Math.min(30, Math.max(14, s.height * 0.34)));
  const buttonHeight = Math.max(32, s.height - 16);
  const filePicker = useRef<HTMLInputElement>(null);
  const imagePicker = useRef<HTMLInputElement>(null);
  const plusWrap = useRef<HTMLDivElement>(null);
  const recognition = useRef<SpeechRecognition | null>(null);
  const [focused, setFocused] = useState(false);
  const [plusOpen, setPlusOpen] = useState(false);
  const [listening, setListening] = useState(false);
  const speechSupported =
    typeof window !== "undefined" && ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  // Close the "+" menu on an outside click or on Escape.
  useEffect(() => {
    if (!plusOpen) return;
    const onDown = (event: PointerEvent) => {
      if (!plusWrap.current?.contains(event.target as Node)) setPlusOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPlusOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [plusOpen]);

  useEffect(() => () => recognition.current?.stop(), []);

  const toggleVoice = useCallback(() => {
    if (!speechSupported) {
      window.alert(t("better.voiceUnsupported" as MessageKey));
      return;
    }
    if (listening) {
      recognition.current?.stop();
      return;
    }
    const holder = window as unknown as {
      SpeechRecognition?: typeof SpeechRecognition;
      webkitSpeechRecognition?: typeof SpeechRecognition;
    };
    const Ctor = holder.SpeechRecognition ?? holder.webkitSpeechRecognition;
    if (!Ctor) return;
    const engine = new Ctor();
    engine.lang = "en-US";
    engine.interimResults = true;
    engine.continuous = false;
    engine.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0].transcript)
        .join(" ");
      onValueChange?.(transcript);
      onVoice?.(transcript);
    };
    engine.onerror = () => setListening(false);
    engine.onend = () => setListening(false);
    recognition.current = engine;
    setListening(true);
    engine.start();
  }, [listening, speechSupported, onValueChange, onVoice, t]);
  const preview = useMemo(() => {
    if (!attachment || !attachment.type.startsWith("image/")) return null;
    return URL.createObjectURL(attachment);
  }, [attachment]);
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

  // AI search is triggered from the pill under the bar; the bar itself stays clean without an AI button.
  const showAiButton = false;
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
    <div
      className={cn("sb flex w-full items-center gap-3 relative", focused && "is-focused")}
      style={boxVars(s, translucent)}
      // Keep the field focused when the "+" or mic button is pressed, so the buttons never vanish mid-click.
      onPointerDownCapture={(event) => {
        const target = event.target as HTMLElement;
        if (target.closest(".sb-plus-btn, .sb-plus-menu, .sb-icon-btn, .sb-ai-toggle")) event.preventDefault();
      }}
    >
      {attachment && !compact && (
        <span className="sb-attach-chip" title={attachment.name}>
          {preview ? <img src={preview} alt="" className="sb-attach-thumb" /> : <Paperclip size={14} aria-hidden="true" />}
          <span className="sb-attach-name">{attachment.name}</span>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onAttach?.(null);
            }}
            className="sb-attach-x"
            aria-label="Убрать вложение"
            title="Убрать вложение"
          >
            <X size={12} aria-hidden="true" />
          </button>
        </span>
      )}
      {attachError && !compact && (
        <span role="alert" className="sb-attach-error">{attachError}</span>
      )}
      {/* "+" appears on the left once the field is focused. */}
      {!compact && onAttach && (
        <div className="sb-plus-wrap" ref={plusWrap}>
          <button
            type="button"
            className={cn("sb-plus-btn", plusOpen && "is-on", (focused || plusOpen) && "is-visible")}
            onClick={() => setPlusOpen((v) => !v)}
            aria-expanded={plusOpen}
            aria-haspopup="menu"
            title={t("better.add" as MessageKey)}
            aria-label={t("better.add" as MessageKey)}
            tabIndex={focused ? 0 : -1}
          >
            <Plus size={18} className={cn("transition-transform duration-300", plusOpen && "rotate-45")} />
          </button>

          {plusOpen && (
            <div role="menu" className="sb-plus-menu">
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setPlusOpen(false);
                  filePicker.current?.click();
                }}
              >
                <FolderOpen size={16} aria-hidden="true" />
                {t("better.files" as MessageKey)}
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setPlusOpen(false);
                  imagePicker.current?.click();
                }}
              >
                <ImageIcon size={16} aria-hidden="true" />
                {t("better.gallery" as MessageKey)}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Gallery picker: an image straight to Lens. */}
      <input
        ref={imagePicker}
        type="file"
        accept="image/*"
        className="hidden"
        aria-hidden="true"
        tabIndex={-1}
        onChange={(e) => {
          const file = e.currentTarget.files?.[0];
          if (file) onGallery?.(file);
          e.currentTarget.value = "";
        }}
      />

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
            inputProps={{
              ...inputProps,
              onFocus: (event) => {
                setFocused(true);
                inputProps?.onFocus?.(event);
              },
              onBlur: (event) => {
                setFocused(false);
                inputProps?.onBlur?.(event);
              },
            }}
          />
        </div>
      )}

      {/* AI: a one-shot button or a persistent toggle, chosen in Settings → Search bar. */}
      {!compact && showAiButton && s.aiMode === "toggle" && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onAiToggle?.();
          }}
          aria-pressed={aiOn}
          title={aiOn ? "AI-поиск включён — выключить" : "AI-поиск выключен — включить"}
          className={cn("sb-ai-toggle", aiOn && "is-on", focused && "is-visible")}
          style={{ height: `${buttonHeight}px` }}
          tabIndex={focused ? 0 : -1}
        >
          <AiIcon size={Math.round(buttonHeight * 0.42)} className="transition-transform group-hover:rotate-12" />
          <span className="sb-ai-label">AI</span>
        </button>
      )}

      {!compact && showAiButton && s.aiMode !== "toggle" && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onAiSearch?.(value);
          }}
          title="Поиск с ИИ (Google AI • udm=50)"
          aria-label="Поиск с ИИ (Google AI)"
          className={cn(aiButtonClasses, focused && "is-visible")}
          style={{ width: focused ? `${aiBtnSize}px` : 0, height: `${aiBtnSize}px`, opacity: focused ? 1 : 0 }}
          tabIndex={focused ? 0 : -1}
        >
          <AiIcon size={Math.round(aiBtnSize * 0.52)} className="transition-transform group-hover:rotate-12" />
        </button>
      )}

      {/* Attachment picker (opened by the "+" menu). */}
      {!compact && onAttach && (
        <>
          <input
            ref={filePicker}
            type="file"
            accept="image/*,.pdf,.txt,.doc,.docx,.csv,.json,.zip"
            className="hidden"
            aria-hidden="true"
            tabIndex={-1}
            onChange={(event) => {
              const file = event.currentTarget.files?.[0] ?? null;
              onAttach(file);
              event.currentTarget.value = "";
            }}
          />
        </>
      )}

      {/* Voice input — free, browser-native. */}
      {!compact && onVoice && (
        <button
          type="button"
          className={cn("sb-icon-btn", listening && "is-live", focused && "is-visible")}
          onClick={toggleVoice}
          aria-pressed={listening}
          title={t("better.voice" as MessageKey)}
          aria-label={t("better.voice" as MessageKey)}
          tabIndex={focused ? 0 : -1}
        >
          {listening ? <MicOff size={Math.round(buttonHeight * 0.44)} /> : <Mic size={Math.round(buttonHeight * 0.44)} />}
          {listening && <span className="sb-pulse" aria-hidden="true" />}
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
