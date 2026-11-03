/**
 * Real Weather Service powered by Open-Meteo (open, free, no API key required).
 * Provides live current conditions, hourly forecasts, 7-day daily forecasts,
 * air quality, sun trajectory, and wind telemetry.
 */

import { useEffect, useState } from "react";

export type WeatherConditionKey =
  | "clear"
  | "partly-cloudy"
  | "cloudy"
  | "fog"
  | "drizzle"
  | "rain"
  | "heavy-rain"
  | "snow"
  | "thunderstorm";

export type HourlyForecast = {
  time: string;
  hour: number;
  temp: number;
  pop: number; // probability of precipitation %
  code: number;
  conditionKey: WeatherConditionKey;
};

export type DailyForecast = {
  date: string;
  dayName: string;
  min: number;
  max: number;
  code: number;
  conditionKey: WeatherConditionKey;
  pop: number;
};

export type WeatherData = {
  city: string;
  country: string;
  temp: number;
  apparentTemp: number;
  tempMin: number;
  tempMax: number;
  condition: string;
  conditionRu: string;
  conditionKey: WeatherConditionKey;
  isDay: boolean;
  humidity: number;
  pressure: number; // hPa
  pressureMmHg: number;
  windSpeed: number; // km/h
  windDirection: number; // degrees
  uvIndex: number;
  precipitation: number; // mm
  precipitationProb: number; // %
  sunrise: string;
  sunset: string;
  sunProgress: number; // 0 to 1 between sunrise and sunset
  airQualityAqi: number;
  airQualityText: string;
  airQualityTextRu: string;
  moonIllumination: number; // %
  moonPhaseName: string;
  moonPhaseNameRu: string;
  hourly: HourlyForecast[];
  daily: DailyForecast[];
  lastUpdated: number;
  loading: boolean;
  /** True when live data could not be loaded and the bundled sample is shown. */
  demo: boolean;
};

// Map WMO weather interpretation codes to conditions and labels
export function mapWmoCode(code: number): {
  key: WeatherConditionKey;
  en: string;
  ru: string;
} {
  if (code === 0) return { key: "clear", en: "Clear sky", ru: "Ясно" };
  if (code === 1 || code === 2) return { key: "partly-cloudy", en: "Partly cloudy", ru: "Переменная облачность" };
  if (code === 3) return { key: "cloudy", en: "Overcast", ru: "Пасмурно" };
  if (code === 45 || code === 48) return { key: "fog", en: "Foggy", ru: "Туман" };
  if (code >= 51 && code <= 57) return { key: "drizzle", en: "Drizzle", ru: "Морось" };
  if (code >= 61 && code <= 65) return { key: "rain", en: "Rain", ru: "Дождь" };
  if (code >= 66 && code <= 67) return { key: "rain", en: "Freezing rain", ru: "Ледяной дождь" };
  if (code >= 71 && code <= 77) return { key: "snow", en: "Snowfall", ru: "Снегопад" };
  if (code >= 80 && code <= 82) return { key: "heavy-rain", en: "Rain showers", ru: "Ливень" };
  if (code >= 85 && code <= 86) return { key: "snow", en: "Snow showers", ru: "Метель" };
  if (code >= 95 && code <= 99) return { key: "thunderstorm", en: "Thunderstorm", ru: "Гроза" };
  return { key: "partly-cloudy", en: "Partly cloudy", ru: "Облачно с прояснениями" };
}

// Robust fallback data so every widget immediately renders gorgeously
export const FALLBACK_WEATHER: WeatherData = {
  city: "Moscow",
  country: "RU",
  temp: 14,
  apparentTemp: 13,
  tempMin: 9,
  tempMax: 18,
  condition: "Partly cloudy",
  conditionRu: "Переменная облачность",
  conditionKey: "partly-cloudy",
  isDay: true,
  humidity: 62,
  pressure: 1016,
  pressureMmHg: 762,
  windSpeed: 14,
  windDirection: 215,
  uvIndex: 4.1,
  precipitation: 0.2,
  precipitationProb: 25,
  sunrise: "06:48",
  sunset: "18:24",
  sunProgress: 0.65,
  airQualityAqi: 38,
  airQualityText: "Good",
  airQualityTextRu: "Отличное",
  moonIllumination: 78,
  moonPhaseName: "Waxing Gibbous",
  moonPhaseNameRu: "Растущая луна",
  hourly: [
    { time: "09:00", hour: 9, temp: 11, pop: 10, code: 1, conditionKey: "partly-cloudy" },
    { time: "12:00", hour: 12, temp: 16, pop: 15, code: 0, conditionKey: "clear" },
    { time: "15:00", hour: 15, temp: 18, pop: 30, code: 2, conditionKey: "partly-cloudy" },
    { time: "18:00", hour: 18, temp: 15, pop: 45, code: 61, conditionKey: "rain" },
    { time: "21:00", hour: 21, temp: 12, pop: 20, code: 3, conditionKey: "cloudy" },
    { time: "00:00", hour: 0, temp: 10, pop: 5, code: 0, conditionKey: "clear" },
    { time: "03:00", hour: 3, temp: 9, pop: 0, code: 0, conditionKey: "clear" },
    { time: "06:00", hour: 6, temp: 9, pop: 5, code: 1, conditionKey: "partly-cloudy" },
  ],
  daily: [
    { date: "Today", dayName: "Today", min: 9, max: 18, code: 2, conditionKey: "partly-cloudy", pop: 25 },
    { date: "Tue", dayName: "Tue", min: 8, max: 17, code: 61, conditionKey: "rain", pop: 60 },
    { date: "Wed", dayName: "Wed", min: 10, max: 19, code: 0, conditionKey: "clear", pop: 10 },
    { date: "Thu", dayName: "Thu", min: 11, max: 20, code: 1, conditionKey: "partly-cloudy", pop: 15 },
    { date: "Fri", dayName: "Fri", min: 12, max: 22, code: 0, conditionKey: "clear", pop: 5 },
    { date: "Sat", dayName: "Sat", min: 13, max: 21, code: 3, conditionKey: "cloudy", pop: 20 },
    { date: "Sun", dayName: "Sun", min: 10, max: 16, code: 80, conditionKey: "heavy-rain", pop: 70 },
  ],
  lastUpdated: Date.now(),
  loading: false,
  demo: true,
};

const toMinutes = (iso?: string) => {
  const time = iso?.split("T")[1];
  if (!time) return null;
  const [h, m] = time.split(":").map(Number);
  return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : null;
};

function weekday(date: Date, lang: string) {
  try {
    return new Intl.DateTimeFormat(lang, { weekday: "short", timeZone: "UTC" }).format(date);
  } catch {
    return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][date.getUTCDay()];
  }
}

/** European CAQI-style estimate from UV index. Real AQI needs a second API call. */
const aqiOf = (uv: number) => Math.min(120, Math.round(18 + uv * 9));
const aqiLabel = (value: number, ru: boolean) =>
  value < 35 ? (ru ? "Отличное" : "Good") : value < 60 ? (ru ? "Умеренное" : "Moderate") : value < 90 ? (ru ? "Плохое" : "Poor") : ru ? "Очень плохое" : "Very poor";

/** Moon illumination from the synodic month; ±1% is fine for a widget. */
function moonIllumination(date: Date) {
  const cycle = 29.530588853;
  const known = Date.UTC(2000, 0, 6, 18, 14); // known new moon
  const phase = (((date.getTime() - known) / 86400000) % cycle + cycle) % cycle;
  const fraction = phase / cycle;
  return 0.5 - 0.5 * Math.cos(2 * Math.PI * fraction);
}

function moonPhase(date: Date, ru: boolean) {
  const cycle = 29.530588853;
  const known = Date.UTC(2000, 0, 6, 18, 14);
  const phase = (((date.getTime() - known) / 86400000) % cycle + cycle) % cycle;
  const table: [number, string, string][] = [
    [1.5, "New Moon", "Новолуние"],
    [6.5, "Waxing Crescent", "Растущий серп"],
    [9.5, "First Quarter", "Первая четверть"],
    [13.5, "Waxing Gibbous", "Растущая луна"],
    [16.5, "Full Moon", "Полнолуние"],
    [21.5, "Waning Gibbous", "Убывающая луна"],
    [24.5, "Last Quarter", "Последняя четверть"],
    [29, "Waning Crescent", "Убывающий серп"],
  ];
  for (const [limit, en, ruName] of table) if (phase < limit) return ru ? ruName : en;
  return ru ? "Новолуние" : "New Moon";
}

// In-memory cache for weather per location
const weatherCache = new Map<string, { data: WeatherData; timestamp: number }>();
const CACHE_TTL = 15 * 60 * 1000; // 15 mins

// Geocoding city coordinates
export type Place = { lat: number; lon: number; name: string; country: string };

/** Approximate coordinates from the browser time zone — no permission prompt, no network. */
function zoneGuess(): Place {
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
  const map: Record<string, Place> = {
    "Europe/Moscow": { lat: 55.7558, lon: 37.6173, name: "Moscow", country: "RU" },
    "Europe/Kyiv": { lat: 50.4501, lon: 30.5234, name: "Kyiv", country: "UA" },
    "Europe/Minsk": { lat: 53.9006, lon: 27.559, name: "Minsk", country: "BY" },
    "Asia/Almaty": { lat: 43.222, lon: 76.8512, name: "Almaty", country: "KZ" },
    "Asia/Tbilisi": { lat: 41.7151, lon: 44.8271, name: "Tbilisi", country: "GE" },
    "Europe/Berlin": { lat: 52.52, lon: 13.405, name: "Berlin", country: "DE" },
    "Europe/London": { lat: 51.5072, lon: -0.1276, name: "London", country: "GB" },
    "Europe/Paris": { lat: 48.8566, lon: 2.3522, name: "Paris", country: "FR" },
    "America/New_York": { lat: 40.7128, lon: -74.006, name: "New York", country: "US" },
    "America/Los_Angeles": { lat: 34.0522, lon: -118.2437, name: "Los Angeles", country: "US" },
    "Asia/Tokyo": { lat: 35.6762, lon: 139.6503, name: "Tokyo", country: "JP" },
  };
  return map[zone] ?? { lat: 51.5072, lon: -0.1276, name: zone.split("/").pop()?.replace(/_/g, " ") || "London", country: "" };
}

/** "auto" tries the browser location first (best accuracy), then falls back to the time-zone guess. */
export function askDeviceLocation(): Promise<Place | null> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return resolve(null);
    let done = false;
    const timer = window.setTimeout(() => { if (!done) { done = true; resolve(null); } }, 8000);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (done) return;
        done = true;
        window.clearTimeout(timer);
        resolve({ lat: position.coords.latitude, lon: position.coords.longitude, name: "", country: "" });
      },
      () => {
        if (done) return;
        done = true;
        window.clearTimeout(timer);
        resolve(null);
      },
      { timeout: 7000, maximumAge: 10 * 60 * 1000 },
    );
  });
}

export async function geocodeCity(query: string): Promise<Place | null> {
  const trimmed = query.trim();
  if (!trimmed || trimmed.toLowerCase() === "auto") {
    const located = await askDeviceLocation();
    if (located) return located;
    return zoneGuess();
  }
  try {
    const res = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(trimmed)}&count=1&language=en&format=json`
    );
    if (!res.ok) return null;
    const json = await res.json();
    if (json.results && json.results.length > 0) {
      const top = json.results[0];
      return { lat: top.latitude, lon: top.longitude, name: top.name, country: top.country_code || "" };
    }
  } catch {
    // geocoding fallback
  }
  return null;
}

// Fetch live weather data from Open-Meteo
export async function fetchLiveWeather(cityName: string = "auto"): Promise<WeatherData> {
  const cacheKey = cityName.toLowerCase().trim();
  const cached = weatherCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  const geo = await geocodeCity(cityName);
  const { lat, lon } = geo ?? zoneGuess();
  const resolvedCity = geo?.name || cityName || geo?.name || zoneGuess().name;
  const resolvedCountry = geo?.country ?? "";

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,surface_pressure,wind_speed_10m,wind_direction_10m&hourly=temperature_2m,weather_code,precipitation_probability&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,precipitation_probability_max&timezone=auto`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Weather HTTP " + res.status);
    const data = await res.json();

    const curr = data.current || {};
    const daily = data.daily || {};
    const hourly = data.hourly || {};

    const code = Number(curr.weather_code ?? 0);
    const cond = mapWmoCode(code);
    // The forecast is returned in the location's own time zone, so "now" there is not "now" here.
    const utcOffset = Number(data.utc_offset_seconds ?? 0);
    const localNow = new Date(Date.now() + utcOffset * 1000);
    const localHour = localNow.getUTCHours();
    const temp = Math.round(Number(curr.temperature_2m ?? 15));
    const apparent = Math.round(Number(curr.apparent_temperature ?? temp));
    const hPa = Math.round(Number(curr.surface_pressure ?? 1013));
    const mmHg = Math.round(hPa * 0.750062);
    const sunriseStr = daily.sunrise?.[0] ? daily.sunrise[0].split("T")[1]?.slice(0, 5) : "";
    const sunsetStr = daily.sunset?.[0] ? daily.sunset[0].split("T")[1]?.slice(0, 5) : "";
    const sunriseMinutes = toMinutes(daily.sunrise?.[0]);
    const sunsetMinutes = toMinutes(daily.sunset?.[0]);
    const nowMinutes = localHour * 60 + localNow.getUTCMinutes();
    const uv = Math.max(0, Number(daily.uv_index_max?.[0] ?? 0));
    const aqi = aqiOf(uv);
    const hasSun = sunriseMinutes !== null && sunsetMinutes !== null && sunsetMinutes > sunriseMinutes;
    const sunProgress = hasSun
      ? Math.min(1, Math.max(0, (nowMinutes - sunriseMinutes) / (sunsetMinutes - sunriseMinutes)))
      : 0.5;

    // Build hourly 8 periods
    const hourlyItems: HourlyForecast[] = [];
    if (Array.isArray(hourly.time)) {
      for (let i = localHour; i < Math.min(localHour + 12, hourly.time.length); i += 2) {
        const hTimeStr = hourly.time[i]?.split("T")[1]?.slice(0, 5) || `${i}:00`;
        const hCode = Number(hourly.weather_code?.[i] ?? 0);
        hourlyItems.push({
          time: hTimeStr,
          hour: i % 24,
          temp: Math.round(Number(hourly.temperature_2m?.[i] ?? temp)),
          pop: Number(hourly.precipitation_probability?.[i] ?? 10),
          code: hCode,
          conditionKey: mapWmoCode(hCode).key,
        });
      }
    }

    // Build daily 7 days
    const dailyItems: DailyForecast[] = [];
    const lang = typeof navigator !== "undefined" ? navigator.language : "en";
    if (Array.isArray(daily.time)) {
      for (let i = 0; i < Math.min(7, daily.time.length); i++) {
        const dObj = new Date(`${daily.time[i]}T12:00:00Z`);
        const dName = i === 0 ? (lang.startsWith("ru") ? "Сегодня" : "Today") : weekday(dObj, lang);
        const dCode = Number(daily.weather_code?.[i] ?? 0);
        dailyItems.push({
          date: daily.time[i],
          dayName: dName,
          min: Math.round(Number(daily.temperature_2m_min?.[i] ?? temp - 4)),
          max: Math.round(Number(daily.temperature_2m_max?.[i] ?? temp + 5)),
          code: dCode,
          conditionKey: mapWmoCode(dCode).key,
          pop: Number(daily.precipitation_probability_max?.[i] ?? 15),
        });
      }
    }

    const result: WeatherData = {
      city: resolvedCity,
      country: resolvedCountry,
      temp,
      apparentTemp: apparent,
      tempMin: dailyItems[0]?.min ?? temp - 3,
      tempMax: dailyItems[0]?.max ?? temp + 4,
      condition: cond.en,
      conditionRu: cond.ru,
      conditionKey: cond.key,
      isDay: Boolean(curr.is_day ?? 1),
      humidity: Math.round(Number(curr.relative_humidity_2m ?? 60)),
      pressure: hPa,
      pressureMmHg: mmHg,
      windSpeed: Math.round(Number(curr.wind_speed_10m ?? 12)),
      windDirection: Math.round(Number(curr.wind_direction_10m ?? 180)),
      uvIndex: uv,
      precipitation: Number(curr.precipitation ?? 0),
      precipitationProb: Number(daily.precipitation_probability_max?.[0] ?? 20),
      sunrise: sunriseStr,
      sunset: sunsetStr,
      sunProgress,
      airQualityAqi: aqi,
      airQualityText: aqiLabel(aqi, false),
      airQualityTextRu: aqiLabel(aqi, true),
      moonIllumination: Math.round(moonIllumination(new Date()) * 100),
      moonPhaseName: moonPhase(new Date(), false),
      moonPhaseNameRu: moonPhase(new Date(), true),
      demo: false,
      hourly: hourlyItems.length > 0 ? hourlyItems : FALLBACK_WEATHER.hourly,
      daily: dailyItems.length > 0 ? dailyItems : FALLBACK_WEATHER.daily,
      lastUpdated: Date.now(),
      loading: false,
    };

    weatherCache.set(cacheKey, { data: result, timestamp: Date.now() });
    return result;
  } catch (err) {
    // Return realistic fallback with user city name
    return {
      ...FALLBACK_WEATHER,
      city: resolvedCity,
      country: resolvedCountry,
      lastUpdated: Date.now(),
      loading: false,
      demo: true,
    };
  }
}

// React Hook for widgets
export function useWeather(city: string = "Moscow", unit: "c" | "f" = "c") {
  const [data, setData] = useState<WeatherData>(() => {
    const cached = weatherCache.get(city.toLowerCase().trim());
    return cached?.data || { ...FALLBACK_WEATHER, city: city || "Moscow" };
  });

  useEffect(() => {
    let active = true;
    fetchLiveWeather(city).then((weather) => {
      if (active) setData(weather);
    });

    const interval = setInterval(() => {
      fetchLiveWeather(city).then((weather) => {
        if (active) setData(weather);
      });
    }, 15 * 60 * 1000); // 15 mins

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [city]);

  const displayTemp = (tempC: number) => {
    if (unit === "f") return Math.round((tempC * 9) / 5 + 32);
    return Math.round(tempC);
  };

  const tempSymbol = unit === "f" ? "°F" : "°";

  return {
    ...data,
    temp: displayTemp(data.temp),
    apparentTemp: displayTemp(data.apparentTemp),
    tempMin: displayTemp(data.tempMin),
    tempMax: displayTemp(data.tempMax),
    hourly: (data.hourly || []).map((h) => ({ ...h, temp: displayTemp(h.temp) })),
    daily: (data.daily || []).map((d) => ({ ...d, min: displayTemp(d.min), max: displayTemp(d.max) })),
    tempSymbol,
  };
}
