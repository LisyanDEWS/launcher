import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { ArrowRight, EyeOff, FolderOpen, Image as ImageIcon, Mic, MicOff, Paperclip, Plus, Sparkles, X } from "lucide-react";
import type { MessageKey } from "../lib/i18n";
import { useI18n } from "../lib/i18n";
import type { BarSlot, BetterBarConfig, HomeWidget } from "../lib/settings";
import { cn } from "../utils/cn";
import AnimatedInput from "./AnimatedInput";
import Clock from "./widgets/Clock";
import AppIcon from "./AppIcon";
import { widgetSize } from "../lib/widgets";

type Props = {
  config: BetterBarConfig;
  /** Widgets already on the home screen — the pool a slot can pull from. */
  widgets: HomeWidget[];
  value: string;
  onValueChange: (value: string) => void;
  onSubmit: (query: string) => void;
  onAiToggle?: () => void;
  aiOn: boolean;
  incognitoOn?: boolean;
  onIncognitoToggle?: () => void;
  attachment?: File | null;
  onAttach?: (file: File | null) => void;
  attachError?: string | null;
  going?: boolean;
};

/** Small live preview of a widget, for the slot. */
function WidgetGlyph({ widget }: { widget: HomeWidget }) {
  const size = widgetSize(widget);
  return (
    <span className="bbar-glyph" aria-hidden="true">
      <Clock widget={widget} width={size.width} faceHeight={size.faceHeight} />
    </span>
  );
}

function slotLabel(slot: BarSlot, widget: HomeWidget | undefined, t: (key: MessageKey) => string, ru: boolean) {
  if (slot.label) return slot.label;
  if (slot.kind === "ai") return ru ? "Режим ИИ" : "AI mode";
  if (slot.kind === "incognito") return ru ? "Инкогнито" : "Incognito";
  if (slot.kind === "widget" && widget) {
    if (widget.type === "custom_html") return widget.title || "Widget";
    if (widget.type === "bookmarks") return widget.title || t("wf.f.bookmarks");
    return t(`wf.f.${widget.face}` as MessageKey);
  }
  return ru ? "Иконка" : "Icon";
}

/**
 * The secondary "Better Search Bar".
 *
 * It is a real element on the home screen (positioned and resized like any widget), not a decoration.
 * Its two slots can hold the built-in actions, any widget already on the home screen, or a plain icon,
 * so the bar becomes whatever the user wants it to be.
 */
export default function BetterSearchBar({
  config,
  widgets,
  value,
  onValueChange,
  onSubmit,
  onAiToggle,
  aiOn,
  incognitoOn = false,
  onIncognitoToggle,
  attachment = null,
  onAttach,
  attachError,
  going = false,
}: Props) {
  const { t, lang } = useI18n();
  const ru = lang.startsWith("ru");
  const [menuOpen, setMenuOpen] = useState(false);
  const [listening, setListening] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const imageInput = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const recognition = useRef<SpeechRecognition | null>(null);

  const speechSupported =
    typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  useEffect(() => () => recognition.current?.stop(), []);

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const preview = useMemo(() => (attachment?.type.startsWith("image/") ? URL.createObjectURL(attachment) : null), [attachment]);

  const toggleVoice = () => {
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
    engine.lang = lang;
    engine.interimResults = true;
    engine.continuous = false;
    engine.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0].transcript)
        .join(" ");
      onValueChange(transcript);
    };
    engine.onerror = () => setListening(false);
    engine.onend = () => setListening(false);
    recognition.current = engine;
    setListening(true);
    engine.start();
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit(value);
  };

  return (
    <div className="bbar-wrap" style={{ width: "100%" }}>
      <form onSubmit={submit} role="search" className="bbar" style={{ height: config.height, borderRadius: config.radius }}>
        {/* "+" → Files / Gallery */}
        {config.attach && (
          <div className="bbar-plus-wrap" ref={menuRef}>
            <button
              type="button"
              className={cn("bbar-icon-btn", menuOpen && "is-on")}
              onClick={() => setMenuOpen((v) => !v)}
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              title={t("better.add" as MessageKey)}
              aria-label={t("better.add" as MessageKey)}
            >
              <Plus size={18} className={cn("transition-transform duration-300", menuOpen && "rotate-45")} />
            </button>

            {menuOpen && (
              <div role="menu" className="bbar-menu">
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    fileInput.current?.click();
                  }}
                >
                  <FolderOpen size={16} aria-hidden="true" />
                  {t("better.files" as MessageKey)}
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    imageInput.current?.click();
                  }}
                >
                  <ImageIcon size={16} aria-hidden="true" />
                  {t("better.gallery" as MessageKey)}
                </button>
              </div>
            )}

            <input
              ref={fileInput}
              type="file"
              className="hidden"
              tabIndex={-1}
              aria-hidden="true"
              accept=".pdf,.txt,.doc,.docx,.csv,.json,.zip"
              onChange={(e) => {
                onAttach?.(e.currentTarget.files?.[0] ?? null);
                e.currentTarget.value = "";
              }}
            />
            <input
              ref={imageInput}
              type="file"
              className="hidden"
              tabIndex={-1}
              aria-hidden="true"
              accept="image/*"
              onChange={(e) => {
                onAttach?.(e.currentTarget.files?.[0] ?? null);
                e.currentTarget.value = "";
              }}
            />
          </div>
        )}

        {attachment && (
          <span className="bbar-attach-chip" title={attachment.name}>
            {preview ? <img src={preview} alt="" className="bbar-thumb" /> : <Paperclip size={14} aria-hidden="true" />}
            <span className="bbar-attach-name">{attachment.name}</span>
            <button type="button" onClick={() => onAttach?.(null)} aria-label={t("better.removeAttach" as MessageKey)}>
              <X size={12} aria-hidden="true" />
            </button>
          </span>
        )}
        {attachError && (
          <span role="alert" className="bbar-error">{attachError}</span>
        )}

        <AnimatedInput
          value={value}
          onValueChange={onValueChange}
          anim={{
            preset: "subtle",
            enabled: true,
            enter: "fade",
            exit: "fade",
            enterDuration: 200,
            exitDuration: 160,
            stagger: 10,
            intensity: 30,
            easing: "smooth",
            highlight: false,
            pasteAnim: true,
            selectParticles: false,
            caret: "bar",
            caretSmooth: true,
            caretBlink: "fade",
            typewriter: false,
            typewriterSpeed: 70,
          }}
          placeholder={config.placeholder || t("search.placeholder")}
          hints={[]}
          align="start"
          inputProps={{ onKeyDown: (e) => e.key === "Escape" && (e.currentTarget as HTMLInputElement).blur() }}
        />

        {/* Voice input — free and browser-native (Web Speech API). */}
        {config.voice && (
          <button
            type="button"
            onClick={toggleVoice}
            className={cn("bbar-icon-btn", listening && "is-live")}
            title={t("better.voice" as MessageKey)}
            aria-label={t("better.voice" as MessageKey)}
            aria-pressed={listening}
          >
            {listening ? <MicOff size={18} /> : <Mic size={18} />}
            {listening && <span className="bbar-pulse" aria-hidden="true" />}
          </button>
        )}

        <button type="submit" className="bbar-send" aria-label={t("search.button")} disabled={going}>
          {going ? <span className="bbar-spinner" /> : <ArrowRight size={18} className="rtl:-scale-x-100" aria-hidden="true" />}
        </button>
      </form>

      <div className="bbar-slots" style={{ borderRadius: Math.min(28, config.radius) }}>
        {config.slots.map((slot, index) => {
          const widget = slot.kind === "widget" ? widgets.find((w) => w.id === slot.ref) : undefined;
          const isAction = slot.kind === "ai" || slot.kind === "incognito";
          const active = slot.kind === "ai" ? aiOn : slot.kind === "incognito" ? incognitoOn : false;
          const label = slotLabel(slot, widget, t as (key: MessageKey) => string, ru);

          if (isAction) {
            const Icon = slot.kind === "ai" ? Sparkles : EyeOff;
            return (
              <button
                key={index}
                type="button"
                className={cn("bbar-slot is-action", active && "is-on")}
                onClick={slot.kind === "ai" ? onAiToggle : onIncognitoToggle}
                aria-pressed={active}
              >
                <Icon size={16} aria-hidden="true" />
                <span className="bbar-truncate">{label}</span>
              </button>
            );
          }

          if (slot.kind === "widget" && widget) {
            return (
              <span key={index} className="bbar-slot is-widget">
                <span className="bbar-slot-ico">
                  <WidgetGlyph widget={widget} />
                </span>
                <span className="bbar-truncate">{label}</span>
              </span>
            );
          }

          return (
            <span key={index} className="bbar-slot is-icon">
              <span className="bbar-slot-ico">
                <AppIcon app={undefined} size={20} />
              </span>
              <span className="bbar-truncate">{label}</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}
