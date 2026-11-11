import { ChevronDown, Code2, Copy, EyeOff, LayoutGrid, Minus, Plus, RotateCcw, Sparkles, Trash2 } from "lucide-react";
import { useState } from "react";
import { FaceGallery } from "./FaceGallery";
import { FaceThumb } from "./FaceThumb";

export { FaceGallery, FaceThumb };
import { BUTTON, BUTTON_PRIMARY, CARD, FieldRow, INPUT, Segmented, SliderRow, ToggleRow } from "../ui";
import { cityName, timeZoneOptions } from "../../lib/clock";
import { FACE_META } from "../../lib/faces";
import { useI18n } from "../../lib/i18n";
import {
  BOOKMARK_LAYOUTS,
  BOOKMARK_LAYOUT_LABELS,
  HOUR_CYCLES,
  WIDGET_COLORS,
  getHost,
  readBookmarks,
  safeWebUrl,
  type BarSlot,
  type BarSlotKind,
  type BookmarksLayout,
  type HomeWidget,
  type HomeLayout,
  type LauncherLayout,
  type SecondsMode,
  type SearchStyle,
} from "../../lib/settings";
import { SHAPE_SPANS, captionText, gridMetrics, readViewport, widgetShape, widgetSpan, type WidgetShape } from "../../lib/widgets";
import { cn } from "../../utils/cn";


const SHAPE_LABELS: Record<WidgetShape, [string, string]> = {
  round: ["Round", "Круглый"],
  rect: ["Rectangle", "Прямоугольник"],
  square: ["Square", "Квадрат"],
  wide: ["Large", "Большой"],
};

/** A − value + stepper for one grid axis. */
function Stepper({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (value: number) => void }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2.5">
      <span className="text-sm font-medium">{label}</span>
      <div className="flex items-center gap-1 rounded-full bg-[var(--surface-container-high)] p-1">
        <button type="button" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} aria-label={`${label} −`} className="grid h-8 w-8 place-items-center rounded-full transition hover:bg-[var(--surface-container-highest)] disabled:opacity-30">
          <Minus size={15} aria-hidden="true" />
        </button>
        <span className="min-w-[3.2ch] text-center text-sm font-semibold tabular-nums" aria-live="polite">
          {value}
        </span>
        <button type="button" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} aria-label={`${label} +`} className="grid h-8 w-8 place-items-center rounded-full transition hover:bg-[var(--surface-container-highest)] disabled:opacity-30">
          <Plus size={15} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

/**
 * Size in grid cells. Presets give the standard shapes (rectangles are all the same size, a square is
 * two rectangles stacked, a large card is two squares wide); width and height then stretch independently.
 * Round widgets only scale as a whole.
 */
function SizeControls({ widget, onChange }: { widget: HomeWidget; onChange: (patch: Partial<HomeWidget>) => void }) {
  const { lang } = useI18n();
  const ru = lang.startsWith("ru");
  const m = gridMetrics(readViewport());
  const shape = widgetShape(widget);
  const span = widgetSpan(widget, m);
  const maxCols = m.cols;
  const maxRows = Math.max(1, m.rows);
  if (shape === "round") {
    const limit = Math.min(maxCols, maxRows, 6);
    return (
      <>
        <FieldRow label={ru ? "Размер" : "Size"} hint={ru ? "Круглые виджеты растут целиком: 1 клетка — половина прямоугольника." : "Round widgets scale as a whole: 1 cell is half a rectangle."}>
          <Segmented
            label={ru ? "Размер" : "Size"}
            value={String(span.cols)}
            onChange={(value) => onChange({ cols: Number(value), rows: Number(value) })}
            options={Array.from({ length: limit }, (_, i) => ({ value: String(i + 1), label: `${i + 1}×${i + 1}` }))}
          />
        </FieldRow>
      </>
    );
  }
  const presets: WidgetShape[] = ["rect", "square", "wide"];
  const activePreset = presets.find((p) => SHAPE_SPANS[p].cols === span.cols && SHAPE_SPANS[p].rows === span.rows);
  return (
    <>
      <FieldRow label={ru ? "Форма" : "Shape"} hint={ru ? "Прямоугольник 2×1, квадрат 2×2 (два прямоугольника), большой 4×2." : "Rectangle 2×1, square 2×2 (two rectangles), large 4×2."}>
        <Segmented
          label={ru ? "Форма" : "Shape"}
          value={activePreset ?? "custom"}
          onChange={(value) => {
            if (value === "custom") return;
            const preset = SHAPE_SPANS[value as WidgetShape];
            onChange({ cols: Math.min(maxCols, preset.cols), rows: Math.min(maxRows, preset.rows) });
          }}
          options={[
            ...presets.map((p) => ({ value: p, label: `${SHAPE_LABELS[p][ru ? 1 : 0]} ${SHAPE_SPANS[p].cols}×${SHAPE_SPANS[p].rows}` })),
            ...(activePreset ? [] : [{ value: "custom", label: `${ru ? "Своя" : "Custom"} ${span.cols}×${span.rows}` }]),
          ]}
        />
      </FieldRow>
      <Stepper label={ru ? "Ширина, клеток" : "Width, cells"} value={span.cols} min={1} max={maxCols} onChange={(cols) => onChange({ cols, rows: span.rows })} />
      <Stepper label={ru ? "Высота, клеток" : "Height, cells"} value={span.rows} min={1} max={maxRows} onChange={(rows) => onChange({ rows, cols: span.cols })} />
    </>
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
          <SizeControls widget={widget} onChange={onChange} />
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

  // Single round shortcut ("Вкладка")
  if (widget.type === "shortcut") {
    const saved = readBookmarks().slice(0, 12);
    const host = getHost(safeWebUrl(widget.url));
    return (
      <div className="space-y-4">
        <div className={CARD}>
          <div className="flex items-center gap-4 p-4">
            <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[var(--surface-container-high)]" aria-hidden="true">
              <FaceThumb widget={{ ...widget, showTitle: false }} maxWidth={52} maxHeight={52} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-xs text-[var(--muted)]">{t("wf.f.shortcut")}</div>
              <div className="truncate font-semibold">{widget.title || host}</div>
              <div className="truncate text-xs text-[var(--muted)]">{host || (isRu ? "неверный адрес" : "invalid address")}</div>
            </div>
          </div>
        </div>

        <div className={card}>
          <FieldRow label={isRu ? "Адрес сайта" : "Website address"}>
            <input
              value={widget.url}
              maxLength={2000}
              inputMode="url"
              onChange={(event) => onChange({ url: event.target.value })}
              placeholder="https://example.com"
              className={cn(INPUT, "h-11", widget.url && !safeWebUrl(widget.url) && "ring-2 ring-[var(--error,#b3261e)]")}
            />
          </FieldRow>
          <FieldRow label={isRu ? "Название" : "Name"}>
            <input value={widget.title} maxLength={60} onChange={(event) => onChange({ title: event.target.value })} placeholder={host || "Google"} className={cn(INPUT, "h-11")} />
          </FieldRow>
          {saved.length > 0 && (
            <FieldRow label={isRu ? "Взять из закладок" : "From your bookmarks"}>
              <div className="flex flex-wrap gap-1.5">
                {saved.map((bookmark) => (
                  <button
                    key={bookmark.id}
                    type="button"
                    onClick={() => onChange({ url: bookmark.url, title: bookmark.title, customIcon: bookmark.customIcon ?? "" })}
                    className={cn(
                      "inline-flex h-8 max-w-[160px] items-center gap-1.5 rounded-full px-3 text-xs transition",
                      safeWebUrl(widget.url) === bookmark.url ? "bg-[var(--primary)] text-[var(--on-primary)]" : "bg-[var(--surface-container-high)] hover:bg-[var(--surface-container-highest)]",
                    )}
                  >
                    <span className="truncate">{bookmark.title}</span>
                  </button>
                ))}
              </div>
            </FieldRow>
          )}
          <FieldRow label={isRu ? "Иконка" : "Icon"}>
            <Segmented
              label={isRu ? "Иконка" : "Icon"}
              value={widget.customIcon ? "custom" : widget.iconStyle}
              onChange={(value) => onChange(value === "custom" ? {} : { iconStyle: value as "themed" | "original", customIcon: "" })}
              options={[
                { value: "themed", label: isRu ? "В цветах темы" : "Themed" },
                { value: "original", label: isRu ? "Оригинал" : "Original" },
                ...(widget.customIcon ? [{ value: "custom", label: isRu ? "Своя" : "Custom" }] : []),
              ]}
            />
          </FieldRow>
          <ToggleRow title={isRu ? "Подпись под иконкой" : "Label under the icon"} checked={widget.showTitle} onChange={(showTitle) => onChange({ showTitle })} />
          <SizeControls widget={widget} onChange={onChange} />
          <FieldRow label={t("wg.color")}>
            <Segmented label={t("wg.color")} value={widget.color} onChange={(color) => onChange({ color })} options={WIDGET_COLORS.map((value) => ({ value, label: t(`wg.c.${value}`) }))} />
          </FieldRow>
          <SliderRow label={t("wg.opacity")} value={widget.opacity} min={20} max={100} unit="%" onChange={(opacity) => onChange({ opacity })} />
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
          <FieldRow label={isRu ? "Размер папки" : "Folder size"}>
            <Segmented
              label="Layout"
              value={widget.layout}
              onChange={(layout) => onChange({ layout: layout as BookmarksLayout })}
              options={BOOKMARK_LAYOUTS.map((value) => ({ value, label: BOOKMARK_LAYOUT_LABELS[value][isRu ? 1 : 0] }))}
            />
          </FieldRow>
          <SizeControls widget={widget} onChange={onChange} />
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
          <SizeControls widget={widget} onChange={onChange} />
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
        <SizeControls widget={widget} onChange={onChange} />
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
  elementKey: "__system_logo__" | "__system_search__" | "__system_buttons__";
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
        <div className="px-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">{isRu ? "Размер и положение" : "Size & position"}</div>
        <div className={card}>
          <ToggleRow
            title={t("home.element.customPos")}
            description={isRu ? "Двигайте свободно по экрану или держите по центру" : "Drag freely on screen or keep centered"}
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
          checked={b.addTile !== false}
          onChange={(addTile) => onChangeLayout({ buttons: { ...b, addTile } })}
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
      <SliderRow label={t("home.cell")} value={layout.cell < 60 ? 88 : layout.cell} min={64} max={128} step={4} unit=" px" onChange={(cell) => onChange({ cell })} />
      {layout.mode === "grid" && (
        <>
          <FieldRow label={t("home.showGrid")}>
            <Segmented
              label={t("home.showGrid")}
              value={layout.showGrid}
              onChange={(showGrid) => onChange({ showGrid })}
              options={(["editing", "always", "never"] as const).map((value) => ({ value, label: t(`home.grid.${value}`) }))}
            />
          </FieldRow>
        </>
      )}
      <ToggleRow
        title={t("home.guides")}
        description={t("home.guidesDesc")}
        checked={layout.guides}
        onChange={(guides) => onChange({ guides })}
      />
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

/* ---------- Better Search Bar editor ---------- */

const SLOT_KIND_OPTIONS: { value: BarSlotKind; icon: typeof Sparkles; ru: string; en: string }[] = [
  { value: "ai", icon: Sparkles, ru: "Режим ИИ", en: "AI mode" },
  { value: "incognito", icon: EyeOff, ru: "Инкогнито", en: "Incognito" },
  { value: "widget", icon: LayoutGrid, ru: "Виджет", en: "Widget" },
  { value: "icon", icon: Sparkles, ru: "Иконка", en: "Icon" },
];

/** Full control over the two slots, the look and the defaults. */
export function BetterBarEditor({
  layout,
  widgets,
  onChange,
}: {
  layout: LauncherLayout["betterBar"];
  widgets: HomeWidget[];
  onChange: (patch: Partial<LauncherLayout["betterBar"]>) => void;
}) {
  const { t, lang } = useI18n();
  const isRu = lang === "ru";
  const c = layout.config;

  const setSlot = (index: 0 | 1, patch: Partial<BarSlot>) => {
    const slots = [...c.slots] as [BarSlot, BarSlot];
    slots[index] = { ...slots[index], ...patch };
    onChange({ config: { ...c, slots } });
  };

  const SlotCard = ({ index }: { index: 0 | 1 }) => {
    const slot = c.slots[index];
    const option = SLOT_KIND_OPTIONS.find((o) => o.value === slot.kind)!;
    const Icon = option.icon;
    return (
      <div className="rounded-[20px] border border-[var(--line)] bg-[var(--surface)] overflow-hidden">
        <div className="flex items-center gap-2 border-b border-[var(--line)] bg-[var(--surface-container-high)] px-3 py-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[var(--primary)] text-[var(--on-primary)]">
            <Icon size={13} aria-hidden="true" />
          </span>
          <span className="text-xs font-semibold">{index === 0 ? t("better.slot1") : t("better.slot2")}</span>
        </div>

        <div className="divide-y divide-[var(--line)]">
          <FieldRow label={t("better.kind")}>
            <Segmented
              label={t("better.kind")}
              value={slot.kind}
              onChange={(kind) => setSlot(index, { kind, ref: kind === slot.kind ? slot.ref : undefined })}
              options={SLOT_KIND_OPTIONS.map((o) => ({ value: o.value, label: isRu ? o.ru : o.en }))}
            />
          </FieldRow>

          {slot.kind === "widget" && (
            <FieldRow label={t("better.pickWidget")}>
              {widgets.length ? (
                <div className="flex flex-wrap gap-1.5">
                  {widgets.map((widget) => (
                    <button
                      key={widget.id}
                      type="button"
                      onClick={() => setSlot(index, { ref: widget.id })}
                      className={cn(
                        "flex h-9 items-center gap-2 rounded-full px-3 text-xs font-medium transition",
                        slot.ref === widget.id
                          ? "bg-[var(--primary)] text-[var(--on-primary)]"
                          : "bg-[var(--surface-container-high)] hover:bg-[var(--surface-container-highest)]",
                      )}
                    >
                      <span className="flex h-5 w-5 items-center justify-center overflow-hidden rounded-md bg-[var(--surface)]">
                        <FaceThumb widget={widget} maxWidth={20} maxHeight={20} />
                      </span>
                      <span className="max-w-[110px] truncate">
                        {widget.type === "custom_html" ? widget.title : widget.type === "bookmarks" ? widget.title : t(`wf.f.${widget.face}`)}
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[var(--muted)]">{t("home.empty")}</p>
              )}
            </FieldRow>
          )}

          <FieldRow label={t("better.label")} hint={isRu ? "Оставьте пустым для стандартной подписи" : "Leave empty for the default label"}>
            <input
              value={slot.label ?? ""}
              maxLength={40}
              onChange={(e) => setSlot(index, { label: e.target.value })}
              placeholder={isRu ? option.ru : option.en}
              className={cn(INPUT, "h-11")}
            />
          </FieldRow>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <SlotCard index={0} />
        <SlotCard index={1} />
      </div>

      <div className={cn(CARD, "divide-y divide-[var(--line)]")}>
        <SliderRow label={t("better.height")} value={c.height} min={44} max={96} step={2} unit=" px" onChange={(height) => onChange({ config: { ...c, height } })} />
        <SliderRow label={t("better.radius")} value={c.radius} min={0} max={48} step={2} unit=" px" onChange={(radius) => onChange({ config: { ...c, radius } })} />
        <SliderRow label={t("sb.width")} value={layout.width} min={240} max={1100} step={8} unit=" px" onChange={(width) => onChange({ width })} />
        <SliderRow label={t("home.element.scale")} value={layout.scale} min={50} max={200} step={5} unit=" %" onChange={(scale) => onChange({ scale })} />
        <FieldRow label={t("better.placeholder")}>
          <input
            value={c.placeholder}
            maxLength={80}
            onChange={(e) => onChange({ config: { ...c, placeholder: e.target.value } })}
            placeholder={t("better.placeholderPh")}
            className={cn(INPUT, "h-11")}
          />
        </FieldRow>
        <ToggleRow
          title={t("better.showAttach")}
          checked={c.attach}
          onChange={(attach) => onChange({ config: { ...c, attach } })}
        />
        <ToggleRow
          title={t("better.showVoice")}
          checked={c.voice}
          onChange={(voice) => onChange({ config: { ...c, voice } })}
        />
        <ToggleRow
          title={t("better.aiDefault")}
          checked={c.aiOn}
          onChange={(aiOn) => onChange({ config: { ...c, aiOn } })}
        />
      </div>

      <div className="rounded-[20px] border border-[var(--line)] bg-[var(--surface-container-high)] p-3 text-xs leading-5 text-[var(--muted)]">
        {t("better.incognitoHint")}
      </div>
    </div>
  );
}
