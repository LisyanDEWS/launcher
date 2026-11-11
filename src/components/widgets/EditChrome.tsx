import { CalendarDays, Check, Clock3, Cloud, Code2, EyeOff, Folder, Grid3x3, LayoutDashboard, LayoutGrid, List, Move, Plus, Search, Settings2, Sparkles, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { FaceGallery, LayoutControls, SystemElementEditor, WidgetEditor, WidgetList } from "./editor";
import type { GalleryTab } from "./FaceGallery";
import HtmlWidgetWorkspace from "./HtmlWidgetWorkspace";
import LogoStudio from "../settings/LogoStudio";
import { BUTTON_PRIMARY, CARD } from "../ui";
import { useI18n } from "../../lib/i18n";
import { MAX_WIDGETS, type CustomHtmlWidget, type HomeLayout, type HomeWidget, type LauncherLayout, type SearchStyle, type Settings } from "../../lib/settings";
import { useStageLayout } from "../../lib/stage";
import type { WidgetActions } from "../../lib/widgets";
import { cn } from "../../utils/cn";

type SystemKey = "__system_search__" | "__system_logo__" | "__system_buttons__";

type Props = {
  widgets: HomeWidget[];
  layout: HomeLayout;
  launcherLayout: LauncherLayout;
  searchStyle: SearchStyle;
  selectedId: string | null;
  dragging: boolean;
  actions: WidgetActions;
  onChangeLauncherLayout: (patch: Partial<LauncherLayout>) => void;
  onChangeSearchStyle: (patch: Partial<SearchStyle>) => void;
  onResetElementCenter: (elementKey: SystemKey) => void;
  onRequestRemoveSearch?: () => void;
  onSelect: (id: string | null) => void;
  /** Changes when an element's own "Settings" button is pressed. */
  settingsSignal?: number;
  onExit: () => void;
  settings: Settings;
  onUpdateSettings: (patch: Partial<Settings>) => void;
};

/** What the bottom-sheet / side panel is showing. Closed by default so the card has room. */
type Sheet = null | "gallery" | "list" | "settings";

function ModeToggle({ mode, onChange, rail = false }: { mode: "free" | "grid"; onChange: (mode: "free" | "grid") => void; rail?: boolean }) {
  const { t } = useI18n();
  return (
    <div role="radiogroup" aria-label={t("home.layout")} className={cn("edit-mode", rail && "edit-mode--rail")}>
      {(["free", "grid"] as const).map((value) => {
        const Icon = value === "free" ? Move : Grid3x3;
        const on = mode === value;
        return (
          <button key={value} type="button" role="radio" aria-checked={on} title={t(`home.mode.${value}`)} onClick={() => onChange(value)} className={cn("edit-mode-btn", on && "is-on")}>
            <Icon size={rail ? 18 : 15} aria-hidden="true" />
            <span>{t(`home.mode.${value}`)}</span>
          </button>
        );
      })}
    </div>
  );
}

/** The editor's controls around the shrunken home screen. */
export default function EditChrome({
  widgets,
  layout,
  launcherLayout,
  searchStyle,
  selectedId,
  dragging,
  actions,
  onChangeLauncherLayout,
  onChangeSearchStyle,
  onResetElementCenter,
  onRequestRemoveSearch,
  onSelect,
  settingsSignal,
  onExit,
  settings,
  onUpdateSettings,
}: Props) {
  const { t, lang } = useI18n();
  const isRu = lang === "ru";
  const [sheet, setSheet] = useState<Sheet>(null);
  const [galleryTab, setGalleryTab] = useState<GalleryTab>("all");
  const [htmlStudioOpen, setHtmlStudioOpen] = useState(false);
  const [editingHtmlWidget, setEditingHtmlWidget] = useState<CustomHtmlWidget | null>(null);

  // Publishes the card's scale/offset; wide screens give the card less room while a panel is docked beside it.
  useStageLayout(sheet !== null);

  const isSystem =
    selectedId === "__system_search__" ||
    selectedId === "__system_logo__" ||
    selectedId === "__system_buttons__";
  const selectedWidget = widgets.find((widget) => widget.id === selectedId) ?? null;
  const hasSelection = isSystem || Boolean(selectedWidget);
  const full = widgets.length >= MAX_WIDGETS;

  const system: { key: SystemKey; icon: LucideIcon; short: string; label: string; visible: boolean }[] = [
    { key: "__system_search__", icon: Search, short: isRu ? "Поиск" : "Search", label: t("home.element.search"), visible: launcherLayout.search.visible },
    { key: "__system_logo__", icon: Sparkles, short: isRu ? "Логотип" : "Logo", label: t("home.element.logo"), visible: launcherLayout.logo.visible },
    { key: "__system_buttons__", icon: LayoutGrid, short: isRu ? "Кнопки" : "Buttons", label: t("home.element.buttons"), visible: launcherLayout.buttons.visible },
  ];

  const title = isSystem
    ? (system.find((item) => item.key === selectedId)?.label ?? "")
    : selectedWidget
      ? selectedWidget.type === "custom_html"
        ? selectedWidget.title || "Custom Widget"
        : selectedWidget.type === "shortcut"
          ? selectedWidget.title || t("wf.f.shortcut")
          : selectedWidget.type === "bookmarks"
          ? selectedWidget.title || t("wf.f.bookmarks")
          : t(`wf.f.${selectedWidget.face}`)
      : "";

  /* ---------- the panel follows the selection ---------- */
  useEffect(() => {
    // Picking something on the card dismisses a browsing panel; the settings panel follows the new selection.
    setSheet((current) => (selectedId ? (current === "settings" ? current : null) : current === "settings" ? null : current));
  }, [selectedId]);

  // An element's own "Settings" button opens the properties panel on it.
  useEffect(() => {
    if (settingsSignal) setSheet("settings");
  }, [settingsSignal]);

  // Esc closes the open panel first; only then does it reach the app (deselect → finish editing).
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || htmlStudioOpen || !sheet) return;
      event.stopPropagation();
      setSheet(null);
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [sheet, htmlStudioOpen]);

  const openGallery = (tab: GalleryTab = "all") => {
    onSelect(null);
    setGalleryTab(tab);
    setSheet("gallery");
  };
  const openHtmlStudio = (target?: CustomHtmlWidget | null) => {
    setEditingHtmlWidget(target ?? null);
    setHtmlStudioOpen(true);
  };
  /** A freshly added widget is selected on the card; its settings are one tap away in the dock. */
  const added = (id: string) => {
    setSheet(null);
    onSelect(id);
  };
  const pick = (id: string) => {
    onSelect(id);
    setSheet("settings");
  };

  const handleSaveHtml = (html: string, htmlTitle: string, styleVariant: "m3" | "matrix") => {
    if (editingHtmlWidget) {
      actions.change(editingHtmlWidget.id, { html, title: htmlTitle, styleVariant });
    } else {
      const id = actions.addHtml(html, htmlTitle);
      if (styleVariant !== "m3") actions.change(id, { styleVariant });
      added(id);
    }
    setHtmlStudioOpen(false);
    setEditingHtmlWidget(null);
  };

  const quick: { tab: GalleryTab | "html"; icon: LucideIcon; label: string }[] = [
    { tab: "clocks", icon: Clock3, label: t("wg.clock") },
    { tab: "weather", icon: Cloud, label: t("wg.weather") },
    { tab: "calendar", icon: CalendarDays, label: t("wg.calendar") },
    { tab: "more", icon: Folder, label: isRu ? "Закладки" : "Bookmarks" },
    { tab: "html", icon: Code2, label: "HTML" },
  ];

  const sheetTitle = sheet === "settings" ? title : sheet === "gallery" ? t("home.chooseFace") : t("sec.home");

  return (
    <>
      <div className={cn("edit-chrome", dragging && "is-dragging")}>
        {/* Top: finish editing */}
        <div className="edit-top edit-ui">
          <div role="toolbar" aria-label={t("home.editing")} className="edit-top-pill">
            <span className="edit-top-title">
              <LayoutDashboard size={17} aria-hidden="true" />
              <span className="hidden sm:inline">{t("home.editing")}</span>
            </span>
            <span className="edit-top-hint hidden xl:block">{t("home.hint")}</span>
            <button type="button" onClick={onExit} className="edit-done">
              <Check size={18} strokeWidth={2.8} aria-hidden="true" />
              {t("home.done")}
            </button>
          </div>
        </div>

        {/* Left: the built-in elements */}
        <nav className="edit-rail edit-rail--left edit-ui" aria-label={t("home.elements")}>
          {system.map(({ key, icon: Icon, short, label, visible }) => (
            <button
              key={key}
              type="button"
              onClick={() => onSelect(selectedId === key ? null : key)}
              aria-pressed={selectedId === key}
              title={label}
              className={cn("edit-rail-btn", selectedId === key && "is-on", !visible && "is-off")}
            >
              <Icon size={20} aria-hidden="true" />
              <span className="edit-rail-label">{short}</span>
              {!visible && <EyeOff size={11} className="edit-rail-eye" aria-hidden="true" />}
            </button>
          ))}
        </nav>

        {/* Right: how things snap, and the full list */}
        {sheet === null && (
          <nav className="edit-rail edit-rail--right edit-ui" aria-label={t("home.layout")}>
            <ModeToggle mode={layout.mode} onChange={(mode) => actions.layout({ mode })} rail />
            <div className="edit-rail-sep" />
            <button type="button" onClick={() => setSheet("list")} title={t("edit.list")} className="edit-rail-btn">
              <List size={20} aria-hidden="true" />
              <span className="edit-rail-label">{t("edit.list")}</span>
            </button>
          </nav>
        )}

        {/* Bottom: add things — or act on what is selected */}
        <div className={cn("edit-dock edit-ui", sheet !== null && "has-sheet")} role="toolbar" aria-label={hasSelection ? title : t("home.add")}>
          {hasSelection ? (
            <>
              <span className="edit-dock-name">{title}</span>
              <button type="button" onClick={() => setSheet("settings")} className="edit-chip is-primary">
                <Settings2 size={16} aria-hidden="true" />
                {t("edit.configure")}
              </button>
              <button type="button" onClick={() => onSelect(null)} title={t("edit.deselect")} aria-label={t("edit.deselect")} className="edit-chip is-icon">
                <X size={17} aria-hidden="true" />
              </button>
            </>
          ) : (
            <>
              <button type="button" disabled={full} onClick={() => openGallery("all")} className="edit-chip is-primary">
                <Plus size={17} strokeWidth={2.5} aria-hidden="true" />
                {t("home.add")}
              </button>
              <span className="edit-dock-sep" aria-hidden="true" />
              {quick.map(({ tab, icon: Icon, label }) => (
                <button key={tab} type="button" disabled={full} onClick={() => (tab === "html" ? openHtmlStudio(null) : openGallery(tab))} className="edit-chip">
                  <Icon size={16} aria-hidden="true" />
                  {label}
                </button>
              ))}
              {/* Narrow screens have no side rails — their controls live here */}
              <span className="edit-dock-extra edit-dock-sep" aria-hidden="true" />
              {system.map(({ key, icon: Icon, label, visible }) => (
                <button key={key} type="button" onClick={() => onSelect(key)} title={label} aria-label={label} className={cn("edit-dock-extra edit-chip is-icon", !visible && "is-off")}>
                  <Icon size={17} aria-hidden="true" />
                </button>
              ))}
              <span className="edit-dock-extra">
                <ModeToggle mode={layout.mode} onChange={(mode) => actions.layout({ mode })} />
              </span>
            </>
          )}
        </div>

        {/* Properties: docked beside the card on wide screens, a bottom sheet on narrow ones */}
        {sheet && (
          <aside aria-label={sheetTitle} className="edit-sheet edit-ui">
            <header className="flex items-center gap-1 border-b border-[var(--line)] px-2 py-2">
              {sheet === "settings" ? (
                <h2 className="type-display min-w-0 flex-1 truncate px-2 py-1.5 text-base font-semibold">{title}</h2>
              ) : (
                <div role="tablist" className="flex flex-1 gap-1 rounded-full bg-[var(--surface-container-high)] p-1">
                  {(["list", "gallery"] as const).map((id) => (
                    <button
                      key={id}
                      type="button"
                      role="tab"
                      aria-selected={sheet === id}
                      onClick={() => (id === "gallery" ? openGallery(galleryTab) : setSheet("list"))}
                      className={cn(
                        "flex h-8 flex-1 items-center justify-center gap-1.5 rounded-full text-sm font-medium transition-all duration-300",
                        sheet === id ? "rounded-[11px] bg-[var(--primary)] text-[var(--on-primary)]" : "text-[var(--muted)] hover:text-[var(--fg)]",
                      )}
                    >
                      {id === "gallery" ? <Plus size={15} aria-hidden="true" /> : <List size={15} aria-hidden="true" />}
                      {id === "gallery" ? t("home.tab.add") : t("home.tab.elements")}
                    </button>
                  ))}
                </div>
              )}
              <button type="button" onClick={() => setSheet(null)} title={t("settings.close")} aria-label={t("settings.close")} className="edit-sheet-close">
                <X size={18} aria-hidden="true" />
              </button>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto p-2.5">
              {sheet === "settings" && isSystem ? (
                <div className="space-y-3">
                  {selectedId === "__system_logo__" && <LogoStudio settings={settings} update={onUpdateSettings} dense />}
                  <SystemElementEditor
                    elementKey={selectedId as "__system_logo__" | "__system_search__" | "__system_buttons__"}
                    layout={launcherLayout}
                    style={searchStyle}
                    onChangeLayout={onChangeLauncherLayout}
                    onChangeStyle={onChangeSearchStyle}
                    onResetCenter={() => onResetElementCenter(selectedId as "__system_logo__" | "__system_search__" | "__system_buttons__")}
                    onRequestRemove={onRequestRemoveSearch}
                  />
                </div>
              ) : sheet === "settings" && selectedWidget ? (
                <WidgetEditor
                  key={selectedWidget.id}
                  widget={selectedWidget}
                  onChange={(patch) => actions.change(selectedWidget.id, patch)}
                  onDuplicate={() => onSelect(actions.duplicate(selectedWidget.id))}
                  onRemove={() => {
                    actions.remove(selectedWidget.id);
                    onSelect(null);
                  }}
                  canDuplicate={!full}
                  onEditHtml={() => openHtmlStudio(selectedWidget as CustomHtmlWidget)}
                />
              ) : sheet === "gallery" ? (
                <FaceGallery
                  key={galleryTab}
                  initialTab={galleryTab}
                  onPickClock={(face) => added(actions.add(face))}
                  onPickWeather={(face) => added(actions.addWeather(face))}
                  onPickBookmarks={(bookmarkLayout) => added(actions.addBookmarks(bookmarkLayout))}
                  onPickShortcut={(data) => added(actions.addShortcut(data))}
                  onOpenHtmlStudio={() => openHtmlStudio(null)}
                />
              ) : (
                <div className="space-y-3">
                  <div className={cn(CARD, "space-y-2 p-3")}>
                    <span className="px-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">{t("home.elements")}</span>
                    <div className="grid grid-cols-2 gap-1.5">
                      {system.map(({ key, icon: Icon, label, visible }) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => pick(key)}
                          className={cn(
                            "flex items-center gap-2 rounded-xl px-2.5 py-2 text-start text-xs font-medium transition hover:bg-[var(--surface-container-highest)]",
                            visible ? "bg-[var(--surface-container-high)]" : "bg-[var(--surface-container-high)]/60 text-[var(--muted)]",
                          )}
                        >
                          <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-lg", visible ? "bg-[var(--primary)] text-[var(--on-primary)]" : "bg-[var(--surface-container-highest)]")}>
                            <Icon size={14} aria-hidden="true" />
                          </span>
                          <span className="min-w-0 flex-1 truncate">{label}</span>
                          {!visible && <EyeOff size={12} className="shrink-0 opacity-70" aria-hidden="true" />}
                        </button>
                      ))}
                    </div>
                    <p className="px-0.5 text-[11px] leading-4 text-[var(--muted)]">{t("home.elementsHint")}</p>
                  </div>

                  <LayoutControls layout={layout} onChange={actions.layout} />

                  <WidgetList
                    widgets={widgets}
                    selectedId={selectedId}
                    onSelect={(id) => (id ? pick(id) : onSelect(null))}
                    onDuplicate={(id) => onSelect(actions.duplicate(id))}
                    onRemove={actions.remove}
                    canDuplicate={!full}
                  />
                  <button type="button" disabled={full} onClick={() => openGallery("all")} className={cn(BUTTON_PRIMARY, "w-full justify-center")}>
                    <Plus size={17} aria-hidden="true" />
                    {t("home.add")}
                  </button>
                  <p className="px-1 text-[11px] leading-4 text-[var(--muted)]">{full ? t("home.limit") : t("home.keys")}</p>
                </div>
              )}
            </div>
          </aside>
        )}
      </div>

      {htmlStudioOpen && (
        <HtmlWidgetWorkspace
          initialWidget={editingHtmlWidget}
          onSave={handleSaveHtml}
          onClose={() => {
            setHtmlStudioOpen(false);
            setEditingHtmlWidget(null);
          }}
        />
      )}
    </>
  );
}
