import { useEffect, useState } from "react";
import type { CSSProperties, MouseEvent } from "react";
import { Folder, Plus } from "lucide-react";
import { BookmarkIcon } from "../BookmarkIcon";
import { C } from "./faces/parts";
import { useI18n } from "../../lib/i18n";
import { BOOKMARKS_KEY, STORAGE_EVENT, readBookmarks, type Bookmark, type BookmarksLayout, type BookmarksWidget } from "../../lib/settings";

type Props = {
  widget: BookmarksWidget;
  width: number;
  faceHeight: number;
};

/** Columns × rows of tiles for every folder size. */
const GRID: Record<BookmarksLayout, [number, number]> = {
  "1x1": [2, 2],
  "2x1": [4, 1],
  "2x2": [3, 2],
  "4x1": [7, 1],
  "4x2": [6, 2],
};

/** Live list of bookmarks — updates from this tab and from other tabs. */
function useBookmarks() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>(readBookmarks);
  useEffect(() => {
    const refresh = () => setBookmarks(readBookmarks());
    const onStorage = (e: StorageEvent) => e.key === BOOKMARKS_KEY && refresh();
    const onLocal = (e: Event) => (e as CustomEvent<{ key: string }>).detail?.key === BOOKMARKS_KEY && refresh();
    window.addEventListener("storage", onStorage);
    window.addEventListener(STORAGE_EVENT, onLocal);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(STORAGE_EVENT, onLocal);
    };
  }, []);
  return bookmarks;
}

const openAddDialog = (event: MouseEvent) => {
  event.preventDefault();
  event.stopPropagation();
  window.dispatchEvent(new CustomEvent("open-add-bookmark-dialog"));
};

/** Material You bookmarks folder: tonal card, accent folder header and adaptive icon tiles. */
export default function BookmarksWidgetFace({ widget, width, faceHeight }: Props) {
  const { t, lang } = useI18n();
  const ru = lang.startsWith("ru");
  const bookmarks = useBookmarks();

  const layout = widget.layout || "2x2";
  const [cols, rows] = GRID[layout] ?? GRID["2x2"];
  const scroll = widget.scrollable === true;
  const title = widget.title || t("wf.f.bookmarks");

  // Geometry derived from the real widget size so icons never clip.
  const minSide = Math.min(width, faceHeight);
  const pad = Math.round(Math.max(8, Math.min(16, minSide * 0.065)));
  const gap = Math.round(pad * 0.55);
  const headerH = Math.round(Math.max(24, Math.min(38, faceHeight * (rows === 1 ? 0.3 : 0.17))));
  const cellW = (width - pad * 2 - gap * (cols - 1)) / cols;
  const cellH = (faceHeight - pad * 2 - headerH - gap - gap * (rows - 1)) / rows;
  const wantsLabels = widget.showLabels !== false;
  const labelH = wantsLabels && cellH >= 50 && cellW >= 44 ? Math.round(Math.min(14, cellH * 0.2)) : 0;
  const scale = Math.max(0.7, Math.min(1.35, (widget.iconSize || 44) / 44));
  const iconSize = Math.max(16, Math.floor(Math.min(cellW * 0.66, (cellH - labelH) * 0.74, Math.min(cellW, cellH - labelH) - 6) * scale));

  const capacity = cols * rows;
  const overflow = !scroll && bookmarks.length > capacity;
  const shown = scroll ? bookmarks : overflow ? bookmarks.slice(0, capacity - 1) : bookmarks;
  const showAddTile = scroll || bookmarks.length < capacity;
  const placeholders = scroll ? 0 : Math.max(0, capacity - shown.length - (overflow ? 1 : 0) - (showAddTile ? 1 : 0));

  const gridStyle: CSSProperties = scroll
    ? { gridTemplateRows: `repeat(${rows}, ${cellH}px)`, gridAutoFlow: "column", gridAutoColumns: `${cellW}px`, gap }
    : { gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`, gap };

  const labelStyle: CSSProperties = { fontSize: Math.max(9, labelH - 3), lineHeight: `${labelH}px`, height: labelH };

  return (
    <div className="bm" style={{ background: C.container, color: C.onContainer, padding: pad, gap, borderRadius: Math.max(18, Math.min(32, minSide * 0.14)) }}>
      <div className="bm-head" style={{ height: headerH }}>
        <span className="bm-folder" style={{ background: C.accent, color: C.onAccent, width: headerH, height: headerH }}>
          <Folder style={{ width: "52%", height: "52%" }} strokeWidth={2.2} />
        </span>
        <span className="bm-title" style={{ fontSize: Math.max(11, headerH * 0.42) }}>
          {title}
        </span>
        <span className="bm-count" style={{ fontSize: Math.max(9, headerH * 0.32) }}>
          {bookmarks.length}
        </span>
        <button
          type="button"
          onClick={openAddDialog}
          onPointerDown={(e) => e.stopPropagation()}
          className="bm-add-btn"
          style={{ width: headerH, height: headerH }}
          title={t("bookmarks.add")}
          aria-label={t("bookmarks.add")}
        >
          <Plus style={{ width: "50%", height: "50%" }} strokeWidth={2.4} />
        </button>
      </div>

      {bookmarks.length === 0 ? (
        <button type="button" onClick={openAddDialog} onPointerDown={(e) => e.stopPropagation()} className="bm-empty">
          <span className="bm-empty-ico" style={{ background: C.accent, color: C.onAccent }}>
            <Plus strokeWidth={2.4} />
          </span>
          <span className="bm-empty-t">{ru ? "Добавьте первую закладку" : "Add your first bookmark"}</span>
        </button>
      ) : (
        <div className={scroll ? "bm-grid bm-grid--scroll" : "bm-grid"} style={gridStyle}>
          {shown.map((bookmark, index) => (
            <a
              key={bookmark.id}
              href={bookmark.url}
              title={bookmark.title}
              className="bm-tile"
              style={{ animationDelay: `${Math.min(index, 10) * 35}ms` }}
              draggable={false}
            >
              <BookmarkIcon bookmark={bookmark} size={iconSize} fallbackShape={bookmark.shape ?? "squircle"} className="bm-icon" />
              {labelH > 0 && (
                <span className="bm-label" style={labelStyle} dir="auto">
                  {bookmark.title}
                </span>
              )}
            </a>
          ))}

          {overflow && (
            <span className="bm-tile bm-more" title={`${bookmarks.length - shown.length}`}>
              <span className="bm-more-badge" style={{ width: iconSize, height: iconSize, background: C.accent, color: C.onAccent, fontSize: iconSize * 0.36 }}>
                +{bookmarks.length - shown.length}
              </span>
              {labelH > 0 && (
                <span className="bm-label" style={labelStyle}>
                  {ru ? "ещё" : "more"}
                </span>
              )}
            </span>
          )}

          {showAddTile && (
            <button type="button" onClick={openAddDialog} onPointerDown={(e) => e.stopPropagation()} className="bm-tile bm-add" title={t("bookmarks.add")}>
              <span className="bm-add-ico" style={{ width: iconSize, height: iconSize }}>
                <Plus style={{ width: "46%", height: "46%" }} strokeWidth={2.4} />
              </span>
              {labelH > 0 && (
                <span className="bm-label" style={labelStyle}>
                  {ru ? "Добавить" : "Add"}
                </span>
              )}
            </button>
          )}

          {Array.from({ length: placeholders }, (_, i) => (
            <span key={`p${i}`} className="bm-tile bm-placeholder" aria-hidden="true">
              <span style={{ width: iconSize * 0.5, height: iconSize * 0.5 }} />
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
