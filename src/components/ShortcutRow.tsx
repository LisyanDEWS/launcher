import { Plus, X } from "lucide-react";
import { useLayoutEffect, useRef, useState } from "react";
import { BookmarkIcon } from "./BookmarkIcon";
import type { Bookmark, BookmarkShape } from "../lib/settings";
import { cn } from "../utils/cn";

/**
 * How many shortcuts fit under the search bar without ever getting wider than it.
 * Tiles have a fixed width (icon + room for the label), so the per-row count follows the real
 * width of the bar; the total is that times the number of rows the user allows.
 */
export function shortcutCapacity(width: number, iconSize: number, rows: number, phone: boolean) {
  const icon = phone ? Math.min(iconSize, 52) : iconSize;
  const gap = phone ? 4 : 6;
  const tile = icon + (phone ? 22 : 36);
  const perRow = Math.max(1, Math.min(10, Math.floor((Math.max(0, width) + gap) / (tile + gap))));
  return { icon, gap, tile, perRow, rows, limit: perRow * Math.max(1, rows) };
}

type Props = {
  bookmarks: Bookmark[];
  /** The search bar's width — the row never gets wider. */
  width: number;
  iconSize: number;
  rows: number;
  showLabels: boolean;
  addTile: boolean;
  shape: BookmarkShape;
  hasWallpaper: boolean;
  surfaceClass: string;
  addLabel: string;
  removeLabel: (title: string) => string;
  onAdd: () => void;
  onRemove: (id: string) => void;
};

/** Round shortcuts under the search bar with a "+" tile while there is room for one more. */
export default function ShortcutRow({ bookmarks, width, iconSize, rows, showLabels, addTile, shape, hasWallpaper, surfaceClass, addLabel, removeLabel, onAdd, onRemove }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const [available, setAvailable] = useState(width);
  const [phone, setPhone] = useState(() => typeof window !== "undefined" && window.innerWidth < 640);

  useLayoutEffect(() => {
    const node = box.current;
    if (!node) return;
    const measure = () => {
      setAvailable(node.clientWidth || width);
      setPhone(window.innerWidth < 640);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [width]);

  const cap = shortcutCapacity(available, iconSize, rows, phone);
  const shown = bookmarks.slice(0, cap.limit);
  const plus = addTile && bookmarks.length < cap.limit;
  const labelClass = cn("w-full truncate text-center text-xs", hasWallpaper ? "wp-text text-[var(--fg)]" : "text-[var(--muted)]");

  return (
    <div ref={box} className="w-full" style={{ maxWidth: width }} data-shortcut-capacity={cap.limit} data-shortcut-per-row={cap.perRow}>
      <div className="sr-grid" style={{ maxWidth: cap.perRow * cap.tile + (cap.perRow - 1) * cap.gap, columnGap: cap.gap, rowGap: phone ? 8 : 10 }}>
        {shown.map((bookmark, index) => (
          <div key={bookmark.id} data-bookmark-id={bookmark.id} className="sr-tile group relative" style={{ width: cap.tile, animationDelay: `${index * 22}ms` }}>
            <a href={bookmark.url} className="flex min-w-0 flex-col items-center gap-1.5 rounded-[22px] py-1.5 transition hover:bg-[var(--glass)]">
              <BookmarkIcon bookmark={bookmark} size={cap.icon} fallbackShape={shape} className={cn("transition-all duration-300 group-hover:scale-105", surfaceClass)} />
              {showLabels && (
                <span dir="auto" className={labelClass}>
                  {bookmark.title}
                </span>
              )}
            </a>
            <button
              type="button"
              onClick={() => onRemove(bookmark.id)}
              title={removeLabel(bookmark.title)}
              aria-label={removeLabel(bookmark.title)}
              className="absolute end-1 top-0 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--surface-container-highest)] opacity-0 transition focus-visible:opacity-100 group-hover:opacity-100"
            >
              <X size={13} aria-hidden="true" />
            </button>
          </div>
        ))}
        {plus && (
          <button type="button" onClick={onAdd} className="sr-tile sr-add group flex flex-col items-center gap-1.5 rounded-[22px] py-1.5 transition hover:bg-[var(--glass)]" style={{ width: cap.tile, animationDelay: `${shown.length * 22}ms` }} aria-label={addLabel} title={addLabel}>
            <span
              className={cn(
                "flex items-center justify-center rounded-full border border-dashed border-[var(--muted)]/50 text-[var(--muted)] transition-all duration-300 group-hover:scale-105 group-hover:rounded-[30%] group-hover:border-[var(--primary)] group-hover:text-[var(--primary)]",
                hasWallpaper && "bg-[var(--glass)] backdrop-blur-xl",
              )}
              style={{ width: cap.icon, height: cap.icon }}
            >
              <Plus size={Math.round(cap.icon * 0.42)} aria-hidden="true" />
            </span>
            {showLabels && <span className={labelClass}>{addLabel}</span>}
          </button>
        )}
      </div>
    </div>
  );
}
