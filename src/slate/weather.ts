// FK-39: the Slate's weather store. Asked by a Slate on screen (show), it fetches the venues of the matches Open-Meteo
// can forecast, all of them in one request, and keeps each venue's hours for the page; a venue is asked again at
// most once an hour (REFRESH_MS: forecasts change slowly, and a Slate left open stays fresh enough). No timer: a
// refresh happens only when a Slate shows the venue again. A failed answer leaves the weather out.

import { useEffect, useMemo, useSyncExternalStore } from 'react';
import type { Match } from '../data/snapshot';
import { inForecast, kickoffHour, matchVenue, readAnswer, weatherRequest, type Weather, type WeatherAnswer } from '../data/weather';

export const REFRESH_MS = 3_600_000;

export interface WeatherStore {
  /** a venue's hours (UTC hour → weather), once fetched */
  get(venue: string): Map<string, Weather> | undefined;
  subscribe(fn: () => void): () => void;
  /** a Slate shows these matches: fetch the venues it lacks (or older than REFRESH_MS); `at`: the page's clock */
  show(matches: readonly Match[], at?: number): void;
  /** changes whenever new weather arrives (for useSyncExternalStore) */
  version(): number;
}

export function createWeatherStore(get: (url: string) => Promise<unknown> = (u) => fetch(u).then((r) => (r.ok ? r.json() : Promise.reject(new Error(`weather ${r.status}`)))), now: () => number = Date.now): WeatherStore {
  const venues = new Map<string, { at: number; hours: Map<string, Weather> }>();
  const asking = new Set<string>();
  const subs = new Set<() => void>();
  let v = 0;
  return {
    get: (key) => venues.get(key)?.hours,
    subscribe(fn) { subs.add(fn); return () => subs.delete(fn); },
    version: () => v,
    show(matches, at) {
      const t = at ?? now();
      const want = new Map<string, ReturnType<typeof matchVenue> & object>();
      for (const m of matches) {
        if (!inForecast(m, t)) continue;
        const venue = matchVenue(m);
        if (!venue || asking.has(venue.key)) continue;
        const had = venues.get(venue.key);
        if (had && t - had.at < REFRESH_MS) continue;
        want.set(venue.key, venue);
      }
      const list = [...want.values()];
      const url = weatherRequest(list.map((x) => x.at));
      if (!url) return;
      for (const x of list) asking.add(x.key);
      get(url)
        .then((answer) => {
          readAnswer(answer as WeatherAnswer, list.length).forEach((hours, i) => venues.set(list[i]!.key, { at: t, hours }));
          v++;
          subs.forEach((f) => f());
        })
        .catch(() => undefined)
        .finally(() => list.forEach((x) => asking.delete(x.key)));
    },
  };
}

let page: WeatherStore | undefined;
/** The page's one weather store. */
export const pageWeatherStore = () => (page ??= createWeatherStore());

const NO_SUB = () => () => undefined;
const ZERO = () => 0;

/** Each match's weather at kick-off (match id → weather), from `store`; none without a store (no request at all). */
export function useMatchWeather(matches: readonly Match[], store: WeatherStore | undefined, now?: number): Map<string, Weather> {
  const version = useSyncExternalStore(store ? store.subscribe : NO_SUB, store ? store.version : ZERO);
  // after the cards are on screen: ask for what's missing
  useEffect(() => store?.show(matches, now), [store, matches, now]);
  return useMemo(() => {
    const out = new Map<string, Weather>();
    if (!store) return out;
    for (const m of matches) {
      const venue = matchVenue(m);
      const w = venue && store.get(venue.key)?.get(kickoffHour(m.t));
      if (w) out.set(m.id, w);
    }
    return out;
    // version: new weather arrived
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store, matches, version]);
}
