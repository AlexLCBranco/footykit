// Goals while trailing (Alex's definition): every goal a team scores while the other side is ahead at that moment —
// 0-1 → 1-1, 0-2 → 1-2, 2-4 → 3-4 all count, levelling or not. Own goals count for the side credited; extra time counts;
// shootout kicks never reach the snapshot (src/data/espn.ts goalsOf).

import type { Goal, Match, Snapshot } from './snapshot.ts';

/** The competitions shown: those whose ESPN scoreboards gave every played match's goals in the 2026-11-15 audit
 * (docs/HISTORY.md). Copa do Brasil, Copa del Rey and Coupe de France miss many matches' goals, and the state
 * championships and super cups have no scoreboard in the snapshot, so they are left out rather than shown wrong. The
 * Libertadores lacks one match (an 0-3 with no goals anywhere, an awarded result): counted as no goals while trailing. */
export const TRAILING_COMPS = [
  'eng.1', 'esp.1', 'ita.1', 'ger.1', 'fra.1', 'bra.1',
  'uefa.champions', 'uefa.europa', 'uefa.europa.conf', 'conmebol.libertadores', 'conmebol.sudamericana',
  'eng.fa', 'eng.league_cup', 'ger.dfb_pokal', 'ita.coppa_italia',
];
export const DEFAULT_TRAILING = TRAILING_COMPS[0]!;

export type GoalState = 'trailing' | 'level' | 'leading';

/** For each goal in order, how the scoring side stood just before it. */
export function goalStates(goals: Goal[]): GoalState[] {
  let h = 0, a = 0;
  return goals.map(([, side]) => {
    const mine = side === 'h' ? h : a, theirs = side === 'h' ? a : h;
    if (side === 'h') h++; else a++;
    return mine < theirs ? 'trailing' : mine === theirs ? 'level' : 'leading';
  });
}

export interface TrailingRow {
  team: string;
  rank: number;
  p: number;
  trailing: number;
  level: number;
  leading: number;
  perGame: number;
}

export interface TrailingTable {
  rows: TrailingRow[];
  /** played matches with goals but no goal list (counted as no goals while trailing) */
  missing: Match[];
}

const played = (m: Match) => m.st === 'post' && m.hs !== undefined && m.as !== undefined;

/** One competition's table: every team with a played match, most goals while trailing first, then per game; teams
 * equal on both share a rank. */
export function trailingTable(snap: Snapshot, comp: string, name: (id: string) => string = (id) => id): TrailingTable {
  const rows = new Map<string, TrailingRow>();
  const row = (team: string) => {
    let r = rows.get(team);
    if (!r) rows.set(team, (r = { team, rank: 0, p: 0, trailing: 0, level: 0, leading: 0, perGame: 0 }));
    return r;
  };
  const missing: Match[] = [];
  for (const m of snap.matches) {
    if (m.c !== comp || !played(m)) continue;
    const h = row(m.h), a = row(m.a);
    h.p++; a.p++;
    if (!m.g) { if (m.hs! + m.as! > 0) missing.push(m); continue; }
    goalStates(m.g).forEach((s, i) => { (m.g![i]![1] === 'h' ? h : a)[s]++; });
  }
  const out = [...rows.values()];
  for (const r of out) r.perGame = r.p ? r.trailing / r.p : 0;
  out.sort((x, y) => y.trailing - x.trailing || y.perGame - x.perGame || name(x.team).localeCompare(name(y.team)));
  out.forEach((r, i) => {
    const prev = out[i - 1];
    r.rank = prev && prev.trailing === r.trailing && prev.perGame === r.perGame ? prev.rank : i + 1;
  });
  return { rows: out, missing };
}
