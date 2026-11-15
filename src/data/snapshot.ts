// The snapshot the app reads: footykit's own compact shape, built by scripts/snapshot/build.ts from ESPN's feeds.
// The app never reads raw ESPN JSON (src/data/espn.ts is for the job and the day function only), so a field ESPN sends
// but this file doesn't list cannot be read by accident; tests/snapshot.test.ts checks that.

import type { CompKind } from '../../config/competitions.ts';
import type { LeagueSlug } from '../../config/season.ts';

/** pre = not started, in = live, post = finished; ppd / can / abd / susp = postponed, cancelled, abandoned, suspended. */
export type MatchStatus = 'pre' | 'in' | 'post' | 'ppd' | 'can' | 'abd' | 'susp';

export interface Match {
  id: string;
  /** kickoff, ISO UTC */
  t: string;
  /** kickoff time not decided yet (the date holds) */
  tbd?: 1;
  /** competition slug */
  c: string;
  /** round / stage name for cups and continental competitions ("Round of 16", "League Phase") */
  r?: string;
  leg?: number;
  st: MatchStatus;
  h: string;
  a: string;
  hs?: number;
  as?: number;
  /** aggregate scores (second legs) */
  ha?: number;
  aa?: number;
  /** shootout scores */
  hp?: number;
  ap?: number;
  /** venue name, city, country */
  v?: string;
  city?: string;
  ctry?: string;
  /** live clock ("67'", "HT"), day layer only */
  clk?: string;
  /** the goals in order (shootouts left out), kept only when they add up to the score: ESPN's scoreboards give
   * per-goal events for some competitions and not others (docs/HISTORY.md, 2026-11-15 audit) */
  g?: Goal[];
}

/** One goal: the minute as ESPN shows it ("45+2", "105"), the side credited ('h' / 'a'), and 1 for an own goal (the
 * side credited is the one that benefits, not the scorer's club). */
export type Goal = [min: string, side: 'h' | 'a', og?: 1];

export interface Team {
  id: string;
  abbr: string;
  name: string;
  short: string;
}

export interface Club extends Team {
  league: LeagueSlug;
  region: 'europe' | 'southAmerica';
}

export interface Comp {
  slug: string;
  code: string;
  name: string;
  kind: CompKind;
}

export interface TableRow {
  team: string;
  rank: number;
  p: number;
  w: number;
  d: number;
  l: number;
  gf: number;
  ga: number;
  pts: number;
  /** ESPN's zone note ("Champions League", "Relegation") and its colour */
  zone?: string;
  zc?: string;
}

export interface Table {
  name: string;
  rows: TableRow[];
}

export interface Snapshot {
  v: 1;
  generatedAt: string;
  season: string;
  /** followed clubs, in config order */
  clubs: Club[];
  /** every team that appears in a match (followed clubs included) */
  teams: Record<string, Team>;
  comps: Record<string, Comp>;
  /** sorted by kickoff */
  matches: Match[];
  /** competition slug → its tables (one for a league, one per group) */
  tables: Record<string, Table[]>;
}

/** ESPN's match page: where a click on a match goes. */
export const matchUrl = (id: string) => `https://www.espn.com/soccer/match/_/gameId/${id}`;
