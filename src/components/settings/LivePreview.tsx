import { Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import SearchBox, { searchHints } from "../SearchBox";
import { BUTTON } from "../ui";
import WallpaperLayer from "../WallpaperLayer";
import { useI18n } from "../../lib/i18n";
import { splitGraphemes } from "../../lib/text-anim";
import { useSettingsCtx } from "./context";

/** Interactive search bar over the current wallpaper; shared by the style and animation editors. */
export default function LivePreview() {
  const { settings, wallpaper } = useSettingsCtx();
  const { t } = useI18n();
  const [value, setValue] = useState("");
  const timers = useRef<number[]>([]);

  const stop = () => {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];
  };
  useEffect(() => stop, []);

  /** Types the demo phrase letter by letter, then erases it — shows both animations. */
  const play = () => {
    stop();
    setValue("");
    const chars = splitGraphemes(t("sb.demoText"));
    let at = 250;
    const schedule = (text: string) => timers.current.push(window.setTimeout(() => setValue(text), at));
    chars.forEach((_, index) => {
      at += 90;
      schedule(chars.slice(0, index + 1).join(""));
    });
    at += 1200;
    for (let index = chars.length - 1; index >= 0; index--) {
      at += 55;
      schedule(chars.slice(0, index).join(""));
    }
  };

  const style = settings.searchStyle;
  const url = wallpaper.url;

  return (
    <div className="z-20 -mx-1 bg-[var(--bg)] px-1 pb-3 md:sticky md:top-0">
      <div className="relative isolate overflow-hidden rounded-[28px] border border-[var(--line)] bg-[var(--bg)] px-4 py-10 sm:px-8 sm:py-12">
        {url && (
          <WallpaperLayer
            key={url}
            contained
            url={url}
            dim={settings.wallpaperDim}
            blur={settings.wallpaperBlur}
            grayscale={settings.wallpaperGrayscale}
          />
        )}
        <form
          className="relative mx-auto w-full"
          style={{ maxWidth: style.width }}
          onSubmit={(event) => {
            event.preventDefault();
            play();
          }}
        >
          <SearchBox
            style={style}
            anim={settings.textAnim}
            value={value}
            onValueChange={(next) => {
              stop();
              setValue(next);
            }}
            placeholder={style.placeholder.trim() || t("search.placeholder")}
            hints={searchHints(t)}
            submitLabel={t("search.button")}
            translucent={Boolean(url)}
          />
        </form>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-[var(--muted)]">{t("sb.previewDesc")}</p>
        <button type="button" onClick={play} className={BUTTON}>
          <Play size={16} aria-hidden="true" />
          {t("sb.demo")}
        </button>
      </div>
    </div>
  );
}
