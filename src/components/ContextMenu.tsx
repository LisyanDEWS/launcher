import { useEffect, useRef } from "react";
import {
  Copy,
  Edit3,
  ExternalLink,
  Image as ImageIcon,
  LayoutGrid,
  Plus,
  Settings as SettingsIcon,
  Sliders,
  Trash2,
} from "lucide-react";
import { useI18n } from "../lib/i18n";
import { cn } from "../utils/cn";

export type ContextMenuData = {
  x: number;
  y: number;
  type: "widget" | "bookmark" | "background";
  targetId?: string;
  targetTitle?: string;
  targetUrl?: string;
};

type Props = {
  menu: ContextMenuData;
  onClose: () => void;
  onAddBookmark: () => void;
  onAddWidget: () => void;
  onChangeWallpaper: () => void;
  onManageWidget?: (widgetId: string) => void;
  onDuplicateWidget?: (widgetId: string) => void;
  onRemoveWidget?: (widgetId: string) => void;
  onEditBookmark?: (bookmarkId: string) => void;
  onCopyBookmark?: (url: string) => void;
  onOpenBookmark?: (url: string) => void;
  onRemoveBookmark?: (bookmarkId: string) => void;
  onEditHomeScreen?: () => void;
  onOpenSettings?: () => void;
};

export default function ContextMenu({
  menu,
  onClose,
  onAddBookmark,
  onAddWidget,
  onChangeWallpaper,
  onManageWidget,
  onDuplicateWidget,
  onRemoveWidget,
  onEditBookmark,
  onCopyBookmark,
  onOpenBookmark,
  onRemoveBookmark,
  onEditHomeScreen,
  onOpenSettings,
}: Props) {
  const { lang } = useI18n();
  const isRu = lang === "ru";
  const ref = useRef<HTMLDivElement>(null);

  // Close when clicking outside or pressing Escape
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("pointerdown", handleClick);
    window.addEventListener("keydown", handleKey);
    return () => {
      window.removeEventListener("pointerdown", handleClick);
      window.removeEventListener("keydown", handleKey);
    };
  }, [onClose]);

  // Adjust menu coordinates so it never flows outside the viewport
  const menuWidth = 230;
  const menuHeight = 280;
  const clampedX = Math.max(12, Math.min(window.innerWidth - menuWidth - 12, menu.x));
  const clampedY = Math.max(12, Math.min(window.innerHeight - menuHeight - 12, menu.y));

  const action = (fn?: () => void) => () => {
    onClose();
    fn?.();
  };

  const itemClass =
    "flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-[var(--fg)] hover:bg-[var(--surface-container-highest)] hover:text-[var(--primary)] transition-all select-none";

  return (
    <div
      ref={ref}
      style={{ left: `${clampedX}px`, top: `${clampedY}px` }}
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.preventDefault()}
      className="fixed z-[120] min-w-[210px] rounded-2xl border border-[var(--line)] bg-[var(--surface)]/95 p-1.5 shadow-[0_16px_48px_rgba(0,0,0,0.32)] backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-150 ease-[var(--ui-ease,cubic-bezier(0.16,1,0.3,1))]"
    >
      {/* Widget Target Context Menu */}
      {menu.type === "widget" && menu.targetId && (
        <div className="space-y-0.5">
          <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
            {menu.targetTitle || (isRu ? "Виджет" : "Widget")}
          </div>
          {onManageWidget && (
            <button
              type="button"
              onClick={action(() => onManageWidget(menu.targetId!))}
              className={itemClass}
            >
              <Sliders size={15} />
              <span>{isRu ? "Настроить виджет" : "Manage / Edit Widget"}</span>
            </button>
          )}
          {onDuplicateWidget && (
            <button
              type="button"
              onClick={action(() => onDuplicateWidget(menu.targetId!))}
              className={itemClass}
            >
              <Copy size={15} />
              <span>{isRu ? "Дублировать" : "Duplicate Widget"}</span>
            </button>
          )}
          {onRemoveWidget && (
            <button
              type="button"
              onClick={action(() => onRemoveWidget(menu.targetId!))}
              className={cn(itemClass, "text-red-400 hover:text-red-300 hover:bg-red-500/10")}
            >
              <Trash2 size={15} />
              <span>{isRu ? "Удалить виджет" : "Remove Widget"}</span>
            </button>
          )}
          <div className="my-1 border-t border-[var(--line)]" />
        </div>
      )}

      {/* Bookmark Target Context Menu */}
      {menu.type === "bookmark" && menu.targetId && (
        <div className="space-y-0.5">
          <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)] truncate">
            {menu.targetTitle || (isRu ? "Закладка" : "Bookmark")}
          </div>
          {onEditBookmark && (
            <button
              type="button"
              onClick={action(() => onEditBookmark(menu.targetId!))}
              className={itemClass}
            >
              <Edit3 size={15} />
              <span>{isRu ? "Редактировать закладку" : "Edit Bookmark"}</span>
            </button>
          )}
          {menu.targetUrl && onCopyBookmark && (
            <button
              type="button"
              onClick={action(() => onCopyBookmark(menu.targetUrl!))}
              className={itemClass}
            >
              <Copy size={15} />
              <span>{isRu ? "Копировать адрес" : "Copy Link"}</span>
            </button>
          )}
          {menu.targetUrl && onOpenBookmark && (
            <button
              type="button"
              onClick={action(() => onOpenBookmark(menu.targetUrl!))}
              className={itemClass}
            >
              <ExternalLink size={15} />
              <span>{isRu ? "Открыть в новой вкладке" : "Open in New Tab"}</span>
            </button>
          )}
          {onRemoveBookmark && (
            <button
              type="button"
              onClick={action(() => onRemoveBookmark(menu.targetId!))}
              className={cn(itemClass, "text-red-400 hover:text-red-300 hover:bg-red-500/10")}
            >
              <Trash2 size={15} />
              <span>{isRu ? "Удалить закладку" : "Remove Bookmark"}</span>
            </button>
          )}
          <div className="my-1 border-t border-[var(--line)]" />
        </div>
      )}

      {/* Standard Home Menu Actions */}
      <div className="space-y-0.5">
        <button type="button" onClick={action(onAddBookmark)} className={itemClass}>
          <Plus size={15} />
          <span>{isRu ? "Добавить закладку" : "Add Bookmark"}</span>
        </button>

        <button type="button" onClick={action(onAddWidget)} className={itemClass}>
          <LayoutGrid size={15} />
          <span>{isRu ? "Добавить виджет" : "Add Widget"}</span>
        </button>

        <button type="button" onClick={action(onChangeWallpaper)} className={itemClass}>
          <ImageIcon size={15} />
          <span>{isRu ? "Сменить обои" : "Change Wallpaper"}</span>
        </button>
      </div>

      {menu.type === "background" && (
        <>
          <div className="my-1 border-t border-[var(--line)]" />
          <div className="space-y-0.5">
            {onEditHomeScreen && (
              <button type="button" onClick={action(onEditHomeScreen)} className={itemClass}>
                <Sliders size={15} />
                <span>{isRu ? "Настроить рабочий стол" : "Edit Home Screen"}</span>
              </button>
            )}
            {onOpenSettings && (
              <button type="button" onClick={action(onOpenSettings)} className={itemClass}>
                <SettingsIcon size={15} />
                <span>{isRu ? "Настройки" : "Settings"}</span>
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
