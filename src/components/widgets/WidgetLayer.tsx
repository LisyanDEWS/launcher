import { Copy, Settings2, Trash2 } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from "react";
import Clock from "./Clock";
import { ARROW_DIRECTIONS, DRAG_THRESHOLD, ElementToolbar, GuideLines, LONG_PRESS, NO_GUIDES, SelectionChrome, growsLeft, growsUp, guideLines, magnet, type Direction, type Guides } from "./engine";
import { useI18n } from "../../lib/i18n";
import type { HomeWidget, HomeLayout } from "../../lib/settings";
import { stageScale } from "../../lib/stage";
import {
  captionText,
  editButtonRect,
  gridMetrics,
  pxToSpan,
  snapToGrid,
  spanPx,
  toPosition,
  useViewport,
  widgetRect,
  widgetShape,
  widgetSize,
  widgetSpan,
  type GridMetrics,
  type Rect,
} from "../../lib/widgets";
import { cn } from "../../utils/cn";

type Props = {
  widgets: HomeWidget[];
  layout: HomeLayout;
  editing: boolean;
  selectedId: string | null;
  /** Wallpaper is shown — add a readability halo. */
  halo: boolean;
  /** With the news band on, widgets must stay off the bottom-right "edit home" button. */
  newsEnabled?: boolean;
  onSelect: (id: string | null) => void;
  onChange: (id: string, patch: Partial<HomeWidget>) => void;
  onRemove: (id: string) => void;
  onDuplicate: (id: string) => void;
  /** Opens the properties panel on this widget. */
  onOpenSettings?: (id: string) => void;
  onEnterEdit: (id: string) => void;
  onDragState: (dragging: boolean) => void;
};

type Draft = { id: string; left: number; top: number; cols: number; rows: number };

/** Spring state of the widget being dragged: position, velocity, target and a "lift" scale. */
type Jelly = { id: string; x: number; y: number; vx: number; vy: number; tx: number; ty: number; lift: number; lv: number; mode: "drag" | "settle"; raf: number; last: number };

const reducedMotion = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** Translate + a tilt that follows horizontal speed + a squash-and-stretch along the motion. */
function jellyTransform(j: Jelly) {
  const calm = reducedMotion();
  const speed = Math.hypot(j.vx, j.vy);
  const stretch = calm ? 0 : Math.min(0.1, speed / 16000);
  const angle = (Math.atan2(j.vy, j.vx) * 180) / Math.PI;
  const tilt = calm ? 0 : Math.max(-7, Math.min(7, j.vx / 240));
  const sx = ((1 + stretch) * j.lift).toFixed(4);
  const sy = ((1 - stretch * 0.6) * j.lift).toFixed(4);
  return `translate(${j.x.toFixed(2)}px, ${j.y.toFixed(2)}px) rotate(${tilt.toFixed(2)}deg) rotate(${angle.toFixed(2)}deg) scale(${sx}, ${sy}) rotate(${(-angle).toFixed(2)}deg)`;
}

const overlaps = (a: Rect, b: Rect, inset = 2) =>
  a.left + inset < b.left + b.width && b.left + inset < a.left + a.width && a.top + inset < b.top + b.height && b.top + inset < a.top + a.height;

/** Visible cells of the centred grid while editing. */
function GridCells({ m }: { m: GridMetrics }) {
  const id = useId().replace(/:/g, "");
  const radius = Math.round(m.unit * 0.22);
  return (
    <svg className="wl-grid" aria-hidden="true">
      <defs>
        <pattern id={`cells-${id}`} x={m.originX} y={m.originY} width={m.pitch} height={m.pitch} patternUnits="userSpaceOnUse">
          <rect width={m.unit} height={m.unit} rx={radius} ry={radius} className="wl-grid-cell" />
        </pattern>
      </defs>
      <rect x={m.originX} y={m.originY} width={m.width} height={m.height} fill={`url(#cells-${id})`} />
      <line x1="50%" x2="50%" y1={m.originY} y2={m.originY + m.height} className="wl-grid-axis" />
    </svg>
  );
}

/** Widgets on the start page: static in normal mode, draggable and resizable (cell by cell) while editing. */
export default function WidgetLayer({ widgets, layout, editing, selectedId, halo, newsEnabled, onSelect, onChange, onRemove, onDuplicate, onOpenSettings, onEnterEdit, onDragState }: Props) {
  const { t, lang } = useI18n();
  const isRu = lang.startsWith("ru");
  const viewport = useViewport();
  const metrics = useMemo(() => gridMetrics(viewport, layout), [viewport, layout]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [guides, setGuides] = useState<Guides>(NO_GUIDES);
  const press = useRef<{ x: number; y: number; timer: number } | null>(null);
  const nodes = useRef(new Map<string, HTMLDivElement>());
  const jelly = useRef<Jelly | null>(null);
  const [jellyId, setJellyId] = useState<string | null>(null);
  const [landing, setLanding] = useState<(Rect & { shape: string }) | null>(null);

  useEffect(() => () => cancelAnimationFrame(jelly.current?.raf ?? 0), []);

  /** One physics step per frame, written straight to the element (no React render per frame). */
  const stepJelly = (now: number) => {
    const j = jelly.current;
    if (!j) return;
    const dt = Math.min(1 / 30, Math.max(1 / 240, (now - j.last) / 1000));
    j.last = now;
    const calm = reducedMotion();
    const drag = j.mode === "drag";
    // Following the finger: stiff with a little lag. Landing: softer, so it overshoots and wobbles.
    const k = calm ? 1800 : drag ? 620 : 300;
    const c = calm ? 85 : drag ? 30 : 17;
    j.vx += (k * (j.tx - j.x) - c * j.vx) * dt;
    j.x += j.vx * dt;
    j.vy += (k * (j.ty - j.y) - c * j.vy) * dt;
    j.y += j.vy * dt;
    j.lv += (520 * ((drag ? 1.05 : 1) - j.lift) - (calm ? 60 : 15) * j.lv) * dt;
    j.lift += j.lv * dt;
    const el = nodes.current.get(j.id);
    if (el) el.style.transform = jellyTransform(j);
    const resting = !drag && Math.abs(j.tx - j.x) < 0.35 && Math.abs(j.ty - j.y) < 0.35 && Math.hypot(j.vx, j.vy) < 10 && Math.abs(j.lift - 1) < 0.003 && Math.abs(j.lv) < 0.05;
    if (resting) {
      if (el) el.style.transform = `translate(${j.tx}px, ${j.ty}px)`;
      jelly.current = null;
      setJellyId(null);
      return;
    }
    j.raf = requestAnimationFrame(stepJelly);
  };

  const startJelly = (id: string, x: number, y: number) => {
    cancelAnimationFrame(jelly.current?.raf ?? 0);
    jelly.current = { id, x, y, vx: 0, vy: 0, tx: x, ty: y, lift: 1, lv: 0, mode: "drag", raf: 0, last: performance.now() };
    setJellyId(id);
    jelly.current.raf = requestAnimationFrame(stepJelly);
  };

  const settleJelly = (id: string, x: number, y: number) => {
    const j = jelly.current;
    if (!j || j.id !== id) return;
    j.tx = x;
    j.ty = y;
    j.mode = "settle";
  };

  const sameGuides = (a: Guides, b: Guides) => a.x.join() === b.x.join() && a.y.join() === b.y.join();
  const rects = useMemo(() => new Map(widgets.map((widget) => [widget.id, widgetRect(widget, viewport, layout)])), [widgets, viewport, layout]);
  const grid = layout.mode === "grid";
  const showGrid = layout.showGrid === "always" || (editing && layout.showGrid === "editing");

  const cancelPress = () => {
    if (!press.current) return;
    window.clearTimeout(press.current.timer);
    press.current = null;
  };

  const sizeOf = (cols: number, rows: number) => ({ width: Math.round(spanPx(cols, metrics)), height: Math.round(spanPx(rows, metrics)) });

  const commit = (widget: HomeWidget, next: Draft) => {
    const { width, height } = sizeOf(next.cols, next.rows);
    onChange(widget.id, { cols: next.cols, rows: next.rows, ...toPosition({ left: next.left, top: next.top, width, height }, viewport) });
  };

  /** Keeps a box off the "edit home" button while the news band is on. */
  const avoidEditButton = (left: number, top: number, width: number, height: number) => {
    if (!newsEnabled) return top;
    const guard = editButtonRect(viewport);
    return overlaps({ left, top, width, height }, guard, 0) ? Math.max(0, guard.top - height - metrics.gap) : top;
  };

  const place = (width: number, height: number, left: number, top: number, others: Rect[]) => {
    const maxX = Math.max(0, viewport.w - width);
    const maxY = Math.max(0, viewport.h - height);
    const x = Math.min(Math.max(0, left), maxX);
    const y = Math.min(Math.max(0, top), maxY);
    if (grid) {
      const sx = snapToGrid(x, width, "x", metrics, viewport);
      const sy = snapToGrid(y, height, "y", metrics, viewport);
      const snappedTop = avoidEditButton(sx.value, sy.value, width, height);
      return {
        left: sx.value,
        top: snappedTop,
        guides: { x: sx.centred ? [viewport.w / 2] : [], y: sy.centred && snappedTop === sy.value ? [viewport.h / 2] : [] },
      };
    }
    if (!layout.guides) return { left: x, top: avoidEditButton(x, y, width, height), guides: NO_GUIDES };
    const lines = guideLines(viewport, others);
    const snappedX = magnet(x, width, lines.x, maxX);
    const snappedY = magnet(y, height, lines.y, maxY);
    return {
      left: snappedX.value,
      top: avoidEditButton(snappedX.value, snappedY.value, width, height),
      guides: { x: snappedX.guide === null ? [] : [snappedX.guide], y: snappedY.guide === null ? [] : [snappedY.guide] },
    };
  };

  /**
   * In grid mode a widget is never dropped on top of another one: the nearest free cell
   * (spiralling out from where it was released) is used instead.
   */
  const resolveFree = (draftBox: Draft, others: Rect[]): Draft => {
    if (!grid) return draftBox;
    const { width, height } = sizeOf(draftBox.cols, draftBox.rows);
    const at = (left: number, top: number) => ({ left, top, width, height });
    if (!others.some((o) => overlaps(at(draftBox.left, draftBox.top), o))) return draftBox;
    const maxCol = Math.max(0, metrics.cols - draftBox.cols);
    const maxRow = Math.max(0, metrics.rows - draftBox.rows);
    const col0 = Math.round((draftBox.left - metrics.originX) / metrics.pitch);
    const row0 = Math.round((draftBox.top - metrics.originY) / metrics.pitch);
    for (let radius = 1; radius <= Math.max(metrics.cols, metrics.rows); radius++) {
      let best: { left: number; top: number; d: number } | null = null;
      for (let dr = -radius; dr <= radius; dr++) {
        for (let dc = -radius; dc <= radius; dc++) {
          if (Math.max(Math.abs(dr), Math.abs(dc)) !== radius) continue;
          const col = col0 + dc;
          const row = row0 + dr;
          if (col < 0 || row < 0 || col > maxCol || row > maxRow) continue;
          const left = metrics.originX + col * metrics.pitch;
          const top = metrics.originY + row * metrics.pitch;
          if (newsEnabled && overlaps(at(left, top), editButtonRect(viewport), 0)) continue;
          if (others.some((o) => overlaps(at(left, top), o))) continue;
          const d = dr * dr + dc * dc;
          if (!best || d < best.d) best = { left, top, d };
        }
      }
      if (best) return { ...draftBox, left: best.left, top: best.top };
    }
    return draftBox;
  };

  const startGesture = (event: ReactPointerEvent<HTMLElement>, widget: HomeWidget, dir: Direction) => {
    if (!editing) {
      // Press and hold enters edit mode (right-click does too, see onContextMenu).
      if (event.pointerType === "mouse" && event.button !== 0) return;
      cancelPress();
      press.current = {
        x: event.clientX,
        y: event.clientY,
        timer: window.setTimeout(() => {
          press.current = null;
          onEnterEdit(widget.id);
        }, LONG_PRESS),
      };
      return;
    }
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    onSelect(widget.id);
    (event.currentTarget.closest(".wl-item") as HTMLElement | null)?.focus({ preventScroll: true });

    const origin = rects.get(widget.id);
    if (!origin) return;
    const others = widgets.filter((item) => item.id !== widget.id).flatMap((item) => rects.get(item.id) ?? []);
    const span = widgetSpan(widget, metrics);
    const round = widgetShape(widget) === "round";
    const maxCells = round ? Math.min(metrics.cols, metrics.rows) : metrics.cols;
    const { clientX: startX, clientY: startY, pointerId } = event;
    const zoom = stageScale(); // the screen is smaller than its layout while editing
    let moved = false;
    let latest: Draft | null = null;

    const move = (e: PointerEvent) => {
      if (e.pointerId !== pointerId) return;
      const dx = (e.clientX - startX) / zoom;
      const dy = (e.clientY - startY) / zoom;
      if (!moved && Math.hypot(e.clientX - startX, e.clientY - startY) < DRAG_THRESHOLD) return;
      if (!moved) {
        moved = true;
        onDragState(true);
        if (dir === "move") {
          startJelly(widget.id, origin.left, origin.top);
          setDraft({ id: widget.id, left: origin.left, top: origin.top, cols: span.cols, rows: span.rows });
        }
      }
      if (dir === "move") {
        // The widget itself follows the finger freely (on a spring); only the landing spot snaps.
        const freeLeft = Math.min(Math.max(0, origin.left + dx), Math.max(0, viewport.w - origin.width));
        const freeTop = Math.min(Math.max(0, origin.top + dy), Math.max(0, viewport.h - origin.height));
        const j = jelly.current;
        if (j && j.id === widget.id) {
          j.tx = freeLeft;
          j.ty = freeTop;
        }
        const placed = place(origin.width, origin.height, freeLeft, freeTop, others);
        latest = { id: widget.id, left: placed.left, top: placed.top, cols: span.cols, rows: span.rows };
        setGuides((prev) => (sameGuides(prev, placed.guides) ? prev : placed.guides));
        if (grid) {
          const target = resolveFree(latest, others);
          setLanding((prev) =>
            prev && prev.left === target.left && prev.top === target.top ? prev : { left: target.left, top: target.top, width: origin.width, height: origin.height, shape: widgetShape(widget) },
          );
        }
        return;
      } else {
        // Width and height follow the pointer independently, one whole cell at a time.
        const horizontal = dir !== "n" && dir !== "s";
        const vertical = dir !== "e" && dir !== "w";
        const wantW = origin.width + (growsLeft(dir) ? -dx : dx);
        const wantH = origin.height + (growsUp(dir) ? -dy : dy);
        let cols = horizontal ? Math.min(maxCells, pxToSpan(wantW, metrics)) : span.cols;
        let rows = vertical ? Math.min(Math.max(1, metrics.rows), pxToSpan(wantH, metrics)) : span.rows;
        if (round) {
          // Round widgets only grow as a whole: follow whichever axis moved further.
          const n = horizontal && vertical ? pxToSpan(Math.max(wantW, wantH), metrics) : horizontal ? cols : rows;
          cols = rows = Math.max(1, Math.min(maxCells, n));
        }
        const { width, height } = sizeOf(cols, rows);
        let left = growsLeft(dir) ? origin.left + origin.width - width : origin.left;
        let top = growsUp(dir) ? origin.top + origin.height - height : origin.top;
        if (round && !growsLeft(dir) && (dir === "n" || dir === "s")) left = origin.left + (origin.width - width) / 2;
        if (round && !growsUp(dir) && (dir === "e" || dir === "w")) top = origin.top + (origin.height - height) / 2;
        left = Math.max(0, Math.min(viewport.w - width, left));
        top = Math.max(0, Math.min(viewport.h - height, top));
        if (grid) {
          left = snapToGrid(left, width, "x", metrics, viewport).value;
          top = snapToGrid(top, height, "y", metrics, viewport).value;
        }
        top = avoidEditButton(left, top, width, height);
        latest = { id: widget.id, left, top, cols, rows };
        setGuides(NO_GUIDES);
      }
      setDraft(latest);
    };

    const end = (e: PointerEvent) => {
      if (e.pointerId !== pointerId) return;
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
      setDraft(null);
      setGuides(NO_GUIDES);
      setLanding(null);
      if (!moved) return;
      onDragState(false);
      if (latest) {
        const final = resolveFree(latest, others);
        commit(widget, final);
        // Let go: the widget springs into its cell with a little overshoot and a soft landing squash.
        if (dir === "move") settleJelly(widget.id, final.left, final.top);
      }
    };

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
  };

  const onKey = (event: ReactKeyboardEvent<HTMLDivElement>, widget: HomeWidget) => {
    if (!editing || event.target !== event.currentTarget) return;
    if (event.key === "Delete" || event.key === "Backspace") {
      event.preventDefault();
      onRemove(widget.id);
      return;
    }
    const direction = ARROW_DIRECTIONS[event.key];
    const origin = rects.get(widget.id);
    if (!direction || !origin) return;
    event.preventDefault();
    const span = widgetSpan(widget, metrics);
    // Ctrl/⌘ + arrows resize by one cell; plain arrows move.
    if (event.ctrlKey || event.metaKey) {
      const round = widgetShape(widget) === "round";
      let cols = Math.max(1, Math.min(metrics.cols, span.cols + direction[0]));
      let rows = Math.max(1, Math.min(metrics.rows, span.rows + direction[1]));
      if (round) cols = rows = Math.max(1, Math.min(metrics.cols, metrics.rows, span.cols + direction[0] + direction[1]));
      commit(widget, { id: widget.id, left: origin.left, top: origin.top, cols, rows });
      return;
    }
    const step = grid ? metrics.pitch : event.shiftKey ? 10 : 1;
    const placed = place(origin.width, origin.height, origin.left + direction[0] * step, origin.top + direction[1] * step, []);
    commit(widget, { id: widget.id, left: placed.left, top: placed.top, cols: span.cols, rows: span.rows });
  };

  return (
    <div
      className={cn("wl", editing && "wl--editing", grid && "wl--grid")}
      style={{ zIndex: editing ? 45 : 5 }}
      onPointerDown={
        editing
          ? (event) => {
              if (event.target === event.currentTarget) onSelect(null);
            }
          : undefined
      }
    >
      {showGrid && <GridCells m={metrics} />}

      {landing && (
        <div
          className="wl-landing"
          data-shape={landing.shape}
          style={{ width: landing.width, height: landing.height, transform: `translate(${landing.left}px, ${landing.top}px)` }}
          aria-hidden="true"
        />
      )}

      {widgets.map((widget) => {
        const active = draft?.id === widget.id ? draft : null;
        const view = active ? ({ ...widget, cols: active.cols, rows: active.rows } as HomeWidget) : widget;
        const size = widgetSize(view, viewport, layout);
        const rect = rects.get(widget.id) ?? { left: 0, top: 0 };
        const left = active ? active.left : rect.left;
        const top = active ? active.top : rect.top;
        const selected = editing && selectedId === widget.id;
        const round = widgetShape(widget) === "round";
        const jellying = jellyId === widget.id && jelly.current?.id === widget.id;
        const spanHint = round ? `${size.cols}×${size.rows}` : `${size.cols} × ${size.rows}`;
        return (
          <div
            key={widget.id}
            data-widget-id={widget.id}
            data-shape={widgetShape(widget)}
            ref={(node) => {
              if (node) nodes.current.set(widget.id, node);
              else nodes.current.delete(widget.id);
            }}
            className={cn("wl-item", selected && "is-selected", active && "is-dragging", jellying && "is-jelly")}
            style={{ width: size.width, height: size.height, transform: jellying && jelly.current ? jellyTransform(jelly.current) : `translate(${left}px, ${top}px)` }}
            tabIndex={editing ? 0 : -1}
            role={editing ? "group" : undefined}
            aria-label={
              editing
                ? t("wg.select", {
                    name:
                      widget.type === "custom_html"
                        ? widget.title || "Custom Widget"
                        : widget.type === "bookmarks"
                          ? widget.title || t("wf.f.bookmarks")
                          : t(`wf.f.${widget.face}`),
                  })
                : undefined
            }
            onPointerDown={(event) => startGesture(event, widget, "move")}
            onPointerMove={(event) => {
              if (press.current && Math.hypot(event.clientX - press.current.x, event.clientY - press.current.y) > 8) cancelPress();
            }}
            onPointerUp={cancelPress}
            onPointerLeave={cancelPress}
            onPointerCancel={cancelPress}
            onContextMenu={(event) => {
              event.preventDefault();
              if (!editing) {
                cancelPress();
                onEnterEdit(widget.id);
              }
            }}
            onKeyDown={(event) => onKey(event, widget)}
            onFocus={editing ? () => onSelect(widget.id) : undefined}
          >
            <Clock widget={view} width={size.width} faceHeight={size.faceHeight} captionHeight={size.caption} caption={captionText(view)} halo={halo} interactive={!editing} />
            {selected && !active && (
              <ElementToolbar below={top < 72} labels={size.width >= 250} anchor={{ left, width: size.width, viewport: viewport.w }}>
                {onOpenSettings && (
                  <button type="button" onClick={() => onOpenSettings(widget.id)} title={isRu ? "Настройки" : "Settings"} aria-label={isRu ? "Настройки" : "Settings"}>
                    <Settings2 size={16} aria-hidden="true" />
                    <span className="wl-tb-label">{isRu ? "Настройки" : "Settings"}</span>
                  </button>
                )}
                <button type="button" onClick={() => onDuplicate(widget.id)} title={t("wg.duplicate")} aria-label={t("wg.duplicate")}>
                  <Copy size={16} aria-hidden="true" />
                  <span className="wl-tb-label">{isRu ? "Копировать" : "Copy"}</span>
                </button>
                <span className="wl-tb-sep" aria-hidden="true" />
                <button type="button" className="is-danger" onClick={() => onRemove(widget.id)} title={t("wg.remove")} aria-label={t("wg.remove")}>
                  <Trash2 size={16} aria-hidden="true" />
                  <span className="wl-tb-label">{isRu ? "Удалить" : "Delete"}</span>
                </button>
              </ElementToolbar>
            )}
            {selected && (
              <SelectionChrome
                edges={!round}
                hint={active && active.cols + active.rows !== 0 ? `${spanHint}${round ? "" : isRu ? " клетки" : " cells"}` : undefined}
                onHandle={(event, dir) => startGesture(event, widget, dir)}
              />
            )}
          </div>
        );
      })}

      <GuideLines guides={guides} />
    </div>
  );
}
