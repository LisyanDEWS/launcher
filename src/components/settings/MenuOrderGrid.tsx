import { ArrowLeft, ArrowRight, GripVertical, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from "react";
import AppIcon from "../AppIcon";
import { useI18n } from "../../lib/i18n";
import { moveItem, slotAt, type SlotRect } from "../../lib/menu-order";
import type { MenuItem } from "../../lib/apps";
import type { MenuIconStyle, MenuShape } from "../../lib/settings";
import { cn } from "../../utils/cn";

type Props = {
  items: MenuItem[];
  columns: number;
  iconSize: number;
  iconStyle: MenuIconStyle;
  shape: MenuShape;
  onReorder: (ids: string[]) => void;
  onRemove: (id: string) => void;
};

const MOUSE_SLOP = 5;
const TOUCH_SLOP = 10;
const LONG_PRESS = 260;

/**
 * The menu as it will look, but rearrangeable: drag a tile (long-press on touch), or tap one and use
 * the arrows underneath. Shift+Arrow moves the focused tile from the keyboard.
 */
export default function MenuOrderGrid({ items, columns, iconSize, iconStyle, shape, onReorder, onRemove }: Props) {
  const { lang } = useI18n();
  const ru = lang.startsWith("ru");
  const L = (en: string, rus: string) => (ru ? rus : en);
  const grid = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [preview, setPreview] = useState<string[] | null>(null);
  const [drag, setDrag] = useState<{ id: string; x: number; y: number } | null>(null);
  const previewRef = useRef<string[] | null>(null);
  const justDragged = useRef(false);

  const byId = new Map(items.map((item) => [item.id, item]));
  const ids = items.map((item) => item.id);
  const order = (preview ?? ids).filter((id) => byId.has(id));
  const selectedIndex = selected ? order.indexOf(selected) : -1;

  // The selected tile can disappear (removed, or the list changed underneath).
  useEffect(() => {
    if (selected && !byId.has(selected)) setSelected(null);
  });

  const move = (id: string, delta: number) => {
    const from = ids.indexOf(id);
    if (from < 0) return;
    const next = moveItem(ids, from, from + delta);
    if (next.some((value, index) => value !== ids[index])) onReorder(next);
  };

  const startPress = (event: ReactPointerEvent<HTMLElement>, id: string) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    const touch = event.pointerType === "touch";
    const startX = event.clientX;
    const startY = event.clientY;
    const base = ids.slice();
    let started = false;
    let rects: SlotRect[] = [];
    let timer = 0;

    const blockScroll = (e: TouchEvent) => e.cancelable && e.preventDefault();

    const begin = () => {
      started = true;
      rects = Array.from(grid.current?.querySelectorAll<HTMLElement>("[data-slot]") ?? []).map((el) => {
        const r = el.getBoundingClientRect();
        return { left: r.left, top: r.top, width: r.width, height: r.height };
      });
      previewRef.current = base;
      setPreview(base);
      setDrag({ id, x: startX, y: startY });
      setSelected(id);
      window.addEventListener("touchmove", blockScroll, { passive: false });
    };

    const cleanup = () => {
      window.clearTimeout(timer);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
      window.removeEventListener("touchmove", blockScroll);
    };

    const onMove = (e: PointerEvent) => {
      if (!started) {
        if (Math.hypot(e.clientX - startX, e.clientY - startY) < (touch ? TOUCH_SLOP : MOUSE_SLOP)) return;
        if (touch) {
          cleanup(); // the finger moved before the long-press fired: it's a scroll, not a drag
          return;
        }
        begin();
      }
      const target = slotAt(rects, e.clientX, e.clientY);
      const next = target < 0 ? base : moveItem(base, base.indexOf(id), target);
      previewRef.current = next;
      setPreview(next);
      setDrag({ id, x: e.clientX, y: e.clientY });
    };

    const finish = (commit: boolean) => {
      const wasDragging = started;
      const result = previewRef.current;
      cleanup();
      if (!wasDragging) return;
      justDragged.current = true;
      window.setTimeout(() => (justDragged.current = false), 0);
      setDrag(null);
      setPreview(null);
      previewRef.current = null;
      if (commit && result && result.some((value, index) => value !== base[index])) onReorder(result);
    };
    const onUp = () => finish(true);
    const onCancel = () => finish(false);

    if (touch) timer = window.setTimeout(begin, LONG_PRESS);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);
  };

  const onKey = (event: ReactKeyboardEvent<HTMLButtonElement>, id: string) => {
    const dir = event.key === "ArrowLeft" ? -1 : event.key === "ArrowRight" ? 1 : 0;
    if (!dir) return;
    const rtl = getComputedStyle(event.currentTarget).direction === "rtl";
    const step = rtl ? -dir : dir;
    if (event.shiftKey) {
      event.preventDefault();
      move(id, step);
      // keep focus on the same app after React re-renders in the new position
      requestAnimationFrame(() => grid.current?.querySelector<HTMLElement>(`[data-id="${(typeof CSS !== "undefined" && CSS.escape ? CSS.escape(id) : id)}"]`)?.focus());
    }
  };

  if (!order.length) return null;
  const ghost = drag ? byId.get(drag.id) : null;
  const selectedItem = selected ? byId.get(selected) : null;

  return (
    <div className="space-y-2">
      <div ref={grid} className="ap-order" style={{ "--ap-cols": columns } as CSSProperties} role="list" aria-label={L("Menu order", "Порядок в меню")}>
        {order.map((id, index) => {
          const item = byId.get(id)!;
          const dragging = drag?.id === id;
          return (
            <div key={id} role="listitem" data-slot className="ap-order-slot">
              <button
                type="button"
                data-id={id}
                className={cn("ap-order-tile", selected === id && "is-selected", dragging && "is-dragging")}
                aria-pressed={selected === id}
                aria-label={`${item.name}, ${index + 1} ${L("of", "из")} ${order.length}`}
                onPointerDown={(e) => startPress(e, id)}
                onClick={() => {
                  if (justDragged.current) return;
                  setSelected((current) => (current === id ? null : id));
                }}
                onKeyDown={(e) => onKey(e, id)}
              >
                <AppIcon app={item.app} tool={item.tool} size={Math.min(iconSize, 44)} iconStyle={iconStyle} shape={shape} />
                <span className="ap-order-name">{item.name}</span>
              </button>
            </div>
          );
        })}
      </div>

      {ghost && drag && (
        <div className="ap-ghost" style={{ left: drag.x, top: drag.y }} aria-hidden="true">
          <AppIcon app={ghost.app} tool={ghost.tool} size={Math.min(iconSize, 44)} iconStyle={iconStyle} shape={shape} />
        </div>
      )}

      <div className="ap-order-bar" aria-live="polite">
        {selectedItem ? (
          <>
            <span className="ap-order-pos">
              <GripVertical size={14} aria-hidden="true" />
              <b className="truncate">{selectedItem.name}</b>
              <span className="tabular-nums opacity-70">
                {selectedIndex + 1}/{order.length}
              </span>
            </span>
            <button type="button" className="ap-order-btn" disabled={selectedIndex <= 0} onClick={() => move(selectedItem.id, -1)} aria-label={L("Move earlier", "Сдвинуть раньше")} title={L("Move earlier", "Сдвинуть раньше")}>
              <ArrowLeft size={15} className="rtl:rotate-180" aria-hidden="true" />
            </button>
            <button type="button" className="ap-order-btn" disabled={selectedIndex >= order.length - 1} onClick={() => move(selectedItem.id, 1)} aria-label={L("Move later", "Сдвинуть позже")} title={L("Move later", "Сдвинуть позже")}>
              <ArrowRight size={15} className="rtl:rotate-180" aria-hidden="true" />
            </button>
            <button
              type="button"
              className="ap-order-btn ap-order-btn--danger"
              onClick={() => {
                onRemove(selectedItem.id);
                setSelected(null);
              }}
              aria-label={L("Remove from menu", "Убрать из меню")}
              title={L("Remove from menu", "Убрать из меню")}
            >
              <X size={15} aria-hidden="true" />
            </button>
          </>
        ) : (
          <span className="ap-order-hint">{L("Drag to reorder, or tap an app for arrows.", "Перетащите, чтобы изменить порядок, или нажмите на приложение.")}</span>
        )}
      </div>
    </div>
  );
}
