import { useEffect, useState } from "react";
import LoadingIndicator from "./LoadingIndicator";
import { useFontTheme } from "../lib/font-theme";
import { missingMatrixChars } from "../lib/i18n";
import { GOOGLE_LOGO, type FontTheme, type Settings } from "../lib/settings";
import { cn } from "../utils/cn";

type Props = {
  settings: Settings;
  dark: boolean;
  /** Smaller variant for the settings preview card. */
  compact?: boolean;
};

const MATRIX_TEXT = "type-matrix led-glow font-normal";
const SANS_TEXT = "type-sans font-black";

export const logoText = (settings: Settings) => settings.logoText.trim() || "LisYan";

/** Whether the custom-text logo is set in LED Dot-Matrix — only when the font has all its letters. */
export function textLogoMatrix(settings: Settings, fontTheme: FontTheme) {
  const wants = settings.logoFont === "matrix" || (settings.logoFont === "theme" && fontTheme === "matrix");
  return wants && missingMatrixChars(logoText(settings)).length === 0;
}

export default function Logo({ settings, dark, compact = false }: Props) {
  const fontTheme = useFontTheme();
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  // In NotMatrix the Google wordmark is typeset with LED Dot-Matrix instead of the image.
  const useImage = settings.logo === "google" && fontTheme !== "matrix";

  useEffect(() => {
    setLoaded(false);
    setFailed(false);
    if (!useImage) return;
    const timer = window.setTimeout(() => {
      setLoaded((curr) => {
        if (!curr) setFailed(true);
        return curr;
      });
    }, 1500);
    return () => window.clearTimeout(timer);
  }, [useImage]);

  const box = cn("relative flex w-full items-center justify-center", compact ? "h-16" : "mb-8 h-24 sm:h-28");
  const text = cn("max-w-full truncate px-2 text-center leading-none", compact ? "text-4xl" : "text-5xl sm:text-7xl");

  if (settings.logo === "none") return <div aria-hidden="true" className={box} />;

  if (settings.logo === "text") {
    return (
      <div className={box}>
        <h1 className={cn(text, textLogoMatrix(settings, fontTheme) ? MATRIX_TEXT : SANS_TEXT)}>{logoText(settings)}</h1>
      </div>
    );
  }

  if (!useImage || failed) {
    return (
      <div className={box}>
        <h1 className={cn(text, failed ? SANS_TEXT : MATRIX_TEXT)}>Google</h1>
      </div>
    );
  }

  return (
    <div className={box}>
      {!loaded && <LoadingIndicator contained />}
      <img
        src={GOOGLE_LOGO}
        alt="Google"
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
        className={cn("h-full object-contain transition-opacity duration-300", loaded ? "opacity-100" : "absolute opacity-0")}
        style={{ filter: dark ? "invert(1)" : "none" }}
      />
    </div>
  );
}
