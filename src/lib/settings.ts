import { LANGUAGES, type LanguageCode } from "../i18n/languages";

export type ThemeMode = "system" | "light" | "dark" | "wallpaper";
export type LogoMode = "google" | "none" | "text";
export type FontTheme = "m3" | "matrix";
export type LogoFont = "theme" | "sans" | "matrix";
export type WallpaperSource = "none" | "file" | "url";
export type ColorSource = "mono" | "wallpaper" | "preset" | "custom";
export type SchemeVariant = "tonal" | "expressive" | "vibrant" | "fidelity";
export type WallpaperTone = "unknown" | "dark" | "light";
export type SettingsSection =
  | "search"
  | "searchbox"
  | "animation"
  | "home"
  | "appearance"
  | "themes"
  | "wallpaper"
  | "fonts"
  | "language"
  | "bookmarks"
  | "about";
export const BOOKMARK_SHAPES = ["circle", "squircle", "rounded", "teardrop", "pebble", "flower"] as const;
export type BookmarkShape = (typeof BOOKMARK_SHAPES)[number];

export type Bookmark = {
  id: string;
  title: string;
  url: string;
  customIcon?: string;
  shape?: BookmarkShape;
};

export const PRESET_IDS = ["ocean", "forest", "sunset", "rose", "violet", "sand", "mint", "crimson"] as const;
export type PresetId = (typeof PRESET_IDS)[number];
export const SCHEME_VARIANTS = ["tonal", "expressive", "vibrant", "fidelity"] as const;

/* ---------- search bar style ---------- */

export const SEARCH_PRESET_IDS = ["expressive", "soft", "outlined", "minimal", "glass", "brutal", "spotlight", "terminal"] as const;
export type SearchPresetId = (typeof SEARCH_PRESET_IDS)[number];
export const SB_FILLS = ["filled", "outlined", "glass", "underline", "transparent"] as const;
export const SB_BORDER_COLORS = ["outline", "primary", "fg"] as const;
export const SB_SHADOWS = ["none", "soft", "medium", "strong", "glow", "hard"] as const;
export const SB_RINGS = ["none", "ring", "glow"] as const;
export const SB_ALIGNS = ["start", "center"] as const;
export const SB_ICONS = ["search", "sparkles", "globe", "chevron", "none"] as const;
export const SB_BUTTONS = ["filled", "tonal", "icon", "none"] as const;

export type SearchStyle = {
  preset: SearchPresetId | "custom";
  width: number;
  height: number;
  radius: number;
  focusRadius: number;
  focusScale: number;
  fill: (typeof SB_FILLS)[number];
  opacity: number;
  blur: number;
  borderWidth: number;
  borderColor: (typeof SB_BORDER_COLORS)[number];
  shadow: (typeof SB_SHADOWS)[number];
  focusRing: (typeof SB_RINGS)[number];
  fontSize: number;
  fontWeight: number;
  align: (typeof SB_ALIGNS)[number];
  icon: (typeof SB_ICONS)[number];
  button: (typeof SB_BUTTONS)[number];
  offsetTop: number;
  placeholder: string;
  // Circular AI Search Button inside input field
  aiButton: boolean;
  aiButtonSize: number;
  aiButtonStyle: "accent" | "tonal" | "glow" | "minimal";
  aiButtonIcon: "sparkles" | "bot" | "brain" | "zap";
  aiButtonUrl: string;
};

/* ---------- text animation ---------- */

export const ANIM_PRESET_IDS = ["subtle", "expressive", "bouncy", "cinematic", "decode", "off"] as const;
export type AnimPresetId = (typeof ANIM_PRESET_IDS)[number];
export const ENTER_EFFECTS = ["none", "fade", "rise", "drop", "pop", "blur", "flip", "wave", "scramble", "glow"] as const;
export const EXIT_EFFECTS = ["none", "fade", "fall", "rise", "shrink", "blur", "fly", "dissolve"] as const;
export const EASINGS = ["emphasized", "spring", "bouncy", "smooth", "linear"] as const;
export const CARETS = ["native", "bar", "block", "underline"] as const;
export const BLINKS = ["blink", "fade", "solid"] as const;
export type Easing = (typeof EASINGS)[number];

export type TextAnim = {
  preset: AnimPresetId | "custom";
  enabled: boolean;
  enter: (typeof ENTER_EFFECTS)[number];
  exit: (typeof EXIT_EFFECTS)[number];
  enterDuration: number;
  exitDuration: number;
  stagger: number;
  intensity: number;
  easing: Easing;
  highlight: boolean;
  caret: (typeof CARETS)[number];
  caretSmooth: boolean;
  caretBlink: (typeof BLINKS)[number];
  typewriter: boolean;
  typewriterSpeed: number;
};

/* ---------- home screen widgets ---------- */

export const CLOCK_FACES = [
  "classic",
  "cookie",
  "sunny",
  "clover",
  "flower",
  "burst",
  "squircle",
  "numerals",
  "chrono",
  "minimal",
  "orbit",
  "pie",
  "wavy",
  "stacked",
  "bubbles",
  "shapes",
  "wide",
  "thin",
  "flip",
  "segment",
  "matrix",
  "binary",
  "calendar",
  "glance",
  "progress",
] as const;
export type ClockFaceId = (typeof CLOCK_FACES)[number];

export const WEATHER_FACES = [
  "w01_sunny",
  "w02_partly_cloudy",
  "w12_humidity_ring",
  "w15_rain_chance",
] as const;
export type WeatherFaceId = (typeof WEATHER_FACES)[number];

export const BOOKMARK_LAYOUTS = ["1x1", "2x1", "2x2", "4x1", "4x2"] as const;
export type BookmarksLayout = (typeof BOOKMARK_LAYOUTS)[number];

export const WIDGET_COLORS = ["primary", "secondary", "tertiary", "neutral"] as const;
export const SECOND_MODES = ["off", "tick", "sweep"] as const;
export const HOUR_CYCLES = ["auto", "h23", "h12"] as const;
export type SecondsMode = (typeof SECOND_MODES)[number];
export type HourCycle = (typeof HOUR_CYCLES)[number];

export type BaseWidget = {
  id: string;
  x: number;
  y: number;
  size: number;
  color: (typeof WIDGET_COLORS)[number];
  opacity: number;
};

export type ClockWidget = BaseWidget & {
  type: "clock";
  face: ClockFaceId;
  seconds: SecondsMode;
  date: boolean;
  hourCycle: HourCycle;
  timeZone: string;
  label: string;
};

export type WeatherWidget = BaseWidget & {
  type: "weather";
  face: WeatherFaceId;
  city: string;
  unit: "c" | "f";
  label: string;
  styleVariant: "m3" | "matrix";
};

export type CustomHtmlWidget = BaseWidget & {
  type: "custom_html";
  face: "html";
  html: string;
  title: string;
  label: string;
  styleVariant: "m3" | "matrix";
};

export type BookmarksWidget = BaseWidget & {
  type: "bookmarks";
  face: "bookmarks";
  title: string;
  layout: BookmarksLayout;
  label: string;
  styleVariant: "m3" | "matrix";
  scrollable?: boolean;
  iconSize?: number;
  showLabels?: boolean;
  columns?: number;
};

export type HomeWidget = ClockWidget | WeatherWidget | CustomHtmlWidget | BookmarksWidget;

export type HomeLayout = {
  mode: "free" | "grid";
  cell: number;
  showGrid: "editing" | "always" | "never";
  guides: boolean;
};

/* Movable and resizable configuration for Logo, Search Bar, and Buttons as widgets */
export type ElementPosition = {
  custom: boolean;
  x: number;
  y: number;
  width: number;
  scale: number;
  visible: boolean;
};

export type ButtonsPosition = ElementPosition & {
  columns: number;
  iconSize: number;
  showAddButton?: boolean;
};

export type LauncherLayout = {
  logo: ElementPosition;
  search: ElementPosition;
  buttons: ButtonsPosition;
  addButton: ElementPosition;
};

export const DEFAULT_LAUNCHER_LAYOUT: LauncherLayout = {
  logo: { custom: false, x: 0.5, y: 0.12, width: 340, scale: 100, visible: true },
  search: { custom: false, x: 0.5, y: 0.28, width: 672, scale: 100, visible: true },
  buttons: { custom: false, x: 0.5, y: 0.44, width: 672, scale: 100, visible: true, columns: 6, iconSize: 56, showAddButton: false },
  addButton: { custom: false, x: 0.5, y: 0.60, width: 220, scale: 100, visible: false },
};

export const MAX_WIDGETS = 48;

export const DEFAULT_WIDGET: ClockWidget = {
  id: "",
  type: "clock",
  face: "classic",
  x: 0.04,
  y: 0.08,
  size: 200,
  color: "primary",
  seconds: "off",
  date: false,
  hourCycle: "auto",
  timeZone: "local",
  label: "",
  opacity: 100,
};

export const DEFAULT_WEATHER_WIDGET: WeatherWidget = {
  id: "",
  type: "weather",
  face: "w01_sunny",
  x: 0.04,
  y: 0.38,
  size: 300,
  color: "primary",
  city: "Moscow",
  unit: "c",
  label: "",
  opacity: 100,
  styleVariant: "m3",
};

export const DEFAULT_HTML_WIDGET: CustomHtmlWidget = {
  id: "",
  type: "custom_html",
  face: "html",
  title: "Custom Card",
  label: "",
  x: 0.04,
  y: 0.55,
  size: 320,
  color: "primary",
  opacity: 100,
  styleVariant: "m3",
  html: `<div style="box-sizing:border-box;width:100%;min-height:220px;padding:24px;border-radius:28px;background:#ececec;color:#1a1a1a;font-family:'Roboto Flex',system-ui,sans-serif;display:flex;flex-direction:column;justify-content:space-between;gap:16px;">
  <div style="display:flex;justify-content:space-between;align-items:center;font-size:14px;font-weight:500;">
    <span>{city}</span>
    <span style="padding:4px 12px;border-radius:999px;border:1px solid #1a1a1a;font-size:12px;font-weight:500;">UV {uv}</span>
  </div>
  <div style="display:flex;align-items:center;justify-content:space-between;">
    <div style="font-size:64px;font-weight:500;line-height:1;letter-spacing:-1px;">{temp}°</div>
    <div style="font-size:18px;font-weight:600;">{condition}</div>
  </div>
  <div style="display:flex;justify-content:space-between;align-items:center;font-size:13px;font-weight:500;color:#4a4a4a;">
    <span>Wind {wind} km/h</span>
    <span>Humidity {humidity}%</span>
    <span>H {high}° · L {low}°</span>
  </div>
</div>`,
};

export const DEFAULT_BOOKMARKS_WIDGET: BookmarksWidget = {
  id: "",
  type: "bookmarks",
  face: "bookmarks",
  title: "Favorites",
  layout: "2x2",
  label: "",
  x: 0.04,
  y: 0.55,
  size: 260,
  color: "primary",
  opacity: 100,
  styleVariant: "m3",
  scrollable: false,
  iconSize: 44,
  showLabels: true,
  columns: 2,
};

export const DEFAULT_HOME_LAYOUT: HomeLayout = { mode: "free", cell: 32, showGrid: "editing", guides: true };

/* ---------- all settings ---------- */

export type Settings = {
  language: "auto" | LanguageCode;
  theme: ThemeMode;
  logo: LogoMode;
  logoText: string;
  logoFont: LogoFont;
  fontTheme: FontTheme;
  searchSuggestions: boolean;
  colorSource: ColorSource;
  presetId: PresetId;
  customColor: string;
  schemeVariant: SchemeVariant;
  /** Material contrast level: 0, 0.5 or 1. */
  contrast: number;
  /** Seed colours extracted from the wallpaper (derived, cached for instant start-up). */
  wallpaperColors: string[];
  wallpaperColorIndex: number;
  wallpaperTone: WallpaperTone;
  /** Where the wallpaper comes from; the file itself lives in IndexedDB. */
  wallpaperSource: WallpaperSource;
  wallpaperUrl: string;
  wallpaperDim: number;
  wallpaperBlur: number;
  wallpaperGrayscale: boolean;
  uiAnimation: "fluid" | "snappy" | "gentle" | "off";
  bookmarkShape: BookmarkShape;
  searchStyle: SearchStyle;
  textAnim: TextAnim;
  widgets: HomeWidget[];
  homeLayout: HomeLayout;
  launcherLayout: LauncherLayout;
};

export const BOOKMARKS_KEY = "lisyan_bookmarks";
export const SETTINGS_KEY = "lisyan_settings";
export const HISTORY_KEY = "lisyan_search_history";
export const GOOGLE_LOGO = "https://cdn.freebiesupply.com/images/large/2x/google-logo-black-transparent.png";

export const DEFAULT_SEARCH_STYLE: SearchStyle = {
  preset: "expressive",
  width: 672,
  height: 64,
  radius: 32,
  focusRadius: 28,
  focusScale: 100,
  fill: "filled",
  opacity: 100,
  blur: 16,
  borderWidth: 0,
  borderColor: "outline",
  shadow: "none",
  focusRing: "none",
  fontSize: 18,
  fontWeight: 400,
  align: "start",
  icon: "search",
  button: "filled",
  offsetTop: 16,
  placeholder: "",
  aiButton: true,
  aiButtonSize: 34,
  aiButtonStyle: "accent",
  aiButtonIcon: "sparkles",
  aiButtonUrl: "https://www.google.com/search?q={q}&udm=50",
};

const SEARCH_PRESETS: Record<SearchPresetId, Partial<SearchStyle>> = {
  expressive: {},
  soft: { height: 60, radius: 22, focusRadius: 22, shadow: "medium", button: "tonal" },
  outlined: { fill: "outlined", opacity: 0, borderWidth: 2, radius: 16, focusRadius: 16, focusRing: "ring", button: "tonal" },
  minimal: { fill: "underline", borderWidth: 2, borderColor: "fg", radius: 0, focusRadius: 0, height: 56, fontSize: 20, button: "icon" },
  glass: { fill: "glass", opacity: 55, blur: 24, radius: 32, focusRadius: 24, borderWidth: 1, shadow: "soft" },
  brutal: { radius: 0, focusRadius: 0, borderWidth: 3, borderColor: "fg", shadow: "hard", fontWeight: 700 },
  spotlight: { width: 760, height: 76, radius: 38, focusRadius: 38, fontSize: 24, align: "center", icon: "none", button: "none", focusRing: "glow", shadow: "strong", focusScale: 102 },
  terminal: { fill: "outlined", opacity: 0, borderWidth: 1, borderColor: "primary", radius: 8, focusRadius: 8, icon: "chevron", button: "none", fontWeight: 500, focusRing: "glow" },
};

export function applySearchPreset(current: SearchStyle, id: SearchPresetId): SearchStyle {
  // Presets describe the look; the user's own text and position are kept.
  return { ...DEFAULT_SEARCH_STYLE, ...SEARCH_PRESETS[id], preset: id, placeholder: current.placeholder, offsetTop: current.offsetTop };
}

export const DEFAULT_TEXT_ANIM: TextAnim = {
  preset: "expressive",
  enabled: true,
  enter: "rise",
  exit: "fall",
  enterDuration: 320,
  exitDuration: 220,
  stagger: 18,
  intensity: 55,
  easing: "spring",
  highlight: false,
  caret: "bar",
  caretSmooth: true,
  caretBlink: "fade",
  typewriter: true,
  typewriterSpeed: 70,
};

const ANIM_PRESETS: Record<AnimPresetId, Partial<TextAnim>> = {
  subtle: { enabled: true, enter: "fade", exit: "fade", enterDuration: 180, exitDuration: 140, stagger: 10, intensity: 30, easing: "smooth", highlight: false },
  expressive: { enabled: true, enter: "rise", exit: "fall", enterDuration: 320, exitDuration: 220, stagger: 18, intensity: 55, easing: "spring", highlight: false },
  bouncy: { enabled: true, enter: "wave", exit: "shrink", enterDuration: 440, exitDuration: 200, stagger: 28, intensity: 70, easing: "bouncy", highlight: true },
  cinematic: { enabled: true, enter: "blur", exit: "dissolve", enterDuration: 520, exitDuration: 380, stagger: 30, intensity: 65, easing: "emphasized", highlight: false },
  decode: { enabled: true, enter: "scramble", exit: "blur", enterDuration: 380, exitDuration: 180, stagger: 22, intensity: 50, easing: "linear", highlight: true },
  off: { enabled: false },
};

export function applyAnimPreset(current: TextAnim, id: AnimPresetId): TextAnim {
  // Presets change the motion; cursor and placeholder preferences are kept.
  return { ...current, ...ANIM_PRESETS[id], preset: id };
}

type FlatSettings = Omit<Settings, "searchStyle" | "textAnim" | "widgets" | "homeLayout" | "launcherLayout">;

const DEFAULT_FLAT: FlatSettings = {
  language: "auto",
  theme: "system",
  logo: "google",
  logoText: "LisYan",
  logoFont: "theme",
  fontTheme: "m3",
  searchSuggestions: true,
  colorSource: "mono",
  presetId: "ocean",
  customColor: "#6750a4",
  schemeVariant: "tonal",
  contrast: 0,
  wallpaperColors: [],
  wallpaperColorIndex: 0,
  wallpaperTone: "unknown",
  wallpaperSource: "none",
  wallpaperUrl: "",
  wallpaperDim: 35,
  wallpaperBlur: 0,
  wallpaperGrayscale: false,
  uiAnimation: "fluid",
  bookmarkShape: "circle",
};

export const DEFAULT_SETTINGS: Settings = {
  ...DEFAULT_FLAT,
  searchStyle: DEFAULT_SEARCH_STYLE,
  textAnim: DEFAULT_TEXT_ANIM,
  widgets: [],
  homeLayout: DEFAULT_HOME_LAYOUT,
  launcherLayout: DEFAULT_LAUNCHER_LAYOUT,
};

/* ---------- schema: validation of stored data + slider ranges ---------- */

export type Field =
  | { kind: "enum"; values: readonly string[] }
  | { kind: "number"; min: number; max: number; step: number }
  | { kind: "boolean" }
  | { kind: "string"; max: number }
  | { kind: "color" }
  | { kind: "colors" };
type Schema<T> = { [K in keyof T]-?: Field };

const num = (min: number, max: number, step = 1): Field => ({ kind: "number", min, max, step });
const oneOf = (values: readonly string[]): Field => ({ kind: "enum", values });
const BOOL: Field = { kind: "boolean" };
const str = (max: number): Field => ({ kind: "string", max });
const HEX = /^#[0-9a-f]{6}$/i;

const FLAT_SCHEMA: Schema<FlatSettings> = {
  language: oneOf(["auto", ...LANGUAGES.map((language) => language.code)]),
  theme: oneOf(["system", "light", "dark", "wallpaper"]),
  logo: oneOf(["google", "none", "text"]),
  logoText: str(40),
  logoFont: oneOf(["theme", "sans", "matrix"]),
  fontTheme: oneOf(["m3", "matrix"]),
  searchSuggestions: BOOL,
  colorSource: oneOf(["mono", "wallpaper", "preset", "custom"]),
  presetId: oneOf(PRESET_IDS),
  customColor: { kind: "color" },
  schemeVariant: oneOf(SCHEME_VARIANTS),
  contrast: num(0, 1, 0.5),
  wallpaperColors: { kind: "colors" },
  wallpaperColorIndex: num(0, 5),
  wallpaperTone: oneOf(["unknown", "dark", "light"]),
  wallpaperSource: oneOf(["none", "file", "url"]),
  wallpaperUrl: str(4096),
  wallpaperDim: num(0, 80),
  wallpaperBlur: num(0, 24),
  wallpaperGrayscale: BOOL,
  uiAnimation: oneOf(["fluid", "snappy", "gentle", "off"]),
  bookmarkShape: oneOf(BOOKMARK_SHAPES),
};

export const SEARCH_STYLE_SCHEMA: Schema<SearchStyle> = {
  preset: oneOf([...SEARCH_PRESET_IDS, "custom"]),
  width: num(420, 960, 8),
  height: num(44, 88, 2),
  radius: num(0, 44),
  focusRadius: num(0, 44),
  focusScale: num(100, 106),
  fill: oneOf(SB_FILLS),
  opacity: num(0, 100),
  blur: num(0, 40),
  borderWidth: num(0, 4),
  borderColor: oneOf(SB_BORDER_COLORS),
  shadow: oneOf(SB_SHADOWS),
  focusRing: oneOf(SB_RINGS),
  fontSize: num(14, 28),
  fontWeight: num(300, 800, 100),
  align: oneOf(SB_ALIGNS),
  icon: oneOf(SB_ICONS),
  button: oneOf(SB_BUTTONS),
  offsetTop: num(6, 40),
  placeholder: str(80),
  aiButton: BOOL,
  aiButtonSize: num(24, 48),
  aiButtonStyle: oneOf(["accent", "tonal", "glow", "minimal"]),
  aiButtonIcon: oneOf(["sparkles", "bot", "brain", "zap"]),
  aiButtonUrl: str(1024),
};

export const TEXT_ANIM_SCHEMA: Schema<TextAnim> = {
  preset: oneOf([...ANIM_PRESET_IDS, "custom"]),
  enabled: BOOL,
  enter: oneOf(ENTER_EFFECTS),
  exit: oneOf(EXIT_EFFECTS),
  enterDuration: num(60, 1000, 10),
  exitDuration: num(60, 1000, 10),
  stagger: num(0, 80),
  intensity: num(0, 100),
  easing: oneOf(EASINGS),
  highlight: BOOL,
  caret: oneOf(CARETS),
  caretSmooth: BOOL,
  caretBlink: oneOf(BLINKS),
  typewriter: BOOL,
  typewriterSpeed: num(20, 200, 5),
};

export const WIDGET_SCHEMA: Schema<ClockWidget> = {
  id: str(64),
  type: oneOf(["clock"]),
  face: oneOf(CLOCK_FACES),
  x: num(0, 1, 0.0001),
  y: num(0, 1, 0.0001),
  size: num(80, 520),
  color: oneOf(WIDGET_COLORS),
  seconds: oneOf(SECOND_MODES),
  date: BOOL,
  hourCycle: oneOf(HOUR_CYCLES),
  timeZone: str(64),
  label: str(40),
  opacity: num(20, 100),
};

export const WEATHER_WIDGET_SCHEMA: Schema<WeatherWidget> = {
  id: str(64),
  type: oneOf(["weather"]),
  face: oneOf(WEATHER_FACES),
  x: num(0, 1, 0.0001),
  y: num(0, 1, 0.0001),
  size: num(80, 520),
  color: oneOf(WIDGET_COLORS),
  city: str(64),
  unit: oneOf(["c", "f"]),
  label: str(40),
  opacity: num(20, 100),
  styleVariant: oneOf(["m3", "matrix"]),
};

export const CUSTOM_HTML_SCHEMA: Schema<CustomHtmlWidget> = {
  id: str(64),
  type: oneOf(["custom_html"]),
  face: oneOf(["html"]),
  x: num(0, 1, 0.0001),
  y: num(0, 1, 0.0001),
  size: num(80, 520),
  color: oneOf(WIDGET_COLORS),
  html: str(20000),
  title: str(64),
  label: str(40),
  opacity: num(20, 100),
  styleVariant: oneOf(["m3", "matrix"]),
};

export const BOOKMARKS_WIDGET_SCHEMA: Schema<BookmarksWidget> = {
  id: str(64),
  type: oneOf(["bookmarks"]),
  face: oneOf(["bookmarks"]),
  x: num(0, 1, 0.0001),
  y: num(0, 1, 0.0001),
  size: num(80, 520),
  color: oneOf(WIDGET_COLORS),
  title: str(64),
  layout: oneOf(BOOKMARK_LAYOUTS),
  label: str(40),
  opacity: num(20, 100),
  styleVariant: oneOf(["m3", "matrix"]),
  scrollable: BOOL,
  iconSize: num(24, 80, 4),
  showLabels: BOOL,
  columns: num(1, 8),
};

export const HOME_LAYOUT_SCHEMA: Schema<HomeLayout> = {
  mode: oneOf(["free", "grid"]),
  cell: num(8, 96, 4),
  showGrid: oneOf(["editing", "always", "never"]),
  guides: BOOL,
};

function sanitize<T extends object>(raw: unknown, schema: Schema<T>, defaults: T): T {
  const source = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const out = { ...defaults } as Record<string, unknown>;
  for (const key of Object.keys(schema) as (keyof T & string)[]) {
    const field = schema[key];
    const value = source[key];
    switch (field.kind) {
      case "enum":
        if (typeof value === "string" && field.values.includes(value)) out[key] = value;
        break;
      case "number":
        if (typeof value === "number" && Number.isFinite(value)) {
          const stepped = Math.round((value - field.min) / field.step) * field.step + field.min;
          out[key] = Math.min(field.max, Math.max(field.min, Number(stepped.toFixed(4))));
        }
        break;
      case "boolean":
        if (typeof value === "boolean") out[key] = value;
        break;
      case "string":
        if (typeof value === "string") out[key] = value.slice(0, field.max);
        break;
      case "color":
        if (typeof value === "string" && HEX.test(value)) out[key] = value.toLowerCase();
        break;
      case "colors":
        if (Array.isArray(value)) out[key] = value.filter((c): c is string => typeof c === "string" && HEX.test(c)).slice(0, 6);
        break;
    }
  }
  return out as T;
}

/** Slider range of a numeric schema field. */
export function limits(field: Field) {
  return field.kind === "number" ? { min: field.min, max: field.max, step: field.step } : { min: 0, max: 100, step: 1 };
}

function sanitizeWidgets(raw: unknown): HomeWidget[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  return raw
    .filter((item) => item && typeof item === "object")
    .slice(0, MAX_WIDGETS)
    .map((item) => {
      const type = (item as { type?: string }).type;
      let widget: HomeWidget;
      if (type === "weather") {
        widget = sanitize(item, WEATHER_WIDGET_SCHEMA, DEFAULT_WEATHER_WIDGET);
      } else if (type === "custom_html") {
        widget = sanitize(item, CUSTOM_HTML_SCHEMA, DEFAULT_HTML_WIDGET);
      } else if (type === "bookmarks") {
        widget = sanitize(item, BOOKMARKS_WIDGET_SCHEMA, DEFAULT_BOOKMARKS_WIDGET);
      } else {
        widget = sanitize(item, WIDGET_SCHEMA, DEFAULT_WIDGET);
      }
      let id = widget.id.trim();
      if (!id || seen.has(id)) id = Math.random().toString(36).slice(2, 12);
      seen.add(id);
      return { ...widget, id };
    });
}

function sanitizeLauncherLayout(raw: unknown): LauncherLayout {
  if (!raw || typeof raw !== "object") return DEFAULT_LAUNCHER_LAYOUT;
  const r = raw as Record<string, unknown>;
  const sanitizePos = (pos: unknown, d: ElementPosition): ElementPosition => {
    if (!pos || typeof pos !== "object") return d;
    const p = pos as Record<string, unknown>;
    return {
      custom: typeof p.custom === "boolean" ? p.custom : d.custom,
      x: typeof p.x === "number" && Number.isFinite(p.x) ? Math.min(1, Math.max(0, p.x)) : d.x,
      y: typeof p.y === "number" && Number.isFinite(p.y) ? Math.min(1, Math.max(0, p.y)) : d.y,
      width: typeof p.width === "number" && Number.isFinite(p.width) ? Math.min(1600, Math.max(120, p.width)) : d.width,
      scale: typeof p.scale === "number" && Number.isFinite(p.scale) ? Math.min(250, Math.max(40, p.scale)) : d.scale,
      visible: typeof p.visible === "boolean" ? p.visible : d.visible,
    };
  };

  const sanitizeButtons = (pos: unknown, d: ButtonsPosition): ButtonsPosition => {
    const base = sanitizePos(pos, d);
    const p = (pos && typeof pos === "object" ? pos : {}) as Record<string, unknown>;
    return {
      ...base,
      columns: typeof p.columns === "number" && Number.isFinite(p.columns) ? Math.min(12, Math.max(1, p.columns)) : d.columns,
      iconSize: typeof p.iconSize === "number" && Number.isFinite(p.iconSize) ? Math.min(96, Math.max(32, p.iconSize)) : d.iconSize,
      showAddButton: typeof p.showAddButton === "boolean" ? p.showAddButton : (d.showAddButton ?? false),
    };
  };

  return {
    logo: sanitizePos(r.logo, DEFAULT_LAUNCHER_LAYOUT.logo),
    search: sanitizePos(r.search, DEFAULT_LAUNCHER_LAYOUT.search),
    buttons: sanitizeButtons(r.buttons, DEFAULT_LAUNCHER_LAYOUT.buttons),
    addButton: sanitizePos(r.addButton, DEFAULT_LAUNCHER_LAYOUT.addButton),
  };
}

export function readSettings(): Settings {
  let raw: Record<string, unknown> = {};
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");
    if (parsed && typeof parsed === "object") raw = parsed as Record<string, unknown>;
  } catch {
    // Corrupted storage — fall back to defaults.
  }
  return {
    ...sanitize(raw, FLAT_SCHEMA, DEFAULT_FLAT),
    searchStyle: sanitize(raw.searchStyle, SEARCH_STYLE_SCHEMA, DEFAULT_SEARCH_STYLE),
    textAnim: sanitize(raw.textAnim, TEXT_ANIM_SCHEMA, DEFAULT_TEXT_ANIM),
    widgets: sanitizeWidgets(raw.widgets),
    homeLayout: sanitize(raw.homeLayout, HOME_LAYOUT_SCHEMA, DEFAULT_HOME_LAYOUT),
    launcherLayout: sanitizeLauncherLayout(raw.launcherLayout),
  };
}

export function readBookmarks(): Bookmark[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(BOOKMARKS_KEY) || "[]");
    if (!Array.isArray(value)) return [];
    return value
      .filter(
        (item): item is Bookmark =>
          Boolean(item) && typeof item.id === "string" && typeof item.title === "string" && typeof item.url === "string",
      )
      .map((b) => ({
        id: b.id,
        title: b.title,
        url: b.url,
        customIcon: typeof (b as Bookmark).customIcon === "string" && (b as Bookmark).customIcon ? (b as Bookmark).customIcon : undefined,
        shape: typeof (b as Bookmark).shape === "string" && (BOOKMARK_SHAPES as readonly string[]).includes((b as Bookmark).shape!) ? (b as Bookmark).shape : undefined,
      }));
  } catch {
    return [];
  }
}

export function readHistory(): string[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

export function persist(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage can be unavailable (private mode, quota); the in-memory state still works.
  }
}

export const normalizeUrl = (value: string) => (/^https?:\/\//i.test(value) ? value : `https://${value}`);

export function getHost(value: string) {
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return value;
  }
}
