import type { WeatherConditionKey } from "../../../lib/weather";

export function WeatherIcon({
  condition,
  isDay = true,
  size = 28,
  className = "",
}: {
  condition: WeatherConditionKey;
  isDay?: boolean;
  size?: number;
  className?: string;
}) {
  switch (condition) {
    case "clear":
      return isDay ? (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <circle cx="12" cy="12" r="4" fill="currentColor" fillOpacity="0.2" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
        </svg>
      ) : (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" fill="currentColor" fillOpacity="0.2" />
        </svg>
      );

    case "partly-cloudy":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <path d="M12 2v2M4.93 4.93l1.41 1.41M20 12h2M19.07 4.93l-1.41 1.41" />
          <path d="M15.5 8.5 A4 4 0 0 0 9 11 A3.5 3.5 0 0 0 5.5 14 A3.5 3.5 0 0 0 9 17.5 h9 a3.5 3.5 0 0 0 0-7 a3.6 3.6 0 0 0-2.5-2z" fill="currentColor" fillOpacity="0.15" />
        </svg>
      );

    case "cloudy":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" fill="currentColor" fillOpacity="0.2" />
        </svg>
      );

    case "drizzle":
    case "rain":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <path d="M17.5 16H9a6 6 0 1 1 5.8-4.5" />
          <path d="M8 19v2M12 19v2M16 19v2" strokeLinecap="round" />
        </svg>
      );

    case "heavy-rain":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <path d="M17.5 15H9a6 6 0 1 1 5.8-4.5" />
          <path d="M7 18l-1 3M11 18l-1 3M15 18l-1 3M19 18l-1 3" strokeLinecap="round" />
        </svg>
      );

    case "snow":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <path d="M17.5 15H9a6 6 0 1 1 5.8-4.5" />
          <circle cx="8" cy="19" r="1" fill="currentColor" />
          <circle cx="12" cy="19" r="1" fill="currentColor" />
          <circle cx="16" cy="19" r="1" fill="currentColor" />
          <circle cx="10" cy="22" r="1" fill="currentColor" />
          <circle cx="14" cy="22" r="1" fill="currentColor" />
        </svg>
      );

    case "thunderstorm":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <path d="M17.5 15H9a6 6 0 1 1 5.8-4.5" />
          <path d="M13 14l-2 4h3l-2 5" fill="currentColor" />
        </svg>
      );

    case "fog":
    default:
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <path d="M4 14h16M4 18h16M4 10h16M6 6h12" />
        </svg>
      );
  }
}
