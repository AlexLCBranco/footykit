// Per-season configuration. Everything that changes from one season to the next lives here, never in code.
// Competition identifiers are ESPN league slugs; `npm run data-check` fails when one of them stops answering.
// Rules facts (berths, tiebreakers, pots, windows, rivalries, neutral venues) are added per phase, each with a source
// link, and listed for Alex to confirm before they are used.

export const SEASON_ID = '2026-27';

/** ESPN slug of a domestic league whose clubs we may follow. */
export type LeagueSlug = 'eng.1' | 'esp.1' | 'ita.1' | 'ger.1' | 'fra.1' | 'bra.1';

/** Which clubs footykit follows. Resolved against ESPN's team lists by the data job, so promoted/relegated clubs and
 * this season's Champions League field follow automatically. */
export const FOLLOWED = {
  /** every club of these leagues */
  allClubsOf: ['eng.1', 'bra.1'] as LeagueSlug[],
  /** clubs of these leagues that play in `competition` this season */
  ifIn: { leagues: ['esp.1', 'ita.1', 'ger.1'] as LeagueSlug[], competition: 'uefa.champions' },
  /** exceptions, by ESPN team id */
  extraClubs: [{ espnId: '160', league: 'fra.1' as LeagueSlug, note: 'Paris Saint-Germain' }],
};

/** ESPN season `year` for each league (Brazil plays a calendar year; Europe's 2026-27 is ESPN year 2026). */
export const LEAGUE_SEASON_YEAR: Record<LeagueSlug, number> = {
  'eng.1': 2026, 'esp.1': 2026, 'ita.1': 2026, 'ger.1': 2026, 'fra.1': 2026, 'bra.1': 2026,
};

/** Domestic cups by league (the plan's required set). */
export const DOMESTIC_CUPS: Record<LeagueSlug, string[]> = {
  'eng.1': ['eng.fa', 'eng.league_cup'],
  'esp.1': ['esp.copa_del_rey'],
  'ita.1': ['ita.coppa_italia'],
  'ger.1': ['ger.dfb_pokal'],
  'fra.1': ['fra.coupe_de_france'],
  'bra.1': ['bra.copa_do_brazil'],
};

export const CONTINENTAL: Record<'europe' | 'southAmerica', string[]> = {
  europe: ['uefa.champions', 'uefa.europa', 'uefa.europa.conf'],
  southAmerica: ['conmebol.libertadores', 'conmebol.sudamericana'],
};

/** State championships (Brazil) share this slug prefix in ESPN. */
export const STATE_PREFIX = 'bra.camp.';

/** Calendar years whose scoreboards hold this season's matches, per league. */
export const SEASON_CALENDAR_YEARS: Record<LeagueSlug, number[]> = {
  'eng.1': [2026, 2027], 'esp.1': [2026, 2027], 'ita.1': [2026, 2027], 'ger.1': [2026, 2027], 'fra.1': [2026, 2027],
  'bra.1': [2026],
};
