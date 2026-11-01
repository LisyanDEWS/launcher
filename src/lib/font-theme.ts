import { createContext, useContext } from "react";
import type { FontTheme } from "./settings";

/** Active typography theme; lets deep components (e.g. LoadingIndicator) pick a matching look. */
export const FontThemeContext = createContext<FontTheme>("m3");

export function useFontTheme() {
  return useContext(FontThemeContext);
}
