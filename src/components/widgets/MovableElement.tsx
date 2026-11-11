import { Settings2, Eye, EyeOff, LocateFixed } from "lucide-react";
import { useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent, ReactNode } from "react";
import { ARROW_DIRECTIONS, DRAG_THRESHOLD, ElementToolbar, GuideLines, LONG_PRESS, NO_GUIDES, SelectionChrome, growsLeft, growsUp, guideLines, magnet, resizeDelta, type Direction, type Guides } from "./engine";
import { useI18n } from "../../lib/i18n";
import { collectPeers, stageScale, toStageRect } from "../../lib/stage";
import { gridMetrics, snapToGrid, useViewport, type Rect } from "../../lib/widgets";
import type { ElementPosition, HomeLayout } from "../../lib/settings";
import { cn } from "../../utils/cn";

type Props = {
  id: string;
  title: string;
  position: ElementPosition;
  homeLayout: HomeLayout;
  editing: boolean;
  selected: boolean;
  onSelect: () => void;
  /** Opens the properties panel on this element. */
  onOpenSettings?: () => void;
  onMove: (x: number, y: number) => void;
  onResize: (width: number, scale: number) => void;
  onResetCenter: () => void;
  onRemove?: () => void;
  onShow?: () => void;
  onEnterEdit?: () => void;
  onDragState?: (dragging: boolean) => void;
  className?: string;
  children: ReactNode;
};

type Draft = { left: number; top: number; width: number; scale: number };

const SCALE_MIN = 50;
const SCALE_MAX = 220;
const WIDTH_MIN = 140;
const WIDTH_MAX = 1400;
const EDGE = 12;

/**
 * A system element (logo, search bar, bookmarks…) that behaves exactly like a widget while editing:
 * same brackets, handles, snapping, keyboard nudging and long-press to edit.
 */
export default function MovableElement({
  id,
  title,
  position,
  homeLayout,
  editing,
  selected,
  onSelect,
  onOpenSettings,
  onMove,
  onResize,
  onResetCenter,
  onRemove,
  onShow,
  onEnterEdit,
  onDragState,
  className = "",
  children,
}: Props) {
  const { t } = useI18n();
  const viewport = useViewport();
  const box = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [guides, setGuides] = useState<Guides>(NO_GUIDES);
  const [flowHeight, setFlowHeight] = useState(0);
  const press = useRef<{ x: number; y: number; timer: number } | null>(null);
  const grid = homeLayout.mode === "grid";

  // Measure the in-flow height so the page doesn't collapse when the element lifts off during a drag.
  useLayoutEffect(() => {
    if (!box.current) return;
    const el = box.current;
    const update = () => setFlowHeight(el.offsetHeight);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [position.scale, position.width, editing]);

  if (!position.visible && !editing) return null;

  const isCustom = position.custom;
  const scale = draft ? draft.scale : position.scale;
  const width = Math.min(draft ? draft.width : position.width, Math.max(200, viewport.w - EDGE * 2));
  const visualHeight = flowHeight || 56;

  // Resolved position for custom placement.
  const spanX = Math.max(0, viewport.w - width);
  const spanY = Math.max(0, viewport.h - visualHeight);
  let left = position.x * spanX;
  let top = position.y * spanY;
  const metrics = gridMetrics(viewport, homeLayout);
  if (grid && isCustom) {
    left = snapToGrid(left, width, "x", metrics, viewport).value;
    top = snapToGrid(top, visualHeight, "y", metrics, viewport).value;
  }
  const finalLeft = draft ? draft.left : Math.min(left, Math.max(EDGE, viewport.w - width - EDGE));
  const finalTop = draft ? draft.top : Math.max(EDGE, top);

  const cancelPress = () => {
    if (!press.current) return;
    window.clearTimeout(press.current.timer);
    press.current = null;
  };

  const place = (origin: Rect, nextLeft: number, nextTop: number, peers: Rect[]) => {
    const maxX = Math.max(0, viewport.w - origin.width);
    const maxY = Math.max(0, viewport.h - origin.height);
    const x = Math.min(Math.max(0, nextLeft), maxX);
    const y = Math.min(Math.max(0, nextTop), maxY);
    if (grid) {
      const sx = snapToGrid(x, origin.width, "x", metrics, viewport);
      const sy = snapToGrid(y, origin.height, "y", metrics, viewport);
      return { left: sx.value, top: sy.value, guides: { x: sx.centred ? [viewport.w / 2] : [], y: [] } };
    }
    if (!homeLayout.guides) return { left: x, top: y, guides: NO_GUIDES };
    const lines = guideLines(viewport, peers);
    const sx = magnet(x, origin.width, lines.x, maxX);
    const sy = magnet(y, origin.height, lines.y, maxY);
    return { left: sx.value, top: sy.value, guides: { x: sx.guide === null ? [] : [sx.guide], y: sy.guide === null ? [] : [sy.guide] } };
  };

  const commit = (latest: Draft, dir: Direction) => {
    const newSpanX = Math.max(1, viewport.w - latest.width);
    const newSpanY = Math.max(1, viewport.h - visualHeight);
    onMove(Math.min(1, Math.max(0, latest.left / newSpanX)), Math.min(1, Math.max(0, latest.top / newSpanY)));
    if (dir !== "move") onResize(Math.round(latest.width), Math.round(latest.scale));
  };

  /** Where the element really is, in the same (unzoomed) coordinates it is positioned in. */
  const measure = (): Rect => {
    const r = box.current?.getBoundingClientRect();
    return r ? toStageRect(r) : { left: finalLeft, top: finalTop, width, height: visualHeight };
  };

  const startGesture = (event: ReactPointerEvent<HTMLElement>, dir: Direction) => {
    if (!editing) {
      // Press-and-hold enters edit mode, just like widgets — but never when pressing the input or a link/button.
      if (!onEnterEdit || (event.pointerType === "mouse" && event.button !== 0)) return;
      if ((event.target as HTMLElement).closest("input, textarea, select, button, a, [contenteditable]")) return;
      cancelPress();
      press.current = {
        x: event.clientX,
        y: event.clientY,
        timer: window.setTimeout(() => {
          press.current = null;
          onEnterEdit();
          onSelect();
        }, LONG_PRESS),
      };
      return;
    }
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    onSelect();
    box.current?.focus({ preventScroll: true });

    // Always start from where the element really is on screen — no jump on the first drag.
    const origin = measure();
    const peers = collectPeers(id);
    const zoom = stageScale(); // the screen is smaller than its layout while editing
    const origScale = scale;
    const origWidth = width;
    const { clientX: startX, clientY: startY, pointerId } = event;
    let moved = false;
    let latest: Draft | null = null;
    /** Where a move will land (grid cell / magnet line); the element itself follows the finger freely. */
    let landing: Draft | null = null;

    const move = (e: PointerEvent) => {
      if (e.pointerId !== pointerId) return;
      const dx = (e.clientX - startX) / zoom;
      const dy = (e.clientY - startY) / zoom;
      if (!moved && Math.hypot(dx * zoom, dy * zoom) < DRAG_THRESHOLD) return;
      if (!moved) {
        moved = true;
        onDragState?.(true);
      }

      if (dir === "move") {
        const placed = place(origin, origin.left + dx, origin.top + dy, peers);
        landing = { left: placed.left, top: placed.top, width: origWidth, scale: origScale };
        latest = {
          left: Math.min(Math.max(0, origin.left + dx), Math.max(0, viewport.w - origin.width)),
          top: Math.min(Math.max(0, origin.top + dy), Math.max(0, viewport.h - origin.height)),
          width: origWidth,
          scale: origScale,
        };
        setGuides(placed.guides);
      } else if (dir === "e" || dir === "w") {
        // Side pills change the width (great for the search bar); everything else scales proportionally.
        const delta = resizeDelta(dir, dx, dy, origin.width, origin.height);
        const nextWidth = Math.round(Math.max(WIDTH_MIN, Math.min(WIDTH_MAX, viewport.w - EDGE * 2, origWidth + delta)));
        const dw = nextWidth - origWidth;
        const nextLeft = dir === "w" ? origin.left - dw : origin.left;
        latest = { left: Math.max(0, Math.min(viewport.w - nextWidth, nextLeft)), top: origin.top, width: nextWidth, scale: origScale };
      } else {
        const delta = resizeDelta(dir, dx, dy, origin.width, origin.height);
        const diagonal = Math.hypot(origin.width, origin.height) || 1;
        let nextScale = (origScale * (diagonal + delta)) / diagonal;
        nextScale = Math.round(Math.min(SCALE_MAX, Math.max(SCALE_MIN, nextScale)) / 2) * 2;
        const factor = nextScale / origScale;
        const dw = origin.width * factor - origin.width;
        const dh = origin.height * factor - origin.height;
        const nextLeft = growsLeft(dir) ? origin.left - dw : origin.left;
        const nextTop = growsUp(dir) ? origin.top - dh : origin.top;
        latest = {
          left: Math.max(0, Math.min(viewport.w - origin.width, nextLeft)),
          top: Math.max(0, Math.min(viewport.h - origin.height, nextTop)),
          width: origWidth,
          scale: nextScale,
        };
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
      onDragState?.(false);
      // On release the element springs from where it was dropped into its snapped place.
      if (latest) commit(dir === "move" && landing ? landing : latest, dir);
    };

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
  };

  const onKey = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (!editing || event.target !== event.currentTarget) return;
    if ((event.key === "Delete" || event.key === "Backspace") && onRemove) {
      event.preventDefault();
      onRemove();
      return;
    }
    const direction = ARROW_DIRECTIONS[event.key];
    if (!direction) return;
    event.preventDefault();
    const origin = measure();
    const step = grid ? homeLayout.cell * (event.shiftKey ? 4 : 1) : event.shiftKey ? 10 : 1;
    const placed = place(origin, origin.left + direction[0] * step, origin.top + direction[1] * step, collectPeers(id));
    commit({ left: placed.left, top: placed.top, width, scale }, "move");
  };

  const lifted = isCustom || draft !== null;
  const hidden = !position.visible && editing;

  const scaled = (
    <div
      className={cn("w-full", editing && "pointer-events-none")}
      style={{ transform: scale !== 100 ? `scale(${scale / 100})` : undefined, transformOrigin: "center top" }}
    >
      {children}
    </div>
  );

  // Normal mode, default placement: plain centred flow.
  if (!editing && !isCustom) {
    return (
      <div
        data-widget-id={id}
        ref={box}
        onPointerDown={(e) => startGesture(e, "move")}
        onPointerMove={(e) => {
          if (press.current && Math.hypot(e.clientX - press.current.x, e.clientY - press.current.y) > 8) cancelPress();
        }}
        onPointerUp={cancelPress}
        onPointerLeave={cancelPress}
        onPointerCancel={cancelPress}
        className={cn("relative mx-auto flex w-full justify-center", className)}
        style={{ maxWidth: width, marginBottom: scale > 100 ? `${Math.round(((scale - 100) / 100) * visualHeight)}px` : undefined }}
      >
        {scaled}
      </div>
    );
  }

  const style: CSSProperties = lifted
    ? {
        position: "fixed",
        left: finalLeft,
        top: finalTop,
        width,
        maxWidth: `calc(100vw - ${EDGE * 2}px)`,
        zIndex: editing ? (selected ? 48 : 46) : 20,
        // Exactly under the finger while dragging; a springy settle (with overshoot) once released.
        transition: draft ? "none" : "left 420ms var(--ui-spring), top 420ms var(--ui-spring), width 320ms var(--ui-spring), outline-color 150ms ease",
      }
    : { position: "relative", marginTop: 0, marginRight: "auto", marginBottom: 0, marginLeft: "auto", width, maxWidth: `calc(100vw - ${EDGE * 2}px)`, zIndex: editing ? (selected ? 48 : 46) : "auto" };

  const toolbarBelow = (lifted ? finalTop : box.current ? toStageRect(box.current.getBoundingClientRect()).top : 100) < 72;

  return (
    <>
      {/* Placeholder keeps the column from collapsing while a default-placed element is being dragged. */}
      {!isCustom && draft && <div aria-hidden="true" style={{ height: flowHeight, marginBottom: scale > 100 ? `${Math.round(((scale - 100) / 100) * visualHeight)}px` : undefined }} />}
      <div
        ref={box}
        data-widget-id={id}
        tabIndex={editing ? 0 : -1}
        role={editing ? "button" : undefined}
        aria-label={title}
        style={style}
        onPointerDown={(e) => startGesture(e, "move")}
        onPointerMove={(e) => {
          if (press.current && Math.hypot(e.clientX - press.current.x, e.clientY - press.current.y) > 8) cancelPress();
        }}
        onPointerUp={cancelPress}
        onPointerLeave={cancelPress}
        onPointerCancel={cancelPress}
        onKeyDown={onKey}
        onFocus={editing ? (event) => event.target === event.currentTarget && onSelect() : undefined}
        className={cn(
          "wl-item wl-item--system group/movable select-none",
          !lifted && "mx-auto",
          editing && "wl-item--editing",
          selected && "is-selected",
          draft && "is-dragging",
          hidden && "is-hidden",
          className,
        )}
      >
        {editing && selected && !draft && (
          <ElementToolbar below={toolbarBelow} title={title}>
            {onOpenSettings && (
              <button type="button" onClick={onOpenSettings} title={t("settings.title")} aria-label={t("settings.title")}>
                <Settings2 size={16} aria-hidden="true" />
              </button>
            )}
            {isCustom && (
              <button type="button" onClick={onResetCenter} title={t("home.element.center")} aria-label={t("home.element.center")}>
                <LocateFixed size={16} aria-hidden="true" />
              </button>
            )}
            {hidden && onShow ? (
              <button type="button" onClick={onShow} title={t("home.element.show")} aria-label={t("home.element.show")}>
                <Eye size={16} aria-hidden="true" />
              </button>
            ) : (
              onRemove && (
                <button type="button" onClick={onRemove} title={t("home.element.hide")} aria-label={t("home.element.hide")}>
                  <EyeOff size={16} aria-hidden="true" />
                </button>
              )
            )}
          </ElementToolbar>
        )}

        <div style={{ transform: scale !== 100 ? `scale(${scale / 100})` : undefined, transformOrigin: "center top" }} className={cn("w-full", editing && "pointer-events-none")}>
          {children}
        </div>

        {editing && selected && <SelectionChrome onHandle={startGesture} hint={hidden ? t("home.element.hiddenHint") : undefined} />}
      </div>
      {editing && <GuideLines guides={guides} />}
    </>
  );
}
