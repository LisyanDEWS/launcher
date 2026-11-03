import { Copy, Trash2 } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from "react";
import Clock from "./Clock";
import { ARROW_DIRECTIONS, DRAG_THRESHOLD, ElementToolbar, GuideLines, LONG_PRESS, NO_GUIDES, SelectionChrome, growsLeft, growsUp, guideLines, magnet, resizeDelta, type Direction, type Guides } from "./engine";
import { useI18n } from "../../lib/i18n";
import type { HomeWidget, HomeLayout } from "../../lib/settings";
import { stageScale } from "../../lib/stage";
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

/** Widgets on the start page: static in normal mode, draggable and resizable while editing. */
export default function WidgetLayer({ widgets, layout, editing, selectedId, halo, onSelect, onChange, onRemove, onDuplicate, onEnterEdit, onDragState }: Props) {
  const { t } = useI18n();
  const viewport = useViewport();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [guides, setGuides] = useState<Guides>(NO_GUIDES);
  const press = useRef<{ x: number; y: number; timer: number } | null>(null);
  const rects = useMemo(() => new Map(widgets.map((widget) => [widget.id, widgetRect(widget, viewport, layout)])), [widgets, viewport, layout]);
  const grid = layout.mode === "grid" || layout.showGrid === "always";
  const showGrid = layout.showGrid === "always" || (editing && layout.showGrid === "editing");

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
    const lines = guideLines(viewport, others);
    const snappedX = magnet(x, origin.width, lines.x, maxX);
    const snappedY = magnet(y, origin.height, lines.y, maxY);
    return {
      left: snappedX.value,
      top: snappedY.value,
      guides: { x: snappedX.guide === null ? [] : [snappedX.guide], y: snappedY.guide === null ? [] : [snappedY.guide] },
    };
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
    const { width: origW, height: origH, caption } = widgetSize(widget);
    const k = origW / Math.max(1, origH - caption);
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
      }
      if (dir === "move") {
        const placed = place(origin, origin.left + dx, origin.top + dy, others);
        latest = { id: widget.id, left: placed.left, top: placed.top, size: widget.size };
        setGuides(placed.guides);
      } else {
        const faceH = origin.height - caption;
        const diagonal = Math.hypot(origin.width, faceH);
        const delta = resizeDelta(dir, dx, dy, origin.width, faceH);
        let nextSize = (widget.size * (diagonal + delta)) / diagonal;
        nextSize = Math.round(Math.min(SIZE_MAX, Math.max(SIZE_MIN, nextSize)));
        if (grid) nextSize = Math.max(layout.cell, Math.round((nextSize * k) / layout.cell) * layout.cell) / k;
        nextSize = Math.round(Math.min(SIZE_MAX, Math.max(SIZE_MIN, nextSize)));

        const nextDims = widgetSize({ ...widget, size: nextSize });
        const dw = nextDims.width - origin.width;
        const dh = nextDims.height - origin.height;

        let nextLeft = origin.left;
        let nextTop = origin.top;

        if (growsLeft(dir)) nextLeft = origin.left - dw;
        if (growsUp(dir)) nextTop = origin.top - dh;

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
    const direction = ARROW_DIRECTIONS[event.key];
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
              <ElementToolbar below={top < 72}>
                <button type="button" onClick={() => onDuplicate(widget.id)} title={t("wg.duplicate")} aria-label={t("wg.duplicate")}>
                  <Copy size={16} aria-hidden="true" />
                </button>
                <button type="button" onClick={() => onRemove(widget.id)} title={t("wg.remove")} aria-label={t("wg.remove")}>
                  <Trash2 size={16} aria-hidden="true" />
                </button>
              </ElementToolbar>
            )}
            {selected && <SelectionChrome onHandle={(event, dir) => startGesture(event, widget, dir)} />}
          </div>
        );
      })}

      <GuideLines guides={guides} />
    </div>
  );
}
