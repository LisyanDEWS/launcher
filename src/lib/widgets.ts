import { useEffect, useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { cityName } from "./clock";
import { FACE_META } from "./faces";
import {
  DEFAULT_WIDGET,
  DEFAULT_WEATHER_WIDGET,
  DEFAULT_HTML_WIDGET,
  DEFAULT_BOOKMARKS_WIDGET,
  MAX_WIDGETS,
  type ClockFaceId,
  type ClockWidget,
  type WeatherFaceId,
  type WeatherWidget,
  type CustomHtmlWidget,
  type BookmarksWidget,
  type BookmarksLayout,
  type HomeWidget,
  type HomeLayout,
  type SearchStyle,
  type Settings,
} from "./settings";

export type Viewport = { w: number; h: number };
export type Rect = { left: number; top: number; width: number; height: number };

export const SIZE_MIN = 80;
export const SIZE_MAX = 520;
const EDGE = 24;

export const BOOKMARK_RATIOS: Record<BookmarksLayout, number> = {
  "1x1": 1.0,
  "2x1": 2.0,
  "2x2": 1.05,
  "4x1": 3.2,
  "4x2": 2.0,
};

export const WEATHER_RATIOS: Record<string, number> = {
  w01_sunny: 1.45,
  w02_partly_cloudy: 1.4,
  w12_humidity_ring: 1.4,
  w15_rain_chance: 1.6,
  html: 1.45,
  bookmarks: 1.05,
  // Fallbacks for previous sessions
  w03_rainy: 1.45,
  w04_thunderstorm: 1.45,
  w05_snowfall: 1.45,
  w06_clear_night: 1.45,
  w07_windy: 1.45,
  w08_foggy: 1.45,
  w09_hot_humid: 1.45,
  w10_uv: 1.3,
  w11_wind_compass: 1.25,
  w13_aqi: 1.3,
  w14_pressure: 1.3,
  w16_pollen: 1.35,
  w17_feels_like: 1.35,
  w18_sun_cycle: 1.5,
  w19_moon_phase: 1.25,
  w20_forecast_5d: 1.5,
  w21_hourly: 1.7,
  w22_temp_trend: 1.6,
  w23_weekly_rain: 1.55,
  w24_alert: 1.55,
  w25_city_hero: 1.45,
  weather_glyph: 1.25,
  weather_classic: 1.25,
  weather_minimal: 1.35,
  weather_pill: 1.6,
  weather_compact: 1.25,
  weather_forecast_5d: 1.4,
  weather_hourly: 1.7,
  weather_gauge: 1.15,
  weather_wind_compass: 1.1,
  weather_sun_cycle: 1.45,
  weather_air_quality: 1.2,
  weather_humidity_rain: 1.35,
  weather_matrix_dot: 1.25,
  weather_dynamic_sky: 1.25,
  weather_neo_brutal: 1.25,
  weather_glass: 1.25,
  weather_pressure_baro: 1.15,
  weather_combo_clock: 1.6,
  weather_capsule_vert: 0.6,
  weather_radar_badge: 1.1,
  weather_thermometer: 1.25,
  weather_moon_phase: 1.1,
  weather_comfort_index: 1.3,
  weather_weekly_table: 1.4,
  weather_cyber_hud: 1.5,
  weather_island: 1.7,
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
  return widget.label.trim() || (widget.timeZone !== "local" ? cityName(widget.timeZone) : "");
};

/** Pixel size of a widget. `size` is √(face area), so every face keeps a similar visual weight. */
export function widgetSize(widget: HomeWidget) {
  let ratio = 1;
  if (widget.type === "weather") {
    ratio = WEATHER_RATIOS[widget.face] ?? 1.45;
  } else if (widget.type === "custom_html") {
    ratio = 1.45;
  } else if (widget.type === "bookmarks") {
    ratio = BOOKMARK_RATIOS[widget.layout] ?? 1.05;
  } else {
    ratio = FACE_META[widget.face]?.ratio(faceFlags(widget)) ?? 1;
  }
  const k = Math.sqrt(ratio);
  const width = Math.round(widget.size * k);
  const faceHeight = Math.round(widget.size / k);
  const caption = captionText(widget) ? Math.round(Math.max(13, Math.min(20, widget.size * 0.075)) * 1.7) : 0;
  return { width, faceHeight, caption, height: faceHeight + caption };
}

/** Snaps to the grid without leaving [0, max]. */
export function snapWithin(value: number, step: number, max: number) {
  const snapped = Math.round(value / step) * step;
  if (snapped > max) return Math.max(0, Math.floor(max / step) * step);
  return Math.max(0, snapped);
}

export function widgetRect(widget: HomeWidget, viewport: Viewport, layout: HomeLayout): Rect {
  const { width, height } = widgetSize(widget);
  const spanX = Math.max(0, viewport.w - width);
  const spanY = Math.max(0, viewport.h - height);
  let left = widget.x * spanX;
  let top = widget.y * spanY;
  if (layout.mode === "grid") {
    left = snapWithin(left, layout.cell, spanX);
    top = snapWithin(top, layout.cell, spanY);
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

/** Gathers all obstacles that new widgets must avoid colliding with. */
export function getOccupiedRects(settings: Settings, viewport: Viewport): Rect[] {
  const rects: Rect[] = [
    ...settings.widgets.map((widget) => widgetRect(widget, viewport, settings.homeLayout)),
    mainColumnRect(viewport, settings),
    // Top right settings/edit action buttons
    { left: viewport.w - 180, top: 0, width: 180, height: 96 },
  ];

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

function findFreeSpot(width: number, height: number, taken: Rect[], viewport: Viewport, step: number) {
  const start = Math.ceil(EDGE / step) * step;
  for (let top = start; top + height <= viewport.h - EDGE / 2; top += step) {
    for (let left = start; left + width <= viewport.w - EDGE / 2; left += step) {
      const padded = { left: left - 12, top: top - 12, width: width + 24, height: height + 24 };
      if (!taken.some((rect) => intersects(padded, rect))) return { left, top };
    }
  }
  return null;
}

export function createClockWidget(face: ClockFaceId, id: string, settings: Settings, viewport: Viewport): ClockWidget {
  const base: ClockWidget = { ...DEFAULT_WIDGET, ...FACE_META[face]?.defaults, id, face, type: "clock" };
  base.size = Math.max(SIZE_MIN, Math.min(base.size, Math.round(Math.min(viewport.w, viewport.h) * 0.32)));
  const { width, height } = widgetSize(base);
  const layout = settings.homeLayout;
  const taken = getOccupiedRects(settings, viewport);
  const count = settings.widgets.length;
  const spot = findFreeSpot(width, height, taken, viewport, layout.mode === "grid" ? layout.cell : 16) ?? {
    left: EDGE + (count % 8) * 28,
    top: EDGE + (count % 8) * 28,
  };
  return { ...base, ...toPosition({ left: spot.left, top: spot.top, width, height }, viewport) };
}

export function createWeatherWidget(face: WeatherFaceId, id: string, settings: Settings, viewport: Viewport): WeatherWidget {
  const base: WeatherWidget = { ...DEFAULT_WEATHER_WIDGET, id, face, type: "weather" };
  base.size = Math.max(240, Math.min(320, Math.round(Math.min(viewport.w, viewport.h) * 0.34)));
  const { width, height } = widgetSize(base);
  const layout = settings.homeLayout;
  const taken = getOccupiedRects(settings, viewport);
  const count = settings.widgets.length;
  const spot = findFreeSpot(width, height, taken, viewport, layout.mode === "grid" ? layout.cell : 16) ?? {
    left: EDGE + (count % 8) * 28,
    top: EDGE + (count % 8) * 28,
  };
  return { ...base, ...toPosition({ left: spot.left, top: spot.top, width, height }, viewport) };
}

export function createHtmlWidget(id: string, settings: Settings, viewport: Viewport, initialHtml?: string, title?: string): CustomHtmlWidget {
  const base: CustomHtmlWidget = {
    ...DEFAULT_HTML_WIDGET,
    id,
    face: "html",
    type: "custom_html",
    title: title || DEFAULT_HTML_WIDGET.title,
    html: initialHtml || DEFAULT_HTML_WIDGET.html,
  };
  base.size = Math.max(240, Math.min(340, Math.round(Math.min(viewport.w, viewport.h) * 0.36)));
  const { width, height } = widgetSize(base);
  const layout = settings.homeLayout;
  const taken = getOccupiedRects(settings, viewport);
  const count = settings.widgets.length;
  const spot = findFreeSpot(width, height, taken, viewport, layout.mode === "grid" ? layout.cell : 16) ?? {
    left: EDGE + (count % 8) * 28,
    top: EDGE + (count % 8) * 28,
  };
  return { ...base, ...toPosition({ left: spot.left, top: spot.top, width, height }, viewport) };
}

export function createBookmarksWidget(
  id: string,
  settings: Settings,
  viewport: Viewport,
  layout: BookmarksLayout = "2x2",
  title?: string
): BookmarksWidget {
  const base: BookmarksWidget = {
    ...DEFAULT_BOOKMARKS_WIDGET,
    id,
    face: "bookmarks",
    type: "bookmarks",
    layout,
    title: title || DEFAULT_BOOKMARKS_WIDGET.title,
  };
  base.size = Math.max(200, Math.min(300, Math.round(Math.min(viewport.w, viewport.h) * 0.32)));
  const { width, height } = widgetSize(base);
  const taken = getOccupiedRects(settings, viewport);
  const count = settings.widgets.length;
  const spot = findFreeSpot(width, height, taken, viewport, settings.homeLayout.mode === "grid" ? settings.homeLayout.cell : 16) ?? {
    left: EDGE + (count % 8) * 28,
    top: EDGE + (count % 8) * 28,
  };
  return { ...base, ...toPosition({ left: spot.left, top: spot.top, width, height }, viewport) };
}

export function duplicateOf(source: HomeWidget, id: string, settings: Settings, viewport: Viewport): HomeWidget {
  const rect = widgetRect(source, viewport, settings.homeLayout);
  const shift = settings.homeLayout.mode === "grid" ? settings.homeLayout.cell : 24;
  const left = rect.left + shift + rect.width <= viewport.w ? rect.left + shift : Math.max(0, rect.left - shift);
  const top = rect.top + shift + rect.height <= viewport.h ? rect.top + shift : Math.max(0, rect.top - shift);
  return { ...source, id, ...toPosition({ ...rect, left, top }, viewport) };
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
