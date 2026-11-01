import { useState } from "react";
import { Globe } from "lucide-react";
import { getHost, type Bookmark, type BookmarkShape } from "../lib/settings";
import { cn } from "../utils/cn";

export function getBookmarkShapeClass(shape: BookmarkShape = "circle"): string {
  switch (shape) {
    case "squircle":
      return "rounded-[28%]";
    case "rounded":
      return "rounded-2xl";
    case "teardrop":
      return "rounded-t-full rounded-br-full rounded-bl-sm";
    case "pebble":
      return "rounded-[40%_60%_55%_45%_/_48%_52%_48%_52%]";
    case "flower":
      return "rounded-[32%_68%_38%_62%_/_62%_38%_62%_38%]";
    case "circle":
    default:
      return "rounded-full";
  }
}

export function BookmarkIcon({
  bookmark,
  size = 56,
  fallbackShape = "circle",
  className,
}: {
  bookmark: Bookmark;
  size?: number;
  fallbackShape?: BookmarkShape;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const shape = bookmark.shape || fallbackShape;
  const shapeClass = getBookmarkShapeClass(shape);
  const domain = getHost(bookmark.url);

  return (
    <div
      className={cn(
        "relative flex items-center justify-center overflow-hidden transition-all duration-300 ease-[var(--ui-ease,cubic-bezier(0.16,1,0.3,1))] select-none shrink-0 shadow-xs",
        shapeClass,
        className
      )}
      style={{ width: `${size}px`, height: `${size}px` }}
    >
      {bookmark.customIcon && !failed ? (
        <img
          src={bookmark.customIcon}
          alt={bookmark.title}
          onError={() => setFailed(true)}
          className="h-full w-full object-cover transition-transform duration-300 ease-[var(--ui-ease,cubic-bezier(0.16,1,0.3,1))] group-hover:scale-108"
          loading="lazy"
        />
      ) : domain && !failed ? (
        <img
          src={`https://www.google.com/s2/favicons?domain=${domain}&sz=128`}
          alt=""
          onError={() => setFailed(true)}
          className="h-3/5 w-3/5 object-contain transition-transform duration-300 ease-[var(--ui-ease,cubic-bezier(0.16,1,0.3,1))] group-hover:scale-110"
          loading="lazy"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-[var(--surface-container-highest)] text-[var(--muted)]">
          <Globe size={Math.round(size * 0.45)} />
        </div>
      )}
    </div>
  );
}
