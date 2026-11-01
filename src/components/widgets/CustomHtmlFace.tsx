import { useMemo } from "react";
import type { CustomHtmlWidget } from "../../lib/settings";
import { useWeather } from "../../lib/weather";
import { useNow, getClockTime } from "../../lib/clock";
import { useI18n } from "../../lib/i18n";
import ErrorBoundary from "../ErrorBoundary";

type Props = {
  widget: CustomHtmlWidget;
  width: number;
  height: number;
};

export default function CustomHtmlFace({ widget, width, height }: Props) {
  const { lang } = useI18n();
  const isRu = lang === "ru";
  const now = useNow();
  const time = getClockTime(now, lang, "local", "auto");
  const weather = useWeather("Moscow", "c");

  const renderedHtml = useMemo(() => {
    let src = widget.html || "";

    const dateStr = new Date(now).toLocaleDateString(isRu ? "ru-RU" : "en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });

    const tokens: Record<string, string | number> = {
      "{city}": weather.city,
      "{temp}": weather.temp,
      "{apparent}": weather.apparentTemp,
      "{feels_like}": weather.apparentTemp,
      "{condition}": isRu ? weather.conditionRu : weather.condition,
      "{high}": weather.tempMax,
      "{low}": weather.tempMin,
      "{wind}": weather.windSpeed,
      "{humidity}": weather.humidity,
      "{uv}": weather.uvIndex.toFixed(0),
      "{precip}": weather.precipitationProb,
      "{rain}": weather.precipitationProb,
      "{pressure}": Math.round(weather.pressure),
      "{time}": `${time.hour}:${time.minute}`,
      "{hour}": time.hour,
      "{min}": time.minute,
      "{sec}": time.second,
      "{date}": dateStr,
    };

    for (const [key, val] of Object.entries(tokens)) {
      src = src.replaceAll(key, String(val));
    }

    return src;
  }, [widget.html, weather, time, now, isRu]);

  return (
    <ErrorBoundary
      fallback={
        <div className="flex h-full w-full items-center justify-center rounded-[28px] border border-red-500/30 bg-red-500/10 p-4 text-xs text-red-400">
          HTML Syntax Error
        </div>
      }
    >
      <div
        className="relative h-full w-full overflow-hidden rounded-[28px]"
        style={{
          width: "100%",
          height: "100%",
        }}
        dangerouslySetInnerHTML={{ __html: renderedHtml }}
      />
    </ErrorBoundary>
  );
}
