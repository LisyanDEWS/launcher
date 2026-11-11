import {
  ArrowUpLeft,
  Check,
  Copy,
  FolderOpen,
  History,
  Image as ImageIcon,
  Landmark,
  Mail,
  MessageCircle,
  Mic,
  MicOff,
  Paperclip,
  Pencil,
  Plus,
  Search,
  Send,
  Share2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, FormEvent, KeyboardEvent as ReactKeyboardEvent } from "react";
import { BookmarkIcon } from "./BookmarkIcon";
import { useI18n, type MessageKey } from "../lib/i18n";
import { getSearchRecommendations, rememberSearchQuery } from "../lib/news";
import { recentVisitedSites, visitLabel, type VisitedSite } from "../lib/browser-history";
import SiteIcon from "./SiteIcon";
import { copyText, openLink, shareChannels, shareTarget, systemShare, systemShareAvailable } from "../lib/share";
import type { Bookmark, BookmarkShape } from "../lib/settings";
import { cn } from "../utils/cn";

export type OverlaySuggestionGroup = {
  label: string;
  kind: "history" | "popular" | "similar";
  items: string[];
};

type Props = {
  open: boolean;
  fromY: number;
  query: string;
  onQueryChange: (value: string) => void;
  onSubmit: (query: string) => void;
  onClose: () => void;
  placeholder: string;
  attachment: File | null;
  attachError: string | null;
  onAttach: (file: File | null) => void;
  onGallery: (file: File) => void;
  onVoice: (transcript: string) => void;
  bookmarks: Bookmark[];
  bookmarkShape: BookmarkShape;
  history: string[];
  aiHistory: string[];
  suggestionGroups: OverlaySuggestionGroup[];
  onSelectSuggestion: (item: string, isAi?: boolean) => void;
  /** Shows a short confirmation (toast) in the host app. */
  onNotify: (text: string) => void;
  launcherTitle: string;
  incognitoOn: boolean;
  cacheDays?: number;
  onOpenVisited: (url: string) => void;
};

/** Crisp Google Lens viewfinder icon matching the omnibox action icon. */
function LensIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14.5 4h-5L7 6.5H5A2.5 2.5 0 0 0 2.5 9v9A2.5 2.5 0 0 0 5 20.5h7" />
      <path d="M19 13v-4a2.5 2.5 0 0 0-2.5-2.5H17" />
      <circle cx="12" cy="13" r="3.2" />
      <circle cx="18.2" cy="18.2" r="2.2" fill="currentColor" stroke="none" />
    </svg>
  );
}

export default function SearchOverlay({
  open,
  fromY,
  query,
  onQueryChange,
  onSubmit,
  onClose,
  placeholder,
  attachment,
  attachError,
  onAttach,
  onGallery,
  onVoice,
  bookmarks,
  bookmarkShape,
  history,
  aiHistory,
  suggestionGroups,
  onSelectSuggestion,
  onNotify,
  launcherTitle,
  incognitoOn,
  cacheDays = 5,
  onOpenVisited,
}: Props) {
  const { t, lang } = useI18n();
  const isRu = lang.startsWith("ru");
  const [mounted, setMounted] = useState(open);
  const [closing, setClosing] = useState(false);
  const [plusOpen, setPlusOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const shareWrap = useRef<HTMLDivElement>(null);
  const [listening, setListening] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [interestRevision, setInterestRevision] = useState(0);
  const [visitedSites, setVisitedSites] = useState<VisitedSite[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);
  const filePicker = useRef<HTMLInputElement>(null);
  const imagePicker = useRef<HTMLInputElement>(null);
  const plusWrap = useRef<HTMLDivElement>(null);
  const recognition = useRef<SpeechRecognition | null>(null);

  // What is shared is a real public link: inside the extension the page address is chrome-extension://…,
  // which nobody else can open, so the project link is used instead.
  const target = useMemo(() => shareTarget(launcherTitle, isRu), [launcherTitle, isRu]);
  const canSystemShare = useMemo(() => systemShareAvailable(target), [target]);
  const channels = useMemo(() => shareChannels(target, isRu), [target, isRu]);
  const launcherUrl = target.url;

  const speechSupported =
    typeof window !== "undefined" && ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  useEffect(() => {
    if (open) {
      setMounted(true);
      setClosing(false);
      setActiveIndex(-1);
      const id = window.requestAnimationFrame(() => {
        inputRef.current?.focus({ preventScroll: true });
      });
      return () => window.cancelAnimationFrame(id);
    }
    if (mounted) {
      setClosing(true);
      setPlusOpen(false);
      recognition.current?.stop();
      const timer = window.setTimeout(() => {
        setMounted(false);
        setClosing(false);
      }, 250);
      return () => window.clearTimeout(timer);
    }
  }, [open, mounted]);

  useEffect(() => () => recognition.current?.stop(), []);

  // Close the "+" menu on outside click.
  useEffect(() => {
    if (!plusOpen) return;
    const onDown = (event: PointerEvent) => {
      if (!plusWrap.current?.contains(event.target as Node)) setPlusOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [plusOpen]);

  // Close the share menu on an outside click.
  useEffect(() => {
    if (!shareOpen) return;
    const onDown = (event: PointerEvent) => {
      if (!shareWrap.current?.contains(event.target as Node)) setShareOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [shareOpen]);

  useEffect(() => {
    if (!open) setShareOpen(false);
  }, [open]);

  const doCopy = useCallback(async () => {
    const ok = await copyText(launcherUrl);
    setCopied(ok);
    onNotify(ok ? (isRu ? "Ссылка скопирована" : "Link copied") : isRu ? "Не удалось скопировать ссылку" : "Could not copy the link");
    if (ok) window.setTimeout(() => setCopied(false), 1800);
    return ok;
  }, [launcherUrl, isRu, onNotify]);

  const doSystemShare = useCallback(async () => {
    setShareOpen(false);
    const result = await systemShare(target);
    // The share sheet can refuse (no user activation, blocked by policy): copying is the honest fallback.
    if (result === "failed") await doCopy();
  }, [target, doCopy]);

  // Recent websites come from chrome.history in the installed extension (history permission).
  // The page version simply has no browser-history access and hides this group.
  useEffect(() => {
    if (!open || incognitoOn) {
      setVisitedSites([]);
      return;
    }
    let alive = true;
    const timer = window.setTimeout(() => {
      void recentVisitedSites(query.trim(), 8).then((sites) => {
        if (alive) setVisitedSites(sites);
      });
    }, 90);
    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
  }, [open, query, incognitoOn, cacheDays]);

  // Search terms and liked news update the same local interest profile.
  useEffect(() => {
    const update = () => setInterestRevision((n) => n + 1);
    window.addEventListener("lisyan:interests-updated", update);
    return () => window.removeEventListener("lisyan:interests-updated", update);
  }, []);

  // Lock body scroll while the search overlay is open.
  useEffect(() => {
    if (!mounted) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mounted]);

  const toggleVoice = useCallback(() => {
    if (!speechSupported) {
      window.alert(t("better.voiceUnsupported" as MessageKey));
      return;
    }
    if (listening) {
      recognition.current?.stop();
      return;
    }
    const holder = window as unknown as {
      SpeechRecognition?: typeof SpeechRecognition;
      webkitSpeechRecognition?: typeof SpeechRecognition;
    };
    const Ctor = holder.SpeechRecognition ?? holder.webkitSpeechRecognition;
    if (!Ctor) return;
    const engine = new Ctor();
    engine.lang = isRu ? "ru-RU" : "en-US";
    engine.interimResults = true;
    engine.continuous = false;
    engine.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0].transcript)
        .join(" ");
      onQueryChange(transcript);
      onVoice(transcript);
    };
    engine.onerror = () => setListening(false);
    engine.onend = () => setListening(false);
    recognition.current = engine;
    setListening(true);
    engine.start();
  }, [listening, speechSupported, isRu, onQueryChange, onVoice, t]);

  const preview = useMemo(() => {
    if (!attachment || !attachment.type.startsWith("image/")) return null;
    return URL.createObjectURL(attachment);
  }, [attachment]);

  const aiSet = useMemo(() => new Set(aiHistory.map((item) => item.toLocaleLowerCase())), [aiHistory]);

  const personalizedSearches = useMemo(
    () => getSearchRecommendations(isRu ? "ru" : "en"),
    [isRu, interestRevision],
  );

  const trendingSearches = useMemo(() => (isRu
    ? [
        "GTA 6 дата выхода",
        "iPhone новости",
        "Android обновления",
        "ChatGPT и нейросети",
        "Nothing Phone новости",
        "SpaceX Starship запуск",
        "Технологии и ИИ",
        "Новости науки",
      ]
    : [
        "GTA 6 release date",
        "iPhone news",
        "Android updates",
        "ChatGPT AI updates",
        "Nothing Phone news",
        "SpaceX Starship flight",
        "Latest technology news",
        "Science news",
      ]), [isRu]);

  // Empty search shows recent history plus recommendations derived from this user's own searches
  // and liked news. While typing, the learned topics stay visible alongside autocomplete.
  const displayGroups = useMemo<OverlaySuggestionGroup[]>(() => {
    if (incognitoOn) return [];
    const term = query.trim();
    if (term) {
      const base = suggestionGroups;
      const used = new Set(base.flatMap((g) => g.items).map((item) => item.toLocaleLowerCase()));
      const matches = personalizedSearches
        .filter((item) => item.toLocaleLowerCase() !== term.toLocaleLowerCase() && !used.has(item.toLocaleLowerCase()))
        .slice(0, 3);
      if (base.length) {
        return matches.length
          ? [...base, { label: isRu ? "Рекомендации для вас" : "Recommended for you", kind: "popular", items: matches }]
          : base;
      }
      const recent = history.filter((item) => item.toLocaleLowerCase().includes(term.toLocaleLowerCase())).slice(0, 4);
      const completions = [
        term,
        `${term} ${isRu ? "новости" : "news"}`,
        `${term} ${isRu ? "официальный сайт" : "official site"}`,
        `${term} ${isRu ? "обзор" : "review"}`,
      ];
      const groups: OverlaySuggestionGroup[] = [];
      if (recent.length) groups.push({ label: t("suggest.recent"), kind: "history", items: recent });
      if (matches.length) groups.push({ label: isRu ? "Рекомендации для вас" : "Recommended for you", kind: "popular", items: matches });
      const usedCompletions = new Set([...recent, ...matches].map((item) => item.toLocaleLowerCase()));
      groups.push({ label: isRu ? "Похожие запросы" : "Similar searches", kind: "popular", items: completions.filter((item) => !usedCompletions.has(item.toLocaleLowerCase())).slice(0, 5) });
      return groups;
    }

    const groups: OverlaySuggestionGroup[] = [];
    if (history.length) groups.push({ label: t("suggest.recent"), kind: "history", items: history.slice(0, 8) });
    const personalized = personalizedSearches.filter((item) => !history.some((entry) => entry.toLocaleLowerCase() === item.toLocaleLowerCase()));
    const source = personalized.length ? personalized : trendingSearches;
    groups.push({
      label: personalized.length ? (isRu ? "Рекомендации для вас" : "Recommended for you") : (isRu ? "Популярные запросы" : "Trending searches"),
      kind: "popular",
      items: source.filter((item) => !history.some((entry) => entry.toLocaleLowerCase() === item.toLocaleLowerCase())).slice(0, history.length ? 5 : 8),
    });
    return groups;
  }, [incognitoOn, query, suggestionGroups, history, personalizedSearches, trendingSearches, isRu, t]);

  const flatItems = useMemo(() => displayGroups.flatMap((g) => g.items), [displayGroups]);

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      if (plusOpen) setPlusOpen(false);
      else if (shareOpen) setShareOpen(false);
      else onClose();
      return;
    }
    if (!flatItems.length) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((prev) => (prev + 1) % flatItems.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((prev) => (prev <= 0 ? flatItems.length - 1 : prev - 1));
    } else if (event.key === "Enter" && activeIndex >= 0 && flatItems[activeIndex]) {
      event.preventDefault();
      const picked = flatItems[activeIndex];
      onSelectSuggestion(picked, aiSet.has(picked.toLocaleLowerCase()));
    }
  };

  const handleFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit(query);
  };

  if (!mounted) return null;

  return (
    <div
      className={cn("search-overlay fixed inset-0 z-[75] flex flex-col overflow-y-auto", closing && "is-closing")}
      style={{ "--search-from-y": `${Math.max(0, Math.min(420, Math.round(fromY)))}px` } as CSSProperties}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="mx-auto flex w-full max-w-[680px] flex-1 flex-col gap-3 px-3 pb-10 pt-3 sm:px-5 sm:pt-5"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) onClose();
        }}
      >
        {/* Top omnibox search bar — glides to the top with NO AI button */}
        <form onSubmit={handleFormSubmit} role="search" className="search-overlay-bar relative z-20">
          <div className="flex h-14 w-full items-center gap-2 rounded-full border border-[color-mix(in_srgb,var(--outline)_22%,transparent)] bg-[var(--surface-container-high)] px-2.5 shadow-[0_12px_36px_rgba(0,0,0,0.28)]">
            {/* "+" attachment button on the left */}
            <div className="sb-plus-wrap" ref={plusWrap}>
              <button
                type="button"
                onClick={() => setPlusOpen((v) => !v)}
                aria-expanded={plusOpen}
                aria-haspopup="menu"
                title={t("better.add" as MessageKey)}
                aria-label={t("better.add" as MessageKey)}
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[var(--fg)]/80 transition hover:bg-[var(--surface-container-highest)] hover:text-[var(--fg)]",
                  plusOpen && "bg-[var(--primary)] text-[var(--on-primary)]",
                )}
              >
                <Plus size={21} className={cn("transition-transform duration-300", plusOpen && "rotate-45")} />
              </button>

              {plusOpen && (
                <div role="menu" className="sb-plus-menu">
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setPlusOpen(false);
                      filePicker.current?.click();
                    }}
                  >
                    <FolderOpen size={16} aria-hidden="true" />
                    {t("better.files" as MessageKey)}
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setPlusOpen(false);
                      imagePicker.current?.click();
                    }}
                  >
                    <ImageIcon size={16} aria-hidden="true" />
                    {t("better.gallery" as MessageKey)}
                  </button>
                </div>
              )}
            </div>

            {attachment && (
              <span className="sb-attach-chip" title={attachment.name}>
                {preview ? <img src={preview} alt="" className="sb-attach-thumb" /> : <Paperclip size={14} aria-hidden="true" />}
                <span className="sb-attach-name">{attachment.name}</span>
                <button
                  type="button"
                  onClick={() => onAttach(null)}
                  className="sb-attach-x"
                  aria-label={isRu ? "Убрать вложение" : "Remove attachment"}
                >
                  <X size={12} aria-hidden="true" />
                </button>
              </span>
            )}

            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(event) => {
                onQueryChange(event.target.value);
                setActiveIndex(-1);
              }}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              aria-label={placeholder}
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              className="h-full min-w-0 flex-1 bg-transparent px-1 text-[16.5px] text-[var(--fg)] outline-none placeholder:text-[var(--muted)]"
            />

            {query && (
              <button
                type="button"
                onClick={() => {
                  onQueryChange("");
                  setActiveIndex(-1);
                  inputRef.current?.focus();
                }}
                aria-label={isRu ? "Очистить" : "Clear"}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--muted)] transition hover:bg-[var(--surface-container-highest)] hover:text-[var(--fg)]"
              >
                <X size={18} aria-hidden="true" />
              </button>
            )}

            {/* Voice input button */}
            <button
              type="button"
              onClick={toggleVoice}
              aria-pressed={listening}
              title={t("better.voice" as MessageKey)}
              aria-label={t("better.voice" as MessageKey)}
              className={cn(
                "relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[var(--fg)]/80 transition hover:bg-[var(--surface-container-highest)] hover:text-[var(--fg)]",
                listening && "bg-[var(--primary)] text-[var(--on-primary)]",
              )}
            >
              {listening ? <MicOff size={19} /> : <Mic size={19} />}
              {listening && <span className="sb-pulse" aria-hidden="true" />}
            </button>

            {/* Google Lens / camera button (no AI button in the top bar) */}
            <button
              type="button"
              onClick={() => imagePicker.current?.click()}
              title={isRu ? "Поиск по картинке (Google Lens)" : "Search by image (Google Lens)"}
              aria-label={isRu ? "Поиск по картинке (Google Lens)" : "Search by image (Google Lens)"}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[var(--fg)]/80 transition hover:bg-[var(--surface-container-highest)] hover:text-[var(--fg)]"
            >
              <LensIcon size={20} />
            </button>

            <input
              ref={filePicker}
              type="file"
              accept="image/*,.pdf,.txt,.doc,.docx,.csv,.json,.zip"
              className="hidden"
              aria-hidden="true"
              tabIndex={-1}
              onChange={(event) => {
                const file = event.currentTarget.files?.[0] ?? null;
                onAttach(file);
                event.currentTarget.value = "";
              }}
            />
            <input
              ref={imagePicker}
              type="file"
              accept="image/*"
              className="hidden"
              aria-hidden="true"
              tabIndex={-1}
              onChange={(event) => {
                const file = event.currentTarget.files?.[0];
                if (file) onGallery(file);
                event.currentTarget.value = "";
              }}
            />
          </div>
          {attachError && (
            <span role="alert" className="sb-attach-error">
              {attachError}
            </span>
          )}
        </form>

        {/* Current page / Launcher row (Share, Copy, Edit) */}
        <div className="search-overlay-item search-overlay-item--1 relative z-30 flex items-center gap-3.5 rounded-[22px] border border-[color-mix(in_srgb,var(--outline)_14%,transparent)] bg-[var(--surface-container-high)] px-4 py-3 shadow-sm">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--fg)]/85">
            <Landmark size={20} strokeWidth={1.9} aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[15px] font-medium leading-tight text-[var(--fg)]">{launcherTitle}</div>
            <div className="mt-0.5 truncate text-xs text-[var(--muted)]">{launcherUrl}</div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <div className="relative" ref={shareWrap}>
              <button
                type="button"
                onClick={() => setShareOpen((v) => !v)}
                aria-expanded={shareOpen}
                aria-haspopup="menu"
                title={isRu ? "Поделиться" : "Share"}
                aria-label={isRu ? "Поделиться" : "Share"}
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-full text-[var(--fg)]/80 transition hover:bg-[var(--surface-container-highest)] hover:text-[var(--fg)]",
                  shareOpen && "bg-[var(--primary)] text-[var(--on-primary)] hover:bg-[var(--primary)] hover:text-[var(--on-primary)]",
                )}
              >
                <Share2 size={18} strokeWidth={1.9} aria-hidden="true" />
              </button>

              {shareOpen && (
                <div role="menu" aria-label={isRu ? "Поделиться" : "Share"} className="share-menu">
                  <div className="share-menu-link" title={launcherUrl}>
                    <span className="truncate">{launcherUrl.replace(/^https?:\/\//, "")}</span>
                  </div>
                  {canSystemShare && (
                    <button type="button" role="menuitem" onClick={() => void doSystemShare()}>
                      <Share2 size={17} aria-hidden="true" />
                      {isRu ? "Системное меню…" : "System share…"}
                    </button>
                  )}
                  <button type="button" role="menuitem" onClick={() => void doCopy()}>
                    {copied ? <Check size={17} aria-hidden="true" /> : <Copy size={17} aria-hidden="true" />}
                    {copied ? (isRu ? "Скопировано" : "Copied") : isRu ? "Копировать ссылку" : "Copy link"}
                  </button>
                  {channels.map((channel) => (
                    <button
                      key={channel.id}
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setShareOpen(false);
                        openLink(channel.href);
                      }}
                    >
                      {channel.id === "telegram" ? (
                        <Send size={17} aria-hidden="true" />
                      ) : channel.id === "whatsapp" ? (
                        <MessageCircle size={17} aria-hidden="true" />
                      ) : channel.id === "email" ? (
                        <Mail size={17} aria-hidden="true" />
                      ) : (
                        <span className="grid h-[17px] w-[17px] place-items-center text-[15px] font-black leading-none" aria-hidden="true">
                          𝕏
                        </span>
                      )}
                      {channel.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => void doCopy()}
              title={isRu ? "Копировать ссылку" : "Copy link"}
              aria-label={isRu ? "Копировать ссылку" : "Copy link"}
              className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--fg)]/80 transition hover:bg-[var(--surface-container-highest)] hover:text-[var(--fg)]"
            >
              {copied ? <Check size={18} strokeWidth={2.2} aria-hidden="true" /> : <Copy size={18} strokeWidth={1.9} aria-hidden="true" />}
            </button>
            <button
              type="button"
              onClick={() => {
                onQueryChange(launcherUrl);
                inputRef.current?.focus();
                window.requestAnimationFrame(() => inputRef.current?.select());
              }}
              title={isRu ? "Изменить адрес" : "Edit address"}
              aria-label={isRu ? "Изменить адрес" : "Edit address"}
              className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--fg)]/80 transition hover:bg-[var(--surface-container-highest)] hover:text-[var(--fg)]"
            >
              <Pencil size={18} strokeWidth={1.9} aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Horizontal bookmarks strip */}
        {bookmarks.length > 0 && (
          <div className="search-overlay-item search-overlay-item--2 flex items-start gap-3 overflow-x-auto px-1 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {bookmarks.map((bookmark) => (
              <a
                key={bookmark.id}
                href={bookmark.url}
                onClick={() => onClose()}
                className="group flex w-[74px] shrink-0 flex-col items-center gap-2 rounded-2xl py-1 transition"
              >
                <BookmarkIcon
                  bookmark={bookmark}
                  size={56}
                  fallbackShape={bookmarkShape}
                  className="bg-[var(--surface-container-high)] transition-transform duration-200 group-hover:scale-105 group-active:scale-95"
                />
                <span dir="auto" className="w-full truncate text-center text-xs text-[var(--muted)] transition group-hover:text-[var(--fg)]">
                  {bookmark.title}
                </span>
              </a>
            ))}
          </div>
        )}

        {/* Sites from this browser's real visit history (extension only). */}
        {visitedSites.length > 0 && !incognitoOn && (
          <div className="search-overlay-item search-overlay-item--3 space-y-2">
            <div className="px-2 pb-1 pt-1 text-[13px] font-medium text-[var(--muted)]">
              {isRu ? "Недавно посещали" : "Recently visited"}
            </div>
            <div className="overflow-hidden rounded-[24px] border border-[color-mix(in_srgb,var(--outline)_14%,transparent)] bg-[var(--surface-container-high)] divide-y divide-[var(--line)] shadow-sm">
              {visitedSites.map((site) => (
                <button
                  key={site.id}
                  type="button"
                  onClick={() => {
                    rememberSearchQuery(site.host);
                    onOpenVisited(site.url);
                  }}
                  className="flex min-h-[58px] w-full items-center gap-3 px-4 py-2.5 text-start transition hover:bg-[var(--surface-container-highest)]"
                >
                  <SiteIcon url={site.url} size={36} cacheDays={cacheDays} style="original" className="rounded-[10px] bg-[var(--surface-container-highest)]" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14.5px] font-medium text-[var(--fg)]">{site.title}</span>
                    <span className="mt-0.5 flex items-center gap-1.5 truncate text-[11px] text-[var(--muted)]">
                      <span className="truncate">{site.host}</span>
                      <span aria-hidden="true">·</span>
                      <span className="shrink-0">{visitLabel(site.lastVisitTime, isRu ? "ru" : "en")}</span>
                    </span>
                  </span>
                  <ArrowUpLeft size={17} className="shrink-0 text-[var(--muted)] rtl:-scale-x-100" aria-hidden="true" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Recent searches & suggestions list */}
        {displayGroups.length > 0 && (
          <div className="search-overlay-item search-overlay-item--4 space-y-3">
            {displayGroups.map((group) => (
              <div key={group.label}>
                <div className="px-2 pb-2 pt-1 text-[13px] font-medium text-[var(--muted)]">{group.label}</div>
                <div
                  role="listbox"
                  aria-label={group.label}
                  className="overflow-hidden rounded-[26px] border border-[color-mix(in_srgb,var(--outline)_14%,transparent)] bg-[var(--surface-container-high)] divide-y divide-[var(--line)] shadow-sm"
                >
                  {group.items.map((item) => {
                    const idx = flatItems.indexOf(item);
                    const active = activeIndex === idx;
                    const isHistory = group.kind === "history";
                    const isAi = isHistory && aiSet.has(item.toLocaleLowerCase());
                    const ItemIcon = isHistory ? History : Search;
                    return (
                      <div
                        key={`${group.kind}-${item}`}
                        role="option"
                        aria-selected={active}
                        className={cn(
                          "flex min-h-[56px] w-full items-center gap-3.5 px-4 py-2.5 transition",
                          active ? "bg-[var(--surface-container-highest)]" : "hover:bg-[var(--surface-container-highest)]/70",
                        )}
                      >
                        <button
                          type="button"
                          onClick={() => onSelectSuggestion(item, isAi)}
                          className="flex min-w-0 flex-1 items-center gap-4 text-start"
                        >
                          <ItemIcon size={20} className="shrink-0 text-[var(--muted)]" aria-hidden="true" />
                          <span className="min-w-0 flex-1">
                            <span dir="auto" className="block line-clamp-2 text-[15.5px] leading-snug text-[var(--fg)]">
                              {item}
                            </span>
                            {isAi && (
                              <span className="mt-0.5 block text-xs text-[var(--muted)]">
                                {isRu ? "Режим ИИ" : "AI Mode"}
                              </span>
                            )}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            onQueryChange(item);
                            inputRef.current?.focus();
                          }}
                          title={isRu ? "Подставить в строку поиска" : "Fill into search bar"}
                          aria-label={isRu ? "Подставить в строку поиска" : "Fill into search bar"}
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--muted)] transition hover:bg-[var(--surface-container)] hover:text-[var(--fg)]"
                        >
                          <ArrowUpLeft size={19} className="rtl:-scale-x-100" aria-hidden="true" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
