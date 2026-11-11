import { useSyncExternalStore } from "react";
import type React from "react";
import { FACE_COMPONENTS } from "./faces";
import { WEATHER_COMPONENTS } from "./weather";
import ErrorBoundary from "../ErrorBoundary";
import { getClockTime, useNow } from "../../lib/clock";
import { FACE_META } from "../../lib/faces";
import { faceRatio, widgetShape } from "../../lib/widgets";
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
import ShortcutFace from "./ShortcutFace";

/**
 * The face keeps its own proportions only loosely: inside a stretched cell it may get up to ~45% wider
 * or ~30% narrower than its natural ratio (weather cards even more), and the rest of the cell stays
 * empty around a centred face. Flexible content (bookmarks, HTML) always uses the whole cell.
 */
function fitFace(widget: HomeWidget, width: number, height: number) {
  if (widget.type === "bookmarks" || widget.type === "custom_html") return { w: width, h: height };
  const natural = widgetShape(widget) === "round" ? 1 : faceRatio(widget);
  const [lo, hi] = widget.type === "weather" ? [0.62, 1.7] : widgetShape(widget) === "round" ? [1, 1] : [0.72, 1.45];
  const box = width / Math.max(1, height);
  const target = Math.min(natural * hi, Math.max(natural * lo, box));
  return box > target ? { w: Math.round(height * target), h: height } : { w: width, h: Math.round(width / target) };
}

function FaceFit({ widget, width, height, children }: { widget: HomeWidget; width: number; height: number; children: React.ReactNode }) {
  const fit = fitFace(widget, width, height);
  return (
    <div className="wf-fit" style={{ width: fit.w, height: fit.h }}>
      {children}
    </div>
  );
}

type Props = {
  widget: HomeWidget;
  width: number;
  faceHeight: number;
  captionHeight?: number;
  caption?: string;
  /** Soft shadow that keeps the clock readable over a wallpaper. */
  halo?: boolean;
  /** Links inside the widget work (off while editing and in thumbnails). */
  interactive?: boolean;
};

/** Renders one widget (clock face or weather widget face) with the widget's colour role, options and data. */
export default function Clock({ widget, width, faceHeight, captionHeight = 0, caption = "", halo = false, interactive = true }: Props) {
  const { lang, t } = useI18n();
  const now = useNow();
  const reducedMotion = useReducedMotion();

  if (widget.type === "bookmarks") {
    const label = `${widget.title || "Bookmarks"}${caption ? `, ${caption}` : ""}`;
    return (
      <div
        className={cn("wf", halo && "wf--halo")}
        data-role={widget.color}
        role="group"
        aria-label={label}
        style={{ width, height: faceHeight + captionHeight, opacity: widget.opacity / 100 }}
      >
        <div className="wf-face" style={{ height: faceHeight }}>
          <div className="wf-fit" style={{ width, height: faceHeight }}>
            <BookmarksWidgetFace widget={widget} width={width} faceHeight={faceHeight} />
          </div>
        </div>
        {captionHeight > 0 && (
          <div className="wf-caption" style={{ height: captionHeight, lineHeight: `${captionHeight}px`, fontSize: Math.round(captionHeight / 1.7) }} aria-hidden="true">
            {caption}
          </div>
        )}
      </div>
    );
  }

  if (widget.type === "shortcut") {
    return (
      <div
        className={cn("wf wf--shortcut", halo && "wf--halo")}
        data-role={widget.color}
        role="group"
        aria-label={widget.title || widget.url}
        style={{ width, height: faceHeight + captionHeight, opacity: widget.opacity / 100 }}
      >
        <div className="wf-face" style={{ height: faceHeight }}>
          <FaceFit widget={widget} width={width} height={faceHeight}>
            <ShortcutFace widget={widget} interactive={interactive} />
          </FaceFit>
        </div>
        {captionHeight > 0 && (
          <div className="wf-caption" style={{ height: captionHeight, lineHeight: `${captionHeight}px`, fontSize: Math.round(captionHeight / 1.5) }} aria-hidden="true">
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
          <div className="wf-fit" style={{ width, height: faceHeight }}>
            <CustomHtmlFace widget={widget} width={width} height={faceHeight} />
          </div>
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
    const WeatherFace = WEATHER_COMPONENTS[widget.face] ?? WEATHER_COMPONENTS.m3w_now;
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
          <FaceFit widget={widget} width={width} height={faceHeight}>
            <ErrorBoundary fallback={<div className="flex items-center justify-center h-full text-xs text-[var(--muted)]">{widget.city}</div>}>
              <WeatherFace widget={widget} />
            </ErrorBoundary>
          </FaceFit>
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
        <FaceFit widget={widget} width={width} height={faceHeight}>
          <ErrorBoundary fallback={<div className="flex items-center justify-center h-full text-xs text-[var(--muted)]">{time.hour}:{time.minute}</div>}>
            <Face time={time} widget={widget} seconds={seconds} sweep={sweep} date={date} />
          </ErrorBoundary>
        </FaceFit>
      </div>
      {captionHeight > 0 && (
        <div className="wf-caption" style={{ height: captionHeight, lineHeight: `${captionHeight}px`, fontSize: Math.round(captionHeight / 1.7) }} aria-hidden="true">
          {caption}
        </div>
      )}
    </div>
  );
}
