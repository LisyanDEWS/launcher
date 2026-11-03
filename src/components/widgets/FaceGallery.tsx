import { CalendarDays, Clock3, Cloud, Code2, Eye, Folder, Plus, Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import Clock from "./Clock";
import { FaceThumb } from "./FaceThumb";
import { FACE_META } from "../../lib/faces";
import { useI18n, type MessageKey } from "../../lib/i18n";
import {
  BOOKMARK_LAYOUTS,
  BOOKMARK_LAYOUT_LABELS,
  CLOCK_FACES,
  WEATHER_FACES,
  DEFAULT_BOOKMARKS_WIDGET,
  DEFAULT_WEATHER_WIDGET,
  DEFAULT_WIDGET,
  type BookmarksLayout,
  type ClockFaceId,
  type HomeWidget,
  type WeatherFaceId,
} from "../../lib/settings";
import { WEATHER_RATIOS, widgetSize } from "../../lib/widgets";
import { cn } from "../../utils/cn";

export type GalleryTab = "all" | "clocks" | "weather" | "calendar" | "more";
type Tab = GalleryTab;



/** Compact one-tap widget picker. Tapping a card adds the widget immediately. */
export function FaceGallery({
  value,
  base,
  onPickClock,
  onPickWeather,
  onPickBookmarks,
  onOpenHtmlStudio,
  initialTab = "all",
}: {
  initialTab?: GalleryTab;
  value?: string;
  base?: Partial<HomeWidget>;
  onPickClock: (face: ClockFaceId) => void;
  onPickWeather: (face: WeatherFaceId) => void;
  onPickBookmarks?: (layout: BookmarksLayout) => void;
  onOpenHtmlStudio?: () => void;
}) {
  const { t, lang } = useI18n();
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<Tab>(initialTab);
  const [bookmarkLayout, setBookmarkLayout] = useState<BookmarksLayout>("2x2");
  const [preview, setPreview] = useState<HomeWidget | null>(null);

  const query = search.trim().toLowerCase();
  const matches = (face: string) => !query || t(`wf.f.${face}` as MessageKey).toLowerCase().includes(query) || face.includes(query);

  const clockPreview = (face: ClockFaceId): HomeWidget => ({
    ...DEFAULT_WIDGET,
    ...FACE_META[face]?.defaults,
    id: `preview-clock-${face}`,
    face,
    type: "clock",
    color: base?.color ?? "primary",
    label: "",
    opacity: 100,
  });
  const weatherPreview = (face: WeatherFaceId): HomeWidget => ({
    ...DEFAULT_WEATHER_WIDGET,
    id: `preview-weather-${face}`,
    face,
    type: "weather",
    color: base?.color ?? "primary",
    label: "",
    opacity: 100,
  });
  const bookmarksPreview: HomeWidget = useMemo(
    () => ({ ...DEFAULT_BOOKMARKS_WIDGET, id: "preview-bookmarks", type: "bookmarks", face: "bookmarks", layout: bookmarkLayout, label: "", opacity: 100 }),
    [bookmarkLayout],
  );

  const isMaterial = (f: string) => f.startsWith("m3_");
  const material = CLOCK_FACES.filter((f) => isMaterial(f) && matches(f));
  const digital = CLOCK_FACES.filter((f) => !isMaterial(f) && FACE_META[f]?.kind === "digital" && matches(f));
  const analog = CLOCK_FACES.filter((f) => !isMaterial(f) && FACE_META[f]?.kind === "analog" && matches(f));
  const calendars = CLOCK_FACES.filter((f) => FACE_META[f]?.kind === "calendar" && matches(f));
  const weather = WEATHER_FACES.filter(matches);

  const showClocks = tab === "all" || tab === "clocks";
  const showWeather = tab === "all" || tab === "weather";
  const showCalendar = tab === "all" || tab === "calendar";
  const showMore = (tab === "all" || tab === "more") && (!query || "bookmarks html custom закладки папка код".includes(query));

  const tabs: { id: Tab; label: string; icon: typeof Clock3 }[] = [
    { id: "all", label: t("wg.all"), icon: Plus },
    { id: "clocks", label: t("wg.clock"), icon: Clock3 },
    { id: "weather", label: t("wg.weather"), icon: Cloud },
    { id: "calendar", label: t("wg.calendar"), icon: CalendarDays },
    { id: "more", label: t("home.create"), icon: Code2 },
  ];

  const Card = ({ widget, selected, onAdd, wide }: { widget: HomeWidget; selected: boolean; onAdd: () => void; wide?: boolean }) => {
    const size = widgetSize(widget);
    const ratio = size.width / Math.max(1, size.faceHeight);
    return (
      <div className={cn("fg-card group relative", wide && "col-span-2", selected && "is-selected")}>
        <button type="button" onClick={onAdd} className="fg-card-main" aria-label={`${t("home.add")}: ${cardTitle(widget)}`}>
          <span className="fg-thumb" style={{ height: wide ? 96 : ratio > 1.3 ? 64 : 78 }}>
            <FaceThumb widget={widget} maxWidth={wide ? 230 : 120} maxHeight={wide ? 96 : ratio > 1.3 ? 64 : 78} />
          </span>
          <span className="fg-title">{cardTitle(widget)}</span>
        </button>
        <span className="fg-add" aria-hidden="true">
          <Plus size={13} strokeWidth={2.6} />
        </span>
        <button type="button" onClick={() => setPreview(widget)} className="fg-eye" title={t("home.preview")} aria-label={t("home.preview")}>
          <Eye size={13} />
        </button>
      </div>
    );
  };

  function cardTitle(widget: HomeWidget) {
    if (widget.type === "bookmarks") return widget.title || t("wf.f.bookmarks");
    if (widget.type === "custom_html") return widget.title;
    return t(`wf.f.${widget.face}` as MessageKey);
  }

  const Section = ({ title, children }: { title: string; children: ReactNode }) => (
    <section className="space-y-1.5">
      <h3 className="px-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">{title}</h3>
      <div className="grid grid-cols-2 gap-2">{children}</div>
    </section>
  );

  return (
    <div className="space-y-3">
      <p className="px-0.5 text-xs leading-5 text-[var(--muted)]">{t("home.tapToAdd")}</p>

      <div className="relative">
        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" aria-hidden="true" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("wg.searchWidgets")}
          className="h-10 w-full rounded-full bg-[var(--surface-container-high)] pl-9 pr-9 text-sm text-[var(--fg)] outline-none transition placeholder:text-[var(--muted)] focus:bg-[var(--surface-container-highest)]"
        />
        {search && (
          <button type="button" onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-[var(--muted)] hover:bg-[var(--surface-container-highest)] hover:text-[var(--fg)]" aria-label="Clear">
            <X size={14} />
          </button>
        )}
      </div>

      <div role="tablist" className="flex gap-1 overflow-x-auto pb-0.5 scrollbar-none">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={cn(
              "flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-xs font-medium transition-all duration-300",
              tab === id ? "rounded-[11px] bg-[var(--primary)] text-[var(--on-primary)]" : "bg-[var(--surface-container-high)] text-[var(--muted)] hover:bg-[var(--surface-container-highest)] hover:text-[var(--fg)]",
            )}
          >
            <Icon size={13} aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>

      {showMore && (onPickBookmarks || onOpenHtmlStudio) && (
        <Section title={t("home.create")}>
          {onPickBookmarks && (
            <div className="fg-card col-span-2 is-flat">
              <button type="button" onClick={() => onPickBookmarks(bookmarkLayout)} className="fg-card-main" aria-label={`${t("home.add")}: ${t("wf.f.bookmarks")}`}>
                <span className="fg-thumb" style={{ height: 104 }}>
                  <FaceThumb widget={bookmarksPreview} maxWidth={240} maxHeight={104} />
                </span>
              </button>
              <div className="flex items-center gap-2 border-t border-[var(--line)] px-2.5 py-2">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--primary)] text-[var(--on-primary)]">
                  <Folder size={14} />
                </span>
                <div className="flex min-w-0 flex-1 flex-wrap gap-1">
                  {BOOKMARK_LAYOUTS.map((layout) => (
                    <button
                      key={layout}
                      type="button"
                      onClick={() => setBookmarkLayout(layout)}
                      className={cn(
                        "h-6 rounded-full px-2 text-[10px] font-semibold transition-all duration-300",
                        bookmarkLayout === layout ? "rounded-md bg-[var(--fg)] text-[var(--bg)]" : "bg-[var(--surface-container-highest)] text-[var(--muted)] hover:text-[var(--fg)]",
                      )}
                    >
                      {BOOKMARK_LAYOUT_LABELS[layout][lang.startsWith("ru") ? 1 : 0]}
                    </button>
                  ))}
                </div>
                <button type="button" onClick={() => onPickBookmarks(bookmarkLayout)} className="fg-cta">
                  <Plus size={14} strokeWidth={2.6} />
                </button>
              </div>
            </div>
          )}
          {onOpenHtmlStudio && (
            <div className="fg-card col-span-2 is-flat">
              <div className="flex items-center gap-2.5 p-2.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--surface-container-highest)] text-[var(--fg)]">
                  <Code2 size={16} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{t("wf.f.html")}</div>
                  <div className="truncate text-[11px] text-[var(--muted)]">HTML · CSS · JS</div>
                </div>
                <button type="button" onClick={onOpenHtmlStudio} className="fg-cta">
                  <Code2 size={14} />
                  {t("home.create")}
                </button>
              </div>
            </div>
          )}
        </Section>
      )}

      {showWeather && weather.length > 0 && (
        <Section title={t("wg.weather")}>
          {weather.map((face) => (
            <Card key={face} widget={weatherPreview(face)} selected={value === face} onAdd={() => onPickWeather(face)} wide={(WEATHER_RATIOS[face] ?? 1) > 2} />
          ))}
        </Section>
      )}

      {showCalendar && calendars.length > 0 && (
        <Section title={t("wg.calendar")}>
          {calendars.map((face) => (
            <Card key={face} widget={clockPreview(face)} selected={value === face} onAdd={() => onPickClock(face)} wide={FACE_META[face].ratio({ seconds: false, date: false }) > 2} />
          ))}
        </Section>
      )}

      {showClocks && material.length > 0 && (
        <Section title={t("wg.material")}>
          {material.map((face) => (
            <Card key={face} widget={clockPreview(face)} selected={value === face} onAdd={() => onPickClock(face)} />
          ))}
        </Section>
      )}

      {showClocks && digital.length > 0 && (
        <Section title={t("wg.digital")}>
          {digital.map((face) => (
            <Card key={face} widget={clockPreview(face)} selected={value === face} onAdd={() => onPickClock(face)} />
          ))}
        </Section>
      )}

      {showClocks && analog.length > 0 && (
        <Section title={t("wg.analog")}>
          {analog.map((face) => (
            <Card key={face} widget={clockPreview(face)} selected={value === face} onAdd={() => onPickClock(face)} />
          ))}
        </Section>
      )}

      {query && material.length + digital.length + analog.length + calendars.length + weather.length === 0 && !showMore && (
        <p className="rounded-2xl bg-[var(--surface-container-high)] px-4 py-6 text-center text-sm text-[var(--muted)]">{t("common.none")}</p>
      )}

      {preview && (
        <div role="dialog" aria-modal="true" aria-label={t("home.preview")} className="dialog-backdrop fixed inset-0 z-[90] flex items-center justify-center p-4" onClick={() => setPreview(null)}>
          <div className="dialog-card relative flex w-full max-w-md flex-col items-center gap-4 rounded-[28px] bg-[var(--surface)] p-6 shadow-2xl ring-1 ring-[var(--line)]" onClick={(e) => e.stopPropagation()}>
            <button type="button" onClick={() => setPreview(null)} className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full hover:bg-[var(--surface-container-high)]" aria-label={t("common.cancel")}>
              <X size={18} />
            </button>
            <div className="text-sm font-semibold">{cardTitle(preview)}</div>
            <div className="flex items-center justify-center py-2">
              {(() => {
                const w = { ...preview, size: 240 } as HomeWidget;
                const s = widgetSize(w);
                return <Clock widget={w} width={Math.min(s.width, 320)} faceHeight={s.faceHeight} />;
              })()}
            </div>
            <button
              type="button"
              onClick={() => {
                if (preview.type === "weather") onPickWeather(preview.face as WeatherFaceId);
                else if (preview.type === "bookmarks") onPickBookmarks?.(bookmarksPreview.type === "bookmarks" ? bookmarksPreview.layout : "2x2");
                else onPickClock(preview.face as ClockFaceId);
                setPreview(null);
              }}
              className="inline-flex h-11 items-center gap-2 rounded-full bg-[var(--primary)] px-6 text-sm font-semibold text-[var(--on-primary)] transition-all duration-300 hover:rounded-2xl"
            >
              <Plus size={16} strokeWidth={2.6} />
              {t("home.add")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
