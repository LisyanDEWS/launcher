import type { CSSProperties, PointerEvent as ReactPointerEvent, ReactNode } from "react";
import { cn } from "../../utils/cn";

/** Shared editing engine for everything on the home screen: widgets, logo, search bar and buttons. */

export type Direction = "move" | "nw" | "ne" | "se" | "sw" | "n" | "s" | "e" | "w";
export type Guides = { x: number[]; y: number[] };

export const NO_GUIDES: Guides = { x: [], y: [] };
export const MAGNET = 7;
export const LONG_PRESS = 500;
export const DRAG_THRESHOLD = 3;
export const ARROW_DIRECTIONS: Record<string, [number, number]> = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
};

/** Pulls the box (its start, centre or end) onto the nearest guide line within MAGNET px. */
export function magnet(start: number, length: number, lines: number[], max: number) {
  let best: { delta: number; line: number } | null = null;
  for (const line of lines) {
    for (const edge of [start, start + length / 2, start + length]) {
      const delta = line - edge;
      if (Math.abs(delta) <= MAGNET && (!best || Math.abs(delta) < Math.abs(best.delta))) best = { delta, line };
    }
  }
  if (!best) return { value: start, guide: null as number | null };
  return { value: Math.min(Math.max(0, start + best.delta), max), guide: best.line as number | null };
}

/** Snap lines from the viewport (centre + safe edges) and other boxes. */
export function guideLines(viewport: { w: number; h: number }, others: { left: number; top: number; width: number; height: number }[]) {
  return {
    x: [viewport.w / 2, 24, viewport.w - 24, ...others.flatMap((r) => [r.left, r.left + r.width / 2, r.left + r.width])],
    y: [viewport.h / 2, 24, viewport.h - 24, ...others.flatMap((r) => [r.top, r.top + r.height / 2, r.top + r.height])],
  };
}

/**
 * Converts a pointer delta into a size delta along the box diagonal, so every handle feels proportional.
 * Returns a signed pixel amount: positive = grow.
 */
export function resizeDelta(dir: Direction, dx: number, dy: number, width: number, height: number) {
  const diagonal = Math.hypot(width, height) || 1;
  switch (dir) {
    case "se":
      return (dx * width + dy * height) / diagonal;
    case "sw":
      return (-dx * width + dy * height) / diagonal;
    case "ne":
      return (dx * width - dy * height) / diagonal;
    case "nw":
      return (-dx * width - dy * height) / diagonal;
    case "e":
      return dx;
    case "w":
      return -dx;
    case "s":
      return dy;
    case "n":
      return -dy;
    default:
      return 0;
  }
}

export const growsLeft = (dir: Direction) => dir === "w" || dir === "nw" || dir === "sw";
export const growsUp = (dir: Direction) => dir === "n" || dir === "nw" || dir === "ne";

const CURSOR: Record<Exclude<Direction, "move">, string> = {
  nw: "cursor-nwse-resize",
  se: "cursor-nwse-resize",
  ne: "cursor-nesw-resize",
  sw: "cursor-nesw-resize",
  n: "cursor-ns-resize",
  s: "cursor-ns-resize",
  e: "cursor-ew-resize",
  w: "cursor-ew-resize",
};

const CORNERS: Array<[Exclude<Direction, "move">, string]> = [
  ["nw", "-top-2.5 -left-2.5"],
  ["ne", "-top-2.5 -right-2.5"],
  ["se", "-bottom-2.5 -right-2.5"],
  ["sw", "-bottom-2.5 -left-2.5"],
];

const EDGES: Array<[Exclude<Direction, "move">, string]> = [
  ["n", "-top-1.5 left-1/2 -translate-x-1/2 h-3 w-7"],
  ["s", "-bottom-1.5 left-1/2 -translate-x-1/2 h-3 w-7"],
  ["w", "top-1/2 -left-1.5 -translate-y-1/2 h-7 w-3"],
  ["e", "top-1/2 -right-1.5 -translate-y-1/2 h-7 w-3"],
];

/** Corner brackets + 8 resize handles. Identical for widgets and system elements. */
export function SelectionChrome({
  onHandle,
  edges = true,
  hint,
}: {
  onHandle: (event: ReactPointerEvent<HTMLElement>, dir: Direction) => void;
  /** Show N/S/E/W pills in addition to the corners. */
  edges?: boolean;
  hint?: string;
}) {
  return (
    <>
      <span className="wl-bracket wl-bracket--tl" aria-hidden="true" />
      <span className="wl-bracket wl-bracket--tr" aria-hidden="true" />
      <span className="wl-bracket wl-bracket--bl" aria-hidden="true" />
      <span className="wl-bracket wl-bracket--br" aria-hidden="true" />

      {CORNERS.map(([dir, pos]) => (
        <span
          key={dir}
          className={cn("wl-knob absolute z-30 h-5 w-5 rounded-full", pos, CURSOR[dir])}
          onPointerDown={(event) => onHandle(event, dir)}
          aria-hidden="true"
        />
      ))}

      {edges &&
        EDGES.map(([dir, pos]) => (
          <span
            key={dir}
            className={cn("wl-knob wl-knob--pill absolute z-30 rounded-full", pos, CURSOR[dir])}
            onPointerDown={(event) => onHandle(event, dir)}
            aria-hidden="true"
          />
        ))}

      {hint && (
        <span className="wl-hint" aria-hidden="true">
          {hint}
        </span>
      )}
    </>
  );
}

/** Floating action pill above (or below) a selected element. */
export function ElementToolbar({
  below,
  title,
  labels,
  anchor,
  children,
}: {
  below?: boolean;
  title?: string;
  /** Show text next to the icons (only when the element is wide enough). */
  labels?: boolean;
  /** Element box in stage px — used to nudge the toolbar back inside the screen near the edges. */
  anchor?: { left: number; width: number; viewport: number };
  children: ReactNode;
}) {
  // Rough toolbar width; enough to keep it from sliding off a screen edge.
  let shift = 0;
  if (anchor) {
    const items = Array.isArray(children) ? children.filter(Boolean).length : 2;
    const estimate = (labels ? 108 : 38) * items + (title ? 150 : 0) + 12;
    const centre = anchor.left + anchor.width / 2;
    const minCentre = estimate / 2 + 8;
    const maxCentre = anchor.viewport - estimate / 2 - 8;
    if (centre < minCentre) shift = minCentre - centre;
    else if (centre > maxCentre) shift = maxCentre - centre;
  }
  return (
    <div
      className={cn("wl-toolbar", below && "wl-toolbar--below", labels && "has-labels")}
      style={shift ? ({ "--tb-shift": `${Math.round(shift)}px` } as CSSProperties) : undefined}
      onPointerDown={(event) => event.stopPropagation()}
    >
      {title && <span className="wl-toolbar-title">{title}</span>}
      {children}
    </div>
  );
}

/** Guide lines rendered while snapping. */
export function GuideLines({ guides }: { guides: Guides }) {
  return (
    <>
      {guides.x.map((x) => (
        <div key={`x${x}`} className="wl-guide wl-guide--v" style={{ left: x }} />
      ))}
      {guides.y.map((y) => (
        <div key={`y${y}`} className="wl-guide wl-guide--h" style={{ top: y }} />
      ))}
    </>
  );
}
