import {
  Check,
  ChevronLeft,
  Grid3x3,
  LayoutGrid,
  Move,
  PanelRightClose,
  PanelRightOpen,
  Plus,
  Search,
  Sliders,
  Sparkles,
} from "lucide-react";
import { useEffect, useState } from "react";
import { FaceGallery, LayoutControls, SystemElementEditor, WidgetEditor, WidgetList } from "./editor";
import HtmlWidgetWorkspace from "./HtmlWidgetWorkspace";
import { BUTTON, BUTTON_PRIMARY, CARD } from "../ui";
import { useI18n } from "../../lib/i18n";
import {
  MAX_WIDGETS,
  type HomeWidget,
  type HomeLayout,
  type LauncherLayout,
  type SearchStyle,
  type CustomHtmlWidget,
} from "../../lib/settings";
import type { WidgetActions } from "../../lib/widgets";
import { cn } from "../../utils/cn";

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
  onResetElementCenter: (elementKey: "__system_logo__" | "__system_search__" | "__system_buttons__" | "__system_add_button__") => void;
  onRequestRemoveSearch?: () => void;
  onSelect: (id: string | null) => void;
  onExit: () => void;
};

/** Toolbar and side panel shown while the home screen is being edited. */
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
  onExit,
}: Props) {
  const { t, lang } = useI18n();
  const isRu = lang === "ru";
  const [panel, setPanel] = useState<"home" | "add">("home");
  const [open, setOpen] = useState(true);
  const [htmlStudioOpen, setHtmlStudioOpen] = useState(false);
  const [editingHtmlWidget, setEditingHtmlWidget] = useState<CustomHtmlWidget | null>(null);

  const openHtmlStudio = (target?: CustomHtmlWidget | null) => {
    setEditingHtmlWidget(target ?? null);
    setHtmlStudioOpen(true);
  };

  const handleSaveHtml = (html: string, title: string, styleVariant: "m3" | "matrix") => {
    if (editingHtmlWidget) {
      actions.change(editingHtmlWidget.id, { html, title, styleVariant });
    } else {
      const id = actions.addHtml(html, title);
      if (styleVariant !== "m3") {
        actions.change(id, { styleVariant });
      }
      setPanel("home");
      onSelect(id);
    }
    setHtmlStudioOpen(false);
    setEditingHtmlWidget(null);
  };

  const isSystemLogo = selectedId === "__system_logo__";
  const isSystemSearch = selectedId === "__system_search__";
  const isSystemButtons = selectedId === "__system_buttons__";
  const isSystemAddButton = selectedId === "__system_add_button__";
  const isSystemElement = isSystemLogo || isSystemSearch || isSystemButtons || isSystemAddButton;

  const selectedWidget = widgets.find((widget) => widget.id === selectedId) ?? null;
  const full = widgets.length >= MAX_WIDGETS;

  const title = isSystemLogo
    ? t("home.element.logo")
    : isSystemSearch
    ? t("home.element.search")
    : isSystemButtons
    ? t("home.element.buttons")
    : isSystemAddButton
    ? (isRu ? "Кнопка «+ Добавить»" : "Add Bookmark Button")
    : selectedWidget
    ? selectedWidget.type === "custom_html"
      ? selectedWidget.title || "Custom Widget"
      : selectedWidget.type === "bookmarks"
      ? selectedWidget.title || t("wf.f.bookmarks")
      : t(`wf.f.${selectedWidget.face}`)
    : panel === "add"
    ? t("home.chooseFace")
    : t("sec.home");

  useEffect(() => {
    if (!selectedId) return;
    setPanel("home");
    setOpen(true);
  }, [selectedId]);

  const openGallery = () => {
    onSelect(null);
    setPanel("add");
    setOpen(true);
  };

  return (
    <>
      <div className={cn("pointer-events-none fixed inset-x-0 top-4 z-[60] flex justify-center px-3 transition-opacity duration-200", dragging && "opacity-0")}>
        <div
          role="toolbar"
          aria-label={t("home.editing")}
          className="pointer-events-auto flex max-w-full items-center gap-1.5 overflow-x-auto rounded-full bg-[var(--surface)] p-1.5 shadow-[0_10px_30px_rgb(0_0_0/0.22)] ring-1 ring-[var(--line)]"
        >
          <button
            type="button"
            disabled={full}
            onClick={openGallery}
            className="flex h-10 shrink-0 items-center gap-2 rounded-full bg-[var(--surface-container-high)] px-4 text-sm font-medium transition-all duration-300 hover:rounded-[14px] hover:bg-[var(--surface-container-highest)] disabled:opacity-40"
          >
            <Plus size={17} aria-hidden="true" />
            <span className="hidden sm:inline">{t("home.add")}</span>
          </button>

          {/* Quick Select for movable Search bar, Logo, and Buttons */}
          <div className="flex shrink-0 items-center rounded-full bg-[var(--surface-container-high)] p-1 gap-1">
            <button
              type="button"
              onClick={() => onSelect(isSystemSearch ? null : "__system_search__")}
              title={t("home.element.search")}
              className={cn(
                "flex h-8 items-center gap-1.5 rounded-full px-2.5 text-xs transition",
                isSystemSearch ? "bg-[var(--primary)] text-[var(--on-primary)] font-semibold" : "hover:bg-[var(--surface)]"
              )}
            >
              <Search size={13} />
              <span className="hidden sm:inline">{t("home.element.search")}</span>
            </button>
            <button
              type="button"
              onClick={() => onSelect(isSystemLogo ? null : "__system_logo__")}
              title={t("home.element.logo")}
              className={cn(
                "flex h-8 items-center gap-1.5 rounded-full px-2.5 text-xs transition",
                isSystemLogo ? "bg-[var(--primary)] text-[var(--on-primary)] font-semibold" : "hover:bg-[var(--surface)]"
              )}
            >
              <Sparkles size={13} />
              <span className="hidden sm:inline">{t("home.element.logo")}</span>
            </button>
            <button
              type="button"
              onClick={() => onSelect(isSystemButtons ? null : "__system_buttons__")}
              title={t("home.element.buttons")}
              className={cn(
                "flex h-8 items-center gap-1.5 rounded-full px-2.5 text-xs transition",
                isSystemButtons ? "bg-[var(--primary)] text-[var(--on-primary)] font-semibold" : "hover:bg-[var(--surface)]"
              )}
            >
              <LayoutGrid size={13} />
              <span className="hidden sm:inline">{t("home.element.buttons")}</span>
            </button>
            <button
              type="button"
              onClick={() => onSelect(isSystemAddButton ? null : "__system_add_button__")}
              title={isRu ? "Кнопка «+ Добавить»" : "Add Bookmark Button"}
              className={cn(
                "flex h-8 items-center gap-1.5 rounded-full px-2.5 text-xs transition",
                isSystemAddButton ? "bg-[var(--primary)] text-[var(--on-primary)] font-semibold" : "hover:bg-[var(--surface)]"
              )}
            >
              <Plus size={13} />
              <span className="hidden sm:inline">{isRu ? "+ Добавить" : "+ Add"}</span>
            </button>
          </div>

          <div role="radiogroup" aria-label={t("home.layout")} className="flex shrink-0 rounded-full bg-[var(--surface-container-high)] p-1">
            {(["free", "grid"] as const).map((mode) => {
              const Icon = mode === "free" ? Move : Grid3x3;
              const on = layout.mode === mode;
              return (
                <button
                  key={mode}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => actions.layout({ mode })}
                  title={t(`home.mode.${mode}`)}
                  className={cn(
                    "flex h-8 items-center gap-1.5 rounded-full px-3 text-sm transition-all duration-300",
                    on ? "rounded-[11px] bg-[var(--primary)] font-medium text-[var(--on-primary)]" : "hover:bg-[var(--surface-container-highest)]",
                  )}
                >
                  <Icon size={15} aria-hidden="true" />
                  <span className="hidden sm:inline">{t(`home.mode.${mode}`)}</span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-pressed={open}
            title={open ? t("home.hidePanel") : t("home.showPanel")}
            aria-label={open ? t("home.hidePanel") : t("home.showPanel")}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition hover:bg-[var(--surface-container-high)]"
          >
            {open ? <PanelRightClose size={18} className="rtl:-scale-x-100" aria-hidden="true" /> : <PanelRightOpen size={18} className="rtl:-scale-x-100" aria-hidden="true" />}
          </button>
          <button type="button" onClick={onExit} className={cn(BUTTON_PRIMARY, "h-10")}>
            <Check size={17} aria-hidden="true" />
            {t("home.done")}
          </button>
        </div>
      </div>

      {open && (
        <aside
          aria-label={title}
          className={cn(
            "fixed z-[60] flex flex-col overflow-hidden rounded-[28px] bg-[var(--sidebar)] shadow-[0_24px_60px_rgb(0_0_0/0.3)] ring-1 ring-[var(--line)] transition-opacity duration-200",
            "inset-x-2 bottom-2 max-h-[56vh] md:inset-x-auto md:bottom-4 md:end-4 md:top-20 md:max-h-none md:w-[390px]",
            dragging && "pointer-events-none opacity-0",
          )}
        >
          <header className="flex items-center gap-1 border-b border-[var(--line)] px-2 py-2">
            {(selectedWidget || isSystemElement || panel === "add") && (
              <button
                type="button"
                onClick={() => {
                  onSelect(null);
                  setPanel("home");
                }}
                title={t("wg.back")}
                aria-label={t("wg.back")}
                className="flex h-10 w-10 items-center justify-center rounded-full transition hover:bg-[var(--surface-container-high)]"
              >
                <ChevronLeft size={20} className="rtl:rotate-180" aria-hidden="true" />
              </button>
            )}
            <h2 className="type-display min-w-0 flex-1 truncate px-2 py-1.5 text-lg font-semibold">{title}</h2>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            {isSystemElement ? (
              <SystemElementEditor
                elementKey={selectedId as any}
                layout={launcherLayout}
                style={searchStyle}
                onChangeLayout={onChangeLauncherLayout}
                onChangeStyle={onChangeSearchStyle}
                onResetCenter={() => onResetElementCenter(selectedId as any)}
                onRequestRemove={onRequestRemoveSearch}
              />
            ) : selectedWidget ? (
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
            ) : panel === "add" ? (
              <FaceGallery
                onPickClock={(face) => {
                  const id = actions.add(face);
                  setPanel("home");
                  onSelect(id);
                }}
                onPickWeather={(face) => {
                  const id = actions.addWeather(face);
                  setPanel("home");
                  onSelect(id);
                }}
                onPickBookmarks={(layout) => {
                  const id = actions.addBookmarks(layout);
                  setPanel("home");
                  onSelect(id);
                }}
                onOpenHtmlStudio={() => openHtmlStudio(null)}
              />
            ) : (
              <div className="space-y-4">
                {/* Launcher elements quick config card */}
                <div className={cn(CARD, "p-3.5 space-y-2 border border-[var(--line)]")}>
                  <div className="flex items-center gap-2 px-1 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                    <Sliders size={14} />
                    <span>{t("home.elements")}</span>
                  </div>
                  <p className="text-xs text-[var(--muted)] px-1 leading-5">
                    {t("home.elementsDesc")}
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => onSelect("__system_search__")}
                      className="flex flex-col items-center gap-1 rounded-xl bg-[var(--surface-container-high)] p-2.5 text-xs font-medium hover:bg-[var(--surface-container-highest)] transition"
                    >
                      <Search size={16} />
                      <span className="truncate w-full text-center">{t("home.element.search")}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onSelect("__system_logo__")}
                      className="flex flex-col items-center gap-1 rounded-xl bg-[var(--surface-container-high)] p-2.5 text-xs font-medium hover:bg-[var(--surface-container-highest)] transition"
                    >
                      <Sparkles size={16} />
                      <span className="truncate w-full text-center">{t("home.element.logo")}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onSelect("__system_buttons__")}
                      className="flex flex-col items-center gap-1 rounded-xl bg-[var(--surface-container-high)] p-2.5 text-xs font-medium hover:bg-[var(--surface-container-highest)] transition"
                    >
                      <LayoutGrid size={16} />
                      <span className="truncate w-full text-center">{t("home.element.buttons")}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onSelect("__system_add_button__")}
                      className="flex flex-col items-center gap-1 rounded-xl bg-[var(--surface-container-high)] p-2.5 text-xs font-medium hover:bg-[var(--surface-container-highest)] transition"
                    >
                      <Plus size={16} />
                      <span className="truncate w-full text-center">{isRu ? "+ Добавить" : "+ Add"}</span>
                    </button>
                  </div>
                </div>

                <LayoutControls layout={layout} onChange={actions.layout} />

                <WidgetList
                  widgets={widgets}
                  selectedId={selectedId}
                  onSelect={onSelect}
                  onDuplicate={(id) => onSelect(actions.duplicate(id))}
                  onRemove={actions.remove}
                  canDuplicate={!full}
                />
                <button type="button" disabled={full} onClick={openGallery} className={cn(BUTTON_PRIMARY, "w-full justify-center")}>
                  <Plus size={17} aria-hidden="true" />
                  {t("home.add")}
                </button>
                <p className="px-1 text-xs leading-5 text-[var(--muted)]">{full ? t("home.limit") : t("home.keys")}</p>
              </div>
            )}
          </div>
        </aside>
      )}

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
