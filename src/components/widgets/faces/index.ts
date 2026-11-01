import type { ComponentType } from "react";
import { Burst, Chrono, Classic, Clover, Cookie, Flower, Minimal, Numerals, Orbit, Pie, Squircle, Sunny, Wavy } from "./analog";
import { Binary, Bubbles, Calendar, Flip, Glance, Matrix, Progress, Segment, Shapes, Stacked, Thin, Wide } from "./digital";
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
};

