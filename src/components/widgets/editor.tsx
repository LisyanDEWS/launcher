import { ChevronDown, Cloud, Code2, Copy, Folder, Maximize2, Move, RotateCcw, Search, Sparkles, Trash2, Watch, X } from "lucide-react";
import { useMemo, useState } from "react";
import Clock from "./Clock";
import { BUTTON, BUTTON_PRIMARY, CARD, FieldRow, INPUT, Segmented, SliderRow, ToggleRow } from "../ui";
import { cityName, timeZoneOptions } from "../../lib/clock";
import { FACE_META } from "../../lib/faces";
import { useI18n } from "../../lib/i18n";
import {
  CLOCK_FACES,
  WEATHER_FACES,
  BOOKMARK_LAYOUTS,
  DEFAULT_WIDGET,
  DEFAULT_WEATHER_WIDGET,
  DEFAULT_BOOKMARKS_WIDGET,
  HOME_LAYOUT_SCHEMA,
  HOUR_CYCLES,
  WIDGET_COLORS,
  limits,
  type ClockFaceId,
  type WeatherFaceId,
  type CustomHtmlWidget,
  type BookmarksWidget,
  type BookmarksLayout,
  type HomeWidget,
  type HomeLayout,
  type LauncherLayout,
  type SecondsMode,
  type ElementPosition,
  type ButtonsPosition,
  type SearchStyle,
} from "../../lib/settings";
import { SIZE_MAX, SIZE_MIN, captionText, faceFlags, widgetSize } from "../../lib/widgets";
import { cn } from "../../utils/cn";

/** A live widget scaled to fit a box (galleries, lists) with zero cropping. */
export function FaceThumb({ widget, maxWidth, maxHeight }: { widget: HomeWidget; maxWidth: number; maxHeight: number }) {
  const size = widgetSize(widget);
  const ratio = Math.max(0.4, size.width / Math.max(1, size.faceHeight));
  const baseWidth = 260;
  const baseHeight = Math.max(100, Math.round(baseWidth / ratio));
  const scale = Math.min(maxWidth / baseWidth, maxHeight / baseHeight);
  const displayWidth = Math.round(baseWidth * scale);
  const displayHeight = Math.round(baseHeight * scale);

  return (
    <div
      className="relative flex items-center justify-center select-none overflow-visible"
      style={{ width: `${displayWidth}px`, height: `${displayHeight}px` }}
    >
      <div
        style={{
          width: `${baseWidth}px`,
          height: `${baseHeight}px`,
          transform: `scale(${scale})`,
          transformOrigin: "center center",
          pointerEvents: "none",
        }}
        className="flex items-center justify-center shrink-0"
      >
        <Clock widget={widget} width={baseWidth} faceHeight={baseHeight} />
      </div>
    </div>
  );
}

const CITY_PRESETS = [
  "Moscow",
  "London",
  "New York",
  "Tokyo",
  "Paris",
  "Berlin",
  "Dubai",
  "Singapore",
  "Sydney",
];

/** All clock and 4 adaptive weather faces, bookmarks folder widget, and live previews. */
export function FaceGallery({
  value,
  base,
  onPickClock,
  onPickWeather,
  onPickBookmarks,
  onOpenHtmlStudio,
}: {
  value?: string;
  base?: Partial<HomeWidget>;
  onPickClock: (face: ClockFaceId) => void;
  onPickWeather: (face: WeatherFaceId) => void;
  onPickBookmarks?: (layout: BookmarksLayout) => void;
  onOpenHtmlStudio?: () => void;
}) {
  const { t, lang } = useI18n();
  const isRu = lang === "ru";
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "weather" | "bookmarks" | "clocks">(() =>
    value && !value.startsWith("w") && !value.startsWith("weather_") ? "clocks" : "all"
  );
  const [previewCity, setPreviewCity] = useState("Moscow");
  const [selectedBookmarkLayout, setSelectedBookmarkLayout] = useState<BookmarksLayout>("2x2");
  const [previewModalWidget, setPreviewModalWidget] = useState<HomeWidget | null>(null);

  const weatherGroups = useMemo(
    () => [
      {
        id: "weather",
        title: isRu ? "Погода" : "Weather",
        desc: isRu ? "Адаптивные виджеты: текущие условия, облачность, влажность и осадки" : "Adaptive widgets: conditions, clouds, humidity and rain",
        faces: [
          "w01_sunny",
          "w02_partly_cloudy",
          "w12_humidity_ring",
          "w15_rain_chance",
        ] as WeatherFaceId[],
      },
    ],
    [isRu]
  );

  const clockGroups = useMemo(
    () => [
      {
        id: "digital",
        title: t("wg.digital"),
        desc: isRu ? "Цифровые, перекидные, сегментные и бинарные часы" : "Flip, segmented, matrix, binary, and digital cards",
        faces: CLOCK_FACES.filter((f) => FACE_META[f]?.kind === "digital"),
      },
      {
        id: "analog",
        title: t("wg.analog"),
        desc: isRu ? "Стрелочные циферблаты в стилях Material You" : "Analog dials in Material 3 shapes",
        faces: CLOCK_FACES.filter((f) => FACE_META[f]?.kind === "analog"),
      },
    ],
    [isRu, t]
  );

  const query = search.trim().toLowerCase();

  // Filter items by search
  const filteredWeatherGroups = useMemo(() => {
    if (activeTab === "clocks" || activeTab === "bookmarks") return [];
    return weatherGroups
      .map((g) => ({
        ...g,
        faces: g.faces.filter((face) => {
          if (!query) return true;
          const label = t(`wf.f.${face}`).toLowerCase();
          return label.includes(query) || face.toLowerCase().includes(query);
        }),
      }))
      .filter((g) => g.faces.length > 0);
  }, [weatherGroups, activeTab, query, t]);

  const filteredClockGroups = useMemo(() => {
    if (activeTab === "weather" || activeTab === "bookmarks") return [];
    return clockGroups
      .map((g) => ({
        ...g,
        faces: g.faces.filter((face) => {
          if (!query) return true;
          const label = t(`wf.f.${face}`).toLowerCase();
          return label.includes(query) || face.toLowerCase().includes(query);
        }),
      }))
      .filter((g) => g.faces.length > 0);
  }, [clockGroups, activeTab, query, t]);

  const showBookmarksCard = (activeTab === "all" || activeTab === "bookmarks") && (!query || "bookmarks".includes(query) || "закладки".includes(query) || "папка".includes(query));

  return (
    <div className="space-y-3.5">
      {/* Search Bar for Widgets */}
      <div className="relative">
        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" aria-hidden="true" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={isRu ? "Поиск виджетов..." : "Search widgets..."}
          className="h-9 w-full rounded-xl bg-[var(--surface-container-high)] pl-9 pr-8 text-xs font-medium text-[var(--fg)] placeholder:text-[var(--muted)] outline-none ring-1 ring-[var(--line)] focus:ring-2 focus:ring-[var(--primary)] transition"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch("")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-[var(--muted)] hover:text-[var(--fg)] transition"
            aria-label="Clear"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {/* Category Pills (Clean Minimalist, Zero Emojis) */}
      <div className="flex gap-1 overflow-x-auto pb-0.5 scrollbar-none">
        {[
          { id: "all", label: isRu ? "Все" : "All" },
          { id: "bookmarks", label: isRu ? "Закладки" : "Bookmarks" },
          { id: "weather", label: isRu ? "Погода" : "Weather" },
          { id: "clocks", label: isRu ? "Часы" : "Clocks" },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-all duration-200",
              activeTab === tab.id
                ? "bg-[var(--primary)] text-[var(--on-primary)] shadow-xs font-semibold"
                : "bg-[var(--surface-container-high)] text-[var(--muted)] hover:bg-[var(--surface-container-highest)] hover:text-[var(--fg)]"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Bookmarks Folder Widget Picker Card */}
      {showBookmarksCard && (
        <div className="relative overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface-container-high)] p-3 shadow-xs">
          <div className="flex items-center justify-between pb-2">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--primary)] text-[var(--on-primary)] shadow-xs">
                <Folder size={14} />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-[var(--fg)]">
                  {isRu ? "Папка закладок" : "Bookmarks Folder"}
                </h4>
                <p className="text-[10px] text-[var(--muted)]">
                  {isRu ? "Сетка сайтов (1x1, 2x1, 2x2, 4x1, 4x2)" : "Bento bookmarks folder"}
                </p>
              </div>
            </div>
            {onPickBookmarks && (
              <button
                type="button"
                onClick={() => onPickBookmarks(selectedBookmarkLayout)}
                className="shrink-0 rounded-full bg-[var(--primary)] px-3 py-1 text-xs font-semibold text-[var(--on-primary)] transition hover:opacity-90 active:scale-95 shadow-xs"
              >
                {isRu ? "+ Добавить" : "+ Add"}
              </button>
            )}
          </div>

          {/* Layout Selector */}
          <div className="flex items-center gap-1 pt-1.5 border-t border-[var(--line)] text-[11px]">
            <span className="shrink-0 text-[10px] font-medium text-[var(--muted)] mr-1">{isRu ? "Сетка:" : "Grid:"}</span>
            {BOOKMARK_LAYOUTS.map((layout) => (
              <button
                key={layout}
                type="button"
                onClick={() => setSelectedBookmarkLayout(layout)}
                className={cn(
                  "flex-1 rounded-md py-0.5 text-center text-[10px] font-medium transition",
                  selectedBookmarkLayout === layout
                    ? "bg-[var(--primary)] text-[var(--on-primary)] font-semibold shadow-xs"
                    : "bg-[var(--surface-container-highest)] hover:bg-[var(--line)] text-[var(--muted)]"
                )}
              >
                {layout}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* HTML Widget Studio Hero Card */}
      {onOpenHtmlStudio && (
        <div className="relative overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface-container-high)] p-3 shadow-xs">
          <div className="flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-container-highest)] text-[var(--fg)] shadow-xs">
                <Code2 size={15} />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-[var(--fg)]">
                  {isRu ? "Свой HTML виджет" : "Custom HTML Widget"}
                </h4>
                <p className="text-[10px] text-[var(--muted)]">
                  {isRu ? "Редактор кода и превью" : "HTML workspace & preview"}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onOpenHtmlStudio}
              className="flex shrink-0 items-center gap-1 rounded-full bg-[var(--primary)] px-3 py-1 text-xs font-semibold text-[var(--on-primary)] shadow-xs hover:opacity-90 active:scale-95 transition"
            >
              <Sparkles size={12} />
              {isRu ? "Создать" : "Create"}
            </button>
          </div>
        </div>
      )}

      {/* Quick City Presets for Weather Preview */}
      {(activeTab !== "clocks" || filteredWeatherGroups.length > 0) && (
        <div className="flex items-center gap-1 overflow-x-auto pb-0.5 text-[11px] text-[var(--muted)] scrollbar-none">
          <span className="shrink-0 text-[10px] font-medium mr-1">{isRu ? "Город:" : "City:"}</span>
          {CITY_PRESETS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setPreviewCity(c)}
              className={cn(
                "shrink-0 rounded-md px-2 py-0.5 text-[10px] font-medium transition",
                previewCity === c
                  ? "bg-[var(--fg)] text-[var(--bg)] font-semibold"
                  : "bg-[var(--surface-container-high)] hover:bg-[var(--line)]"
              )}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      {/* Weather Groups */}
      {filteredWeatherGroups.map((group) => (
        <section key={group.id} className="space-y-2 pt-1">
          <div className="px-0.5">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--fg)]">{group.title}</h3>
            <p className="text-[10px] text-[var(--muted)]">{group.desc}</p>
          </div>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {group.faces.map((face) => {
              const preview: HomeWidget = {
                ...DEFAULT_WEATHER_WIDGET,
                id: `preview-weather-${face}`,
                face,
                city: previewCity,
                type: "weather",
                color: base?.color ?? "primary",
                label: "",
                opacity: 100,
              };
              const selected = value === face;
              return (
                <div
                  key={face}
                  className={cn(
                    "group relative flex flex-col justify-between rounded-2xl border p-3 transition-all duration-200",
                    selected
                      ? "border-[var(--primary)] bg-[var(--surface-container-highest)] ring-2 ring-[var(--primary)]"
                      : "border-[var(--line)] bg-[var(--surface)] hover:border-[var(--outline-variant)] hover:bg-[var(--surface-container-high)] shadow-xs"
                  )}
                >
                  {/* Quick Expand button */}
                  <button
                    type="button"
                    onClick={() => setPreviewModalWidget(preview)}
                    title={isRu ? "Развернуть во весь размер" : "Full unfolded preview"}
                    className="absolute right-2 top-2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--surface-container-highest)] text-[var(--muted)] opacity-70 hover:opacity-100 hover:text-[var(--fg)] hover:scale-110 transition"
                  >
                    <Maximize2 size={12} />
                  </button>

                  <div
                    onClick={() => setPreviewModalWidget(preview)}
                    className="mb-2 flex min-h-[120px] w-full cursor-zoom-in items-center justify-center overflow-visible rounded-xl py-1"
                  >
                    <FaceThumb widget={preview} maxWidth={220} maxHeight={120} />
                  </div>

                  <div className="flex items-center justify-between border-t border-[var(--line)] pt-2">
                    <span className="truncate pr-1 text-[11px] font-medium text-[var(--fg)]">
                      {t(`wf.f.${face}`)}
                    </span>
                    <button
                      type="button"
                      onClick={() => onPickWeather(face)}
                      className="shrink-0 rounded-full bg-[var(--primary)] px-3 py-1 text-[10px] font-semibold text-[var(--on-primary)] transition hover:opacity-90 active:scale-95 shadow-xs"
                    >
                      {isRu ? "+ Добавить" : "+ Add"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}

      {/* Clock Groups */}
      {filteredClockGroups.map((group) => (
        <section key={group.id} className="space-y-2 pt-1">
          <div className="px-0.5">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--fg)]">
              {group.title}
            </h3>
            <p className="text-[10px] text-[var(--muted)]">{group.desc}</p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {group.faces.map((face) => {
              const preview: HomeWidget = {
                ...DEFAULT_WIDGET,
                ...FACE_META[face]?.defaults,
                id: `preview-clock-${face}`,
                face,
                type: "clock",
                color: base?.color ?? "primary",
                label: "",
                opacity: 100,
              };
              const selected = value === face;
              return (
                <div
                  key={face}
                  className={cn(
                    "group relative flex flex-col items-center justify-between rounded-[20px] border p-2.5 transition-all duration-200",
                    selected
                      ? "border-[var(--primary)] bg-[var(--secondary-container)] ring-2 ring-[var(--primary)]"
                      : "border-[var(--line)] bg-[var(--surface)] hover:bg-[var(--surface-container-high)] shadow-sm"
                  )}
                >
                  {/* Quick Expand button */}
                  <button
                    type="button"
                    onClick={() => setPreviewModalWidget(preview)}
                    title={isRu ? "Развернуть во весь размер" : "Full unfolded preview"}
                    className="absolute right-1.5 top-1.5 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--surface-container-highest)] text-[var(--muted)] opacity-60 hover:opacity-100 hover:text-[var(--fg)] transition"
                  >
                    <Maximize2 size={10} />
                  </button>

                  <div
                    onClick={() => setPreviewModalWidget(preview)}
                    className="mb-1.5 flex min-h-[84px] w-full cursor-zoom-in items-center justify-center overflow-visible py-1"
                  >
                    <FaceThumb widget={preview} maxWidth={130} maxHeight={84} />
                  </div>

                  <div className="flex w-full items-center justify-between gap-1 border-t border-[var(--line)] pt-1.5">
                    <span className="truncate text-[11px] font-medium text-[var(--fg)]">
                      {t(`wf.f.${face}`)}
                    </span>
                    <button
                      type="button"
                      onClick={() => onPickClock(face)}
                      className="shrink-0 rounded-full bg-[var(--surface-container-highest)] px-2.5 py-0.5 text-[10px] font-semibold text-[var(--fg)] hover:bg-[var(--primary)] hover:text-[var(--on-primary)] transition active:scale-95"
                    >
                      +
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}

      {filteredWeatherGroups.length === 0 && filteredClockGroups.length === 0 && (
        <div className="py-8 text-center text-xs text-[var(--muted)]">
          {isRu ? "Ничего не найдено по вашему запросу" : "No widgets found matching your query"}
        </div>
      )}

      {/* Live Full-Size Unfolded Preview Modal */}
      {previewModalWidget && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="relative flex flex-col items-center max-w-sm w-full rounded-3xl bg-[var(--surface)] border border-[var(--line)] p-6 shadow-2xl">
            <div className="flex w-full items-center justify-between pb-3 border-b border-[var(--line)]">
              <div>
                <h3 className="text-sm font-semibold text-[var(--fg)]">
                  {previewModalWidget.type === "weather"
                    ? t(`wf.f.${previewModalWidget.face}`)
                    : previewModalWidget.type === "bookmarks"
                    ? (isRu ? "Папка закладок" : "Bookmarks")
                    : t(`wf.f.${previewModalWidget.face}`)}
                </h3>
                <p className="text-[11px] text-[var(--muted)]">
                  {isRu ? "Полноразмерный живой предпросмотр" : "Full unfolded live preview"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewModalWidget(null)}
                className="rounded-full p-1.5 text-[var(--muted)] hover:bg-[var(--surface-container-high)] hover:text-[var(--fg)] transition"
              >
                <X size={18} />
              </button>
            </div>

            <div className="my-5 flex items-center justify-center w-full min-h-[170px] p-2">
              <Clock
                widget={previewModalWidget}
                width={280}
                faceHeight={previewModalWidget.type === "weather" ? 170 : 190}
              />
            </div>

            <div className="flex w-full gap-2 pt-2 border-t border-[var(--line)]">
              <button
                type="button"
                onClick={() => {
                  if (previewModalWidget.type === "weather") {
                    onPickWeather(previewModalWidget.face as WeatherFaceId);
                  } else if (previewModalWidget.type === "clock") {
                    onPickClock(previewModalWidget.face as ClockFaceId);
                  } else if (previewModalWidget.type === "bookmarks" && onPickBookmarks) {
                    onPickBookmarks((previewModalWidget as BookmarksWidget).layout || "2x2");
                  }
                  setPreviewModalWidget(null);
                }}
                className={cn(BUTTON_PRIMARY, "flex-1 justify-center")}
              >
                {isRu ? "Добавить на экран" : "Add to home screen"}
              </button>
              <button
                type="button"
                onClick={() => setPreviewModalWidget(null)}
                className={cn(BUTTON, "px-4")}
              >
                {isRu ? "Закрыть" : "Close"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

type EditorProps = {
  widget: HomeWidget;
  onChange: (patch: Partial<HomeWidget>) => void;
  onDuplicate: () => void;
  onRemove: () => void;
  canDuplicate: boolean;
  onEditHtml?: () => void;
};

export function WidgetEditor({ widget, onChange, onDuplicate, onRemove, canDuplicate, onEditHtml }: EditorProps) {
  const { t, lang } = useI18n();
  const isRu = lang === "ru";
  const [picking, setPicking] = useState(false);
  const card = cn(CARD, "divide-y divide-[var(--line)]");

  // Custom HTML Widget settings
  if (widget.type === "custom_html") {
    return (
      <div className="space-y-4">
        <div className={CARD}>
          <div className="flex items-center gap-4 p-4">
            <span className="flex h-16 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[var(--surface-container-high)]" aria-hidden="true">
              <FaceThumb widget={widget} maxWidth={96} maxHeight={64} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-xs text-[var(--muted)]">{isRu ? "HTML Виджет" : "HTML Widget"}</div>
              <div className="truncate font-semibold">{widget.title || "Custom Card"}</div>
            </div>
            <button
              type="button"
              onClick={onEditHtml}
              className={cn(BUTTON_PRIMARY, "h-9 gap-1.5 px-3 text-xs shadow-sm")}
            >
              <Code2 size={15} />
              {isRu ? "Код" : "Code"}
            </button>
          </div>
        </div>

        <div className={card}>
          <SliderRow label={t("wg.size")} value={widget.size} min={SIZE_MIN} max={SIZE_MAX} step={4} unit=" px" onChange={(size) => onChange({ size })} />
          <FieldRow label={t("wg.color")}>
            <Segmented label={t("wg.color")} value={widget.color} onChange={(color) => onChange({ color })} options={WIDGET_COLORS.map((value) => ({ value, label: t(`wg.c.${value}`) }))} />
          </FieldRow>
          <SliderRow label={t("wg.opacity")} value={widget.opacity} min={20} max={100} unit="%" onChange={(opacity) => onChange({ opacity })} />
          <FieldRow label={isRu ? "Заголовок" : "Widget Title"}>
            <input
              value={widget.title}
              maxLength={40}
              onChange={(event) => onChange({ title: event.target.value })}
              placeholder={isRu ? "Название виджета" : "Widget Title"}
              className={cn(INPUT, "h-11")}
            />
          </FieldRow>
        </div>

        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={onDuplicate} disabled={!canDuplicate} className={BUTTON}>
            <Copy size={16} aria-hidden="true" />
            {t("wg.duplicate")}
          </button>
          <button type="button" onClick={onRemove} className={BUTTON}>
            <Trash2 size={16} aria-hidden="true" />
            {t("wg.remove")}
          </button>
        </div>
      </div>
    );
  }

  // Bookmarks Folder Widget settings
  if (widget.type === "bookmarks") {
    return (
      <div className="space-y-4">
        <div className={CARD}>
          <div className="flex items-center gap-4 p-4">
            <span className="flex h-16 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[var(--surface-container-high)]" aria-hidden="true">
              <FaceThumb widget={widget} maxWidth={96} maxHeight={64} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-xs text-[var(--muted)]">{isRu ? "Папка закладок" : "Bookmarks Folder"}</div>
              <div className="truncate font-semibold">{widget.title || (isRu ? "Закладки" : "Bookmarks")}</div>
              <div className="truncate text-xs text-[var(--muted)]">{widget.layout}</div>
            </div>
          </div>
        </div>

        <div className={card}>
          <FieldRow label={isRu ? "Заголовок папки" : "Folder Title"}>
            <input
              value={widget.title}
              maxLength={30}
              onChange={(event) => onChange({ title: event.target.value })}
              placeholder={isRu ? "Закладки" : "Bookmarks"}
              className={cn(INPUT, "h-11")}
            />
          </FieldRow>
          <FieldRow label={isRu ? "Сетка (формат)" : "Layout"}>
            <Segmented
              label="Layout"
              value={widget.layout}
              onChange={(layout) => onChange({ layout: layout as BookmarksLayout })}
              options={[
                { value: "1x1", label: "1x1" },
                { value: "2x1", label: "2x1" },
                { value: "2x2", label: "2x2" },
                { value: "4x1", label: "4x1" },
                { value: "4x2", label: "4x2" },
              ]}
            />
          </FieldRow>
          <SliderRow label={t("wg.size")} value={widget.size} min={SIZE_MIN} max={SIZE_MAX} step={4} unit=" px" onChange={(size) => onChange({ size })} />
          <FieldRow label={t("wg.color")}>
            <Segmented label={t("wg.color")} value={widget.color} onChange={(color) => onChange({ color })} options={WIDGET_COLORS.map((value) => ({ value, label: t(`wg.c.${value}`) }))} />
          </FieldRow>
          <SliderRow label={t("wg.opacity")} value={widget.opacity} min={20} max={100} unit="%" onChange={(opacity) => onChange({ opacity })} />
          <ToggleRow
            title={isRu ? "Горизонтальная прокрутка" : "Horizontal carousel"}
            description={isRu ? "Мотать закладки горизонтально пальцем или скроллом" : "Scroll bookmarks horizontally in a carousel"}
            checked={widget.scrollable === true}
            onChange={(scrollable) => onChange({ scrollable })}
          />
          <SliderRow
            label={isRu ? "Размер иконок" : "Icon size"}
            value={widget.iconSize || 40}
            min={28}
            max={64}
            step={2}
            unit=" px"
            onChange={(iconSize) => onChange({ iconSize })}
          />
          <ToggleRow
            title={isRu ? "Названия сайтов" : "Show site titles"}
            description={isRu ? "Отображать подписи под иконками" : "Show titles under website icons"}
            checked={widget.showLabels !== false}
            onChange={(showLabels) => onChange({ showLabels })}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={onDuplicate} disabled={!canDuplicate} className={BUTTON}>
            <Copy size={16} aria-hidden="true" />
            {t("wg.duplicate")}
          </button>
          <button type="button" onClick={onRemove} className={BUTTON}>
            <Trash2 size={16} aria-hidden="true" />
            {t("wg.remove")}
          </button>
        </div>
      </div>
    );
  }

  // Weather Widget settings
  if (widget.type === "weather") {
    return (
      <div className="space-y-4">
        <div className={CARD}>
          <div className="flex items-center gap-4 p-4">
            <span className="flex h-16 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[var(--surface-container-high)]" aria-hidden="true">
              <FaceThumb widget={widget} maxWidth={96} maxHeight={64} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-xs text-[var(--muted)]">{t("wg.weather")}</div>
              <div className="truncate font-semibold">{t(`wf.f.${widget.face}`)}</div>
              <div className="truncate text-xs text-[var(--muted)]">{widget.city} • {widget.unit.toUpperCase()}</div>
            </div>
            <button type="button" onClick={() => setPicking((open) => !open)} aria-expanded={picking} className={BUTTON}>
              {t("wg.change")}
              <ChevronDown size={16} className={cn("transition-transform duration-300", picking && "rotate-180")} aria-hidden="true" />
            </button>
          </div>
          {picking && (
            <div className="border-t border-[var(--line)] bg-[var(--sidebar)] p-3">
              <FaceGallery
                value={widget.face}
                base={{ color: widget.color }}
                onPickClock={(face) => {
                  onChange({ type: "clock", face });
                  setPicking(false);
                }}
                onPickWeather={(face) => {
                  onChange({ type: "weather", face });
                  setPicking(false);
                }}
              />
            </div>
          )}
        </div>

        <div className={card}>
          <SliderRow label={t("wg.size")} value={widget.size} min={SIZE_MIN} max={SIZE_MAX} step={4} unit=" px" onChange={(size) => onChange({ size })} />
          <FieldRow label={t("wg.color")}>
            <Segmented label={t("wg.color")} value={widget.color} onChange={(color) => onChange({ color })} options={WIDGET_COLORS.map((value) => ({ value, label: t(`wg.c.${value}`) }))} />
          </FieldRow>
          <SliderRow label={t("wg.opacity")} value={widget.opacity} min={20} max={100} unit="%" onChange={(opacity) => onChange({ opacity })} />
        </div>

        <div className={card}>
          <FieldRow label={t("wg.city")}>
            <div className="flex flex-col gap-2">
              <input
                value={widget.city}
                onChange={(e) => onChange({ city: e.target.value })}
                placeholder="Moscow, London, New York..."
                className={cn(INPUT, "h-11")}
              />
              <div className="flex flex-wrap gap-1">
                {CITY_PRESETS.map((city) => (
                  <button
                    key={city}
                    type="button"
                    onClick={() => onChange({ city })}
                    className={cn(
                      "rounded-full px-2.5 py-1 text-xs transition",
                      widget.city.toLowerCase() === city.toLowerCase()
                        ? "bg-[var(--primary)] text-[var(--on-primary)] font-medium"
                        : "bg-[var(--surface-container-high)] text-[var(--muted)] hover:text-[var(--fg)]"
                    )}
                  >
                    {city}
                  </button>
                ))}
              </div>
            </div>
          </FieldRow>
          <FieldRow label={t("wg.unit")}>
            <Segmented
              label={t("wg.unit")}
              value={widget.unit}
              onChange={(unit) => onChange({ unit })}
              options={[
                { value: "c", label: t("wg.unit.c") },
                { value: "f", label: t("wg.unit.f") },
              ]}
            />
          </FieldRow>
          <FieldRow label={t("wg.label")} hint={t("wg.labelHint")}>
            <input
              value={widget.label}
              maxLength={40}
              onChange={(event) => onChange({ label: event.target.value })}
              placeholder={widget.city}
              aria-label={t("wg.label")}
              className={cn(INPUT, "h-11")}
            />
          </FieldRow>
        </div>

        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={onDuplicate} disabled={!canDuplicate} className={BUTTON}>
            <Copy size={16} aria-hidden="true" />
            {t("wg.duplicate")}
          </button>
          <button type="button" onClick={onRemove} className={BUTTON}>
            <Trash2 size={16} aria-hidden="true" />
            {t("wg.remove")}
          </button>
        </div>
      </div>
    );
  }

  // Clock Widget settings
  const meta = FACE_META[widget.face] ?? FACE_META.classic;
  const zones = timeZoneOptions();
  const secondsOptions: { value: SecondsMode; label: string }[] = [
    { value: "off", label: t("common.none") },
    { value: "tick", label: t("wg.s.tick") },
    ...(meta.sweep ? [{ value: "sweep" as const, label: t("wg.s.sweep") }] : []),
  ];

  return (
    <div className="space-y-4">
      <div className={CARD}>
        <div className="flex items-center gap-4 p-4">
          <span className="flex h-16 w-24 shrink-0 items-center justify-center" aria-hidden="true">
            <FaceThumb widget={widget} maxWidth={96} maxHeight={64} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-xs text-[var(--muted)]">{t("wg.face")}</div>
            <div className="truncate font-semibold">{t(`wf.f.${widget.face}`)}</div>
          </div>
          <button type="button" onClick={() => setPicking((open) => !open)} aria-expanded={picking} className={BUTTON}>
            {t("wg.change")}
            <ChevronDown size={16} className={cn("transition-transform duration-300", picking && "rotate-180")} aria-hidden="true" />
          </button>
        </div>
        {picking && (
          <div className="border-t border-[var(--line)] bg-[var(--sidebar)] p-3">
            <FaceGallery
              value={widget.face}
              base={{ color: widget.color, hourCycle: widget.hourCycle, timeZone: widget.timeZone }}
              onPickClock={(face) => {
                onChange({ type: "clock", face });
                setPicking(false);
              }}
              onPickWeather={(face) => {
                onChange({ type: "weather", face });
                setPicking(false);
              }}
            />
          </div>
        )}
      </div>

      <div className={card}>
        <SliderRow label={t("wg.size")} value={widget.size} min={SIZE_MIN} max={SIZE_MAX} step={4} unit=" px" onChange={(size) => onChange({ size })} />
        <FieldRow label={t("wg.color")}>
          <Segmented label={t("wg.color")} value={widget.color} onChange={(color) => onChange({ color })} options={WIDGET_COLORS.map((value) => ({ value, label: t(`wg.c.${value}`) }))} />
        </FieldRow>
        <SliderRow label={t("wg.opacity")} value={widget.opacity} min={20} max={100} unit="%" onChange={(opacity) => onChange({ opacity })} />
      </div>

      <div className={card}>
        <FieldRow label={t("wg.seconds")} hint={meta.seconds ? undefined : t("wg.unavailable")}>
          <Segmented
            label={t("wg.seconds")}
            value={!meta.sweep && widget.seconds === "sweep" ? "tick" : widget.seconds}
            onChange={(seconds) => onChange({ seconds })}
            options={secondsOptions}
            disabled={!meta.seconds}
          />
        </FieldRow>
        <ToggleRow
          title={t("wg.date")}
          description={meta.date ? undefined : t("wg.unavailable")}
          checked={meta.date && widget.date}
          onChange={(date) => onChange({ date })}
          disabled={!meta.date}
        />
        <FieldRow label={t("wg.format")} hint={meta.format ? undefined : t("wg.unavailable")}>
          <Segmented
            label={t("wg.format")}
            value={widget.hourCycle}
            onChange={(hourCycle) => onChange({ hourCycle })}
            options={HOUR_CYCLES.map((value) => ({ value, label: t(`wg.f.${value}`) }))}
            disabled={!meta.format}
          />
        </FieldRow>
      </div>

      <div className={card}>
        <FieldRow label={t("wg.tz")}>
          <select value={widget.timeZone} onChange={(event) => onChange({ timeZone: event.target.value })} aria-label={t("wg.tz")} className={cn(INPUT, "h-12 cursor-pointer")}>
            <option value="local">{t("wg.tz.local")}</option>
            {zones.map((zone) => (
              <option key={zone.id} value={zone.id}>
                {zone.label}
              </option>
            ))}
          </select>
        </FieldRow>
        <FieldRow label={t("wg.label")} hint={t("wg.labelHint")}>
          <input
            value={widget.label}
            maxLength={40}
            onChange={(event) => onChange({ label: event.target.value })}
            placeholder={widget.timeZone !== "local" ? cityName(widget.timeZone) : t("wg.label")}
            aria-label={t("wg.label")}
            className={cn(INPUT, "h-12")}
          />
        </FieldRow>
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={onDuplicate} disabled={!canDuplicate} className={BUTTON}>
          <Copy size={16} aria-hidden="true" />
          {t("wg.duplicate")}
        </button>
        <button type="button" onClick={onRemove} className={BUTTON}>
          <Trash2 size={16} aria-hidden="true" />
          {t("wg.remove")}
        </button>
      </div>
    </div>
  );
}

/** Inspector for System Elements: Logo, Search Bar, Bookmarks */
export function SystemElementEditor({
  elementKey,
  layout,
  style,
  onChangeLayout,
  onChangeStyle,
  onResetCenter,
  onRequestRemove,
}: {
  elementKey: "__system_logo__" | "__system_search__" | "__system_buttons__" | "__system_add_button__";
  layout: LauncherLayout;
  style: SearchStyle;
  onChangeLayout: (patch: Partial<LauncherLayout>) => void;
  onChangeStyle: (patch: Partial<SearchStyle>) => void;
  onResetCenter: () => void;
  onRequestRemove?: () => void;
}) {
  const { t, lang } = useI18n();
  const isRu = lang === "ru";
  const card = cn(CARD, "divide-y divide-[var(--line)]");

  if (elementKey === "__system_logo__") {
    const l = layout.logo;
    return (
      <div className="space-y-4">
        {!l.visible && (
          <div className="rounded-2xl bg-amber-500/10 border border-amber-500/20 p-3 text-xs text-amber-500 flex items-center justify-between">
            <span>{isRu ? "Логотип скрыт с экрана" : "Logo is currently hidden"}</span>
            <button
              type="button"
              onClick={() => onChangeLayout({ logo: { ...l, visible: true } })}
              className="rounded-full bg-amber-500 text-black px-2.5 py-1 text-xs font-semibold hover:opacity-90"
            >
              {isRu ? "Показать" : "Show"}
            </button>
          </div>
        )}
        <div className="p-1">
          <p className="text-xs text-[var(--muted)]">{t("home.elementsDesc")}</p>
        </div>
        <div className={card}>
          <ToggleRow
            title={t("home.element.customPos")}
            description="Drag freely on screen or keep centered"
            checked={l.custom}
            onChange={(custom) => onChangeLayout({ logo: { ...l, custom } })}
          />
          <SliderRow
            label={t("sb.width")}
            value={l.width}
            min={120}
            max={800}
            step={8}
            unit=" px"
            onChange={(width) => onChangeLayout({ logo: { ...l, width } })}
          />
          <SliderRow
            label={t("home.element.scale")}
            value={l.scale}
            min={50}
            max={200}
            step={5}
            unit="%"
            onChange={(scale) => onChangeLayout({ logo: { ...l, scale } })}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={onResetCenter} className={BUTTON}>
            <RotateCcw size={15} />
            {t("home.element.center")}
          </button>
          <button
            type="button"
            onClick={() => onChangeLayout({ logo: { ...l, visible: !l.visible } })}
            className={BUTTON}
          >
            <Trash2 size={15} />
            {l.visible ? (isRu ? "Скрыть логотип" : "Hide logo") : (isRu ? "Показать логотип" : "Show logo")}
          </button>
        </div>
      </div>
    );
  }

  if (elementKey === "__system_search__") {
    const l = layout.search;
    return (
      <div className="space-y-4">
        {!l.visible && (
          <div className="rounded-2xl bg-amber-500/10 border border-amber-500/20 p-3 text-xs text-amber-500 flex items-center justify-between">
            <span>{isRu ? "Строка поиска скрыта" : "Search bar is currently hidden"}</span>
            <button
              type="button"
              onClick={() => onChangeLayout({ search: { ...l, visible: true } })}
              className="rounded-full bg-amber-500 text-black px-2.5 py-1 text-xs font-semibold hover:opacity-90"
            >
              {isRu ? "Вернуть поиск" : "Restore search"}
            </button>
          </div>
        )}
        <div className="p-1">
          <p className="text-xs text-[var(--muted)]">{t("home.elementsDesc")}</p>
        </div>
        <div className={card}>
          <ToggleRow
            title={t("home.element.customPos")}
            description="Drag search bar anywhere on screen"
            checked={l.custom}
            onChange={(custom) => onChangeLayout({ search: { ...l, custom } })}
          />
          <SliderRow
            label={t("sb.width")}
            value={style.width}
            min={320}
            max={1200}
            step={8}
            unit=" px"
            onChange={(width) => {
              onChangeStyle({ width });
              onChangeLayout({ search: { ...l, width } });
            }}
          />
          <SliderRow
            label={t("sb.height")}
            value={style.height}
            min={44}
            max={100}
            step={2}
            unit=" px"
            onChange={(height) => onChangeStyle({ height })}
          />
          <SliderRow
            label={t("home.element.scale")}
            value={l.scale}
            min={50}
            max={200}
            step={5}
            unit="%"
            onChange={(scale) => onChangeLayout({ search: { ...l, scale } })}
          />
          <SliderRow
            label={t("sb.radius")}
            value={style.radius}
            min={0}
            max={48}
            step={2}
            unit=" px"
            onChange={(radius) => onChangeStyle({ radius })}
          />
        </div>

        {/* AI search button configuration */}
        <div className={card}>
          <ToggleRow
            title={t("sb.aiButton")}
            description={t("sb.aiButtonDesc")}
            checked={style.aiButton}
            onChange={(aiButton) => onChangeStyle({ aiButton })}
          />
          {style.aiButton && (
            <>
              <SliderRow
                label={t("sb.aiButtonSize")}
                value={style.aiButtonSize}
                min={24}
                max={48}
                step={2}
                unit=" px"
                onChange={(aiButtonSize) => onChangeStyle({ aiButtonSize })}
              />
              <FieldRow label={t("sb.aiButtonStyle")}>
                <Segmented
                  label={t("sb.aiButtonStyle")}
                  value={style.aiButtonStyle}
                  onChange={(aiButtonStyle) => onChangeStyle({ aiButtonStyle: aiButtonStyle as any })}
                  options={[
                    { value: "accent", label: "Accent" },
                    { value: "tonal", label: "Tonal" },
                    { value: "glow", label: "Glow" },
                    { value: "minimal", label: "Minimal" },
                  ]}
                />
              </FieldRow>
              <FieldRow label={t("sb.aiButtonIcon")}>
                <Segmented
                  label={t("sb.aiButtonIcon")}
                  value={style.aiButtonIcon}
                  onChange={(aiButtonIcon) => onChangeStyle({ aiButtonIcon: aiButtonIcon as any })}
                  options={[
                    { value: "sparkles", label: "Sparkles" },
                    { value: "bot", label: "Bot" },
                    { value: "brain", label: "Brain" },
                    { value: "zap", label: "Zap" },
                  ]}
                />
              </FieldRow>
            </>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={onResetCenter} className={BUTTON}>
            <RotateCcw size={15} />
            {t("home.element.center")}
          </button>
          <button
            type="button"
            onClick={() => {
              if (l.visible) {
                onRequestRemove ? onRequestRemove() : onChangeLayout({ search: { ...l, visible: false } });
              } else {
                onChangeLayout({ search: { ...l, visible: true } });
              }
            }}
            className={cn(BUTTON, l.visible && "text-red-400 hover:text-red-300")}
          >
            <Trash2 size={15} />
            {l.visible ? (isRu ? "Удалить строку поиска" : "Remove search bar") : (isRu ? "Вернуть поиск" : "Restore search")}
          </button>
        </div>
      </div>
    );
  }

  if (elementKey === "__system_add_button__") {
    const a = layout.addButton;
    return (
      <div className="space-y-4">
        {!a.visible && (
          <div className="rounded-2xl bg-amber-500/10 border border-amber-500/20 p-3 text-xs text-amber-500 flex items-center justify-between">
            <span>{isRu ? "Кнопка «+ Добавить» скрыта" : "Add button is currently hidden"}</span>
            <button
              type="button"
              onClick={() => onChangeLayout({ addButton: { ...a, visible: true } })}
              className="rounded-full bg-amber-500 text-black px-2.5 py-1 text-xs font-semibold hover:opacity-90"
            >
              {isRu ? "Показать" : "Show"}
            </button>
          </div>
        )}
        <div className="p-1">
          <p className="text-xs text-[var(--muted)]">
            {isRu
              ? "Перемещайте отдельную кнопку «+ Добавить» в любую точку экрана, меняйте размер во всех направлениях или удалите вовсе."
              : "Move the standalone Add Bookmark button anywhere on screen, scale it, expand in all directions, or remove completely."}
          </p>
        </div>
        <div className={card}>
          <ToggleRow
            title={t("home.element.customPos")}
            description={isRu ? "Свободное перемещение по экрану" : "Drag anywhere freely on screen"}
            checked={a.custom}
            onChange={(custom) => onChangeLayout({ addButton: { ...a, custom } })}
          />
          <SliderRow
            label={t("sb.width")}
            value={a.width}
            min={140}
            max={600}
            step={8}
            unit=" px"
            onChange={(width) => onChangeLayout({ addButton: { ...a, width } })}
          />
          <SliderRow
            label={t("home.element.scale")}
            value={a.scale}
            min={50}
            max={200}
            step={5}
            unit="%"
            onChange={(scale) => onChangeLayout({ addButton: { ...a, scale } })}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={onResetCenter} className={BUTTON}>
            <RotateCcw size={15} />
            {t("home.element.center")}
          </button>
          <button
            type="button"
            onClick={() => onChangeLayout({ addButton: { ...a, visible: !a.visible } })}
            className={cn(BUTTON, a.visible && "text-red-400 hover:text-red-300")}
          >
            <Trash2 size={15} />
            {a.visible ? (isRu ? "Удалить кнопку «+ Добавить»" : "Remove Add button") : (isRu ? "Показать кнопку" : "Show button")}
          </button>
        </div>
      </div>
    );
  }

  // Bookmarks / Other Buttons
  const b = layout.buttons;
  return (
    <div className="space-y-4">
      {!b.visible && (
        <div className="rounded-2xl bg-amber-500/10 border border-amber-500/20 p-3 text-xs text-amber-500 flex items-center justify-between">
          <span>{isRu ? "Панель закладок скрыта" : "Bookmarks bar is currently hidden"}</span>
          <button
            type="button"
            onClick={() => onChangeLayout({ buttons: { ...b, visible: true } })}
            className="rounded-full bg-amber-500 text-black px-2.5 py-1 text-xs font-semibold hover:opacity-90"
          >
            {isRu ? "Показать" : "Show"}
          </button>
        </div>
      )}
      <div className="p-1">
        <p className="text-xs text-[var(--muted)]">{t("home.elementsDesc")}</p>
      </div>
      <div className={card}>
        <ToggleRow
          title={t("home.element.customPos")}
          description="Position bookmarks block anywhere"
          checked={b.custom}
          onChange={(custom) => onChangeLayout({ buttons: { ...b, custom } })}
        />
        <SliderRow
          label={t("sb.width")}
          value={b.width}
          min={320}
          max={1200}
          step={8}
          unit=" px"
          onChange={(width) => onChangeLayout({ buttons: { ...b, width } })}
        />
        <SliderRow
          label={t("home.element.scale")}
          value={b.scale}
          min={50}
          max={200}
          step={5}
          unit="%"
          onChange={(scale) => onChangeLayout({ buttons: { ...b, scale } })}
        />
        <SliderRow
          label={t("home.element.columns")}
          value={b.columns}
          min={2}
          max={8}
          step={1}
          onChange={(columns) => onChangeLayout({ buttons: { ...b, columns } })}
        />
        <SliderRow
          label={t("home.element.iconSize")}
          value={b.iconSize}
          min={40}
          max={80}
          step={4}
          unit=" px"
          onChange={(iconSize) => onChangeLayout({ buttons: { ...b, iconSize } })}
        />
        <ToggleRow
          title={isRu ? "Кнопка «+» внутри сетки" : "Show '+' tile in grid"}
          description={isRu ? "Отображать плитку добавления закладки в сетке" : "Display inline add bookmark card in shortcuts grid"}
          checked={b.showAddButton === true}
          onChange={(showAddButton) => onChangeLayout({ buttons: { ...b, showAddButton } })}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={onResetCenter} className={BUTTON}>
          <RotateCcw size={15} />
          {t("home.element.center")}
        </button>
        <button
          type="button"
          onClick={() => onChangeLayout({ buttons: { ...b, visible: !b.visible } })}
          className={cn(BUTTON, b.visible && "text-red-400 hover:text-red-300")}
        >
          <Trash2 size={15} />
          {b.visible ? (isRu ? "Удалить панель закладок" : "Remove bookmarks bar") : (isRu ? "Показать панель закладок" : "Show bookmarks bar")}
        </button>
      </div>
    </div>
  );
}

export function LayoutControls({ layout, onChange }: { layout: HomeLayout; onChange: (patch: Partial<HomeLayout>) => void }) {
  const { t } = useI18n();
  return (
    <div className={cn(CARD, "divide-y divide-[var(--line)]")}>
      <FieldRow label={t("home.layout")} hint={layout.mode === "grid" ? t("home.mode.gridDesc") : t("home.mode.freeDesc")}>
        <Segmented
          label={t("home.layout")}
          value={layout.mode}
          onChange={(mode) => onChange({ mode })}
          options={[
            { value: "free", label: t("home.mode.free") },
            { value: "grid", label: t("home.mode.grid") },
          ]}
        />
      </FieldRow>
      {layout.mode === "grid" ? (
        <>
          <SliderRow label={t("home.cell")} value={layout.cell} {...limits(HOME_LAYOUT_SCHEMA.cell)} unit=" px" onChange={(cell) => onChange({ cell })} />
          <FieldRow label={t("home.showGrid")}>
            <Segmented
              label={t("home.showGrid")}
              value={layout.showGrid}
              onChange={(showGrid) => onChange({ showGrid })}
              options={(["editing", "always", "never"] as const).map((value) => ({ value, label: t(`home.grid.${value}`) }))}
            />
          </FieldRow>
        </>
      ) : (
        <ToggleRow title={t("home.guides")} description={t("home.guidesDesc")} checked={layout.guides} onChange={(guides) => onChange({ guides })} />
      )}
    </div>
  );
}

type ListProps = {
  widgets: HomeWidget[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onDuplicate: (id: string) => void;
  onRemove: (id: string) => void;
  canDuplicate: boolean;
};

export function WidgetList({ widgets, selectedId, onSelect, onDuplicate, onRemove, canDuplicate }: ListProps) {
  const { t } = useI18n();
  const iconButton = "flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition hover:bg-[var(--surface-container-highest)] disabled:opacity-40";

  return (
    <div className={cn(CARD, "divide-y divide-[var(--line)]")}>
      {widgets.map((widget) => {
        const selected = widget.id === selectedId;
        const name = widget.type === "custom_html" ? widget.title || "Custom Widget" : t(`wf.f.${widget.face}`);
        return (
          <div
            key={widget.id}
            className={cn(
              "flex items-center gap-2 px-3 py-2 transition",
              selected ? "bg-[var(--secondary-container)] text-[var(--on-secondary-container)]" : "hover:bg-[var(--surface-container-high)]",
            )}
          >
            <button type="button" onClick={() => onSelect(selected ? null : widget.id)} aria-pressed={selected} className="flex min-w-0 flex-1 items-center gap-3 text-start">
              <span className="pointer-events-none flex h-12 w-16 shrink-0 items-center justify-center" aria-hidden="true">
                <FaceThumb widget={widget} maxWidth={64} maxHeight={44} />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">{name}</span>
                <span className="block truncate text-xs opacity-70">
                  {widget.type === "weather" ? `${widget.city}` : (captionText(widget) || t("wg.tz.local"))}
                </span>
              </span>
            </button>
            <button type="button" onClick={() => onDuplicate(widget.id)} disabled={!canDuplicate} title={t("wg.duplicate")} aria-label={`${t("wg.duplicate")}: ${name}`} className={iconButton}>
              <Copy size={16} aria-hidden="true" />
            </button>
            <button type="button" onClick={() => onRemove(widget.id)} title={t("wg.remove")} aria-label={`${t("wg.remove")}: ${name}`} className={iconButton}>
              <Trash2 size={16} aria-hidden="true" />
            </button>
          </div>
        );
      })}
      {!widgets.length && <p className="px-5 py-5 text-sm leading-6 text-[var(--muted)]">{t("home.empty")}</p>}
    </div>
  );
}
