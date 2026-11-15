// The what-if simulator's logic (PLAN.md Phase 5, Decisions log 2026-11-15): picked results for the league-phase
// matches still to play, laid over the real ones so the table (uclTable) and the bracket are rebuilt from them.
// Pure functions only; the view (WhatIfPage.tsx) holds the state.
//  - a click cycles home 1-0 → draw 1-1 → away 0-1 → empty; a typed score is any score;
//  - a real result replaces a pick (a pick only ever fills a match without one);
//  - bulk fills and re-roll leave locked matches alone; "favourites" = the better pot (UEFA's coefficient order),
//    same pot → home win: the snapshot has no odds and footykit has no strength model.

import { isPlayed } from './model.ts';
import type { Match } from './snapshot.ts';
import type { Pot } from './ucl.ts';

export interface Score { h: number; a: number }
export interface Sim {
  /** match id → picked score */
  picks: Record<string, Score>;
  /** match ids the bulk fills, clear and re-roll leave alone */
  locked: Record<string, true>;
}
export const EMPTY: Sim = { picks: {}, locked: {} };

export const HOME: Score = { h: 1, a: 0 };
export const DRAW: Score = { h: 1, a: 1 };
export const AWAY: Score = { h: 0, a: 1 };
const same = (x: Score | undefined, y: Score) => !!x && x.h === y.h && x.a === y.a;

/** The click cycle: empty → 1-0 → 1-1 → 0-1 → empty. A typed score moves on by its outcome (2-0 → 1-1). */
export function cycle(s: Score | undefined): Score | undefined {
  if (!s) return HOME;
  if (s.h > s.a) return DRAW;
  if (s.h === s.a) return AWAY;
  return undefined;
}

/** "2-1", "2:1", "2 1", "21" (two single digits) → 2-1; anything else → undefined. */
export function parseScore(text: string): Score | undefined {
  const t = text.trim();
  const m = /^(\d{1,2})\s*[-:x ]\s*(\d{1,2})$/i.exec(t) ?? /^(\d)(\d)$/.exec(t);
  return m ? { h: Number(m[1]), a: Number(m[2]) } : undefined;
}

export const scoreText = (s: Score) => `${s.h}-${s.a}`;
export const outcome = (s: Score): '1' | 'X' | '2' => (s.h > s.a ? '1' : s.h < s.a ? '2' : 'X');

/** A match a pick can fill: not played and not called off. */
export const open = (m: Match) => !isPlayed(m) && m.st !== 'can';

/** The matches with the picks laid over the open ones, as if played. */
export function simMatches(matches: Match[], sim: Sim): Match[] {
  return matches.map((m) => {
    const p = sim.picks[m.id];
    return p && open(m) ? { ...m, st: 'post' as const, hs: p.h, as: p.a } : m;
  });
}

/** The scenario without picks for matches that are no longer open (a real result came in) or aren't in `matches`. */
export function prune(sim: Sim, matches: Match[]): Sim {
  const ok = new Set(matches.filter(open).map((m) => m.id));
  const picks = Object.fromEntries(Object.entries(sim.picks).filter(([id]) => ok.has(id)));
  const locked = Object.fromEntries(Object.keys(sim.locked).filter((id) => id in picks).map((id) => [id, true as const]));
  return Object.keys(picks).length === Object.keys(sim.picks).length && Object.keys(locked).length === Object.keys(sim.locked).length ? sim : { picks, locked };
}

/** Set (or with `undefined` clear) one match's pick. Clearing a match also unlocks it: a lock holds a pick. */
export function setPick(sim: Sim, id: string, s: Score | undefined): Sim {
  const picks = { ...sim.picks };
  const locked = { ...sim.locked };
  if (s) picks[id] = s;
  else { delete picks[id]; delete locked[id]; }
  return { picks, locked };
}

/** Lock or unlock a picked match (an empty match has nothing to lock). */
export function toggleLock(sim: Sim, id: string): Sim {
  if (!sim.picks[id]) return sim;
  const locked = { ...sim.locked };
  if (locked[id]) delete locked[id];
  else locked[id] = true;
  return { picks: sim.picks, locked };
}

export type Fill = 'home' | 'draw' | 'fav' | 'random';

/** The favourite's win: the better (lower) pot; the same pot → the home team. */
export function favourite(m: Match, pot: (team: string) => Pot | undefined): Score {
  const ph = pot(m.h) ?? 5, pa = pot(m.a) ?? 5;
  return pa < ph ? AWAY : HOME;
}

/** Fill every unlocked match of `ms` (re-roll = 'random': home / draw / away at 1/3 each, from `rnd` in [0, 1)). */
export function fill(sim: Sim, ms: Match[], kind: Fill, pot: (team: string) => Pot | undefined, rnd: () => number = Math.random): Sim {
  const picks = { ...sim.picks };
  for (const m of ms) {
    if (sim.locked[m.id] || !open(m)) continue;
    if (kind === 'home') picks[m.id] = HOME;
    else if (kind === 'draw') picks[m.id] = DRAW;
    else if (kind === 'fav') picks[m.id] = favourite(m, pot);
    else { const r = rnd(); picks[m.id] = r < 1 / 3 ? HOME : r < 2 / 3 ? DRAW : AWAY; }
  }
  return { picks, locked: sim.locked };
}

/** Clear the unlocked picks of `ms`. */
export function clear(sim: Sim, ms: Match[]): Sim {
  const picks = { ...sim.picks };
  for (const m of ms) if (!sim.locked[m.id]) delete picks[m.id];
  return { picks, locked: sim.locked };
}

/** Whether a pick is one of the click cycle's (1-0 / 1-1 / 0-1) rather than a typed score. */
export const isQuick = (s: Score) => same(s, HOME) || same(s, DRAW) || same(s, AWAY);

// ---- what is left to play ----

export interface ToPlay {
  /** open matches of a matchday before today's (postponed, or past and still without a result), oldest first */
  pending: Match[];
  /** the other open matches by matchday, in kickoff order */
  matchdays: { n: number; matches: Match[] }[];
}

/** Matchdays of the league phase: the matches in kickoff order, a new matchday after a gap of more than 4 days
 * (a matchday spans 2–3 consecutive days; matchdays are weeks apart). Match id → matchday number. */
export function matchdayOf(matches: Match[]): Map<string, number> {
  const sorted = [...matches].sort((x, y) => x.t.localeCompare(y.t));
  const out = new Map<string, number>();
  let n = 0, last = -Infinity;
  for (const m of sorted) {
    const t = Date.parse(m.t);
    if (t - last > 4 * 86_400_000) n++;
    last = t;
    out.set(m.id, n);
  }
  return out;
}

/** What is left to play on `today` (the viewer's day; `dayOf` gives a match's day in the same zone). */
export function toPlay(matches: Match[], today: string, dayOf: (m: Match) => string): ToPlay {
  const md = matchdayOf(matches);
  const left = matches.filter(open).sort((x, y) => x.t.localeCompare(y.t));
  const pending = left.filter((m) => m.st === 'ppd' || (m.st !== 'in' && dayOf(m) < today));
  const rest = left.filter((m) => !pending.includes(m));
  const matchdays: ToPlay['matchdays'] = [];
  for (const m of rest) {
    const n = md.get(m.id)!;
    const g = matchdays.at(-1);
    if (g && g.n === n) g.matches.push(m);
    else matchdays.push({ n, matches: [m] });
  }
  return { pending, matchdays };
}

// ---- the bracket the table leads to ----

export interface Block {
  letter: 'A' | 'B' | 'C' | 'D';
  /** the round-of-16 seeded pair (positions, teams) */
  r16: [number, number];
  /** the play-off section whose winners they meet: seeded pair v unseeded pair */
  section: 'I' | 'II' | 'III' | 'IV';
  seeded: [number, number];
  unseeded: [number, number];
}

/** A–D in order (config/ucl.ts's pairs run 7/8 … 1/2, sections I–IV). */
export function blocks(pairs: { seeded: [number, number]; unseeded: [number, number]; r16: [number, number] }[]): Block[] {
  const letters = ['D', 'C', 'B', 'A'] as const, sections = ['I', 'II', 'III', 'IV'] as const;
  return pairs.map((p, i) => ({ letter: letters[i]!, r16: p.r16, section: sections[i]!, seeded: p.seeded, unseeded: p.unseeded })).reverse();
}

/**
 * Where a position meets whom, from Art. 19's pairings: the play-off opponents (the other pair of its section), the
 * round-of-16 opponents, and its pair-mate (1st/2nd, 9th/10th, 23rd/24th…), which is always in the OTHER half: each
 * half has one tie of each letter, so the two teams of a pair go down different ties and can only meet in the final.
 */
export function meets(pos: number, pairs: { seeded: [number, number]; unseeded: [number, number]; r16: [number, number] }[]): { playoff: number[]; r16: number[]; otherHalf?: number } {
  const p = pairs.find((x) => x.r16.includes(pos) || x.seeded.includes(pos) || x.unseeded.includes(pos));
  if (!p) return { playoff: [], r16: [] };
  const mate = (pair: [number, number]) => (pair[0] === pos ? pair[1] : pair[0]);
  if (p.r16.includes(pos)) return { playoff: [], r16: [...p.seeded, ...p.unseeded], otherHalf: mate(p.r16) };
  const seeded = p.seeded.includes(pos);
  return { playoff: seeded ? p.unseeded : p.seeded, r16: p.r16, otherHalf: mate(seeded ? p.seeded : p.unseeded) };
}

// ---- undo / redo ----

export interface History { past: Sim[]; now: Sim; future: Sim[] }
const KEEP = 200;
export const history = (now: Sim): History => ({ past: [], now, future: [] });
/** A new state; a change that changes nothing adds no step. */
export function push(h: History, next: Sim): History {
  if (next === h.now || JSON.stringify(next) === JSON.stringify(h.now)) return h;
  return { past: [...h.past, h.now].slice(-KEEP), now: next, future: [] };
}
export const undo = (h: History): History => (h.past.length ? { past: h.past.slice(0, -1), now: h.past.at(-1)!, future: [h.now, ...h.future] } : h);
export const redo = (h: History): History => (h.future.length ? { past: [...h.past, h.now], now: h.future[0]!, future: h.future.slice(1) } : h);

// ---- storage ----

/** localStorage key (the gauntlet's backup saves every key, so scenarios are backed up with the rest). */
export const WHATIF_KEY = 'fk:whatif:v1';
interface Stored { v: 1; current: Sim }

const isScore = (x: unknown): x is Score => !!x && typeof x === 'object' && Number.isInteger((x as Score).h) && Number.isInteger((x as Score).a) && (x as Score).h >= 0 && (x as Score).a >= 0;

/** The stored scenario, or EMPTY when there is none or it doesn't read as one. */
export function readSim(text: string | null): Sim {
  try {
    const v = JSON.parse(text ?? 'null') as Stored | null;
    if (!v || v.v !== 1 || !v.current || typeof v.current.picks !== 'object' || !v.current.picks) return EMPTY;
    const picks = Object.fromEntries(Object.entries(v.current.picks).filter(([, s]) => isScore(s)));
    const locked = Object.fromEntries(Object.entries(v.current.locked ?? {}).filter(([id, x]) => x === true && id in picks)) as Record<string, true>;
    return { picks, locked };
  } catch {
    return EMPTY;
  }
}

/** What to store: nothing (null) for an empty scenario, so a visit that picks nothing leaves no key behind. */
export function writeSim(sim: Sim): string | null {
  return Object.keys(sim.picks).length ? JSON.stringify({ v: 1, current: sim } satisfies Stored) : null;
}
