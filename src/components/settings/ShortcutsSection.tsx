import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import BookmarkDialog from "../BookmarkDialog";
import { BookmarkIcon } from "../BookmarkIcon";
import { shortcutCapacity } from "../ShortcutRow";
import { CARD, Notice, Segmented, SettingsGroup, SliderRow, ToggleRow } from "../ui";
import { useSettingsCtx } from "./context";
import { useI18n } from "../../lib/i18n";
import type { ButtonsPosition } from "../../lib/settings";
import { cn } from "../../utils/cn";

/**
 * Settings → Search bar → shortcuts under the bar. The limit is derived from the bar's width
 * (on this screen) and the number of rows, so the row can never grow wider than the search bar.
 */
export default function ShortcutsSection() {
  const { settings, setSettings, bookmarks, removeBookmark, saveBookmark, setBookmarkOrder } = useSettingsCtx();
  const { lang } = useI18n();
  const ru = lang.startsWith("ru");
  const L = (en: string, rus: string) => (ru ? rus : en);
  const [adding, setAdding] = useState(false);
  const [screen, setScreen] = useState(() => (typeof window !== "undefined" ? window.innerWidth : 1280));

  useEffect(() => {
    const update = () => setScreen(window.innerWidth);
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const buttons = settings.launcherLayout.buttons;
  const patch = (next: Partial<ButtonsPosition>) => setSettings((s) => ({ ...s, launcherLayout: { ...s.launcherLayout, buttons: { ...s.launcherLayout.buttons, ...next } } }));
  const rows = buttons.rows ?? 2;
  const barWidth = Math.min(settings.launcherLayout.search.width || settings.searchStyle.width, buttons.width || 9999, Math.max(240, screen - 40));
  const cap = shortcutCapacity(barWidth, buttons.iconSize || 56, rows, screen < 640);
  const full = bookmarks.length >= cap.limit;

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= bookmarks.length) return;
    const next = [...bookmarks];
    [next[index], next[target]] = [next[target], next[index]];
    setBookmarkOrder(next);
  };

  return (
    <SettingsGroup
      title={L("Shortcuts under the search bar", "Вкладки под строкой поиска")}
      description={L("Round site icons right under the bar, with a “+” tile to add more. The row never gets wider than the search bar.", "Круглые иконки сайтов прямо под строкой, в конце — плюсик для новых. Ряд никогда не бывает шире строки поиска.")}
      action={
        <button
          type="button"
          disabled={full}
          onClick={() => setAdding(true)}
          className="inline-flex h-10 items-center gap-2 rounded-full bg-[var(--primary)] px-4 text-sm font-semibold text-[var(--on-primary)] transition-all duration-300 hover:rounded-[14px] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Plus size={16} aria-hidden="true" />
          {L("Add", "Добавить")}
        </button>
      }
    >
      <div className={cn(CARD, "divide-y divide-[var(--line)]")}>
        <ToggleRow title={L("Show shortcuts", "Показывать вкладки")} checked={buttons.visible} onChange={(visible) => patch({ visible })} />
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-sm">
          <span className="font-semibold">
            {bookmarks.length > cap.limit ? cap.limit : bookmarks.length} / {cap.limit}
          </span>
          <span className="text-xs text-[var(--muted)]">
            {L(`${cap.perRow} per row × ${rows} ${rows === 1 ? "row" : "rows"} fit a ${Math.round(barWidth)} px bar on this screen`, `${cap.perRow} в ряд × ${rows} ${rows === 1 ? "ряд" : "ряда"} — столько помещается в строку ${Math.round(barWidth)} px на этом экране`)}
          </span>
        </div>
        <div className="px-4 py-3">
          <div className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">{L("Rows", "Ряды")}</div>
          <Segmented label={L("Rows", "Ряды")} value={String(rows)} onChange={(value) => patch({ rows: Number(value) })} options={["1", "2", "3"].map((value) => ({ value, label: value }))} />
        </div>
        <SliderRow label={L("Icon size", "Размер иконок")} value={buttons.iconSize || 56} min={40} max={72} step={4} unit=" px" onChange={(iconSize) => patch({ iconSize })} />
        <ToggleRow title={L("Labels", "Подписи")} checked={buttons.showLabels !== false} onChange={(showLabels) => patch({ showLabels })} />
        <ToggleRow title={L("“+” tile in the row", "Плюсик в ряду")} description={L("Shown while there is room for one more shortcut.", "Показывается, пока есть место ещё для одной вкладки.")} checked={buttons.addTile !== false} onChange={(addTile) => patch({ addTile })} />
      </div>

      {full && (
        <div className="mt-3">
          <Notice>{L(`The row is full (${cap.limit}). Remove a shortcut, add a row or make the icons smaller to add another one.`, `Ряд заполнен (${cap.limit}). Уберите вкладку, добавьте ряд или уменьшите иконки, чтобы добавить новую.`)}</Notice>
        </div>
      )}

      {bookmarks.length > 0 && (
        <div className={cn(CARD, "mt-3 divide-y divide-[var(--line)]")}>
          {bookmarks.map((bookmark, index) => {
            const hidden = index >= cap.limit;
            return (
              <div key={bookmark.id} className={cn("flex items-center gap-3 px-4 py-2.5", hidden && "opacity-45")}>
                <BookmarkIcon bookmark={bookmark} size={32} fallbackShape={settings.bookmarkShape || "circle"} className="bg-[var(--surface-container-high)]" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{bookmark.title}</div>
                  <div className="truncate text-[11px] text-[var(--muted)]">{hidden ? L("Doesn't fit under the bar", "Не помещается под строкой") : bookmark.url}</div>
                </div>
                <button type="button" onClick={() => move(index, -1)} disabled={index === 0} className="grid h-8 w-8 place-items-center rounded-full text-[var(--muted)] transition hover:bg-[var(--surface-container-high)] disabled:opacity-25" aria-label={L("Move up", "Выше")}>
                  <ArrowUp size={14} aria-hidden="true" />
                </button>
                <button type="button" onClick={() => move(index, 1)} disabled={index === bookmarks.length - 1} className="grid h-8 w-8 place-items-center rounded-full text-[var(--muted)] transition hover:bg-[var(--surface-container-high)] disabled:opacity-25" aria-label={L("Move down", "Ниже")}>
                  <ArrowDown size={14} aria-hidden="true" />
                </button>
                <button type="button" onClick={() => removeBookmark(bookmark.id)} className="grid h-8 w-8 place-items-center rounded-full text-[var(--muted)] transition hover:bg-[var(--surface-container-high)] hover:text-[var(--fg)]" aria-label={L("Remove", "Удалить")}>
                  <Trash2 size={14} aria-hidden="true" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {adding && (
        <BookmarkDialog
          defaultShape={settings.bookmarkShape || "circle"}
          onClose={() => setAdding(false)}
          onSave={(data) => {
            saveBookmark(data);
            setAdding(false);
          }}
        />
      )}
    </SettingsGroup>
  );
}
