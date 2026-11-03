import { useMemo } from "react";
import { C, type FaceProps } from "./parts";
import { shapePath } from "../../../lib/shapes";

/* ---------- Material You calendar widgets ---------- */

const weekdayFormats = new Map<string, Intl.DateTimeFormat>();

function weekdayName(lang: string, utcDay: Date, style: "narrow" | "short") {
  const key = `${lang}|${style}`;
  let format = weekdayFormats.get(key);
  if (!format) {
    try {
      format = new Intl.DateTimeFormat(lang, { weekday: style, timeZone: "UTC" });
    } catch {
      format = new Intl.DateTimeFormat("en", { weekday: style, timeZone: "UTC" });
    }
    weekdayFormats.set(key, format);
  }
  return format.format(utcDay);
}

/** 0 = Sunday, 1 = Monday… Uses Intl week info where available. */
export function firstDayOfWeek(lang: string): number {
  try {
    const locale = new Intl.Locale(lang) as Intl.Locale & { weekInfo?: { firstDay: number }; getWeekInfo?: () => { firstDay: number } };
    const info = locale.getWeekInfo?.() ?? locale.weekInfo;
    if (info?.firstDay) return info.firstDay % 7;
  } catch {
    /* fall through */
  }
  return /^(en-US|en|ja|ko|zh|he|ar|pt-BR|hi)/i.test(lang) && !/^en-(GB|AU|IE|NZ|ZA)/i.test(lang) ? 0 : 1;
}

const daysInMonth = (year: number, month: number) => new Date(Date.UTC(year, month, 0)).getUTCDate();
const isLeap = (year: number) => (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
const dayOfYear = (year: number, month: number, day: number) => Math.round((Date.UTC(year, month - 1, day) - Date.UTC(year, 0, 0)) / 86400000);

/** Monthly grid with today highlighted by an expressive cookie shape. */
export function CalMonth({ time }: FaceProps) {
  const { year, month, dayOfMonth, lang } = time;
  const grid = useMemo(() => {
    const first = firstDayOfWeek(lang);
    const startWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
    const lead = (startWeekday - first + 7) % 7;
    const total = daysInMonth(year, month);
    const cells: (number | null)[] = [...Array(lead).fill(null), ...Array.from({ length: total }, (_, i) => i + 1)];
    while (cells.length % 7) cells.push(null);
    // Header letters: 2024-01-07 was a Sunday.
    const heads = Array.from({ length: 7 }, (_, i) => weekdayName(lang, new Date(Date.UTC(2024, 0, 7 + ((first + i) % 7))), "narrow"));
    const weekendCols = Array.from({ length: 7 }, (_, i) => {
      const wd = (first + i) % 7;
      return wd === 0 || wd === 6;
    });
    return { cells, heads, weekendCols, rows: cells.length / 7 };
  }, [year, month, lang]);

  return (
    <div className="cal-card" style={{ background: C.container, color: C.onContainer }}>
      <div className="cal-head">
        <span className="cal-month">{time.monthLong}</span>
        <span className="cal-year" style={{ color: C.accent }}>
          {time.num(year)}
        </span>
      </div>
      <div className="cal-grid" style={{ gridTemplateRows: `auto repeat(${grid.rows}, 1fr)` }}>
        {grid.heads.map((head, i) => (
          <span key={`h${i}`} className="cal-dow" style={{ color: grid.weekendCols[i] ? C.accent : undefined }}>
            {head}
          </span>
        ))}
        {grid.cells.map((day, i) => {
          const today = day === dayOfMonth;
          return (
            <span key={i} className={day ? "cal-day" : "cal-day cal-day--empty"} style={{ opacity: day && grid.weekendCols[i % 7] && !today ? 0.7 : undefined }}>
              {today && (
                <svg viewBox="0 0 100 100" className="cal-today" aria-hidden="true">
                  <path d={shapePath("cookie9")} fill={C.accent} />
                </svg>
              )}
              <span style={{ position: "relative", color: today ? C.onAccent : undefined, fontWeight: today ? 800 : undefined }}>{day ? time.num(day) : ""}</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}

/** Today as a big tear-off style tile. */
export function CalDay({ time }: FaceProps) {
  return (
    <div className="cal-card cal-card--center" style={{ background: C.container, color: C.onContainer }}>
      <div className="cal-band" style={{ background: C.accent, color: C.onAccent }}>
        {time.weekdayLong}
      </div>
      <div className="cal-big">{time.day}</div>
      <div className="cal-sub">
        {time.monthLong} {time.num(time.year)}
      </div>
    </div>
  );
}

/** The current week as a row of pills; today is a tall accent pill. */
export function CalWeek({ time }: FaceProps) {
  const { year, month, dayOfMonth, lang } = time;
  const days = useMemo(() => {
    const first = firstDayOfWeek(lang);
    const today = new Date(Date.UTC(year, month - 1, dayOfMonth));
    const offset = (today.getUTCDay() - first + 7) % 7;
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(Date.UTC(year, month - 1, dayOfMonth - offset + i));
      return { date: d.getUTCDate(), name: weekdayName(lang, d, "short"), today: i === offset, weekend: d.getUTCDay() === 0 || d.getUTCDay() === 6 };
    });
  }, [year, month, dayOfMonth, lang]);

  return (
    <div className="cal-week">
      {days.map((d) => (
        <div
          key={`${d.name}${d.date}`}
          className={d.today ? "cal-week-day is-today" : "cal-week-day"}
          style={{ background: d.today ? C.accent : C.container, color: d.today ? C.onAccent : C.onContainer }}
        >
          <span className="cal-week-name" style={{ color: !d.today && d.weekend ? C.accent : undefined }}>
            {d.name}
          </span>
          <span className="cal-week-num">{time.num(d.date)}</span>
        </div>
      ))}
    </div>
  );
}

/** How far through the year we are, month by month. */
export function CalYear({ time }: FaceProps) {
  const { year, month, dayOfMonth } = time;
  const total = isLeap(year) ? 366 : 365;
  const doy = dayOfYear(year, month, dayOfMonth);
  const pct = Math.round(((doy - 1 + time.dayProgress) / total) * 100);
  const monthFill = (dayOfMonth - 1 + time.dayProgress) / daysInMonth(year, month);

  return (
    <div className="cal-card cal-year-card" style={{ background: C.container, color: C.onContainer }}>
      <div className="cal-year-top">
        <div>
          <div className="cal-year-num">{time.num(year)}</div>
          <div className="cal-sub" style={{ textAlign: "start" }}>
            {time.lang.startsWith("ru") ? `день ${time.num(doy)} из ${time.num(total)}` : `Day ${time.num(doy)} of ${time.num(total)}`}
          </div>
        </div>
        <div className="cal-year-pct" style={{ background: C.accent, color: C.onAccent }}>
          {time.num(pct)}%
        </div>
      </div>
      <div className="cal-months">
        {Array.from({ length: 12 }, (_, i) => {
          const fill = i + 1 < month ? 1 : i + 1 === month ? monthFill : 0;
          return (
            <span key={i} className="cal-month-bar" style={{ background: C.track }}>
              <i style={{ height: `${Math.max(fill > 0 ? 8 : 0, fill * 100)}%`, background: i + 1 === month ? C.pop : C.accent }} />
            </span>
          );
        })}
      </div>
    </div>
  );
}
