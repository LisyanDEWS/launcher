import { Contrast, Palette, Pipette, TriangleAlert, Wallpaper as WallpaperIcon } from "lucide-react";
import { useSettingsCtx } from "./context";
import LoadingIndicator from "../LoadingIndicator";
import { BUTTON_PRIMARY, CARD, ChoiceList, Notice, Segmented, SettingsGroup, Swatch } from "../ui";
import { useI18n } from "../../lib/i18n";
import { PRESET_IDS, SCHEME_VARIANTS, type ColorSource, type SchemeVariant } from "../../lib/settings";
import { PRESET_COLORS, swatchColors } from "../../lib/theme";
import { cn } from "../../utils/cn";

const PALETTE_PREVIEW = ["--primary", "--secondary-container", "--surface-container-highest", "--surface-container-high", "--surface", "--bg", "--fg"];

export default function ThemesSection() {
  const { settings, update, analysis, goTo, dark } = useSettingsCtx();
  const { t } = useI18n();
  const hasWallpaper = settings.wallpaperSource !== "none";
  const variant = settings.schemeVariant;

  return (
    <div className="space-y-8">
      <SettingsGroup title={t("th.source")} description={t("th.sourceDesc")}>
        <ChoiceList<ColorSource>
          label={t("th.source")}
          value={settings.colorSource}
          onChange={(colorSource) => update({ colorSource })}
          options={[
            { value: "mono", label: t("th.mono"), description: t("th.monoDesc"), icon: Contrast },
            { value: "wallpaper", label: t("th.wallpaper"), description: t("th.wallpaperDesc"), icon: WallpaperIcon },
            { value: "preset", label: t("th.preset"), description: t("th.presetDesc"), icon: Palette },
            { value: "custom", label: t("th.custom"), description: t("th.customDesc"), icon: Pipette },
          ]}
        />
      </SettingsGroup>

      {settings.colorSource === "wallpaper" && (
        <SettingsGroup title={t("th.wpColors")} description={t("th.wpColorsDesc")}>
          {!hasWallpaper ? (
            <Notice
              icon={WallpaperIcon}
              action={
                <button type="button" onClick={() => goTo("wallpaper")} className={BUTTON_PRIMARY}>
                  {t("th.goWallpaper")}
                </button>
              }
            >
              {t("th.noWallpaper")}
            </Notice>
          ) : analysis === "error" ? (
            <Notice icon={TriangleAlert}>{t("th.corsError")}</Notice>
          ) : !settings.wallpaperColors.length ? (
            <div className={cn(CARD, "flex items-center gap-4 p-5 text-sm")}>
              <LoadingIndicator />
              {t("th.analyzing")}
            </div>
          ) : (
            <div className={cn(CARD, "flex flex-wrap gap-5 p-5")}>
              {settings.wallpaperColors.map((hex, index) => (
                <Swatch
                  key={hex}
                  colors={swatchColors(hex, dark, variant)}
                  selected={index === settings.wallpaperColorIndex}
                  label={hex.toUpperCase()}
                  onClick={() => update({ wallpaperColorIndex: index })}
                />
              ))}
            </div>
          )}
        </SettingsGroup>
      )}

      {settings.colorSource === "preset" && (
        <SettingsGroup title={t("th.presets")}>
          <div className={cn(CARD, "grid grid-cols-4 justify-items-center gap-y-5 p-5 sm:grid-cols-8")}>
            {PRESET_IDS.map((id) => (
              <Swatch
                key={id}
                colors={swatchColors(PRESET_COLORS[id], dark, variant)}
                selected={settings.presetId === id}
                label={t(`th.p.${id}`)}
                onClick={() => update({ presetId: id })}
              />
            ))}
          </div>
        </SettingsGroup>
      )}

      {settings.colorSource === "custom" && (
        <SettingsGroup title={t("th.seed")}>
          <div className={cn(CARD, "flex flex-wrap items-center gap-4 p-5")}>
            <input
              type="color"
              value={settings.customColor}
              onChange={(event) => update({ customColor: event.target.value.toLowerCase() })}
              aria-label={t("th.seed")}
              className="color-input h-14 w-14 shrink-0"
            />
            <div className="min-w-0">
              <div className="font-medium">{t("th.seed")}</div>
              <div className="text-sm tabular-nums text-[var(--muted)]">{settings.customColor.toUpperCase()}</div>
            </div>
            <div className="ms-auto flex gap-2">
              {swatchColors(settings.customColor, dark, variant).map((color) => (
                <span key={color} className="h-9 w-9 rounded-full border border-[var(--line)]" style={{ background: color }} />
              ))}
            </div>
          </div>
        </SettingsGroup>
      )}

      {settings.colorSource !== "mono" && (
        <>
          <SettingsGroup title={t("th.variant")} description={t("th.variantDesc")}>
            <ChoiceList<SchemeVariant>
              label={t("th.variant")}
              value={variant}
              onChange={(schemeVariant) => update({ schemeVariant })}
              options={SCHEME_VARIANTS.map((value) => ({ value, label: t(`th.v.${value}`), description: t(`th.v.${value}Desc`) }))}
            />
          </SettingsGroup>
          <SettingsGroup title={t("th.contrast")}>
            <div className={cn(CARD, "p-5")}>
              <Segmented
                label={t("th.contrast")}
                value={String(settings.contrast)}
                onChange={(value) => update({ contrast: Number(value) })}
                options={[
                  { value: "0", label: t("th.c.standard") },
                  { value: "0.5", label: t("th.c.medium") },
                  { value: "1", label: t("th.c.high") },
                ]}
              />
            </div>
          </SettingsGroup>
        </>
      )}

      <SettingsGroup title={t("th.palette")}>
        <div className={cn(CARD, "flex gap-2 p-4")}>
          {PALETTE_PREVIEW.map((name) => (
            <span key={name} title={name} className="h-12 flex-1 rounded-[14px] border border-[var(--line)]" style={{ background: `var(${name})` }} />
          ))}
        </div>
      </SettingsGroup>
    </div>
  );
}
