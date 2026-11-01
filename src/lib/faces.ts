import type { ClockFaceId, SecondsMode } from "./settings";

/** What a face actually shows for the current widget options. */
export type FaceFlags = { seconds: boolean; date: boolean };

export type FaceMeta = {
  kind: "analog" | "digital";
  /** Width ÷ height of the face. */
  ratio: (flags: FaceFlags) => number;
  /** Supports the seconds option. */
  seconds: boolean;
  /** Supports a smoothly sweeping second hand. */
  sweep: boolean;
  /** Supports the date option. */
  date: boolean;
  /** Shows text that depends on the 12/24-hour format. */
  format: boolean;
  /** Options applied when a new widget is created with this face. */
  defaults?: { seconds?: SecondsMode; date?: boolean };
};

/* ---------- layouts shared by faces and their aspect ratios ---------- */

export type TimeToken = "digit" | "colon";

export const timeTokens = (seconds: boolean): TimeToken[] =>
  seconds ? ["digit", "digit", "colon", "digit", "digit", "colon", "digit", "digit"] : ["digit", "digit", "colon", "digit", "digit"];

/** Seven-segment display, SVG units. */
export const SEGMENT = { height: 84, digitWidth: 36, digitHeight: 58, stroke: 7, gap: 12, colon: 8, pad: 14 };

export function segmentWidth(seconds: boolean) {
  const tokens = timeTokens(seconds);
  const content = tokens.reduce((sum, token) => sum + (token === "digit" ? SEGMENT.digitWidth : SEGMENT.colon), 0);
  return SEGMENT.pad * 2 + content + (tokens.length - 1) * SEGMENT.gap;
}

/** 5×7 dot-matrix display: sizes in dot pitches. */
export const MATRIX = { pitch: 10, dot: 3.6, rows: 9 };

export function matrixColumns(seconds: boolean) {
  const tokens = timeTokens(seconds);
  return 2 + tokens.reduce((sum, token) => sum + (token === "digit" ? 5 : 1), 0) + (tokens.length - 1);
}

/** Binary-coded decimal display, SVG units. */
export const BINARY = { pitch: 22, dot: 16, group: 12, pad: 12 };

export function binarySize(columns: number) {
  const { pitch, dot, group, pad } = BINARY;
  return { width: pad * 2 + dot + (columns - 1) * pitch + (columns / 2 - 1) * group, height: pad * 2 + dot + 3 * pitch };
}

/* ---------- registry ---------- */

const analog = (extra: Partial<FaceMeta> = {}): FaceMeta => ({
  kind: "analog",
  ratio: () => 1,
  seconds: true,
  sweep: true,
  date: false,
  format: false,
  ...extra,
});

const digital = (ratio: FaceMeta["ratio"], extra: Partial<FaceMeta> = {}): FaceMeta => ({
  kind: "digital",
  ratio,
  seconds: false,
  sweep: false,
  date: false,
  format: true,
  ...extra,
});

export const FACE_META: Record<ClockFaceId, FaceMeta> = {
  classic: analog({ date: true, defaults: { seconds: "sweep" } }),
  cookie: analog({ date: true }),
  sunny: analog(),
  clover: analog(),
  flower: analog({ date: true }),
  burst: analog(),
  squircle: analog({ date: true }),
  numerals: analog(),
  chrono: analog({ date: true, defaults: { seconds: "sweep", date: true } }),
  minimal: analog(),
  orbit: analog({ date: true, format: true, defaults: { seconds: "sweep" } }),
  pie: analog({ seconds: false, sweep: false, format: true }),
  wavy: analog({ sweep: false, date: true, format: true, defaults: { seconds: "tick" } }),
  stacked: digital(({ date }) => (date ? 0.82 : 0.95), { date: true }),
  bubbles: digital(() => 2.05, { seconds: true }),
  shapes: digital(() => 1),
  wide: digital(({ seconds, date }) => (date ? 2.4 : 3) + (seconds ? 0.75 : 0), { seconds: true, date: true, defaults: { date: true } }),
  thin: digital(({ seconds, date }) => (date ? 2.3 : 2.9) + (seconds ? 0.75 : 0), { seconds: true, date: true, defaults: { date: true } }),
  flip: digital(({ seconds }) => (seconds ? 3.05 : 2.1), { seconds: true }),
  segment: digital(({ seconds }) => segmentWidth(seconds) / SEGMENT.height, { seconds: true }),
  matrix: digital(({ seconds }) => matrixColumns(seconds) / MATRIX.rows, { seconds: true }),
  binary: digital(
    ({ seconds }) => {
      const size = binarySize(seconds ? 6 : 4);
      return size.width / size.height;
    },
    { seconds: true },
  ),
  calendar: digital(() => 2.4),
  glance: digital(({ date }) => (date ? 3.5 : 1.9), { date: true, defaults: { date: true } }),
  progress: digital(() => 2.6, { date: true, defaults: { date: true } }),
};

