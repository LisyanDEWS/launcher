import { useSyncExternalStore } from "react";
import type { HourCycle } from "./settings";

/* ---------- one shared 1 Hz ticker for every clock on the page ---------- */

let now = Date.now();
let timer = 0;
const listeners = new Set<() => void>();

function tick() {
  now = Date.now();
  listeners.forEach((listener) => listener());
  timer = window.setTimeout(tick, 1000 - (Date.now() % 1000) + 5);
}

function handleVisibility() {
  if (document.visibilityState !== "visible") return;
  window.clearTimeout(timer);
  tick();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) {
    now = Date.now(); // React re-reads the snapshot after subscribing
    timer = window.setTimeout(tick, 1000 - (now % 1000) + 5);
    document.addEventListener("visibilitychange", handleVisibility);
  }
  return () => {
    listeners.delete(listener);
    if (!listeners.size) {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", handleVisibility);
    }
  };
}

const snapshot = () => now;

/** Current time in ms, updated on every second boundary. */
export const useNow = () => useSyncExternalStore(subscribe, snapshot, snapshot);

/* ---------- time in a zone, localised ---------- */

export type ClockTime = {
  /** Wall-clock values in the widget's time zone (24-hour). */
  h: number;
  m: number;
  s: number;
  h12: boolean;
  /** 1–12 or 0–23 depending on the hour cycle. */
  hourNum: number;
  /** Localised strings (native digits). */
  hour: string;
  minute: string;
  second: string;
  dayPeriod: string;
  day: string;
  weekday: string;
  weekdayLong: string;
  monthLong: string;
  date: string;
  dayProgress: number;
  num: (value: number, minDigits?: number) => string;
};

const dateFormats = new Map<string, Intl.DateTimeFormat>();

function dtf(locale: string, options: Intl.DateTimeFormatOptions) {
  const key = `${locale}|${JSON.stringify(options)}`;
  let format = dateFormats.get(key);
  if (!format) {
    try {
      format = new Intl.DateTimeFormat(locale, options);
    } catch {
      format = new Intl.DateTimeFormat("en", { ...options, timeZone: undefined });
    }
    dateFormats.set(key, format);
  }
  return format;
}

const numberFormats = new Map<string, Intl.NumberFormat>();

function nf(locale: string, minDigits: number) {
  const key = `${locale}|${minDigits}`;
  let format = numberFormats.get(key);
  if (!format) {
    try {
      format = new Intl.NumberFormat(locale, { minimumIntegerDigits: minDigits, useGrouping: false });
    } catch {
      format = new Intl.NumberFormat("en", { minimumIntegerDigits: minDigits, useGrouping: false });
    }
    numberFormats.set(key, format);
  }
  return format;
}

const zones = new Map<string, string | undefined>();

/** undefined = the device's local zone (also used for unknown zone names). */
function resolveZone(tz: string): string | undefined {
  if (!tz || tz === "local") return undefined;
  if (!zones.has(tz)) {
    try {
      new Intl.DateTimeFormat("en-US", { timeZone: tz });
      zones.set(tz, tz);
    } catch {
      zones.set(tz, undefined);
    }
  }
  return zones.get(tz);
}

type CalendarStrings = Pick<ClockTime, "day" | "weekday" | "weekdayLong" | "monthLong" | "date" | "dayPeriod">;
const calendars = new Map<string, CalendarStrings>();

const NUMERIC: Intl.DateTimeFormatOptions = {
  hourCycle: "h23",
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "numeric",
  second: "numeric",
};

export function getClockTime(time: number, lang: string, tz: string, cycle: HourCycle): ClockTime {
  const timeZone = resolveZone(tz);
  const date = new Date(time);
  const parts = dtf("en-US", { ...NUMERIC, timeZone }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((item) => item.type === type)?.value ?? 0);
  const h = part("hour") % 24;
  const m = part("minute");
  const s = part("second");
  const resolved = cycle === "auto" ? (dtf(lang, { hour: "numeric", timeZone }).resolvedOptions() as { hourCycle?: string }).hourCycle : cycle;
  const h12 = resolved === "h12" || resolved === "h11";
  const hourNum = h12 ? h % 12 || 12 : h;
  const num = (value: number, minDigits = 1) => nf(lang, minDigits).format(value);

  // Date strings only change per day (and AM/PM per half day) — cache them.
  const key = `${lang}|${timeZone ?? ""}|${part("year")}-${part("month")}-${part("day")}|${h < 12 ? "am" : "pm"}`;
  let calendar = calendars.get(key);
  if (!calendar) {
    if (calendars.size > 200) calendars.clear();
    calendar = {
      day: num(part("day")),
      weekday: dtf(lang, { weekday: "short", timeZone }).format(date),
      weekdayLong: dtf(lang, { weekday: "long", timeZone }).format(date),
      monthLong: dtf(lang, { month: "long", timeZone }).format(date),
      date: dtf(lang, { weekday: "short", day: "numeric", month: "short", timeZone }).format(date),
      dayPeriod:
        dtf(lang, { hour: "numeric", hourCycle: "h12", timeZone })
          .formatToParts(date)
          .find((item) => item.type === "dayPeriod")?.value ?? (h < 12 ? "AM" : "PM"),
    };
    calendars.set(key, calendar);
  }

  return {
    h,
    m,
    s,
    h12,
    hourNum,
    hour: num(hourNum, h12 ? 1 : 2),
    minute: num(m, 2),
    second: num(s, 2),
    ...calendar,
    dayPeriod: h12 ? calendar.dayPeriod : "",
    dayProgress: (h * 3600 + m * 60 + s) / 86400,
    num,
  };
}

/* ---------- time zones ---------- */

export type ZoneOption = { id: string; label: string; offset: number };

const FALLBACK_ZONES = [
  "UTC",
  "Pacific/Honolulu",
  "America/Anchorage",
  "America/Los_Angeles",
  "America/Denver",
  "America/Chicago",
  "America/New_York",
  "America/Sao_Paulo",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Africa/Cairo",
  "Africa/Johannesburg",
  "Europe/Istanbul",
  "Europe/Moscow",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Bangkok",
  "Asia/Shanghai",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Asia/Seoul",
  "Australia/Sydney",
  "Pacific/Auckland",
];

export const cityName = (tz: string) => (tz.split("/").pop() ?? tz).replace(/_/g, " ");

function zoneOffset(tz: string, time: number) {
  const parts = dtf("en-US", { ...NUMERIC, timeZone: tz }).formatToParts(new Date(time));
  const part = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((item) => item.type === type)?.value ?? 0);
  const wall = Date.UTC(part("year"), part("month") - 1, part("day"), part("hour") % 24, part("minute"));
  return Math.round((wall - Math.floor(time / 60000) * 60000) / 60000);
}

export function formatOffset(minutes: number) {
  const sign = minutes < 0 ? "−" : "+";
  const abs = Math.abs(minutes);
  return `UTC${sign}${String(Math.floor(abs / 60)).padStart(2, "0")}:${String(abs % 60).padStart(2, "0")}`;
}

let zoneList: ZoneOption[] | null = null;

/** All IANA zones (or a short fallback list), sorted by UTC offset. */
export function timeZoneOptions(): ZoneOption[] {
  if (zoneList) return zoneList;
  const supported = (Intl as unknown as { supportedValuesOf?: (key: string) => string[] }).supportedValuesOf?.("timeZone");
  const ids = (supported?.length ? supported : FALLBACK_ZONES).filter((id) => !id.startsWith("Etc/") || id === "Etc/UTC");
  const time = Date.now();
  zoneList = ids
    .map((id) => {
      const offset = zoneOffset(id, time);
      return { id, offset, label: `${formatOffset(offset)} · ${cityName(id)}` };
    })
    .sort((a, b) => a.offset - b.offset || a.label.localeCompare(b.label));
  return zoneList;
}
