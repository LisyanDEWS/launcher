import { History, Monitor, Moon, Plus, Sun, Trash2, Wallpaper as WallpaperIcon } from "lucide-react";
import { useSettingsCtx } from "./context";
import LogoStudio from "./LogoStudio";
import LoadingIndicator from "../LoadingIndicator";
import { BUTTON, BUTTON_PRIMARY, CARD, ChoiceList, SettingsGroup, ToggleRow } from "../ui";
import { useI18n } from "../../lib/i18n";
import { getHost, type ThemeMode } from "../../lib/settings";
import { cn } from "../../utils/cn";

export function SearchSection() {
  const { settings, update, history, clearHistory } = useSettingsCtx();
  const { t } = useI18n();
  return (
    <div className="space-y-8">
      <SettingsGroup title={t("search.sugg.title")} description={t("search.sugg.desc")}>
        <div className={CARD}>
          <ToggleRow
            title={t("search.sugg.toggle")}
            description={t("search.sugg.toggleDesc")}
            checked={settings.searchSuggestions}
            onChange={(searchSuggestions) => update({ searchSuggestions })}
          />
        </div>
      </SettingsGroup>

      <SettingsGroup
        title={t("search.hist.title")}
        description={t("search.hist.desc")}
        action={
          <button type="button" disabled={!history.length} onClick={clearHistory} className={BUTTON}>
            {t("search.hist.clear")}
          </button>
        }
      >
        <div className={cn(CARD, "divide-y divide-[var(--line)]")}>
          {history.length ? (
            history.slice(0, 8).map((query) => (
              <div key={query} className="flex min-h-14 items-center gap-3 px-5 py-3">
                <History size={18} className="shrink-0 text-[var(--muted)]" aria-hidden="true" />
                <span dir="auto" className="truncate text-sm">
                  {query}
                </span>
              </div>
            ))
          ) : (
            <p className="px-5 py-5 text-sm text-[var(--muted)]">{t("search.hist.empty")}</p>
          )}
        </div>
      </SettingsGroup>
    </div>
  );
}

export function AppearanceSection() {
  const { settings, update, fontTheme } = useSettingsCtx();
  const { t } = useI18n();
  const hasWallpaper = settings.wallpaperSource !== "none";

  return (
    <div className="space-y-8">
      <SettingsGroup title={t("ap.logo")} description={t("ap.logoDesc")}>
        <LogoStudio settings={settings} update={update} />
      </SettingsGroup>

      <SettingsGroup title={t("ap.mode")} description={t("ap.modeDesc")}>
        <ChoiceList<ThemeMode>
          label={t("ap.mode")}
          value={settings.theme}
          onChange={(theme) => update({ theme })}
          options={[
            { value: "system", label: t("ap.mode.system"), icon: Monitor },
            { value: "light", label: t("ap.mode.light"), icon: Sun },
            { value: "dark", label: t("ap.mode.dark"), icon: Moon },
            {
              value: "wallpaper",
              label: t("ap.mode.wallpaper"),
              icon: WallpaperIcon,
              disabled: !hasWallpaper,
              description: hasWallpaper ? undefined : t("ap.mode.needsWallpaper"),
            },
          ]}
        />
      </SettingsGroup>

      <SettingsGroup title={t("ap.indicator")} description={t("ap.indicatorDesc")}>
        <div className={cn(CARD, "grid grid-cols-1 sm:grid-cols-2")}>
          {(
            [
              ["m3", "M3 Expressive"],
              ["matrix", "NotMatrix"],
            ] as const
          ).map(([variant, label]) => {
            const active = fontTheme === variant;
            return (
              <div key={variant} className="flex flex-col items-center gap-4 p-5">
                <div className="flex items-center gap-3">
                  <LoadingIndicator variant={variant} />
                  <LoadingIndicator variant={variant} contained containerColor="var(--surface-container-high)" />
                  <LoadingIndicator variant={variant} contained containerColor="var(--primary)" indicatorColor="var(--on-primary)" />
                </div>
                <span className={cn("text-sm", active ? "font-medium" : "text-[var(--muted)]")}>
                  {label}
                  {active && ` · ${t("ap.indicator.active")}`}
                </span>
              </div>
            );
          })}
        </div>
      </SettingsGroup>
    </div>
  );
}

export function BookmarksSection() {
  const { bookmarks, removeBookmark, addBookmark } = useSettingsCtx();
  const { t } = useI18n();
  return (
    <SettingsGroup
      title={t("bm.title")}
      description={t("bm.desc")}
      action={
        <button type="button" onClick={addBookmark} className={BUTTON_PRIMARY}>
          <Plus size={17} aria-hidden="true" /> {t("bookmarks.add")}
        </button>
      }
    >
      <div className={cn(CARD, "divide-y divide-[var(--line)]")}>
        {bookmarks.length ? (
          bookmarks.map((bookmark) => (
            <div key={bookmark.id} className="flex min-h-16 items-center gap-3 px-4 py-3 sm:px-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--surface-container-high)] text-sm font-semibold">
                {bookmark.title.slice(0, 1).toUpperCase()}
              </div>
              <a href={bookmark.url} className="min-w-0 flex-1 hover:underline">
                <span dir="auto" className="block truncate text-sm font-medium">
                  {bookmark.title}
                </span>
                <span className="mt-0.5 block truncate text-xs text-[var(--muted)]">{getHost(bookmark.url)}</span>
              </a>
              <button
                type="button"
                onClick={() => removeBookmark(bookmark.id)}
                title={t("bookmarks.remove", { name: bookmark.title })}
                aria-label={t("bookmarks.remove", { name: bookmark.title })}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[var(--muted)] transition hover:bg-[var(--surface-container-high)] hover:text-[var(--fg)]"
              >
                <Trash2 size={18} aria-hidden="true" />
              </button>
            </div>
          ))
        ) : (
          <p className="px-5 py-5 text-sm text-[var(--muted)]">{t("bm.empty")}</p>
        )}
      </div>
    </SettingsGroup>
  );
}

export function AboutSection() {
  const { t } = useI18n();
  return (
    <div className="space-y-6">
      <div className={cn(CARD, "flex items-center gap-4 p-5 sm:p-6")}>
        <div className="type-display flex h-14 w-14 shrink-0 items-center justify-center rounded-[19px] bg-[var(--primary)] text-2xl font-black text-[var(--on-primary)]">
          L
        </div>
        <div>
          <h2 className="type-display text-lg font-semibold">LisYan better search</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">{t("ab.tagline")}</p>
        </div>
      </div>
      <div className={cn(CARD, "space-y-3 px-5 py-4 text-sm leading-6 text-[var(--muted)]")}>
        <p>{t("ab.privacy")}</p>
        <p>{t("la.machine")}</p>
        <p>{t("ab.credits")}</p>
      </div>
    </div>
  );
}
