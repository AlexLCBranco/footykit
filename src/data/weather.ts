// FK-39: the weather at kick-off — temperature, feels-like, rain chance and wind — from Open-Meteo (open-meteo.com:
// free, no key, non-commercial use; CC BY 4.0, so WEATHER_ATTRIBUTION shows wherever the weather does), at the
// venue's place from config/venues.json (Wikidata, a source per entry). Forecasts only: Open-Meteo's forecast reaches
// FORECAST_DAYS ahead, so a match further out, or already over, has none. Pure: the request's address and the reading
// of its answer; src/slate/weather.ts asks and caches.

import VENUES from '../../config/venues.json';
import type { Match } from './snapshot.ts';
import { venueKey, type Venue } from './venues.ts';

export const WEATHER_ATTRIBUTION = 'Weather data by Open-Meteo.com';
export const WEATHER_ATTRIBUTION_URL = 'https://open-meteo.com/';
/** Open-Meteo's forecast length (days, today included). */
export const FORECAST_DAYS = 16;

const TABLE = VENUES as Record<string, Venue>;

/** The match's venue, when config/venues.json knows it: its key and place. */
export function matchVenue(m: Match, table: Record<string, Venue> = TABLE): { key: string; at: Venue } | undefined {
  if (!m.v && !m.city) return undefined;
  const key = venueKey(m);
  const at = table[key];
  return at ? { key, at } : undefined;
}

/** A match Open-Meteo can forecast: a set kick-off from the start of today (UTC) to FORECAST_DAYS ahead, not over. */
export function inForecast(m: Match, now: number): boolean {
  if (m.tbd || m.st === 'post' || m.st === 'can' || m.st === 'ppd') return false;
  const t = Date.parse(m.t);
  const today = Math.floor(now / 86_400_000) * 86_400_000;
  return t >= today && t < today + FORECAST_DAYS * 86_400_000;
}

/** The hourly fields asked for, in the answer's names. */
const HOURLY = ['temperature_2m', 'apparent_temperature', 'precipitation_probability', 'wind_speed_10m', 'weather_code'] as const;

/** One request for several venues at once (Open-Meteo takes lists of places): hourly, in UTC, the whole forecast. */
export function weatherRequest(places: readonly Venue[]): string | undefined {
  if (!places.length) return undefined;
  const q = new URLSearchParams({
    latitude: places.map((p) => p.lat.toFixed(4)).join(','),
    longitude: places.map((p) => p.lon.toFixed(4)).join(','),
    hourly: HOURLY.join(','),
    timezone: 'GMT',
    forecast_days: String(FORECAST_DAYS),
    wind_speed_unit: 'kmh',
  });
  return `https://api.open-meteo.com/v1/forecast?${q}`;
}

/** The weather in one hour at one place. */
export interface Weather {
  /** °C */
  temp: number;
  /** "feels like", °C */
  feels: number;
  /** chance of rain, % */
  rain: number;
  /** km/h, 10 m above ground */
  wind: number;
  /** WMO weather code (Open-Meteo's weather_code) */
  code: number;
}

type Hourly = { time?: string[] } & Partial<Record<(typeof HOURLY)[number], (number | null)[]>>;
export type WeatherAnswer = { hourly?: Hourly } | { hourly?: Hourly }[];

/** A venue's hours from its part of the answer: "2026-11-19T22" (UTC hour) → the weather then. */
export function readHours(part: { hourly?: Hourly } | undefined): Map<string, Weather> {
  const out = new Map<string, Weather>();
  const h = part?.hourly;
  if (!h?.time) return out;
  h.time.forEach((t, i) => {
    const v = (k: (typeof HOURLY)[number]) => h[k]?.[i];
    const [temp, feels, rain, wind, code] = HOURLY.map(v);
    if (typeof temp !== 'number' || typeof feels !== 'number') return;
    out.set(t.slice(0, 13), { temp, feels, rain: rain ?? 0, wind: wind ?? 0, code: code ?? 0 });
  });
  return out;
}

/** The answer to weatherRequest(places), one map of hours per place, in the same order. */
export function readAnswer(answer: WeatherAnswer, count: number): Map<string, Weather>[] {
  const list = Array.isArray(answer) ? answer : [answer];
  return Array.from({ length: count }, (_, i) => readHours(list[i]));
}

/** The hour a kick-off falls in, as the answer's keys write it ("2026-11-19T22"). */
export const kickoffHour = (t: string) => new Date(Math.floor(Date.parse(t) / 3_600_000) * 3_600_000).toISOString().slice(0, 13);

/** A small sign for the sky (WMO codes): sun, cloud, fog, rain, snow, storm. */
export function weatherIcon(w: Weather): { icon: string; sky: string } {
  const c = w.code;
  if (c >= 95) return { icon: '⛈', sky: 'thunderstorm' };
  if ((c >= 71 && c <= 77) || c === 85 || c === 86) return { icon: '❄', sky: 'snow' };
  if ((c >= 51 && c <= 67) || (c >= 80 && c <= 82)) return { icon: '☂', sky: 'rain' };
  if (c === 45 || c === 48) return { icon: '≋', sky: 'fog' };
  if (c === 3) return { icon: '☁', sky: 'overcast' };
  if (c === 1 || c === 2) return { icon: '⛅', sky: 'partly cloudy' };
  return { icon: '☀', sky: 'clear' };
}

/** "−4 °C" (a real minus sign, whole degrees). */
export const fmtTemp = (c: number) => `${Math.round(c) < 0 ? '−' : ''}${Math.abs(Math.round(c))} °C`;

/** "18 °C, feels 16 °C · rain 40% · wind 22 km/h" */
export const weatherLine = (w: Weather) => `${fmtTemp(w.temp)}, feels ${fmtTemp(w.feels)} · rain ${Math.round(w.rain)}% · wind ${Math.round(w.wind)} km/h`;
