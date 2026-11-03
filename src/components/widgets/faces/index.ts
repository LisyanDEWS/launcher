import type { ComponentType } from "react";
import { Burst, Chrono, Classic, Clover, Cookie, Flower, Minimal, Numerals, Orbit, Pie, Squircle, Sunny, Wavy } from "./analog";
import { Binary, Bubbles, Calendar, Flip, Glance, Matrix, Progress, Segment, Shapes, Stacked, Thin, Wide } from "./digital";
import { M3Arc, M3Chips, M3Chip, M3DateRing, M3DayBar, M3Dot, M3Gem, M3Pill, M3Ring, M3Scallop, M3Stacked, M3Tiles, M3WeekStrip } from "./material";
import { CalDay, CalMonth, CalWeek, CalYear } from "./calendar";
import type { FaceProps } from "./parts";
import type { ClockFaceId } from "../../../lib/settings";

export type { FaceProps };

export const FACE_COMPONENTS: Record<ClockFaceId, ComponentType<FaceProps>> = {
  classic: Classic,
  cookie: Cookie,
  sunny: Sunny,
  clover: Clover,
  flower: Flower,
  burst: Burst,
  squircle: Squircle,
  numerals: Numerals,
  chrono: Chrono,
  minimal: Minimal,
  orbit: Orbit,
  pie: Pie,
  wavy: Wavy,
  stacked: Stacked,
  bubbles: Bubbles,
  shapes: Shapes,
  wide: Wide,
  thin: Thin,
  flip: Flip,
  segment: Segment,
  matrix: Matrix,
  binary: Binary,
  calendar: Calendar,
  glance: Glance,
  progress: Progress,
  m3_pill: M3Pill,
  m3_tiles: M3Tiles,
  m3_ring: M3Ring,
  m3_chip: M3Chip,
  m3_scallop: M3Scallop,
  m3_gem: M3Gem,
  m3_arc: M3Arc,
  m3_dot: M3Dot,
  cal_month: CalMonth,
  cal_day: CalDay,
  cal_week: CalWeek,
  cal_year: CalYear,
  m3_daybar: M3DayBar,
  m3_weekstrip: M3WeekStrip,
  m3_stacked: M3Stacked,
  m3_datering: M3DateRing,
  m3_chips: M3Chips,
};

