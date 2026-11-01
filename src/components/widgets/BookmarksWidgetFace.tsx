import { useState, useEffect } from "react";
import { Plus, Globe, Folder } from "lucide-react";
import { BOOKMARKS_KEY, readBookmarks, type Bookmark, type BookmarksWidget, getHost } from "../../lib/settings";
import { BookmarkIcon } from "../BookmarkIcon";
import { cn } from "../../utils/cn";
import { useI18n } from "../../lib/i18n";

type Props = {
  widget: BookmarksWidget;
  width: number;
  faceHeight: number;
};

export default function BookmarksWidgetFace({ widget }: Props) {
  const { lang } = useI18n();
  const isRu = lang === "ru";
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);

  useEffect(() => {
    setBookmarks(readBookmarks());
    const onStorage = (e: StorageEvent) => {
      if (e.key === BOOKMARKS_KEY) {
        setBookmarks(readBookmarks());
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const layout = widget.layout || "2x2";
  const title = widget.title || (isRu ? "Закладки" : "Bookmarks");
  const isScrollable = widget.scrollable === true;
  const iconSize = widget.iconSize || 40;
  const showLabels = widget.showLabels !== false;

  // Max items based on layout when not in scrollable mode
  const maxItems = layout === "1x1" ? 4 : layout === "2x1" ? 3 : layout === "2x2" ? 4 : layout === "4x1" ? 6 : 8;
  const items = isScrollable ? bookmarks : bookmarks.slice(0, maxItems);

  const handleOpenAddDialog = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    window.dispatchEvent(new CustomEvent("open-add-bookmark-dialog"));
  };

  return (
    <div
      data-widget-id={widget.id}
      className="relative flex h-full w-full flex-col justify-between overflow-hidden rounded-[28px] border border-[var(--line)] bg-[var(--surface-container-high)] text-[var(--fg)] p-3.5 select-none shadow-sm transition-all duration-300"
    >
      {/* Header with Folder Title and the ONLY '+' Add Bookmark Button in the Corner */}
      <div className="flex items-center justify-between pb-1.5 text-xs font-semibold border-b border-[var(--line)]/50">
        <div className="flex items-center gap-1.5 min-w-0">
          <Folder size={14} className="text-[var(--primary)] shrink-0" />
          <span className="truncate tracking-tight font-medium opacity-90">{title}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleOpenAddDialog}
            title={isRu ? "Добавить закладку" : "Add bookmark"}
            aria-label={isRu ? "Добавить закладку" : "Add bookmark"}
            className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--primary)] text-[var(--on-primary)] hover:opacity-90 active:scale-95 transition shadow-xs"
          >
            <Plus size={13} strokeWidth={2.5} />
          </button>
          <span className="shrink-0 text-[10px] font-semibold opacity-60 px-1.5 py-0.5 rounded-full bg-[var(--surface-container-highest)]">
            {bookmarks.length}
          </span>
        </div>
      </div>

      {/* Bookmarks Content (No extra duplicate add buttons inside) */}
      {bookmarks.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center text-center p-3 opacity-75">
          <Globe size={26} className="mb-2 opacity-40 text-[var(--primary)]" />
          <p className="text-[11px] font-medium leading-tight mb-1">
            {isRu ? "Нет сохранённых закладок" : "No bookmarks saved"}
          </p>
          <p className="text-[10px] opacity-60 leading-tight">
            {isRu ? "Нажмите + в углу для добавления" : "Tap + in the corner to add"}
          </p>
        </div>
      ) : isScrollable ? (
        /* Horizontal Scrollable Carousel Row ("Мотать закладки") */
        <div className="flex flex-1 items-center gap-2 overflow-x-auto py-2 px-1 scrollbar-none snap-x">
          {items.map((b) => (
            <a
              key={b.id}
              data-bookmark-id={b.id}
              href={b.url}
              target="_blank"
              rel="noreferrer"
              title={b.title}
              className="group flex flex-col items-center justify-center rounded-2xl p-2 bg-[var(--surface-container-highest)] hover:bg-[var(--primary)]/15 hover:scale-105 transition-all duration-200 shrink-0 snap-start"
              style={{ width: `${Math.max(64, iconSize + 24)}px` }}
            >
              <BookmarkIcon bookmark={b} size={iconSize} fallbackShape="squircle" />
              {showLabels && (
                <span className="w-full truncate text-[10px] font-medium leading-tight opacity-90 text-center mt-1.5">
                  {b.title}
                </span>
              )}
            </a>
          ))}
        </div>
      ) : layout === "1x1" ? (
        /* 1x1 Compact Folder: 2x2 mini grid */
        <div className="grid flex-1 grid-cols-2 grid-rows-2 gap-1.5 p-1">
          {items.map((b) => (
            <a
              key={b.id}
              data-bookmark-id={b.id}
              href={b.url}
              target="_blank"
              rel="noreferrer"
              title={b.title}
              className="group flex flex-col items-center justify-center rounded-2xl p-1 bg-[var(--surface-container-highest)] hover:bg-[var(--primary)]/15 hover:scale-105 transition-all duration-200"
            >
              <BookmarkIcon bookmark={b} size={Math.min(32, iconSize)} fallbackShape="squircle" />
            </a>
          ))}
        </div>
      ) : layout === "2x1" ? (
        /* 2x1 Wide Banner: 3 items in a row with titles */
        <div className="grid flex-1 grid-cols-3 gap-2 py-1 items-center">
          {items.map((b) => (
            <a
              key={b.id}
              data-bookmark-id={b.id}
              href={b.url}
              target="_blank"
              rel="noreferrer"
              title={b.title}
              className="group flex flex-col items-center justify-center rounded-2xl p-2 text-center bg-[var(--surface-container-highest)] hover:bg-[var(--primary)]/15 hover:scale-105 transition-all duration-200 min-w-0 h-full"
            >
              <div className="mb-1 shrink-0">
                <BookmarkIcon bookmark={b} size={iconSize} fallbackShape="squircle" />
              </div>
              {showLabels && (
                <span className="w-full truncate text-[10px] font-medium leading-tight opacity-90">
                  {b.title}
                </span>
              )}
            </a>
          ))}
        </div>
      ) : layout === "4x1" ? (
        /* 4x1 Horizontal Pill Bar: 6 items in a line */
        <div className="flex flex-1 items-center justify-around gap-1.5 py-1">
          {items.map((b) => (
            <a
              key={b.id}
              data-bookmark-id={b.id}
              href={b.url}
              target="_blank"
              rel="noreferrer"
              title={b.title}
              className="group flex flex-1 flex-col items-center justify-center rounded-2xl p-1.5 text-center bg-[var(--surface-container-highest)] hover:bg-[var(--primary)]/15 hover:scale-105 transition-all duration-200 min-w-0 h-full"
            >
              <div className="mb-1 shrink-0">
                <BookmarkIcon bookmark={b} size={Math.min(36, iconSize)} fallbackShape="squircle" />
              </div>
              {showLabels && (
                <span className="w-full truncate text-[9px] font-medium opacity-80">
                  {b.title}
                </span>
              )}
            </a>
          ))}
        </div>
      ) : layout === "4x2" ? (
        /* 4x2 Large Bento Grid: 2 rows of 4 items */
        <div className="grid flex-1 grid-cols-4 grid-rows-2 gap-2 py-1">
          {items.map((b) => (
            <a
              key={b.id}
              data-bookmark-id={b.id}
              href={b.url}
              target="_blank"
              rel="noreferrer"
              title={b.title}
              className="group flex flex-col items-center justify-center rounded-2xl p-1.5 text-center bg-[var(--surface-container-highest)] hover:bg-[var(--primary)]/15 hover:scale-105 transition-all duration-200 min-w-0"
            >
              <div className="mb-1 shrink-0">
                <BookmarkIcon bookmark={b} size={Math.min(36, iconSize)} fallbackShape="squircle" />
              </div>
              {showLabels && (
                <span className="w-full truncate text-[10px] font-medium opacity-90">
                  {b.title}
                </span>
              )}
            </a>
          ))}
        </div>
      ) : (
        /* 2x2 Standard Bento Square: 4 items with favicons & domain labels */
        <div className="grid flex-1 grid-cols-2 grid-rows-2 gap-2 py-1">
          {items.map((b) => (
            <a
              key={b.id}
              data-bookmark-id={b.id}
              href={b.url}
              target="_blank"
              rel="noreferrer"
              title={b.title}
              className="group flex items-center gap-2 rounded-2xl p-2 bg-[var(--surface-container-highest)] hover:bg-[var(--primary)]/15 hover:scale-102 transition-all duration-200 min-w-0"
            >
              <BookmarkIcon bookmark={b} size={iconSize} fallbackShape="squircle" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[11px] font-semibold leading-tight">{b.title}</p>
                {showLabels && <p className="truncate text-[9px] opacity-60 leading-tight">{getHost(b.url)}</p>}
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
