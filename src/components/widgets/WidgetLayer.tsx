import { Copy, Trash2 } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from "react";
import Clock from "./Clock";
import { useI18n } from "../../lib/i18n";
import type { HomeWidget, HomeLayout } from "../../lib/settings";
import { SIZE_MAX, SIZE_MIN, captionText, snapWithin, toPosition, useViewport, widgetRect, widgetSize, type Rect } from "../../lib/widgets";
import { cn } from "../../utils/cn";

type Props = {
  widgets: HomeWidget[];
  layout: HomeLayout;
  editing: boolean;
  selectedId: string | null;
  /** Wallpaper is shown — add a readability halo. */
  halo: boolean;
  onSelect: (id: string | null) => void;
  onChange: (id: string, patch: Partial<HomeWidget>) => void;
  onRemove: (id: string) => void;
  onDuplicate: (id: string) => void;
  onEnterEdit: (id: string) => void;
  onDragState: (dragging: boolean) => void;
};

type Draft = { id: string; left: number; top: number; size: number };
type Guides = { x: number[]; y: number[] };

const NO_GUIDES: Guides = { x: [], y: [] };
const MAGNET = 6;
const LONG_PRESS = 550;
const DIRECTIONS: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };

/** Pulls the box (its start, centre or end) onto the nearest guide line within MAGNET px. */
function magnet(start: number, length: number, lines: number[], max: number) {
  let best: { delta: number; line: number } | null = null;
  for (const line of lines) {
    for (const edge of [start, start + length / 2, start + length]) {
      const delta = line - edge;
      if (Math.abs(delta) <= MAGNET && (!best || Math.abs(delta) < Math.abs(best.delta))) best = { delta, line };
    }
  }
  if (!best) return { value: start, guide: null };
  return { value: Math.min(Math.max(0, start + best.delta), max), guide: best.line };
}

/** Widgets on the start page: static in normal mode, draggable and resizable while editing. */
export default function WidgetLayer({ widgets, layout, editing, selectedId, halo, onSelect, onChange, onRemove, onDuplicate, onEnterEdit, onDragState }: Props) {
  const { t } = useI18n();
  const viewport = useViewport();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [guides, setGuides] = useState<Guides>(NO_GUIDES);
  const press = useRef<{ x: number; y: number; timer: number } | null>(null);
  const rects = useMemo(() => new Map(widgets.map((widget) => [widget.id, widgetRect(widget, viewport, layout)])), [widgets, viewport, layout]);
  const grid = layout.mode === "grid";
  const showGrid = grid && (layout.showGrid === "always" || (editing && layout.showGrid === "editing"));

  const cancelPress = () => {
    if (!press.current) return;
    window.clearTimeout(press.current.timer);
    press.current = null;
  };

  const commit = (widget: HomeWidget, left: number, top: number, size: number) => {
    const { width, height } = widgetSize({ ...widget, size });
    onChange(widget.id, { size, ...toPosition({ left, top, width, height }, viewport) });
  };

  const place = (origin: Rect, left: number, top: number, others: Rect[]) => {
    const maxX = Math.max(0, viewport.w - origin.width);
    const maxY = Math.max(0, viewport.h - origin.height);
    const x = Math.min(Math.max(0, left), maxX);
    const y = Math.min(Math.max(0, top), maxY);
    if (grid) return { left: snapWithin(x, layout.cell, maxX), top: snapWithin(y, layout.cell, maxY), guides: NO_GUIDES };
    if (!layout.guides) return { left: x, top: y, guides: NO_GUIDES };
    const linesX = [viewport.w / 2, 24, viewport.w - 24, ...others.flatMap((rect) => [rect.left, rect.left + rect.width / 2, rect.left + rect.width])];
    const linesY = [viewport.h / 2, 24, viewport.h - 24, ...others.flatMap((rect) => [rect.top, rect.top + rect.height / 2, rect.top + rect.height])];
    const snappedX = magnet(x, origin.width, linesX, maxX);
    const snappedY = magnet(y, origin.height, linesY, maxY);
    return {
      left: snappedX.value,
      top: snappedY.value,
      guides: { x: snappedX.guide === null ? [] : [snappedX.guide], y: snappedY.guide === null ? [] : [snappedY.guide] },
    };
  };

  type DragDir = "move" | "nw" | "ne" | "se" | "sw" | "n" | "s" | "e" | "w";

  const startGesture = (event: ReactPointerEvent<HTMLElement>, widget: HomeWidget, dir: DragDir) => {
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
    const { width: origW, height: origH, caption } = widgetSize(widget);
    const k = origW / Math.max(1, origH - caption);
    const { clientX: startX, clientY: startY, pointerId } = event;
    let moved = false;
    let latest: Draft | null = null;

    const move = (e: PointerEvent) => {
      if (e.pointerId !== pointerId) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (!moved && Math.hypot(dx, dy) < 3) return;
      if (!moved) {
        moved = true;
        onDragState(true);
      }
      if (dir === "move") {
        const placed = place(origin, origin.left + dx, origin.top + dy, others);
        latest = { id: widget.id, left: placed.left, top: placed.top, size: widget.size };
        setGuides(placed.guides);
      } else {
        // Multi-directional resizing in every direction
        const faceH = origin.height - caption;
        const diagonal = Math.hypot(origin.width, faceH);

        let delta = 0;
        if (dir === "se") {
          delta = (dx * origin.width + dy * faceH) / diagonal;
        } else if (dir === "sw") {
          delta = (-dx * origin.width + dy * faceH) / diagonal;
        } else if (dir === "ne") {
          delta = (dx * origin.width - dy * faceH) / diagonal;
        } else if (dir === "nw") {
          delta = (-dx * origin.width - dy * faceH) / diagonal;
        } else if (dir === "e") {
          delta = dx;
        } else if (dir === "w") {
          delta = -dx;
        } else if (dir === "s") {
          delta = dy;
        } else if (dir === "n") {
          delta = -dy;
        }

        let nextSize = (widget.size * (diagonal + delta)) / diagonal;
        nextSize = Math.round(Math.min(SIZE_MAX, Math.max(SIZE_MIN, nextSize)));
        if (grid) nextSize = Math.max(layout.cell, Math.round((nextSize * k) / layout.cell) * layout.cell) / k;
        nextSize = Math.round(Math.min(SIZE_MAX, Math.max(SIZE_MIN, nextSize)));

        const nextDims = widgetSize({ ...widget, size: nextSize });
        const dw = nextDims.width - origin.width;
        const dh = nextDims.height - origin.height;

        let nextLeft = origin.left;
        let nextTop = origin.top;

        if (dir === "w" || dir === "nw" || dir === "sw") {
          nextLeft = origin.left - dw;
        }
        if (dir === "n" || dir === "nw" || dir === "ne") {
          nextTop = origin.top - dh;
        }

        nextLeft = Math.max(0, Math.min(viewport.w - nextDims.width, nextLeft));
        nextTop = Math.max(0, Math.min(viewport.h - nextDims.height, nextTop));

        latest = { id: widget.id, left: nextLeft, top: nextTop, size: nextSize };
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
      if (!moved) return;
      onDragState(false);
      if (latest) commit(widget, latest.left, latest.top, latest.size);
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
    const direction = DIRECTIONS[event.key];
    const origin = rects.get(widget.id);
    if (!direction || !origin) return;
    event.preventDefault();
    const step = grid ? layout.cell * (event.shiftKey ? 4 : 1) : event.shiftKey ? 10 : 1;
    const placed = place(origin, origin.left + direction[0] * step, origin.top + direction[1] * step, []);
    commit(widget, placed.left, placed.top, widget.size);
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
      {showGrid && <div className="wl-grid" style={{ "--cell": `${layout.cell}px` } as CSSProperties} />}

      {widgets.map((widget) => {
        const active = draft?.id === widget.id ? draft : null;
        const view = active ? { ...widget, size: active.size } : widget;
        const size = widgetSize(view);
        const rect = rects.get(widget.id) ?? { left: 0, top: 0 };
        const left = active ? active.left : rect.left;
        const top = active ? active.top : rect.top;
        const selected = editing && selectedId === widget.id;
        return (
          <div
            key={widget.id}
            data-widget-id={widget.id}
            className={cn("wl-item", selected && "is-selected", active && "is-dragging")}
            style={{ width: size.width, height: size.height, transform: `translate(${left}px, ${top}px)` }}
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
            <Clock widget={view} width={size.width} faceHeight={size.faceHeight} captionHeight={size.caption} caption={captionText(view)} halo={halo} />
            {selected && !active && (
              <div className={cn("wl-toolbar", top < 64 && "wl-toolbar--below")} onPointerDown={(event) => event.stopPropagation()}>
                <button type="button" onClick={() => onDuplicate(widget.id)} title={t("wg.duplicate")} aria-label={t("wg.duplicate")}>
                  <Copy size={16} aria-hidden="true" />
                </button>
                <button type="button" onClick={() => onRemove(widget.id)} title={t("wg.remove")} aria-label={t("wg.remove")}>
                  <Trash2 size={16} aria-hidden="true" />
                </button>
              </div>
            )}
            {selected && (
              <>
                {/* L-shaped corner brackets (like Android/OnePlus lockscreen customizer) */}
                <div className="pointer-events-none absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-[var(--primary)] rounded-tl-lg" />
                <div className="pointer-events-none absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-[var(--primary)] rounded-tr-lg" />
                <div className="pointer-events-none absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-[var(--primary)] rounded-bl-lg" />
                <div className="pointer-events-none absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-[var(--primary)] rounded-br-lg" />

                {/* 4 Corner handles */}
                <span
                  className="absolute -top-2.5 -left-2.5 h-5 w-5 rounded-full border-2 border-[var(--surface)] bg-[var(--primary)] shadow-md cursor-nwse-resize z-30 transition hover:scale-125"
                  onPointerDown={(event) => startGesture(event, widget, "nw")}
                  title="Resize NW"
                  aria-hidden="true"
                />
                <span
                  className="absolute -top-2.5 -right-2.5 h-5 w-5 rounded-full border-2 border-[var(--surface)] bg-[var(--primary)] shadow-md cursor-nesw-resize z-30 transition hover:scale-125"
                  onPointerDown={(event) => startGesture(event, widget, "ne")}
                  title="Resize NE"
                  aria-hidden="true"
                />
                <span
                  className="absolute -bottom-2.5 -right-2.5 h-5 w-5 rounded-full border-2 border-[var(--surface)] bg-[var(--primary)] shadow-md cursor-nwse-resize z-30 transition hover:scale-125"
                  onPointerDown={(event) => startGesture(event, widget, "se")}
                  title="Resize SE"
                  aria-hidden="true"
                />
                <span
                  className="absolute -bottom-2.5 -left-2.5 h-5 w-5 rounded-full border-2 border-[var(--surface)] bg-[var(--primary)] shadow-md cursor-nesw-resize z-30 transition hover:scale-125"
                  onPointerDown={(event) => startGesture(event, widget, "sw")}
                  title="Resize SW"
                  aria-hidden="true"
                />

                {/* 4 Edge pill handles */}
                <span
                  className="absolute -top-1.5 left-1/2 -translate-x-1/2 h-3 w-7 rounded-full border border-[var(--surface)] bg-[var(--primary)] shadow-md cursor-ns-resize z-30 transition hover:scale-110"
                  onPointerDown={(event) => startGesture(event, widget, "n")}
                  title="Resize Top"
                  aria-hidden="true"
                />
                <span
                  className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 h-3 w-7 rounded-full border border-[var(--surface)] bg-[var(--primary)] shadow-md cursor-ns-resize z-30 transition hover:scale-110"
                  onPointerDown={(event) => startGesture(event, widget, "s")}
                  title="Resize Bottom"
                  aria-hidden="true"
                />
                <span
                  className="absolute top-1/2 -left-1.5 -translate-y-1/2 h-7 w-3 rounded-full border border-[var(--surface)] bg-[var(--primary)] shadow-md cursor-ew-resize z-30 transition hover:scale-110"
                  onPointerDown={(event) => startGesture(event, widget, "w")}
                  title="Resize Left"
                  aria-hidden="true"
                />
                <span
                  className="absolute top-1/2 -right-1.5 -translate-y-1/2 h-7 w-3 rounded-full border border-[var(--surface)] bg-[var(--primary)] shadow-md cursor-ew-resize z-30 transition hover:scale-110"
                  onPointerDown={(event) => startGesture(event, widget, "e")}
                  title="Resize Right"
                  aria-hidden="true"
                />
              </>
            )}
          </div>
        );
      })}

      {guides.x.map((x) => (
        <div key={`x${x}`} className="wl-guide wl-guide--v" style={{ left: x }} />
      ))}
      {guides.y.map((y) => (
        <div key={`y${y}`} className="wl-guide wl-guide--h" style={{ top: y }} />
      ))}
    </div>
  );
}
