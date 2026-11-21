// FK-72: a league's relegation race. Who is listed: every team in a place that goes down, the team in a play-off
// place, and the teams close above the drop zone by the Z4R tag's rule (config/relegation.ts: through round 8 within 1
// point of the zone's top place, from round 9 within 3; a team's round is its matches played + 1). Places come from
// the league table with its tie-breakers (src/data/leagueTable.ts); gaps are in points only.
// "Safety" is the lowest place that neither goes down nor plays a play-off.

import { RELEGATION, Z4R_RULE, type Relegation } from '../../config/relegation.ts';
import type { LeagueSlug } from '../../config/season.ts';
import { leagueMatches, leagueTable, type LeagueRow } from './leagueTable.ts';
import { isPlayed } from './model.ts';
import type { Match, Snapshot } from './snapshot.ts';

/** down = in a place that goes down; playoff = in the play-off place; close = safe for now, but near the drop zone */
export type RaceStatus = 'down' | 'playoff' | 'close';

export interface RaceRow<R = unknown> {
  team: string;
  /** place in the table, 1 = top */
  place: number;
  pts: number;
  /** league matches played and still to play */
  played: number;
  left: number;
  status: RaceStatus;
  /** down / playoff: points behind the last safe team (0 = level with it); close: points above the drop zone's top team */
  gap: number;
  row: R;
}

export interface RaceLine { team: string; place: number; pts: number }

export interface Race<R = unknown> {
  /** teams in the league, and how many go down / play a play-off */
  size: number;
  direct: number;
  playoff: number;
  /** the lowest safe team and the highest team of the drop zone; none before a table exists */
  lastSafe?: RaceLine;
  firstDown?: RaceLine;
  rows: RaceRow<R>[];
}

/** How many points above the drop zone still counts as close, for a team about to play its `round`-th match. */
export const closeLimit = (round: number) => (round <= Z4R_RULE.earlyRounds ? Z4R_RULE.early : Z4R_RULE.late);

/** The race from a ranked table (top first). `left` = each team's league matches still to play. */
export function raceFromTable<R extends { team: string; pts: number; p: number }>(table: readonly R[], rule: Pick<Relegation, 'direct' | 'playoff'>, left: (team: string) => number): Race<R> {
  const size = table.length;
  const base = { size, direct: rule.direct, playoff: rule.playoff };
  // no table before the first result: nobody is "in" a zone yet
  if (size <= rule.direct + rule.playoff || table.every((r) => r.p === 0)) return { ...base, rows: [] };
  const downFrom = size - rule.direct; // index of the drop zone's top place
  const playoffFrom = downFrom - rule.playoff;
  const line = (i: number): RaceLine => ({ team: table[i]!.team, place: i + 1, pts: table[i]!.pts });
  const lastSafe = line(playoffFrom - 1), firstDown = line(downFrom);
  const rows: RaceRow<R>[] = [];
  table.forEach((r, i) => {
    const common = { team: r.team, place: i + 1, pts: r.pts, played: r.p, left: left(r.team), row: r };
    if (i >= downFrom) rows.push({ ...common, status: 'down', gap: lastSafe.pts - r.pts });
    else if (i >= playoffFrom) rows.push({ ...common, status: 'playoff', gap: lastSafe.pts - r.pts });
    else if (r.pts - firstDown.pts <= closeLimit(r.p + 1)) rows.push({ ...common, status: 'close', gap: r.pts - firstDown.pts });
  });
  return { ...base, lastSafe, firstDown, rows };
}

export interface LeagueRace extends Race<LeagueRow> {
  league: LeagueSlug;
  /** every match of the season played */
  complete: boolean;
  /** the matches still to play between two listed teams, by kickoff */
  between: Match[];
}

/** The matches of `matches` still to play (not played, not cancelled). */
export const toPlay = (matches: readonly Match[]) => matches.filter((m) => !isPlayed(m) && m.st !== 'can');

export function relegationRace(snap: Pick<Snapshot, 'matches' | 'tables' | 'teams'>, league: LeagueSlug): LeagueRace {
  const table = leagueTable(snap, league);
  const open = toPlay(leagueMatches(snap, league).matches);
  const left = new Map<string, number>();
  for (const m of open) for (const t of [m.h, m.a]) left.set(t, (left.get(t) ?? 0) + 1);
  const race = raceFromTable(table.rows, RELEGATION[league], (t) => left.get(t) ?? 0);
  const listed = new Set(race.rows.map((r) => r.team));
  return { ...race, league, complete: table.complete, between: open.filter((m) => listed.has(m.h) && listed.has(m.a)) };
}

const pts = (n: number) => `${n} point${n === 1 ? '' : 's'}`;

/** The gap in plain words: "2 points from safety", "Same points as the last safe team", "3 points above the drop zone". */
export function gapText(r: Pick<RaceRow, 'status' | 'gap'>): string {
  if (r.status === 'close') return r.gap > 0 ? `${pts(r.gap)} above the drop zone` : 'Same points as the drop zone';
  return r.gap > 0 ? `${pts(r.gap)} from safety` : 'Same points as the last safe team';
}

export const statusText = (s: RaceStatus, complete = false): string =>
  s === 'down' ? (complete ? 'Goes down' : 'In the drop zone') : s === 'playoff' ? 'Play-off place' : complete ? 'Stays up' : 'Close to the drop zone';
