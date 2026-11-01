import type { WeatherWidget } from "../../../lib/settings";
import { useWeather } from "../../../lib/weather";
import { useI18n } from "../../../lib/i18n";
import { cn } from "../../../utils/cn";

export type WeatherFaceProps = {
  widget: WeatherWidget;
};

export function MatrixDot({ isMatrix }: { isMatrix?: boolean }) {
  return null;
}

export function getWidgetFrame(_isMatrix?: boolean, defaultBg = "bg-[var(--surface-container-high)]") {
  return `font-['Roboto_Flex',system-ui,sans-serif] ${defaultBg} text-[var(--fg)] border-[var(--line)] shadow-sm`;
}

function getWindCompass(deg: number): string {
  const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const index = Math.round(((deg % 360) + 360) % 360 / 45) % 8;
  return directions[index];
}

function getBeaufort(kmh: number): number {
  if (kmh < 2) return 0;
  if (kmh < 6) return 1;
  if (kmh < 12) return 2;
  if (kmh < 20) return 3;
  if (kmh < 29) return 4;
  if (kmh < 39) return 5;
  if (kmh < 50) return 6;
  if (kmh < 62) return 7;
  if (kmh < 75) return 8;
  if (kmh < 89) return 9;
  if (kmh < 103) return 10;
  if (kmh < 118) return 11;
  return 12;
}

/* W01 · Sunny Day (Conditions) */
export function W01Sunny({ widget }: WeatherFaceProps) {
  const w = useWeather(widget.city, widget.unit);
  const { lang } = useI18n();
  const isRu = lang === "ru";
  const isMatrix = widget.styleVariant === "matrix";

  return (
    <div className={cn("relative flex h-full w-full flex-col justify-between overflow-hidden rounded-[28px] border p-5 select-none", getWidgetFrame(isMatrix))}>
      <div className="flex items-center justify-between text-[clamp(11px,12cqh,15px)] font-medium">
        <span className="truncate max-w-[65%] font-medium flex items-center">
          <MatrixDot isMatrix={isMatrix} />
          {w.city}
        </span>
        <span className="rounded-full border border-current/30 px-2.5 py-0.5 text-[clamp(10px,10cqh,13px)] font-semibold tracking-wide">
          UV {w.uvIndex.toFixed(0)}
        </span>
      </div>

      <div className="flex items-center justify-between my-auto py-1">
        <div className="text-[clamp(36px,44cqh,64px)] font-medium leading-none tracking-tight">
          {w.temp}°
        </div>
        <svg className="h-[36cqh] w-[36cqh] shrink-0 text-[var(--primary)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true">
          <circle cx="12" cy="12" r="4.5" />
          <path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8" />
        </svg>
      </div>

      <div className="flex items-center justify-between text-[clamp(11px,12cqh,15px)] font-medium text-[var(--muted)] border-t border-[var(--line)] pt-2">
        <span className="font-semibold text-[var(--fg)] truncate">{isRu ? w.conditionRu : w.condition}</span>
        <span className="shrink-0">H {w.tempMax}° · L {w.tempMin}°</span>
      </div>
    </div>
  );
}

/* W02 · Partly Cloudy (Conditions) */
export function W02PartlyCloudy({ widget }: WeatherFaceProps) {
  const w = useWeather(widget.city, widget.unit);
  const { lang } = useI18n();
  const isRu = lang === "ru";
  const isMatrix = widget.styleVariant === "matrix";

  return (
    <div className={cn("flex h-full w-full flex-col justify-between overflow-hidden rounded-[28px] border p-5 select-none", getWidgetFrame(isMatrix))}>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[clamp(36px,42cqh,60px)] font-medium leading-none tracking-tight flex items-center">
            <MatrixDot isMatrix={isMatrix} />
            {w.temp}°
          </div>
          <div className="mt-1 text-[clamp(11px,13cqh,18px)] font-semibold text-[var(--muted)] truncate max-w-[140px]">
            {isRu ? w.conditionRu : w.condition}
          </div>
        </div>
        <svg className="h-[36cqh] w-[36cqh] shrink-0 text-[var(--fg)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="9" cy="8" r="3.5" />
          <path d="M9 1.5v1M3.5 8h-1M5.2 4.2l-.7-.7M12.8 4.2l.7-.7" />
          <path d="M8 19h9.5a3.5 3.5 0 0 0 0-7 5 5 0 0 0-9.6 1.2A3 3 0 0 0 8 19z" fill="currentColor" fillOpacity="0.12" />
        </svg>
      </div>

      <div className="mt-auto grid grid-cols-3 gap-1.5 pt-2">
        <div className="rounded-2xl bg-[var(--surface-container-highest)] p-2 text-center text-[clamp(10px,10cqh,13px)] text-[var(--muted)]">
          <b className="block text-[clamp(12px,14cqh,17px)] font-bold text-[var(--fg)]">{w.apparentTemp}°</b>
          {isRu ? "Ощущается" : "Feels like"}
        </div>
        <div className="rounded-2xl bg-[var(--surface-container-highest)] p-2 text-center text-[clamp(10px,10cqh,13px)] text-[var(--muted)]">
          <b className="block text-[clamp(12px,14cqh,17px)] font-bold text-[var(--fg)]">{w.windSpeed}</b>
          km/h
        </div>
        <div className="rounded-2xl bg-[var(--surface-container-highest)] p-2 text-center text-[clamp(10px,10cqh,13px)] text-[var(--muted)]">
          <b className="block text-[clamp(12px,14cqh,17px)] font-bold text-[var(--fg)]">{w.precipitationProb}%</b>
          {isRu ? "Осадки" : "Rain"}
        </div>
      </div>
    </div>
  );
}

/* W03 · Rainy Afternoon (Conditions) */
export function W03Rainy({ widget }: WeatherFaceProps) {
  const w = useWeather(widget.city, widget.unit);
  const { lang } = useI18n();
  const isRu = lang === "ru";

  return (
    <div className="flex h-full w-full flex-col justify-between overflow-hidden rounded-[28px] border border-white/10 bg-[#161618] p-5 select-none text-[#f4f4f5]">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[44cqh] font-medium leading-none tracking-tight text-white">{w.temp}°</div>
          <div className="mt-1 text-[13cqh] font-semibold text-neutral-300">{isRu ? w.conditionRu : w.condition}</div>
        </div>
        <svg className="h-[36cqh] w-[36cqh] shrink-0 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
          <path d="M7 14h10a4 4 0 0 0 0-8 6 6 0 0 0-11.5 1.5A3.5 3.5 0 0 0 7 14z" />
          <path d="M8 17l-1 3M12 17l-1 3M16 17l-1 3" />
        </svg>
      </div>

      <div className="mt-auto rounded-2xl bg-[#242426] p-3 text-[11cqh] font-medium text-neutral-300">
        <div className="flex justify-between">
          <span>{isRu ? "Вероятность дождя" : "Rain expected"}</span>
          <span className="font-bold text-white">{w.precipitationProb}%</span>
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-neutral-700">
          <div className="h-full rounded-full bg-cyan-400 transition-all duration-500" style={{ width: `${Math.max(10, Math.min(100, w.precipitationProb))}%` }} />
        </div>
      </div>
    </div>
  );
}

/* W04 · Thunderstorm (Conditions) */
export function W04Thunderstorm({ widget }: WeatherFaceProps) {
  const w = useWeather(widget.city, widget.unit);
  const { lang } = useI18n();
  const isRu = lang === "ru";

  return (
    <div className="flex h-full w-full flex-col justify-between overflow-hidden rounded-[28px] border border-amber-500/20 bg-[#101012] p-5 select-none text-white">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[44cqh] font-medium leading-none tracking-tight">{w.temp}°</div>
          <div className="mt-1 text-[13cqh] font-semibold text-amber-400">{isRu ? w.conditionRu : w.condition}</div>
        </div>
        <svg className="h-[36cqh] w-[36cqh] shrink-0 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" aria-hidden="true">
          <path d="M13 2L4 14h7l-1 8 9-12h-7z" fill="currentColor" fillOpacity="0.2" />
        </svg>
      </div>

      <div className="mt-auto grid grid-cols-3 gap-1.5 pt-2">
        <div className="rounded-2xl bg-[#1c1c1f] p-2 text-center text-[10cqh] text-neutral-400">
          <b className="block text-[14cqh] font-bold text-white">{w.precipitationProb}%</b>
          {isRu ? "Осадки" : "Rain"}
        </div>
        <div className="rounded-2xl bg-[#1c1c1f] p-2 text-center text-[10cqh] text-neutral-400">
          <b className="block text-[14cqh] font-bold text-white">{Math.round(w.windSpeed * 1.4)}</b>
          {isRu ? "Порывы" : "Gusts"}
        </div>
        <div className="rounded-2xl bg-[#1c1c1f] p-2 text-center text-[10cqh] text-neutral-400">
          <b className="block text-[14cqh] font-bold text-white">{Math.max(2, Math.round(w.precipitation * 3))} km</b>
          {isRu ? "Фронт" : "Distance"}
        </div>
      </div>
    </div>
  );
}

/* W05 · Snowfall (Conditions) */
export function W05Snowfall({ widget }: WeatherFaceProps) {
  const w = useWeather(widget.city, widget.unit);
  const { lang } = useI18n();
  const isRu = lang === "ru";

  return (
    <div className="flex h-full w-full flex-col justify-between overflow-hidden rounded-[28px] border border-[var(--line)] bg-[var(--surface-container-high)] p-5 select-none text-[var(--fg)]">
      <div className="flex items-center justify-between text-[11cqh] font-medium">
        <span className="truncate max-w-[65%]">{isRu ? "Снег" : "Snow"} · {w.city}</span>
        <span className="rounded-full border border-current/30 px-2.5 py-0.5 text-[10cqh] font-semibold">
          {w.temp < 0 ? (isRu ? "Мороз" : "Freeze") : (isRu ? "Лёгкий" : "Light")}
        </span>
      </div>

      <div className="flex items-center justify-between my-auto py-1">
        <div>
          <div className="text-[44cqh] font-medium leading-none tracking-tight">{w.temp}°</div>
          <div className="mt-1 text-[13cqh] font-semibold text-[var(--muted)]">{isRu ? w.conditionRu : w.condition}</div>
        </div>
        <svg className="h-[36cqh] w-[36cqh] shrink-0 text-sky-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
          <path d="M12 2v20M3.5 7l17 10M3.5 17l17-10" />
          <path d="M9.5 3.5L12 5l2.5-1.5M9.5 20.5L12 19l2.5 1.5" />
        </svg>
      </div>

      <div className="mt-auto grid grid-cols-3 gap-1.5 pt-1">
        <div className="rounded-2xl bg-[var(--surface-container-highest)] p-2 text-center text-[10cqh] text-[var(--muted)]">
          <b className="block text-[13cqh] font-bold text-[var(--fg)]">6 km</b>
          {isRu ? "Видимость" : "Visibility"}
        </div>
        <div className="rounded-2xl bg-[var(--surface-container-highest)] p-2 text-center text-[10cqh] text-[var(--muted)]">
          <b className="block text-[13cqh] font-bold text-[var(--fg)]">{w.precipitation > 0 ? (w.precipitation * 0.9).toFixed(1) : "1.2"} cm/h</b>
          {isRu ? "Снегопад" : "Snow rate"}
        </div>
        <div className="rounded-2xl bg-[var(--surface-container-highest)] p-2 text-center text-[10cqh] text-[var(--muted)]">
          <b className="block text-[13cqh] font-bold text-[var(--fg)]">{w.apparentTemp}°</b>
          {isRu ? "Ощущается" : "Feels like"}
        </div>
      </div>
    </div>
  );
}

/* W06 · Clear Night (Conditions) */
export function W06ClearNight({ widget }: WeatherFaceProps) {
  const w = useWeather(widget.city, widget.unit);
  const { lang } = useI18n();
  const isRu = lang === "ru";

  return (
    <div className="flex h-full w-full flex-col justify-between overflow-hidden rounded-[28px] border border-white/10 bg-[#161619] p-5 select-none text-[#f2f2f2]">
      <div className="flex items-center justify-between text-[11cqh] font-medium text-neutral-400">
        <span className="truncate max-w-[60%]">{w.city}</span>
        <span>{isRu ? "Влажность" : "Humidity"} {w.humidity}%</span>
      </div>

      <div className="flex items-center justify-between my-auto py-1">
        <div>
          <div className="text-[44cqh] font-medium leading-none tracking-tight text-white">{w.temp}°</div>
          <div className="mt-1 text-[13cqh] font-semibold text-neutral-300">{isRu ? "Ясная ночь" : "Clear night"}</div>
        </div>
        <svg className="h-[36cqh] w-[36cqh] shrink-0 text-amber-200" viewBox="0 0 24 24" fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" aria-hidden="true">
          <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" />
        </svg>
      </div>

      <div className="flex items-center justify-between border-t border-white/10 pt-2 text-[11cqh] font-medium text-neutral-400">
        <span>{isRu ? "Ночь" : "Low"} {w.tempMin}°</span>
        <span className="rounded-full bg-white px-2.5 py-0.5 font-semibold text-black">
          {isRu ? "Видимость звезд: отл." : "Stargazing: excellent"}
        </span>
      </div>
    </div>
  );
}

/* W07 · Windy (Conditions) */
export function W07Windy({ widget }: WeatherFaceProps) {
  const w = useWeather(widget.city, widget.unit);
  const { lang } = useI18n();
  const isRu = lang === "ru";

  return (
    <div className="flex h-full w-full flex-col justify-between overflow-hidden rounded-[28px] border border-[var(--line)] bg-[var(--surface-container-high)] p-5 select-none text-[var(--fg)]">
      <div className="flex items-center justify-between text-[12cqh] font-medium">
        <span>{isRu ? "Ветер" : "Wind"} · {w.city}</span>
        <svg className="h-6 w-6 text-[var(--fg)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
          <path d="M3 8h11a3 3 0 1 0-3-3M3 12h16a3 3 0 1 1-3 3M3 16h7" />
        </svg>
      </div>

      <div className="my-auto py-1">
        <div className="text-[44cqh] font-medium leading-none tracking-tight">
          {w.windSpeed}<small className="ml-1.5 text-[15cqh] font-normal text-[var(--muted)]">km/h</small>
        </div>
        <div className="mt-1 text-[13cqh] font-semibold text-[var(--muted)]">
          {w.windSpeed > 25 ? (isRu ? "Сильный порывистый" : "Breezy and gusty") : (isRu ? "Умеренный" : "Gentle breeze")}
        </div>
      </div>

      <div className="mt-auto grid grid-cols-3 gap-1.5 pt-1">
        <div className="rounded-2xl bg-[var(--surface-container-highest)] p-2 text-center text-[10cqh] text-[var(--muted)]">
          <b className="block text-[14cqh] font-bold text-[var(--fg)]">{Math.round(w.windSpeed * 1.5)}</b>
          {isRu ? "Порывы" : "Gusts km/h"}
        </div>
        <div className="rounded-2xl bg-[var(--surface-container-highest)] p-2 text-center text-[10cqh] text-[var(--muted)]">
          <b className="block text-[14cqh] font-bold text-[var(--fg)]">{getWindCompass(w.windDirection)}</b>
          {isRu ? "Направление" : "Direction"}
        </div>
        <div className="rounded-2xl bg-[var(--surface-container-highest)] p-2 text-center text-[10cqh] text-[var(--muted)]">
          <b className="block text-[14cqh] font-bold text-[var(--fg)]">{getBeaufort(w.windSpeed)}</b>
          {isRu ? "Баллы Бофорта" : "Beaufort"}
        </div>
      </div>
    </div>
  );
}

/* W08 · Foggy Morning (Conditions) */
export function W08Foggy({ widget }: WeatherFaceProps) {
  const w = useWeather(widget.city, widget.unit);
  const { lang } = useI18n();
  const isRu = lang === "ru";

  return (
    <div className="flex h-full w-full flex-col justify-between overflow-hidden rounded-[28px] border border-[var(--line)] bg-[var(--surface-container-high)] p-5 select-none text-[var(--fg)]">
      <div className="text-[12cqh] font-medium text-[var(--muted)]">{isRu ? "Туманное утро" : "Foggy morning"} · {w.city}</div>
      <div className="my-auto">
        <div className="text-[44cqh] font-medium leading-none tracking-tight">{w.temp}°</div>
        <div className="mt-1 text-[13cqh] font-semibold text-[var(--fg)]">{isRu ? "Густой туман · Видимость 300 м" : "Dense fog · Visibility 300 m"}</div>
      </div>

      {/* Styled fog lines */}
      <div className="space-y-1.5 my-2">
        <div className="h-2 w-[70%] rounded-full bg-current/20" />
        <div className="ml-auto h-2 w-[65%] rounded-full bg-current/15" />
        <div className="h-2 w-[80%] rounded-full bg-current/25" />
      </div>

      <div className="mt-auto self-start rounded-full bg-[var(--fg)] px-3 py-1 text-[11cqh] font-medium text-[var(--bg)]">
        {isRu ? "Рассеется к 11:00" : "Clearing by 11:00"}
      </div>
    </div>
  );
}

/* W09 · Hot & Humid (Conditions) */
export function W09HotHumid({ widget }: WeatherFaceProps) {
  const w = useWeather(widget.city, widget.unit);
  const { lang } = useI18n();
  const isRu = lang === "ru";

  return (
    <div className="flex h-full w-full flex-col justify-between overflow-hidden rounded-[28px] border border-white/10 bg-[#1e1e22] p-5 select-none text-white">
      <div className="flex items-center gap-4">
        {/* Thermometer graphic */}
        <div className="relative h-24 w-5 shrink-0" aria-hidden="true">
          <div className="absolute inset-x-0 bottom-3 top-0 overflow-hidden rounded-full bg-neutral-700">
            <div className="absolute inset-x-0 bottom-0 bg-red-500 transition-all duration-500" style={{ height: `${Math.min(95, Math.max(25, (w.temp + 10) * 2))}%` }} />
          </div>
          <div className="absolute -left-1 bottom-0 h-7 w-7 rounded-full bg-red-500 ring-2 ring-[#1e1e22]" />
        </div>

        <div>
          <div className="text-[11cqh] font-medium text-neutral-400">{w.city} · {isRu ? "Полдень" : "Midday"}</div>
          <div className="text-[42cqh] font-medium leading-none tracking-tight text-white">{w.temp}°</div>
          <div className="mt-1 text-[13cqh] font-semibold text-amber-300">{isRu ? "Жарко и влажно" : "Hot and humid"}</div>
        </div>
      </div>

      <div className="mt-auto grid grid-cols-3 gap-1.5 pt-2">
        <div className="rounded-2xl bg-[#28282d] p-2 text-center text-[10cqh] text-neutral-400">
          {isRu ? "Ощущается" : "Feels"}
          <b className="block text-[14cqh] font-bold text-white">{w.apparentTemp}°</b>
        </div>
        <div className="rounded-2xl bg-[#28282d] p-2 text-center text-[10cqh] text-neutral-400">
          {isRu ? "Влажность" : "Humidity"}
          <b className="block text-[14cqh] font-bold text-white">{w.humidity}%</b>
        </div>
        <div className="rounded-2xl bg-[#28282d] p-2 text-center text-[10cqh] text-neutral-400">
          UV
          <b className="block text-[14cqh] font-bold text-white">{w.uvIndex.toFixed(0)}</b>
        </div>
      </div>
    </div>
  );
}

/* W10 · UV Index (Details) */
export function W10UV({ widget }: WeatherFaceProps) {
  const w = useWeather(widget.city, widget.unit);
  const { lang } = useI18n();
  const isRu = lang === "ru";
  const uv = w.uvIndex;
  const uvLevel = uv < 3 ? (isRu ? "Низкий" : "Low") : uv < 6 ? (isRu ? "Умеренный" : "Moderate") : uv < 8 ? (isRu ? "Высокий" : "High") : (isRu ? "Очень высокий" : "Very High");

  return (
    <div className="flex h-full w-full flex-col justify-between overflow-hidden rounded-[28px] border border-[var(--line)] bg-[var(--surface-container-high)] p-5 select-none text-[var(--fg)]">
      <div className="flex items-center justify-between text-[12cqh] font-medium">
        <span className="truncate max-w-[65%]">{isRu ? "УФ-индекс" : "UV index"} · {w.city}</span>
        <span className="rounded-full bg-[var(--fg)] px-2.5 py-0.5 text-[10cqh] font-semibold text-[var(--bg)]">
          {uvLevel}
        </span>
      </div>

      <div className="relative mx-auto my-auto w-full max-w-[200px]">
        <svg viewBox="0 0 200 110" aria-hidden="true" className="w-full">
          <path d="M20 100A80 80 0 0 1 180 100" pathLength="100" fill="none" stroke="currentColor" strokeOpacity="0.15" strokeWidth="12" strokeLinecap="round" />
          <path d="M20 100A80 80 0 0 1 180 100" pathLength="100" fill="none" stroke="currentColor" strokeWidth="12" strokeLinecap="round" strokeDasharray={`${Math.min(100, Math.round(uv * 10))} 100`} />
        </svg>
        <div className="absolute inset-x-0 bottom-0 text-center text-[38cqh] font-medium leading-none">
          {uv.toFixed(1)}
        </div>
      </div>

      <div className="text-center text-[10.5cqh] font-medium text-[var(--muted)]">
        {uv >= 6 ? (isRu ? "Используйте SPF. Защита от солнца обязательна." : "Wear sunscreen. Skin can burn in 25 min.") : (isRu ? "Безопасный уровень для прогулок." : "Safe for outdoor activities.")}
      </div>
    </div>
  );
}

/* W11 · Wind Compass (Details) */
export function W11WindCompass({ widget }: WeatherFaceProps) {
  const w = useWeather(widget.city, widget.unit);
  const { lang } = useI18n();
  const isRu = lang === "ru";
  const dirName = getWindCompass(w.windDirection);

  return (
    <div className="flex h-full w-full flex-col justify-between overflow-hidden rounded-[28px] border border-[var(--line)] bg-[var(--surface-container-high)] p-5 select-none text-[var(--fg)]">
      <div className="flex items-center justify-between text-[12cqh] font-medium">
        <span className="truncate max-w-[70%]">{isRu ? "Ветер" : "Wind"} · {w.city}</span>
        <span className="font-bold">{dirName}</span>
      </div>

      {/* Compass Dial */}
      <div className="relative mx-auto my-1 h-[36cqh] w-[36cqh] rounded-full border border-current/20 bg-[var(--surface-container-highest)]" aria-hidden="true">
        <span className="absolute left-1/2 top-1 -translate-x-1/2 text-[9cqh] font-bold text-[var(--muted)]">N</span>
        <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[9cqh] font-bold text-[var(--muted)]">E</span>
        <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[9cqh] font-bold text-[var(--muted)]">S</span>
        <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[9cqh] font-bold text-[var(--muted)]">W</span>

        {/* Rotating Needle */}
        <div
          className="absolute left-1/2 top-1/2 h-[75%] w-1 -translate-x-1/2 -translate-y-1/2 rounded-full transition-transform duration-700"
          style={{
            transform: `translate(-50%, -50%) rotate(${w.windDirection}deg)`,
            background: "linear-gradient(180deg, var(--fg) 50%, var(--muted) 50%)",
          }}
        />
        <div className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--fg)] ring-2 ring-[var(--surface)]" />
      </div>

      <div className="mt-auto grid grid-cols-3 gap-1.5 pt-1">
        <div className="rounded-2xl bg-[var(--surface-container-highest)] p-1.5 text-center text-[10cqh] text-[var(--muted)]">
          <b className="block text-[13cqh] font-bold text-[var(--fg)]">{w.windSpeed}</b>
          km/h
        </div>
        <div className="rounded-2xl bg-[var(--surface-container-highest)] p-1.5 text-center text-[10cqh] text-[var(--muted)]">
          <b className="block text-[13cqh] font-bold text-[var(--fg)]">{Math.round(w.windSpeed * 1.4)}</b>
          {isRu ? "Порывы" : "Gusts"}
        </div>
        <div className="rounded-2xl bg-[var(--surface-container-highest)] p-1.5 text-center text-[10cqh] text-[var(--muted)]">
          <b className="block text-[13cqh] font-bold text-[var(--fg)]">{dirName}</b>
          {isRu ? "Курс" : "Direction"}
        </div>
      </div>
    </div>
  );
}

/* W12 · Humidity Ring (Details) */
export function W12HumidityRing({ widget }: WeatherFaceProps) {
  const w = useWeather(widget.city, widget.unit);
  const { lang } = useI18n();
  const isRu = lang === "ru";
  const isMatrix = widget.styleVariant === "matrix";
  const dewPoint = Math.round(w.temp - (100 - w.humidity) / 5);

  return (
    <div className={cn("flex h-full w-full flex-col justify-between overflow-hidden rounded-[28px] border p-5 select-none", getWidgetFrame(isMatrix))}>
      <div className="flex items-center justify-between text-[clamp(11px,12cqh,14px)] font-medium">
        <span className="truncate max-w-[70%] flex items-center">
          <MatrixDot isMatrix={isMatrix} />
          {isRu ? "Влажность" : "Humidity"} · {w.city}
        </span>
        <span className="rounded-full border border-current/30 px-2 py-0.5 text-[clamp(9px,9.5cqh,12px)] font-semibold shrink-0">
          {w.humidity < 40 ? (isRu ? "Сухой" : "Dry") : w.humidity > 70 ? (isRu ? "Влажно" : "Humid") : (isRu ? "Норма" : "Optimal")}
        </span>
      </div>

      <div className="flex items-center gap-4 my-auto py-1">
        <div className="relative h-[38cqh] w-[38cqh] max-h-[82px] max-w-[82px] min-h-[50px] min-w-[50px] shrink-0">
          <svg viewBox="0 0 140 140" aria-hidden="true" className="h-full w-full">
            <circle cx="70" cy="70" r="54" fill="none" stroke="currentColor" strokeOpacity={isMatrix ? 0.2 : 0.14} strokeWidth="10" />
            <circle
              cx="70"
              cy="70"
              r="54"
              fill="none"
              stroke="currentColor"
              strokeWidth="10"
              strokeLinecap="round"
              pathLength="100"
              strokeDasharray={`${w.humidity} 100`}
              transform="rotate(-90 70 70)"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
            <span className="text-[clamp(11px,10.5cqh,15px)] font-bold tracking-tight">
              {w.humidity}
              <span className="text-[clamp(7px,7cqh,10px)] font-normal opacity-70 ml-0.5">%</span>
            </span>
          </div>
        </div>

        <div className="min-w-0">
          <div className="text-[clamp(10px,11cqh,13px)] text-[var(--muted)]">
            {isRu ? "Точка росы" : "Dew point"}
            <b className="block text-[clamp(16px,19cqh,24px)] font-semibold text-[var(--fg)]">{dewPoint}°</b>
          </div>
          <div className="mt-1 text-[clamp(10px,11cqh,13px)] font-semibold text-[var(--fg)] truncate">
            {w.humidity < 40 ? (isRu ? "Сухой воздух" : "Dry air") : w.humidity > 70 ? (isRu ? "Высокая влажность" : "Humid air") : (isRu ? "Комфортно" : "Comfortable")}
          </div>
        </div>
      </div>
    </div>
  );
}

/* W13 · Air Quality (Details) */
export function W13AirQuality({ widget }: WeatherFaceProps) {
  const w = useWeather(widget.city, widget.unit);
  const { lang } = useI18n();
  const isRu = lang === "ru";
  const aqi = w.airQualityAqi;
  const aqiPos = Math.min(95, Math.max(5, (aqi / 200) * 100));

  return (
    <div className="flex h-full w-full flex-col justify-between overflow-hidden rounded-[28px] border border-[var(--line)] bg-[var(--surface-container-high)] p-5 select-none text-[var(--fg)]">
      <div className="flex items-center justify-between text-[12cqh] font-medium">
        <span className="truncate max-w-[65%]">{isRu ? "Качество воздуха" : "Air quality"} · {w.city}</span>
        <span className="rounded-full border border-current/30 px-2.5 py-0.5 text-[10cqh] font-semibold">
          {isRu ? w.airQualityTextRu : w.airQualityText}
        </span>
      </div>

      <div className="my-1">
        <div className="text-[40cqh] font-medium leading-none tracking-tight">
          {aqi}
          <small className="block text-[11cqh] font-normal text-[var(--muted)] mt-1">
            US AQI · {isRu ? "Благоприятно для прогулок" : "Good for outdoor activity"}
          </small>
        </div>
      </div>

      {/* AQI Track */}
      <div className="relative pt-2">
        <div className="flex h-2.5 overflow-hidden rounded-full">
          <i className="flex-1 bg-emerald-500" />
          <i className="flex-1 bg-amber-400" />
          <i className="flex-1 bg-orange-500" />
          <i className="flex-1 bg-rose-500" />
          <i className="flex-1 bg-purple-700" />
        </div>
        <div
          className="absolute top-1.5 h-4 w-1 -translate-x-1/2 rounded-full bg-[var(--fg)] shadow-[0_0_0_2px_var(--surface)] transition-all duration-500"
          style={{ left: `${aqiPos}%` }}
        />
        <div className="mt-1.5 flex justify-between text-[9cqh] font-medium text-[var(--muted)]">
          <span>{isRu ? "Хорошо" : "Good"}</span>
          <span>{isRu ? "Умеренно" : "Moderate"}</span>
          <span>{isRu ? "Вредно" : "Hazardous"}</span>
        </div>
      </div>

      <div className="mt-auto grid grid-cols-3 gap-1.5 pt-1">
        <div className="rounded-2xl bg-[var(--surface-container-highest)] p-1.5 text-center text-[10cqh] text-[var(--muted)]">
          <b className="block text-[13cqh] font-bold text-[var(--fg)]">8</b>
          PM2.5
        </div>
        <div className="rounded-2xl bg-[var(--surface-container-highest)] p-1.5 text-center text-[10cqh] text-[var(--muted)]">
          <b className="block text-[13cqh] font-bold text-[var(--fg)]">14</b>
          PM10
        </div>
        <div className="rounded-2xl bg-[var(--surface-container-highest)] p-1.5 text-center text-[10cqh] text-[var(--muted)]">
          <b className="block text-[13cqh] font-bold text-[var(--fg)]">22</b>
          {isRu ? "Озон" : "Ozone"}
        </div>
      </div>
    </div>
  );
}

/* W14 · Barometric Pressure (Details) */
export function W14Pressure({ widget }: WeatherFaceProps) {
  const w = useWeather(widget.city, widget.unit);
  const { lang } = useI18n();
  const isRu = lang === "ru";
  // Pressure range 980 - 1040 hPa -> -60deg to +60deg
  const pClamped = Math.min(1040, Math.max(980, w.pressure));
  const angle = ((pClamped - 1013) / 27) * 50;

  return (
    <div className="flex h-full w-full flex-col justify-between overflow-hidden rounded-[28px] border border-white/10 bg-[#17171a] p-5 select-none text-[#f2f2f2]">
      <div className="flex items-center justify-between text-[12cqh] font-medium text-neutral-400">
        <span className="truncate max-w-[65%]">{isRu ? "Давление" : "Pressure"} · {w.city}</span>
        <span className="rounded-full bg-white px-2.5 py-0.5 text-[10cqh] font-semibold text-black">
          {w.pressure >= 1013 ? (isRu ? "Стабильно" : "Steady") : (isRu ? "Низкое" : "Low")}
        </span>
      </div>

      {/* Semi-dial */}
      <div className="relative mx-auto h-16 w-32 rounded-t-full border-[10px] border-b-0 border-neutral-700" aria-hidden="true">
        <div
          className="absolute bottom-0 left-1/2 h-14 w-1 -translate-x-1/2 origin-bottom rounded-full bg-white transition-transform duration-500"
          style={{ transform: `translateX(-50%) rotate(${angle}deg)` }}
        />
        <div className="absolute -bottom-1.5 left-1/2 h-3.5 w-3.5 -translate-x-1/2 rounded-full bg-white" />
      </div>

      <div className="text-center">
        <span className="text-[36cqh] font-medium leading-none text-white">{w.pressure}</span>
        <small className="ml-1 text-[13cqh] text-neutral-400">hPa</small>
      </div>

      <div className="text-center text-[10.5cqh] font-medium text-neutral-400">
        {w.pressure >= 1015 ? (isRu ? "Ясная устойчивая погода" : "Rising slowly · Fair weather ahead") : (isRu ? "Возможны осадки" : "Unsettled weather possible")}
      </div>
    </div>
  );
}

/* W15 · Rain Chance 24h (Details) */
export function W15RainChance({ widget }: WeatherFaceProps) {
  const w = useWeather(widget.city, widget.unit);
  const { lang } = useI18n();
  const isRu = lang === "ru";
  const isMatrix = widget.styleVariant === "matrix";
  const hours = w.hourly.slice(0, 8);
  const maxPop = Math.max(...hours.map((h) => h.pop), w.precipitationProb);

  return (
    <div className={cn("flex h-full w-full flex-col justify-between overflow-hidden rounded-[28px] border p-5 select-none", getWidgetFrame(isMatrix))}>
      <div className="flex items-baseline justify-between">
        <span className="text-[clamp(11px,12cqh,14px)] font-medium flex items-center">
          <MatrixDot isMatrix={isMatrix} />
          {isRu ? "Вероятность дождя · 24 ч" : "Chance of rain · next 24 h"}
        </span>
        <span className="text-[clamp(16px,20cqh,24px)] font-bold">{maxPop}%</span>
      </div>

      <div className="mt-auto flex h-[48cqh] items-end gap-1.5 pt-2">
        {hours.map((h, i) => {
          const isHigh = h.pop >= 50;
          return (
            <div key={i} className="flex flex-1 flex-col items-center justify-end gap-1 text-[clamp(8px,9cqh,11px)] font-medium text-[var(--muted)]">
              <span>{h.pop}%</span>
              <div className="w-full max-w-[24px] overflow-hidden rounded-t-md bg-[var(--surface-container-highest)]">
                <div
                  className={`w-full rounded-t-md transition-all duration-500 ${isHigh ? "bg-[var(--fg)]" : "bg-[var(--primary)]"}`}
                  style={{ height: `${Math.max(6, Math.min(100, h.pop))}%` }}
                />
              </div>
              <span className="truncate max-w-full">{h.time}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* W16 · Pollen Count (Details) */
export function W16Pollen({ widget }: WeatherFaceProps) {
  const { lang } = useI18n();
  const isRu = lang === "ru";

  return (
    <div className="flex h-full w-full flex-col justify-between overflow-hidden rounded-[28px] border border-[var(--line)] bg-[var(--surface-container-high)] p-5 select-none text-[var(--fg)]">
      <div>
        <div className="text-[22cqh] font-semibold leading-none">{isRu ? "Пыльца" : "Pollen"}</div>
        <div className="mt-1 text-[11cqh] font-medium text-[var(--muted)]">
          {isRu ? "Умеренный уровень · Обновлено 07:30" : "Moderate overall · Updated 07:30"}
        </div>
      </div>

      <div className="my-auto grid grid-cols-3 gap-2 py-1">
        <div className="rounded-2xl bg-[var(--fg)] p-2.5 text-center text-[var(--bg)]">
          <span className="block text-[11cqh] font-medium">{isRu ? "Деревья" : "Tree"}</span>
          <span className="block mt-0.5 text-[13cqh] font-bold">{isRu ? "Высокий" : "High"}</span>
        </div>
        <div className="rounded-2xl bg-[var(--surface-container-highest)] p-2.5 text-center text-[var(--fg)]">
          <span className="block text-[11cqh] font-medium text-[var(--muted)]">{isRu ? "Трава" : "Grass"}</span>
          <span className="block mt-0.5 text-[13cqh] font-bold">{isRu ? "Средний" : "Medium"}</span>
        </div>
        <div className="rounded-2xl bg-[var(--surface-container-highest)] p-2.5 text-center text-[var(--fg)]">
          <span className="block text-[11cqh] font-medium text-[var(--muted)]">{isRu ? "Сорняки" : "Weed"}</span>
          <span className="block mt-0.5 text-[13cqh] font-bold">{isRu ? "Низкий" : "Low"}</span>
        </div>
      </div>

      <div className="text-[10cqh] font-medium text-[var(--muted)]">
        {isRu ? "Держите окна закрытыми с 10:00 до 15:00." : "Keep windows closed from 10:00 to 15:00."}
      </div>
    </div>
  );
}

/* W17 · Feels Like (Details) */
export function W17FeelsLike({ widget }: WeatherFaceProps) {
  const w = useWeather(widget.city, widget.unit);
  const { lang } = useI18n();
  const isRu = lang === "ru";
  const diff = Math.round(w.apparentTemp - w.temp);

  return (
    <div className="flex h-full w-full flex-col justify-between overflow-hidden rounded-[28px] border border-[var(--line)] bg-[var(--surface-container-high)] p-5 select-none text-[var(--fg)]">
      <div>
        <div className="text-[12cqh] font-medium">{isRu ? "Ощущается как" : "Feels like"} · {w.city}</div>
        <div className="text-[44cqh] font-medium leading-none tracking-tight">{w.apparentTemp}°</div>
        <div className="mt-1 text-[11.5cqh] font-medium text-[var(--muted)]">
          {diff === 0
            ? (isRu ? "Соответствует фактической температуре" : "Similar to actual temperature")
            : diff > 0
            ? (isRu ? `Влажность добавляет ${diff}° к теплу` : `Humidity makes it feel ${diff}° warmer`)
            : (isRu ? `Ветер охлаждает на ${Math.abs(diff)}°` : `Wind makes it feel ${Math.abs(diff)}° cooler`)}
        </div>
      </div>

      <div className="mt-auto grid grid-cols-3 gap-1.5 pt-2">
        <div className="rounded-2xl bg-[var(--surface-container-highest)] p-1.5 text-center text-[10cqh] text-[var(--muted)]">
          <b className="block text-[14cqh] font-bold text-[var(--fg)]">{w.temp}°</b>
          {isRu ? "Факт" : "Actual"}
        </div>
        <div className="rounded-2xl bg-[var(--surface-container-highest)] p-1.5 text-center text-[10cqh] text-[var(--muted)]">
          <b className="block text-[14cqh] font-bold text-[var(--fg)]">{w.humidity}%</b>
          {isRu ? "Влажность" : "Humidity"}
        </div>
        <div className="rounded-2xl bg-[var(--surface-container-highest)] p-1.5 text-center text-[10cqh] text-[var(--muted)]">
          <b className="block text-[14cqh] font-bold text-[var(--fg)]">{w.windSpeed}</b>
          km/h
        </div>
      </div>
    </div>
  );
}

/* W18 · Sunrise & Sunset (Astronomy) */
export function W18SunCycle({ widget }: WeatherFaceProps) {
  const w = useWeather(widget.city, widget.unit);
  const { lang } = useI18n();
  const isRu = lang === "ru";
  const progress = Math.max(0, Math.min(1, w.sunProgress));
  // Map progress (0..1) to angle on semi-circle arc
  const sunAngle = Math.PI - progress * Math.PI;
  const cx = 150 + 120 * Math.cos(sunAngle);
  const cy = 130 - 114 * Math.sin(sunAngle);

  return (
    <div className="flex h-full w-full flex-col justify-between overflow-hidden rounded-[28px] border border-white/10 bg-[#161619] p-5 select-none text-[#f2f2f2]">
      <div className="text-[12cqh] font-medium text-neutral-400">{isRu ? "Световой день" : "Daylight"} · {w.city}</div>

      <svg className="my-auto w-full max-h-[85px]" viewBox="0 0 300 150" aria-hidden="true">
        <path d="M30 130 A120 120 0 0 1 270 130" fill="none" stroke="#333336" strokeWidth="3" strokeLinecap="round" />
        <line x1="10" y1="130" x2="290" y2="130" stroke="#333336" strokeWidth="1.5" />
        <circle cx={cx} cy={cy} r="8" fill="#facc15" className="shadow-lg shadow-amber-500/50" />
      </svg>

      <div className="text-center text-[11cqh] font-medium text-neutral-400">
        {w.isDay ? (isRu ? "Солнце над горизонтом" : "Sun is above horizon") : (isRu ? "Ночное время" : "Night time")}
      </div>

      <div className="flex items-end justify-between border-t border-white/10 pt-2">
        <div>
          <b className="block text-[18cqh] font-semibold text-white">{w.sunrise}</b>
          <span className="text-[10cqh] text-neutral-400">{isRu ? "Восход" : "Sunrise"}</span>
        </div>
        <div className="text-right">
          <b className="block text-[18cqh] font-semibold text-white">{w.sunset}</b>
          <span className="text-[10cqh] text-neutral-400">{isRu ? "Закат" : "Sunset"}</span>
        </div>
      </div>
    </div>
  );
}

/* W19 · Moon Phase (Astronomy) */
export function W19MoonPhase({ widget }: WeatherFaceProps) {
  const w = useWeather(widget.city, widget.unit);
  const { lang } = useI18n();
  const isRu = lang === "ru";

  return (
    <div className="flex h-full w-full flex-col items-center justify-between overflow-hidden rounded-[28px] border border-white/10 bg-[#111114] p-5 select-none text-[#f2f2f2]">
      <div className="w-full text-left text-[12cqh] font-medium text-neutral-400">
        {isRu ? "Луна" : "Moon"} · {w.city}
      </div>

      {/* Moon visual */}
      <div className="relative my-1 h-[32cqh] w-[32cqh] rounded-full overflow-hidden bg-neutral-200" aria-hidden="true">
        <div
          className="absolute inset-0 rounded-full bg-[#111114] transition-transform duration-500"
          style={{ transform: `translateX(${-50 + w.moonIllumination / 2}%)` }}
        />
      </div>

      <div className="text-center">
        <div className="text-[16cqh] font-semibold text-white">{isRu ? w.moonPhaseNameRu : w.moonPhaseName}</div>
        <div className="text-[10.5cqh] text-neutral-400">{w.moonIllumination}% {isRu ? "освещено" : "illuminated"}</div>
      </div>

      <div className="w-full grid grid-cols-2 gap-2 mt-auto pt-1">
        <div className="rounded-2xl bg-[#1c1c20] p-1.5 text-center text-[10cqh] text-neutral-400">
          <b className="block text-[13cqh] font-bold text-white">3 {isRu ? "дня" : "days"}</b>
          {isRu ? "До полнолуния" : "To full moon"}
        </div>
        <div className="rounded-2xl bg-[#1c1c20] p-1.5 text-center text-[10cqh] text-neutral-400">
          <b className="block text-[13cqh] font-bold text-white">21:14</b>
          {isRu ? "Восход луны" : "Moonrise"}
        </div>
      </div>
    </div>
  );
}

/* W20 · 5-Day Forecast (Forecast) */
export function W20Forecast5D({ widget }: WeatherFaceProps) {
  const w = useWeather(widget.city, widget.unit);
  const { lang } = useI18n();
  const isRu = lang === "ru";
  const days = w.daily.slice(0, 5);

  return (
    <div className="flex h-full w-full flex-col justify-between overflow-hidden rounded-[28px] border border-[var(--line)] bg-[var(--surface-container-high)] p-5 select-none text-[var(--fg)]">
      <div className="text-[14cqh] font-bold mb-1">{isRu ? "Прогноз на 5 дней" : "5-day forecast"}</div>

      <div className="flex flex-col justify-between flex-1 divide-y divide-[var(--line)]">
        {days.map((d, i) => (
          <div key={i} className="flex items-center gap-2 py-1 text-[11cqh] font-medium">
            <span className="w-9 truncate font-semibold">{d.dayName}</span>
            <span className="text-[var(--muted)]">{d.min}°</span>
            <div className="relative h-1.5 flex-1 rounded-full bg-[var(--surface-container-highest)]">
              <div className="absolute inset-y-0 rounded-full bg-[var(--fg)]" style={{ left: "20%", width: "55%" }} />
            </div>
            <span className="w-7 text-right font-bold">{d.max}°</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* W21 · Hourly Forecast (Forecast) */
export function W21Hourly({ widget }: WeatherFaceProps) {
  const w = useWeather(widget.city, widget.unit);
  const { lang } = useI18n();
  const isRu = lang === "ru";
  const hours = w.hourly.slice(0, 6);

  return (
    <div className="flex h-full w-full flex-col justify-between overflow-hidden rounded-[28px] border border-[var(--line)] bg-[var(--surface-container-high)] p-5 select-none text-[var(--fg)]">
      <div>
        <div className="text-[14cqh] font-bold">{isRu ? "Ближайшие 6 часов" : "Next 6 hours"}</div>
        <div className="text-[10.5cqh] font-medium text-[var(--muted)]">
          {isRu ? `Вероятность осадков: ${w.precipitationProb}%` : `Rain probability: ${w.precipitationProb}%`}
        </div>
      </div>

      <div className="flex gap-2 mt-auto pt-2 overflow-x-auto scrollbar-none">
        {hours.map((h, i) => {
          const isNow = i === 0;
          return (
            <div
              key={i}
              className={`flex flex-1 flex-col items-center justify-between rounded-2xl py-2 px-1 text-center transition-all ${
                isNow ? "bg-[var(--fg)] text-[var(--bg)] shadow-sm" : "bg-[var(--surface-container-highest)] text-[var(--fg)]"
              }`}
            >
              <span className="text-[9cqh] font-medium opacity-80">{isNow ? (isRu ? "Сейчас" : "Now") : h.time}</span>
              <span className="my-1 text-[15cqh] font-bold">{h.temp}°</span>
              <span className="text-[8.5cqh] font-medium opacity-70">{h.pop}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* W22 · Temperature Trend (Forecast) */
export function W22TempTrend({ widget }: WeatherFaceProps) {
  const w = useWeather(widget.city, widget.unit);
  const { lang } = useI18n();
  const isRu = lang === "ru";

  return (
    <div className="flex h-full w-full flex-col justify-between overflow-hidden rounded-[28px] border border-[var(--line)] bg-[var(--surface-container-high)] p-5 select-none text-[var(--fg)]">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[12cqh] font-medium text-[var(--muted)]">{isRu ? "Температура" : "Temperature"} · {w.city}</div>
          <div className="text-[38cqh] font-medium leading-none tracking-tight">{w.temp}°</div>
        </div>
        <div className="text-right text-[10cqh] font-medium text-[var(--muted)]">
          {isRu ? `Макс ${w.tempMax}° в 15:00` : `Peak ${w.tempMax}° at 15:00`}<br />
          {isRu ? `Мин ${w.tempMin}° в 06:00` : `Low ${w.tempMin}° at 06:00`}
        </div>
      </div>

      {/* Temperature Bezier Spline Chart */}
      <svg className="my-auto w-full h-[36cqh]" viewBox="0 0 300 110" aria-hidden="true">
        <path
          d="M0 80 C25 72 45 40 75 46 S125 88 150 70 S205 24 235 30 S285 62 300 50"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <line x1="235" y1="30" x2="235" y2="110" stroke="currentColor" strokeOpacity="0.3" strokeWidth="1" strokeDasharray="3 3" />
        <circle cx="235" cy="30" r="5" fill="currentColor" />
      </svg>

      <div className="flex justify-between text-[9cqh] font-medium text-[var(--muted)] border-t border-[var(--line)] pt-1">
        <span>00</span><span>06</span><span>12</span><span>18</span><span>24</span>
      </div>
    </div>
  );
}

/* W23 · Weekly Rain (Forecast) */
export function W23WeeklyRain({ widget }: WeatherFaceProps) {
  const w = useWeather(widget.city, widget.unit);
  const { lang } = useI18n();
  const isRu = lang === "ru";
  const rainDays = [6, 1, 9, 7, 3, 0.5, 4];
  const daysLetters = isRu ? ["П", "В", "С", "Ч", "П", "С", "В"] : ["M", "T", "W", "T", "F", "S", "S"];

  return (
    <div className="flex h-full w-full flex-col justify-between overflow-hidden rounded-[28px] border border-[var(--line)] bg-[var(--surface-container-high)] p-5 select-none text-[var(--fg)]">
      <div className="flex items-baseline justify-between">
        <span className="text-[12cqh] font-medium">{isRu ? "Осадки за неделю" : "Rainfall this week"}</span>
        <span className="text-[20cqh] font-bold">{(w.precipitation * 7).toFixed(1)} mm</span>
      </div>

      <div className="mt-auto flex h-[48cqh] items-end gap-2 pt-2">
        {rainDays.map((val, idx) => (
          <div key={idx} className="flex flex-1 flex-col items-center justify-end gap-1 text-[9cqh] font-medium text-[var(--muted)]">
            <span>{val}</span>
            <div className="w-full rounded-md bg-[var(--surface-container-highest)] overflow-hidden">
              <div
                className="w-full rounded-md bg-[var(--fg)] transition-all duration-500"
                style={{ height: `${Math.min(100, val * 10)}%` }}
              />
            </div>
            <span>{daysLetters[idx]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* W24 · Weather Alert (Alerts) */
export function W24Alert({ widget }: WeatherFaceProps) {
  const w = useWeather(widget.city, widget.unit);
  const { lang } = useI18n();
  const isRu = lang === "ru";

  return (
    <div className="flex h-full w-full flex-col justify-between overflow-hidden rounded-[28px] border-2 border-amber-500/40 bg-[var(--surface-container-high)] p-5 select-none text-[var(--fg)]">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-amber-500 text-black">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3l10 18H2z" />
            <path d="M12 10v5M12 18.5v.5" />
          </svg>
        </div>
        <div>
          <div className="text-[10cqh] font-bold tracking-wider text-amber-500 uppercase">{isRu ? "ШТОРМОВОЕ ПРЕДУПРЕЖДЕНИЕ" : "SEVERE WARNING"}</div>
          <div className="text-[14cqh] font-bold leading-tight">{isRu ? "Порывистый ветер и осадки" : "Flash flood warning"}</div>
        </div>
      </div>

      <div className="my-auto text-[11cqh] font-normal leading-relaxed text-[var(--muted)]">
        {isRu
          ? `Ожидается усиление ветра в ${w.city} до ${Math.round(w.windSpeed * 1.5)} км/ч. Соблюдайте осторожность на открытых участках.`
          : `Heavy rain until 21:00 in ${w.city}. Avoid low-lying roads and underpasses.`}
      </div>

      <div className="mt-auto flex justify-end gap-2 pt-1">
        <button type="button" className="rounded-full bg-[var(--surface-container-highest)] px-3 py-1 text-[11cqh] font-semibold text-[var(--fg)] hover:bg-current/10">
          {isRu ? "Скрыть" : "Dismiss"}
        </button>
        <button type="button" className="rounded-full bg-[var(--fg)] px-3 py-1 text-[11cqh] font-semibold text-[var(--bg)] hover:opacity-90">
          {isRu ? "Подробнее" : "View details"}
        </button>
      </div>
    </div>
  );
}

/* W25 · City Hero (Conditions) */
export function W25CityHero({ widget }: WeatherFaceProps) {
  const w = useWeather(widget.city, widget.unit);
  const { lang } = useI18n();
  const isRu = lang === "ru";

  return (
    <div className="flex h-full w-full flex-col justify-between overflow-hidden rounded-[28px] border border-white/10 bg-[#161619] p-5 select-none text-[#f2f2f2]">
      <div className="flex items-center justify-between">
        <span className="text-[16cqh] font-bold text-white">{w.city}</span>
        <span className="rounded-full border border-neutral-600 px-2.5 py-0.5 text-[10cqh] font-medium text-neutral-300">
          {isRu ? "Сейчас" : "Local"}
        </span>
      </div>

      <div className="my-auto">
        <div className="text-[52cqh] font-medium leading-none tracking-tight text-white">{w.temp}°</div>
        <div className="mt-1 text-[13cqh] font-medium text-neutral-300">{isRu ? w.conditionRu : w.condition}</div>
      </div>

      <div className="flex gap-2 border-t border-white/10 pt-2 text-[11cqh] font-semibold">
        <span className="rounded-full bg-white px-3 py-0.5 text-black">H {w.tempMax}°</span>
        <span className="rounded-full bg-white/20 px-3 py-0.5 text-white">L {w.tempMin}°</span>
      </div>
    </div>
  );
}
