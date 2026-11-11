import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";
import { AlertCircle, ChevronDown, CornerDownLeft, History, LayoutDashboard, Search, Settings as SettingsIcon } from "lucide-react";
import AppMenu from "./components/AppMenu";
import { AppShapeDefs } from "./components/AppShapes";
import BookmarkDialog from "./components/BookmarkDialog";
import ContextMenu, { type ContextMenuData } from "./components/ContextMenu";
import Logo from "./components/Logo";
import NewsFeed from "./components/NewsFeed";
import { rememberSearchQuery } from "./lib/news";
import { scrollToLauncher, scrollToNews, useInNews, useNewsMagnet } from "./lib/news-magnet";
import QuickPills from "./components/QuickPills";
import SearchBox, { searchHints } from "./components/SearchBox";
import SearchOverlay from "./components/SearchOverlay";
import ShortcutRow from "./components/ShortcutRow";
import SettingsScreen from "./components/SettingsScreen";
import { SettingsContext, type AnalysisState, type SettingsContextValue } from "./components/settings/context";
import WallpaperLayer from "./components/WallpaperLayer";
import EditChrome from "./components/widgets/EditChrome";
import MovableElement from "./components/widgets/MovableElement";
import WidgetLayer from "./components/widgets/WidgetLayer";
import { FontThemeContext } from "./lib/font-theme";
import { I18nContext, detectLanguage, getLanguage, isRtl, matrixSupport, translate, type I18n, type MessageKey, type Vars } from "./lib/i18n";
import { idbDelete, idbSet } from "./lib/idb";
import type { RestorePayload } from "./lib/backup";
import { useThemedFavicon } from "./lib/favicon";
import { pushFaviconTheme } from "./lib/favicon-bridge";
import { openIncognito } from "./lib/incognito";
import {
  AI_HISTORY_KEY,
  BOOKMARKS_KEY,
  HISTORY_KEY,
  SETTINGS_KEY,
  safeWebUrl,
  persist,
  readAiHistory,
  readBookmarks,
  readHistory,
  readSettings,
  type Bookmark,
  type BookmarkShape,
  type FontTheme,
  type Settings,
  type SettingsSection,
} from "./lib/settings";
import { stage, useStageMode } from "./lib/stage";
import { editButtonRect, liftWidgetsAbove } from "./lib/widgets";
import { PALETTE_VARS, PRESET_COLORS, analyzeWallpaper, buildPalette } from "./lib/theme";
import { useWallpaper, WALLPAPER_FILE_KEY } from "./lib/wallpaper";
import { useWidgetActions } from "./lib/widgets";
import { cn } from "./utils/cn";

type SuggestionGroup = { label: string; kind: "history" | "popular" | "similar"; items: string[] };

/** Theme snapshot read by the inline script in index.html before the first paint. */
const BOOT_KEY = "lisyan_boot";

function useSystemDark() {
  const [dark, setDark] = useState(() => typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const update = (event: MediaQueryListEvent) => setDark(event.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  return dark;
}

export default function App() {
  const [query, setQuery] = useState("");
  const [bookmarks, setBookmarks] = useState<Bookmark[]>(readBookmarks);
  const [history, setHistory] = useState<string[]>(readHistory);
  const [aiHistory, setAiHistory] = useState<string[]>(readAiHistory);
  const [searchOverlayOpen, setSearchOverlayOpen] = useState(false);
  const [searchFromY, setSearchFromY] = useState(140);
  const [settings, setSettings] = useState<Settings>(readSettings);
  const [bookmarkDialog, setBookmarkDialog] = useState(false);
  const [editingBookmark, setEditingBookmark] = useState<Bookmark | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuData | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<SettingsSection>("searchbox");
  const [going, setGoing] = useState(false);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [remoteSuggestions, setRemoteSuggestions] = useState<string[]>([]);
  const [activeSuggestion, setActiveSuggestion] = useState(-1);
  const [analysis, setAnalysis] = useState<AnalysisState>("idle");
  const [toastMessage, setToastMessage] = useState<{ id: number; text: string } | null>(null);
  const [editing, setEditing] = useState(false);
  const [selectedWidget, setSelectedWidget] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [showSearchRemoveDialog, setShowSearchRemoveDialog] = useState(false);
  /** Bumped by a widget's "Settings" button: the edit panel opens on that widget. */
  const [settingsSignal, setSettingsSignal] = useState(0);
  // AI search stays on until switched off (desktop-friendly), and routes every search through it.
  const [aiOn, setAiOn] = useState(settings.searchStyle.aiMode === "toggle" && settings.searchStyle.aiDefaultOn);
  // A photo or file the user attached to search by it instead of typing.
  const [attachment, setAttachment] = useState<File | null>(null);
  const [attachError, setAttachError] = useState<string | null>(null);
  // Incognito pill arms private search.
  const [incognitoOn, setIncognitoOn] = useState(false);
  const lensInput = useRef<HTMLInputElement>(null);
  const attachInput = useRef<HTMLInputElement>(null);
  const editState = useRef({ editing: false, selected: null as string | null });
  const widgetActions = useWidgetActions(setSettings);

  useEffect(() => {
    editState.current = { editing, selected: selectedWidget };
  }, [editing, selectedWidget]);

  const enterEdit = useCallback((id: string | null = null) => {
    setSearchOverlayOpen(false);
    setSuggestionsOpen(false);
    setActiveSuggestion(-1);
    (document.activeElement as HTMLElement | null)?.blur?.();
    setSelectedWidget(id);
    setEditing(true);
  }, []);

  const openSearchOverlay = useCallback(() => {
    if (editing) return;
    const rect = searchArea.current?.querySelector(".sb")?.getBoundingClientRect();
    setSearchFromY(rect ? Math.max(0, rect.top - 16) : 140);
    setSearchOverlayOpen(true);
    setSuggestionsOpen(true);
  }, [editing]);

  const openElementSettings = useCallback((id: string) => {
    setSelectedWidget(id);
    setSettingsSignal((n) => n + 1);
  }, []);

  const exitEdit = () => {
    setEditing(false);
    setSelectedWidget(null);
    setDragging(false);
  };
  const searchArea = useRef<HTMLDivElement>(null);

  /* ---------- language ---------- */
  const browserLang = useMemo(detectLanguage, []);
  const lang = settings.language === "auto" ? browserLang : settings.language;
  const language = getLanguage(lang);
  const dir = isRtl(lang) ? "rtl" : "ltr";
  const t = useCallback((key: MessageKey, vars?: Vars) => translate(lang, key, vars), [lang]);
  const isRu = lang === "ru";
  const i18n = useMemo<I18n>(() => ({ lang, dir, t }), [lang, dir, t]);
  const matrix = useMemo(() => matrixSupport(lang), [lang]);
  // NotMatrix stays the saved preference but is switched off while the language can't be displayed.
  const fontTheme: FontTheme = settings.fontTheme === "matrix" && matrix.supported ? "matrix" : "m3";

  /* ---------- colours ---------- */
  const systemDark = useSystemDark();
  const hasWallpaperSource = settings.wallpaperSource !== "none";
  const dark =
    settings.theme === "wallpaper"
      ? hasWallpaperSource && settings.wallpaperTone !== "unknown"
        ? settings.wallpaperTone === "dark"
        : systemDark
      : settings.theme === "system"
        ? systemDark
        : settings.theme === "dark";
  const seed =
    settings.colorSource === "preset"
      ? PRESET_COLORS[settings.presetId]
      : settings.colorSource === "custom"
        ? settings.customColor
        : settings.colorSource === "wallpaper" && hasWallpaperSource
          ? (settings.wallpaperColors[settings.wallpaperColorIndex] ?? settings.wallpaperColors[0] ?? null)
          : null;
  const palette = useMemo(
    () => (seed ? buildPalette(seed, dark, settings.schemeVariant, settings.contrast) : null),
    [seed, dark, settings.schemeVariant, settings.contrast],
  );
  const wallpaper = useWallpaper(settings, setSettings);
  const hasWallpaper = Boolean(wallpaper.url);

  useLayoutEffect(() => {
    const root = document.documentElement;
    const theme = dark ? "dark" : "light";
    root.dataset.theme = theme;
    root.dataset.fontTheme = fontTheme;
    root.dataset.animation = settings.uiAnimation || "fluid";
    root.lang = lang;
    root.dir = dir;
    for (const name of PALETTE_VARS) root.style.removeProperty(name);
    if (palette) for (const [name, value] of Object.entries(palette)) root.style.setProperty(name, value);
    persist(BOOT_KEY, { theme, fontTheme, lang, dir, vars: palette });
  }, [dark, fontTheme, lang, dir, palette, settings.uiAnimation]);

  // The tab's own favicon follows the palette (this is also what the new-tab page in the extension shows).
  useThemedFavicon([palette, dark]);

  useEffect(() => persist(BOOKMARKS_KEY, bookmarks), [bookmarks]);
  useEffect(() => persist(SETTINGS_KEY, settings), [settings]);

  // Keep the extension's favicon content script on the same live Material palette. On the web
  // there is no extension to talk to, so this quietly resolves to "local" and changes nothing.
  useEffect(() => {
    if (!settings.faviconTheme.auto) return;
    const id = window.setTimeout(() => void pushFaviconTheme(settings.faviconTheme), 120);
    return () => window.clearTimeout(id);
  }, [
    settings.faviconTheme,
    settings.colorSource,
    settings.presetId,
    settings.customColor,
    settings.schemeVariant,
    settings.theme,
    dark,
  ]);
  useEffect(() => persist(HISTORY_KEY, history), [history]);

  // Extract Material You seed colours + light/dark tone whenever the wallpaper changes.
  useEffect(() => {
    const source = wallpaper.url;
    if (!source) {
      if (settings.wallpaperSource === "none") {
        setSettings((s) => (s.wallpaperColors.length || s.wallpaperTone !== "unknown" ? { ...s, wallpaperColors: [], wallpaperTone: "unknown", wallpaperColorIndex: 0 } : s));
      }
      setAnalysis("idle");
      return;
    }
    let cancelled = false;
    setAnalysis("busy");
    analyzeWallpaper(source)
      .then(({ colors, tone }) => {
        if (cancelled) return;
        setAnalysis("idle");
        setSettings((s) => {
          const same = s.wallpaperColors.length === colors.length && s.wallpaperColors.every((color, index) => color === colors[index]);
          if (same && s.wallpaperTone === tone) return s;
          return { ...s, wallpaperColors: colors, wallpaperTone: tone, wallpaperColorIndex: same ? s.wallpaperColorIndex : 0 };
        });
      })
      .catch(() => {
        if (cancelled) return;
        setAnalysis("error");
        setSettings((s) => ({ ...s, wallpaperColors: [], wallpaperTone: "unknown", wallpaperColorIndex: 0 }));
      });
    return () => {
      cancelled = true;
    };
  }, [wallpaper.url, settings.wallpaperSource]);

  useEffect(() => {
    if (!toastMessage) return;
    const id = window.setTimeout(() => setToastMessage(null), 5200);
    return () => window.clearTimeout(id);
  }, [toastMessage]);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Element | null;
      if (!searchArea.current?.contains(target as Node) && !target?.closest?.(".search-overlay")) {
        setSuggestionsOpen(false);
        setActiveSuggestion(-1);
      }
    };
    const handleEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (editState.current.editing) {
        // First Esc deselects the widget, the second one finishes editing.
        if (editState.current.selected) setSelectedWidget(null);
        else setEditing(false);
        return;
      }
      setSearchOverlayOpen(false);
      setSettingsOpen(false);
      setBookmarkDialog(false);
      setSuggestionsOpen(false);
      setActiveSuggestion(-1);
    };
    const handleOpenAddBookmark = () => {
      setBookmarkDialog(true);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);
    window.addEventListener("open-add-bookmark-dialog", handleOpenAddBookmark);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
      window.removeEventListener("open-add-bookmark-dialog", handleOpenAddBookmark);
    };
  }, []);

  // Global right-click context menu (widgets, bookmarks, and wallpaper/screen)
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable) {
        return;
      }
      e.preventDefault();

      // Check if clicked a bookmark
      const bookmarkEl = target?.closest("[data-bookmark-id]") as HTMLElement | null;
      if (bookmarkEl) {
        const bookmarkId = bookmarkEl.getAttribute("data-bookmark-id");
        const b = bookmarks.find((item) => item.id === bookmarkId);
        if (b) {
          setContextMenu({
            x: e.clientX,
            y: e.clientY,
            type: "bookmark",
            targetId: b.id,
            targetTitle: b.title,
            targetUrl: b.url,
          });
          return;
        }
      }

      // Check if clicked a widget (including movable elements like logo, search, buttons)
      const widgetEl = target?.closest("[data-widget-id]") as HTMLElement | null;
      if (widgetEl) {
        const widgetId = widgetEl.getAttribute("data-widget-id");
        if (widgetId) {
          let title = isRu ? "Виджет" : "Widget";
          if (widgetId === "__system_search__") title = t("home.element.search");
          else if (widgetId === "__system_logo__") title = t("home.element.logo");
          else if (widgetId === "__system_buttons__") title = t("home.element.buttons");
          else {
            const w = settings.widgets.find((item) => item.id === widgetId);
            if (w) {
              title =
                w.type === "custom_html"
                  ? w.title || "Custom Widget"
                  : w.type === "bookmarks"
                  ? w.title || (isRu ? "Папка закладок" : "Bookmarks")
                  : t(`wf.f.${w.face}`);
            }
          }

          setContextMenu({
            x: e.clientX,
            y: e.clientY,
            type: "widget",
            targetId: widgetId,
            targetTitle: title,
          });
          return;
        }
      }

      // Otherwise background / screen
      setContextMenu({
        x: e.clientX,
        y: e.clientY,
        type: "background",
      });
    };

    window.addEventListener("contextmenu", handleContextMenu);
    return () => window.removeEventListener("contextmenu", handleContextMenu);
  }, [bookmarks, settings.widgets, isRu, t]);

  // Google autocomplete via JSONP (the endpoint sends no CORS headers).
  useEffect(() => {
    const term = query.trim();
    if (!term || term.length < 2 || !settings.searchSuggestions || !suggestionsOpen) {
      setRemoteSuggestions([]);
      return;
    }
    let script: HTMLScriptElement | null = null;
    const callbackName = `lisyan_suggest_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const callbackHost = window as unknown as Record<string, (payload: unknown) => void>;
    let timer = 0;
    const cleanup = () => {
      window.clearTimeout(timer);
      script?.remove();
      delete callbackHost[callbackName];
    };
    timer = window.setTimeout(() => {
      const params = new URLSearchParams({ client: "chrome", hl: language.google, q: term, callback: callbackName });
      script = document.createElement("script");
      script.async = true;
      script.src = `https://suggestqueries.google.com/complete/search?${params.toString()}`;
      script.onerror = () => {
        setRemoteSuggestions([]);
        cleanup();
      };
      callbackHost[callbackName] = (payload) => {
        if (Array.isArray(payload) && Array.isArray(payload[1])) {
          setRemoteSuggestions(payload[1].filter((item): item is string => typeof item === "string").slice(0, 6));
        } else {
          setRemoteSuggestions([]);
        }
        cleanup();
      };
      timer = window.setTimeout(() => {
        setRemoteSuggestions([]);
        cleanup();
      }, 3500);
      document.head.appendChild(script);
    }, 180);
    return cleanup;
  }, [query, settings.searchSuggestions, suggestionsOpen, language.google]);

  const suggestionGroups = useMemo<SuggestionGroup[]>(() => {
    const term = query.trim();
    if (!term || !settings.searchSuggestions || incognitoOn) return [];
    const normalized = term.toLocaleLowerCase();
    const recent = history.filter((item) => item.toLocaleLowerCase().includes(normalized)).slice(0, 4);
    const used = new Set(recent.map((item) => item.toLocaleLowerCase()));
    const groups: SuggestionGroup[] = [];
    if (recent.length) groups.push({ label: t("suggest.recent"), kind: "history", items: recent });

    const candidates = remoteSuggestions.length
      ? remoteSuggestions
      : term.length > 1
        ? [t("suggest.officialSite", { q: term }), t("suggest.reviews", { q: term }), t("suggest.howTo", { q: term })]
        : [];
    const distinct = candidates
      .filter((item) => {
        const key = item.toLocaleLowerCase();
        if (key === normalized || used.has(key)) return false;
        used.add(key);
        return true;
      })
      .slice(0, 5);
    if (distinct.length) {
      groups.push({
        label: remoteSuggestions.length ? t("suggest.popular") : t("suggest.similar"),
        kind: remoteSuggestions.length ? "popular" : "similar",
        items: distinct,
      });
    }
    return groups;
  }, [history, query, remoteSuggestions, settings.searchSuggestions, t]);

  const flattened = useMemo(() => suggestionGroups.flatMap((group) => group.items), [suggestionGroups]);
  const showSuggestionList = suggestionsOpen && settings.searchSuggestions && !incognitoOn && suggestionGroups.length > 0;

  /** The URL an AI search goes to; falls back to Google AI Mode when the template is not usable. */
  const aiTarget = (term: string) => {
    const raw = settings.searchStyle.aiButtonUrl || "https://www.google.com/search?q={q}&udm=50";
    const safe = safeWebUrl(raw.includes("{q}") ? raw.replace("{q}", "x") : raw);
    return safe ? raw.replace("{q}", encodeURIComponent(term)) : `https://www.google.com/search?q=${encodeURIComponent(term)}&udm=50`;
  };

  /**
   * Sends a photo straight to Google Lens.
   *
   * A plain multipart form is used on purpose: the browser performs the upload itself, so it is not
   * subject to CORS the way fetch() would be. The file is placed in a real <input type="file"> via
   * DataTransfer and the form is submitted to `lens.google.com/v3/upload`, which redirects to results.
   */
  const searchByImage = (file: File) => {
    const form = document.createElement("form");
    form.action = `https://lens.google.com/v3/upload?ep=ccm&s=&st=${Date.now()}`;
    form.method = "POST";
    form.enctype = "multipart/form-data";
    form.target = "_blank";
    form.rel = "noopener noreferrer";
    form.style.display = "none";

    const input = document.createElement("input");
    input.type = "file";
    input.name = "encoded_image";
    try {
      const transfer = new DataTransfer();
      transfer.items.add(file);
      input.files = transfer.files;
    } catch {
      setAttachError(isRu ? "Браузер не дал прикрепить файл" : "The browser refused the attachment");
      return;
    }

    const dimensions = document.createElement("input");
    dimensions.type = "hidden";
    dimensions.name = "processed_image_dimensions";
    dimensions.value = "1000,1000";

    form.append(input, dimensions);
    document.body.appendChild(form);
    form.submit();
    window.setTimeout(() => form.remove(), 1500);
    setAttachment(null);
  };

  /** Searching with an attached file: photos go to Lens, everything else by its file name. */
  const searchByAttachment = (file: File) => {
    if (file.type.startsWith("image/")) {
      // Only the form submission opens a tab — a second window.open would land on Lens twice.
      searchByImage(file);
      return;
    }
    const name = file.name.replace(/\.[a-z0-9]+$/i, "").replace(/[._-]+/g, " ").trim();
    window.open(`https://www.google.com/search?q=${encodeURIComponent(name)}`, "_blank", "noopener,noreferrer");
    setAttachment(null);
  };

  const runSearch = (value: string) => {
    const term = value.trim();
    if (!term) return;
    rememberSearchQuery(term);
    const nextHistory = [term, ...history.filter((item) => item.toLocaleLowerCase() !== term.toLocaleLowerCase())].slice(0, 20);
    setHistory(nextHistory);
    persist(HISTORY_KEY, nextHistory); // synchronously: navigation starts right away
    const nextAi = aiOn
      ? [term, ...aiHistory.filter((item) => item.toLocaleLowerCase() !== term.toLocaleLowerCase())].slice(0, 20)
      : aiHistory.filter((item) => item.toLocaleLowerCase() !== term.toLocaleLowerCase());
    setAiHistory(nextAi);
    persist(AI_HISTORY_KEY, nextAi);
    setSearchOverlayOpen(false);
    setSuggestionsOpen(false);
    setActiveSuggestion(-1);
    setGoing(true);
    const isUrl = /^https?:\/\//i.test(term) || (/^\S+\.\S{2,}$/.test(term) && !term.includes(" "));
    // With the AI toggle on, every search goes through AI Mode instead of plain Google.
    const target = aiOn
      ? aiTarget(term)
      : isUrl
        ? safeWebUrl(term)
        : `https://www.google.com/search?q=${encodeURIComponent(term)}&hl=${encodeURIComponent(language.google)}`;
    const pop = window.open(target, "_blank", "noopener,noreferrer");
    if (!pop || pop.closed || typeof pop.closed === "undefined") {
      window.location.href = target;
    }
  };

  const runAiSearch = (value: string) => {
    const term = (value || query).trim();
    if (!term) return;
    rememberSearchQuery(term);
    const nextHistory = [term, ...history.filter((item) => item.toLocaleLowerCase() !== term.toLocaleLowerCase())].slice(0, 20);
    setHistory(nextHistory);
    persist(HISTORY_KEY, nextHistory);
    const nextAi = [term, ...aiHistory.filter((item) => item.toLocaleLowerCase() !== term.toLocaleLowerCase())].slice(0, 20);
    setAiHistory(nextAi);
    persist(AI_HISTORY_KEY, nextAi);
    setSearchOverlayOpen(false);
    setSuggestionsOpen(false);
    setActiveSuggestion(-1);
    setGoing(true);
    const target = aiTarget(term);
    const pop = window.open(target, "_blank", "noopener,noreferrer");
    if (!pop || pop.closed || typeof pop.closed === "undefined") {
      window.location.href = target;
    }
  };

  /** A photo picked from the gallery goes straight to Google Lens. */
  const runGalleryImage = useCallback(
    (file: File) => {
      const form = document.createElement("form");
      form.action = `https://lens.google.com/v3/upload?ep=ccm&s=&st=${Date.now()}`;
      form.method = "POST";
      form.enctype = "multipart/form-data";
      form.target = "_blank";
      form.rel = "noopener noreferrer";
      form.style.display = "none";
      const input = document.createElement("input");
      input.type = "file";
      input.name = "encoded_image";
      try {
        const transfer = new DataTransfer();
        transfer.items.add(file);
        input.files = transfer.files;
      } catch {
        setAttachError(isRu ? "Браузер не дал прикрепить файл" : "The browser refused the attachment");
        return;
      }
      const dimensions = document.createElement("input");
      dimensions.type = "hidden";
      dimensions.name = "processed_image_dimensions";
      dimensions.value = "1000,1000";
      form.append(input, dimensions);
      document.body.appendChild(form);
      form.submit();
      window.setTimeout(() => form.remove(), 1500);
    },
    [isRu],
  );

  /** Opens a genuinely private window through the extension, with an honest fallback. */
  const runPrivateSearch = useCallback(
    async (value: string) => {
      const term = value.trim();
      const target = term
        ? `https://www.google.com/search?q=${encodeURIComponent(term)}&hl=${encodeURIComponent(language.google)}`
        : "https://www.google.com/";
      const result = await openIncognito(target);
      if (result === "unsupported" || result === "failed") {
        // A web page cannot force Chrome's incognito mode; be transparent and still useful.
        window.open(target, "_blank", "noopener,noreferrer");
      }
      setToastMessage({
        id: Date.now(),
        text:
          result === "opened"
            ? t("better.incognitoOpened")
            : result === "blocked"
              ? t("better.incognitoBlocked")
              : isRu
                ? "Расширение не подключено — открыл обычный поиск. Для настоящего инкогнито установите расширение LisYan."
                : "The extension isn't connected, so this opened a normal search. Install LisYan for real incognito.",
      });
      return result;
    },
    [isRu, language.google, t],
  );

  const toggleIncognito = useCallback(async () => {
    if (query.trim()) {
      await runPrivateSearch(query);
      setIncognitoOn(false);
      return;
    }
    setIncognitoOn((current) => {
      const next = !current;
      setToastMessage({
        id: Date.now(),
        text: next
          ? isRu
            ? "Приватный поиск включён: следующий запрос откроется в инкогнито."
            : "Private search is armed: the next query opens incognito."
          : isRu
            ? "Приватный поиск выключен."
            : "Private search is off.",
      });
      return next;
    });
    setSuggestionsOpen(false);
  }, [isRu, query, runPrivateSearch]);

  /** Voice input for the pill; the SearchBox keeps its own microphone too. */
  const startVoice = useCallback(() => {
    const host = globalThis as unknown as { SpeechRecognition?: new () => SpeechRecognition; webkitSpeechRecognition?: new () => SpeechRecognition };
    const Speech = host.SpeechRecognition ?? host.webkitSpeechRecognition;
    if (!Speech) {
      setToastMessage({ id: Date.now(), text: isRu ? "Голосовой ввод недоступен в этом браузере." : "Voice input isn't available in this browser." });
      return;
    }
    const recognizer = new Speech();
    recognizer.lang = isRu ? "ru-RU" : "en-US";
    recognizer.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0]?.[0]?.transcript ?? "";
      if (transcript) {
        setQuery(transcript);
        setSuggestionsOpen(false);
        searchArea.current?.querySelector<HTMLInputElement>("input")?.focus({ preventScroll: true });
      }
    };
    recognizer.start();
  }, [isRu]);

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const selected = activeSuggestion >= 0 ? flattened[activeSuggestion] : undefined;
    if (incognitoOn) {
      setSuggestionsOpen(false);
      void runPrivateSearch(selected ?? query);
      setIncognitoOn(false);
      return;
    }
    if (attachment) {
      searchByAttachment(attachment);
      return;
    }
    runSearch(selected ?? query);
  };

  const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown" && flattened.length) {
      event.preventDefault();
      setSuggestionsOpen(true);
      setActiveSuggestion((current) => (current + 1) % flattened.length);
    } else if (event.key === "ArrowUp" && flattened.length) {
      event.preventDefault();
      setSuggestionsOpen(true);
      setActiveSuggestion((current) => (current <= 0 ? flattened.length - 1 : current - 1));
    } else if (event.key === "Escape") {
      setSuggestionsOpen(false);
      setActiveSuggestion(-1);
    }
  };

  const handleSaveBookmark = (data: { title: string; url: string; customIcon?: string; shape?: BookmarkShape }) => {
    if (editingBookmark) {
      setBookmarks((current) =>
        current.map((b) => (b.id === editingBookmark.id ? { ...b, ...data } : b))
      );
      setEditingBookmark(null);
    } else {
      setBookmarks((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          title: data.title,
          url: data.url,
          customIcon: data.customIcon,
          shape: data.shape,
        },
      ]);
    }
    setBookmarkDialog(false);
  };

  const removeBookmark = (id: string) => setBookmarks((current) => current.filter((bookmark) => bookmark.id !== id));

  const restoreBackup = useCallback(async (backup: RestorePayload) => {
    if (backup.wallpaper) {
      await idbSet(WALLPAPER_FILE_KEY, backup.wallpaper);
    } else {
      await idbDelete(WALLPAPER_FILE_KEY).catch(() => undefined);
    }

    setSettings(backup.settings);
    setBookmarks(backup.bookmarks);
    setHistory(backup.history);
    persist(SETTINGS_KEY, backup.settings);
    persist(BOOKMARKS_KEY, backup.bookmarks);
    persist(HISTORY_KEY, backup.history);
    wallpaper.refresh();
  }, [wallpaper.refresh]);

  const settingsValue: SettingsContextValue = {
    settings,
    setSettings,
    update: (patch) => setSettings((s) => ({ ...s, ...patch })),
    updateStyle: (patch) => setSettings((s) => ({ ...s, searchStyle: { ...s.searchStyle, ...patch, preset: "custom" } })),
    updateAnim: (patch) => setSettings((s) => ({ ...s, textAnim: { ...s.textAnim, ...patch, preset: "custom" } })),
    wallpaper,
    analysis,
    bookmarks,
    history,
    removeBookmark,
    clearHistory: () => {
      setHistory([]);
      setAiHistory([]);
      persist(HISTORY_KEY, []);
      persist(AI_HISTORY_KEY, []);
    },
    restoreBackup,
    addBookmark: () => {
      setSettingsOpen(false);
      setEditingBookmark(null);
      setBookmarkDialog(true);
    },
    saveBookmark: (data) =>
      setBookmarks((current) => [...current, { id: crypto.randomUUID(), title: data.title, url: data.url, customIcon: data.customIcon, shape: data.shape }]),
    setBookmarkOrder: (next) => setBookmarks(next),
    goTo: setActiveSection,
    toast: (text) => setToastMessage({ id: Date.now(), text }),
    dark,
    fontTheme,
    matrix,
    browserLang,
    openHomeEditor: () => {
      setSettingsOpen(false);
      enterEdit();
    },
  };

  const style = settings.searchStyle;
  const aiMode = style.aiMode;
  useEffect(() => {
    if (aiMode !== "toggle") setAiOn(false);
  }, [aiMode]);
  const { staged, shrunk } = useStageMode(editing);
  useNewsMagnet(settings.news.enabled && !staged, editing);
  // The "edit home screen" button belongs to the launcher page only; in the news it steps aside.
  const inNews = useInNews();

  // With the news band on, widgets must stay off the "edit home" button. Existing saves that
  // already sit on it are lifted up once — a lifted widget pushes the ones above it in turn.
  const liftedRef = useRef(false);
  useEffect(() => {
    if (!settings.news.enabled) {
      liftedRef.current = false;
      return;
    }
    if (liftedRef.current) return;
    liftedRef.current = true;
    const viewport = { w: window.innerWidth, h: window.innerHeight };
    setSettings((current) => {
      if (!current.news.enabled || !current.widgets.length) return current;
      const lifted = liftWidgetsAbove(current.widgets, viewport, current.homeLayout, editButtonRect(viewport));
      return lifted === current.widgets ? current : { ...current, widgets: lifted };
    });
  }, [settings.news.enabled]);

  // The search box loses focus while editing (so it isn't mistaken for a selection). Give it back afterwards —
  // but not on touch screens, where it would pop the keyboard open.
  const wasEditing = useRef(false);
  useEffect(() => {
    if (wasEditing.current && !editing && !window.matchMedia("(pointer: coarse)").matches) {
      const id = requestAnimationFrame(() => searchArea.current?.querySelector<HTMLInputElement>("input")?.focus({ preventScroll: true }));
      wasEditing.current = editing;
      return () => cancelAnimationFrame(id);
    }
    wasEditing.current = editing;
  }, [editing]);
  const stageRef = useCallback((el: HTMLDivElement | null) => {
    stage.el = el;
  }, []);
  // Over a wallpaper the surfaces turn into frosted glass.
  const surface = hasWallpaper ? "bg-[var(--glass)] backdrop-blur-xl" : "bg-[var(--surface-container-high)]";

  return (
    <I18nContext.Provider value={i18n}>
      <FontThemeContext.Provider value={fontTheme}>
        <AppShapeDefs />
        {settingsOpen ? (
          <SettingsContext.Provider value={settingsValue}>
            <SettingsScreen activeSection={activeSection} setActiveSection={setActiveSection} onClose={() => setSettingsOpen(false)} />
          </SettingsContext.Provider>
        ) : (
          <>
            {staged && (
              <div className={cn("stage-backdrop", !editing && "is-out")} onPointerDown={() => editing && setSelectedWidget(null)} aria-hidden="true">
                {wallpaper.url && <WallpaperLayer key={wallpaper.url} url={wallpaper.url} dim={62} blur={26} grayscale={false} />}
              </div>
            )}
            <div
              ref={stageRef}
              className={cn("home-stage relative min-h-screen px-6 pb-24", staged && "is-staged", shrunk && "is-shrunk")}
              // Tapping empty space on the card deselects (the widget layer no longer catches the pointer for us).
              onPointerDown={(event) => {
                if (editing && !(event.target as HTMLElement).closest("[data-widget-id]")) setSelectedWidget(null);
              }}
            >
            {wallpaper.url && (
              <WallpaperLayer
                key={wallpaper.url}
                url={wallpaper.url}
                dim={settings.wallpaperDim}
                blur={settings.wallpaperBlur}
                grayscale={settings.wallpaperGrayscale}
              />
            )}

            <WidgetLayer
              widgets={settings.widgets}
              layout={settings.homeLayout}
              editing={editing}
              selectedId={selectedWidget}
              halo={hasWallpaper}
              newsEnabled={settings.news.enabled}
              onSelect={setSelectedWidget}
              onChange={widgetActions.change}
              onRemove={(id) => {
                widgetActions.remove(id);
                setSelectedWidget(null);
              }}
              onDuplicate={(id) => setSelectedWidget(widgetActions.duplicate(id))}
              onOpenSettings={openElementSettings}
              onEnterEdit={enterEdit}
              onDragState={setDragging}
            />

            {!editing && (
              <div className="fixed end-5 top-5 z-30 flex items-center gap-2">
                <AppMenu
                  menu={settings.appMenu}
                  onChange={(patch) => setSettings((s) => ({ ...s, appMenu: { ...s.appMenu, ...patch } }))}
                  translucent={hasWallpaper}
                  buttonClassName={cn("flex h-11 w-11 items-center justify-center rounded-full transition-all duration-300 hover:rounded-2xl", surface)}
                />
                <button
                  type="button"
                  onClick={() => setSettingsOpen(true)}
                  title={t("settings.open")}
                  aria-label={t("settings.open")}
                  className={cn("flex h-11 w-11 items-center justify-center rounded-full transition-all duration-300 hover:rotate-90 hover:rounded-2xl", surface)}
                >
                  <SettingsIcon size={21} strokeWidth={1.9} aria-hidden="true" />
                </button>
              </div>
            )}

            {!editing && !staged && settings.news.enabled && (
              <button
                type="button"
                onClick={scrollToNews}
                className={cn("news-handle", inNews && "is-hidden")}
                aria-label={isRu ? "Открыть новости" : "Open news"}
                tabIndex={inNews ? -1 : 0}
              >
                <span className="news-handle-grip" aria-hidden="true" />
                <span className="news-handle-ico">
                  <ChevronDown size={15} strokeWidth={2.4} aria-hidden="true" />
                </span>
                <span className="news-handle-text">{isRu ? "Новости" : "News"}</span>
              </button>
            )}

            {!editing && !inNews && (
              <button type="button" onClick={() => enterEdit()} className="edit-home-button">
                <LayoutDashboard size={15} strokeWidth={2} aria-hidden="true" />
                <span>{t("home.editShort")}</span>
              </button>
            )}

            {/* Movable & Customizable Search bar, Logo, and other buttons */}
            <main
              className={cn("home-column relative z-10 flex w-full flex-col items-center gap-5 px-3 transition-opacity duration-300 sm:gap-6", editing && "pointer-events-auto")}
              style={{ paddingTop: settings.launcherLayout.search.custom ? "4vh" : `max(64px, ${style.offsetTop}vh)` }}
            >
              {/* Movable Logo */}
              <MovableElement
                id="__system_logo__"
                title={t("home.element.logo")}
                position={settings.launcherLayout.logo}
                homeLayout={settings.homeLayout}
                editing={editing}
                selected={selectedWidget === "__system_logo__"}
                onSelect={() => setSelectedWidget("__system_logo__")}
                onOpenSettings={() => openElementSettings("__system_logo__")}
                onMove={(x, y) => {
                  setSettings((s) => ({
                    ...s,
                    launcherLayout: {
                      ...s.launcherLayout,
                      logo: { ...s.launcherLayout.logo, custom: true, x, y },
                    },
                  }));
                }}
                onResize={(width, scale) => {
                  setSettings((s) => ({
                    ...s,
                    launcherLayout: {
                      ...s.launcherLayout,
                      logo: { ...s.launcherLayout.logo, width, scale },
                    },
                  }));
                }}
                onResetCenter={() => {
                  setSettings((s) => ({
                    ...s,
                    launcherLayout: {
                      ...s.launcherLayout,
                      logo: { ...s.launcherLayout.logo, custom: false },
                    },
                  }));
                }}
                onRemove={() => {
                  setSettings((s) => ({
                    ...s,
                    launcherLayout: {
                      ...s.launcherLayout,
                      logo: { ...s.launcherLayout.logo, visible: false },
                    },
                  }));
                  setSelectedWidget(null);
                }}
                onEnterEdit={() => enterEdit()}
                onDragState={setDragging}
                onShow={() => setSettings((s) => ({ ...s, launcherLayout: { ...s.launcherLayout, logo: { ...s.launcherLayout.logo, visible: true } } }))}
                className={cn("w-full", hasWallpaper && "wp-text")}
              >
                <Logo settings={settings} dark={dark} />
              </MovableElement>

              {/* Movable Search Bar */}
              <MovableElement
                id="__system_search__"
                title={t("home.element.search")}
                position={settings.launcherLayout.search}
                homeLayout={settings.homeLayout}
                editing={editing}
                selected={selectedWidget === "__system_search__"}
                onSelect={() => setSelectedWidget("__system_search__")}
                onOpenSettings={() => openElementSettings("__system_search__")}
                onMove={(x, y) => {
                  setSettings((s) => ({
                    ...s,
                    launcherLayout: {
                      ...s.launcherLayout,
                      search: { ...s.launcherLayout.search, custom: true, x, y },
                    },
                  }));
                }}
                onResize={(width, scale) => {
                  setSettings((s) => ({
                    ...s,
                    searchStyle: { ...s.searchStyle, width },
                    launcherLayout: {
                      ...s.launcherLayout,
                      search: { ...s.launcherLayout.search, width, scale },
                    },
                  }));
                }}
                onResetCenter={() => {
                  setSettings((s) => ({
                    ...s,
                    launcherLayout: {
                      ...s.launcherLayout,
                      search: { ...s.launcherLayout.search, custom: false },
                    },
                  }));
                }}
                onRemove={() => setShowSearchRemoveDialog(true)}
                onEnterEdit={() => enterEdit()}
                onDragState={setDragging}
                onShow={() => setSettings((s) => ({ ...s, launcherLayout: { ...s.launcherLayout, search: { ...s.launcherLayout.search, visible: true } } }))}
                className="relative z-20 w-full"
              >
                <div ref={searchArea} className={cn("relative z-10 w-full", !editing && "pointer-events-auto")} style={{ maxWidth: settings.launcherLayout.search.width || style.width }}>
                  <form
                    onSubmit={handleSearch}
                    role="search"
                    className={cn("transition-all duration-300", searchOverlayOpen && "pointer-events-none scale-95 opacity-0")}
                    onClick={() => {
                      if (!editing && !searchOverlayOpen) openSearchOverlay();
                    }}
                  >
                    <SearchBox
                      style={{ ...style, width: settings.launcherLayout.search.width || style.width }}
                      anim={settings.textAnim}
                      value={query}
                      onValueChange={(next) => {
                        setQuery(next);
                        setRemoteSuggestions([]);
                        setSuggestionsOpen(Boolean(next.trim()) && !incognitoOn);
                        setActiveSuggestion(-1);
                      }}
                      onAiSearch={runAiSearch}
                      aiOn={aiOn}
                      onAiToggle={() => setAiOn((v) => !v)}
                      attachment={attachment}
                      attachError={attachError}
                      onAttach={(file) => {
                        setAttachError(null);
                        if (file && file.size > 20 * 1024 * 1024) {
                          setAttachError(isRu ? "Файл больше 20 МБ — выберите меньше" : "That file is larger than 20 MB — choose a smaller one");
                          return;
                        }
                        setAttachment(file);
                      }}
                      onGallery={runGalleryImage}
                      onVoice={(text) => setQuery(text)}
                      placeholder={style.placeholder.trim() || t("search.placeholder")}
                      hints={searchHints(t)}
                      submitLabel={t("search.button")}
                      going={going}
                      translucent={hasWallpaper}
                      autoFocus={false}
                      inputProps={{
                        role: "combobox",
                        "aria-autocomplete": "list",
                        "aria-expanded": showSuggestionList || searchOverlayOpen,
                        "aria-controls": "search-suggestions",
                        onFocus: (event) => {
                          if (!editing) {
                            event.currentTarget.blur();
                            openSearchOverlay();
                          }
                        },
                        onKeyDown: handleSearchKeyDown,
                      }}
                    />
                  </form>

                  {!searchOverlayOpen && showSuggestionList && (
                    <div
                      id="search-suggestions"
                      role="listbox"
                      className="suggestions-enter absolute inset-x-0 top-[calc(100%+10px)] overflow-hidden rounded-[28px] bg-[var(--surface)] py-2 shadow-[0_18px_55px_rgba(0,0,0,0.18)]"
                    >
                      {suggestionGroups.map((group) => (
                        <div key={group.label}>
                          <div className="px-5 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">{group.label}</div>
                          {group.items.map((item) => {
                            const index = flattened.indexOf(item);
                            const active = activeSuggestion === index;
                            const ItemIcon = group.kind === "history" ? History : Search;
                            return (
                              <button
                                key={`${group.kind}-${item}`}
                                type="button"
                                role="option"
                                aria-selected={active}
                                onMouseDown={(event) => event.preventDefault()}
                                onClick={() => runSearch(item)}
                                className={cn(
                                  "flex min-h-12 w-full items-center gap-3 px-5 text-start transition",
                                  active ? "bg-[var(--surface-container-high)]" : "hover:bg-[var(--surface-container-high)]",
                                )}
                              >
                                <ItemIcon size={18} className="shrink-0 text-[var(--muted)]" aria-hidden="true" />
                                <span dir="auto" className="min-w-0 flex-1 truncate text-sm">
                                  {item}
                                </span>
                                <CornerDownLeft
                                  size={14}
                                  className={cn("text-[var(--muted)] transition-opacity rtl:-scale-x-100", active ? "opacity-100" : "opacity-0")}
                                  aria-hidden="true"
                                />
                              </button>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  )}
                  {/* Quick pills — two halves of the bar, one element with it. */}
                  <div className={cn("relative w-full", editing && "pointer-events-none")}>
                  <QuickPills
                    pills={settings.quickPills}
                    style={style}
                    lang={isRu ? "ru" : "en"}
                    incognitoOn={incognitoOn}
                    onIncognito={() => void toggleIncognito()}
                    onAi={() => {
                      const term = query.trim();
                      if (term) runAiSearch(term);
                      else window.open("https://www.google.com/search?udm=50", "_blank", "noopener,noreferrer");
                    }}
                    onNews={() => {
                      const feed = document.querySelector(".news-feed");
                      if (feed) feed.scrollIntoView({ behavior: "smooth", block: "start" });
                      else {
                        setActiveSection("news");
                        setSettingsOpen(true);
                      }
                    }}
                    onVoice={startVoice}
                    onLens={() => lensInput.current?.click()}
                    onAttach={() => attachInput.current?.click()}
                    onCustom={(url) => {
                      if (url) window.open(url, "_blank", "noopener,noreferrer");
                    }}
                    onConfigure={() => {
                      setActiveSection("searchbox");
                      setSettingsOpen(true);
                    }}
                    hasWallpaper={hasWallpaper}
                  />
                  </div>
                </div>
              </MovableElement>


              <input
                ref={lensInput}
                type="file"
                accept="image/*"
                className="hidden"
                aria-hidden="true"
                tabIndex={-1}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) runGalleryImage(file);
                  event.target.value = "";
                }}
              />
              <input
                ref={attachInput}
                type="file"
                className="hidden"
                aria-hidden="true"
                tabIndex={-1}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (!file) return;
                  setAttachError(null);
                  if (file.size > 20 * 1024 * 1024) {
                    setAttachError(isRu ? "Файл больше 20 МБ — выберите меньше" : "That file is larger than 20 MB — choose a smaller one");
                    return;
                  }
                  setAttachment(file);
                  setToastMessage({ id: Date.now(), text: isRu ? `Прикреплён файл: ${file.name}` : `Attached: ${file.name}` });
                }}
              />

              {/* Movable Bookmarks and Action Buttons */}
              <MovableElement
                id="__system_buttons__"
                title={t("home.element.buttons")}
                position={settings.launcherLayout.buttons}
                homeLayout={settings.homeLayout}
                editing={editing}
                selected={selectedWidget === "__system_buttons__"}
                onSelect={() => setSelectedWidget("__system_buttons__")}
                onOpenSettings={() => openElementSettings("__system_buttons__")}
                onMove={(x, y) => {
                  setSettings((s) => ({
                    ...s,
                    launcherLayout: {
                      ...s.launcherLayout,
                      buttons: { ...s.launcherLayout.buttons, custom: true, x, y },
                    },
                  }));
                }}
                onResize={(width, scale) => {
                  setSettings((s) => ({
                    ...s,
                    launcherLayout: {
                      ...s.launcherLayout,
                      buttons: { ...s.launcherLayout.buttons, width, scale },
                    },
                  }));
                }}
                onResetCenter={() => {
                  setSettings((s) => ({
                    ...s,
                    launcherLayout: {
                      ...s.launcherLayout,
                      buttons: { ...s.launcherLayout.buttons, custom: false },
                    },
                  }));
                }}
                onRemove={() => {
                  setSettings((s) => ({
                    ...s,
                    launcherLayout: {
                      ...s.launcherLayout,
                      buttons: { ...s.launcherLayout.buttons, visible: false },
                    },
                  }));
                  setSelectedWidget(null);
                }}
                onEnterEdit={() => enterEdit()}
                onDragState={setDragging}
                onShow={() => setSettings((s) => ({ ...s, launcherLayout: { ...s.launcherLayout, buttons: { ...s.launcherLayout.buttons, visible: true } } }))}
                className="relative z-10 w-full"
              >
                <ShortcutRow
                  bookmarks={bookmarks}
                  width={Math.min(settings.launcherLayout.search.width || style.width, settings.launcherLayout.buttons.width || 9999)}
                  iconSize={settings.launcherLayout.buttons.iconSize || 56}
                  rows={settings.launcherLayout.buttons.rows ?? 2}
                  showLabels={settings.launcherLayout.buttons.showLabels !== false}
                  addTile={settings.launcherLayout.buttons.addTile !== false}
                  shape={settings.bookmarkShape || "circle"}
                  hasWallpaper={hasWallpaper}
                  surfaceClass={surface}
                  addLabel={t("bookmarks.add")}
                  removeLabel={(name) => t("bookmarks.remove", { name })}
                  onAdd={() => {
                    if (editing) return;
                    setEditingBookmark(null);
                    setBookmarkDialog(true);
                  }}
                  onRemove={removeBookmark}
                />
              </MovableElement>

            </main>
            </div>

            {/* News lives in its own band under the whole stage (full-height widget area), so it can never overlap widgets. */}
            {!editing && !staged && settings.news.enabled && (
              <section className="news-band relative z-10 w-full">
                <NewsFeed
                  onBackToTop={scrollToLauncher}
                  news={settings.news}
                  lang={isRu ? "ru" : "en"}
                  hasWallpaper={hasWallpaper}
                  accent={settings.colorSource === "custom" ? settings.customColor : PRESET_COLORS[settings.presetId]}
                  onConfigure={() => {
                    setActiveSection("news");
                    setSettingsOpen(true);
                  }}
                  onToast={(text) => setToastMessage({ id: Date.now(), text })}
                />
              </section>
            )}

            {editing && (
              <EditChrome
                widgets={settings.widgets}
                layout={settings.homeLayout}
                launcherLayout={settings.launcherLayout}
                searchStyle={settings.searchStyle}
                selectedId={selectedWidget}
                dragging={dragging}
                actions={widgetActions}
                onChangeLauncherLayout={(patch) =>
                  setSettings((s) => ({ ...s, launcherLayout: { ...s.launcherLayout, ...patch } }))
                }
                onChangeSearchStyle={(patch) =>
                  setSettings((s) => ({ ...s, searchStyle: { ...s.searchStyle, ...patch, preset: "custom" } }))
                }
                onResetElementCenter={(key) => {
                  if (key === "__system_logo__") {
                    setSettings((s) => ({ ...s, launcherLayout: { ...s.launcherLayout, logo: { ...s.launcherLayout.logo, custom: false } } }));
                  } else if (key === "__system_search__") {
                    setSettings((s) => ({ ...s, launcherLayout: { ...s.launcherLayout, search: { ...s.launcherLayout.search, custom: false } } }));
                  } else if (key === "__system_buttons__") {
                    setSettings((s) => ({ ...s, launcherLayout: { ...s.launcherLayout, buttons: { ...s.launcherLayout.buttons, custom: false } } }));
                  }
                }}
                onRequestRemoveSearch={() => setShowSearchRemoveDialog(true)}
                onSelect={setSelectedWidget}
                settingsSignal={settingsSignal}
                onExit={exitEdit}
                settings={settings}
                onUpdateSettings={(patch) => setSettings((s) => ({ ...s, ...patch }))}
              />
            )}

            {/* "Seriously? / Серьёзно?" Search Removal Confirmation Modal */}
            {showSearchRemoveDialog && (
              <div
                role="dialog"
                aria-modal="true"
                className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-200"
              >
                <div className="relative w-full max-w-sm rounded-[32px] bg-[var(--surface)] p-6 shadow-2xl ring-1 ring-[var(--line)] text-center space-y-4">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-500">
                    <AlertCircle className="h-7 w-7" />
                  </div>
                  <div className="space-y-1.5">
                    <h3 className="text-xl font-bold text-[var(--fg)]">
                      {lang === "ru" ? "Серьёзно?" : "Seriously?"}
                    </h3>
                    <p className="text-xs text-[var(--muted)] leading-relaxed px-2">
                      {lang === "ru"
                        ? "Ты действительно хочешь убрать строку поиска с главного экрана поискового лончера?"
                        : "Do you really want to remove the search bar from your search launcher home screen?"}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowSearchRemoveDialog(false)}
                      className="w-full h-11 rounded-full bg-[var(--primary)] text-[var(--on-primary)] font-semibold text-sm hover:opacity-95 transition shadow-sm"
                    >
                      {lang === "ru" ? "Оставить строку" : "Keep search bar"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSettings((s) => ({
                          ...s,
                          launcherLayout: {
                            ...s.launcherLayout,
                            search: { ...s.launcherLayout.search, visible: false },
                          },
                        }));
                        setSelectedWidget(null);
                        setShowSearchRemoveDialog(false);
                      }}
                      className="w-full h-10 rounded-full bg-red-500/10 text-red-500 hover:bg-red-500/20 font-medium text-xs transition"
                    >
                      {lang === "ru" ? "Да, скрыть строку поиска" : "Yes, remove search bar"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {bookmarkDialog && (
              <BookmarkDialog
                initialBookmark={editingBookmark}
                defaultShape={settings.bookmarkShape}
                onSave={handleSaveBookmark}
                onClose={() => {
                  setBookmarkDialog(false);
                  setEditingBookmark(null);
                }}
              />
            )}

            {contextMenu && (
              <ContextMenu
                menu={contextMenu}
                onClose={() => setContextMenu(null)}
                onAddBookmark={() => {
                  setEditingBookmark(null);
                  setBookmarkDialog(true);
                }}
                onAddWidget={() => {
                  enterEdit();
                }}
                onChangeWallpaper={() => {
                  setActiveSection("wallpaper");
                  setSettingsOpen(true);
                }}
                onManageWidget={(id) => {
                  enterEdit();
                  setSelectedWidget(id);
                }}
                onDuplicateWidget={(id) => {
                  if (id.startsWith("__system_")) return;
                  const newId = widgetActions.duplicate(id);
                  enterEdit();
                  setSelectedWidget(newId);
                }}
                onRemoveWidget={(id) => {
                  if (id === "__system_search__") {
                    setShowSearchRemoveDialog(true);
                  } else if (id === "__system_logo__") {
                    setSettings((s) => ({ ...s, launcherLayout: { ...s.launcherLayout, logo: { ...s.launcherLayout.logo, visible: false } } }));
                  } else if (id === "__system_buttons__") {
                    setSettings((s) => ({ ...s, launcherLayout: { ...s.launcherLayout, buttons: { ...s.launcherLayout.buttons, visible: false } } }));
                  } else {
                    widgetActions.remove(id);
                    setSelectedWidget(null);
                  }
                }}
                onEditBookmark={(id) => {
                  const b = bookmarks.find((item) => item.id === id);
                  if (b) {
                    setEditingBookmark(b);
                    setBookmarkDialog(true);
                  }
                }}
                onCopyBookmark={(copyUrl) => {
                  navigator.clipboard.writeText(copyUrl).then(() => {
                    setToastMessage({ id: Date.now(), text: isRu ? "Ссылка скопирована в буфер" : "Link copied to clipboard" });
                  });
                }}
                onOpenBookmark={(openUrl) => {
                  window.open(openUrl, "_blank", "noopener,noreferrer");
                }}
                onRemoveBookmark={(id) => {
                  removeBookmark(id);
                }}
                onEditHomeScreen={() => {
                  enterEdit();
                }}
                onOpenSettings={() => {
                  setSettingsOpen(true);
                }}
              />
            )}

            <SearchOverlay
              open={searchOverlayOpen && !editing && !settingsOpen}
              fromY={searchFromY}
              query={query}
              onQueryChange={(next) => {
                setQuery(next);
                setRemoteSuggestions([]);
                setSuggestionsOpen(true);
                setActiveSuggestion(-1);
              }}
              onSubmit={(submittedQuery) => {
                if (incognitoOn) {
                  setSearchOverlayOpen(false);
                  setSuggestionsOpen(false);
                  void runPrivateSearch(submittedQuery);
                  setIncognitoOn(false);
                  return;
                }
                if (attachment) {
                  setSearchOverlayOpen(false);
                  searchByAttachment(attachment);
                  return;
                }
                runSearch(submittedQuery);
              }}
              onClose={() => {
                setSearchOverlayOpen(false);
                setSuggestionsOpen(false);
              }}
              placeholder={style.placeholder.trim() || t("search.placeholder")}
              attachment={attachment}
              attachError={attachError}
              onAttach={(file) => {
                setAttachError(null);
                if (file && file.size > 20 * 1024 * 1024) {
                  setAttachError(isRu ? "Файл больше 20 МБ — выберите меньше" : "That file is larger than 20 MB — choose a smaller one");
                  return;
                }
                setAttachment(file);
              }}
              onGallery={(file) => {
                setSearchOverlayOpen(false);
                runGalleryImage(file);
              }}
              onVoice={(text) => setQuery(text)}
              bookmarks={bookmarks}
              bookmarkShape={settings.bookmarkShape || "circle"}
              history={history}
              aiHistory={aiHistory}
              suggestionGroups={suggestionGroups}
              onSelectSuggestion={(item, isAi) => {
                if (incognitoOn) {
                  setSearchOverlayOpen(false);
                  void runPrivateSearch(item);
                  setIncognitoOn(false);
                  return;
                }
                if (isAi) runAiSearch(item);
                else runSearch(item);
              }}
              onNotify={(text) => setToastMessage({ id: Date.now(), text })}
              launcherTitle={settings.logo === "text" && settings.logoText.trim() ? `${settings.logoText.trim()} Search Launcher` : "LisYan Search Launcher"}
              incognitoOn={incognitoOn}
              cacheDays={settings.faviconTheme.cacheDays}
              onOpenVisited={(url) => {
                setSearchOverlayOpen(false);
                setSuggestionsOpen(false);
                window.open(url, "_blank", "noopener,noreferrer");
              }}
            />
          </>
        )}

        {toastMessage && (
          <div
            key={toastMessage.id}
            role="status"
            className="toast-enter fixed inset-x-0 bottom-6 z-[100] mx-auto w-fit max-w-[min(92vw,560px)] rounded-[20px] bg-[var(--fg)] px-5 py-3.5 text-sm leading-5 text-[var(--bg)] shadow-2xl"
          >
            {toastMessage.text}
          </div>
        )}
      </FontThemeContext.Provider>
    </I18nContext.Provider>
  );
}
