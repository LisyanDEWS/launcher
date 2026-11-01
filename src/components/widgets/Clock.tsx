import { useSyncExternalStore } from "react";
import { FACE_COMPONENTS } from "./faces";
import { WEATHER_COMPONENTS } from "./weather";
import ErrorBoundary from "../ErrorBoundary";
import { getClockTime, useNow } from "../../lib/clock";
import { FACE_META } from "../../lib/faces";
import { useI18n } from "../../lib/i18n";
import type { HomeWidget } from "../../lib/settings";
import { cn } from "../../utils/cn";

const motionQuery = typeof window === "undefined" ? null : window.matchMedia("(prefers-reduced-motion: reduce)");
const subscribeMotion = (listener: () => void) => {
  motionQuery?.addEventListener("change", listener);
  return () => motionQuery?.removeEventListener("change", listener);
};
const prefersReducedMotion = () => motionQuery?.matches ?? false;

export const useReducedMotion = () => useSyncExternalStore(subscribeMotion, prefersReducedMotion, () => false);

import CustomHtmlFace from "./CustomHtmlFace";
import BookmarksWidgetFace from "./BookmarksWidgetFace";

type Props = {
  widget: HomeWidget;
  width: number;
  faceHeight: number;
  captionHeight?: number;
  caption?: string;
  /** Soft shadow that keeps the clock readable over a wallpaper. */
  halo?: boolean;
};

/** Renders one widget (clock face or weather widget face) with the widget's colour role, options and data. */
export default function Clock({ widget, width, faceHeight, captionHeight = 0, caption = "", halo = false }: Props) {
  const { lang, t } = useI18n();
  const now = useNow();
  const reducedMotion = useReducedMotion();

  if (widget.type === "bookmarks") {
    const label = `${widget.title || "Bookmarks"}${caption ? `, ${caption}` : ""}`;
    return (
      <div
        className={cn("wf", halo && "wf--halo")}
        data-role={widget.color}
        role="img"
        aria-label={label}
        style={{ width, height: faceHeight + captionHeight, opacity: widget.opacity / 100 }}
      >
        <div className="wf-face" style={{ height: faceHeight }} aria-hidden="true">
          <BookmarksWidgetFace widget={widget} width={width} faceHeight={faceHeight} />
        </div>
        {captionHeight > 0 && (
          <div className="wf-caption" style={{ height: captionHeight, lineHeight: `${captionHeight}px`, fontSize: Math.round(captionHeight / 1.7) }} aria-hidden="true">
            {caption}
          </div>
        )}
      </div>
    );
  }

  if (widget.type === "custom_html") {
    const label = `${widget.title || "Custom Widget"}${caption ? `, ${caption}` : ""}`;
    return (
      <div
        className={cn("wf", halo && "wf--halo")}
        data-role={widget.color}
        role="img"
        aria-label={label}
        style={{ width, height: faceHeight + captionHeight, opacity: widget.opacity / 100 }}
      >
        <div className="wf-face" style={{ height: faceHeight }} aria-hidden="true">
          <CustomHtmlFace widget={widget} width={width} height={faceHeight} />
        </div>
        {captionHeight > 0 && (
          <div className="wf-caption" style={{ height: captionHeight, lineHeight: `${captionHeight}px`, fontSize: Math.round(captionHeight / 1.7) }} aria-hidden="true">
            {caption}
          </div>
        )}
      </div>
    );
  }

  if (widget.type === "weather") {
    const WeatherFace = WEATHER_COMPONENTS[widget.face] ?? WEATHER_COMPONENTS.w01_sunny;
    const label = `${t(`wf.f.${widget.face}`)}: ${widget.city}${caption ? `, ${caption}` : ""}`;

    return (
      <div
        className={cn("wf", halo && "wf--halo")}
        data-role={widget.color}
        role="img"
        aria-label={label}
        style={{ width, height: faceHeight + captionHeight, opacity: widget.opacity / 100 }}
      >
        <div className="wf-face" style={{ height: faceHeight }} aria-hidden="true">
          <ErrorBoundary fallback={<div className="flex items-center justify-center h-full text-xs text-[var(--muted)]">{widget.city}</div>}>
            <WeatherFace widget={widget} />
          </ErrorBoundary>
        </div>
        {captionHeight > 0 && (
          <div className="wf-caption" style={{ height: captionHeight, lineHeight: `${captionHeight}px`, fontSize: Math.round(captionHeight / 1.7) }} aria-hidden="true">
            {caption}
          </div>
        )}
      </div>
    );
  }

  // Clock widget
  const meta = FACE_META[widget.face] ?? FACE_META.classic;
  const Face = FACE_COMPONENTS[widget.face] ?? FACE_COMPONENTS.classic;
  const time = getClockTime(now, lang, widget.timeZone, widget.hourCycle);
  const seconds = meta.seconds && widget.seconds !== "off";
  const sweep = seconds && meta.sweep && widget.seconds === "sweep" && !reducedMotion;
  const date = meta.date && widget.date;
  const label = `${t(`wf.f.${widget.face}`)}: ${time.hour}:${time.minute}${time.h12 ? ` ${time.dayPeriod}` : ""}${caption ? `, ${caption}` : ""}`;

  return (
    <div
      className={cn("wf", halo && "wf--halo")}
      data-role={widget.color}
      role="img"
      aria-label={label}
      style={{ width, height: faceHeight + captionHeight, opacity: widget.opacity / 100 }}
    >
      <div className="wf-face" style={{ height: faceHeight }} aria-hidden="true">
        <ErrorBoundary fallback={<div className="flex items-center justify-center h-full text-xs text-[var(--muted)]">{time.hour}:{time.minute}</div>}>
          <Face time={time} widget={widget} seconds={seconds} sweep={sweep} date={date} />
        </ErrorBoundary>
      </div>
      {captionHeight > 0 && (
        <div className="wf-caption" style={{ height: captionHeight, lineHeight: `${captionHeight}px`, fontSize: Math.round(captionHeight / 1.7) }} aria-hidden="true">
          {caption}
        </div>
      )}
    </div>
  );
}
