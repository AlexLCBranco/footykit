// FK-69: where and under what each World Cup match was played: the stadium (name, place, roof), whether a retractable
// roof was open, and the weather at kick-off, from public/worldcup/<year>-venues.json (scripts/make-wc-venues.ts:
// stadium facts from config/wcStadiums.ts, coordinates from Wikidata, past weather from Open-Meteo's archive).
// Pure: the roof tag, whether the weather mattered (played under the sky), and the weather line.

import { fmtTemp } from './weather.ts';

export type Roof = 'open' | 'fixed' | 'retractable';
export interface WcStadium { name: string; lat: number; lon: number; roof: Roof; src: string; roofSrc: string }
/** Past weather: °C at kick-off and the rain in the two hours from kick-off, mm. */
export interface PlayedWeather { t: number; mm: number }
/** A forecast for a match to come: °C at kick-off and the chance of rain, %. */
export interface ForecastWeather { t: number; pct: number }
export type CardWeather = PlayedWeather | ForecastWeather;
export interface WcMatchVenue { roofOpen?: boolean; w?: PlayedWeather }
export interface WcVenues {
  /** by the match's `city` in the edition's file */
  stadiums: Record<string, WcStadium>;
  /** by match number */
  matches: Record<number, WcMatchVenue>;
  weatherSource: string;
}

/** The tag beside the stadium's name. A retractable roof with no recorded state is never guessed: "Retractable roof". */
export function roofTag(roof: Roof | undefined, roofOpen?: boolean): string | undefined {
  if (!roof) return undefined;
  if (roof === 'open') return 'Open air';
  if (roof === 'fixed') return 'Roofed';
  return roofOpen === undefined ? 'Retractable roof' : roofOpen ? 'Roof open' : 'Roof closed';
}
export const ROOF_TIP: Record<string, string> = {
  'Open air': 'The pitch is under the sky',
  Roofed: 'A fixed roof covers the pitch: the weather outside did not matter',
  'Roof closed': 'The retractable roof was closed for this match: the weather outside did not matter',
  'Roof open': 'The retractable roof was open for this match',
  'Retractable roof': 'The stadium has a retractable roof; whether it was open for this match is not recorded, so the weather outside is shown',
};

/**
 * Whether the match was played under the sky, so its weather is shown: an open-air stadium, or a retractable roof that
 * was open or whose state is unknown. Under a fixed or closed roof, or with no roof data at all: no weather.
 */
export const underSky = (roof: Roof | undefined, roofOpen?: boolean): boolean => roof === 'open' || (roof === 'retractable' && roofOpen !== false);

const isForecast = (w: CardWeather): w is ForecastWeather => 'pct' in w;
/** "24 °C · no rain", "24 °C · 1.4 mm rain" (played); "24 °C · 40% rain" (forecast). */
export function weatherText(w: CardWeather): string {
  if (isForecast(w)) return `${fmtTemp(w.t)} · ${Math.round(w.pct)}% rain`;
  return `${fmtTemp(w.t)} · ${w.mm < 0.05 ? 'no rain' : `${w.mm.toFixed(1)} mm rain`}`;
}
export const weatherTip = (w: CardWeather) => (isForecast(w)
  ? 'Forecast for kick-off: temperature and chance of rain (Open-Meteo)'
  : 'At kick-off: the temperature, and the rain that fell in the two hours from kick-off (Open-Meteo historical archive)');

/** The weather a card shows: none unless the match was under the sky and the data has it. */
export function cardWeather(st: WcStadium | undefined, mv: WcMatchVenue | undefined, forecast?: ForecastWeather): CardWeather | undefined {
  if (!underSky(st?.roof, mv?.roofOpen)) return undefined;
  return mv?.w ?? forecast;
}

// ---- Open-Meteo's historical archive (the script) ----
export const ARCHIVE_SOURCE = 'Weather data by Open-Meteo.com (historical archive)';
/** One stadium's hours over `from`…`to` (YYYY-MM-DD), in the stadium's own time (the editions' kick-off times are local). */
export function archiveRequest(at: { lat: number; lon: number }, from: string, to: string): string {
  const q = new URLSearchParams({ latitude: at.lat.toFixed(4), longitude: at.lon.toFixed(4), start_date: from, end_date: to, hourly: 'temperature_2m,precipitation', timezone: 'auto' });
  return `https://archive-api.open-meteo.com/v1/archive?${q}`;
}
export interface ArchiveAnswer { hourly?: { time?: string[]; temperature_2m?: (number | null)[]; precipitation?: (number | null)[] } }
/**
 * The weather of a match from the archive's hours: the temperature in the kick-off's hour, and the rain of the two
 * hours from it (an hour's precipitation is the sum up to that hour, so the two values after kick-off). Undefined when
 * the archive has no temperature for that hour.
 */
export function playedWeather(answer: ArchiveAnswer, date: string, time: string): PlayedWeather | undefined {
  const h = answer.hourly;
  const i = h?.time?.indexOf(`${date}T${time.slice(0, 2)}:00`) ?? -1;
  const t = h?.temperature_2m?.[i];
  if (i < 0 || typeof t !== 'number') return undefined;
  const mm = (h!.precipitation?.[i + 1] ?? 0) + (h!.precipitation?.[i + 2] ?? 0);
  return { t: Math.round(t * 10) / 10, mm: Math.round(mm * 10) / 10 };
}
