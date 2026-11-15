// League tables (PLAN.md Phase 4): places and ties on points for the six leagues, 2026-27 (Brasileirão 2026).
// Researched 2026-11-15; confirmed by Alex the same day. The Brasileirão follows CBF's own rules (REC 2026, Art. 6–8,
// 15); its Libertadores places, which pass down the table when a club qualifies twice, are worked out by
// src/data/braPlaces.ts (Alex: the literal reading of Art. 6, a passed place keeps its stage).
// UEFA places for 2027-28: associations 1–4 (England, Italy, Spain, Germany) 4 league-phase places, association 5
// (France) 3 + its 4th in the third qualifying round; two European Performance Spots (one more UCL place for the two
// associations with the best 2026-27 season) — https://en.wikipedia.org/wiki/2027%E2%80%9328_UEFA_Champions_League

import type { LeagueSlug } from './season.ts';

export type ZoneKind = 'ucl' | 'uclq' | 'uel' | 'uecl' | 'lib' | 'libq' | 'sula' | 'relpo' | 'rel';

export interface LeagueZone {
  from: number;
  to: number;
  kind: ZoneKind;
  label: string;
  /** a place that only some outcomes give (hatched): the Performance Spot, a cup place passed down */
  maybe?: string;
}

/** Ties on points. `h2h*` criteria compare only the tied teams' matches against each other. */
export type Criterion = 'gd' | 'gf' | 'wins' | 'awayWins' | 'awayGf' | 'h2hPts' | 'h2hGd' | 'h2hGf' | 'h2hAwayGf';

export interface LeagueRules {
  zones: LeagueZone[];
  /** after points, in order */
  tiebreak: Criterion[];
  /** the rule as the source states it, shown under the table */
  tiebreakText: string[];
  /** head-to-head is used only once every match between the tied teams is played (else skipped) */
  h2hWhenPlayed: boolean;
  /** head-to-head only between exactly two teams (the Brasileirão) */
  h2hTwoOnly?: boolean;
  /** criteria applied only once the season is over (the Premier League's head-to-head) */
  endOnly?: Criterion[];
  notes: string[];
  source: string;
}

const EPS = 'if England / Italy / Spain / Germany earns a European Performance Spot';
const CUP_UEL = (cup: string) => `if the ${cup} winners finish in the top 5, 6th goes to the Europa League`;
const CUP_UECL = (cup: string) => `if the ${cup} winners finish in the top 6, the Conference League place passes to 7th`;

export const LEAGUES: Record<LeagueSlug, LeagueRules> = {
  'eng.1': {
    zones: [
      { from: 1, to: 4, kind: 'ucl', label: 'Champions League' },
      { from: 5, to: 5, kind: 'uel', label: 'Europa League', maybe: `Champions League ${EPS}` },
      { from: 6, to: 6, kind: 'uel', label: 'Europa League', maybe: CUP_UEL('FA Cup') },
      { from: 18, to: 20, kind: 'rel', label: 'Relegation' },
    ],
    tiebreak: ['gd', 'gf'],
    endOnly: ['h2hPts', 'h2hAwayGf'],
    tiebreakText: ['Points', 'Goal difference', 'Goals scored', 'If the title, a European place or relegation is still level after the season: head-to-head points, head-to-head away goals, a play-off'],
    h2hWhenPlayed: true,
    notes: ['The FA Cup winners also get a Europa League place.', 'England\'s Conference League place is not stated for 2026-27 (unknown).'],
    source: 'https://en.wikipedia.org/wiki/2026%E2%80%9327_Premier_League',
  },
  'esp.1': {
    zones: [
      { from: 1, to: 4, kind: 'ucl', label: 'Champions League' },
      { from: 5, to: 5, kind: 'uel', label: 'Europa League', maybe: `Champions League ${EPS}` },
      { from: 6, to: 6, kind: 'uecl', label: 'Conference League play-off', maybe: CUP_UEL('Copa del Rey') },
      { from: 7, to: 7, kind: 'uecl', label: 'Conference League play-off', maybe: CUP_UECL('Copa del Rey') },
      { from: 18, to: 20, kind: 'rel', label: 'Relegation' },
    ],
    tiebreak: ['h2hPts', 'h2hGd', 'gd', 'gf'],
    tiebreakText: ['Points', 'Head-to-head points', 'Head-to-head goal difference', 'Goal difference', 'Goals scored', 'Fair-play points (three or more teams)', 'A play-off', 'Head-to-head only once all the matches between the tied teams are played'],
    h2hWhenPlayed: true,
    notes: ['The Copa del Rey winners also get a Europa League place.'],
    source: 'https://en.wikipedia.org/wiki/2026%E2%80%9327_La_Liga',
  },
  'ita.1': {
    zones: [
      { from: 1, to: 4, kind: 'ucl', label: 'Champions League' },
      { from: 5, to: 5, kind: 'uel', label: 'Europa League', maybe: `Champions League ${EPS}` },
      { from: 6, to: 6, kind: 'uecl', label: 'Conference League play-off', maybe: CUP_UEL('Coppa Italia') },
      { from: 7, to: 7, kind: 'uecl', label: 'Conference League play-off', maybe: CUP_UECL('Coppa Italia') },
      { from: 18, to: 20, kind: 'rel', label: 'Relegation' },
    ],
    tiebreak: ['h2hPts', 'h2hGd', 'gd', 'gf'],
    tiebreakText: ['Points', 'Head-to-head points', 'Head-to-head goal difference', 'Goal difference', 'Goals scored', 'Drawing of lots', 'A tie on points for 1st or 17th at the end is settled by a play-off match'],
    h2hWhenPlayed: true,
    notes: ['The Coppa Italia winners also get a Europa League place.', 'Before all the matches between tied teams are played, footykit skips head-to-head (the source doesn\'t say how Serie A ranks them then).'],
    source: 'https://en.wikipedia.org/wiki/2026%E2%80%9327_Serie_A',
  },
  'ger.1': {
    zones: [
      { from: 1, to: 4, kind: 'ucl', label: 'Champions League' },
      { from: 5, to: 5, kind: 'uel', label: 'Europa League', maybe: `Champions League ${EPS}` },
      { from: 6, to: 6, kind: 'uecl', label: 'Conference League play-off', maybe: CUP_UEL('DFB-Pokal') },
      { from: 7, to: 7, kind: 'uecl', label: 'Conference League play-off', maybe: CUP_UECL('DFB-Pokal') },
      { from: 16, to: 16, kind: 'relpo', label: 'Relegation play-off' },
      { from: 17, to: 18, kind: 'rel', label: 'Relegation' },
    ],
    tiebreak: ['gd', 'gf', 'h2hGd', 'h2hAwayGf', 'awayGf'],
    tiebreakText: ['Points', 'Goal difference', 'Goals scored', 'Head-to-head aggregate', 'Head-to-head away goals', 'Away goals', 'A play-off (after the season)', 'Head-to-head and away goals only once both matches between the tied teams are played'],
    h2hWhenPlayed: true,
    notes: ['The DFB-Pokal winners also get a Europa League place.'],
    source: 'https://en.wikipedia.org/wiki/2026%E2%80%9327_Bundesliga',
  },
  'fra.1': {
    zones: [
      { from: 1, to: 3, kind: 'ucl', label: 'Champions League' },
      { from: 4, to: 4, kind: 'uclq', label: 'Champions League 3rd qualifying round' },
      { from: 5, to: 5, kind: 'uel', label: 'Europa League' },
      { from: 6, to: 6, kind: 'uecl', label: 'Conference League play-off', maybe: CUP_UEL('Coupe de France') },
      { from: 7, to: 7, kind: 'uecl', label: 'Conference League play-off', maybe: CUP_UECL('Coupe de France') },
      { from: 16, to: 16, kind: 'relpo', label: 'Relegation play-off' },
      { from: 17, to: 18, kind: 'rel', label: 'Relegation' },
    ],
    tiebreak: ['gd', 'h2hPts', 'h2hGd', 'gf', 'wins', 'awayWins'],
    tiebreakText: ['Points', 'Goal difference', 'Head-to-head points', 'Head-to-head goal difference', 'Goals scored', 'Wins', 'Away wins', 'Fair-play points', 'Drawing of lots', 'Head-to-head only once all the matches between the tied teams are played'],
    h2hWhenPlayed: true,
    notes: ['The Coupe de France winners also get a Europa League place.'],
    source: 'https://en.wikipedia.org/wiki/2026%E2%80%9327_Ligue_1',
  },
  'bra.1': {
    zones: [
      { from: 1, to: 4, kind: 'lib', label: 'Libertadores group stage' },
      { from: 5, to: 5, kind: 'libq', label: 'Libertadores preliminary stage' },
      { from: 6, to: 11, kind: 'sula', label: 'Sudamericana' },
      { from: 17, to: 20, kind: 'rel', label: 'Relegation' },
    ],
    tiebreak: ['wins', 'gd', 'gf', 'h2hPts', 'h2hGd'],
    h2hTwoOnly: true,
    h2hWhenPlayed: false,
    tiebreakText: ['Points', 'Wins', 'Goal difference', 'Goals scored', 'Head-to-head: points over both meetings, then their goal difference (two teams only)', 'Fewest red cards', 'Fewest yellow cards', 'Drawing of lots'],
    notes: [
      'Copa do Brasil champions: Libertadores group stage; runners-up: preliminary stage (Art. 6 §1).',
      'A club qualified twice keeps the CONMEBOL place (Libertadores / Sudamericana champions) or the better national one; the freed place passes, with its stage, to the best-placed club not yet qualified (Art. 6 §2–4). If the cup champions qualified elsewhere, the runners-up move up to the group stage and their preliminary place passes down (§5).',
      'Sudamericana: the 6 best-placed clubs not in the Libertadores (Art. 7).',
      'A relegated Copa do Brasil finalist passes its place down (Wikipedia, pt; not in the REC).',
      'Places shown as things stand: the table now, the finals as played; hatched where a final still to play changes them.',
    ],
    source: 'https://stcbfsiteprdimgbrs.blob.core.windows.net/img-site/cdn/REC_Brasileiro_SA_rie_A_2026_v15_12_2025_final_02692c1077.pdf',
  },
};

/** The finals that decide Brasileirão places besides the table (REC Art. 6); their results come from the snapshot. */
export const BRA_CUP = 'bra.copa_do_brazil';
export const BRA_CONTINENTAL = { lib: 'conmebol.libertadores', sula: 'conmebol.sudamericana' } as const;
/** a relegated Copa do Brasil finalist's place passes down: pt.wikipedia's note, not in the REC */
export const BRA_RELEGATED_CUP_SOURCE = 'https://pt.wikipedia.org/wiki/Campeonato_Brasileiro_de_Futebol_de_2026_-_S%C3%A9rie_A';
