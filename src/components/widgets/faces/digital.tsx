import type { CSSProperties } from "react";
import { C, Colon, Period, type FaceProps } from "./parts";
import type { ClockTime } from "../../../lib/clock";
import { BINARY, MATRIX, SEGMENT, binarySize, matrixColumns, segmentWidth, timeTokens } from "../../../lib/faces";
import { shapePath, type ShapeId } from "../../../lib/shapes";

const pad2 = (value: number) => String(value).padStart(2, "0");

/** Plain digits for drawn displays (segments, dots, bits); 12-hour clocks blank the leading zero. */
function timeDigits(time: ClockTime, seconds: boolean) {
  const digits = [...pad2(time.hourNum), ...pad2(time.m), ...(seconds ? pad2(time.s) : "")].map(Number);
  return { digits, blankFirst: time.h12 && time.hourNum < 10 };
}

export function Stacked({ time, date }: FaceProps) {
  const size = date ? "40cqh" : "45cqh";
  return (
    <div className="wf-html wf-col">
      <div className="wf-num wf-heavy" style={{ fontSize: size, color: C.accent }}>
        {time.hour}
        <Period time={time} />
      </div>
      <div className="wf-num wf-heavy" style={{ fontSize: size, color: C.soft }}>
        {time.minute}
      </div>
      {date && (
        <div className="wf-sub" style={{ fontSize: "9cqh", marginTop: "4cqh" }}>
          {time.date}
        </div>
      )}
    </div>
  );
}

export function Bubbles({ time, seconds }: FaceProps) {
  return (
    <div className="wf-html wf-row" style={{ gap: "5cqh" }}>
      <div className="wf-bubble" style={{ background: C.accent, color: C.onAccent }}>
        <span className="wf-num" style={{ fontSize: time.h12 ? "38cqh" : "44cqh" }}>
          {time.hour}
        </span>
        {time.h12 && <span style={{ fontSize: "9cqh", fontWeight: 600 }}>{time.dayPeriod}</span>}
      </div>
      <div className="wf-bubble" style={{ background: C.container, color: C.onContainer }}>
        {seconds && <span className="wf-ring" style={{ "--p": (time.s / 60) * 100 } as CSSProperties} />}
        <span className="wf-num" style={{ fontSize: "44cqh" }}>
          {time.minute}
        </span>
      </div>
    </div>
  );
}

const SHAPE_CELLS: { shape: ShapeId; fill: string; ink: string; x: number; y: number }[] = [
  { shape: "cookie9", fill: C.accent, ink: C.onAccent, x: 25, y: 25 },
  { shape: "clover4", fill: C.container, ink: C.onContainer, x: 75, y: 25 },
  { shape: "gem", fill: C.pop, ink: C.onPop, x: 25, y: 75 },
  { shape: "softSquare", fill: C.container, ink: C.onContainer, x: 75, y: 75 },
];

export function Shapes({ time }: FaceProps) {
  const chars = [...Array.from(time.num(time.hourNum, 2)), ...Array.from(time.minute)];
  return (
    <svg viewBox="0 0 100 100" className="wf-svg" aria-hidden="true">
      {SHAPE_CELLS.map((cell, index) => (
        <g key={cell.shape}>
          <path d={shapePath(cell.shape)} fill={cell.fill} transform={`translate(${cell.x - 23} ${cell.y - 23}) scale(0.46)`} />
          <text className="wf-t" x={cell.x} y={cell.y + 1} fontSize={27} fontWeight={700} fill={cell.ink} textAnchor="middle" dominantBaseline="central">
            {chars[index] ?? ""}
          </text>
        </g>
      ))}
    </svg>
  );
}

export function Wide({ time, seconds, date }: FaceProps) {
  return (
    <div className="wf-html wf-col">
      <div className="wf-num" style={{ fontSize: date ? "52cqh" : "64cqh", fontWeight: 800, fontStretch: "125%", color: C.fg }}>
        <span>{time.hour}</span>
        <Colon />
        <span>{time.minute}</span>
        {seconds && (
          <span className="wf-secs" style={{ color: C.soft }}>
            {time.second}
          </span>
        )}
        <Period time={time} />
      </div>
      {date && (
        <div className="wf-sub" style={{ fontSize: "12cqh", marginTop: "3cqh" }}>
          {time.date}
        </div>
      )}
    </div>
  );
}

export function Thin({ time, seconds, date }: FaceProps) {
  return (
    <div className="wf-html wf-col">
      {date && (
        <div className="wf-sub wf-caps" style={{ fontSize: "11cqh", color: C.accent, marginBottom: "2cqh" }}>
          {time.date}
        </div>
      )}
      <div className="wf-num" style={{ fontSize: date ? "56cqh" : "68cqh", fontWeight: 200, color: C.fg }}>
        <span>{time.hour}</span>
        <Colon thin />
        <span>{time.minute}</span>
        {seconds && (
          <span className="wf-secs" style={{ color: C.accent }}>
            {time.second}
          </span>
        )}
        <Period time={time} />
      </div>
    </div>
  );
}

function Tile({ value, small = false, label }: { value: string; small?: boolean; label?: string }) {
  return (
    <div className={small ? "wf-tile wf-tile--s" : "wf-tile"}>
      {/* A new key remounts the digits, which replays the flip animation. */}
      <span key={value} className="wf-flip">
        {value}
      </span>
      {label && <em className="wf-tile-label">{label}</em>}
    </div>
  );
}

export function Flip({ time, seconds }: FaceProps) {
  return (
    <div className="wf-html wf-row" style={{ gap: "6cqh" }}>
      <Tile value={time.hour} label={time.h12 ? time.dayPeriod : undefined} />
      <Tile value={time.minute} />
      {seconds && <Tile value={time.second} small />}
    </div>
  );
}

const SEGMENTS_ON: Record<number, string> = {
  0: "abcdef",
  1: "bc",
  2: "abdeg",
  3: "abcdg",
  4: "bcfg",
  5: "acdfg",
  6: "acdefg",
  7: "abc",
  8: "abcdefg",
  9: "abcdfg",
};

function segmentLines(x: number, y: number): [string, number, number, number, number][] {
  const w = SEGMENT.digitWidth;
  const h = SEGMENT.digitHeight;
  const i = 4.5;
  return [
    ["a", x + i, y, x + w - i, y],
    ["b", x + w, y + i, x + w, y + h / 2 - i],
    ["c", x + w, y + h / 2 + i, x + w, y + h - i],
    ["d", x + i, y + h, x + w - i, y + h],
    ["e", x, y + h / 2 + i, x, y + h - i],
    ["f", x, y + i, x, y + h / 2 - i],
    ["g", x + i, y + h / 2, x + w - i, y + h / 2],
  ];
}

export function Segment({ time, seconds }: FaceProps) {
  const { digits, blankFirst } = timeDigits(time, seconds);
  const top = (SEGMENT.height - SEGMENT.digitHeight) / 2;
  let x = SEGMENT.pad;
  let index = 0;
  const nodes = timeTokens(seconds).map((token, key) => {
    let node;
    if (token === "digit") {
      const on = blankFirst && index === 0 ? "" : SEGMENTS_ON[digits[index]];
      node = (
        <g key={key}>
          {segmentLines(x, top).map(([name, x1, y1, x2, y2]) => (
            <line key={name} x1={x1} y1={y1} x2={x2} y2={y2} stroke={on.includes(name) ? C.accent : C.track} />
          ))}
        </g>
      );
      index += 1;
      x += SEGMENT.digitWidth + SEGMENT.gap;
    } else {
      const cx = x + SEGMENT.colon / 2;
      node = (
        <g key={key} fill={C.accent}>
          <circle cx={cx} cy={top + SEGMENT.digitHeight * 0.3} r={3.6} />
          <circle cx={cx} cy={top + SEGMENT.digitHeight * 0.7} r={3.6} />
        </g>
      );
      x += SEGMENT.colon + SEGMENT.gap;
    }
    return node;
  });
  return (
    <svg viewBox={`0 0 ${segmentWidth(seconds)} ${SEGMENT.height}`} className="wf-svg" aria-hidden="true">
      <g strokeWidth={SEGMENT.stroke} strokeLinecap="round">
        {nodes}
      </g>
    </svg>
  );
}

/** Classic 5×7 LED glyphs. */
const GLYPHS: Record<number, string[]> = {
  0: [".###.", "#...#", "#..##", "#.#.#", "##..#", "#...#", ".###."],
  1: ["..#..", ".##..", "..#..", "..#..", "..#..", "..#..", ".###."],
  2: [".###.", "#...#", "....#", "...#.", "..#..", ".#...", "#####"],
  3: ["#####", "...#.", "..#..", "...#.", "....#", "#...#", ".###."],
  4: ["...#.", "..##.", ".#.#.", "#..#.", "#####", "...#.", "...#."],
  5: ["#####", "#....", "####.", "....#", "....#", "#...#", ".###."],
  6: ["..##.", ".#...", "#....", "####.", "#...#", "#...#", ".###."],
  7: ["#####", "....#", "...#.", "..#..", ".#...", ".#...", ".#..."],
  8: [".###.", "#...#", "#...#", ".###.", "#...#", "#...#", ".###."],
  9: [".###.", "#...#", "#...#", ".####", "....#", "...#.", ".##.."],
};

export function Matrix({ time, seconds }: FaceProps) {
  const { digits, blankFirst } = timeDigits(time, seconds);
  const { pitch, dot } = MATRIX;
  const dots = [];
  let column = 1;
  let index = 0;
  for (const [key, token] of timeTokens(seconds).entries()) {
    if (token === "digit") {
      const glyph = blankFirst && index === 0 ? undefined : GLYPHS[digits[index]];
      for (let row = 0; row < 7; row++) {
        for (let col = 0; col < 5; col++) {
          dots.push(
            <circle
              key={`${key}-${row}-${col}`}
              cx={(column + col + 0.5) * pitch}
              cy={(row + 1.5) * pitch}
              r={dot}
              fill={glyph?.[row][col] === "#" ? C.accent : C.track}
            />,
          );
        }
      }
      column += 5;
      index += 1;
    } else {
      for (let row = 0; row < 7; row++) {
        dots.push(<circle key={`${key}-${row}`} cx={(column + 0.5) * pitch} cy={(row + 1.5) * pitch} r={dot} fill={row === 2 || row === 4 ? C.accent : C.track} />);
      }
      column += 1;
    }
    column += 1;
  }
  return (
    <svg viewBox={`0 0 ${matrixColumns(seconds) * pitch} ${MATRIX.rows * pitch}`} className="wf-svg" aria-hidden="true">
      {dots}
    </svg>
  );
}

const BCD_BITS = [2, 4, 3, 4, 3, 4];

export function Binary({ time, seconds }: FaceProps) {
  const values = [
    Math.floor(time.hourNum / 10),
    time.hourNum % 10,
    Math.floor(time.m / 10),
    time.m % 10,
    ...(seconds ? [Math.floor(time.s / 10), time.s % 10] : []),
  ];
  const { pitch, dot, group, pad } = BINARY;
  const size = binarySize(values.length);
  const r = dot / 2;
  return (
    <svg viewBox={`0 0 ${size.width} ${size.height}`} className="wf-svg" aria-hidden="true">
      {values.map((value, column) => {
        const cx = pad + r + column * pitch + Math.floor(column / 2) * group;
        return Array.from({ length: 4 }, (_, row) => {
          const bit = 3 - row;
          if (bit >= BCD_BITS[column]) return null;
          return <circle key={`${column}-${row}`} cx={cx} cy={pad + r + row * pitch} r={r} fill={(value >> bit) & 1 ? C.accent : C.track} />;
        });
      })}
    </svg>
  );
}

export function Calendar({ time }: FaceProps) {
  return (
    <div className="wf-html wf-row" style={{ gap: "9cqh", justifyContent: "flex-start" }}>
      <svg viewBox="0 0 100 100" className="wf-svg" style={{ width: "100cqh", height: "100cqh", flexShrink: 0 }} aria-hidden="true">
        <path d={shapePath("cookie9")} fill={C.accent} />
        <text
          className="wf-t"
          x={50}
          y={52}
          fontSize={time.day.length > 1 ? 44 : 50}
          fontWeight={800}
          fill={C.onAccent}
          textAnchor="middle"
          dominantBaseline="central"
        >
          {time.day}
        </text>
      </svg>
      <div className="wf-col" style={{ alignItems: "flex-start", minWidth: 0, flex: 1 }}>
        <div className="wf-clip" style={{ fontSize: "23cqh", fontWeight: 700, color: C.fg }}>
          {time.weekdayLong}
        </div>
        <div className="wf-clip" style={{ fontSize: "16cqh", color: C.muted }}>
          {time.monthLong}
        </div>
        <div className="wf-num" style={{ fontSize: "25cqh", fontWeight: 600, color: C.accent, marginTop: "5cqh" }}>
          {time.hour}:{time.minute}
          <Period time={time} />
        </div>
      </div>
    </div>
  );
}

export function Glance({ time, date }: FaceProps) {
  return (
    <div className="wf-html wf-row" style={{ background: C.container, color: C.onContainer, borderRadius: 9999, gap: "8cqh", padding: "0 13cqh" }}>
      <span className="wf-num" style={{ fontSize: "44cqh", fontWeight: 700 }}>
        {time.hour}:{time.minute}
        <Period time={time} />
      </span>
      {date && (
        <>
          <i className="wf-divider" />
          <span className="wf-clip" style={{ fontSize: "27cqh", fontWeight: 500 }}>
            {time.date}
          </span>
        </>
      )}
    </div>
  );
}

/** Time and an M3 Expressive wavy linear indicator showing how much of the day has passed. */
export function Progress({ time, date }: FaceProps) {
  const x0 = 6;
  const x1 = 226;
  const mid = 12;
  const end = x0 + time.dayProgress * (x1 - x0);
  let wave = `M${x0} ${mid}`;
  for (let x = x0 + 1; x <= end; x += 1) wave += `L${x} ${(mid + 3 * Math.sin(((x - x0) / 18) * Math.PI * 2)).toFixed(2)}`;
  return (
    <div className="wf-html wf-col" style={{ alignItems: "stretch", padding: "6cqh 4cqh", gap: "8cqh" }}>
      <div className="wf-row" style={{ justifyContent: "space-between", alignItems: "baseline", gap: "6cqh" }}>
        <span className="wf-num" style={{ fontSize: "44cqh", fontWeight: 700, color: C.fg }}>
          {time.hour}:{time.minute}
          <Period time={time} />
        </span>
        {date && (
          <span className="wf-clip" style={{ fontSize: "15cqh", color: C.muted }}>
            {time.date}
          </span>
        )}
      </div>
      <svg viewBox="0 0 232 24" className="wf-svg" style={{ height: "24cqh" }} aria-hidden="true">
        {end + 8 < x1 && <line x1={end + 8} y1={mid} x2={x1} y2={mid} stroke={C.track} strokeWidth={4} strokeLinecap="round" />}
        <path d={wave} fill="none" stroke={C.accent} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={x1} cy={mid} r={2} fill={C.accent} />
      </svg>
    </div>
  );
}
