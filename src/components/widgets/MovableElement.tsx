import { RotateCcw, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent, ReactNode } from "react";
import { snapWithin, useViewport, type Rect } from "../../lib/widgets";
import type { ElementPosition, HomeLayout } from "../../lib/settings";
import { cn } from "../../utils/cn";

type Direction = "move" | "nw" | "ne" | "se" | "sw" | "n" | "s" | "e" | "w";

type Props = {
  id: string;
  title: string;
  position: ElementPosition;
  homeLayout: HomeLayout;
  editing: boolean;
  selected: boolean;
  onSelect: () => void;
  onMove: (x: number, y: number) => void;
  onResize: (width: number, scale: number) => void;
  onResetCenter: () => void;
  onRemove?: () => void;
  onDragState?: (dragging: boolean) => void;
  className?: string;
  children: ReactNode;
};

export default function MovableElement({
  id,
  title,
  position,
  homeLayout,
  editing,
  selected,
  onSelect,
  onMove,
  onResize,
  onResetCenter,
  onRemove,
  onDragState,
  className = "",
  children,
}: Props) {
  const viewport = useViewport();
  const [draft, setDraft] = useState<{ left: number; top: number; width: number; scale: number } | null>(null);
  const dragRef = useRef<{
    startX: number;
    startY: number;
    origLeft: number;
    origTop: number;
    origWidth: number;
    origScale: number;
    dir: Direction;
  } | null>(null);

  // If not visible and not editing, hide completely
  if (!position.visible && !editing) {
    return null;
  }

  const isCustom = position.custom;
  const rawWidth = draft ? draft.width : position.width;
  const currentScale = draft ? draft.scale : position.scale;
  const currentWidth = Math.min(rawWidth, Math.max(240, viewport.w - 24));

  // Compute absolute left & top if custom, else centered defaults
  const spanX = Math.max(0, viewport.w - currentWidth);
  const spanY = Math.max(0, viewport.h - 180);
  let left = position.x * spanX;
  let top = position.y * spanY;

  if (homeLayout.mode === "grid" && isCustom) {
    left = snapWithin(left, homeLayout.cell, spanX);
    top = snapWithin(top, homeLayout.cell, spanY);
  }

  const finalLeft = draft ? draft.left : Math.min(left, Math.max(12, viewport.w - currentWidth - 12));
  const finalTop = draft ? draft.top : top;

  const startDrag = (e: ReactPointerEvent<HTMLElement>, dir: Direction) => {
    if (!editing || e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    onSelect();

    const startX = e.clientX;
    const startY = e.clientY;
    const origLeft = finalLeft;
    const origTop = finalTop;
    const origWidth = currentWidth;
    const origScale = currentScale;

    dragRef.current = { startX, startY, origLeft, origTop, origWidth, origScale, dir };
    let moved = false;

    const handlePointerMove = (ev: PointerEvent) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      if (!moved && Math.hypot(dx, dy) < 3) return;
      if (!moved) {
        moved = true;
        onDragState?.(true);
      }

      if (dir === "move") {
        let nextLeft = origLeft + dx;
        let nextTop = origTop + dy;
        nextLeft = Math.max(12, Math.min(viewport.w - origWidth - 12, nextLeft));
        nextTop = Math.max(12, Math.min(viewport.h - 100, nextTop));
        if (homeLayout.mode === "grid") {
          nextLeft = snapWithin(nextLeft, homeLayout.cell, viewport.w - origWidth);
          nextTop = snapWithin(nextTop, homeLayout.cell, viewport.h - 100);
        }
        setDraft({ left: nextLeft, top: nextTop, width: origWidth, scale: origScale });
      } else {
        // Multi-directional resizing in every direction (N, S, E, W, NW, NE, SW, SE)
        let nextWidth = origWidth;
        let nextScale = origScale;
        let nextLeft = origLeft;
        let nextTop = origTop;

        // Horizontal changes
        if (dir === "e" || dir === "se" || dir === "ne") {
          nextWidth = Math.max(140, Math.min(1400, origWidth + dx));
          const scaleDelta = Math.round((dx / origWidth) * 45);
          nextScale = Math.max(50, Math.min(220, origScale + scaleDelta));
        } else if (dir === "w" || dir === "sw" || dir === "nw") {
          const proposedWidth = Math.max(140, Math.min(1400, origWidth - dx));
          const actualDx = origWidth - proposedWidth;
          nextWidth = proposedWidth;
          nextLeft = Math.max(12, origLeft + actualDx);
          const scaleDelta = Math.round((-dx / origWidth) * 45);
          nextScale = Math.max(50, Math.min(220, origScale + scaleDelta));
        }

        // Vertical changes (adjust scale and vertical position)
        if (dir === "s" || dir === "se" || dir === "sw") {
          const scaleDeltaY = Math.round((dy / 120) * 35);
          nextScale = Math.max(50, Math.min(220, nextScale + scaleDeltaY));
        } else if (dir === "n" || dir === "ne" || dir === "nw") {
          const scaleDeltaY = Math.round((-dy / 120) * 35);
          nextScale = Math.max(50, Math.min(220, nextScale + scaleDeltaY));
          nextTop = Math.max(12, origTop + dy);
        }

        setDraft({
          left: Math.max(12, Math.min(viewport.w - nextWidth - 12, nextLeft)),
          top: Math.max(12, Math.min(viewport.h - 80, nextTop)),
          width: nextWidth,
          scale: nextScale,
        });
      }
    };

    const handlePointerUp = () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);

      if (moved && dragRef.current) {
        onDragState?.(false);
        setDraft((latest) => {
          if (latest) {
            const newSpanX = Math.max(1, viewport.w - latest.width);
            const newSpanY = Math.max(1, viewport.h - 180);
            const newX = Math.min(1, Math.max(0, latest.left / newSpanX));
            const newY = Math.min(1, Math.max(0, latest.top / newSpanY));
            onMove(newX, newY);
            if (dir !== "move") {
              onResize(latest.width, latest.scale);
            }
          }
          return null;
        });
      } else {
        setDraft(null);
      }
      dragRef.current = null;
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);
  };

  // If in normal mode and not custom, render inline in standard flow
  if (!editing && !isCustom) {
    return (
      <div
        data-widget-id={id}
        className={cn("relative w-full mx-auto flex justify-center transition-all duration-300 max-w-[calc(100vw-24px)] px-2", className)}
        style={{
          maxWidth: position.width,
          marginBottom: position.scale > 100 ? `${Math.round(((position.scale - 100) / 100) * 44)}px` : undefined,
        }}
      >
        <div
          className="w-full flex justify-center"
          style={{
            transform: position.scale !== 100 ? `scale(${position.scale / 100})` : undefined,
            transformOrigin: "center top",
          }}
        >
          {children}
        </div>
      </div>
    );
  }

  // Absolute custom positioning or edit mode
  const stylePos: React.CSSProperties = isCustom
    ? {
        position: "fixed",
        left: `${finalLeft}px`,
        top: `${finalTop}px`,
        width: `${currentWidth}px`,
        maxWidth: "calc(100vw - 24px)",
        zIndex: editing ? (selected ? 35 : 25) : 20,
      }
    : {
        position: "relative",
        margin: "0 auto",
        width: `${currentWidth}px`,
        maxWidth: "calc(100vw - 24px)",
        zIndex: editing ? (selected ? 35 : 25) : "auto",
      };

  return (
    <div
      data-widget-id={id}
      style={stylePos}
      onPointerDown={(e) => {
        if (editing) {
          e.stopPropagation();
          startDrag(e, "move");
        }
      }}
      className={cn(
        "transition-[outline-color] select-none mx-auto relative group/movable",
        editing && "cursor-grab active:cursor-grabbing",
        editing && selected && "ring-2 ring-[var(--primary)] ring-offset-4 ring-offset-[var(--bg)] rounded-3xl",
        editing && !selected && "hover:outline hover:outline-1 hover:outline-dashed hover:outline-[var(--fg)]/40 rounded-3xl",
        !position.visible && editing && "opacity-40 grayscale",
        className
      )}
    >
      {/* Floating Toolbar when selected in edit mode */}
      {editing && selected && (
        <div
          className="absolute -top-12 left-1/2 -translate-x-1/2 flex items-center gap-1.5 rounded-full bg-[var(--surface)] px-3 py-1 shadow-xl ring-1 ring-[var(--line)] z-50 pointer-events-auto"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <span className="text-xs font-semibold px-1 text-[var(--muted)]">{title}</span>
          {isCustom && (
            <button
              type="button"
              onClick={onResetCenter}
              title="Reset to center / По центру"
              className="flex items-center gap-1 rounded-full bg-[var(--surface-container-high)] px-2.5 py-1 text-xs hover:bg-[var(--surface-container-highest)] transition"
            >
              <RotateCcw size={12} />
              <span>Center</span>
            </button>
          )}
          {onRemove && (
            <button
              type="button"
              onClick={onRemove}
              title="Remove / Скрыть"
              className="flex items-center gap-1 rounded-full bg-red-500/15 text-red-400 px-2.5 py-1 text-xs hover:bg-red-500/25 transition"
            >
              <Trash2 size={12} />
              <span>Remove</span>
            </button>
          )}
        </div>
      )}

      {/* Main children with scaling */}
      <div
        className={cn(editing && "pointer-events-none")}
        style={{
          transform: currentScale !== 100 ? `scale(${currentScale / 100})` : undefined,
          transformOrigin: "center center",
        }}
      >
        {children}
      </div>

      {/* Modern Lockscreen/Homescreen Customization Frame (Corner Brackets & 8-Directional Handles) */}
      {editing && selected && (
        <>
          {/* L-shaped corner visual brackets */}
          <div className="pointer-events-none absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-[var(--primary)] rounded-tl-lg" />
          <div className="pointer-events-none absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-[var(--primary)] rounded-tr-lg" />
          <div className="pointer-events-none absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-[var(--primary)] rounded-bl-lg" />
          <div className="pointer-events-none absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-[var(--primary)] rounded-br-lg" />

          {/* 4 Corner Drag Handles */}
          <span
            className="absolute -top-2.5 -left-2.5 h-5 w-5 rounded-full border-2 border-[var(--surface)] bg-[var(--primary)] shadow-md cursor-nwse-resize pointer-events-auto transition hover:scale-125 z-40"
            onPointerDown={(e) => startDrag(e, "nw")}
            title="Expand / Shrink NW"
            aria-hidden="true"
          />
          <span
            className="absolute -top-2.5 -right-2.5 h-5 w-5 rounded-full border-2 border-[var(--surface)] bg-[var(--primary)] shadow-md cursor-nesw-resize pointer-events-auto transition hover:scale-125 z-40"
            onPointerDown={(e) => startDrag(e, "ne")}
            title="Expand / Shrink NE"
            aria-hidden="true"
          />
          <span
            className="absolute -bottom-2.5 -right-2.5 h-5 w-5 rounded-full border-2 border-[var(--surface)] bg-[var(--primary)] shadow-md cursor-nwse-resize pointer-events-auto transition hover:scale-125 z-40"
            onPointerDown={(e) => startDrag(e, "se")}
            title="Expand / Shrink SE"
            aria-hidden="true"
          />
          <span
            className="absolute -bottom-2.5 -left-2.5 h-5 w-5 rounded-full border-2 border-[var(--surface)] bg-[var(--primary)] shadow-md cursor-nesw-resize pointer-events-auto transition hover:scale-125 z-40"
            onPointerDown={(e) => startDrag(e, "sw")}
            title="Expand / Shrink SW"
            aria-hidden="true"
          />

          {/* 4 Edge Drag Pill Handles */}
          <span
            className="absolute -top-2 left-1/2 -translate-x-1/2 h-3.5 w-8 rounded-full border border-[var(--surface)] bg-[var(--primary)] shadow-md cursor-ns-resize pointer-events-auto transition hover:scale-110 z-40"
            onPointerDown={(e) => startDrag(e, "n")}
            title="Expand / Shrink Top"
            aria-hidden="true"
          />
          <span
            className="absolute -bottom-2 left-1/2 -translate-x-1/2 h-3.5 w-8 rounded-full border border-[var(--surface)] bg-[var(--primary)] shadow-md cursor-ns-resize pointer-events-auto transition hover:scale-110 z-40"
            onPointerDown={(e) => startDrag(e, "s")}
            title="Expand / Shrink Bottom"
            aria-hidden="true"
          />
          <span
            className="absolute top-1/2 -left-2 -translate-y-1/2 h-8 w-3.5 rounded-full border border-[var(--surface)] bg-[var(--primary)] shadow-md cursor-ew-resize pointer-events-auto transition hover:scale-110 z-40"
            onPointerDown={(e) => startDrag(e, "w")}
            title="Expand / Shrink Left"
            aria-hidden="true"
          />
          <span
            className="absolute top-1/2 -right-2 -translate-y-1/2 h-8 w-3.5 rounded-full border border-[var(--surface)] bg-[var(--primary)] shadow-md cursor-ew-resize pointer-events-auto transition hover:scale-110 z-40"
            onPointerDown={(e) => startDrag(e, "e")}
            title="Expand / Shrink Right"
            aria-hidden="true"
          />
        </>
      )}
    </div>
  );
}
