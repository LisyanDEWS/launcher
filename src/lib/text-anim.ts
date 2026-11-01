import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import type { Easing, TextAnim } from "./settings";

/* ---------- graphemes ---------- */

type Segmenter = { segment: (input: string) => Iterable<{ segment: string }> };
type SegmenterConstructor = new (locale?: string, options?: { granularity: "grapheme" }) => Segmenter;

const segmenter: Segmenter | null =
  typeof Intl !== "undefined" && "Segmenter" in Intl
    ? new (Intl as unknown as { Segmenter: SegmenterConstructor }).Segmenter(undefined, { granularity: "grapheme" })
    : null;

/** User-perceived characters: keeps emoji sequences and combining marks together. */
export function splitGraphemes(text: string): string[] {
  return segmenter ? Array.from(segmenter.segment(text), (part) => part.segment) : Array.from(text);
}

export const graphemeCount = (text: string) => splitGraphemes(text).length;

/** Scripts whose letters must stay joined/shaped together or that run right-to-left. */
export const COMPLEX_SCRIPT = /[\u0590-\u08FF\u0900-\u0DFF\u0E00-\u0FFF\u1000-\u109F\u1780-\u18AF\uA980-\uA9DF\uFB1D-\uFDFF\uFE70-\uFEFF]/;

/* ---------- tokens: animated letters + "ghost" runs of erased letters ---------- */

export type CharToken = { kind: "char"; id: number; ch: string; animate: boolean; order: number };
export type GhostToken = { kind: "ghost"; id: number; chars: string[]; dies: number };
export type Token = CharToken | GhostToken;

let uid = 0;

const initTokens = (text: string): Token[] =>
  splitGraphemes(text).map((ch): Token => ({ kind: "char", id: ++uid, ch, animate: false, order: 0 }));

function diffTokens(
  prev: Token[],
  next: string,
  caret: number | null,
  exit: boolean,
  exitLife: (count: number) => number,
): Token[] {
  const nextChars = splitGraphemes(next);
  const visible: number[] = [];
  prev.forEach((token, index) => {
    if (token.kind === "char") visible.push(index);
  });
  const prevChars = visible.map((index) => (prev[index] as CharToken).ch);
  const pl = prevChars.length;
  const nl = nextChars.length;

  let p = 0;
  while (p < pl && p < nl && prevChars[p] === nextChars[p]) p++;
  // The caret disambiguates edits inside runs of equal letters ("aa|a" + "a").
  if (caret != null) {
    if (nl > pl) p = Math.min(p, Math.max(0, caret - (nl - pl)));
    else if (nl < pl) p = Math.min(p, caret);
  }
  let s = 0;
  while (s < pl - p && s < nl - p && prevChars[pl - 1 - s] === nextChars[nl - 1 - s]) s++;

  const startCut = p === 0 ? 0 : visible[p - 1] + 1;
  const endCut = s === 0 ? prev.length : visible[pl - s];
  const middle = prev.slice(startCut, endCut);
  const removed = middle.filter((token): token is CharToken => token.kind === "char").map((token) => token.ch);

  const out: Token[] = [...prev.slice(0, startCut), ...middle.filter((token) => token.kind === "ghost")];
  if (removed.length && exit) {
    out.push({ kind: "ghost", id: ++uid, chars: removed, dies: performance.now() + exitLife(removed.length) });
  }
  nextChars.slice(p, nl - s).forEach((ch, order) => out.push({ kind: "char", id: ++uid, ch, animate: true, order }));
  out.push(...prev.slice(endCut));
  return out;
}

type TokenOptions = {
  enabled: boolean;
  exit: boolean;
  exitLife: (count: number) => number;
  /** Caret position (UTF-16) recorded together with the value it belongs to. */
  caret?: { current: { value: string; caret: number } | null };
};

/** Turns a string into stable letter tokens; new letters animate in, erased ones linger as ghosts. */
export function useAnimatedTokens(value: string, options: TokenOptions): Token[] {
  const [state, setState] = useState(() => ({ value, tokens: initTokens(value) }));
  let tokens = state.tokens;

  if (state.value !== value) {
    // Adjusting state while rendering (React's documented pattern for derived state).
    const info = options.caret?.current;
    const caret = info && info.value === value ? graphemeCount(value.slice(0, info.caret)) : null;
    tokens = options.enabled ? diffTokens(state.tokens, value, caret, options.exit, options.exitLife) : initTokens(value);
    setState({ value, tokens });
  }

  useEffect(() => {
    const ghosts = tokens.filter((token): token is GhostToken => token.kind === "ghost");
    if (!ghosts.length) return;
    const wait = Math.max(16, Math.min(...ghosts.map((ghost) => ghost.dies)) - performance.now());
    const id = window.setTimeout(() => {
      const now = performance.now();
      setState((current) => ({ ...current, tokens: current.tokens.filter((token) => token.kind !== "ghost" || token.dies > now) }));
    }, wait);
    return () => window.clearTimeout(id);
  }, [tokens]);

  return tokens;
}

/** Types and erases example phrases in a loop. */
export function useTypewriter(hints: string[], speed: number, active: boolean): string {
  const [text, setText] = useState("");
  const key = hints.join("\u241e");

  useEffect(() => {
    if (!active || !key) return;
    const list = key.split("\u241e").map(splitGraphemes);
    let hint = 0;
    let pos = 0;
    let typing = true;
    let timer = 0;
    const tick = () => {
      const chars = list[hint % list.length];
      if (typing) {
        pos += 1;
        setText(chars.slice(0, pos).join(""));
        if (pos >= chars.length) {
          typing = false;
          timer = window.setTimeout(tick, 1800);
          return;
        }
        timer = window.setTimeout(tick, speed * (0.55 + Math.random() * 0.9));
      } else {
        pos -= 1;
        setText(chars.slice(0, Math.max(0, pos)).join(""));
        if (pos <= 0) {
          typing = true;
          hint += 1;
          timer = window.setTimeout(tick, 650);
          return;
        }
        timer = window.setTimeout(tick, Math.max(18, speed * 0.42));
      }
    };
    setText("");
    timer = window.setTimeout(tick, 700);
    return () => window.clearTimeout(timer);
  }, [active, speed, key]);

  return active ? text : "";
}

/* ---------- motion ---------- */

/** Damped spring sampled into a CSS linear() easing (settles by t = 1). */
function springCurve(damping: number, samples = 40): string {
  const omega = 6.9 / damping;
  const damped = omega * Math.sqrt(1 - damping * damping);
  const points: string[] = [];
  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    const x = 1 - Math.exp(-damping * omega * t) * (Math.cos(damped * t) + ((damping * omega) / damped) * Math.sin(damped * t));
    points.push(i === samples ? "1" : x.toFixed(3));
  }
  return `linear(${points.join(", ")})`;
}

const supportsLinear = typeof CSS !== "undefined" && typeof CSS.supports === "function" && CSS.supports("animation-timing-function", "linear(0, 1)");

const EASING: Record<Easing, string> = {
  emphasized: "cubic-bezier(0.2, 0, 0, 1)",
  smooth: "cubic-bezier(0.4, 0, 0.2, 1)",
  linear: "linear",
  spring: supportsLinear ? springCurve(0.72) : "cubic-bezier(0.34, 1.4, 0.64, 1)",
  bouncy: supportsLinear ? springCurve(0.42) : "cubic-bezier(0.34, 1.8, 0.64, 1)",
};

const exitEasing = (easing: Easing) => (easing === "linear" ? "linear" : easing === "smooth" ? EASING.smooth : "cubic-bezier(0.3, 0, 0.8, 0.15)");

export function enterAnimation(anim: TextAnim, order: number): string {
  const delay = order * anim.stagger;
  const parts = [`ai-in-${anim.enter} ${anim.enterDuration}ms ${EASING[anim.easing]} ${delay}ms both`];
  if (anim.highlight) parts.push(`ai-hl ${Math.round(anim.enterDuration * 2.5)}ms ease-out ${delay}ms both`);
  return parts.join(", ");
}

export function exitAnimation(anim: TextAnim, index: number, count: number): string {
  const delay = Math.round((count - 1 - index) * anim.stagger * 0.5);
  return `ai-out-${anim.exit} ${anim.exitDuration}ms ${exitEasing(anim.easing)} ${delay}ms both`;
}

/** Intensity → distances, scales and blur used by the keyframes in index.css. */
export function animVars(anim: TextAnim): CSSProperties {
  const k = anim.intensity / 100;
  return {
    "--ai-d": `${(0.2 + 0.9 * k).toFixed(2)}em`,
    "--ai-s": (1 - 0.85 * k).toFixed(2),
    "--ai-b": `${(2 + 10 * k).toFixed(1)}px`,
    "--ai-r": `${Math.round(25 + 65 * k)}deg`,
  } as CSSProperties;
}
