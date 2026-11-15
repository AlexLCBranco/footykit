// The Champions League league phase, rebuilt from the snapshot's results (config/ucl.ts has the rules): the 36-team
// table, each team's 8 matches as slots, the remaining opponents, and where each position leads.
// Ranking (Alex, 2026-11-15): points, then criteria 1–5 of Art. 18 while the phase is being played (teams still level
// share a place, listed by name, as UEFA's and Wikipedia's mid-phase tables do), criteria 1–8 once every match is
// played. Criteria 9–10 (cards, club coefficient) aren't in the data: teams still level then are flagged, not guessed.

import { UCL_LEAGUE_PHASE, UCL_PLAYOFF_PAIRS, UCL_POTS, UCL_ZONES } from '../../config/ucl.ts';
import { isPlayed } from './model.ts';
import type { Match, Snapshot } from './snapshot.ts';

export const UCL = 'uefa.champions';
export type Pot = 1 | 2 | 3 | 4;
type Result = 'W' | 'D' | 'L';

export interface UclSlot {
  m: Match;
  opp: string;
  home: boolean;
  pot: Pot;
  played: boolean;
  /** this team's goals and the opponent's (played) */
  gf?: number;
  ga?: number;
  res?: Result;
}

export interface UclRow {
  team: string;
  pot: Pot;
  /** place in the table; teams level on every criterion applied share it */
  rank: number;
  /** level with another team on every criterion applied */
  level: boolean;
  p: number; w: number; d: number; l: number;
  gf: number; ga: number; gd: number; pts: number;
  awayGf: number; awayW: number;
  /** league-phase opponents together (criteria 6–8): points, goal difference, goals */
  oppPts: number; oppGd: number; oppGf: number;
  /** the 8 matches, in kickoff order */
  slots: UclSlot[];
  /** league-phase results, oldest first, the last 5 */
  last5: Result[];
}

export interface UclTable {
  rows: UclRow[];
  /** every league-phase match has a result: criteria 6–8 apply */
  complete: boolean;
  /** matchdays every team has played */
  matchday: number;
}

/** A season's league phase: its teams with their pots, and its dates. */
export interface Phase { pots: Map<string, Pot>; from: string; to: string }
/** This season's (config/ucl.ts). Another season (the tests' recorded 2025-26) passes its own. */
export const PHASE: Phase = { pots: new Map(UCL_POTS.flatMap((p) => p.teams.map((t) => [t, p.pot] as const))), from: UCL_LEAGUE_PHASE.from, to: UCL_LEAGUE_PHASE.to };
export const potOf = (team: string): Pot | undefined => PHASE.pots.get(team);

/** The league phase's matches: both teams in the pots, inside the phase's dates. */
export function leaguePhaseMatches(snap: Pick<Snapshot, 'matches'>, phase: Phase = PHASE): Match[] {
  const to = `${phase.to}T23:59Z`;
  return snap.matches.filter((m) => m.c === UCL && phase.pots.has(m.h) && phase.pots.has(m.a) && m.t >= phase.from && m.t <= to);
}

const res = (gf: number, ga: number): Result => (gf > ga ? 'W' : gf < ga ? 'L' : 'D');

export function uclTable(snap: Pick<Snapshot, 'matches' | 'teams'>, names: (id: string) => string = (id) => snap.teams[id]?.name ?? id, phase: Phase = PHASE): UclTable {
  const matches = leaguePhaseMatches(snap, phase);
  const rows = new Map<string, UclRow>();
  for (const [team, pot] of phase.pots) {
    rows.set(team, { team, pot, rank: 0, level: false, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0, awayGf: 0, awayW: 0, oppPts: 0, oppGd: 0, oppGf: 0, slots: [], last5: [] });
  }
  for (const m of matches) {
    for (const home of [true, false]) {
      const row = rows.get(home ? m.h : m.a)!;
      const opp = home ? m.a : m.h;
      const played = isPlayed(m);
      const slot: UclSlot = { m, opp, home, pot: phase.pots.get(opp)!, played };
      if (played) {
        const gf = home ? m.hs! : m.as!, ga = home ? m.as! : m.hs!;
        const r = res(gf, ga);
        Object.assign(slot, { gf, ga, res: r });
        row.p++; row.gf += gf; row.ga += ga;
        if (r === 'W') { row.w++; row.pts += 3; if (!home) row.awayW++; } else if (r === 'D') { row.d++; row.pts += 1; } else row.l++;
        if (!home) row.awayGf += gf;
        row.last5.push(r);
      }
      row.slots.push(slot);
    }
  }
  const all = [...rows.values()];
  for (const r of all) { r.gd = r.gf - r.ga; r.last5 = r.last5.slice(-5); }
  const complete = matches.length > 0 && matches.every(isPlayed);
  if (complete) {
    for (const r of all) {
      for (const s of r.slots) { const o = rows.get(s.opp)!; r.oppPts += o.pts; r.oppGd += o.gd; r.oppGf += o.gf; }
    }
  }
  const keys = (r: UclRow) => [r.pts, r.gd, r.gf, r.awayGf, r.w, r.awayW, ...(complete ? [r.oppPts, r.oppGd, r.oppGf] : [])];
  const cmp = (a: UclRow, b: UclRow) => {
    const ka = keys(a), kb = keys(b);
    for (let i = 0; i < ka.length; i++) if (ka[i] !== kb[i]) return kb[i]! - ka[i]!;
    return 0;
  };
  all.sort((a, b) => cmp(a, b) || names(a.team).localeCompare(names(b.team)));
  all.forEach((r, i) => {
    const prev = all[i - 1];
    r.rank = prev && cmp(prev, r) === 0 ? prev.rank : i + 1;
    if (prev && cmp(prev, r) === 0) { prev.level = true; r.level = true; }
  });
  return { rows: all, complete, matchday: Math.min(...all.map((r) => r.p)) };
}

export type ZoneId = (typeof UCL_ZONES)[number]['id'];
export const zoneOf = (pos: number) => UCL_ZONES.find((z) => pos >= z.from && pos <= z.to)!;

const ord = (n: number) => `${n}${n % 10 === 1 && n % 100 !== 11 ? 'st' : n % 10 === 2 && n % 100 !== 12 ? 'nd' : n % 10 === 3 && n % 100 !== 13 ? 'rd' : 'th'}`;
const pair = ([a, b]: [number, number]) => `${ord(a)}/${ord(b)}`;

/** Where finishing at `pos` leads (Art. 19.02–19.03), and the positions it is paired with. */
export function positionPath(pos: number): { text: string; related: number[] } {
  const p = UCL_PLAYOFF_PAIRS.find((x) => x.r16.includes(pos) || x.seeded.includes(pos) || x.unseeded.includes(pos));
  if (!p) return { text: `${ord(pos)}: eliminated (no Europa League place)`, related: [] };
  const related = [...p.r16, ...p.seeded, ...p.unseeded].filter((x) => x !== pos);
  if (p.r16.includes(pos)) {
    return { text: `${ord(pos)}: round of 16, seeded (2nd leg at home), against the winner of the play-off ${pair(p.seeded)} v ${pair(p.unseeded)}`, related };
  }
  const seeded = p.seeded.includes(pos);
  return {
    text: `${ord(pos)}: knockout play-off, ${seeded ? 'seeded (2nd leg at home)' : 'unseeded (1st leg at home)'}, against the ${pair(seeded ? p.unseeded : p.seeded)}; the winner meets the ${pair(p.r16)} in the round of 16`,
    related,
  };
}

/** The matches a team has left, in kickoff order. */
export const remaining = (row: UclRow) => row.slots.filter((s) => !s.played);
