// Where footykit is served: under the gauntlet's address, gauntlet-home.vercel.app/football/, so it shares one origin
// (one localStorage) with the gauntlet whiteboard and calendarkit. The build's base (vite.config.ts), the snapshot,
// the day function and the logos all use this path, so they resolve the same from a gauntlet page.

export const FOOTYKIT_BASE = '/football/';

/** The snapshot (Vercel Blob, rewritten to this path by vercel.json; a local file in dev and tests). */
export const SNAPSHOT_URL = `${FOOTYKIT_BASE}data/snapshot.json`;

/** One ESPN (US Eastern) date's live scores and odds: api/day.ts. */
export const dayUrl = (espnDate: string) => `${FOOTYKIT_BASE}api/day?date=${espnDate}`;

export const teamLogoUrl = (id: string) => `${FOOTYKIT_BASE}logos/${id}.png`;
export const compLogoUrl = (slug: string) => `${FOOTYKIT_BASE}logos/c-${slug}.png`;
