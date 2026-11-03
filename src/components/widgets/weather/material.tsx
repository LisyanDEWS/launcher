import { Droplets, Gauge, Navigation, Sunrise, Sunset, Thermometer, Wind } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { WeatherIcon } from "./icons";
import { C } from "../faces/parts";
import { getClockTime, useNow } from "../../../lib/clock";
import { useI18n } from "../../../lib/i18n";
import type { WeatherWidget } from "../../../lib/settings";
import { shapePath, type ShapeId } from "../../../lib/shapes";
import { useWeather, type WeatherConditionKey } from "../../../lib/weather";

export type WeatherFaceProps = { widget: WeatherWidget };

/* ---------- shared bits ---------- */

type W = ReturnType<typeof useWeather>;

function useW(widget: WeatherWidget) {
  const w = useWeather(widget.city, widget.unit);
  const { lang } = useI18n();
  const ru = lang.startsWith("ru");
  const L = (en: string, rus: string) => (ru ? rus : en);
  return { w, ru, L, lang, condition: ru ? w.conditionRu : w.condition };
}

function Ico({ cond, isDay = true, style }: { cond: WeatherConditionKey; isDay?: boolean; style?: CSSProperties }) {
  return (
    <span className="m3w-ico" style={style}>
      <WeatherIcon condition={cond} isDay={isDay} size={24} />
    </span>
  );
}

function Card({ children, accent = false, className = "", style }: { children: ReactNode; accent?: boolean; className?: string; style?: CSSProperties }) {
  return (
    <div
      className={`m3w ${className}`}
      style={{ background: accent ? C.accent : C.container, color: accent ? C.onAccent : C.onContainer, ...style }}
    >
      {children}
    </div>
  );
}

function Ring({ value, max = 100, stroke = 9, children }: { value: number; max?: number; stroke?: number; children?: ReactNode }) {
  const pct = Math.max(0, Math.min(1, value / max));
  return (
    <svg viewBox="0 0 100 100" className="m3w-svg" aria-hidden="true">
      <circle cx={50} cy={50} r={42} fill="none" stroke={C.track} strokeWidth={stroke} />
      <circle
        cx={50}
        cy={50}
        r={42}
        fill="none"
        stroke={C.accent}
        strokeWidth={stroke}
        strokeLinecap="round"
        pathLength={100}
        strokeDasharray={`${Math.max(0.5, pct * 100)} 100`}
        transform="rotate(-90 50 50)"
        className="m3-arc"
      />
      {children}
    </svg>
  );
}

/** Half-circle gauge from 180° to 360°. */
function Gauge180({ value, max }: { value: number; max: number }) {
  const pct = Math.max(0, Math.min(1, value / max));
  const r = 40;
  const angle = Math.PI * (1 - pct);
  const x = 50 + r * Math.cos(angle);
  const y = 58 - r * Math.sin(angle);
  return (
    <svg viewBox="0 0 100 64" className="m3w-svg" aria-hidden="true">
      <path d={`M10 58 A${r} ${r} 0 0 1 90 58`} fill="none" stroke={C.track} strokeWidth={10} strokeLinecap="round" />
      <path d={`M10 58 A${r} ${r} 0 0 1 90 58`} fill="none" stroke={C.accent} strokeWidth={10} strokeLinecap="round" pathLength={100} strokeDasharray={`${Math.max(0.5, pct * 100)} 100`} className="m3-arc" />
      <circle cx={x} cy={y} r={7} fill={C.pop} stroke={C.container} strokeWidth={3} />
    </svg>
  );
}

const SHAPE_FOR: Record<WeatherConditionKey, ShapeId> = {
  clear: "sunny",
  "partly-cloudy": "cookie12",
  cloudy: "cookie9",
  fog: "squircle",
  drizzle: "flower8",
  rain: "clover4",
  "heavy-rain": "clover4",
  snow: "flower8",
  thunderstorm: "burst",
};

const compass = (deg: number, ru: boolean) => {
  const en = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const r = ["С", "СВ", "В", "ЮВ", "Ю", "ЮЗ", "З", "СЗ"];
  const i = Math.round((((deg % 360) + 360) % 360) / 45) % 8;
  return (ru ? r : en)[i];
};

const uvLevel = (uv: number, ru: boolean) =>
  uv < 3 ? (ru ? "Низкий" : "Low") : uv < 6 ? (ru ? "Умеренный" : "Moderate") : uv < 8 ? (ru ? "Высокий" : "High") : uv < 11 ? (ru ? "Очень высокий" : "Very high") : ru ? "Экстремальный" : "Extreme";

const hourLabel = (h: number, lang: string) => {
  try {
    return new Intl.DateTimeFormat(lang, { hour: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(2024, 0, 1, h)));
  } catch {
    return `${h}`;
  }
};

/* ---------- faces ---------- */

/** Current conditions: big temperature with the icon in an accent cookie. */
export function M3WNow({ widget }: WeatherFaceProps) {
  const { w, condition, L } = useW(widget);
  return (
    <Card className="m3w-now">
      <div className="m3w-row m3w-top">
        <span className="m3w-city">
          {w.city}
          {w.demo && <span className="m3w-demo">{L("demo", "демо")}</span>}
        </span>
        <span className="m3w-shape-ico">
          <svg viewBox="0 0 100 100" aria-hidden="true">
            <path d={shapePath("cookie9")} fill={C.accent} />
          </svg>
          <Ico cond={w.conditionKey} isDay={w.isDay} style={{ color: C.onAccent, width: "58%", height: "58%" }} />
        </span>
      </div>
      <div className="m3w-temp" style={{ fontSize: "44cqh" }}>
        {w.temp}°
      </div>
      <div className="m3w-row m3w-foot">
        <span className="m3w-clip" style={{ fontWeight: 650 }}>
          {condition}
        </span>
        <span className="m3w-muted">
          ↑{w.tempMax}° ↓{w.tempMin}°
        </span>
      </div>
    </Card>
  );
}

/** The whole widget is an expressive shape that changes with the weather. */
export function M3WShape({ widget }: WeatherFaceProps) {
  const { w, condition } = useW(widget);
  return (
    <div className="m3w m3w--bare">
      <svg viewBox="0 0 100 100" className="m3w-svg m3w-morph" aria-hidden="true">
        <path d={shapePath(SHAPE_FOR[w.conditionKey] ?? "cookie12")} fill={C.accent} />
      </svg>
      <div className="m3w-center" style={{ color: C.onAccent }}>
        <Ico cond={w.conditionKey} isDay={w.isDay} style={{ width: "20cqmin", height: "20cqmin" }} />
        <div className="m3w-temp" style={{ fontSize: "30cqmin" }}>
          {w.temp}°
        </div>
        <div className="m3w-clip" style={{ fontSize: "8cqmin", fontWeight: 650, maxWidth: "70cqmin" }}>
          {condition}
        </div>
      </div>
    </div>
  );
}

/** Long capsule for narrow spaces. */
export function M3WPill({ widget }: WeatherFaceProps) {
  const { w, condition, L } = useW(widget);
  return (
    <Card className="m3w-pill">
      <span className="m3w-pill-ico" style={{ background: C.accent, color: C.onAccent }}>
        <Ico cond={w.conditionKey} isDay={w.isDay} style={{ width: "60%", height: "60%" }} />
      </span>
      <span className="m3w-temp" style={{ fontSize: "46cqh" }}>
        {w.temp}°
        {w.demo && <span className="m3w-demo">{L("demo", "демо")}</span>}
      </span>
      <span className="m3w-col" style={{ minWidth: 0, flex: 1 }}>
        <span className="m3w-clip" style={{ fontSize: "19cqh", fontWeight: 650 }}>
          {condition}
        </span>
        <span className="m3w-clip m3w-muted" style={{ fontSize: "16cqh" }}>
          {w.city} · ↑{w.tempMax}° ↓{w.tempMin}°
        </span>
      </span>
    </Card>
  );
}

/** 2×2 tonal tiles: temperature, humidity, wind, pressure. */
export function M3WDetails({ widget }: WeatherFaceProps) {
  const { w, L, condition } = useW(widget);
  const tile = (icon: ReactNode, value: string, label: string, accent = false) => (
    <div className="m3w-tile" style={{ background: accent ? C.accent : C.container, color: accent ? C.onAccent : C.onContainer }}>
      <span className="m3w-tile-ico">{icon}</span>
      <span className="m3w-tile-val">{value}</span>
      <span className="m3w-tile-lbl">{label}</span>
    </div>
  );
  return (
    <div className="m3w m3w--bare m3w-grid4">
      {tile(<Ico cond={w.conditionKey} isDay={w.isDay} style={{ width: "100%", height: "100%" }} />, `${w.temp}°`, condition, true)}
      {tile(<Droplets />, `${w.humidity}%`, L("Humidity", "Влажность"))}
      {tile(<Wind />, `${w.windSpeed}`, L("km/h wind", "км/ч ветер"))}
      {tile(<Gauge />, `${w.pressureMmHg}`, L("mmHg", "мм рт. ст."))}
    </div>
  );
}

/** Next hours; the current one is an accent pill. */
export function M3WHourly({ widget }: WeatherFaceProps) {
  const { w, condition, lang } = useW(widget);
  const hours = w.hourly.slice(0, 6);
  return (
    <Card className="m3w-forecast">
      <div className="m3w-row">
        <span className="m3w-temp" style={{ fontSize: "24cqh" }}>
          {w.temp}°
        </span>
        <span className="m3w-col" style={{ alignItems: "flex-end", minWidth: 0 }}>
          <span className="m3w-clip" style={{ fontWeight: 650, fontSize: "11cqh" }}>
            {condition}
          </span>
          <span className="m3w-clip m3w-muted" style={{ fontSize: "9.5cqh" }}>
            {w.city}
          </span>
        </span>
      </div>
      <div className="m3w-cols">
        {hours.map((h, i) => (
          <div key={h.time + i} className="m3w-colcell" style={i === 0 ? { background: C.accent, color: C.onAccent } : undefined}>
            <span className="m3w-cell-lbl">{hourLabel(h.hour, lang)}</span>
            <Ico cond={h.conditionKey} isDay={h.hour >= 6 && h.hour < 20} style={{ width: "15cqh", height: "15cqh" }} />
            <span className="m3w-cell-val">{h.temp}°</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

/** Five days with a temperature range bar. */
export function M3WDaily({ widget }: WeatherFaceProps) {
  const { w, L } = useW(widget);
  const days = w.daily.slice(0, 5);
  const lo = Math.min(...days.map((d) => d.min));
  const hi = Math.max(...days.map((d) => d.max));
  const span = Math.max(1, hi - lo);
  return (
    <Card className="m3w-forecast">
      <div className="m3w-row">
        <span style={{ fontWeight: 700, fontSize: "11cqh" }}>{w.city}</span>
        <span className="m3w-muted" style={{ fontSize: "9.5cqh" }}>
          {L("5 days", "5 дней")}
        </span>
      </div>
      <div className="m3w-cols">
        {days.map((d, i) => (
          <div key={d.date + i} className="m3w-colcell" style={i === 0 ? { background: C.accent, color: C.onAccent } : undefined}>
            <span className="m3w-cell-lbl">{i === 0 ? L("Today", "Сегодня") : d.dayName}</span>
            <Ico cond={d.conditionKey} style={{ width: "14cqh", height: "14cqh" }} />
            <span className="m3w-range" style={{ background: i === 0 ? "color-mix(in srgb, currentColor 25%, transparent)" : C.track }}>
              <i
                style={{
                  bottom: `${((d.min - lo) / span) * 100}%`,
                  height: `${Math.max(12, ((d.max - d.min) / span) * 100)}%`,
                  background: i === 0 ? "currentColor" : C.accent,
                }}
              />
            </span>
            <span className="m3w-cell-val">{d.max}°</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

/** Rain probability bars for the coming hours. */
export function M3WRain({ widget }: WeatherFaceProps) {
  const { w, L, lang } = useW(widget);
  const hours = w.hourly.slice(0, 8);
  return (
    <Card className="m3w-forecast">
      <div className="m3w-row">
        <span className="m3w-col">
          <span className="m3w-muted" style={{ fontSize: "10cqh", fontWeight: 600 }}>
            {L("Chance of rain", "Вероятность дождя")}
          </span>
          <span className="m3w-temp" style={{ fontSize: "26cqh" }}>
            {w.precipitationProb}%
          </span>
        </span>
        <span className="m3w-pill-ico" style={{ background: C.accent, color: C.onAccent, height: "26cqh" }}>
          <Droplets style={{ width: "55%", height: "55%" }} />
        </span>
      </div>
      <div className="m3w-bars">
        {hours.map((h, i) => (
          <div key={h.time + i} className="m3w-bar-col">
            <span className="m3w-bar" style={{ background: C.track }}>
              <i style={{ height: `${Math.max(6, h.pop)}%`, background: i === 0 ? C.pop : C.accent }} />
            </span>
            <span className="m3w-cell-lbl">{hourLabel(h.hour, lang)}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

/** Sun path arc between sunrise and sunset. */
export function M3WSun({ widget }: WeatherFaceProps) {
  const { w, L } = useW(widget);
  const p = Math.max(0, Math.min(1, w.sunProgress));
  const angle = Math.PI * (1 - p);
  const x = 50 + 38 * Math.cos(angle);
  const y = 50 - 38 * Math.sin(angle);
  return (
    <Card className="m3w-sun">
      <svg viewBox="0 0 100 56" className="m3w-svg" style={{ height: "62%" }} aria-hidden="true">
        <path d="M12 50 A38 38 0 0 1 88 50" fill="none" stroke={C.track} strokeWidth={4} strokeDasharray="2 4" strokeLinecap="round" />
        <path d="M12 50 A38 38 0 0 1 88 50" fill="none" stroke={C.accent} strokeWidth={4} strokeLinecap="round" pathLength={100} strokeDasharray={`${Math.max(0.5, p * 100)} 100`} className="m3-arc" />
        <line x1={4} y1={50} x2={96} y2={50} stroke={C.track} strokeWidth={1.5} />
        <circle cx={x} cy={y} r={7} fill={C.pop} />
      </svg>
      <div className="m3w-row" style={{ width: "100%" }}>
        <span className="m3w-sun-t">
          <Sunrise style={{ width: "13cqh", height: "13cqh", color: C.accent }} />
          <b>{w.sunrise}</b>
          <small className="m3w-muted">{L("Sunrise", "Восход")}</small>
        </span>
        <span className="m3w-sun-t" style={{ alignItems: "flex-end" }}>
          <Sunset style={{ width: "13cqh", height: "13cqh", color: C.accent }} />
          <b>{w.sunset}</b>
          <small className="m3w-muted">{L("Sunset", "Закат")}</small>
        </span>
      </div>
    </Card>
  );
}

/** Compass on a scalloped dial. */
export function M3WWind({ widget }: WeatherFaceProps) {
  const { w, ru, L } = useW(widget);
  return (
    <div className="m3w m3w--bare">
      <svg viewBox="0 0 100 100" className="m3w-svg" aria-hidden="true">
        <path d={shapePath("cookie12")} fill={C.container} />
        {["N", "E", "S", "W"].map((d, i) => {
          const a = (i * Math.PI) / 2;
          return (
            <text key={d} x={50 + 37 * Math.sin(a)} y={50 - 37 * Math.cos(a)} fontSize={8} fontWeight={700} fill={i === 0 ? C.accent : C.onContainer} textAnchor="middle" dominantBaseline="central" className="wf-t">
              {ru ? ["С", "В", "Ю", "З"][i] : d}
            </text>
          );
        })}
        <g style={{ transform: `rotate(${w.windDirection + 180}deg)`, transformOrigin: "50px 50px", transition: "transform 900ms var(--ui-spring)" }}>
          <path d="M50 18 L57 34 L50 30 L43 34 Z" fill={C.accent} />
        </g>
      </svg>
      <div className="m3w-center" style={{ color: C.onContainer }}>
        <Navigation style={{ width: "9cqmin", height: "9cqmin", color: C.accent, transform: `rotate(${w.windDirection + 180}deg)` }} />
        <div className="m3w-temp" style={{ fontSize: "19cqmin" }}>
          {w.windSpeed}
        </div>
        <div className="m3w-muted" style={{ fontSize: "6.5cqmin", fontWeight: 600 }}>
          {L("km/h", "км/ч")} · {compass(w.windDirection, ru)}
        </div>
      </div>
    </div>
  );
}

/** Humidity ring. */
export function M3WHumidity({ widget }: WeatherFaceProps) {
  const { w, L } = useW(widget);
  return <RingFace value={w.humidity} icon={<Droplets />} big={`${w.humidity}%`} label={L("Humidity", "Влажность")} />;
}

/** Feels-like temperature on a flower shape. */
export function M3WFeels({ widget }: WeatherFaceProps) {
  const { w, L } = useW(widget);
  const diff = w.apparentTemp - w.temp;
  return (
    <div className="m3w m3w--bare">
      <svg viewBox="0 0 100 100" className="m3w-svg" aria-hidden="true">
        <path d={shapePath("flower8")} fill={C.container} />
      </svg>
      <div className="m3w-center" style={{ color: C.onContainer }}>
        <Thermometer style={{ width: "11cqmin", height: "11cqmin", color: C.accent }} />
        <div className="m3w-temp" style={{ fontSize: "26cqmin" }}>
          {w.apparentTemp}°
        </div>
        <div className="m3w-muted" style={{ fontSize: "6.5cqmin", fontWeight: 600 }}>
          {L("Feels like", "Ощущается")}
        </div>
        <div className="m3w-chip" style={{ background: C.accent, color: C.onAccent }}>
          {diff === 0 ? L("Same as actual", "Как на самом деле") : `${diff > 0 ? "+" : ""}${diff}° ${L("vs actual", "к факт.")}`}
        </div>
      </div>
    </div>
  );
}

/** UV half gauge. */
export function M3WUV({ widget }: WeatherFaceProps) {
  const { w, ru, L } = useW(widget);
  return (
    <Card className="m3w-gauge">
      <span className="m3w-muted" style={{ fontSize: "9cqh", fontWeight: 650 }}>
        {L("UV index", "УФ-индекс")}
      </span>
      <div style={{ position: "relative", width: "100%", flex: 1, minHeight: 0 }}>
        <Gauge180 value={w.uvIndex} max={11} />
        <div className="m3w-gauge-val">{Math.round(w.uvIndex)}</div>
      </div>
      <span className="m3w-chip" style={{ background: C.accent, color: C.onAccent }}>
        {uvLevel(w.uvIndex, ru)}
      </span>
    </Card>
  );
}

/** Air quality ring. */
export function M3WAir({ widget }: WeatherFaceProps) {
  const { w, ru, L } = useW(widget);
  return <RingFace value={w.airQualityAqi} max={150} icon={<Wind />} big={`${w.airQualityAqi}`} label={`${L("AQI", "ИКВ")} · ${ru ? w.airQualityTextRu : w.airQualityText}`} />;
}

function RingFace({ value, max = 100, icon, big, label }: { value: number; max?: number; icon: ReactNode; big: string; label: string }) {
  return (
    <div className="m3w m3w--bare">
      <svg viewBox="0 0 100 100" className="m3w-svg" aria-hidden="true">
        <circle cx={50} cy={50} r={49} fill={C.container} />
      </svg>
      <div style={{ position: "absolute", inset: "7%" }}>
        <Ring value={value} max={max} />
      </div>
      <div className="m3w-center" style={{ color: C.onContainer }}>
        <span style={{ width: "11cqmin", height: "11cqmin", color: C.accent, display: "flex" }}>{icon}</span>
        <div className="m3w-temp" style={{ fontSize: "20cqmin" }}>
          {big}
        </div>
        <div className="m3w-muted m3w-clip" style={{ fontSize: "6.5cqmin", fontWeight: 600, maxWidth: "62cqmin" }}>
          {label}
        </div>
      </div>
    </div>
  );
}

/** Moon phase drawn from illumination. */
export function M3WMoon({ widget }: WeatherFaceProps) {
  const { w, ru } = useW(widget);
  const f = Math.max(0, Math.min(100, w.moonIllumination)) / 100;
  const waxing = !/waning|убыв/i.test(w.moonPhaseName + w.moonPhaseNameRu);
  // Terminator: ellipse whose x-radius goes from +r (new) to -r (full).
  const r = 30;
  const rx = Math.abs(r * (1 - 2 * f));
  const lit = waxing ? 1 : 0;
  const sweepOuter = lit;
  const sweepInner = f > 0.5 ? lit : 1 - lit;
  const d = `M50 ${50 - r} A${r} ${r} 0 0 ${sweepOuter} 50 ${50 + r} A${rx} ${r} 0 0 ${sweepInner} 50 ${50 - r} Z`;
  return (
    <div className="m3w m3w--bare">
      <svg viewBox="0 0 100 100" className="m3w-svg" aria-hidden="true">
        <path d={shapePath("squircle")} fill={C.container} />
        <g transform="translate(0 -8)">
          <circle cx={50} cy={50} r={r} fill={C.track} />
          <path d={d} fill={C.accent} />
        </g>
      </svg>
      <div className="m3w-center" style={{ color: C.onContainer, justifyContent: "flex-end", paddingBottom: "10cqmin" }}>
        <div className="m3w-temp" style={{ fontSize: "11cqmin" }}>
          {Math.round(f * 100)}%
        </div>
        <div className="m3w-muted m3w-clip" style={{ fontSize: "6.5cqmin", fontWeight: 600, maxWidth: "70cqmin" }}>
          {ru ? w.moonPhaseNameRu : w.moonPhaseName}
        </div>
      </div>
    </div>
  );
}

/** Time on the left, weather in an accent capsule on the right. */
export function M3WCombo({ widget }: WeatherFaceProps) {
  const { w, condition, lang } = useW(widget);
  const now = useNow();
  const t = getClockTime(now, lang, "local", "auto");
  return (
    <Card className="m3w-combo">
      <div className="m3w-col" style={{ minWidth: 0, flex: 1 }}>
        <span className="m3w-temp" style={{ fontSize: "40cqh" }}>
          {t.hour}:{t.minute}
        </span>
        <span className="m3w-clip m3w-muted" style={{ fontSize: "11cqh", fontWeight: 600 }}>
          {t.date}
        </span>
      </div>
      <div className="m3w-combo-side" style={{ background: C.accent, color: C.onAccent }}>
        <Ico cond={w.conditionKey} isDay={w.isDay} style={{ width: "26cqh", height: "26cqh" }} />
        <span className="m3w-temp" style={{ fontSize: "26cqh" }}>
          {w.temp}°
        </span>
        <span className="m3w-clip" style={{ fontSize: "9cqh", fontWeight: 600, maxWidth: "100%" }}>
          {condition}
        </span>
      </div>
    </Card>
  );
}

export type { W };
