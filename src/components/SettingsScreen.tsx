import {
  ArrowLeft,
  Bookmark as BookmarkIcon,
  ChevronDown,
  Code2,
  Database,
  Info,
  Languages,
  LayoutDashboard,
  Palette,
  Search,
  SunMoon,
  TextCursorInput,
  Type,
  WandSparkles,
  Wallpaper as WallpaperIcon,
  X,
  Grip,
  FlaskConical,
  Newspaper,
  Globe2,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { ComponentType } from "react";
import AnimationSection from "./settings/AnimationSection";
import { AboutSection, AppearanceSection, BookmarksSection, SearchSection } from "./settings/BasicSections";
import BackupSection from "./settings/BackupSection";
import { FaviconSection, NewsSection } from "./settings/LauncherSections";
import DeveloperSection from "./settings/DeveloperSection";
import UserscriptsSection from "./settings/UserscriptsSection";
import FontsSection from "./settings/FontsSection";
import HomeSection from "./settings/HomeSection";
import LanguageSection from "./settings/LanguageSection";
import SearchBoxSection from "./settings/SearchBoxSection";
import ThemesSection from "./settings/ThemesSection";
import WallpaperSection from "./settings/WallpaperSection";
import { useI18n } from "../lib/i18n";
import { AppMenuSection } from "./settings/AppMenuSection";
import type { SettingsSection } from "../lib/settings";
import { cn } from "../utils/cn";

const SECTIONS: { id: SettingsSection; icon: LucideIcon; content: ComponentType }[] = [
  { id: "search", icon: Search, content: SearchSection },
  { id: "searchbox", icon: TextCursorInput, content: SearchBoxSection },
  { id: "animation", icon: WandSparkles, content: AnimationSection },
  { id: "home", icon: LayoutDashboard, content: HomeSection },
  { id: "news", icon: Newspaper, content: NewsSection },
  { id: "favicon", icon: Globe2, content: FaviconSection },
  { id: "appmenu", icon: Grip, content: AppMenuSection },
  { id: "appearance", icon: SunMoon, content: AppearanceSection },
  { id: "themes", icon: Palette, content: ThemesSection },
  { id: "wallpaper", icon: WallpaperIcon, content: WallpaperSection },
  { id: "fonts", icon: Type, content: FontsSection },
  { id: "language", icon: Languages, content: LanguageSection },
  { id: "bookmarks", icon: BookmarkIcon, content: BookmarksSection },
  { id: "backup", icon: Database, content: BackupSection },
  { id: "developer", icon: FlaskConical, content: DeveloperSection },
  { id: "scripts", icon: Code2, content: UserscriptsSection },
  { id: "about", icon: Info, content: AboutSection },
];

type Props = {
  activeSection: SettingsSection;
  setActiveSection: (section: SettingsSection) => void;
  onClose: () => void;
};

/** Full-screen settings with a desktop sidebar and an ergonomic sticky mobile navigation bar + section sheet. */
export default function SettingsScreen({ activeSection, setActiveSection, onClose }: Props) {
  const { t, lang } = useI18n();
  const isRu = lang.startsWith("ru");
  const screen = useRef<HTMLDivElement>(null);
  const main = useRef<HTMLElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const current = SECTIONS.find((section) => section.id === activeSection) ?? SECTIONS[0];
  const CurrentIcon = current.icon;
  const Content = current.content;

  useEffect(() => {
    main.current?.scrollTo({ top: 0 });
    screen.current?.scrollTo({ top: 0 });
    // Center the active section pill in the mobile horizontal nav strip.
    const activeBtn = navRef.current?.querySelector<HTMLElement>('[aria-current="page"]');
    activeBtn?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [activeSection]);

  return (
    <div ref={screen} className="settings-enter fixed inset-0 z-[80] overflow-y-auto md:overflow-hidden">
      <div className="flex min-h-full flex-col md:h-full md:flex-row">
        <aside className="sticky top-0 z-30 flex shrink-0 flex-col border-b border-[var(--line)] bg-[var(--sidebar)]/92 px-3.5 pb-2.5 pt-3 backdrop-blur-xl md:static md:h-full md:w-[280px] md:overflow-y-auto md:border-b-0 md:border-e md:bg-[var(--sidebar)] md:px-5 md:py-7 md:backdrop-blur-none">
          <div className="flex items-center gap-2.5 px-1 md:gap-3 md:px-2">
            <div className="type-display flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-[var(--primary)] text-base font-black text-[var(--on-primary)] md:h-11 md:w-11 md:rounded-[15px] md:text-lg">
              L
            </div>
            <div className="min-w-0 flex-1">
              <div className="type-display truncate text-sm font-semibold md:text-base">
                <span className="md:hidden">{t(`sec.${activeSection}`)}</span>
                <span className="hidden md:inline">LisYan</span>
              </div>
              <div className="truncate text-xs text-[var(--muted)] md:text-sm">{t("settings.title")}</div>
            </div>

            {/* Mobile quick section picker sheet toggle */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              aria-expanded={mobileMenuOpen}
              className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-[var(--surface-container-high)] px-3.5 text-xs font-semibold text-[var(--fg)] transition active:scale-95 md:hidden"
            >
              <CurrentIcon size={15} aria-hidden="true" />
              <span>{isRu ? "Разделы" : "Sections"}</span>
              <ChevronDown size={14} className={cn("transition-transform duration-200", mobileMenuOpen && "rotate-180")} aria-hidden="true" />
            </button>

            <button
              type="button"
              onClick={onClose}
              title={t("settings.close")}
              aria-label={t("settings.close")}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--surface-container-high)] transition hover:bg-[var(--surface-container-highest)] active:scale-95 md:hidden"
            >
              <X size={19} aria-hidden="true" />
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="mt-6 hidden h-11 items-center gap-2 rounded-xl px-3 text-sm text-[var(--muted)] transition hover:bg-[var(--surface-container-high)] hover:text-[var(--fg)] md:flex"
          >
            <ArrowLeft size={18} className="rtl:rotate-180" aria-hidden="true" />
            {t("settings.back")}
          </button>

          <nav
            ref={navRef}
            aria-label={t("settings.nav")}
            className="mt-2.5 flex gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:mt-6 md:flex-col md:gap-2 md:overflow-visible md:pb-1"
          >
            {SECTIONS.map(({ id, icon: Icon }) => {
              const active = activeSection === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    setActiveSection(id);
                    setMobileMenuOpen(false);
                  }}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex shrink-0 items-center gap-2 rounded-full px-3.5 py-2 text-start text-xs font-medium transition md:w-full md:gap-3 md:rounded-xl md:px-3 md:py-2.5 md:text-sm",
                    active
                      ? "bg-[var(--primary)] font-semibold text-[var(--on-primary)] shadow-sm md:bg-[var(--surface)] md:text-[var(--fg)]"
                      : "bg-[var(--surface-container)] text-[var(--muted)] hover:bg-[var(--surface-container-high)] hover:text-[var(--fg)] md:bg-transparent",
                  )}
                >
                  <Icon size={17} strokeWidth={1.9} className="md:h-[19px] md:w-[19px]" aria-hidden="true" />
                  {t(`sec.${id}`)}
                </button>
              );
            })}
          </nav>

          <div className="mt-auto hidden pt-8 text-xs text-[var(--muted)] md:block">LisYan</div>
        </aside>

        {/* Mobile all-sections bottom sheet for one-tap navigation */}
        {mobileMenuOpen && (
          <div
            className="fixed inset-0 z-40 flex flex-col justify-end bg-black/50 backdrop-blur-sm md:hidden"
            onClick={() => setMobileMenuOpen(false)}
          >
            <div
              className="max-h-[82dvh] overflow-y-auto rounded-t-[28px] border-t border-[var(--line)] bg-[var(--sidebar)] p-4 pb-8 shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mx-auto mb-3 h-1.5 w-11 rounded-full bg-[var(--outline)]/40" />
              <div className="mb-3 flex items-center justify-between px-1">
                <span className="type-display text-base font-bold">{t("settings.title")}</span>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--surface-container-high)] text-[var(--muted)]"
                  aria-label={t("settings.close")}
                >
                  <X size={16} aria-hidden="true" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {SECTIONS.map(({ id, icon: Icon }) => {
                  const active = activeSection === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => {
                        setActiveSection(id);
                        setMobileMenuOpen(false);
                      }}
                      className={cn(
                        "flex items-center gap-2.5 rounded-2xl p-3 text-start transition active:scale-[0.98]",
                        active
                          ? "bg-[var(--primary-container)] font-semibold text-[var(--on-primary-container)]"
                          : "bg-[var(--surface)] text-[var(--fg)] hover:bg-[var(--surface-container-high)]",
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                          active ? "bg-[var(--primary)] text-[var(--on-primary)]" : "bg-[var(--surface-container-high)] text-[var(--muted)]",
                        )}
                      >
                        <Icon size={18} strokeWidth={1.9} aria-hidden="true" />
                      </span>
                      <span className="min-w-0 flex-1 line-clamp-2 text-xs font-medium leading-tight">{t(`sec.${id}`)}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        <main ref={main} className="min-w-0 flex-1 md:overflow-y-auto">
          <div className="mx-auto max-w-4xl px-4 pb-16 pt-5 sm:px-8 md:px-12 md:pb-16 md:pt-12">
            <header className="mb-5 flex items-start justify-between gap-4 md:mb-9">
              <div>
                <p className="mb-1 hidden text-sm text-[var(--muted)] md:block">{t("settings.title")}</p>
                <h1 className="type-display text-2xl font-bold sm:text-3xl md:text-4xl">{t(`sec.${activeSection}`)}</h1>
                <p className="mt-1 text-xs leading-relaxed text-[var(--muted)] sm:mt-2 sm:text-base">{t(`sec.${activeSection}.d`)}</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="hidden h-11 shrink-0 items-center gap-2 rounded-full bg-[var(--surface-container-high)] px-5 text-sm font-medium transition hover:bg-[var(--surface-container-highest)] md:flex"
              >
                {t("settings.done")}
              </button>
            </header>
            <Content />
          </div>
        </main>
      </div>
    </div>
  );
}
