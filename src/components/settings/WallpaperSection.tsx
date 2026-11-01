import { ImageOff, Link, Palette, Search, Upload, Wallpaper as WallpaperIcon } from "lucide-react";
import { useRef, useState } from "react";
import { useSettingsCtx } from "./context";
import LoadingIndicator from "../LoadingIndicator";
import { BUTTON, BUTTON_PRIMARY, CARD, INPUT, Notice, SettingsGroup, SliderRow, ToggleRow } from "../ui";
import { wallpaperFilter } from "../WallpaperLayer";
import { useI18n } from "../../lib/i18n";
import { limits, type Field } from "../../lib/settings";
import { cn } from "../../utils/cn";

const DIM: Field = { kind: "number", min: 0, max: 80, step: 1 };
const BLUR: Field = { kind: "number", min: 0, max: 24, step: 1 };

export default function WallpaperSection() {
  const { settings, update, wallpaper, goTo } = useSettingsCtx();
  const { t } = useI18n();
  const fileInput = useRef<HTMLInputElement>(null);
  const [urlFormOpen, setUrlFormOpen] = useState(settings.wallpaperSource === "url");
  const [urlDraft, setUrlDraft] = useState(settings.wallpaperUrl);
  const busy = wallpaper.status.kind === "busy";

  return (
    <div className="space-y-8">
      <SettingsGroup title={t("wp.image")} description={t("wp.imageDesc")}>
        <div className={CARD}>
          <div
            className="relative aspect-[16/9] overflow-hidden bg-[var(--surface-container-high)]"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              const file = event.dataTransfer.files[0];
              if (file) void wallpaper.uploadFile(file);
            }}
          >
            {wallpaper.url ? (
              <>
                <img
                  src={wallpaper.url}
                  alt=""
                  className="h-full w-full object-cover"
                  style={{
                    filter: wallpaperFilter(settings.wallpaperBlur, settings.wallpaperGrayscale),
                    transform: settings.wallpaperBlur > 0 ? `scale(${1 + settings.wallpaperBlur / 200})` : undefined,
                  }}
                />
                <div className="absolute inset-0 bg-[var(--bg)]" style={{ opacity: settings.wallpaperDim / 100 }} />
                <div
                  aria-hidden="true"
                  className="absolute inset-x-[16%] top-1/2 flex h-10 -translate-y-1/2 items-center gap-2 rounded-full bg-[var(--glass)] px-4 backdrop-blur-xl"
                >
                  <Search size={14} className="text-[var(--muted)]" />
                  <span className="truncate text-xs text-[var(--muted)]">{t("search.placeholder")}</span>
                </div>
              </>
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center text-[var(--muted)]">
                <WallpaperIcon size={34} strokeWidth={1.5} aria-hidden="true" />
                <span className="text-sm">{t("wp.empty")}</span>
              </div>
            )}
            {busy && (
              <div className="absolute inset-0 flex items-center justify-center bg-[var(--bg)]/40 backdrop-blur-sm">
                <LoadingIndicator contained />
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 p-4">
            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void wallpaper.uploadFile(file);
                event.target.value = "";
              }}
            />
            <button type="button" disabled={busy} onClick={() => fileInput.current?.click()} className={BUTTON_PRIMARY}>
              <Upload size={16} aria-hidden="true" /> {t("wp.upload")}
            </button>
            <button type="button" aria-expanded={urlFormOpen} onClick={() => setUrlFormOpen((open) => !open)} className={BUTTON}>
              <Link size={16} aria-hidden="true" /> {t("wp.byLink")}
            </button>
            {settings.wallpaperSource !== "none" && (
              <button type="button" disabled={busy} onClick={() => void wallpaper.remove()} className={BUTTON}>
                <ImageOff size={16} aria-hidden="true" /> {t("wp.remove")}
              </button>
            )}
          </div>

          {urlFormOpen && (
            <form
              className="flex flex-col gap-2 px-4 pb-4 sm:flex-row"
              onSubmit={(event) => {
                event.preventDefault();
                void wallpaper.applyUrl(urlDraft);
              }}
            >
              <input
                value={urlDraft}
                onChange={(event) => setUrlDraft(event.target.value)}
                placeholder="https://example.com/image.jpg"
                inputMode="url"
                dir="ltr"
                aria-label={t("wp.link")}
                className={INPUT}
              />
              <button type="submit" disabled={!urlDraft.trim() || busy} className={cn(BUTTON_PRIMARY, "h-14 justify-center px-6")}>
                {t("wp.apply")}
              </button>
            </form>
          )}

          {wallpaper.status.kind === "error" && (
            <p role="alert" className="px-5 pb-4 text-sm text-[var(--muted)]">
              {t(`wp.err.${wallpaper.status.code}`)}
            </p>
          )}
          {wallpaper.missingFile && <p className="px-5 pb-4 text-sm text-[var(--muted)]">{t("wp.missing")}</p>}
        </div>
      </SettingsGroup>

      <SettingsGroup title={t("wp.adjust")} description={t("wp.adjustDesc")}>
        <div className={cn(CARD, "divide-y divide-[var(--line)]", !wallpaper.url && "opacity-60")}>
          <SliderRow
            label={t("wp.dim")}
            value={settings.wallpaperDim}
            {...limits(DIM)}
            unit="%"
            disabled={!wallpaper.url}
            onChange={(wallpaperDim) => update({ wallpaperDim })}
          />
          <SliderRow
            label={t("wp.blur")}
            value={settings.wallpaperBlur}
            {...limits(BLUR)}
            unit=" px"
            disabled={!wallpaper.url}
            onChange={(wallpaperBlur) => update({ wallpaperBlur })}
          />
          <ToggleRow
            title={t("wp.gray")}
            description={t("wp.grayDesc")}
            checked={settings.wallpaperGrayscale}
            onChange={(wallpaperGrayscale) => update({ wallpaperGrayscale })}
          />
        </div>
      </SettingsGroup>

      {wallpaper.url && settings.colorSource !== "wallpaper" && (
        <Notice
          icon={Palette}
          action={
            <button type="button" onClick={() => goTo("themes")} className={BUTTON}>
              {t("wp.openThemes")}
            </button>
          }
        >
          {t("wp.themeHint")}
        </Notice>
      )}
    </div>
  );
}
