import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties, InputHTMLAttributes, Ref } from "react";
import { useI18n } from "../lib/i18n";
import type { TextAnim } from "../lib/settings";
import {
  COMPLEX_SCRIPT,
  animVars,
  enterAnimation,
  exitAnimation,
  graphemeCount,
  useAnimatedTokens,
  exitClass,
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

/** A handful of particles that drift out of the selection while it is held. */
function SelectionSparkles({ seed }: { seed: number }) {
  const count = 9;
  return (
    <>
      {Array.from({ length: count }, (_, i) => {
        const angle = ((i * 137.5) % 360) * (Math.PI / 180);
        const spread = 12 + ((seed + i * 23) % 16);
        return (
          <span
            key={i}
            className="ai-spark"
            style={
              {
                left: `${6 + ((i * 29) % 88)}%`,
                top: i % 2 ? "8%" : "82%",
                "--ai-sx": `${Math.cos(angle) * spread}px`,
                "--ai-sy": `${Math.sin(angle) * spread - 10}px`,
                "--ai-sd": `${(i * 110) % 900}ms`,
              } as CSSProperties
            }
          />
        );
      })}
    </>
  );
}

function TokenList({ tokens, anim }: { tokens: Token[]; anim: TextAnim }) {
  return (
    <>
      {tokens.map((token) => {
        if (token.kind === "ghost") {
          // Particles: each erased letter shatters into a handful of tiny white dots.
          if (anim.exit === "particles") {
            return (
              <span key={token.id} className="ai-ghost">
                {token.chars.map((ch, index) => (
                  <span key={index} className="ai-p-char" style={{ "--ai-pdelay": `${index * anim.stagger * 0.4}ms` } as CSSProperties}>
                    <span className="ai-p-glyph">{ch}</span>
                    {Array.from({ length: 10 }, (_, k) => {
                      // Deterministic pseudo-random scatter: no Math.random during render.
                      const angle = ((k / 10) * Math.PI * 2) + (index % 3) * 0.35;
                      const distance = 10 + ((index + k * 7) % 13);
                      return (
                        <i
                          key={k}
                          className="ai-p-dot"
                          style={
                            {
                              "--ai-px": `${Math.cos(angle) * distance}px`,
                              "--ai-py": `${Math.sin(angle) * distance - 4}px`,
                              "--ai-ps": k % 3 === 0 ? "3.5px" : k % 3 === 1 ? "2.5px" : "2px",
                              "--ai-pdur": `${520 + ((index * 37 + k * 23) % 320)}ms`,
                              "--ai-pdelay": `${index * anim.stagger * 0.4 + (k % 4) * 40}ms`,
                            } as CSSProperties
                          }
                        />
                      );
                    })}
                  </span>
                ))}
              </span>
            );
          }
          return (
            <span key={token.id} className="ai-ghost">
              {token.chars.map((ch, index) => (
                <span key={index} className={cn("ai-out", exitClass(anim))} style={{ animation: exitAnimation(anim, index, token.chars.length) }}>
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
          <span key={token.id} data-c="" className={cn("ai-ch", anim.enter === "assemble" && "assemble")} style={{ animation: enterAnimation(anim, token.order, token.bulk) }}>
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
  const [selBox, setSelBox] = useState<{ left: number; top: number; width: number; height: number } | null>(null);
  // A paste (or an autofill that rewrites the value) gets the "paste" flourish on the new letters.
  const bulkRef = useRef(false);
  const pasteAnim = anim.pasteAnim !== false;
  const selRef = useRef<string>("none");

  // Per-letter rendering would break shaping of joined / right-to-left scripts and IME input.
  const overlay = anim.enabled && !composing && dir === "ltr" && !COMPLEX_SCRIPT.test(value);
  const customCaret = overlay && anim.caret !== "native";
  const typewriter = overlay && anim.typewriter && hints.length > 0 && !hints.some((hint) => COMPLEX_SCRIPT.test(hint));
  const showHint = typewriter && value === "";
  const exit = anim.exit !== "none";
  const exitLife = (count: number) => anim.exitDuration + Math.max(0, count - 1) * anim.stagger * 0.5 + 40;

  const tokens = useAnimatedTokens(value, { enabled: overlay, exit, exitLife, caret: caretInfo, bulkRef: pasteAnim ? bulkRef : undefined });
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
    // Selection band + particles: positioned over the same glyph boxes the caret uses.
    const band = line.querySelector<HTMLElement>(".ai-sel-band");
    const sparks = line.querySelector<HTMLElement>(".ai-sparks");
    const showBand = anim.selectParticles !== false;
    if (band && sparks) {
      if (start === end) {
        band.style.opacity = "0";
        sparks.style.opacity = "0";
        if (selRef.current !== "none") {
          selRef.current = "none";
          setSelBox(null);
        }
      } else {
        const selStart = Math.min(graphemeCount(field.value.slice(0, start)), chars.length);
        const selEnd = Math.min(graphemeCount(field.value.slice(0, end)), chars.length);
        const a = chars[Math.min(selStart, Math.max(0, chars.length - 1))];
        const b = chars[Math.max(0, selEnd - 1)];
        if (a && b) {
          const left = a.offsetLeft;
          const right = b.offsetLeft + b.offsetWidth;
          const top = a.offsetTop;
          const height = a.offsetHeight;
          const box = { left, top, width: Math.max(2, right - left), height };
          band.style.opacity = showBand ? "1" : "0";
          band.style.left = `${box.left}px`;
          band.style.top = `${box.top - 3}px`;
          band.style.width = `${box.width}px`;
          band.style.height = `${box.height + 6}px`;
          sparks.style.opacity = showBand ? "1" : "0";
          sparks.style.left = `${box.left}px`;
          sparks.style.top = `${box.top - 3}px`;
          sparks.style.width = `${box.width}px`;
          sparks.style.height = `${box.height + 6}px`;
          const key = `${box.left}|${box.top}|${box.width}`;
          if (selRef.current !== key) {
            selRef.current = key;
            setSelBox(box);
          }
        }
      }
    }
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
  }, [align, anim.caret, anim.selectParticles]);

  useLayoutEffect(() => {
    sync();
  });

  // The paste flag only needs to survive the render that introduced the pasted letters.
  useEffect(() => {
    const id = window.setTimeout(() => (bulkRef.current = false), 0);
    return () => window.clearTimeout(id);
  }, [value]);

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
            <div className="ai-sel-band" style={{ opacity: 0 }} aria-hidden="true" />
            <div className="ai-sparks" style={{ opacity: 0 }} aria-hidden="true">
              {selBox && focused && anim.selectParticles !== false ? <SelectionSparkles seed={selBox.width} /> : null}
            </div>
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
        onPaste={(event) => {
          if (pasteAnim && (event as unknown as { clipboardData?: DataTransfer }).clipboardData?.getData("text")) bulkRef.current = true;
          inputProps?.onPaste?.(event);
        }}
        onCut={(event) => {
          // A cut is an erase: no flourish needed, but keep the flag honest.
          bulkRef.current = false;
          inputProps?.onCut?.(event);
        }}
        onChange={(event) => {
          const next = event.target.value;
          // A full rewrite (paste, autofill, suggestion fill) is bulk even without a paste event.
          if (value && next && value !== next && Math.abs(next.length - value.length) > 2 && value !== next.slice(0, value.length) && next.slice(0, value.length) !== value) {
            bulkRef.current = true;
          }
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
