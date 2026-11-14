// The page's side of the day layer (api/day.ts): which ESPN dates a local day needs, and the day's matches with the
// fresher scores laid over the snapshot's. Pure; the fetching is in components/useLive.ts.

import type { Odds } from './day.ts';
import { dayKey } from './model.ts';
import type { Match } from './snapshot.ts';

/** ESPN dates (US Eastern days, "YYYYMMDD") that overlap the local day `day` in `timeZone`. */
export function espnDatesFor(day: string, timeZone?: string): string[] {
  const out = new Set<string>();
  const noon = Date.parse(`${day}T12:00:00Z`);
  // every half hour from 16 h before to 40 h after UTC midnight covers any zone's local day
  for (let t = noon - 28 * 3600e3; t <= noon + 28 * 3600e3; t += 1800e3) {
    if (dayKey(t, timeZone) === day) out.add(dayKey(t, 'America/New_York').replace(/-/g, ''));
  }
  return [...out].sort();
}

export interface LiveLayer {
  /** fresher copies of matches, by id */
  matches: Map<string, Match>;
  odds: Map<string, Odds>;
}

export const EMPTY_LIVE: LiveLayer = { matches: new Map(), odds: new Map() };

/** `list` with each match replaced by its live copy (snapshot venue kept when the day layer has none). */
export function withLive(list: Match[], live: LiveLayer): Match[] {
  if (live.matches.size === 0) return list;
  return list.map((m) => {
    const l = live.matches.get(m.id);
    if (!l) return m;
    // a live copy never loses what the snapshot knows and ESPN's scoreboard leaves out (aggregate, round)
    return { ...m, ...l, r: l.r ?? m.r, ha: l.ha ?? m.ha, aa: l.aa ?? m.aa, v: l.v ?? m.v, city: l.city ?? m.city, ctry: l.ctry ?? m.ctry };
  });
}

/** True while the day has a match live or about to start: the page then asks again every minute. */
export function isHot(list: Match[], now: number): boolean {
  return list.some((m) => m.st === 'in' || (m.st === 'pre' && !m.tbd && Date.parse(m.t) - now < 15 * 60e3 && now - Date.parse(m.t) < 3 * 3600e3));
}
