import {
  ArrowLeft,
  Bookmark as BookmarkIcon,
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
  type LucideIcon,
} from "lucide-react";
import { useEffect, useRef } from "react";
import type { ComponentType } from "react";
import AnimationSection from "./settings/AnimationSection";
import { AboutSection, AppearanceSection, BookmarksSection, SearchSection } from "./settings/BasicSections";
import BackupSection from "./settings/BackupSection";
import BetterBarSection from "./settings/BetterBarSection";
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
  { id: "betterbar", icon: Search, content: BetterBarSection },
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

/** Full-screen settings with an Apple-style sidebar. */
export default function SettingsScreen({ activeSection, setActiveSection, onClose }: Props) {
  const { t } = useI18n();
  const screen = useRef<HTMLDivElement>(null);
  const main = useRef<HTMLElement>(null);
  const current = SECTIONS.find((section) => section.id === activeSection) ?? SECTIONS[0];
  const Content = current.content;

  useEffect(() => {
    main.current?.scrollTo({ top: 0 });
    screen.current?.scrollTo({ top: 0 });
  }, [activeSection]);

  return (
    <div ref={screen} className="settings-enter fixed inset-0 z-[80] overflow-y-auto md:overflow-hidden">
      <div className="flex min-h-full flex-col md:h-full md:flex-row">
        <aside className="flex shrink-0 flex-col bg-[var(--sidebar)] px-4 py-5 md:h-full md:w-[280px] md:overflow-y-auto md:border-e md:border-[var(--line)] md:px-5 md:py-7">
          <div className="flex items-center gap-3 px-2">
            <div className="type-display flex h-11 w-11 items-center justify-center rounded-[15px] bg-[var(--primary)] text-lg font-black text-[var(--on-primary)]">
              L
            </div>
            <div className="min-w-0">
              <div className="type-display font-semibold">LisYan</div>
              <div className="text-sm text-[var(--muted)]">{t("settings.title")}</div>
            </div>
            <button
              type="button"
              onClick={onClose}
              title={t("settings.close")}
              aria-label={t("settings.close")}
              className="ms-auto flex h-10 w-10 items-center justify-center rounded-full transition hover:bg-[var(--surface-container-high)] md:hidden"
            >
              <X size={20} aria-hidden="true" />
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

          <nav aria-label={t("settings.nav")} className="mt-5 flex gap-2 overflow-x-auto pb-1 md:mt-6 md:flex-col md:overflow-visible">
            {SECTIONS.map(({ id, icon: Icon }) => {
              const active = activeSection === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setActiveSection(id)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-start text-sm transition md:w-full",
                    active ? "bg-[var(--surface)] font-semibold shadow-sm" : "text-[var(--muted)] hover:bg-[var(--surface-container-high)] hover:text-[var(--fg)]",
                  )}
                >
                  <Icon size={19} strokeWidth={1.9} aria-hidden="true" />
                  {t(`sec.${id}`)}
                </button>
              );
            })}
          </nav>

          <div className="mt-auto hidden pt-8 text-xs text-[var(--muted)] md:block">LisYan better search</div>
        </aside>

        <main ref={main} className="min-w-0 flex-1 md:overflow-y-auto">
          <div className="mx-auto max-w-4xl px-5 pb-12 pt-8 sm:px-8 md:px-12 md:pb-16 md:pt-12">
            <header className="mb-9 flex items-start justify-between gap-5">
              <div>
                <p className="mb-2 text-sm text-[var(--muted)]">{t("settings.title")}</p>
                <h1 className="type-display text-3xl font-bold sm:text-4xl">{t(`sec.${activeSection}`)}</h1>
                <p className="mt-2 text-sm text-[var(--muted)] sm:text-base">{t(`sec.${activeSection}.d`)}</p>
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
