// The what-if simulator's logic (PLAN.md Phase 5, Decisions log 2026-11-15): picked results for the matches still to
// play, laid over the real ones so the table (the UCL's uclTable, a league's rankTable) is rebuilt from them. Picks
// are keyed by match id; each competition keeps its own picks and saved scenarios. Pure functions only; the views
// (WhatIfPage.tsx, LeagueWhatIfPage.tsx) hold the state.
//  - a click cycles home 1-0 → draw 1-1 → away 0-1 → empty; a typed score is any score;
//  - a real result replaces a pick (a pick only ever fills a match without one);
//  - bulk fills and re-roll leave locked matches alone; "favourites" = the better rank: the UCL's pot (UEFA's
//    coefficient order), a league's place in today's real table; equal → home win. The snapshot has no odds and
//    footykit has no strength model.

import { isPlayed } from './model.ts';
import type { Match } from './snapshot.ts';
import { windowEnd, windowOf, type WindowKind } from './windows.ts';

export interface Score { h: number; a: number }
export interface Sim {
  /** match id → picked score */
  picks: Record<string, Score>;
  /** match ids the bulk fills, clear and re-roll leave alone */
  locked: Record<string, true>;
  /** a final's picked winner, by the final's key (the Brasileirão's: 'cup' | 'lib' | 'sula'): a final is picked by its
   * winner, not a score, since a shootout can decide it. Absent when none is picked. */
  winners?: Record<string, string>;
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

/** A final as the simulator sees it: its two teams and, once played, its real winner. */
export interface FinalState { finalists: [string, string]; winner?: string }

/** The scenario without picks for matches that are no longer open (a real result came in) or aren't in `matches`, and
 * without picked winners of finals that are decided, not in `finals`, or for a team that isn't a finalist. */
export function prune(sim: Sim, matches: Match[], finals: Record<string, FinalState | undefined> = {}): Sim {
  const ok = new Set(matches.filter(open).map((m) => m.id));
  const picks = Object.fromEntries(Object.entries(sim.picks).filter(([id]) => ok.has(id)));
  const locked = Object.fromEntries(Object.keys(sim.locked).filter((id) => id in picks).map((id) => [id, true as const]));
  const winners = Object.fromEntries(Object.entries(sim.winners ?? {}).filter(([k, t]) => { const f = finals[k]; return !!f && !f.winner && f.finalists.includes(t); }));
  const same = Object.keys(picks).length === Object.keys(sim.picks).length && Object.keys(locked).length === Object.keys(sim.locked).length
    && Object.keys(winners).length === Object.keys(sim.winners ?? {}).length;
  return same ? sim : { picks, locked, ...(Object.keys(winners).length ? { winners } : {}) };
}

/** Pick (or with `undefined` clear) a final's winner. */
export function setWinner(sim: Sim, final: string, team: string | undefined): Sim {
  const winners = { ...sim.winners };
  if (team) winners[final] = team;
  else delete winners[final];
  const { winners: _, ...rest } = sim;
  return Object.keys(winners).length ? { ...rest, winners } : rest;
}

/** Set (or with `undefined` clear) one match's pick. Clearing a match also unlocks it: a lock holds a pick. */
export function setPick(sim: Sim, id: string, s: Score | undefined): Sim {
  const picks = { ...sim.picks };
  const locked = { ...sim.locked };
  if (s) picks[id] = s;
  else { delete picks[id]; delete locked[id]; }
  return { ...sim, picks, locked };
}

/** Lock or unlock a picked match (an empty match has nothing to lock). */
export function toggleLock(sim: Sim, id: string): Sim {
  if (!sim.picks[id]) return sim;
  const locked = { ...sim.locked };
  if (locked[id]) delete locked[id];
  else locked[id] = true;
  return { ...sim, locked };
}

export type Fill = 'home' | 'draw' | 'fav' | 'random';

/** A team's rank for "favourites", lower = stronger (a pot, a table place); unknown ranks last. */
export type Rank = (team: string) => number | undefined;

/** The favourite's win: the better (lower) rank; the same rank → the home team. */
export function favourite(m: Match, rank: Rank): Score {
  const rh = rank(m.h) ?? Infinity, ra = rank(m.a) ?? Infinity;
  return ra < rh ? AWAY : HOME;
}

/** Fill every unlocked match of `ms` (re-roll = 'random': home / draw / away at 1/3 each, from `rnd` in [0, 1)). */
export function fill(sim: Sim, ms: Match[], kind: Fill, rank: Rank, rnd: () => number = Math.random): Sim {
  const picks = { ...sim.picks };
  for (const m of ms) {
    if (sim.locked[m.id] || !open(m)) continue;
    if (kind === 'home') picks[m.id] = HOME;
    else if (kind === 'draw') picks[m.id] = DRAW;
    else if (kind === 'fav') picks[m.id] = favourite(m, rank);
    else { const r = rnd(); picks[m.id] = r < 1 / 3 ? HOME : r < 2 / 3 ? DRAW : AWAY; }
  }
  return { ...sim, picks };
}

/** Clear the unlocked picks of `ms`. */
export function clear(sim: Sim, ms: Match[]): Sim {
  const picks = { ...sim.picks };
  for (const m of ms) if (!sim.locked[m.id]) delete picks[m.id];
  return { ...sim, picks };
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

/** The open matches in kickoff order, split into pending (postponed, or of a day before `today` and still without a
 * result; live ones aren't) and the rest. `dayOf` gives a match's day in the viewer's zone. */
export function leftToPlay(matches: Match[], today: string, dayOf: (m: Match) => string): { pending: Match[]; rest: Match[] } {
  const left = matches.filter(open).sort((x, y) => x.t.localeCompare(y.t));
  const pending = left.filter((m) => m.st === 'ppd' || (m.st !== 'in' && dayOf(m) < today));
  return { pending, rest: left.filter((m) => !pending.includes(m)) };
}

/** What is left to play on `today`, by league-phase matchday (the UCL). */
export function toPlay(matches: Match[], today: string, dayOf: (m: Match) => string): ToPlay {
  const md = matchdayOf(matches);
  const { pending, rest } = leftToPlay(matches, today, dayOf);
  const matchdays: ToPlay['matchdays'] = [];
  for (const m of rest) {
    const n = md.get(m.id)!;
    const g = matchdays.at(-1);
    if (g && g.n === n) g.matches.push(m);
    else matchdays.push({ n, matches: [m] });
  }
  return { pending, matchdays };
}

export interface WindowGroup { kind: WindowKind; start: string; end: string; matches: Match[] }

/** What is left to play on `today`, by window (a league: ESPN gives no round numbers): Weekend Fri–Mon, Midweek
 * Tue–Thu, as on the calendars (src/data/windows.ts). */
export function toPlayByWindow(matches: Match[], today: string, dayOf: (m: Match) => string): { pending: Match[]; windows: WindowGroup[] } {
  const { pending, rest } = leftToPlay(matches, today, dayOf);
  const windows: WindowGroup[] = [];
  for (const m of rest) {
    const w = windowOf(dayOf(m));
    const g = windows.at(-1);
    if (g && g.start === w.start) g.matches.push(m);
    else windows.push({ kind: w.kind, start: w.start, end: windowEnd(w.start), matches: [m] });
  }
  return { pending, windows };
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

// ---- saved scenarios ----

/** A named scenario: a set of picks to come back to and compare ("what if PSG drop points"). */
export interface Saved { name: string; sim: Sim }
/** What the simulator keeps: the picks on screen, the saved scenarios (in the order saved), the one last loaded or saved. */
export interface Store { current: Sim; saved: Saved[]; active?: string }
export const EMPTY_STORE: Store = { current: EMPTY, saved: [] };

const NAME_MAX = 40;
/** A scenario name as kept: trimmed, inner spaces collapsed, at most 40 characters; empty → undefined. */
export function cleanName(name: string): string | undefined {
  const n = name.trim().replace(/\s+/g, ' ').slice(0, NAME_MAX).trim();
  return n || undefined;
}

/** Save the picks on screen under `name`; a scenario of that name (any case) is replaced in place. */
export function saveAs(store: Store, name: string): Store {
  const n = cleanName(name);
  if (!n) return store;
  const i = store.saved.findIndex((s) => s.name.toLowerCase() === n.toLowerCase());
  const saved = [...store.saved];
  if (i >= 0) saved[i] = { name: n, sim: store.current };
  else saved.push({ name: n, sim: store.current });
  return { ...store, saved, active: n };
}

/** The scenario's picks, to put on screen (unknown name → undefined). */
export const savedSim = (store: Store, name: string): Sim | undefined => store.saved.find((s) => s.name === name)?.sim;

/** Delete a saved scenario (the picks on screen stay). */
export function remove(store: Store, name: string): Store {
  return { ...store, saved: store.saved.filter((s) => s.name !== name), active: store.active === name ? undefined : store.active };
}

/** Rename a saved scenario; a name already taken by another one (any case) or empty leaves things as they are. */
export function rename(store: Store, from: string, to: string): Store {
  const n = cleanName(to);
  if (!n || store.saved.some((s) => s.name !== from && s.name.toLowerCase() === n.toLowerCase())) return store;
  return { ...store, saved: store.saved.map((s) => (s.name === from ? { ...s, name: n } : s)), active: store.active === from ? n : store.active };
}

const sameSim = (a: Sim, b: Sim) => JSON.stringify(sortKeys(a)) === JSON.stringify(sortKeys(b));
const sortKeys = (s: Sim) => ({
  picks: Object.fromEntries(Object.entries(s.picks).sort(([x], [y]) => x.localeCompare(y)).map(([k, v]) => [k, { h: v.h, a: v.a }])),
  locked: Object.keys(s.locked).sort(),
  winners: Object.entries(s.winners ?? {}).sort(([x], [y]) => x.localeCompare(y)),
});
/** The picks on screen differ from the active saved scenario (shown as "edited"). */
export function edited(store: Store): boolean {
  const s = store.active ? savedSim(store, store.active) : undefined;
  return !!s && !sameSim(s, store.current);
}

/** Every scenario without picks for matches that got a real result (a real result replaces a pick). */
export const pruneStore = (store: Store, matches: Match[], finals: Record<string, FinalState | undefined> = {}): Store => {
  const current = prune(store.current, matches, finals);
  let changed = current !== store.current;
  const saved = store.saved.map((s) => { const sim = prune(s.sim, matches, finals); if (sim !== s.sim) changed = true; return sim === s.sim ? s : { ...s, sim }; });
  return changed ? { ...store, current, saved } : store;
};

// ---- storage ----

/** localStorage key (the gauntlet's backup saves every key, so scenarios are backed up with the rest). */
export const WHATIF_KEY = 'fk:whatif:v1';
/** The competition whose store sits at the top level of the key: the UCL's, which came first, so a key written
 * before the other competitions existed still reads as the UCL's, and an older page still reads the UCL's. */
export const TOP_COMP = 'uefa.champions';
interface StoredOne { current: Sim; saved?: Saved[]; active?: string }
interface Stored extends StoredOne { v: 1; comps?: Record<string, StoredOne> }
/** Every competition's store, by competition slug. */
export type Book = Record<string, Store>;

const isScore = (x: unknown): x is Score => !!x && typeof x === 'object' && Number.isInteger((x as Score).h) && Number.isInteger((x as Score).a) && (x as Score).h >= 0 && (x as Score).a >= 0;

function readOne(x: unknown): Sim | undefined {
  const s = x as Sim | null;
  if (!s || typeof s !== 'object' || !s.picks || typeof s.picks !== 'object') return undefined;
  const picks = Object.fromEntries(Object.entries(s.picks).filter(([, v]) => isScore(v)).map(([k, v]) => [k, { h: v.h, a: v.a }]));
  const locked = Object.fromEntries(Object.entries(s.locked ?? {}).filter(([id, v]) => v === true && id in picks)) as Record<string, true>;
  const winners = Object.fromEntries(Object.entries(s.winners && typeof s.winners === 'object' ? s.winners : {}).filter(([, t]) => typeof t === 'string' && t));
  return { picks, locked, ...(Object.keys(winners).length ? { winners } : {}) };
}

function readStoreOne(v: StoredOne | null | undefined): Store | undefined {
  const current = v && typeof v === 'object' ? readOne(v.current) : undefined;
  if (!current) return undefined;
  const saved: Saved[] = [];
  for (const s of Array.isArray(v!.saved) ? v!.saved : []) {
    const name = typeof s?.name === 'string' ? cleanName(s.name) : undefined;
    const sim = readOne(s?.sim);
    if (name && sim && !saved.some((x) => x.name.toLowerCase() === name.toLowerCase())) saved.push({ name, sim });
  }
  const active = saved.some((s) => s.name === v!.active) ? v!.active : undefined;
  return { current, saved, ...(active ? { active } : {}) };
}

const isEmpty = (s: Store) => !Object.keys(s.current.picks).length && !Object.keys(s.current.winners ?? {}).length && !s.saved.length;

/** Every competition's store as kept (those with picks or saved scenarios). Bad entries are dropped. */
export function readBook(text: string | null): Book {
  try {
    const v = JSON.parse(text ?? 'null') as Stored | null;
    if (!v || typeof v !== 'object' || v.v !== 1) return {};
    const book: Book = {};
    const top = readStoreOne(v);
    if (top && !isEmpty(top)) book[TOP_COMP] = top;
    if (v.comps && typeof v.comps === 'object') {
      for (const [comp, one] of Object.entries(v.comps)) {
        const s = comp === TOP_COMP ? undefined : readStoreOne(one);
        if (s && !isEmpty(s)) book[comp] = s;
      }
    }
    return book;
  } catch {
    return {};
  }
}

const storedOne = (s: Store): StoredOne => ({ current: s.current, ...(s.saved.length ? { saved: s.saved } : {}), ...(s.active ? { active: s.active } : {}) });

/** What to store: nothing (null) when no competition has picks or saved scenarios, so an untouched visit leaves no key. */
export function writeBook(book: Book): string | null {
  const comps = Object.entries(book).filter(([comp, s]) => comp !== TOP_COMP && !isEmpty(s));
  const top = book[TOP_COMP] && !isEmpty(book[TOP_COMP]) ? book[TOP_COMP] : undefined;
  if (!top && !comps.length) return null;
  const v: Stored = { v: 1, ...storedOne(top ?? EMPTY_STORE), ...(comps.length ? { comps: Object.fromEntries(comps.map(([c, s]) => [c, storedOne(s)])) } : {}) };
  return JSON.stringify(v);
}

/** One competition's store (EMPTY_STORE when it has none). */
export const readStore = (text: string | null, comp = TOP_COMP): Store => readBook(text)[comp] ?? EMPTY_STORE;

/** The kept text with one competition's store replaced; the other competitions' stay as they are in `text`. */
export const writeStore = (store: Store, comp = TOP_COMP, text: string | null = null): string | null => writeBook({ ...readBook(text), [comp]: store });
