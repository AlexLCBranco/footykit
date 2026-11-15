// Where each venue is (config/venues.json, built from Wikidata by scripts/make-venues.ts, each with its source) and the
// travel between a club's matches: straight-line km from venue to venue.

import type { Match } from './snapshot.ts';

export interface Venue {
  lat: number;
  lon: number;
  /** metres above sea level, when Wikidata has it */
  elev?: number;
  /** venue = the stadium's own item; city = only the city was found */
  precision: 'venue' | 'city';
  /** the Wikidata item the place comes from */
  src: string;
}

/** A venue's key in config/venues.json: ESPN's name, city and country. */
export const venueKey = (m: Pick<Match, 'v' | 'city' | 'ctry'>) => `${m.v ?? ''}|${m.city ?? ''}|${m.ctry ?? ''}`;

/** Venues at least this high are marked on the map (thin air: matters for Libertadores trips). For Alex to confirm. */
export const ALTITUDE_MARK_M = 2000;

/** Great-circle distance, km. */
export function km(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const r = Math.PI / 180;
  const h = Math.sin(((b.lat - a.lat) * r) / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(((b.lon - a.lon) * r) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(Math.min(1, h)));
}
