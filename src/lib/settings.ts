import { LANGUAGES, type LanguageCode } from "../i18n/languages";

export type ThemeMode = "system" | "light" | "dark" | "wallpaper";
export type LogoMode = "google" | "none" | "text";
export type FontTheme = "m3" | "matrix";
export type LogoFont = "theme" | "sans" | "matrix";
export const LOGO_STYLES = ["classic", "expressive", "pills", "shape", "chip", "duotone", "outline", "dots", "mark", "stack", "matrix"] as const;
export type LogoStyle = (typeof LOGO_STYLES)[number];
export const LOGO_COLORS = ["colorful", "theme", "primary", "tertiary", "mono"] as const;
export type LogoColor = (typeof LOGO_COLORS)[number];
export const LOGO_ANIMATIONS = ["none", "rise", "wave", "bounce"] as const;
export type LogoAnimation = (typeof LOGO_ANIMATIONS)[number];
export const LOGO_SUBTITLES = ["none", "greeting", "date", "custom"] as const;
export type LogoSubtitle = (typeof LOGO_SUBTITLES)[number];
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
  | "betterbar"
  | "news"
  | "favicon"
  | "appmenu"
  | "backup"
  | "developer"
  | "scripts"
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
  /** button = one-shot action; toggle = stays on and re-routes every search through AI. */
  aiMode: AiMode;
  /** Start with the AI toggle turned on. */
  aiDefaultOn: boolean;
};

/* ---------- text animation ---------- */

export const ANIM_PRESET_IDS = ["subtle", "expressive", "bouncy", "cinematic", "decode", "off"] as const;
export type AnimPresetId = (typeof ANIM_PRESET_IDS)[number];
export const ENTER_EFFECTS = ["none", "fade", "rise", "drop", "pop", "blur", "flip", "wave", "scramble", "glow", "ink", "reveal", "stretch", "slide", "assemble", "tilt"] as const;
export const EXIT_EFFECTS = ["none", "fade", "fall", "rise", "shrink", "blur", "fly", "dissolve", "shatter", "swirl", "mist", "zoom", "particles", "melt"] as const;
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
  /** Flourish when text is pasted or the whole value is replaced at once. */
  pasteAnim: boolean;
  /** Small particles while text is selected. */
  selectParticles: boolean;
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
  // Material You 2025 set
  "m3_pill",
  "m3_tiles",
  "m3_ring",
  "m3_chip",
  "m3_scallop",
  "m3_gem",
  "m3_arc",
  "m3_dot",
  // Calendars
  "cal_month",
  "cal_day",
  "cal_week",
  "cal_year",
  "m3_daybar",
  "m3_weekstrip",
  "m3_stacked",
  "m3_datering",
  "m3_chips",
] as const;
export type ClockFaceId = (typeof CLOCK_FACES)[number];

export const WEATHER_FACES = [
  "m3w_now",
  "m3w_shape",
  "m3w_pill",
  "m3w_details",
  "m3w_hourly",
  "m3w_daily",
  "m3w_rain",
  "m3w_sun",
  "m3w_wind",
  "m3w_humidity",
  "m3w_feels",
  "m3w_uv",
  "m3w_air",
  "m3w_moon",
  "m3w_combo",
] as const;

/** Older weather face ids → their Material replacement (keeps saved widgets working). */
export const LEGACY_WEATHER_FACES: Record<string, (typeof WEATHER_FACES)[number]> = {
  w01_sunny: "m3w_now",
  w02_partly_cloudy: "m3w_details",
  w03_rainy: "m3w_rain",
  w04_thunderstorm: "m3w_now",
  w05_snowfall: "m3w_now",
  w06_clear_night: "m3w_moon",
  w07_windy: "m3w_wind",
  w08_foggy: "m3w_now",
  w09_hot_humid: "m3w_feels",
  w10_uv: "m3w_uv",
  w11_wind_compass: "m3w_wind",
  w12_humidity_ring: "m3w_humidity",
  w13_aqi: "m3w_air",
  w14_pressure: "m3w_details",
  w15_rain_chance: "m3w_rain",
  w16_pollen: "m3w_air",
  w17_feels_like: "m3w_feels",
  w18_sun_cycle: "m3w_sun",
  w19_moon_phase: "m3w_moon",
  w20_forecast_5d: "m3w_daily",
  w21_hourly: "m3w_hourly",
  w22_temp_trend: "m3w_hourly",
  w23_weekly_rain: "m3w_daily",
  w24_alert: "m3w_pill",
  w25_city_hero: "m3w_shape",
  weather_glyph: "m3w_now",
  weather_classic: "m3w_now",
  weather_minimal: "m3w_pill",
  weather_pill: "m3w_pill",
  weather_compact: "m3w_shape",
  weather_forecast_5d: "m3w_daily",
  weather_hourly: "m3w_hourly",
  weather_gauge: "m3w_uv",
  weather_wind_compass: "m3w_wind",
  weather_sun_cycle: "m3w_sun",
  weather_air_quality: "m3w_air",
  weather_humidity_rain: "m3w_humidity",
  weather_pressure_baro: "m3w_details",
  weather_combo_clock: "m3w_combo",
  weather_moon_phase: "m3w_moon",
  weather_comfort_index: "m3w_feels",
  weather_weekly_table: "m3w_daily",
};
export type WeatherFaceId = (typeof WEATHER_FACES)[number];

export const BOOKMARK_LAYOUTS = ["1x1", "2x1", "2x2", "4x1", "4x2"] as const;
export type BookmarksLayout = (typeof BOOKMARK_LAYOUTS)[number];
/** Plain-language names for folder sizes: [English, Russian]. Tile count in brackets. */
export const BOOKMARK_LAYOUT_LABELS: Record<BookmarksLayout, [string, string]> = {
  "1x1": ["Small · 4", "Маленькая · 4"],
  "2x1": ["Row · 4", "Ряд · 4"],
  "2x2": ["Medium · 6", "Средняя · 6"],
  "4x1": ["Long row · 7", "Длинный ряд · 7"],
  "4x2": ["Large · 12", "Большая · 12"],
};

export const WIDGET_COLORS = ["primary", "secondary", "tertiary", "neutral"] as const;
export const SECOND_MODES = ["off", "tick", "sweep"] as const;
export const HOUR_CYCLES = ["auto", "h23", "h12"] as const;
export type SecondsMode = (typeof SECOND_MODES)[number];
export type HourCycle = (typeof HOUR_CYCLES)[number];

export type BaseWidget = {
  id: string;
  x: number;
  y: number;
  /** Legacy pixel size (kept for old saves; spans below decide the real size). */
  size: number;
  /** Width in grid cells. Missing → the default for the widget's shape. */
  cols?: number;
  /** Height in grid cells. Round widgets always use cols = rows. */
  rows?: number;
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

/** One website as a round home-screen shortcut (an Android-style app icon). */
export type ShortcutWidget = BaseWidget & {
  type: "shortcut";
  face: "shortcut";
  url: string;
  title: string;
  label: string;
  /** Optional uploaded icon (data URL); otherwise the site's favicon is used. */
  customIcon: string;
  /** original = the site's own colours; themed = repainted in the palette like the app menu. */
  iconStyle: "original" | "themed";
  showTitle: boolean;
};

export type HomeWidget = ClockWidget | WeatherWidget | CustomHtmlWidget | BookmarksWidget | ShortcutWidget;

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
  /** Shortcut rows under the search bar (the row never gets wider than the bar). */
  rows?: number;
  showLabels?: boolean;
  /** A "+" tile at the end of the row while there is room for another shortcut. */
  addTile?: boolean;
};

export type LauncherLayout = {
  logo: ElementPosition;
  search: ElementPosition;
  buttons: ButtonsPosition;
  addButton: ElementPosition;
  /** The secondary "Better Search Bar" element. */
  betterBar: ElementPosition & { config: BetterBarConfig };
};

export const DEFAULT_BETTER_BAR: BetterBarConfig = {
  slots: [
    { kind: "ai", label: "" },
    { kind: "incognito", label: "" },
  ],
  height: 56,
  radius: 28,
  attach: true,
  voice: true,
  placeholder: "",
  aiOn: true,
};

export const DEFAULT_LAUNCHER_LAYOUT: LauncherLayout = {
  logo: { custom: false, x: 0.5, y: 0.12, width: 340, scale: 100, visible: true },
  search: { custom: false, x: 0.5, y: 0.28, width: 672, scale: 100, visible: true },
  buttons: { custom: false, x: 0.5, y: 0.44, width: 672, scale: 100, visible: true, columns: 6, iconSize: 56, showAddButton: false, rows: 2, showLabels: true, addTile: true },
  addButton: { custom: false, x: 0.5, y: 0.60, width: 220, scale: 100, visible: false },
  betterBar: { custom: false, x: 0.5, y: 0.62, width: 672, scale: 100, visible: false, config: DEFAULT_BETTER_BAR },
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
  face: "m3w_now",
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

export const DEFAULT_SHORTCUT_WIDGET: ShortcutWidget = {
  id: "",
  type: "shortcut",
  face: "shortcut",
  x: 0.5,
  y: 0.5,
  size: 96,
  cols: 1,
  rows: 1,
  color: "primary",
  opacity: 100,
  url: "https://www.google.com/",
  title: "Google",
  label: "",
  customIcon: "",
  iconStyle: "themed",
  showTitle: true,
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

export const DEFAULT_HOME_LAYOUT: HomeLayout = { mode: "grid", cell: 88, showGrid: "editing", guides: true };

/* ---------- app menu (the 9-dot drawer) ---------- */

export const MENU_MODES = ["google", "microsoft", "both", "custom"] as const;
export type MenuMode = (typeof MENU_MODES)[number];
/** themed = Material-painted SVG layers; tile = full-colour logo on a tonal tile; original = bare logo. */
export const MENU_ICON_STYLES = ["themed", "tile", "original"] as const;
export type MenuIconStyle = (typeof MENU_ICON_STYLES)[number];
/** Shapes for the icon container (themed / tile styles). */
export const MENU_SHAPES = ["squircle", "circle", "rounded", "square", "cookie", "flower", "clover", "sunny"] as const;
export type MenuShape = (typeof MENU_SHAPES)[number];
export const MENU_COLUMNS = [3, 4, 5] as const;
export const MENU_ICON_SIZE = { min: 32, max: 56, default: 40 } as const;
// Favicon theming for other sites (the generated userscript).
export const FAVICON_MODES = ["themed", "mono", "original"] as const;
export type FaviconMode = (typeof FAVICON_MODES)[number];
export type FaviconTheme = {
  mode: FaviconMode;
  color: string;
  auto: boolean;
  useThemeColor: boolean;
  /** Browser favicon cache lifetime after the last visit, in days. */
  cacheDays: number;
  /** Resolved theme tones for the extension (computed at sync time, never stored in settings). */
  palette?: import("./favicon-recolor").FaviconPalette;
};
export const DEFAULT_FAVICON_THEME: FaviconTheme = { mode: "themed", color: "#f5f5f7", auto: true, useThemeColor: true, cacheDays: 5 };

/* ---------- quick pills under the search bar ---------- */

export const QUICK_PILL_KINDS = ["incognito", "ai", "news", "voice", "lens", "attach", "custom"] as const;
export type QuickPillKind = (typeof QUICK_PILL_KINDS)[number];

export type QuickPill = {
  id: string;
  kind: QuickPillKind;
  /** User label; empty means the localised built-in label. */
  label: string;
  enabled: boolean;
  /** Only for kind = custom. */
  url?: string;
};

export type QuickPills = {
  enabled: boolean;
  /** Height in px. Pills otherwise inherit the search bar's shape and surface. */
  height: number;
  showLabels: boolean;
  showIcons: boolean;
  /** Add a little separation from the search bar. */
  gap: number;
  items: QuickPill[];
};

export const DEFAULT_QUICK_PILLS: QuickPills = {
  enabled: true,
  height: 38,
  showLabels: true,
  showIcons: true,
  gap: 10,
  items: [
    { id: "pill-incognito", kind: "incognito", label: "", enabled: true },
    { id: "pill-ai", kind: "ai", label: "", enabled: true },
  ],
};

/* ---------- news feed ---------- */

export const NEWS_SOURCES = ["mix", "google", "hackernews", "bbc", "verge", "guardian", "wired", "nyt", "techcrunch", "arstechnica", "nature", "espn"] as const;
export type NewsSource = (typeof NEWS_SOURCES)[number];
export const NEWS_TOPICS = ["top", "tech", "ai", "science", "business", "world", "culture", "sport"] as const;
export type NewsTopic = (typeof NEWS_TOPICS)[number];
export const NEWS_LAYOUTS = ["cards", "list"] as const;
export type NewsLayout = (typeof NEWS_LAYOUTS)[number];

export type NewsSettings = {
  enabled: boolean;
  source: NewsSource;
  topics: NewsTopic[];
  count: number;
  layout: NewsLayout;
  showImages: boolean;
  showSource: boolean;
  showTopicChips: boolean;
  openInNewTab: boolean;
  region: "ru" | "us" | "global";
  /** Photos are repainted in the palette (duotone / monochrome) so the feed matches the theme. */
  imageTone: "color" | "duotone" | "mono";
  /** Rank stories by what you opened before (stored locally, never sent anywhere). */
  personalize: boolean;
  /** Which sources feed each topic in "mix" mode. Absent = the curated default for that topic. */
  topicSources: Partial<Record<NewsTopic, NewsSource[]>>;
};

export const DEFAULT_NEWS: NewsSettings = {
  enabled: true,
  source: "mix",
  topics: ["top", "tech", "ai"],
  count: 6,
  layout: "cards",
  showImages: true,
  showSource: true,
  showTopicChips: true,
  openInNewTab: true,
  region: "ru",
  imageTone: "color",
  personalize: true,
  topicSources: {},
};

/** How the AI search is triggered: a one-shot button, or a persistent toggle (nicer on a desktop). */
export const AI_MODES = ["button", "toggle"] as const;
/** Anything a slot in the Better Search Bar can hold. */
export const BAR_SLOT_KINDS = ["ai", "incognito", "voice", "attach", "lens", "widget", "icon"] as const;
export type BarSlotKind = (typeof BAR_SLOT_KINDS)[number];

/** A single slot: what it shows and how it looks. */
export type BarSlot = {
  kind: BarSlotKind;
  /** For kind "widget": the widget id. For "icon": a lucide icon name. */
  ref?: string;
  /** Optional user label; falls back to the built-in one. */
  label?: string;
};

export type BetterBarConfig = {
  /** Two slots under the bar, in order. */
  slots: [BarSlot, BarSlot];
  /** Height of the bar itself (matches the main search bar by default). */
  height: number;
  radius: number;
  /** Show the "+" attachment menu. */
  attach: boolean;
  /** Show voice input. */
  voice: boolean;
  placeholder: string;
  /** Send searches through Google AI Mode. */
  aiOn: boolean;
};


export type AiMode = (typeof AI_MODES)[number];

export const TOOL_COLORS = ["#4285F4", "#EA4335", "#F9AB00", "#34A853", "#7C4DFF", "#00ACC1", "#F06292", "#5F6368"] as const;

/** A tool the user added to their own menu. */
export type CustomTool = {
  id: string;
  title: string;
  url: string;
  color: string;
  /** Try the site's own icon first; fall back to a coloured letter. */
  favicon: boolean;
};

export type AppMenuSettings = {
  mode: MenuMode;
  /** Which provider is shown while mode is "both". */
  tab: "google" | "microsoft";
  iconStyle: MenuIconStyle;
  shape: MenuShape;
  /** Icon box in px. */
  iconSize: number;
  columns: number;
  showLabels: boolean;
  newTab: boolean;
  /** Ordered ids for mode "custom": catalog ids ("g.drive", "m.word") and own tools ("u.<id>"). */
  picks: string[];
  tools: CustomTool[];
};

export const DEFAULT_APP_MENU: AppMenuSettings = {
  mode: "google",
  tab: "google",
  iconStyle: "themed",
  shape: "squircle",
  iconSize: MENU_ICON_SIZE.default,
  columns: 4,
  showLabels: true,
  newTab: true,
  picks: [],
  tools: [],
};

function sanitizeFaviconTheme(raw: unknown): FaviconTheme {
  if (!raw || typeof raw !== "object") return DEFAULT_FAVICON_THEME;
  const r = raw as Record<string, unknown>;
  const mode = typeof r.mode === "string" && (FAVICON_MODES as readonly string[]).includes(r.mode) ? (r.mode as FaviconMode) : DEFAULT_FAVICON_THEME.mode;
  const color = typeof r.color === "string" && /^#[0-9a-f]{6}$/i.test(r.color) ? r.color : DEFAULT_FAVICON_THEME.color;
  return {
    mode,
    color,
    auto: typeof r.auto === "boolean" ? r.auto : DEFAULT_FAVICON_THEME.auto,
    useThemeColor: typeof r.useThemeColor === "boolean" ? r.useThemeColor : DEFAULT_FAVICON_THEME.useThemeColor,
    cacheDays: typeof r.cacheDays === "number" && Number.isFinite(r.cacheDays) ? Math.min(90, Math.max(1, Math.round(r.cacheDays))) : DEFAULT_FAVICON_THEME.cacheDays,
  };
}

/* ---------- quick pills / news / FoxNano validation ---------- */

function sanitizeQuickPills(raw: unknown): QuickPills {
  if (!raw || typeof raw !== "object") return DEFAULT_QUICK_PILLS;
  const r = raw as Record<string, unknown>;
  const seen = new Set<string>();
  const items = (Array.isArray(r.items) ? r.items : DEFAULT_QUICK_PILLS.items)
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    .map((item, index) => {
      const kind = item.kind === "foxnano" ? "ai" : (QUICK_PILL_KINDS as readonly string[]).includes(item.kind as string) ? (item.kind as QuickPillKind) : "custom";
      const id = typeof item.id === "string" && item.id.trim() ? item.id.slice(0, 64) : `pill-${index}`;
      return {
        id: seen.has(id) ? `${id}-${index}` : id,
        kind,
        label: typeof item.label === "string" ? item.label.slice(0, 32) : "",
        enabled: item.enabled !== false,
        url: safeWebUrl(item.url),
      };
    })
    .filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    })
    .slice(0, 8);
  return {
    enabled: r.enabled !== false,
    height: typeof r.height === "number" && Number.isFinite(r.height) ? Math.round(Math.min(56, Math.max(28, r.height))) : DEFAULT_QUICK_PILLS.height,
    showLabels: r.showLabels !== false,
    showIcons: r.showIcons !== false,
    gap: typeof r.gap === "number" && Number.isFinite(r.gap) ? Math.round(Math.min(28, Math.max(0, r.gap))) : DEFAULT_QUICK_PILLS.gap,
    items: items.length ? items : DEFAULT_QUICK_PILLS.items,
  };
}

function sanitizeTopicSources(raw: unknown): Partial<Record<NewsTopic, NewsSource[]>> {
  if (!raw || typeof raw !== "object") return {};
  const out: Partial<Record<NewsTopic, NewsSource[]>> = {};
  for (const [topic, list] of Object.entries(raw as Record<string, unknown>)) {
    if (!(NEWS_TOPICS as readonly string[]).includes(topic) || !Array.isArray(list)) continue;
    const sources = [...new Set(list.filter((x): x is NewsSource => (NEWS_SOURCES as readonly string[]).includes(x as string) && x !== "mix"))].slice(0, 12);
    if (sources.length) out[topic as NewsTopic] = sources;
  }
  return out;
}

function sanitizeNews(raw: unknown): NewsSettings {
  if (!raw || typeof raw !== "object") return DEFAULT_NEWS;
  const r = raw as Record<string, unknown>;
  const pick = <T extends string>(value: unknown, allowed: readonly T[], fallback: T): T =>
    typeof value === "string" && (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
  const topics = [...new Set((Array.isArray(r.topics) ? r.topics : DEFAULT_NEWS.topics).filter((topic): topic is NewsTopic => (NEWS_TOPICS as readonly string[]).includes(topic as string)))].slice(0, 6);
  return {
    enabled: r.enabled !== false,
    source: r.source === "reuters" ? "mix" : pick(r.source, NEWS_SOURCES, DEFAULT_NEWS.source),
    topics: topics.length ? topics : DEFAULT_NEWS.topics,
    count: typeof r.count === "number" && Number.isFinite(r.count) ? Math.round(Math.min(16, Math.max(2, r.count))) : DEFAULT_NEWS.count,
    layout: pick(r.layout, NEWS_LAYOUTS, DEFAULT_NEWS.layout),
    showImages: r.showImages !== false,
    showSource: r.showSource !== false,
    showTopicChips: r.showTopicChips !== false,
    openInNewTab: r.openInNewTab !== false,
    region: pick(r.region, ["ru", "us", "global"] as const, DEFAULT_NEWS.region),
    imageTone: pick(r.imageTone, ["color", "duotone", "mono"] as const, DEFAULT_NEWS.imageTone),
    personalize: r.personalize !== false,
    topicSources: sanitizeTopicSources(r.topicSources),
  };
}

function sanitizeAppMenu(raw: unknown): AppMenuSettings {
  if (!raw || typeof raw !== "object") return DEFAULT_APP_MENU;
  const r = raw as Record<string, unknown>;
  const pick = <T extends string>(value: unknown, allowed: readonly T[], fallback: T): T =>
    typeof value === "string" && (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
  const seen = new Set<string>();
  const tools: CustomTool[] = (Array.isArray(r.tools) ? r.tools : [])
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    .map((item) => ({
      id: typeof item.id === "string" && item.id.trim() ? item.id.slice(0, 64) : Math.random().toString(36).slice(2, 12),
      title: typeof item.title === "string" ? item.title.slice(0, 40) : "",
      url: safeWebUrl(item.url),
      color: typeof item.color === "string" && /^#[0-9a-f]{6}$/i.test(item.color) ? item.color : TOOL_COLORS[0],
      favicon: item.favicon !== false,
    }))
    .filter((tool) => tool.title.trim() && tool.url.trim())
    .filter((tool) => (seen.has(tool.id) ? false : (seen.add(tool.id), true)))
    .slice(0, 40);
  const picks = [...new Set((Array.isArray(r.picks) ? r.picks : []).filter((id): id is string => typeof id === "string" && id.length < 80))].slice(0, 120);
  return {
    mode: pick(r.mode, MENU_MODES, DEFAULT_APP_MENU.mode),
    tab: pick(r.tab, ["google", "microsoft"] as const, "google"),
    iconStyle: pick(r.iconStyle, MENU_ICON_STYLES, DEFAULT_APP_MENU.iconStyle),
    shape: pick(r.shape, MENU_SHAPES, DEFAULT_APP_MENU.shape),
    iconSize: typeof r.iconSize === "number" && Number.isFinite(r.iconSize) ? Math.round(Math.min(MENU_ICON_SIZE.max, Math.max(MENU_ICON_SIZE.min, r.iconSize))) : MENU_ICON_SIZE.default,
    columns: typeof r.columns === "number" && Number.isFinite(r.columns) ? Math.round(Math.min(5, Math.max(3, r.columns))) : DEFAULT_APP_MENU.columns,
    showLabels: r.showLabels !== false,
    newTab: r.newTab !== false,
    picks,
    tools,
  };
}

/* ---------- all settings ---------- */

export type Settings = {
  language: "auto" | LanguageCode;
  theme: ThemeMode;
  logo: LogoMode;
  logoText: string;
  logoFont: LogoFont;
  logoStyle: LogoStyle;
  logoColor: LogoColor;
  logoAnimation: LogoAnimation;
  logoSubtitle: LogoSubtitle;
  logoSubtitleText: string;
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
  appMenu: AppMenuSettings;
  faviconTheme: FaviconTheme;
  quickPills: QuickPills;
  news: NewsSettings;
};

export const BOOKMARKS_KEY = "lisyan_bookmarks";
export const SETTINGS_KEY = "lisyan_settings";
export const HISTORY_KEY = "lisyan_search_history";
export const AI_HISTORY_KEY = "lisyan_ai_history";

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
  aiButton: false,
  aiButtonSize: 34,
  aiButtonStyle: "accent",
  aiButtonIcon: "sparkles",
  aiButtonUrl: "https://www.google.com/search?q={q}&udm=50",
  aiMode: "toggle",
  aiDefaultOn: false,
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
  pasteAnim: true,
  selectParticles: true,
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

type FlatSettings = Omit<
  Settings,
  "searchStyle" | "textAnim" | "widgets" | "homeLayout" | "launcherLayout" | "appMenu" | "faviconTheme" | "quickPills" | "news"
>;

const DEFAULT_FLAT: FlatSettings = {
  language: "auto",
  theme: "system",
  logo: "google",
  logoText: "LisYan",
  logoFont: "theme",
  logoStyle: "classic",
  logoColor: "colorful",
  logoAnimation: "rise",
  logoSubtitle: "none",
  logoSubtitleText: "",
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
  appMenu: DEFAULT_APP_MENU,
  faviconTheme: DEFAULT_FAVICON_THEME,
  quickPills: DEFAULT_QUICK_PILLS,
  news: DEFAULT_NEWS,
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
  logoStyle: oneOf(LOGO_STYLES),
  logoColor: oneOf(LOGO_COLORS),
  logoAnimation: oneOf(LOGO_ANIMATIONS),
  logoSubtitle: oneOf(LOGO_SUBTITLES),
  logoSubtitleText: str(60),
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
  aiMode: oneOf(AI_MODES),
  aiDefaultOn: BOOL,
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
  pasteAnim: BOOL,
  selectParticles: BOOL,
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
  cols: num(1, 12),
  rows: num(1, 12),
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
  cols: num(1, 12),
  rows: num(1, 12),
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
  cols: num(1, 12),
  rows: num(1, 12),
  color: oneOf(WIDGET_COLORS),
  html: str(20000),
  title: str(64),
  label: str(40),
  opacity: num(20, 100),
  styleVariant: oneOf(["m3", "matrix"]),
};

export const SHORTCUT_WIDGET_SCHEMA: Schema<ShortcutWidget> = {
  id: str(64),
  type: oneOf(["shortcut"]),
  face: oneOf(["shortcut"]),
  x: num(0, 1, 0.0001),
  y: num(0, 1, 0.0001),
  size: num(80, 520),
  cols: num(1, 12),
  rows: num(1, 12),
  color: oneOf(WIDGET_COLORS),
  opacity: num(20, 100),
  url: str(2000),
  title: str(60),
  label: str(40),
  customIcon: str(2_000_000),
  iconStyle: oneOf(["original", "themed"]),
  showTitle: BOOL,
};

export const BOOKMARKS_WIDGET_SCHEMA: Schema<BookmarksWidget> = {
  id: str(64),
  type: oneOf(["bookmarks"]),
  face: oneOf(["bookmarks"]),
  x: num(0, 1, 0.0001),
  y: num(0, 1, 0.0001),
  size: num(80, 520),
  cols: num(1, 12),
  rows: num(1, 12),
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
  cell: num(8, 128, 4),
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
        const legacy = LEGACY_WEATHER_FACES[(item as { face?: string }).face ?? ""];
        widget = sanitize(legacy ? { ...item, face: legacy } : item, WEATHER_WIDGET_SCHEMA, DEFAULT_WEATHER_WIDGET);
      } else if (type === "custom_html") {
        widget = sanitize(item, CUSTOM_HTML_SCHEMA, DEFAULT_HTML_WIDGET);
      } else if (type === "shortcut") {
        const shortcut = sanitize(item, SHORTCUT_WIDGET_SCHEMA, DEFAULT_SHORTCUT_WIDGET);
        widget = { ...shortcut, url: safeWebUrl(shortcut.url) || DEFAULT_SHORTCUT_WIDGET.url };
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

  const sanitizeSlot = (raw: unknown, d: BarSlot): BarSlot => {
    if (!raw || typeof raw !== "object") return d;
    const r = raw as Record<string, unknown>;
    const kind = (BAR_SLOT_KINDS as readonly string[]).includes(r.kind as string) ? (r.kind as BarSlotKind) : d.kind;
    const ref = typeof r.ref === "string" ? r.ref.slice(0, 80) : undefined;
    const label = typeof r.label === "string" ? r.label.slice(0, 40) : undefined;
    return { kind, ref, label };
  };

  const sanitizeBetterBar = (raw: unknown, d: LauncherLayout["betterBar"]): LauncherLayout["betterBar"] => {
    const base = sanitizePos(raw, d);
    const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
    const config = (r.config && typeof r.config === "object" ? r.config : {}) as Record<string, unknown>;
    const slots = Array.isArray(config.slots) ? config.slots : [];
    return {
      ...base,
      config: {
        slots: [sanitizeSlot(slots[0], d.config.slots[0]), sanitizeSlot(slots[1], d.config.slots[1])],
        height: typeof config.height === "number" && Number.isFinite(config.height) ? Math.min(96, Math.max(44, Math.round(config.height))) : d.config.height,
        radius: typeof config.radius === "number" && Number.isFinite(config.radius) ? Math.min(48, Math.max(0, Math.round(config.radius))) : d.config.radius,
        attach: config.attach !== false,
        voice: config.voice !== false,
        placeholder: typeof config.placeholder === "string" ? config.placeholder.slice(0, 80) : "",
        aiOn: config.aiOn !== false,
      },
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
      rows: typeof p.rows === "number" && Number.isFinite(p.rows) ? Math.min(3, Math.max(1, Math.round(p.rows))) : (d.rows ?? 2),
      showLabels: typeof p.showLabels === "boolean" ? p.showLabels : (d.showLabels ?? true),
      addTile: typeof p.addTile === "boolean" ? p.addTile : (d.addTile ?? true),
    };
  };

  return {
    logo: sanitizePos(r.logo, DEFAULT_LAUNCHER_LAYOUT.logo),
    search: sanitizePos(r.search, DEFAULT_LAUNCHER_LAYOUT.search),
    buttons: sanitizeButtons(r.buttons, DEFAULT_LAUNCHER_LAYOUT.buttons),
    addButton: sanitizePos(r.addButton, DEFAULT_LAUNCHER_LAYOUT.addButton),
    betterBar: sanitizeBetterBar(r.betterBar, DEFAULT_LAUNCHER_LAYOUT.betterBar),
  };
}

export function sanitizeSettings(value: unknown): Settings {
  const raw = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  return {
    ...sanitize(raw, FLAT_SCHEMA, DEFAULT_FLAT),
    searchStyle: sanitize(raw.searchStyle, SEARCH_STYLE_SCHEMA, DEFAULT_SEARCH_STYLE),
    textAnim: sanitize(raw.textAnim, TEXT_ANIM_SCHEMA, DEFAULT_TEXT_ANIM),
    widgets: sanitizeWidgets(raw.widgets),
    homeLayout: sanitize(raw.homeLayout, HOME_LAYOUT_SCHEMA, DEFAULT_HOME_LAYOUT),
    launcherLayout: sanitizeLauncherLayout(raw.launcherLayout),
    appMenu: sanitizeAppMenu(raw.appMenu),
    faviconTheme: sanitizeFaviconTheme(raw.faviconTheme),
    quickPills: sanitizeQuickPills(raw.quickPills),
    news: sanitizeNews(raw.news),
  };
}

export function readSettings(): Settings {
  try {
    return sanitizeSettings(JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}"));
  } catch {
    // Corrupted storage — fall back to defaults.
    return sanitizeSettings({});
  }
}

export function sanitizeBookmarks(value: unknown): Bookmark[] {
  if (!Array.isArray(value)) return [];
  return value
    .slice(0, 500)
    .filter(
      (item): item is Bookmark =>
        Boolean(item) && typeof item.id === "string" && typeof item.title === "string" && typeof item.url === "string",
    )
    .map((b) => ({ ...b, safe: safeWebUrl(b.url) }))
    .filter((b) => b.safe)
    .map((b) => ({
      id: b.id.slice(0, 80),
      title: b.title.slice(0, 120),
      url: b.safe,
      customIcon: typeof (b as Bookmark).customIcon === "string" && (b as Bookmark).customIcon ? (b as Bookmark).customIcon!.slice(0, 2_000_000) : undefined,
      shape: typeof (b as Bookmark).shape === "string" && (BOOKMARK_SHAPES as readonly string[]).includes((b as Bookmark).shape!) ? (b as Bookmark).shape : undefined,
    }));
}

export function readBookmarks(): Bookmark[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(BOOKMARKS_KEY) || "[]");
    return sanitizeBookmarks(value);
  } catch {
    return [];
  }
}

export function sanitizeHistory(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string").slice(0, 1000).map((item) => item.slice(0, 500)) : [];
}

export function readHistory(): string[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
    return sanitizeHistory(value);
  } catch {
    return [];
  }
}

export function readAiHistory(): string[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(AI_HISTORY_KEY) || "[]");
    return sanitizeHistory(value);
  } catch {
    return [];
  }
}

export const STORAGE_EVENT = "lisyan:storage";

export function persist(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage can be unavailable (private mode, quota); the in-memory state still works.
  }
  // `storage` only fires in other tabs — tell widgets in this tab too.
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(STORAGE_EVENT, { detail: { key } }));
}

/**
 * Turns what a person typed (or a backup file contains) into a safe web address, or "" if it can't be one.
 * Only http(s) is allowed — `javascript:`, `data:`, `file:` and friends are rejected, so a stored link can never run code.
 */
export function safeWebUrl(value: unknown): string {
  if (typeof value !== "string") return "";
  const text = value.trim();
  if (!text || text.length > 2000 || /[\u0000-\u001f\u007f\s]/.test(text)) return "";
  if (text.startsWith("/")) return "";
  // "something:" is a scheme unless it is a host:port such as localhost:3000.
  const hasScheme = /^[a-z][a-z0-9+.-]*:/i.test(text) && !/^[^:/?#]+:\d+(?:[/?#]|$)/.test(text);
  if (hasScheme && !/^https?:\/\//i.test(text)) return "";
  try {
    const url = new URL(hasScheme ? text : `https://${text}`);
    if (url.protocol !== "https:" && url.protocol !== "http:") return "";
    if (!url.hostname || url.username || url.password) return "";
    const host = url.hostname;
    const looksLikeHost = host === "localhost" || /^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.startsWith("[") || host.includes(".");
    return looksLikeHost ? url.href : "";
  } catch {
    return "";
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
