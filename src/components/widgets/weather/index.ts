import type { ComponentType } from "react";
import {
  M3WAir,
  M3WCombo,
  M3WDaily,
  M3WDetails,
  M3WFeels,
  M3WHourly,
  M3WHumidity,
  M3WMoon,
  M3WNow,
  M3WPill,
  M3WRain,
  M3WShape,
  M3WSun,
  M3WUV,
  M3WWind,
  type WeatherFaceProps,
} from "./material";
import { LEGACY_WEATHER_FACES, type WeatherFaceId } from "../../../lib/settings";

const FACES: Record<WeatherFaceId, ComponentType<WeatherFaceProps>> = {
  m3w_now: M3WNow,
  m3w_shape: M3WShape,
  m3w_pill: M3WPill,
  m3w_details: M3WDetails,
  m3w_hourly: M3WHourly,
  m3w_daily: M3WDaily,
  m3w_rain: M3WRain,
  m3w_sun: M3WSun,
  m3w_wind: M3WWind,
  m3w_humidity: M3WHumidity,
  m3w_feels: M3WFeels,
  m3w_uv: M3WUV,
  m3w_air: M3WAir,
  m3w_moon: M3WMoon,
  m3w_combo: M3WCombo,
};

/** All weather faces, including legacy ids mapped onto their Material replacement. */
export const WEATHER_COMPONENTS: Record<string, ComponentType<WeatherFaceProps>> = {
  ...Object.fromEntries(Object.entries(LEGACY_WEATHER_FACES).map(([legacy, id]) => [legacy, FACES[id]])),
  ...FACES,
};

export type { WeatherFaceProps };
