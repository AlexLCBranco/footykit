// League tables (PLAN.md Phase 4): places and ties on points for the six leagues, 2026-27 (Brasileirão 2026).
// Researched 2026-11-15; confirmed by Alex the same day for the European leagues. The Brasileirão's base places are
// shown as the sources agree on them; the places that pass down the table (cup finalists and continental champions
// already qualified) wait for CBF's own rules (Alex: "base now, engine later") and are listed as possible extras.
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
      { from: 6, to: 11, kind: 'sula', label: 'Sudamericana (“the next six”)', maybe: 'a passed-down Libertadores place can take the top of these' },
      { from: 17, to: 20, kind: 'rel', label: 'Relegation' },
    ],
    tiebreak: ['wins', 'gd', 'gf', 'h2hPts'],
    h2hTwoOnly: true,
    h2hWhenPlayed: false,
    tiebreakText: ['Points', 'Wins', 'Goal difference', 'Goals scored', 'Head-to-head (two teams only)', 'Fewest red cards', 'Fewest yellow cards', 'Drawing of lots'],
    notes: [
      'The Copa do Brasil champions get a Libertadores group-stage place, the runners-up a preliminary-stage place.',
      'A place whose holder already qualified (or is relegated) passes to the best-placed Série A team not yet qualified; a Brazilian Libertadores or Sudamericana champion already qualified opens one more (up to 9 in all). Which stage a passed-down place enters: sources disagree, CBF\'s rules not found yet.',
      'The Sudamericana count ("the next six") is from English Wikipedia only.',
    ],
    source: 'https://pt.wikipedia.org/wiki/Campeonato_Brasileiro_de_Futebol_de_2026_-_S%C3%A9rie_A',
  },
};

/** The Brasileirão's pending finals that can open more Libertadores places (as of 2026-11-15; the page reads the
 * results from the snapshot). Sources: the Série A page above and bahia.ba's explainer. */
export const BRA_EXTRA_SOURCES = [
  'https://pt.wikipedia.org/wiki/Campeonato_Brasileiro_de_Futebol_de_2026_-_S%C3%A9rie_A',
  'https://bahia.ba/esporte/brasileirao-pode-abrir-ate-nove-vagas-para-a-libertadores-de-2027/',
];
export const BRA_EXTRA_FINALS = [
  { comp: 'bra.copa_do_brazil', what: 'Copa do Brasil final: a finalist already qualified through the Série A passes its place down' },
  { comp: 'conmebol.libertadores', what: 'Libertadores final: a Brazilian champion already qualified opens one more place' },
  { comp: 'conmebol.sudamericana', what: 'Sudamericana final: a Brazilian champion already qualified opens one more place' },
];
