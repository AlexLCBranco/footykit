// Cup competitions with groups and ties (the Libertadores and Sudamericana; config/conmebol.ts): the group tables
// ranked by the competition's rules (the league tables' engine), and the ties of each stage. ESPN has the ties but not
// the bracket's letters, so the bracket is ordered from its ties: from the final back, each tie sits next to the ties
// that fed it (a tie of the next round holds one team of each).

import type { CupConfig } from '../../config/conmebol.ts';
import { rankTable, type LeagueRow } from './leagueTable.ts';
import { isPlayed } from './model.ts';
import type { Match, Snapshot } from './snapshot.ts';

export interface CupTie {
  round: string;
  /** the team hosting the last leg (the better seed; the final's administrative home team) first */
  a: string;
  b: string;
  legs: Match[];
  goalsA: number;
  goalsB: number;
  pensA?: number;
  pensB?: number;
  winner?: string;
}

/** The ties of one stage. `legs`: 1 for a single-match stage (the final, a single-leg first stage), else 2. */
export function stageTies(matches: Match[], round: string, legs: 1 | 2): CupTie[] {
  const by = new Map<string, Match[]>();
  for (const m of matches) {
    if (m.r !== round || m.st === 'can') continue;
    const k = [m.h, m.a].sort().join('-');
    by.set(k, [...(by.get(k) ?? []), m]);
  }
  return [...by.values()].map((ms) => {
    ms.sort((x, y) => x.t.localeCompare(y.t));
    const last = ms[ms.length - 1]!;
    const [a, b] = [last.h, last.a];
    const tie: CupTie = { round, a, b, legs: ms, goalsA: 0, goalsB: 0 };
    for (const m of ms) {
      if (!isPlayed(m)) continue;
      tie.goalsA += m.h === a ? m.hs! : m.as!;
      tie.goalsB += m.h === a ? m.as! : m.hs!;
      if (m.hp !== undefined && m.ap !== undefined) { tie.pensA = m.h === a ? m.hp : m.ap; tie.pensB = m.h === a ? m.ap : m.hp; }
    }
    // goals over the legs (the final's include extra time), then the shootout; open until every leg is played
    if (ms.length === legs && ms.every(isPlayed)) {
      tie.winner = tie.goalsA > tie.goalsB ? a : tie.goalsB > tie.goalsA ? b
        : tie.pensA !== undefined && tie.pensB !== undefined && tie.pensA !== tie.pensB ? (tie.pensA > tie.pensB ? a : b) : undefined;
    }
    return tie;
  });
}

export interface CupGroup { name: string; rows: LeagueRow[]; matches: Match[]; complete: boolean }

/** The group tables: members from ESPN's group tables, results from the group-stage matches. */
export function cupGroups(snap: Pick<Snapshot, 'matches' | 'tables' | 'teams'>, cfg: CupConfig): CupGroup[] {
  const gm = snap.matches.filter((m) => m.c === cfg.slug && m.r === 'Group Stage');
  return (snap.tables[cfg.slug] ?? []).map((t) => {
    const members = t.rows.map((r) => r.team);
    const set = new Set(members);
    const matches = gm.filter((m) => set.has(m.h) && set.has(m.a));
    return { name: t.name, matches, ...rankTable(members, matches, cfg.groupRules, (id) => snap.teams[id]?.name ?? id) };
  });
}

const has = (t: CupTie, team: string) => t.a === team || t.b === team;

/** The knockout stages as bracket columns, ordered from the final back (ties feeding the same tie side by side). A stage
 * whose next stage isn't fixtured keeps ESPN's order. */
export function bracketColumns(rounds: CupTie[][]): CupTie[][] {
  const cols = rounds.map((r) => [...r]);
  for (let i = cols.length - 2; i >= 0; i--) {
    const next = cols[i + 1]!;
    if (!next.length) continue;
    const placed: CupTie[] = [];
    for (const n of next) for (const t of cols[i]!) if (!placed.includes(t) && (has(n, t.a) || has(n, t.b))) placed.push(t);
    cols[i] = [...placed, ...cols[i]!.filter((t) => !placed.includes(t))];
  }
  return cols;
}

/** ESPN's stand-in for a team not known yet ("TBD Home" / "TBD Away"): such a match is a slot, not a tie. */
export const isPlaceholder = (name: string | undefined) => !name || /^TBD\b/i.test(name);

export interface CupRound { round: string; legs: 1 | 2; ties: CupTie[]; /** ties whose teams aren't known yet */ open: number }

/** A domestic cup's rounds from ESPN's data, in the order they are played (earliest kickoff); a round is two-legged
 * when the config says so or ESPN numbers its legs, the final is one match. */
export function cupRounds(matches: Match[], twoLeg: string[], name: (id: string) => string | undefined): CupRound[] {
  const by = new Map<string, Match[]>();
  for (const m of matches) if (m.r && m.st !== 'can') by.set(m.r, [...(by.get(m.r) ?? []), m]);
  return [...by]
    .sort(([, a], [, b]) => a[0]!.t.localeCompare(b[0]!.t))
    .map(([round, ms]) => {
      const legs: 1 | 2 = round !== 'Final' && (twoLeg.includes(round) || ms.some((m) => m.leg)) ? 2 : 1;
      const known = ms.filter((m) => !isPlaceholder(name(m.h)) && !isPlaceholder(name(m.a)));
      return { round, legs, ties: stageTies(known, round, legs), open: Math.round((ms.length - known.length) / legs) };
    });
}
