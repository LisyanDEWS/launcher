import { LayoutGrid, Move, Plus, Search, Sparkles } from "lucide-react";
import { useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { useSettingsCtx } from "./context";
import { BUTTON, BUTTON_PRIMARY, CARD, Notice, SettingsGroup } from "../ui";
import WallpaperLayer from "../WallpaperLayer";
import Clock from "../widgets/Clock";
import { FaceGallery, LayoutControls, WidgetEditor, WidgetList } from "../widgets/editor";
import { useI18n } from "../../lib/i18n";
import { MAX_WIDGETS } from "../../lib/settings";
import { captionText, useViewport, useWidgetActions, widgetRect, widgetSize } from "../../lib/widgets";
import { cn } from "../../utils/cn";

/** Scaled-down live copy of the start page with the real widgets. */
function MiniMap({ selectedId, onSelect }: { selectedId: string | null; onSelect: (id: string) => void }) {
  const { settings, wallpaper } = useSettingsCtx();
  const { t } = useI18n();
  const viewport = useViewport();
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useLayoutEffect(() => {
    const element = box.current;
    if (!element) return;
    const update = () => setWidth(element.clientWidth);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const k = width / viewport.w;
  const style = settings.searchStyle;
  const searchWidth = Math.min(style.width, viewport.w - 48) * k;
  const layout = settings.homeLayout;

  return (
    <div
      ref={box}
      className="relative isolate w-full overflow-hidden rounded-[20px] border border-[var(--line)] bg-[var(--bg)]"
      style={{ aspectRatio: `${viewport.w} / ${viewport.h}` }}
    >
      {wallpaper.url && (
        <WallpaperLayer
          key={wallpaper.url}
          contained
          url={wallpaper.url}
          dim={settings.wallpaperDim}
          blur={settings.wallpaperBlur}
          grayscale={settings.wallpaperGrayscale}
        />
      )}
      {layout.mode === "grid" && layout.cell * k >= 5 && <div className="wl-grid" style={{ "--cell": `${layout.cell * k}px` } as CSSProperties} />}
      {k > 0 && (
        <div
          aria-hidden="true"
          className="absolute rounded-full bg-[var(--surface-container-high)]"
          style={{
            left: (viewport.w * k - searchWidth) / 2,
            top: ((viewport.h * style.offsetTop) / 100 + 128) * k,
            width: searchWidth,
            height: Math.max(6, style.height * k),
          }}
        />
      )}
      {k > 0 &&
        settings.widgets.map((widget) => {
          const rect = widgetRect(widget, viewport, layout);
          const size = widgetSize(widget);
            const widgetName = widget.type === "custom_html" ? widget.title || "Custom Widget" : t(`wf.f.${widget.face}`);
            return (
              <button
                key={widget.id}
                type="button"
                onClick={() => onSelect(widget.id)}
                aria-label={t("wg.select", { name: widgetName })}
              className={cn("absolute rounded-[6px] outline-offset-2", widget.id === selectedId && "outline outline-2 outline-[var(--primary)]")}
              style={{ left: rect.left * k, top: rect.top * k, width: size.width * k, height: size.height * k }}
            >
              <Clock widget={widget} width={size.width * k} faceHeight={size.faceHeight * k} captionHeight={size.caption * k} caption={captionText(widget)} />
            </button>
          );
        })}
    </div>
  );
}

export default function HomeSection() {
  const { settings, setSettings, openHomeEditor } = useSettingsCtx();
  const { t } = useI18n();
  const actions = useWidgetActions(setSettings);
  const [selectedId, setSelectedId] = useState<string | null>(() => settings.widgets[0]?.id ?? null);
  const [adding, setAdding] = useState(false);
  const selected = settings.widgets.find((widget) => widget.id === selectedId) ?? null;
  const full = settings.widgets.length >= MAX_WIDGETS;
  const remove = (id: string) => {
    actions.remove(id);
    if (id === selectedId) setSelectedId(null);
  };

  return (
    <div className="space-y-8">
      <div className={cn(CARD, "p-4 sm:p-5")}>
        <MiniMap selectedId={selectedId} onSelect={setSelectedId} />
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button type="button" onClick={openHomeEditor} className={BUTTON_PRIMARY}>
            <Move size={16} aria-hidden="true" />
            {t("home.edit")}
          </button>
          <button type="button" disabled={full} onClick={() => setAdding((value) => !value)} aria-expanded={adding} className={BUTTON}>
            <Plus size={16} aria-hidden="true" />
            {t("home.add")}
          </button>
        </div>
        <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
          {t("home.editDesc")} {t("home.tip")}
        </p>
      </div>

      {adding && (
        <SettingsGroup title={t("home.chooseFace")}>
          <div className={cn(CARD, "bg-[var(--sidebar)] p-3")}>
            <FaceGallery
              onPickClock={(face) => {
                setSelectedId(actions.add(face));
                setAdding(false);
              }}
              onPickWeather={(face) => {
                setSelectedId(actions.addWeather(face));
                setAdding(false);
              }}
            />
          </div>
        </SettingsGroup>
      )}

      {/* Customizable Logo, Search Bar, and Buttons */}
      <SettingsGroup title={t("home.elements")} description={t("home.elementsDesc")}>
        <div className={cn(CARD, "divide-y divide-[var(--line)]")}>
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--surface-container-high)] text-[var(--fg)]">
                <Sparkles size={16} />
              </span>
              <div>
                <span className="block font-medium text-sm">{t("home.element.logo")}</span>
                <span className="block text-xs text-[var(--muted)]">
                  {settings.launcherLayout.logo.custom ? t("home.element.customPos") : t("home.element.center")} • {settings.launcherLayout.logo.scale}%
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={openHomeEditor}
              className="rounded-full bg-[var(--surface-container-high)] px-3 py-1.5 text-xs font-medium hover:bg-[var(--surface-container-highest)] transition"
            >
              {t("home.edit")}
            </button>
          </div>

          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--surface-container-high)] text-[var(--fg)]">
                <Search size={16} />
              </span>
              <div>
                <span className="block font-medium text-sm">{t("home.element.search")}</span>
                <span className="block text-xs text-[var(--muted)]">
                  {settings.launcherLayout.search.custom ? t("home.element.customPos") : t("home.element.center")} • {settings.searchStyle.width}px
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={openHomeEditor}
              className="rounded-full bg-[var(--surface-container-high)] px-3 py-1.5 text-xs font-medium hover:bg-[var(--surface-container-highest)] transition"
            >
              {t("home.edit")}
            </button>
          </div>

          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--surface-container-high)] text-[var(--fg)]">
                <LayoutGrid size={16} />
              </span>
              <div>
                <span className="block font-medium text-sm">{t("home.element.buttons")}</span>
                <span className="block text-xs text-[var(--muted)]">
                  {settings.launcherLayout.buttons.custom ? t("home.element.customPos") : t("home.element.center")} • {settings.launcherLayout.buttons.columns} col
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={openHomeEditor}
              className="rounded-full bg-[var(--surface-container-high)] px-3 py-1.5 text-xs font-medium hover:bg-[var(--surface-container-highest)] transition"
            >
              {t("home.edit")}
            </button>
          </div>
        </div>
      </SettingsGroup>

      <SettingsGroup title={t("home.layout")}>
        <LayoutControls layout={settings.homeLayout} onChange={actions.layout} />
      </SettingsGroup>

      <SettingsGroup title={t("home.widgets")} description={t("home.widgetsDesc")}>
        <WidgetList
          widgets={settings.widgets}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onDuplicate={(id) => setSelectedId(actions.duplicate(id))}
          onRemove={remove}
          canDuplicate={!full}
        />
        {full && (
          <div className="mt-3">
            <Notice>{t("home.limit")}</Notice>
          </div>
        )}
      </SettingsGroup>

      {selected && (
        <SettingsGroup title={selected.type === "custom_html" ? selected.title || "Custom Widget" : t(`wf.f.${selected.face}`)}>
          <WidgetEditor
            key={selected.id}
            widget={selected}
            onChange={(patch) => actions.change(selected.id, patch)}
            onDuplicate={() => setSelectedId(actions.duplicate(selected.id))}
            onRemove={() => remove(selected.id)}
            canDuplicate={!full}
          />
        </SettingsGroup>
      )}
    </div>
  );
}
