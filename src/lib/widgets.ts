import { useEffect, useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { cityName } from "./clock";
import { FACE_META } from "./faces";
import {
  DEFAULT_WIDGET,
  DEFAULT_WEATHER_WIDGET,
  DEFAULT_HTML_WIDGET,
  DEFAULT_BOOKMARKS_WIDGET,
  DEFAULT_SHORTCUT_WIDGET,
  LEGACY_WEATHER_FACES,
  MAX_WIDGETS,
  type ClockFaceId,
  type ClockWidget,
  type WeatherFaceId,
  type WeatherWidget,
  type CustomHtmlWidget,
  type BookmarksWidget,
  type BookmarksLayout,
  type ShortcutWidget,
  type HomeWidget,
  type HomeLayout,
  type SearchStyle,
  type Settings,
} from "./settings";

export type Viewport = { w: number; h: number };
export type Rect = { left: number; top: number; width: number; height: number };

export const SIZE_MIN = 80;
export const SIZE_MAX = 520;
/** Minimum breathing room between widgets when they are auto-placed or duplicated. */
export const GAP = 20;

export const BOOKMARK_RATIOS: Record<BookmarksLayout, number> = {
  "1x1": 1.0,
  "2x1": 2.3,
  "2x2": 1.1,
  "4x1": 4.2,
  "4x2": 2.1,
};

const MATERIAL_WEATHER_RATIOS: Record<WeatherFaceId, number> = {
  m3w_now: 1.45,
  m3w_shape: 1,
  m3w_pill: 3,
  m3w_details: 1,
  m3w_hourly: 2.1,
  m3w_daily: 2.1,
  m3w_rain: 1.8,
  m3w_sun: 1.6,
  m3w_wind: 1,
  m3w_humidity: 1,
  m3w_feels: 1,
  m3w_uv: 1.15,
  m3w_air: 1,
  m3w_moon: 1,
  m3w_combo: 2.2,
};

export const WEATHER_RATIOS: Record<string, number> = {
  ...Object.fromEntries(Object.entries(LEGACY_WEATHER_FACES).map(([legacy, id]) => [legacy, MATERIAL_WEATHER_RATIOS[id]])),
  ...MATERIAL_WEATHER_RATIOS,
  html: 1.45,
  bookmarks: 1.05,
};

export const readViewport = (): Viewport => ({
  w: typeof document !== "undefined" ? document.documentElement.clientWidth || window.innerWidth : 1280,
  h: typeof document !== "undefined" ? document.documentElement.clientHeight || window.innerHeight : 800,
});

export function useViewport(): Viewport {
  const [viewport, setViewport] = useState(readViewport);
  useEffect(() => {
    const update = () => setViewport(readViewport());
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return viewport;
}

export function uid(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
  }
}

/** What the face actually shows for these options. */
export function faceFlags(widget: ClockWidget) {
  const meta = FACE_META[widget.face];
  return { seconds: meta.seconds && widget.seconds !== "off", date: meta.date && widget.date };
}

/** Caption under the face: the user's text, or the city of a foreign time zone. */
export const captionText = (widget: HomeWidget) => {
  if (widget.type === "weather") return widget.label.trim();
  if (widget.type === "custom_html") return widget.label.trim() || widget.title;
  if (widget.type === "bookmarks") return widget.label.trim();
  if (widget.type === "shortcut") return widget.showTitle ? widget.label.trim() || widget.title.trim() : "";
  return widget.label.trim() || (widget.timeZone !== "local" ? cityName(widget.timeZone) : "");
};

/* =====================================================================
   Grid model
   ---------------------------------------------------------------------
   Widgets are sized in grid cells, Android-launcher style:
     round  1×1  — half a rectangle
     rect   2×1  — every rectangle is the same size
     square 2×2  — two rectangles stacked, gap included
     wide   4×2  — as tall as a square, twice as wide
   Width and height can then be stretched independently, one cell at a time
   (round widgets only grow as a whole). The grid is centred on the screen in
   both axes, so a 2- or 4-wide widget can sit exactly in the middle.
   ===================================================================== */

export type WidgetShape = "round" | "rect" | "square" | "wide";
export type Span = { cols: number; rows: number };

export const SHAPE_SPANS: Record<WidgetShape, Span> = {
  round: { cols: 1, rows: 1 },
  rect: { cols: 2, rows: 1 },
  square: { cols: 2, rows: 2 },
  wide: { cols: 4, rows: 2 },
};

export type GridMetrics = {
  cols: number;
  rows: number;
  /** Cell edge, px. */
  unit: number;
  gap: number;
  /** unit + gap. */
  pitch: number;
  originX: number;
  originY: number;
  width: number;
  height: number;
};

/** The default cell when the saved one comes from the old dot grid (8–56 px). */
const unitTarget = (layout: HomeLayout | undefined, phone: boolean) => {
  const cell = layout && layout.cell >= 60 ? layout.cell : 88;
  // Phones get proportionally smaller cells, so the default (88) gives the familiar 4-column grid.
  return phone ? cell * 0.85 : cell;
};

export function gridMetrics(viewport: Viewport, layout?: HomeLayout): GridMetrics {
  const phone = viewport.w < 640;
  const gap = phone ? 12 : 16;
  const margin = phone ? 14 : 28;
  const target = unitTarget(layout, phone);
  const usable = Math.max(120, viewport.w - margin * 2);
  let cols = Math.floor((usable + gap) / (target + gap));
  if (phone) cols = Math.min(6, Math.max(3, cols));
  // Even column counts let 2- and 4-wide widgets centre exactly.
  else cols = Math.max(4, cols - (cols % 2));
  let unit = (usable - (cols - 1) * gap) / cols;
  if (!phone) unit = Math.min(unit, target * 1.12);
  unit = Math.floor(unit * 100) / 100;
  const pitch = unit + gap;
  const width = cols * unit + (cols - 1) * gap;
  const rows = Math.max(1, Math.floor((viewport.h - margin * 2 + gap) / pitch));
  const height = rows * pitch - gap;
  return { cols, rows, unit, gap, pitch, originX: (viewport.w - width) / 2, originY: (viewport.h - height) / 2, width, height };
}

/** Pixel length of `n` cells, gaps between them included. */
export const spanPx = (n: number, m: GridMetrics) => n * m.unit + Math.max(0, n - 1) * m.gap;
/** Nearest whole number of cells for a pixel length. */
export const pxToSpan = (px: number, m: GridMetrics) => Math.max(1, Math.round((px + m.gap) / m.pitch));

/** Natural width ÷ height of what the widget draws. */
export function faceRatio(widget: HomeWidget): number {
  if (widget.type === "weather") return WEATHER_RATIOS[widget.face] ?? 1.45;
  if (widget.type === "custom_html") return 1.45;
  if (widget.type === "bookmarks") return BOOKMARK_RATIOS[widget.layout] ?? 1.05;
  if (widget.type === "shortcut") return 1;
  return FACE_META[widget.face]?.ratio(faceFlags(widget)) ?? 1;
}

const ROUND_CLOCKS = new Set<string>(["m3_ring", "m3_datering"]);
const WIDE_WEATHER = new Set<string>(["m3w_hourly", "m3w_daily", "m3w_combo"]);

/** Which size family a widget belongs to. */
export function widgetShape(widget: HomeWidget): WidgetShape {
  if (widget.type === "clock") {
    if (FACE_META[widget.face]?.kind === "analog" || ROUND_CLOCKS.has(widget.face)) return "round";
    return faceRatio(widget) < 1.3 ? "square" : "rect";
  }
  if (widget.type === "weather") {
    if (WIDE_WEATHER.has(widget.face)) return "wide";
    return faceRatio(widget) < 1.3 ? "square" : "rect";
  }
  if (widget.type === "custom_html") return "wide";
  if (widget.type === "shortcut") return "round";
  if (widget.layout === "2x1") return "rect";
  if (widget.layout === "4x1" || widget.layout === "4x2") return "wide";
  return "square";
}

const clampInt = (value: number, min: number, max: number) => Math.min(max, Math.max(min, Math.round(value)));

/** The widget's span in cells, limited by the current grid. */
export function widgetSpan(widget: HomeWidget, m?: GridMetrics): Span {
  const shape = widgetShape(widget);
  const fallback = SHAPE_SPANS[shape];
  let cols = widget.cols ?? fallback.cols;
  let rows = widget.rows ?? fallback.rows;
  // Old saves have no spans: keep a big analog clock big instead of shrinking it to one cell.
  if (shape === "round" && widget.cols === undefined && widget.size > 150) cols = rows = clampInt(widget.size / 104, 1, 4);
  if (shape === "round") cols = rows = Math.max(cols, rows);
  const maxCols = m ? m.cols : 12;
  const maxRows = m ? Math.max(1, m.rows) : 12;
  if (shape === "round") {
    const n = clampInt(cols, 1, Math.min(maxCols, maxRows));
    return { cols: n, rows: n };
  }
  return { cols: clampInt(cols, 1, maxCols), rows: clampInt(rows, 1, maxRows) };
}

/** Pixel size of a widget: its spans on the current grid. The caption lives inside the box. */
export function widgetSize(widget: HomeWidget, viewport: Viewport = readViewport(), layout?: HomeLayout) {
  const m = gridMetrics(viewport, layout);
  const { cols, rows } = widgetSpan(widget, m);
  const width = Math.round(spanPx(cols, m));
  const height = Math.round(spanPx(rows, m));
  const caption = captionText(widget) ? Math.round(Math.min(height * 0.3, Math.max(18, Math.min(30, height * 0.16)))) : 0;
  return { width, height, faceHeight: height - caption, caption, cols, rows };
}

/** Snaps one axis to the centred grid. Close to the screen centre it locks onto the exact centre. */
export function snapToGrid(pos: number, size: number, axis: "x" | "y", m: GridMetrics, viewport: Viewport) {
  const length = axis === "x" ? viewport.w : viewport.h;
  const origin = axis === "x" ? m.originX : m.originY;
  const count = axis === "x" ? m.cols : m.rows;
  const centred = (length - size) / 2;
  if (Math.abs(pos - centred) < m.pitch * 0.35) return { value: centred, centred: true };
  const cells = pxToSpan(size, m);
  const index = clampInt((pos - origin) / m.pitch, 0, Math.max(0, count - cells));
  const value = Math.min(Math.max(0, origin + index * m.pitch), Math.max(0, length - size));
  return { value, centred: Math.abs(value - centred) < 0.5 };
}

/** @deprecated kept for callers that still snap to a plain step from the edge. */
export function snapWithin(value: number, step: number, max: number) {
  const snapped = Math.round(value / step) * step;
  if (snapped > max) return Math.max(0, Math.floor(max / step) * step);
  return Math.max(0, snapped);
}

export function widgetRect(widget: HomeWidget, viewport: Viewport, layout: HomeLayout): Rect {
  const { width, height } = widgetSize(widget, viewport, layout);
  const spanX = Math.max(0, viewport.w - width);
  const spanY = Math.max(0, viewport.h - height);
  let left = widget.x * spanX;
  let top = widget.y * spanY;
  if (layout.mode === "grid") {
    const m = gridMetrics(viewport, layout);
    left = snapToGrid(left, width, "x", m, viewport).value;
    top = snapToGrid(top, height, "y", m, viewport).value;
  }
  return { left, top, width, height };
}

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

export function toPosition(rect: Rect, viewport: Viewport): Pick<HomeWidget, "x" | "y"> {
  const spanX = viewport.w - rect.width;
  const spanY = viewport.h - rect.height;
  return { x: spanX > 0 ? clamp01(rect.left / spanX) : 0.5, y: spanY > 0 ? clamp01(rect.top / spanY) : 0.5 };
}

/** Rough area of the logo, search bar and bookmarks — new widgets avoid it. */
export function mainColumnRect(viewport: Viewport, settingsOrStyle: Settings | SearchStyle): Rect {
  const isSettings = "launcherLayout" in settingsOrStyle;
  const style = isSettings ? settingsOrStyle.searchStyle : settingsOrStyle;
  const launcher = isSettings ? settingsOrStyle.launcherLayout : null;

  const searchWidth = launcher?.search?.custom ? 0 : (launcher?.search?.width || style.width);
  const buttonsWidth = launcher?.buttons?.custom ? 0 : (launcher?.buttons?.width || 672);
  const maxContentWidth = Math.max(searchWidth, buttonsWidth, 680);
  const width = Math.min(maxContentWidth + 64, viewport.w - 32);

  const baseTop = launcher?.search?.custom ? 24 : Math.max(32, (viewport.h * style.offsetTop) / 100 - 80);
  const height = Math.min(viewport.h - 48, Math.max(540, Math.round(viewport.h * 0.68)));
  return { left: Math.max(16, (viewport.w - width) / 2), top: baseTop, width, height };
}

/** The "edit home" button sits fixed at the bottom right; with the news band on, widgets must stay off it. */
export function editButtonRect(viewport: Viewport): Rect {
  return { left: Math.max(0, viewport.w - 16 - 170), top: Math.max(0, viewport.h - 16 - 38), width: 170, height: 38 };
}

const GAP_PX = 8;

/**
 * Lifts every widget that sits on the guard rect up above it. When a lifted widget would land on
 * another one, that widget is pushed up in turn — one widget moves the next, like a stack.
 * Returns the original array when nothing had to move.
 */
export function liftWidgetsAbove(widgets: HomeWidget[], viewport: Viewport, layout: HomeLayout, guard: Rect): HomeWidget[] {
  if (!widgets.length) return widgets;
  const rects = widgets.map((widget) => ({ id: widget.id, rect: widgetRect(widget, viewport, layout) }));
  let moved = false;
  for (const entry of rects) {
    if (intersects(entry.rect, guard)) {
      entry.rect.top = Math.max(0, guard.top - entry.rect.height - GAP_PX);
      moved = true;
    }
  }
  if (!moved) return widgets;
  // Cascade: push the upper widget up (or the lower one, if the upper one is already at the top).
  for (let pass = 0; pass < 60; pass++) {
    let changed = false;
    for (let i = 0; i < rects.length; i++) {
      for (let j = i + 1; j < rects.length; j++) {
        const a = rects[i].rect;
        const b = rects[j].rect;
        if (!intersects(a, b)) continue;
        const upper = a.top <= b.top ? a : b;
        const lower = upper === a ? b : a;
        if (upper.top > 0) upper.top = Math.max(0, lower.top - upper.height - GAP_PX);
        else lower.top = Math.max(0, upper.top - lower.height - GAP_PX);
        changed = true;
      }
    }
    if (!changed) break;
  }
  return widgets.map((widget) => {
    const rect = rects.find((entry) => entry.id === widget.id)?.rect;
    return rect ? { ...widget, ...toPosition(rect, viewport) } : widget;
  });
}

/** Gathers all obstacles that new widgets must avoid colliding with. */
export function getOccupiedRects(settings: Settings, viewport: Viewport): Rect[] {
  const rects: Rect[] = [
    ...settings.widgets.map((widget) => widgetRect(widget, viewport, settings.homeLayout)),
    mainColumnRect(viewport, settings),
    // Top right settings/edit action buttons
    { left: viewport.w - 180, top: 0, width: 180, height: 96 },
  ];
  // With the news band on, the bottom-right "edit home" button is off-limits for widgets.
  if (settings.news.enabled) rects.push(editButtonRect(viewport));

  // If custom positioned logo/search/buttons, protect their custom zones as well!
  const launcher = settings.launcherLayout;
  if (launcher.logo.custom) {
    const spanX = Math.max(0, viewport.w - launcher.logo.width);
    const spanY = Math.max(0, viewport.h - 180);
    rects.push({ left: launcher.logo.x * spanX - 16, top: launcher.logo.y * spanY - 16, width: launcher.logo.width + 32, height: 120 });
  }
  if (launcher.search.custom) {
    const spanX = Math.max(0, viewport.w - launcher.search.width);
    const spanY = Math.max(0, viewport.h - 180);
    rects.push({ left: launcher.search.x * spanX - 16, top: launcher.search.y * spanY - 16, width: launcher.search.width + 32, height: 100 });
  }
  if (launcher.buttons.custom) {
    const spanX = Math.max(0, viewport.w - launcher.buttons.width);
    const spanY = Math.max(0, viewport.h - 180);
    rects.push({ left: launcher.buttons.x * spanX - 16, top: launcher.buttons.y * spanY - 16, width: launcher.buttons.width + 32, height: 220 });
  }

  return rects;
}

const intersects = (a: Rect, b: Rect) =>
  a.left < b.left + b.width && b.left < a.left + a.width && a.top < b.top + b.height && b.top < a.top + a.height;

/**
 * Finds a free grid position for a box: first away from everything (launcher column, corner buttons,
 * other widgets), then only away from other widgets. Scans row by row from the top, cells aligned
 * to the centred grid.
 */
function findGridSpot(width: number, height: number, taken: Rect[], widgetsOnly: Rect[], m: GridMetrics) {
  const cols = pxToSpan(width, m);
  const rows = pxToSpan(height, m);
  const tolerance = m.gap / 2;
  const fits = (rect: Rect, against: Rect[]) =>
    !against.some((other) => intersects({ left: rect.left + tolerance, top: rect.top + tolerance, width: rect.width - tolerance * 2, height: rect.height - tolerance * 2 }, other));
  for (const against of [taken, widgetsOnly]) {
    for (let row = 0; row <= m.rows - rows; row++) {
      for (let col = 0; col <= m.cols - cols; col++) {
        const rect = { left: m.originX + col * m.pitch, top: m.originY + row * m.pitch, width, height };
        if (fits(rect, against)) return rect;
      }
    }
  }
  return null;
}

/** Puts a freshly created widget on the grid (or near the top-left if the screen is full). */
function placeNew<T extends HomeWidget>(base: T, settings: Settings, viewport: Viewport): T {
  const shape = widgetShape(base);
  const spans = SHAPE_SPANS[shape];
  const sized = { ...base, cols: spans.cols, rows: spans.rows } as T;
  const m = gridMetrics(viewport, settings.homeLayout);
  const { width, height } = widgetSize(sized, viewport, settings.homeLayout);
  const others = settings.widgets.map((widget) => widgetRect(widget, viewport, settings.homeLayout));
  const spot = findGridSpot(width, height, getOccupiedRects(settings, viewport), others, m) ?? {
    left: m.originX + (settings.widgets.length % 4) * m.pitch,
    top: m.originY,
  };
  return { ...sized, ...toPosition({ left: spot.left, top: spot.top, width, height }, viewport) };
}

export function createClockWidget(face: ClockFaceId, id: string, settings: Settings, viewport: Viewport): ClockWidget {
  return placeNew<ClockWidget>({ ...DEFAULT_WIDGET, ...FACE_META[face]?.defaults, id, face, type: "clock" }, settings, viewport);
}

export function createWeatherWidget(face: WeatherFaceId, id: string, settings: Settings, viewport: Viewport): WeatherWidget {
  return placeNew<WeatherWidget>({ ...DEFAULT_WEATHER_WIDGET, id, face, type: "weather" }, settings, viewport);
}

export function createHtmlWidget(id: string, settings: Settings, viewport: Viewport, initialHtml?: string, title?: string): CustomHtmlWidget {
  return placeNew<CustomHtmlWidget>(
    {
      ...DEFAULT_HTML_WIDGET,
      id,
      face: "html",
      type: "custom_html",
      title: title || DEFAULT_HTML_WIDGET.title,
      html: initialHtml || DEFAULT_HTML_WIDGET.html,
    },
    settings,
    viewport,
  );
}

export function createBookmarksWidget(
  id: string,
  settings: Settings,
  viewport: Viewport,
  layout: BookmarksLayout = "2x2",
  title?: string,
): BookmarksWidget {
  return placeNew<BookmarksWidget>(
    { ...DEFAULT_BOOKMARKS_WIDGET, id, face: "bookmarks", type: "bookmarks", layout, title: title || DEFAULT_BOOKMARKS_WIDGET.title },
    settings,
    viewport,
  );
}

export function createShortcutWidget(
  id: string,
  settings: Settings,
  viewport: Viewport,
  data: { url: string; title: string; customIcon?: string },
): ShortcutWidget {
  return placeNew<ShortcutWidget>(
    { ...DEFAULT_SHORTCUT_WIDGET, id, url: data.url, title: data.title || DEFAULT_SHORTCUT_WIDGET.title, customIcon: data.customIcon ?? "" },
    settings,
    viewport,
  );
}

/** A copy one cell to the right (or left/below when there is no room), with the same spans. */
export function duplicateOf(source: HomeWidget, id: string, settings: Settings, viewport: Viewport): HomeWidget {
  const layout = settings.homeLayout;
  const m = gridMetrics(viewport, layout);
  const rect = widgetRect(source, viewport, layout);
  const span = widgetSpan(source, m);
  const others = settings.widgets.map((widget) => widgetRect(widget, viewport, layout));
  const step = layout.mode === "grid" ? m.pitch : GAP + 8;
  const candidates = [
    { left: rect.left + rect.width + m.gap, top: rect.top },
    { left: rect.left - rect.width - m.gap, top: rect.top },
    { left: rect.left, top: rect.top + rect.height + m.gap },
    { left: rect.left + step, top: rect.top + step },
  ];
  const fitsScreen = (c: { left: number; top: number }) => c.left >= 0 && c.top >= 0 && c.left + rect.width <= viewport.w && c.top + rect.height <= viewport.h;
  const free = (c: { left: number; top: number }) => !others.some((o) => intersects({ left: c.left + 2, top: c.top + 2, width: rect.width - 4, height: rect.height - 4 }, o));
  const pick = candidates.find((c) => fitsScreen(c) && free(c)) ?? candidates.find(fitsScreen) ?? { left: rect.left, top: rect.top };
  return { ...source, id, cols: span.cols, rows: span.rows, ...toPosition({ ...rect, left: pick.left, top: pick.top }, viewport) };
}

/** Widget mutations shared by the home-screen editor and the settings section. */
export function useWidgetActions(setSettings: Dispatch<SetStateAction<Settings>>) {
  return useMemo(
    () => ({
      change: (id: string, patch: Partial<HomeWidget>) =>
        setSettings((s) => ({
          ...s,
          widgets: s.widgets.map((widget) => (widget.id === id ? ({ ...widget, ...patch } as HomeWidget) : widget)),
        })),
      remove: (id: string) => setSettings((s) => ({ ...s, widgets: s.widgets.filter((widget) => widget.id !== id) })),
      /** Returns the id of the new widget. */
      add: (face: ClockFaceId) => {
        const id = uid();
        const viewport = readViewport();
        setSettings((s) => (s.widgets.length >= MAX_WIDGETS ? s : { ...s, widgets: [...s.widgets, createClockWidget(face, id, s, viewport)] }));
        return id;
      },
      addWeather: (face: WeatherFaceId) => {
        const id = uid();
        const viewport = readViewport();
        setSettings((s) => (s.widgets.length >= MAX_WIDGETS ? s : { ...s, widgets: [...s.widgets, createWeatherWidget(face, id, s, viewport)] }));
        return id;
      },
      addHtml: (initialHtml?: string, title?: string) => {
        const id = uid();
        const viewport = readViewport();
        setSettings((s) => (s.widgets.length >= MAX_WIDGETS ? s : { ...s, widgets: [...s.widgets, createHtmlWidget(id, s, viewport, initialHtml, title)] }));
        return id;
      },
      addBookmarks: (layout?: BookmarksLayout, title?: string) => {
        const id = uid();
        const viewport = readViewport();
        setSettings((s) => (s.widgets.length >= MAX_WIDGETS ? s : { ...s, widgets: [...s.widgets, createBookmarksWidget(id, s, viewport, layout, title)] }));
        return id;
      },
      addShortcut: (data: { url: string; title: string; customIcon?: string }) => {
        const id = uid();
        const viewport = readViewport();
        setSettings((s) => (s.widgets.length >= MAX_WIDGETS ? s : { ...s, widgets: [...s.widgets, createShortcutWidget(id, s, viewport, data)] }));
        return id;
      },
      duplicate: (sourceId: string) => {
        const id = uid();
        const viewport = readViewport();
        setSettings((s) => {
          const source = s.widgets.find((widget) => widget.id === sourceId);
          if (!source || s.widgets.length >= MAX_WIDGETS) return s;
          return { ...s, widgets: [...s.widgets, duplicateOf(source, id, s, viewport)] };
        });
        return id;
      },
      layout: (patch: Partial<HomeLayout>) => setSettings((s) => ({ ...s, homeLayout: { ...s.homeLayout, ...patch } })),
    }),
    [setSettings],
  );
}

export type WidgetActions = ReturnType<typeof useWidgetActions>;
