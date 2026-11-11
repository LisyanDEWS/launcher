import { createContext, useContext } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { LanguageCode } from "../../i18n/languages";
import type { RestorePayload } from "../../lib/backup";
import type { MatrixSupport } from "../../lib/i18n";
import type { Bookmark, BookmarkShape, FontTheme, SearchStyle, Settings, SettingsSection, TextAnim } from "../../lib/settings";
import type { WallpaperController } from "../../lib/wallpaper";

export type AnalysisState = "idle" | "busy" | "error";

export type SettingsContextValue = {
  settings: Settings;
  setSettings: Dispatch<SetStateAction<Settings>>;
  update: (patch: Partial<Settings>) => void;
  /** Patch the search bar style (switches the preset marker to "custom"). */
  updateStyle: (patch: Partial<SearchStyle>) => void;
  /** Patch the text animation (switches the preset marker to "custom"). */
  updateAnim: (patch: Partial<TextAnim>) => void;
  wallpaper: WallpaperController;
  analysis: AnalysisState;
  bookmarks: Bookmark[];
  history: string[];
  removeBookmark: (id: string) => void;
  clearHistory: () => void;
  restoreBackup: (backup: RestorePayload) => Promise<void>;
  addBookmark: () => void;
  /** Adds a bookmark without leaving settings. */
  saveBookmark: (data: { title: string; url: string; customIcon?: string; shape?: BookmarkShape }) => void;
  /** Replaces the bookmark order (shortcut row order). */
  setBookmarkOrder: (next: Bookmark[]) => void;
  goTo: (section: SettingsSection) => void;
  toast: (text: string) => void;
  dark: boolean;
  /** Effective font theme (NotMatrix is off when the language isn't supported). */
  fontTheme: FontTheme;
  matrix: MatrixSupport;
  browserLang: LanguageCode;
  /** Closes settings and starts editing widgets on the start page. */
  openHomeEditor: () => void;
};

export const SettingsContext = createContext<SettingsContextValue | null>(null);

export function useSettingsCtx(): SettingsContextValue {
  const value = useContext(SettingsContext);
  if (!value) throw new Error("SettingsContext is missing");
  return value;
}
