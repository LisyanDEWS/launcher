import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { InputHTMLAttributes, Ref } from "react";
import { useI18n } from "../lib/i18n";
import type { TextAnim } from "../lib/settings";
import {
  COMPLEX_SCRIPT,
  animVars,
  enterAnimation,
  exitAnimation,
  graphemeCount,
  useAnimatedTokens,
  useTypewriter,
  type Token,
} from "../lib/text-anim";
import { cn } from "../utils/cn";

/**
 * A real <input> with transparent text on top of a "mirror" that renders every letter
 * as its own element — so letters can animate in while typing and out while erasing.
 * The native caret is replaced by a custom one that can glide between letters.
 */
type Props = {
  value: string;
  onValueChange: (value: string) => void;
  anim: TextAnim;
  placeholder: string;
  hints: string[];
  align: "start" | "center";
  autoFocus?: boolean;
  inputRef?: Ref<HTMLInputElement>;
  inputProps?: InputHTMLAttributes<HTMLInputElement>;
};

// Only glyphs that exist in LED Dot-Matrix, so "Decode" looks right in NotMatrix too.
const SCRAMBLE = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789$%+=?@";
const randomGlyph = () => SCRAMBLE[Math.floor(Math.random() * SCRAMBLE.length)];

function ScrambleChar({ ch, duration, delay }: { ch: string; duration: number; delay: number }) {
  const blank = !ch.trim();
  const [glyph, setGlyph] = useState<string | null>(() => (blank ? null : randomGlyph()));

  useEffect(() => {
    if (blank) return;
    let interval = 0;
    const start = window.setTimeout(() => {
      interval = window.setInterval(() => setGlyph(randomGlyph()), 45);
    }, delay);
    const stop = window.setTimeout(() => {
      window.clearInterval(interval);
      setGlyph(null);
    }, delay + duration);
    return () => {
      window.clearTimeout(start);
      window.clearTimeout(stop);
      window.clearInterval(interval);
    };
  }, [blank, delay, duration]);

  // The real letter keeps the width, so the caret never jumps while glyphs flicker.
  return (
    <span data-c="" className="ai-ch ai-scr">
      <span style={glyph ? { visibility: "hidden" } : undefined}>{ch}</span>
      {glyph && <span className="ai-scr-g">{glyph}</span>}
    </span>
  );
}

function TokenList({ tokens, anim }: { tokens: Token[]; anim: TextAnim }) {
  return (
    <>
      {tokens.map((token) => {
        if (token.kind === "ghost") {
          return (
            <span key={token.id} className="ai-ghost">
              {token.chars.map((ch, index) => (
                <span key={index} className="ai-out" style={{ animation: exitAnimation(anim, index, token.chars.length) }}>
                  {ch}
                </span>
              ))}
            </span>
          );
        }
        if (!token.animate || anim.enter === "none") {
          return (
            <span key={token.id} data-c="" className="ai-ch">
              {token.ch}
            </span>
          );
        }
        if (anim.enter === "scramble") {
          return <ScrambleChar key={token.id} ch={token.ch} duration={anim.enterDuration} delay={token.order * anim.stagger} />;
        }
        return (
          <span key={token.id} data-c="" className="ai-ch" style={{ animation: enterAnimation(anim, token.order) }}>
            {token.ch}
          </span>
        );
      })}
    </>
  );
}

export default function AnimatedInput({ value, onValueChange, anim, placeholder, hints, align, autoFocus, inputRef, inputProps }: Props) {
  const { dir } = useI18n();
  const input = useRef<HTMLInputElement | null>(null);
  const mirror = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const caret = useRef<HTMLDivElement>(null);
  const caretInfo = useRef<{ value: string; caret: number } | null>(null);
  const lastX = useRef<number | null>(null);
  const [composing, setComposing] = useState(false);
  const [focused, setFocused] = useState(false);

  // Per-letter rendering would break shaping of joined / right-to-left scripts and IME input.
  const overlay = anim.enabled && !composing && dir === "ltr" && !COMPLEX_SCRIPT.test(value);
  const customCaret = overlay && anim.caret !== "native";
  const typewriter = overlay && anim.typewriter && hints.length > 0 && !hints.some((hint) => COMPLEX_SCRIPT.test(hint));
  const showHint = typewriter && value === "";
  const exit = anim.exit !== "none";
  const exitLife = (count: number) => anim.exitDuration + Math.max(0, count - 1) * anim.stagger * 0.5 + 40;

  const tokens = useAnimatedTokens(value, { enabled: overlay, exit, exitLife, caret: caretInfo });
  const typed = useTypewriter(hints, anim.typewriterSpeed, showHint);
  const hintTokens = useAnimatedTokens(typed, { enabled: typewriter, exit, exitLife });

  const setInput = useCallback(
    (node: HTMLInputElement | null) => {
      input.current = node;
      if (typeof inputRef === "function") inputRef(node);
      else if (inputRef) (inputRef as { current: HTMLInputElement | null }).current = node;
    },
    [inputRef],
  );

  /** Keeps the mirror aligned with the input: scroll offset, centring and caret position. */
  const sync = useCallback(() => {
    const field = input.current;
    const box = mirror.current;
    const line = track.current;
    if (!field || !box || !line) return;
    box.style.justifyContent = align === "center" && line.offsetWidth <= box.clientWidth ? "center" : "flex-start";
    line.style.transform = `translateX(${-field.scrollLeft}px)`;

    const cursor = caret.current;
    if (!cursor) return;
    const start = field.selectionStart ?? field.value.length;
    const end = field.selectionEnd ?? start;
    cursor.style.opacity = start === end ? "" : "0";
    const chars = line.querySelectorAll<HTMLElement>("[data-c]");
    const index = Math.min(graphemeCount(field.value.slice(0, start)), chars.length);
    const before = chars[index - 1];
    const after = chars[index];
    const x = before ? before.offsetLeft + before.offsetWidth : after ? after.offsetLeft : 0;
    cursor.style.transform = `translateX(${x}px)`;
    cursor.style.width =
      anim.caret === "bar" ? "" : `${after ? after.offsetWidth : Math.round(parseFloat(getComputedStyle(line).fontSize) * 0.55)}px`;
    if (x !== lastX.current) {
      // Restart blinking so the caret stays visible while it moves.
      lastX.current = x;
      const blink = cursor.firstElementChild as HTMLElement | null;
      if (blink) {
        blink.style.animation = "none";
        void blink.offsetWidth;
        blink.style.animation = "";
      }
    }
  }, [align, anim.caret]);

  useLayoutEffect(() => {
    sync();
  });

  useEffect(() => {
    const onSelection = () => {
      if (document.activeElement === input.current) sync();
    };
    document.addEventListener("selectionchange", onSelection);
    const resize = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(() => sync());
    if (mirror.current) resize?.observe(mirror.current);
    document.fonts?.addEventListener("loadingdone", sync);
    return () => {
      document.removeEventListener("selectionchange", onSelection);
      resize?.disconnect();
      document.fonts?.removeEventListener("loadingdone", sync);
    };
  }, [sync, overlay]);

  const { onFocus, onBlur, onKeyDown, onKeyUp, onScroll, onSelect, ...rest } = inputProps ?? {};

  return (
    <div className="ai relative h-full min-w-0 flex-1">
      {overlay && (
        <div ref={mirror} aria-hidden="true" className="ai-mirror">
          <div ref={track} className={cn("ai-track", showHint && "ai-track--hint")} style={animVars(anim)}>
            <TokenList tokens={showHint ? hintTokens : tokens} anim={anim} />
            {customCaret && (
              <div
                ref={caret}
                className={cn("ai-caret", focused && "is-focused")}
                data-style={anim.caret}
                data-blink={anim.caretBlink}
                data-smooth={anim.caretSmooth ? "1" : "0"}
              >
                <i />
              </div>
            )}
          </div>
        </div>
      )}
      <input
        {...rest}
        ref={setInput}
        value={value}
        autoFocus={autoFocus}
        placeholder={showHint ? "" : placeholder}
        aria-label={rest["aria-label"] ?? placeholder}
        spellCheck={false}
        autoComplete="off"
        onChange={(event) => {
          caretInfo.current = { value: event.target.value, caret: event.target.selectionEnd ?? event.target.value.length };
          onValueChange(event.target.value);
        }}
        onCompositionStart={() => setComposing(true)}
        onCompositionEnd={() => setComposing(false)}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
        onKeyDown={(event) => {
          onKeyDown?.(event);
          requestAnimationFrame(sync);
        }}
        onKeyUp={(event) => {
          onKeyUp?.(event);
          sync();
        }}
        onScroll={(event) => {
          onScroll?.(event);
          sync();
        }}
        onSelect={(event) => {
          onSelect?.(event);
          sync();
        }}
        className={cn(
          "ai-input absolute inset-0 w-full h-full m-0 p-0 border-none outline-none bg-transparent text-inherit font-inherit",
          overlay && "ai-input--ghost",
          customCaret && "ai-input--nocaret"
        )}
        style={{ textAlign: align === "center" ? "center" : undefined }}
      />
    </div>
  );
}
