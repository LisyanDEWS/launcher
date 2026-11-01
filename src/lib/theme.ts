import {
  Hct,
  MaterialDynamicColors as C,
  QuantizerCelebi,
  SchemeExpressive,
  SchemeFidelity,
  SchemeTonalSpot,
  SchemeVibrant,
  Score,
  argbFromHex,
  argbFromRgb,
  hexFromArgb,
} from "@material/material-color-utilities";
import type { DynamicColor, DynamicScheme } from "@material/material-color-utilities";
import type { PresetId, SchemeVariant, WallpaperTone } from "./settings";

export const PRESET_COLORS: Record<PresetId, string> = {
  ocean: "#2f6bd8",
  forest: "#2e7d4f",
  sunset: "#e8743b",
  rose: "#d9467a",
  violet: "#7a5af5",
  sand: "#b38b4d",
  mint: "#1aa39a",
  crimson: "#c62f3b",
};

const SCHEMES = {
  tonal: SchemeTonalSpot,
  expressive: SchemeExpressive,
  vibrant: SchemeVibrant,
  fidelity: SchemeFidelity,
} satisfies Record<SchemeVariant, unknown>;

/** CSS variables that a colour scheme overrides on <html>. Monochrome uses the values from index.css. */
export const PALETTE_VARS = [
  "--bg",
  "--fg",
  "--muted",
  "--surface",
  "--surface-container-high",
  "--surface-container-highest",
  "--primary",
  "--on-primary",
  "--secondary-container",
  "--on-secondary-container",
  "--primary-container",
  "--on-primary-container",
  "--secondary",
  "--on-secondary",
  "--tertiary",
  "--on-tertiary",
  "--tertiary-container",
  "--on-tertiary-container",
  "--sidebar",
  "--line",
  "--outline",
] as const;
export type Palette = Record<(typeof PALETTE_VARS)[number], string>;

function makeScheme(seed: string, dark: boolean, variant: SchemeVariant, contrast: number): DynamicScheme {
  return new SCHEMES[variant](Hct.fromInt(argbFromHex(seed)), dark, contrast);
}

/** Material You palette mapped onto the app's surface roles (Apple-like cards on a tinted background). */
export function buildPalette(seed: string, dark: boolean, variant: SchemeVariant, contrast: number): Palette {
  const scheme = makeScheme(seed, dark, variant, contrast);
  const c = (color: DynamicColor) => hexFromArgb(color.getArgb(scheme));
  return {
    "--bg": c(dark ? C.surface : C.surfaceContainerLow),
    "--fg": c(C.onSurface),
    "--muted": c(C.onSurfaceVariant),
    "--surface": c(dark ? C.surfaceContainer : C.surfaceContainerLowest),
    "--surface-container-high": c(C.surfaceContainerHigh),
    "--surface-container-highest": c(C.surfaceContainerHighest),
    "--primary": c(C.primary),
    "--on-primary": c(C.onPrimary),
    "--secondary-container": c(C.secondaryContainer),
    "--on-secondary-container": c(C.onSecondaryContainer),
    "--primary-container": c(C.primaryContainer),
    "--on-primary-container": c(C.onPrimaryContainer),
    "--secondary": c(C.secondary),
    "--on-secondary": c(C.onSecondary),
    "--tertiary": c(C.tertiary),
    "--on-tertiary": c(C.onTertiary),
    "--tertiary-container": c(C.tertiaryContainer),
    "--on-tertiary-container": c(C.onTertiaryContainer),
    "--sidebar": c(dark ? C.surfaceContainerLow : C.surfaceContainer),
    "--line": c(C.outlineVariant),
    "--outline": c(C.outline),
  };
}

/** Three key colours for a picker swatch: primary, secondary container, tertiary. */
export function swatchColors(seed: string, dark: boolean, variant: SchemeVariant): string[] {
  const scheme = makeScheme(seed, dark, variant, 0);
  return [C.primary, C.secondaryContainer, C.tertiary].map((color) => hexFromArgb(color.getArgb(scheme)));
}

export type WallpaperAnalysis = { colors: string[]; tone: Exclude<WallpaperTone, "unknown"> };

/**
 * Extracts Material You seed colours from an image (Celebi quantizer + Score, as on Android)
 * and estimates whether it is dark. Rejects when the pixels can't be read (e.g. CORS).
 */
export function analyzeWallpaper(url: string): Promise<WallpaperAnalysis> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    if (!url.startsWith("blob:") && !url.startsWith("data:")) image.crossOrigin = "anonymous";
    image.decoding = "async";
    image.onload = () => {
      try {
        const scale = Math.min(1, 128 / Math.max(image.naturalWidth || 1, image.naturalHeight || 1));
        const width = Math.max(1, Math.round((image.naturalWidth || 128) * scale));
        const height = Math.max(1, Math.round((image.naturalHeight || 128) * scale));
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext("2d", { willReadFrequently: true });
        if (!context) throw new Error("Canvas is unavailable");
        context.drawImage(image, 0, 0, width, height);
        const data = context.getImageData(0, 0, width, height).data; // throws on tainted canvas
        const pixels: number[] = [];
        let luma = 0;
        for (let i = 0; i < data.length; i += 4) {
          if (data[i + 3] < 255) continue;
          pixels.push(argbFromRgb(data[i], data[i + 1], data[i + 2]));
          luma += 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
        }
        if (!pixels.length) throw new Error("Image has no opaque pixels");
        const ranked = Score.score(QuantizerCelebi.quantize(pixels, 128), { desired: 4 });
        resolve({ colors: ranked.map((argb) => hexFromArgb(argb)), tone: luma / pixels.length / 255 < 0.5 ? "dark" : "light" });
      } catch (error) {
        reject(error);
      }
    };
    image.onerror = () => reject(new Error("Image failed to load"));
    image.src = url;
  });
}
