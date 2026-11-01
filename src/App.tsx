import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";
import { AlertCircle, CornerDownLeft, History, LayoutDashboard, Plus, Search, Settings as SettingsIcon, X } from "lucide-react";
import BookmarkDialog from "./components/BookmarkDialog";
import { BookmarkIcon } from "./components/BookmarkIcon";
import ContextMenu, { type ContextMenuData } from "./components/ContextMenu";
import LoadingIndicator from "./components/LoadingIndicator";
import Logo from "./components/Logo";
import SearchBox, { searchHints } from "./components/SearchBox";
import SettingsScreen from "./components/SettingsScreen";
import { SettingsContext, type AnalysisState, type SettingsContextValue } from "./components/settings/context";
import WallpaperLayer from "./components/WallpaperLayer";
import EditChrome from "./components/widgets/EditChrome";
import MovableElement from "./components/widgets/MovableElement";
import WidgetLayer from "./components/widgets/WidgetLayer";
import { FontThemeContext } from "./lib/font-theme";
import { I18nContext, detectLanguage, getLanguage, isRtl, matrixSupport, translate, type I18n, type MessageKey, type Vars } from "./lib/i18n";
import {
  BOOKMARKS_KEY,
  HISTORY_KEY,
  SETTINGS_KEY,
  getHost,
  normalizeUrl,
  persist,
  readBookmarks,
  readHistory,
  readSettings,
  type Bookmark,
  type BookmarkShape,
  type FontTheme,
  type Settings,
  type SettingsSection,
} from "./lib/settings";
import { PALETTE_VARS, PRESET_COLORS, analyzeWallpaper, buildPalette } from "./lib/theme";
import { useWallpaper } from "./lib/wallpaper";
import { useWidgetActions } from "./lib/widgets";
import { cn } from "./utils/cn";

type SuggestionGroup = { label: string; kind: "history" | "popular" | "similar"; items: string[] };

/** Theme snapshot read by the inline script in index.html before the first paint. */
const BOOT_KEY = "lisyan_boot";

const INPUT =
  "h-14 rounded-2xl bg-[var(--surface-container-high)] px-5 text-[var(--fg)] outline-none transition focus:bg-[var(--surface-container-highest)] placeholder:text-[var(--muted)]";

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

function Favicon({ url }: { url: string }) {
  const [status, setStatus] = useState<"loading" | "loaded" | "failed">("loading");
  const domain = getHost(url);
  return (
    <>
      {status === "loading" && <LoadingIndicator indicatorSize={24} containerWidth={28} containerHeight={28} />}
      {status === "failed" && <span className="text-xs font-bold text-[var(--muted)]">{domain.slice(0, 2).toUpperCase()}</span>}
      <img
        src={`https://www.google.com/s2/favicons?domain=${domain}&sz=64`}
        alt=""
        onLoad={() => setStatus("loaded")}
        onError={() => setStatus("failed")}
        className={cn("h-7 w-7 grayscale transition group-hover:grayscale-0", status !== "loaded" && "hidden")}
      />
    </>
  );
}

export default function App() {
  const [query, setQuery] = useState("");
  const [bookmarks, setBookmarks] = useState<Bookmark[]>(readBookmarks);
  const [history, setHistory] = useState<string[]>(readHistory);
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
  const editState = useRef({ editing: false, selected: null as string | null });
  const widgetActions = useWidgetActions(setSettings);

  useEffect(() => {
    editState.current = { editing, selected: selectedWidget };
  }, [editing, selectedWidget]);

  const enterEdit = useCallback((id: string | null = null) => {
    setSuggestionsOpen(false);
    setActiveSuggestion(-1);
    (document.activeElement as HTMLElement | null)?.blur?.();
    setSelectedWidget(id);
    setEditing(true);
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

  useEffect(() => persist(BOOKMARKS_KEY, bookmarks), [bookmarks]);
  useEffect(() => persist(SETTINGS_KEY, settings), [settings]);
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
      if (!searchArea.current?.contains(event.target as Node)) {
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
          else if (widgetId === "__system_add_button__") title = isRu ? "Кнопка «+ Добавить»" : "Add Bookmark Button";
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
    if (!term || !settings.searchSuggestions) return [];
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
  const showSuggestionList = suggestionsOpen && settings.searchSuggestions && suggestionGroups.length > 0;

  const runSearch = (value: string) => {
    const term = value.trim();
    if (!term) return;
    const nextHistory = [term, ...history.filter((item) => item.toLocaleLowerCase() !== term.toLocaleLowerCase())].slice(0, 10);
    setHistory(nextHistory);
    persist(HISTORY_KEY, nextHistory); // synchronously: navigation starts right away
    setSuggestionsOpen(false);
    setActiveSuggestion(-1);
    setGoing(true);
    const isUrl = /^https?:\/\//i.test(term) || (/^\S+\.\S{2,}$/.test(term) && !term.includes(" "));
    window.location.assign(
      isUrl ? normalizeUrl(term) : `https://www.google.com/search?q=${encodeURIComponent(term)}&hl=${encodeURIComponent(language.google)}`,
    );
  };

  const runAiSearch = (value: string) => {
    const term = (value || query).trim();
    if (!term) return;
    const nextHistory = [term, ...history.filter((item) => item.toLocaleLowerCase() !== term.toLocaleLowerCase())].slice(0, 10);
    setHistory(nextHistory);
    persist(HISTORY_KEY, nextHistory);
    setSuggestionsOpen(false);
    setActiveSuggestion(-1);
    setGoing(true);
    const template = settings.searchStyle.aiButtonUrl || "https://www.google.com/search?q={q}&udm=50";
    const targetUrl = template.replace("{q}", encodeURIComponent(term));
    window.location.assign(targetUrl);
  };

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const selected = activeSuggestion >= 0 ? flattened[activeSuggestion] : undefined;
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
    clearHistory: () => setHistory([]),
    addBookmark: () => {
      setSettingsOpen(false);
      setEditingBookmark(null);
      setBookmarkDialog(true);
    },
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
  // Over a wallpaper the surfaces turn into frosted glass.
  const surface = hasWallpaper ? "bg-[var(--glass)] backdrop-blur-xl" : "bg-[var(--surface-container-high)]";

  return (
    <I18nContext.Provider value={i18n}>
      <FontThemeContext.Provider value={fontTheme}>
        {settingsOpen ? (
          <SettingsContext.Provider value={settingsValue}>
            <SettingsScreen activeSection={activeSection} setActiveSection={setActiveSection} onClose={() => setSettingsOpen(false)} />
          </SettingsContext.Provider>
        ) : (
          <div className="relative min-h-screen px-6 pb-16">
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
              onSelect={setSelectedWidget}
              onChange={widgetActions.change}
              onRemove={(id) => {
                widgetActions.remove(id);
                setSelectedWidget(null);
              }}
              onDuplicate={(id) => setSelectedWidget(widgetActions.duplicate(id))}
              onEnterEdit={enterEdit}
              onDragState={setDragging}
            />

            {!editing && (
              <>
                <button
                  type="button"
                  onClick={() => enterEdit()}
                  title={t("home.edit")}
                  aria-label={t("home.edit")}
                  className={cn(
                    "fixed end-[76px] top-5 z-20 flex h-12 w-12 items-center justify-center rounded-full transition-all duration-300 hover:rounded-2xl",
                    surface,
                  )}
                >
                  <LayoutDashboard size={20} strokeWidth={1.9} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => setSettingsOpen(true)}
                  title={t("settings.open")}
                  aria-label={t("settings.open")}
                  className={cn(
                    "fixed end-5 top-5 z-20 flex h-12 w-12 items-center justify-center rounded-full transition-all duration-300 hover:rotate-90 hover:rounded-2xl",
                    surface,
                  )}
                >
                  <SettingsIcon size={21} strokeWidth={1.9} aria-hidden="true" />
                </button>
              </>
            )}

            {/* Movable & Customizable Search bar, Logo, and other buttons */}
            <main
              className={cn("relative z-10 flex w-full flex-col items-center px-3 transition-opacity duration-300", editing && "pointer-events-auto")}
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
                onDragState={setDragging}
                className={cn("w-full mb-6", hasWallpaper && "wp-text")}
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
                onDragState={setDragging}
                className="w-full relative z-20"
              >
                <div ref={searchArea} className={cn("relative z-10 w-full", !editing && "pointer-events-auto")} style={{ maxWidth: settings.launcherLayout.search.width || style.width }}>
                  <form onSubmit={handleSearch} role="search">
                    <SearchBox
                      style={{ ...style, width: settings.launcherLayout.search.width || style.width }}
                      anim={settings.textAnim}
                      value={query}
                      onValueChange={(next) => {
                        setQuery(next);
                        setRemoteSuggestions([]);
                        setSuggestionsOpen(Boolean(next.trim()));
                        setActiveSuggestion(-1);
                      }}
                      onAiSearch={runAiSearch}
                      placeholder={style.placeholder.trim() || t("search.placeholder")}
                      hints={searchHints(t)}
                      submitLabel={t("search.button")}
                      going={going}
                      translucent={hasWallpaper}
                      autoFocus
                      inputProps={{
                        role: "combobox",
                        "aria-autocomplete": "list",
                        "aria-expanded": showSuggestionList,
                        "aria-controls": "search-suggestions",
                        onFocus: () => {
                          if (query.trim()) setSuggestionsOpen(true);
                        },
                        onKeyDown: handleSearchKeyDown,
                      }}
                    />
                  </form>

                  {showSuggestionList && (
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
                </div>
              </MovableElement>

              {/* Movable Bookmarks and Action Buttons */}
              <MovableElement
                id="__system_buttons__"
                title={t("home.element.buttons")}
                position={settings.launcherLayout.buttons}
                homeLayout={settings.homeLayout}
                editing={editing}
                selected={selectedWidget === "__system_buttons__"}
                onSelect={() => setSelectedWidget("__system_buttons__")}
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
                onDragState={setDragging}
                className={cn(
                  "w-full relative z-10",
                  settings.launcherLayout.search.custom ? "mt-24 sm:mt-32" : "mt-8 sm:mt-12"
                )}
              >
                <div
                  className="grid w-full gap-x-2 gap-y-4 max-w-full justify-center max-sm:[--btn-cols:4]"
                  style={{
                    maxWidth: settings.launcherLayout.buttons.width,
                    gridTemplateColumns: `repeat(var(--btn-cols, ${settings.launcherLayout.buttons.columns || 6}), minmax(0, 1fr))`,
                  }}
                >
                  {bookmarks.map((bookmark) => (
                    <div key={bookmark.id} data-bookmark-id={bookmark.id} className="group relative min-w-0">
                      <a href={bookmark.url} className="flex min-w-0 flex-col items-center gap-2 rounded-3xl py-2 transition hover:bg-[var(--glass)]">
                        <BookmarkIcon
                          bookmark={bookmark}
                          size={settings.launcherLayout.buttons.iconSize || 56}
                          fallbackShape={settings.bookmarkShape || "circle"}
                          className={cn("transition-all duration-300 group-hover:scale-105", surface)}
                        />
                        <span
                          dir="auto"
                          className={cn("w-full truncate text-center text-xs sm:text-sm", hasWallpaper ? "wp-text text-[var(--fg)]" : "text-[var(--muted)]")}
                        >
                          {bookmark.title}
                        </span>
                      </a>
                      <button
                        type="button"
                        onClick={() => removeBookmark(bookmark.id)}
                        title={t("bookmarks.remove", { name: bookmark.title })}
                        aria-label={t("bookmarks.remove", { name: bookmark.title })}
                        className="absolute end-0 top-0 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--surface-container-highest)] opacity-0 transition focus-visible:opacity-100 group-hover:opacity-100"
                      >
                        <X size={13} aria-hidden="true" />
                      </button>
                    </div>
                  ))}
                  {settings.launcherLayout.buttons.showAddButton && (
                    <button
                      type="button"
                      onClick={() => setBookmarkDialog(true)}
                      className="group flex min-w-0 flex-col items-center gap-2 rounded-3xl py-2 transition hover:bg-[var(--glass)]"
                    >
                      <span
                        className={cn(
                          "flex items-center justify-center rounded-full border border-dashed border-[var(--muted)]/50 text-[var(--muted)] transition-all duration-300 group-hover:scale-105 group-hover:border-[var(--fg)] group-hover:text-[var(--fg)]",
                          hasWallpaper && "bg-[var(--glass)] backdrop-blur-xl",
                        )}
                        style={{
                          width: `${settings.launcherLayout.buttons.iconSize || 56}px`,
                          height: `${settings.launcherLayout.buttons.iconSize || 56}px`,
                        }}
                      >
                        <Plus size={24} aria-hidden="true" />
                      </span>
                      <span className={cn("w-full truncate text-center text-xs sm:text-sm", hasWallpaper ? "wp-text text-[var(--fg)]" : "text-[var(--muted)]")}>
                        {t("bookmarks.add")}
                      </span>
                    </button>
                  )}
                </div>
              </MovableElement>

              {/* Standalone Movable Add Bookmark Button (Full Widget Mechanics: 8-dir resize, corner brackets, drag anywhere, removable) */}
              <MovableElement
                id="__system_add_button__"
                title={isRu ? "Кнопка «+ Добавить»" : "Add Bookmark Button"}
                position={settings.launcherLayout.addButton}
                homeLayout={settings.homeLayout}
                editing={editing}
                selected={selectedWidget === "__system_add_button__"}
                onSelect={() => setSelectedWidget("__system_add_button__")}
                onMove={(x, y) => {
                  setSettings((s) => ({
                    ...s,
                    launcherLayout: {
                      ...s.launcherLayout,
                      addButton: { ...s.launcherLayout.addButton, custom: true, x, y },
                    },
                  }));
                }}
                onResize={(width, scale) => {
                  setSettings((s) => ({
                    ...s,
                    launcherLayout: {
                      ...s.launcherLayout,
                      addButton: { ...s.launcherLayout.addButton, width, scale },
                    },
                  }));
                }}
                onResetCenter={() => {
                  setSettings((s) => ({
                    ...s,
                    launcherLayout: {
                      ...s.launcherLayout,
                      addButton: { ...s.launcherLayout.addButton, custom: false },
                    },
                  }));
                }}
                onRemove={() => {
                  setSettings((s) => ({
                    ...s,
                    launcherLayout: {
                      ...s.launcherLayout,
                      addButton: { ...s.launcherLayout.addButton, visible: false },
                    },
                  }));
                  setSelectedWidget(null);
                }}
                onDragState={setDragging}
                className={cn(
                  "w-full relative z-10",
                  settings.launcherLayout.search.custom ? "mt-6 sm:mt-8" : "mt-4 sm:mt-6"
                )}
              >
                <div
                  className="flex items-center justify-center w-full"
                  style={{ maxWidth: settings.launcherLayout.addButton.width }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      if (!editing) setBookmarkDialog(true);
                    }}
                    className={cn(
                      "group flex items-center justify-center gap-2.5 w-full py-2.5 px-4 rounded-2xl border border-[var(--line)] transition-all duration-300 shadow-sm",
                      surface,
                      "hover:scale-[1.02] hover:border-[var(--primary)] active:scale-[0.98]"
                    )}
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--primary)] text-[var(--on-primary)] shadow-xs transition group-hover:scale-110">
                      <Plus size={16} strokeWidth={2.5} />
                    </span>
                    <span className={cn("text-xs sm:text-sm font-semibold truncate", hasWallpaper && "wp-text")}>
                      {t("bookmarks.add")}
                    </span>
                  </button>
                </div>
              </MovableElement>
            </main>

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
                  } else if (key === "__system_add_button__") {
                    setSettings((s) => ({ ...s, launcherLayout: { ...s.launcherLayout, addButton: { ...s.launcherLayout.addButton, custom: false } } }));
                  }
                }}
                onRequestRemoveSearch={() => setShowSearchRemoveDialog(true)}
                onSelect={setSelectedWidget}
                onExit={exitEdit}
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
                  } else if (id === "__system_add_button__") {
                    setSettings((s) => ({ ...s, launcherLayout: { ...s.launcherLayout, addButton: { ...s.launcherLayout.addButton, visible: false } } }));
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
          </div>
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
