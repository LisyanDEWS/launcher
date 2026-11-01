import { useRef, useState } from "react";
import type { ReactNode } from "react";
import type { ClockTime } from "../../../lib/clock";
import type { ClockWidget } from "../../../lib/settings";
import { shapePath, type ShapeId } from "../../../lib/shapes";

export type FaceProps = {
  time: ClockTime;
  widget: ClockWidget;
  /** Seconds are enabled and supported by the face. */
  seconds: boolean;
  /** The second hand sweeps smoothly (CSS animation) instead of ticking. */
  sweep: boolean;
  /** The date is enabled and supported by the face. */
  date: boolean;
};

/** Colour roles; .wf[data-role] in index.css maps them onto the theme palette. */
export const C = {
  accent: "var(--w-accent)",
  onAccent: "var(--w-on-accent)",
  container: "var(--w-container)",
  onContainer: "var(--w-on-container)",
  pop: "var(--w-pop)",
  onPop: "var(--w-on-pop)",
  track: "var(--w-track)",
  soft: "var(--w-soft)",
  fg: "var(--fg)",
  muted: "var(--muted)",
} as const;

const TAU = Math.PI * 2;

/** Point on a circle around the centre of the 100×100 face; turn 0 = 12 o'clock. */
export const polar = (radius: number, turn: number) => ({ x: 50 + radius * Math.sin(turn * TAU), y: 50 - radius * Math.cos(turn * TAU) });

export const hourAngle = (t: ClockTime) => ((t.h % 12) + t.m / 60 + t.s / 3600) * 30;
export const minuteAngle = (t: ClockTime) => (t.m + t.s / 60) * 6;

/** Keeps the rotation continuous: 59 → 0 turns forward instead of spinning back. */
function useTurn(angle: number) {
  const ref = useRef<number | null>(null);
  const previous = ref.current;
  const next = previous === null ? angle : previous + ((((angle - previous) % 360) + 540) % 360) - 180;
  ref.current = next;
  return next;
}

/** Rotates its children (drawn pointing at 12 o'clock) around the centre. */
export function Turn({ angle, tick = false, children }: { angle: number; tick?: boolean; children: ReactNode }) {
  const turn = useTurn(angle);
  return (
    <g className={tick ? "wf-hand wf-hand--tick" : "wf-hand"} style={{ transform: `rotate(${turn}deg)` }}>
      {children}
    </g>
  );
}

/** A full turn per minute driven by CSS, phase-locked to the real clock at mount. */
function Sweep({ children }: { children: ReactNode }) {
  const [delay] = useState(() => -(Date.now() % 60000) / 1000);
  return (
    <g className="wf-sweep" style={{ animationDelay: `${delay}s` }}>
      {children}
    </g>
  );
}

export function Seconds({ time, sweep, children }: { time: ClockTime; sweep: boolean; children: ReactNode }) {
  return sweep ? (
    <Sweep>{children}</Sweep>
  ) : (
    <Turn angle={time.s * 6} tick>
      {children}
    </Turn>
  );
}

/** A rounded hand from the centre towards 12 o'clock. */
export function Bar({ length, width, color, tail = 0, opacity }: { length: number; width: number; color: string; tail?: number; opacity?: number }) {
  return <line x1={50} y1={50 + tail} x2={50} y2={50 - length} stroke={color} strokeWidth={width} strokeLinecap="round" opacity={opacity} />;
}

export function Cap({ r, color, inner }: { r: number; color: string; inner?: string }) {
  return (
    <>
      <circle cx={50} cy={50} r={r} fill={color} />
      {inner && <circle cx={50} cy={50} r={r * 0.42} fill={inner} />}
    </>
  );
}

export function Shape({ id, fill }: { id: ShapeId; fill: string }) {
  return <path d={shapePath(id)} fill={fill} />;
}

export function Dots({ count = 12, radius, size, color, opacity }: { count?: number; radius: number; size: number; color: string; opacity?: number }) {
  return (
    <g fill={color} opacity={opacity}>
      {Array.from({ length: count }, (_, index) => {
        const point = polar(radius, index / count);
        return <circle key={index} cx={point.x} cy={point.y} r={size} />;
      })}
    </g>
  );
}

type TickSpec = { length: number; width: number };

export function Ticks({ radius, minor, major, color, minorOpacity }: { radius: number; minor: TickSpec; major: TickSpec; color: string; minorOpacity: number }) {
  return (
    <g stroke={color} strokeLinecap="round">
      {Array.from({ length: 60 }, (_, index) => {
        const isMajor = index % 5 === 0;
        const spec = isMajor ? major : minor;
        const outer = polar(radius, index / 60);
        const inner = polar(radius - spec.length, index / 60);
        return (
          <line key={index} x1={outer.x} y1={outer.y} x2={inner.x} y2={inner.y} strokeWidth={spec.width} opacity={isMajor ? 1 : minorOpacity} />
        );
      })}
    </g>
  );
}

export function Txt({ x = 50, y = 50, size, weight = 600, color, children }: { x?: number; y?: number; size: number; weight?: number; color: string; children: string }) {
  return (
    <text className="wf-t" x={x} y={y} fontSize={size} fontWeight={weight} fill={color} textAnchor="middle" dominantBaseline="central">
      {children}
    </text>
  );
}

/** Localised numerals around the dial (values 1–12). */
export function NumeralRing({ time, values, radius, size, weight = 600, color }: { time: ClockTime; values: number[]; radius: number; size: number; weight?: number; color: string }) {
  return (
    <g>
      {values.map((value) => {
        const point = polar(radius, (value % 12) / 12);
        return (
          <Txt key={value} x={point.x} y={point.y} size={size} weight={weight} color={color}>
            {time.num(value)}
          </Txt>
        );
      })}
    </g>
  );
}

export function Svg({ viewBox = "0 0 100 100", children }: { viewBox?: string; children: ReactNode }) {
  return (
    <svg viewBox={viewBox} className="wf-svg" aria-hidden="true">
      {children}
    </svg>
  );
}

/** Two round dots instead of ":" — identical in every font (LED Dot-Matrix has no colon). */
export function Colon({ thin = false }: { thin?: boolean }) {
  return (
    <span className={thin ? "wf-colon wf-colon--thin" : "wf-colon"} aria-hidden="true">
      <i />
      <i />
    </span>
  );
}

export function Period({ time }: { time: ClockTime }) {
  return time.h12 ? <span className="wf-ampm">{time.dayPeriod}</span> : null;
}
