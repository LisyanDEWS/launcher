import { useEffect, useLayoutEffect, useState } from "react";
import { useViewport } from "./widgets";

/**
 * While the home screen is edited it shrinks into a centred card ("the stage") and the editing controls
 * sit around it. Everything inside the stage keeps its normal layout coordinates, so the only thing that
 * changes is how pointer movement on the screen maps back onto those coordinates.
 */

export const DESKTOP_MIN = 960;

export type Box = { left: number; top: number; width: number; height: number };
export type StageInsets = { top: number; right: number; bottom: number; left: number };

/** The element that is scaled while editing. Set by App. */
export const stage: { el: HTMLElement | null } = { el: null };

/** The real on-screen scale right now — follows a running CSS transition instead of its end value. */
export function stageScale(): number {
  const el = stage.el;
  if (!el || !el.offsetWidth) return 1;
  const scale = el.getBoundingClientRect().width / el.offsetWidth;
  return Number.isFinite(scale) && scale > 0.05 ? scale : 1;
}

/** A rectangle measured on the screen → the stage's own (unscaled) coordinates. */
export function toStageRect(r: Box): Box {
  const el = stage.el;
  if (!el) return { left: r.left, top: r.top, width: r.width, height: r.height };
  const origin = el.getBoundingClientRect();
  const s = stageScale();
  return { left: (r.left - origin.left) / s, top: (r.top - origin.top) / s, width: r.width / s, height: r.height / s };
}

/** Boxes of every movable thing except `exceptId`, in stage coordinates (for snapping). */
export function collectPeers(exceptId: string): Box[] {
  if (typeof document === "undefined") return [];
  return Array.from(document.querySelectorAll<HTMLElement>("[data-widget-id]"))
    .filter((el) => el.dataset.widgetId !== exceptId)
    .map((el) => toStageRect(el.getBoundingClientRect()));
}

/** Room left around the card for the controls. */
export function editInsets(vw: number, _vh: number, sheetOpen: boolean): StageInsets {
  if (vw >= DESKTOP_MIN) return { top: 60, bottom: 82, left: 84, right: sheetOpen ? 396 : 84 };
  return { top: 58, bottom: 92, left: 10, right: 10 };
}

/** Scale + offset that fit the whole screen into the free area, centred. */
export function stageTransform(vw: number, vh: number, ins: StageInsets) {
  const availW = Math.max(120, vw - ins.left - ins.right);
  const availH = Math.max(120, vh - ins.top - ins.bottom);
  const scale = Math.min(0.96, Math.max(0.45, Math.min(availW / vw, availH / vh)));
  return { scale, x: ins.left + availW / 2 - vw / 2, y: ins.top + availH / 2 - vh / 2, centerX: ins.left + availW / 2, width: availW };
}

/** Publishes the card's transform as CSS variables (the stage and the controls both read them). */
export function useStageLayout(sheetOpen: boolean) {
  const viewport = useViewport();
  const layout = stageTransform(viewport.w, viewport.h, editInsets(viewport.w, viewport.h, sheetOpen));
  const { scale, x, y, centerX, width } = layout;

  useLayoutEffect(() => {
    const root = document.documentElement.style;
    root.setProperty("--stage-scale", scale.toFixed(4));
    root.setProperty("--stage-x", `${x.toFixed(1)}px`);
    root.setProperty("--stage-y", `${y.toFixed(1)}px`);
    root.setProperty("--edit-cx", `${centerX.toFixed(1)}px`);
    root.setProperty("--edit-w", `${width.toFixed(1)}px`);
    return () => {
      for (const name of ["--stage-scale", "--stage-x", "--stage-y", "--edit-cx", "--edit-w"]) root.removeProperty(name);
    };
  }, [scale, x, y, centerX, width]);

  return { ...layout, desktop: viewport.w >= DESKTOP_MIN };
}

/**
 * Two flags drive the animation: `staged` (the screen is a fixed card) and `shrunk` (it is scaled down).
 * Entering: stage first, shrink on the next frames. Leaving: grow back, un-stage once it has finished.
 */
export function useStageMode(editing: boolean) {
  const [staged, setStaged] = useState(false);
  const [shrunk, setShrunk] = useState(false);

  useEffect(() => {
    if (editing) {
      setStaged(true);
      let second = 0;
      const first = requestAnimationFrame(() => {
        second = requestAnimationFrame(() => setShrunk(true));
      });
      return () => {
        cancelAnimationFrame(first);
        cancelAnimationFrame(second);
      };
    }
    setShrunk(false);
    const timer = window.setTimeout(() => setStaged(false), 520);
    return () => window.clearTimeout(timer);
  }, [editing]);

  return { staged, shrunk };
}
