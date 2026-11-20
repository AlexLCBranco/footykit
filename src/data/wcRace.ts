// FK-71: the World Cup's race for the round of 32 at any point of the group stage (editions where third-placed teams
// go through by a pairing table: 2026 on). Matchdays worked out from each group's matches; the tables as they stood;
// for every team whether it is sure to go through, sure to be out, or still open; the round of 32 "as it stands"; and
// who each team would face from each place it can still finish. Pure.
//
// A status is certain only when no result of the matches left can change it. The check is deliberately careful: it
// tries every win / draw / loss of a group's matches left and trusts only what points alone settle (plus, for exactly
// two teams level on points, the match between them: the 2026 rules look at it first). Whatever goal difference could
// still decide is treated as open, since any score is possible. So "Through" and "Out" are never wrong; a few cases
// that only an exact goal count settles show "Open" a little longer.

import { groupMatches, groupTables, rankGroup, thirdsRanking, THIRDS_THROUGH, winSide, type GroupTable, type Result, type WcEdition, type WcMatch } from './worldcup.ts';
import type { Slot, Source } from './wcSim.ts';

export const raceEdition = (ed: Pick<WcEdition, 'thirdsTable'>) => !!ed.thirdsTable?.length;
const letter = (g: string) => g.replace(/^Group /, '');
type Res = (m: WcMatch) => Result | undefined;

/** Each group match's matchday: the 1st, 2nd or 3rd match of its teams, from the group's matches in date order. */
export function matchdays(ed: WcEdition): Map<number, number> {
  const out = new Map<number, number>();
  for (const g of ed.groups) {
    const played = new Map<string, number>();
    const ms = [...groupMatches(ed, g)].sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? '').localeCompare(b.time ?? '') || a.n - b.n);
    for (const m of ms) {
      const md = Math.max(played.get(m.h) ?? 0, played.get(m.a) ?? 0) + 1;
      out.set(m.n, md);
      played.set(m.h, md); played.set(m.a, md);
    }
  }
  return out;
}
/** How many matchdays the group stage has (3 for groups of four). */
export const lastMatchday = (md: Map<number, number>) => Math.max(0, ...md.values());
/** The results as they stood after matchday `point`: later matches have none yet. */
export const resAt = (md: Map<number, number>, point: number): Res => (m) => ((md.get(m.n) ?? 0) <= point ? m : undefined);

export type Certain = 'top2' | 'through' | 'out' | 'open';
export interface Race {
  tables: GroupTable[];
  thirds: ReturnType<typeof thirdsRanking>;
  /** the groups (letters) whose third is in the best eight as it stands */
  thirdsIn: string[];
  status: Map<string, Certain>;
  /** the places each team can still finish in its group */
  places: Map<string, number[]>;
  /** per group letter: is its third (whoever it ends up being) sure to go through / sure to be out */
  thirdOf: Map<string, 'through' | 'out' | 'open'>;
  /** every group match has a result */
  complete: boolean;
}

interface Combo { pts: Map<string, number>; pos: Map<string, Set<number>>; third: number }

/** Every win / draw / loss of the group's matches left: each team's points and the places it could take. */
function combos(t: GroupTable, win: number, res: Res): Combo[] {
  const teams = t.rows.map((r) => r.team);
  const left = t.matches.filter((m) => !res(m));
  const base = new Map(teams.map((x) => [x, 0]));
  const beat = new Map<string, string>(); // "A|B" → the winner of A v B ('' = a draw), for the match already played
  const add = (pts: Map<string, number>, h2h: Map<string, string>, m: WcMatch, w: 0 | 1 | undefined) => {
    pts.set(m.h, pts.get(m.h)! + (w === 0 ? win : w === undefined ? 1 : 0));
    pts.set(m.a, pts.get(m.a)! + (w === 1 ? win : w === undefined ? 1 : 0));
    h2h.set([m.h, m.a].sort().join('|'), w === undefined ? '' : w === 0 ? m.h : m.a);
  };
  for (const m of t.matches) { const r = res(m); if (r) add(base, beat, m, winSide({ s: r.et ?? r.s })); }
  const out: Combo[] = [];
  const n = 3 ** left.length;
  for (let c = 0; c < n; c++) {
    const pts = new Map(base), h2h = new Map(beat);
    let x = c;
    for (const m of left) { const k = x % 3; x = Math.floor(x / 3); add(pts, h2h, m, k === 0 ? 0 : k === 1 ? undefined : 1); }
    const sorted = [...teams].sort((a, b) => pts.get(b)! - pts.get(a)!);
    const pos = new Map<string, Set<number>>();
    for (let i = 0; i < sorted.length;) {
      let j = i + 1;
      while (j < sorted.length && pts.get(sorted[j]!) === pts.get(sorted[i]!)) j++;
      const tied = sorted.slice(i, j);
      const w = tied.length === 2 ? h2h.get([...tied].sort().join('|')) : undefined;
      if (tied.length === 2 && w) { pos.set(w, new Set([i + 1])); pos.set(tied.find((y) => y !== w)!, new Set([i + 2])); }
      else for (const y of tied) pos.set(y, new Set(Array.from({ length: j - i }, (_, k) => i + 1 + k)));
      i = j;
    }
    out.push({ pts, pos, third: pts.get(sorted[2]!) ?? 0 });
  }
  return out;
}

/**
 * The race with the results `res` gives (none = not played yet). `fallback`: the real final order of the thirds, for
 * teams level on every rule the data has.
 */
export function race(ed: WcEdition, res: Res, fallback: string[] = thirdsRanking(groupTables(ed)).map((r) => r.team)): Race {
  const tables = groupTables(ed, res);
  const thirds = thirdsRanking(tables, fallback);
  const thirdsIn = thirds.slice(0, THIRDS_THROUGH).map((r) => letter(r.group));
  const complete = tables.every((t) => t.matches.every((m) => res(m)));
  const status = new Map<string, Certain>(), places = new Map<string, number[]>(), thirdOf = new Map<string, 'through' | 'out' | 'open'>();
  if (complete) {
    // everything is played: the tables say it all
    for (const t of tables) {
      const g = letter(t.group.name);
      const inn = thirdsIn.includes(g);
      thirdOf.set(g, inn ? 'through' : 'out');
      t.rows.forEach((r, i) => { places.set(r.team, [i + 1]); status.set(r.team, i < 2 ? 'top2' : i === 2 && inn ? 'through' : 'out'); });
    }
    return { tables, thirds, thirdsIn, status, places, thirdOf, complete };
  }
  const all = tables.map((t) => ({ g: letter(t.group.name), t, cs: combos(t, ed.win, res) }));
  const range = new Map(all.map((x) => [x.g, { min: Math.min(...x.cs.map((c) => c.third)), max: Math.max(...x.cs.map((c) => c.third)) }]));
  // a third with `p` points in group `g`: sure of the best eight when at most seven other thirds can reach p; sure to
  // miss them when eight other thirds are sure to have more
  const sureIn = (g: string, p: number) => [...range].filter(([o, r]) => o !== g && r.max >= p).length <= THIRDS_THROUGH - 1;
  const sureOut = (g: string, p: number) => [...range].filter(([o, r]) => o !== g && r.min > p).length >= THIRDS_THROUGH;
  for (const { g, t, cs } of all) {
    thirdOf.set(g, cs.every((c) => sureIn(g, c.third)) ? 'through' : cs.every((c) => sureOut(g, c.third)) ? 'out' : 'open');
    for (const r of t.rows) {
      const can = new Set<number>();
      let top2 = true, through = true, out = true;
      for (const c of cs) for (const p of c.pos.get(r.team)!) {
        can.add(p);
        if (p > 2) top2 = false;
        if (p > 3 || (p === 3 && !sureIn(g, c.third))) through = false;
        if (p < 3 || (p === 3 && !sureOut(g, c.third))) out = false;
      }
      places.set(r.team, [...can].sort());
      status.set(r.team, top2 ? 'top2' : through ? 'through' : out ? 'out' : 'open');
    }
  }
  return { tables, thirds, thirdsIn, status, places, thirdOf, complete };
}

export const CERTAIN_LABEL: Record<Certain, string> = { top2: 'Through', through: 'Through', out: 'Out', open: 'Open' };
export const CERTAIN_TIP: Record<Certain, string> = {
  top2: 'Sure to go on to the knockout rounds: it will finish first or second in its group, whatever happens in the matches left',
  through: 'Sure to go on to the knockout rounds: at worst it finishes third, and that third place is sure to be one of the best eight',
  out: 'Cannot go on any more, whatever happens in the matches left',
  open: 'Not decided yet: it depends on the matches left',
};

// ---- the round of 32 as it stands ----
/** The pairing-table row for the eight groups whose thirds go through. */
export const pairingRow = (ed: WcEdition, groups: string[]) => ed.thirdsTable?.find((x) => x.groups === [...groups].sort().join(''));

export interface Standing { slot: Slot; h?: string; a?: string }
/** The first knockout round filled from the tables as they stand: places as they are now, thirds by the pairing table. */
export function standing(ed: WcEdition, r: Pick<Race, 'tables' | 'thirdsIn'>, slots: Slot[]): Standing[] {
  const vs = pairingRow(ed, r.thirdsIn)?.vs;
  const place = (pos: number, g: string) => r.tables.find((t) => letter(t.group.name) === g)?.rows[pos - 1]?.team;
  const team = (s: Source) => (s.kind === 'place' ? place(s.pos, s.group) : s.kind === 'third' ? (vs?.[s.vs] ? place(3, vs[s.vs]!.slice(1)) : undefined) : undefined);
  const first = slots[0]?.stage;
  return slots.filter((s) => s.stage === first).map((slot) => ({ slot, h: team(slot.from[0]), a: team(slot.from[1]) }));
}

/** Which side of the drawn bracket a first-round match leads to: the final's first side is the left one. */
export function sideOf(slots: Slot[], n: number): 'left' | 'right' | undefined {
  const final = slots.find((s) => s.stage === 'Final');
  let cur = n;
  for (let guard = 0; final && guard < 10; guard++) {
    const next = slots.find((s) => s.stage !== 'Third place' && s.from.some((f) => f.kind === 'win' && f.n === cur));
    if (!next) return undefined;
    if (next.n === final.n) return next.from[0].kind === 'win' && next.from[0].n === cur ? 'left' : 'right';
    cur = next.n;
  }
  return undefined;
}

// ---- who a team would face ----
export interface Matchup {
  place: 1 | 2 | 3;
  /** the first-round match it would play (for a third: as it stands; undefined when its third place is not through right now) */
  slot?: Slot;
  side?: 'left' | 'right';
  /** who it would meet, as a slot: "2nd of Group B", or the groups a third could come from, or (for a third) the group winners it could meet */
  versus: { kind: 'place'; pos: number; group: string } | { kind: 'thirds'; groups: string[] } | { kind: 'winners'; groups: string[] };
  /** who that is as it stands */
  now?: string;
  /** a third place only: would it go through as it stands */
  throughNow?: boolean;
}

/** The pairing-table rows still possible: they hold every group whose third is sure to go through and none sure to be out. */
export function possibleRows(ed: WcEdition, thirdOf: Race['thirdOf']) {
  return (ed.thirdsTable ?? []).filter((row) => [...thirdOf].every(([g, s]) => (s === 'through' ? row.groups.includes(g) : s === 'out' ? !row.groups.includes(g) : true)));
}

/** For each place the team can still finish: who it would face in the first knockout round. */
export function matchups(ed: WcEdition, r: Race, slots: Slot[], team: string): Matchup[] {
  const t = r.tables.find((x) => x.rows.some((row) => row.team === team));
  if (!t) return [];
  const g = letter(t.group.name);
  const rows = possibleRows(ed, r.thirdOf);
  const now = standing(ed, r, slots);
  const first = slots.filter((s) => s.stage === slots[0]?.stage);
  const out: Matchup[] = [];
  for (const place of r.places.get(team) ?? []) {
    if (place === 1 || place === 2) {
      const slot = first.find((s) => s.from.some((f) => f.kind === 'place' && f.pos === place && f.group === g));
      if (!slot) continue;
      const mine = slot.from[0].kind === 'place' && slot.from[0].pos === place && slot.from[0].group === g ? 0 : 1;
      const other = slot.from[1 - mine]!;
      const st = now.find((x) => x.slot.n === slot.n);
      const versus: Matchup['versus'] = other.kind === 'place' ? { kind: 'place', pos: other.pos, group: other.group }
        : { kind: 'thirds', groups: [...new Set(rows.map((row) => row.vs[`1${g}`]?.slice(1)).filter((x): x is string => !!x))].sort() };
      out.push({ place, slot, side: sideOf(slots, slot.n), versus, now: mine === 0 ? st?.a : st?.h });
    } else if (place === 3) {
      const winners = [...new Set(rows.flatMap((row) => Object.entries(row.vs).filter(([, third]) => third === `3${g}`).map(([w]) => w.slice(1))))].sort();
      const st = now.find((x) => x.slot.from.some((f) => f.kind === 'third') && (x.h && x.a) && [x.h, x.a].includes(t.rows[2]!.team));
      const throughNow = r.thirdsIn.includes(g);
      out.push({ place: 3, slot: throughNow ? st?.slot : undefined, side: throughNow && st ? sideOf(slots, st.slot.n) : undefined, versus: { kind: 'winners', groups: winners }, now: throughNow && st ? (st.h === t.rows[2]!.team ? st.a : st.h) : undefined, throughNow });
    }
  }
  return out;
}

// ---- the simulator from a point ----
/** The simulator's picks to start from a point: the matchdays after it and every knockout match have no result. */
export function picksFrom(ed: WcEdition, md: Map<number, number>, point: number, slots: Slot[]): Record<number, null> {
  const out: Record<number, null> = {};
  for (const m of ed.matches) if ((md.get(m.n) ?? 0) > point) out[m.n] = null;
  for (const s of slots) out[s.n] = null;
  return out;
}

// ---- the rules box's worked examples (real teams of the edition) ----
export interface ThirdsExample { last: { team: string; group: string; pts: number; gd: number; gf: number }; first: { team: string; group: string; pts: number; gd: number; gf: number }; by: 'points' | 'goal difference' | 'goals scored' | 'level' }
/** The last third through and the first one out, and what separated them. */
export function thirdsExample(ed: WcEdition): ThirdsExample | undefined {
  const rows = thirdsRanking(groupTables(ed));
  const a = rows[THIRDS_THROUGH - 1], b = rows[THIRDS_THROUGH];
  if (!a || !b) return undefined;
  const pick = (r: typeof a) => ({ team: r.team, group: letter(r.group), pts: r.pts, gd: r.gd, gf: r.gf });
  return { last: pick(a), first: pick(b), by: a.pts !== b.pts ? 'points' : a.gd !== b.gd ? 'goal difference' : a.gf !== b.gf ? 'goals scored' : 'level' };
}

export interface TieExample { group: string; high: string; low: string; pts: number; score?: [number, number]; by: 'match' | 'goal difference' | 'goals scored'; values?: [number, number] }
/** Two teams that finished level on points in a group, and why one finished higher (2026's rules: their own match first). */
export function tieExample(ed: WcEdition): TieExample | undefined {
  for (const t of groupTables(ed)) {
    const byPts = new Map<number, typeof t.rows>();
    for (const r of t.rows) byPts.set(r.pts, [...(byPts.get(r.pts) ?? []), r]);
    for (const tied of byPts.values()) {
      if (tied.length !== 2 || tied.some((r) => r.level)) continue;
      const [hi, lo] = tied as [typeof tied[0], typeof tied[0]];
      const m = t.matches.find((x) => [x.h, x.a].includes(hi.team) && [x.h, x.a].includes(lo.team));
      if (!m) continue;
      const score: [number, number] = m.h === hi.team ? [m.s[0], m.s[1]] : [m.s[1], m.s[0]];
      // only an example the ranking really bears out
      const order = rankGroup(t.rows.map((r) => r.team), t.matches, ed.win, 'h2h', t.rows.map((r) => r.team)).map((r) => r.team);
      if (order.indexOf(hi.team) > order.indexOf(lo.team)) continue;
      const base = { group: letter(t.group.name), high: hi.team, low: lo.team, pts: hi.pts, score };
      if (score[0] > score[1]) return { ...base, by: 'match' };
      if (score[0] === score[1] && hi.gd !== lo.gd) return { ...base, by: 'goal difference', values: [hi.gd, lo.gd] };
      if (score[0] === score[1] && hi.gf !== lo.gf) return { ...base, by: 'goals scored', values: [hi.gf, lo.gf] };
    }
  }
  return undefined;
}
