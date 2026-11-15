// A league table rebuilt from the snapshot's results with the league's own ties-on-points rules (config/leagues.ts):
// teams level on points are split by the criteria in order; a head-to-head criterion compares only the tied teams'
// matches against each other (a mini-table of the group still level at that step). Teams still level after every
// criterion the data allows share a place, listed by name. The members are the teams in ESPN's table.

import { LEAGUES, type Criterion, type LeagueRules } from '../../config/leagues.ts';
import type { LeagueSlug } from '../../config/season.ts';
import { isPlayed } from './model.ts';
import type { Match, Snapshot } from './snapshot.ts';

export interface LeagueRow {
  team: string;
  rank: number;
  level: boolean;
  p: number; w: number; d: number; l: number;
  gf: number; ga: number; gd: number; pts: number;
  awayW: number; awayGf: number;
  /** the last 5 league matches played and the next 3 to play */
  last: Match[];
  next: Match[];
}

export interface LeagueTable {
  league: LeagueSlug;
  rows: LeagueRow[];
  /** every match of the season played (end-of-season criteria apply) */
  complete: boolean;
}

interface Tally { p: number; w: number; d: number; l: number; gf: number; ga: number; pts: number; awayW: number; awayGf: number }
const empty = (): Tally => ({ p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0, awayW: 0, awayGf: 0 });
function add(t: Tally, gf: number, ga: number, away: boolean) {
  t.p++; t.gf += gf; t.ga += ga;
  if (gf > ga) { t.w++; t.pts += 3; if (away) t.awayW++; } else if (gf === ga) { t.d++; t.pts++; } else t.l++;
  if (away) t.awayGf += gf;
}

/** Head-to-head among `group`: each team's tally over the group's matches against each other, and whether all
 * of them (home and away for every pair) are played. */
export function headToHead(group: string[], played: Match[], all: Match[]): { tally: Map<string, Tally>; complete: boolean } {
  const set = new Set(group);
  const tally = new Map(group.map((t) => [t, empty()]));
  for (const m of played) {
    if (!set.has(m.h) || !set.has(m.a)) continue;
    add(tally.get(m.h)!, m.hs!, m.as!, false);
    add(tally.get(m.a)!, m.as!, m.hs!, true);
  }
  const mutual = all.filter((m) => set.has(m.h) && set.has(m.a) && m.st !== 'can');
  const pairs = group.length * (group.length - 1); // each ordered pair meets once at home
  return { tally, complete: mutual.length >= pairs && mutual.every(isPlayed) };
}

const value = (c: Criterion, t: Tally, h?: Tally): number | undefined => {
  switch (c) {
    case 'gd': return t.gf - t.ga;
    case 'gf': return t.gf;
    case 'wins': return t.w;
    case 'awayWins': return t.awayW;
    case 'awayGf': return t.awayGf;
    case 'h2hPts': return h?.pts;
    case 'h2hGd': return h ? h.gf - h.ga : undefined;
    case 'h2hGf': return h?.gf;
    case 'h2hAwayGf': return h?.awayGf;
  }
};

export function leagueTable(snap: Pick<Snapshot, 'matches' | 'tables' | 'teams'>, league: LeagueSlug): LeagueTable {
  const members = (snap.tables[league]?.[0]?.rows ?? []).map((r) => r.team);
  const inLeague = new Set(members);
  const all = snap.matches.filter((m) => m.c === league && inLeague.has(m.h) && inLeague.has(m.a));
  return { league, ...rankTable(members, all, LEAGUES[league], (t) => snap.teams[t]?.name ?? t) };
}

/** The ranking rules a table needs (a league's, or a CONMEBOL group's). */
export type RankRules = Pick<LeagueRules, 'tiebreak' | 'h2hWhenPlayed' | 'h2hTwoOnly' | 'endOnly'>;

/** A table of `members` from `all` their matches against each other (league or group), ranked by `rules`. */
export function rankTable(members: string[], all: Match[], rules: RankRules, name: (t: string) => string): { rows: LeagueRow[]; complete: boolean } {
  const played = all.filter(isPlayed);
  const tally = new Map(members.map((t) => [t, empty()]));
  for (const m of played) {
    add(tally.get(m.h)!, m.hs!, m.as!, false);
    add(tally.get(m.a)!, m.as!, m.hs!, true);
  }
  const complete = all.length > 0 && all.every((m) => isPlayed(m) || m.st === 'can');
  const criteria = [...rules.tiebreak, ...(complete ? rules.endOnly ?? [] : [])];

  /** Orders a group level on points, criterion by criterion; returns groups still level (in order). */
  function split(group: string[], from: number): string[][] {
    if (group.length < 2 || from >= criteria.length) return [group];
    const c = criteria[from]!;
    let h2h: Map<string, Tally> | undefined;
    if (c.startsWith('h2h')) {
      if (rules.h2hTwoOnly && group.length !== 2) return split(group, from + 1);
      const hh = headToHead(group, played, all);
      if (rules.h2hWhenPlayed && !hh.complete) return split(group, from + 1);
      h2h = hh.tally;
    }
    const v = (t: string) => value(c, tally.get(t)!, h2h?.get(t)) ?? 0;
    const sorted = [...group].sort((a, b) => v(b) - v(a));
    const out: string[][] = [];
    for (const t of sorted) {
      const last = out[out.length - 1];
      if (last && v(last[0]!) === v(t)) last.push(t); else out.push([t]);
    }
    return out.flatMap((g) => split(g, from + 1));
  }

  const byPts = new Map<number, string[]>();
  for (const t of members) { const p = tally.get(t)!.pts; byPts.set(p, [...(byPts.get(p) ?? []), t]); }
  const groups = [...byPts.keys()].sort((a, b) => b - a).flatMap((p) => split(byPts.get(p)!, 0)).map((g) => g.sort((a, b) => name(a).localeCompare(name(b))));

  const rows: LeagueRow[] = [];
  for (const g of groups) {
    const rank = rows.length + 1;
    for (const team of g) {
      const t = tally.get(team)!;
      const mine = all.filter((m) => m.h === team || m.a === team);
      rows.push({
        team, rank, level: g.length > 1, ...t, gd: t.gf - t.ga,
        last: mine.filter(isPlayed).slice(-5),
        next: mine.filter((m) => !isPlayed(m) && m.st !== 'can').slice(0, 3),
      });
    }
  }
  return { rows, complete };
}
