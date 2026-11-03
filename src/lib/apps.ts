import {
  BookOpen,
  CalendarCheck,
  CalendarDays,
  CheckCheck,
  CirclePlay,
  ClipboardCheck,
  Clapperboard,
  Contact,
  Gamepad2,
  ListChecks,
  MessagesSquare,
  Newspaper,
  Palette,
  PanelsTopLeft,
  Phone,
  Presentation,
  Repeat,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  SquareKanban,
  Store,
  TrendingUp,
  Workflow,
  ChartColumn,
  LayoutGrid,
  type LucideIcon,
} from "lucide-react";
import { GLYPHS } from "./app-glyphs";
import { safeWebUrl, type AppMenuSettings, type CustomTool, type MenuMode } from "./settings";

export type AppProvider = "google" | "microsoft";

export type AppDef = {
  id: string;
  provider: AppProvider;
  /** English name; `ru` is shown when the interface is Russian. */
  name: string;
  ru?: string;
  url: string;
  /** Tile colour in the "brand" style. */
  color: string;
  /** Simple Icons glyph key (see app-glyphs.ts). */
  glyph?: string;
  /** Fallback symbol when there is no brand glyph. */
  icon?: LucideIcon;
  /** Big letter(s) used instead of a symbol (Word → W). */
  letter?: string;
  /** Key of an official PNG in src/assets/apps. */
  original?: string;
  /** Light brand colour: use a dark glyph. */
  dark?: boolean;
  /** Single-colour black logo: needs a light backing / inversion on dark surfaces. */
  mono?: boolean;
};

type Input = Omit<AppDef, "id" | "provider" | "color"> & { color?: string; key: string };

const make = (provider: AppProvider, items: Input[]): AppDef[] =>
  items.map(({ key, color, ...rest }) => ({
    ...rest,
    id: `${provider === "google" ? "g" : "m"}.${key}`,
    provider,
    color: color ?? (rest.glyph ? GLYPHS[rest.glyph]?.hex : undefined) ?? "#4285F4",
  }));

/* ---------- Google (ordered like Google's own launcher) ---------- */

export const GOOGLE_APPS: AppDef[] = make("google", [
  { key: "search", name: "Search", ru: "Поиск", url: "https://www.google.com/", glyph: "google" },
  { key: "gmail", name: "Gmail", ru: "Почта", url: "https://mail.google.com/", glyph: "gmail", original: "gmail" },
  { key: "drive", name: "Drive", ru: "Диск", url: "https://drive.google.com/", glyph: "googledrive", color: "#1FA463", original: "drive" },
  { key: "gemini", name: "Gemini", url: "https://gemini.google.com/", glyph: "googlegemini", color: "#6F5BD6" },
  { key: "calendar", name: "Calendar", ru: "Календарь", url: "https://calendar.google.com/", glyph: "googlecalendar", original: "calendar" },
  { key: "photos", name: "Photos", ru: "Фото", url: "https://photos.google.com/", glyph: "googlephotos", color: "#EA4335" },
  { key: "maps", name: "Maps", ru: "Карты", url: "https://maps.google.com/", glyph: "googlemaps", color: "#34A853" },
  { key: "youtube", name: "YouTube", url: "https://www.youtube.com/", glyph: "youtube" },
  { key: "meet", name: "Meet", url: "https://meet.google.com/", glyph: "googlemeet", color: "#00897B", original: "meet" },
  { key: "translate", name: "Translate", ru: "Переводчик", url: "https://translate.google.com/", glyph: "googletranslate" },
  { key: "docs", name: "Docs", ru: "Документы", url: "https://docs.google.com/document/", glyph: "googledocs", original: "docs" },
  { key: "sheets", name: "Sheets", ru: "Таблицы", url: "https://docs.google.com/spreadsheets/", glyph: "googlesheets", color: "#188038", original: "sheets" },
  { key: "slides", name: "Slides", ru: "Презентации", url: "https://docs.google.com/presentation/", glyph: "googleslides", color: "#F9AB00", dark: true, original: "slides" },
  { key: "forms", name: "Forms", ru: "Формы", url: "https://docs.google.com/forms/", glyph: "googleforms", color: "#7248B9", original: "forms" },
  { key: "vids", name: "Vids", url: "https://docs.google.com/videos/", icon: Clapperboard, color: "#6F5BD6" },
  { key: "keep", name: "Keep", url: "https://keep.google.com/", glyph: "googlekeep", color: "#F5A300", original: "keep" },
  { key: "chat", name: "Chat", ru: "Чат", url: "https://chat.google.com/", glyph: "googlechat", original: "chat" },
  { key: "contacts", name: "Contacts", ru: "Контакты", url: "https://contacts.google.com/", icon: Contact },
  { key: "tasks", name: "Tasks", ru: "Задачи", url: "https://tasks.google.com/", glyph: "googletasks" },
  { key: "classroom", name: "Classroom", url: "https://classroom.google.com/", glyph: "googleclassroom" },
  { key: "notebooklm", name: "NotebookLM", url: "https://notebooklm.google.com/", glyph: "notebooklm", color: "#3C4043", mono: true },
  { key: "aistudio", name: "AI Studio", url: "https://aistudio.google.com/", icon: Sparkles, color: "#7C4DFF", mono: true },
  { key: "news", name: "News", ru: "Новости", url: "https://news.google.com/", glyph: "googlenews" },
  { key: "finance", name: "Finance", ru: "Финансы", url: "https://www.google.com/finance/", icon: TrendingUp, color: "#1E8E3E" },
  { key: "shopping", name: "Shopping", ru: "Покупки", url: "https://shopping.google.com/", icon: ShoppingBag },
  { key: "store", name: "Google Store", url: "https://store.google.com/", icon: Store, color: "#EA4335" },
  { key: "one", name: "Google One", url: "https://one.google.com/", letter: "1" },
  { key: "play", name: "Play", url: "https://play.google.com/", glyph: "googleplay", color: "#01875F" },
  { key: "books", name: "Play Books", ru: "Книги", url: "https://play.google.com/store/books", icon: BookOpen },
  { key: "earth", name: "Earth", ru: "Планета Земля", url: "https://earth.google.com/web/", glyph: "googleearth", color: "#1A73E8" },
  { key: "music", name: "YouTube Music", url: "https://music.youtube.com/", glyph: "youtubemusic" },
  { key: "sites", name: "Sites", ru: "Сайты", url: "https://sites.google.com/", icon: PanelsTopLeft, color: "#7B1FA2", original: "sites" },
  { key: "scholar", name: "Scholar", ru: "Академия", url: "https://scholar.google.com/", glyph: "googlescholar" },
  { key: "chrome", name: "Chrome", url: "https://www.google.com/chrome/", glyph: "googlechrome" },
  { key: "colab", name: "Colab", url: "https://colab.research.google.com/", glyph: "googlecolab", color: "#F9AB00", dark: true },
  { key: "blogger", name: "Blogger", url: "https://www.blogger.com/", glyph: "blogger", color: "#F57C00" },
  { key: "analytics", name: "Analytics", ru: "Аналитика", url: "https://analytics.google.com/", glyph: "googleanalytics", color: "#E37400" },
  { key: "ads", name: "Ads", ru: "Реклама", url: "https://ads.google.com/", glyph: "googleads" },
  { key: "admin", name: "Admin", ru: "Администратор", url: "https://admin.google.com/", icon: ShieldCheck, original: "admin" },
  { key: "pay", name: "Pay", url: "https://pay.google.com/", glyph: "googlepay", original: "pay" },
  { key: "voice", name: "Voice", url: "https://voice.google.com/", icon: Phone, color: "#188038", original: "voice" },
  { key: "messages", name: "Messages", ru: "Сообщения", url: "https://messages.google.com/web/", glyph: "googlemessages", color: "#1A73E8" },
  { key: "home", name: "Home", url: "https://home.google.com/", glyph: "googlehome" },
  { key: "cloud", name: "Cloud", url: "https://console.cloud.google.com/", glyph: "googlecloud" },
  { key: "console", name: "Search Console", ru: "Search Console", url: "https://search.google.com/search-console", glyph: "googlesearchconsole" },
  { key: "arts", name: "Arts & Culture", ru: "Искусство и культура", url: "https://artsandculture.google.com/", icon: Palette, color: "#EA4335" },
]);

/* ---------- Microsoft ---------- */

export const MICROSOFT_APPS: AppDef[] = make("microsoft", [
  { key: "outlook", name: "Outlook", ru: "Почта", url: "https://outlook.office.com/mail/", glyph: "microsoftoutlook", color: "#0F6CBD" },
  { key: "office", name: "Microsoft 365", url: "https://m365.cloud.microsoft/", glyph: "microsoftoffice", color: "#D83B01" },
  { key: "word", name: "Word", url: "https://word.cloud.microsoft/", glyph: "microsoftword", color: "#2B579A" },
  { key: "excel", name: "Excel", url: "https://excel.cloud.microsoft/", glyph: "microsoftexcel", color: "#217346" },
  { key: "powerpoint", name: "PowerPoint", url: "https://powerpoint.cloud.microsoft/", glyph: "microsoftpowerpoint", color: "#B7472A" },
  { key: "teams", name: "Teams", url: "https://teams.microsoft.com/", glyph: "microsoftteams", color: "#6264A7" },
  { key: "onenote", name: "OneNote", url: "https://onenote.cloud.microsoft/", glyph: "microsoftonenote", color: "#7719AA" },
  { key: "onedrive", name: "OneDrive", url: "https://onedrive.live.com/", glyph: "microsoftonedrive", color: "#0F6CBD" },
  { key: "sharepoint", name: "SharePoint", url: "https://www.microsoft365.com/launch/sharepoint", glyph: "microsoftsharepoint", color: "#038387" },
  { key: "copilot", name: "Copilot", url: "https://copilot.microsoft.com/", icon: Sparkles, color: "#7B61FF" },
  { key: "bing", name: "Bing", ru: "Поиск Bing", url: "https://www.bing.com/", glyph: "microsoftbing", color: "#008373" },
  { key: "edge", name: "Edge", url: "https://www.microsoft.com/edge", glyph: "microsoftedge", color: "#0C8EBF" },
  { key: "todo", name: "To Do", ru: "Задачи", url: "https://to-do.office.com/tasks/", icon: CheckCheck, color: "#2564CF" },
  { key: "planner", name: "Planner", url: "https://planner.cloud.microsoft/", icon: SquareKanban, color: "#31752F" },
  { key: "forms", name: "Forms", ru: "Формы", url: "https://forms.cloud.microsoft/", icon: ClipboardCheck, color: "#007C89" },
  { key: "calendar", name: "Calendar", ru: "Календарь", url: "https://outlook.office.com/calendar/", icon: CalendarDays, color: "#0F6CBD" },
  { key: "clipchamp", name: "Clipchamp", url: "https://app.clipchamp.com/", icon: Clapperboard, color: "#5B5FC7" },
  { key: "whiteboard", name: "Whiteboard", url: "https://whiteboard.cloud.microsoft/", icon: Presentation, color: "#0078D4" },
  { key: "loop", name: "Loop", url: "https://loop.cloud.microsoft/", icon: Repeat, color: "#7B3CF1" },
  { key: "designer", name: "Designer", url: "https://designer.microsoft.com/", icon: Palette, color: "#D13438" },
  { key: "lists", name: "Lists", ru: "Списки", url: "https://www.microsoft365.com/launch/lists", icon: ListChecks, color: "#3B7B8E" },
  { key: "bookings", name: "Bookings", url: "https://outlook.office.com/bookings/", icon: CalendarCheck, color: "#2D7D9A" },
  { key: "stream", name: "Stream", url: "https://www.microsoft365.com/launch/stream", icon: CirclePlay, color: "#BC1948" },
  { key: "engage", name: "Viva Engage", url: "https://engage.cloud.microsoft/", icon: MessagesSquare, color: "#0078D4" },
  { key: "visio", name: "Visio", url: "https://www.microsoft365.com/launch/visio", glyph: "microsoftvisio", color: "#3955A3" },
  { key: "powerbi", name: "Power BI", url: "https://app.powerbi.com/", icon: ChartColumn, color: "#F2C811", dark: true },
  { key: "automate", name: "Power Automate", url: "https://make.powerautomate.com/", icon: Workflow, color: "#0066FF" },
  { key: "powerapps", name: "Power Apps", url: "https://make.powerapps.com/", icon: LayoutGrid, color: "#742774" },
  { key: "azure", name: "Azure", url: "https://portal.azure.com/", glyph: "microsoftazure", color: "#0078D4" },
  { key: "vscode", name: "VS Code", url: "https://vscode.dev/", glyph: "microsoftvisualstudiocode", color: "#007ACC" },
  { key: "linkedin", name: "LinkedIn", url: "https://www.linkedin.com/", letter: "in", color: "#0A66C2" },
  { key: "xbox", name: "Xbox", url: "https://www.xbox.com/", icon: Gamepad2, color: "#107C10" },
  { key: "store", name: "Microsoft Store", url: "https://apps.microsoft.com/", glyph: "microsoft", color: "#0078D4" },
  { key: "msn", name: "MSN", ru: "Новости MSN", url: "https://www.msn.com/", icon: Newspaper, color: "#1F1F1F" },
  { key: "account", name: "Account", ru: "Аккаунт", url: "https://account.microsoft.com/", glyph: "microsoft", color: "#5E5E5E" },
  { key: "rewards", name: "Rewards", url: "https://rewards.bing.com/", glyph: "microsoft", color: "#FFB900", dark: true },
]);

export const ALL_APPS: AppDef[] = [...GOOGLE_APPS, ...MICROSOFT_APPS];
export const APP_INDEX: Map<string, AppDef> = new Map(ALL_APPS.map((app) => [app.id, app]));

/* ---------- own tools ---------- */

export const TOOL_PREFIX = "u.";
export const toolId = (tool: CustomTool) => `${TOOL_PREFIX}${tool.id}`;

/** A safe https/http address for a tool, or "" if what was typed can't be one. */
export const normalizeToolUrl = (value: string) => safeWebUrl(value);

export const toolHost = (url: string) => {
  try {
    return new URL(normalizeToolUrl(url)).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
};

/* ---------- what the drawer shows ---------- */

export type MenuItem = { id: string; name: string; url: string; app?: AppDef; tool?: CustomTool };

export function appName(app: AppDef, lang: string) {
  return lang.startsWith("ru") && app.ru ? app.ru : app.name;
}

const fromApp = (app: AppDef, lang: string): MenuItem => ({ id: app.id, name: appName(app, lang), url: app.url, app });

export function menuItems(menu: AppMenuSettings, lang: string): MenuItem[] {
  switch (menu.mode) {
    case "google":
      return GOOGLE_APPS.map((app) => fromApp(app, lang));
    case "microsoft":
      return MICROSOFT_APPS.map((app) => fromApp(app, lang));
    case "both":
      return (menu.tab === "microsoft" ? MICROSOFT_APPS : GOOGLE_APPS).map((app) => fromApp(app, lang));
    default: {
      const tools = new Map(menu.tools.map((tool) => [toolId(tool), tool]));
      return menu.picks.flatMap((id): MenuItem[] => {
        const app = APP_INDEX.get(id);
        if (app) return [fromApp(app, lang)];
        const tool = tools.get(id);
        const url = tool ? normalizeToolUrl(tool.url) : "";
        return tool && url ? [{ id, name: tool.title, url, tool }] : [];
      });
    }
  }
}

/** A sensible starting list when the user first switches to "My own". */
export function starterPicks(mode: MenuMode, tab: "google" | "microsoft"): string[] {
  const g = ["search", "gmail", "drive", "calendar", "photos", "maps", "youtube", "docs", "sheets", "translate", "gemini", "meet"].map((k) => `g.${k}`);
  const m = ["outlook", "word", "excel", "powerpoint", "teams", "onedrive", "onenote", "copilot", "todo", "calendar", "bing", "office"].map((k) => `m.${k}`);
  if (mode === "microsoft" || (mode === "both" && tab === "microsoft")) return m;
  if (mode === "both") return [...g.slice(0, 6), ...m.slice(0, 6)];
  return g;
}
