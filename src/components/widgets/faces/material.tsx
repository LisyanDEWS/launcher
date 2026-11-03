import { Bar, C, Cap, Dots, Period, Seconds, Shape, Svg, Turn, Txt, hourAngle, minuteAngle, polar, type FaceProps } from "./parts";
import { firstDayOfWeek } from "./calendar";

/* ---------- Material You 2025 clock faces: tonal containers, expressive shapes, bold type ---------- */

/** Hour on an accent pill, minutes on a tonal pill. */
export function M3Pill({ time, date }: FaceProps) {
  const row = date ? 74 : 100;
  return (
    <div className="wf-html wf-col" style={{ gap: date ? "6cqh" : 0, justifyContent: "center" }}>
      <div className="wf-row" style={{ width: "100%", height: `${row}cqh`, gap: "3cqw" }}>
        <div className="m3-pill" style={{ background: C.accent, color: C.onAccent, fontSize: `${row * 0.62}cqh` }}>
          {time.hour}
        </div>
        <div className="m3-pill" style={{ background: C.container, color: C.onContainer, fontSize: `${row * 0.62}cqh` }}>
          {time.minute}
          {time.h12 && <span className="m3-ampm">{time.dayPeriod}</span>}
        </div>
      </div>
      {date && (
        <div className="wf-clip" style={{ fontSize: "15cqh", fontWeight: 600, color: C.muted }}>
          {time.date}
        </div>
      )}
    </div>
  );
}

/** Two stacked rounded tiles — reads like a Pixel lock-screen clock. */
export function M3Tiles({ time }: FaceProps) {
  return (
    <div className="wf-html wf-col" style={{ gap: "4cqh" }}>
      <div className="m3-tile" style={{ background: C.accent, color: C.onAccent, borderRadius: "30% 30% 14% 14% / 46% 46% 20% 20%" }}>
        {time.hour}
      </div>
      <div className="m3-tile" style={{ background: C.container, color: C.onContainer, borderRadius: "14% 14% 30% 30% / 20% 20% 46% 46%" }}>
        {time.minute}
        {time.h12 && <span className="m3-ampm">{time.dayPeriod}</span>}
      </div>
    </div>
  );
}

/** Progress ring for the current minute/hour with digital time in the middle. */
export function M3Ring({ time, seconds, date }: FaceProps) {
  const progress = seconds ? time.s / 60 : (time.m + time.s / 60) / 60;
  return (
    <div className="wf-html">
      <Svg>
        <circle cx={50} cy={50} r={48} fill={C.container} />
        <circle cx={50} cy={50} r={41} fill="none" stroke={C.track} strokeWidth={6} />
        <circle
          cx={50}
          cy={50}
          r={41}
          fill="none"
          stroke={C.accent}
          strokeWidth={6}
          strokeLinecap="round"
          pathLength={100}
          strokeDasharray={`${Math.max(0.5, progress * 100)} 100`}
          transform="rotate(-90 50 50)"
          className="m3-arc"
        />
        <Txt y={date ? 46 : 50} size={24} weight={750} color={C.onContainer}>
          {`${time.hour}:${time.minute}`}
        </Txt>
        {date && (
          <Txt y={64} size={9} weight={600} color={C.accent}>
            {time.weekday}
          </Txt>
        )}
      </Svg>
    </div>
  );
}

/** Large time with a tonal chip for seconds (or the weekday). */
export function M3Chip({ time, seconds }: FaceProps) {
  return (
    <div className="wf-html wf-row" style={{ gap: "6cqh", justifyContent: "center" }}>
      <div className="wf-num" style={{ fontSize: "78cqh", fontWeight: 750, color: C.fg, letterSpacing: "-0.03em" }}>
        {time.hour}
        <span style={{ color: C.accent }}>:</span>
        {time.minute}
      </div>
      <div className="wf-col" style={{ gap: "6cqh" }}>
        <div className="m3-chip" style={{ background: C.accent, color: C.onAccent }}>
          {seconds ? time.second : time.weekday}
        </div>
        {time.h12 && (
          <div className="m3-chip" style={{ background: C.container, color: C.onContainer }}>
            {time.dayPeriod}
          </div>
        )}
      </div>
    </div>
  );
}

/** Scalloped cookie dial with a chunky accent hour hand. */
export function M3Scallop({ time, seconds, sweep, date }: FaceProps) {
  return (
    <Svg>
      <Shape id="cookie12" fill={C.container} />
      <Dots radius={38} size={1.8} color={C.onContainer} opacity={0.45} />
      {date && (
        <g>
          <rect x={60} y={44} width={22} height={12} rx={6} fill={C.accent} />
          <Txt x={71} y={50.2} size={7} weight={700} color={C.onAccent}>
            {time.day}
          </Txt>
        </g>
      )}
      <Turn angle={hourAngle(time)}>
        <Bar length={22} width={9} color={C.accent} />
      </Turn>
      <Turn angle={minuteAngle(time)}>
        <Bar length={34} width={5} color={C.onContainer} />
      </Turn>
      {seconds && (
        <Seconds time={time} sweep={sweep}>
          <circle cx={50} cy={14} r={3.2} fill={C.pop} />
        </Seconds>
      )}
      <Cap r={4.5} color={C.onContainer} inner={C.container} />
    </Svg>
  );
}

/** Soft-square dial with numerals at the quarters. */
export function M3Gem({ time, date }: FaceProps) {
  return (
    <Svg>
      <Shape id="softSquare" fill={C.container} />
      {[12, 3, 6, 9].map((value) => {
        const p = polar(36, (value % 12) / 12);
        return (
          <Txt key={value} x={p.x} y={p.y} size={11} weight={700} color={C.onContainer}>
            {time.num(value)}
          </Txt>
        );
      })}
      {date && (
        <Txt y={68} size={7} weight={600} color={C.accent}>
          {time.weekday}
        </Txt>
      )}
      <Turn angle={hourAngle(time)}>
        <Bar length={20} width={8} color={C.accent} />
      </Turn>
      <Turn angle={minuteAngle(time)}>
        <Bar length={31} width={5} color={C.pop} />
      </Turn>
      <Cap r={3.5} color={C.onContainer} />
    </Svg>
  );
}

/** Hour shown as a filling arc, minute as an orbiting dot, digital time in the middle. */
export function M3Arc({ time, date }: FaceProps) {
  const hourProgress = ((time.h % 12) + time.m / 60) / 12;
  const dot = polar(41, (time.m + time.s / 60) / 60);
  return (
    <Svg>
      <circle cx={50} cy={50} r={48} fill={C.container} />
      <circle cx={50} cy={50} r={41} fill="none" stroke={C.track} strokeWidth={7} />
      <circle
        cx={50}
        cy={50}
        r={41}
        fill="none"
        stroke={C.accent}
        strokeWidth={7}
        strokeLinecap="round"
        pathLength={100}
        strokeDasharray={`${Math.max(0.5, hourProgress * 100)} 100`}
        transform="rotate(-90 50 50)"
        className="m3-arc"
      />
      <circle cx={dot.x} cy={dot.y} r={5.5} fill={C.pop} stroke={C.container} strokeWidth={2} />
      <Txt y={date ? 46 : 50} size={22} weight={750} color={C.onContainer}>
        {`${time.hour}:${time.minute}`}
      </Txt>
      {date && (
        <Txt y={63} size={8} weight={600} color={C.muted}>
          {time.date}
        </Txt>
      )}
    </Svg>
  );
}

/** Solid accent disc with tonal hands and an orbiting seconds dot. */
export function M3Dot({ time, seconds, sweep }: FaceProps) {
  return (
    <Svg>
      <circle cx={50} cy={50} r={48} fill={C.accent} />
      <Turn angle={hourAngle(time)}>
        <Bar length={21} width={10} color={C.onAccent} />
      </Turn>
      <Turn angle={minuteAngle(time)}>
        <Bar length={33} width={6} color={C.onAccent} opacity={0.75} />
      </Turn>
      {seconds && (
        <Seconds time={time} sweep={sweep}>
          <circle cx={50} cy={8} r={3} fill={C.container} />
        </Seconds>
      )}
      <Cap r={4} color={C.container} />
    </Svg>
  );
}

export { Period };

/* ---------- Material You extras (battery-free, data-free widgets) ---------- */

/** Day progress as a wide bar with hour ticks; reads at a glance from across the room. */
export function M3DayBar({ time, seconds }: FaceProps) {
  const progress = Math.max(0, Math.min(1, time.dayProgress));
  return (
    <div className="wf-html wf-col" style={{ gap: "7cqh", justifyContent: "center" }}>
      <div className="wf-row" style={{ width: "100%", alignItems: "baseline" }}>
        <span style={{ fontSize: "30cqh", fontWeight: 800, letterSpacing: "-0.03em", color: C.fg, lineHeight: 1 }}>
          {time.hour}
          <span style={{ color: C.accent }}>:</span>
          {time.minute}
          <Period time={time} />
        </span>
        <span style={{ fontSize: "12cqh", fontWeight: 700, color: C.accent, marginLeft: "auto" }}>
          {time.num(progress > 0.5 ? Math.ceil(progress * 100) : Math.floor(progress * 100))}%
        </span>
      </div>
      <div style={{ position: "relative", width: "100%", height: "12cqh", background: C.track, borderRadius: 999 }}>
        <span style={{ position: "absolute", inset: 0, right: `${(1 - progress) * 100}%`, background: C.accent, borderRadius: 999, transition: "right 700ms var(--ui-spring)" }} />
        {[6, 12, 18].map((tick) => (
          <span key={tick} style={{ position: "absolute", left: `${(tick / 24) * 100}%`, top: "-3cqh", bottom: "-3cqh", width: 2, background: C.onContainer, opacity: 0.35 }} />
        ))}
        <span style={{ position: "absolute", left: `calc(${progress * 100}% - 6cqh)`, top: "-6cqh", width: "12cqh", height: "12cqh", borderRadius: "50%", background: C.pop, transition: "left 700ms var(--ui-spring)" }} />
      </div>
      <div className="wf-clip" style={{ fontSize: "11cqh", fontWeight: 600, color: C.muted }}>
        {seconds ? `${time.hour}:${time.minute}:${time.second}` : time.date}
      </div>
    </div>
  );
}

const weekdayShortCache = new Map<string, Intl.DateTimeFormat>();
function weekdayShort(lang: string, date: Date) {
  let format = weekdayShortCache.get(lang);
  if (!format) {
    try { format = new Intl.DateTimeFormat(lang, { weekday: "short", timeZone: "UTC" }); }
    catch { format = new Intl.DateTimeFormat("en", { weekday: "short", timeZone: "UTC" }); }
    weekdayShortCache.set(lang, format);
  }
  return format.format(date);
}

/** A week strip: today as a tall accent pill, the rest as tonal dots. */
export function M3WeekStrip({ time }: FaceProps) {
  const first = firstDayOfWeek(time.lang);
  const today = new Date(Date.UTC(time.year, time.month - 1, time.dayOfMonth));
  const offset = (today.getUTCDay() - first + 7) % 7;
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(Date.UTC(time.year, time.month - 1, time.dayOfMonth - offset + i));
    return { day: date.getUTCDate(), name: weekdayShort(time.lang, date), weekend: date.getUTCDay() === 0 || date.getUTCDay() === 6 };
  });
  return (
    <div className="wf-html wf-col" style={{ gap: "8cqh", justifyContent: "center" }}>
      <div className="wf-clip" style={{ fontSize: "14cqh", fontWeight: 700, color: C.fg, alignSelf: "flex-start" }}>
        {time.weekdayLong}
      </div>
      <div style={{ display: "flex", gap: "2.5cqw", width: "100%", alignItems: "flex-end" }}>
        {days.map((day, i) => {
          const active = i === offset;
          return (
            <div key={i} className="wf-col" style={{ flex: 1, alignItems: "center", gap: "4cqh" }}>
              <span style={{ fontSize: "10cqh", fontWeight: 650, color: active ? C.onAccent : C.muted, textTransform: "capitalize" }}>{day.name}</span>
              <span
                style={{
                  width: "100%",
                  aspectRatio: "1",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: "50%",
                  background: active ? C.accent : C.container,
                  color: active ? C.onAccent : day.weekend ? C.accent : C.onContainer,
                  fontSize: "13cqh",
                  fontWeight: active ? 800 : 600,
                }}
              >
                {time.num(day.day)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** A stacked battery-style meter: three tiles show how far the day, hour and minute have come. */
export function M3Stacked({ time }: FaceProps) {
  const tiles = [
    { label: time.lang.startsWith("ru") ? "День" : "Day", fill: time.dayProgress, caption: `${time.hour}:${time.minute}` },
    { label: time.lang.startsWith("ru") ? "Час" : "Hour", fill: (time.m + time.s / 60) / 60, caption: `${time.minute}${time.h12 ? ` ${time.dayPeriod}` : ""}` },
    { label: time.lang.startsWith("ru") ? "Мин" : "Min", fill: time.s / 60, caption: time.second },
  ];
  return (
    <div className="wf-html wf-col" style={{ gap: "6cqh", justifyContent: "center" }}>
      <div className="wf-clip" style={{ fontSize: "20cqh", fontWeight: 800, color: C.fg, letterSpacing: "-0.02em", alignSelf: "flex-start", lineHeight: 1 }}>
        {time.hour}
        <span style={{ color: C.accent }}>:</span>
        {time.minute}
      </div>
      {tiles.map((tile) => (
        <div key={tile.label} className="wf-row" style={{ width: "100%", gap: "4cqw", alignItems: "center" }}>
          <span style={{ fontSize: "10cqh", fontWeight: 650, color: C.muted, width: "18cqw", flexShrink: 0 }}>{tile.label}</span>
          <span style={{ flex: 1, height: "10cqh", background: C.track, borderRadius: 999, overflow: "hidden" }}>
            <span style={{ display: "block", width: `${Math.max(2, tile.fill * 100)}%`, height: "100%", background: C.accent, borderRadius: 999, transition: "width 600ms var(--ui-spring)" }} />
          </span>
          <span className="wf-clip" style={{ fontSize: "11cqh", fontWeight: 650, color: C.fg, width: "24cqw", textAlign: "end" }}>
            {tile.caption}
          </span>
        </div>
      ))}
    </div>
  );
}

/** Big date + a thin ring that fills as the day goes by. */
export function M3DateRing({ time }: FaceProps) {
  return (
    <Svg>
      <circle cx={50} cy={50} r={48} fill={C.container} />
      <circle cx={50} cy={50} r={40} fill="none" stroke={C.track} strokeWidth={5} />
      <circle
        cx={50}
        cy={50}
        r={40}
        fill="none"
        stroke={C.accent}
        strokeWidth={5}
        strokeLinecap="round"
        pathLength={100}
        strokeDasharray={`${Math.max(0.5, time.dayProgress * 100)} 100`}
        transform="rotate(-90 50 50)"
        className="m3-arc"
      />
      <Txt y={44} size={30} weight={800} color={C.onContainer}>
        {time.day}
      </Txt>
      <Txt y={62} size={9} weight={650} color={C.accent}>
        {time.monthLong.slice(0, 3)}
      </Txt>
      <Txt y={76} size={9} weight={600} color={C.muted}>
        {`${time.hour}:${time.minute}`}
      </Txt>
    </Svg>
  );
}

/** Tiny "chip row" clock: hour, colon, minute and AM/PM as separate rounded tiles. */
export function M3Chips({ time, date }: FaceProps) {
  const chars = [...`${time.hour}:${time.minute}`];
  return (
    <div className="wf-html wf-col" style={{ gap: date ? "6cqh" : 0, justifyContent: "center" }}>
      <div className="wf-row" style={{ width: "100%", justifyContent: "center", gap: "2cqw" }}>
        {chars.map((char, i) => (
          <span
            key={i}
            style={{
              minWidth: char === ":" ? "8cqw" : "18cqw",
              height: "34cqh",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: char === ":" ? "50%" : "10cqh",
              background: char === ":" ? "transparent" : i < chars.indexOf(":") ? C.accent : C.container,
              color: char === ":" ? C.accent : i < chars.indexOf(":") ? C.onAccent : C.onContainer,
              fontSize: "22cqh",
              fontWeight: 800,
            }}
          >
            {char}
          </span>
        ))}
        {time.h12 && (
          <span style={{ alignSelf: "flex-end", fontSize: "10cqh", fontWeight: 750, color: C.accent, marginLeft: "1cqw" }}>{time.dayPeriod}</span>
        )}
      </div>
      {date && (
        <div className="wf-clip" style={{ fontSize: "13cqh", fontWeight: 600, color: C.muted, textAlign: "center" }}>
          {time.date}
        </div>
      )}
    </div>
  );
}
