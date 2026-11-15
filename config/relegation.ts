// Relegation places per league, for the Z4R tag (Phase 3). The "zone" is the direct relegation places only (Alex,
// 2026-11-14: "make it direct for now"); the play-off place (Bundesliga and Ligue 1: 16th plays a two-leg play-off
// against the second division's 3rd) is recorded but not in the zone. Researched 2026-11-14 with the sources below.
// Cross-check: ESPN's table marks the same places in its zone notes (tests/context.test.ts checks the counts against
// the recorded snapshot, for every league whose ESPN table has notes; the Brasileirão's has none).

import type { LeagueSlug } from './season.ts';

export interface Relegation {
  /** relegated directly */
  direct: number;
  /** relegation play-off places (just above the direct places); not part of the Z4R zone */
  playoff: number;
  /** how the zone is called in a hover ("Z4", "the drop zone") */
  label: string;
  source: string;
}

export const RELEGATION: Record<LeagueSlug, Relegation> = {
  'eng.1': { direct: 3, playoff: 0, label: 'the drop zone', source: 'https://en.wikipedia.org/wiki/2026%E2%80%9327_Premier_League' },
  'esp.1': { direct: 3, playoff: 0, label: 'the drop zone', source: 'https://en.wikipedia.org/wiki/2026%E2%80%9327_La_Liga' },
  // a tie on points for 17th is settled by a play-off match, not by tiebreakers (Serie A rules, same source)
  'ita.1': { direct: 3, playoff: 0, label: 'the drop zone', source: 'https://en.wikipedia.org/wiki/2026%E2%80%9327_Serie_A' },
  'ger.1': { direct: 2, playoff: 1, label: 'the drop zone', source: 'https://en.wikipedia.org/wiki/2026%E2%80%9327_Bundesliga' },
  'fra.1': { direct: 2, playoff: 1, label: 'the drop zone', source: 'https://en.wikipedia.org/wiki/2026%E2%80%9327_Ligue_1' },
  // "the last four will be relegated to Série B for 2027"
  'bra.1': { direct: 4, playoff: 0, label: 'Z4', source: 'https://en.wikipedia.org/wiki/2026_Campeonato_Brasileiro_S%C3%A9rie_A' },
};

/** Z4R rule (Alex's, PLAN.md Phase 3): through this round the tag needs the team in the zone or within `early` points
 * of the zone line; from the next round on, within `late` points. */
export const Z4R_RULE = { earlyRounds: 8, early: 1, late: 3 };
