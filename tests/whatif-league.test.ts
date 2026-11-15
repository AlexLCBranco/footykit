// The league simulator's logic (src/data/whatif.ts over src/data/leagueTable.ts) on the recorded snapshot
// (2026-11-14: Premier League 280 matches left, Brasileirão 41), and the per-competition store in fk:whatif:v1.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { LEAGUES } from '../config/leagues';
import { leagueMatches, leagueTable, rankTable } from '../src/data/leagueTable';
import { weekday } from '../src/data/model';
import type { Match, Snapshot } from '../src/data/snapshot';
import {
  AWAY, DRAW, EMPTY, EMPTY_STORE, favourite, fill, HOME, open, pruneStore, readBook, readStore, saveAs, setPick,
  simMatches, toPlayByWindow, TOP_COMP, writeBook, writeStore, type Sim, type Store,
} from '../src/data/whatif';

const snap = JSON.parse(readFileSync(join(import.meta.dirname, 'fixtures/snapshot.json'), 'utf8')) as Snapshot;
const dayOf = (m: Match) => m.t.slice(0, 10);
const name = (id: string) => snap.teams[id]?.name ?? id;
const epl = leagueMatches(snap, 'eng.1');
const bra = leagueMatches(snap, 'bra.1');
const table = (lg: typeof epl, rules = LEAGUES['eng.1'], sim: Sim = EMPTY) => rankTable(lg.members, simMatches(lg.matches, sim), rules, name);

describe('a league\'s matches and table', () => {
  it('the members and matches the Tables page uses; with no picks the table is the real one', () => {
    expect(epl.members).toHaveLength(20);
    expect(epl.matches).toHaveLength(380);
    expect(epl.matches.filter(open)).toHaveLength(280);
    expect(table(epl).rows).toEqual(leagueTable(snap, 'eng.1').rows);
  });
  it('a pick moves the table: a 3-0 home win gives the home team 3 points and +3', () => {
    const m = epl.matches.find(open)!;
    const before = table(epl).rows.find((r) => r.team === m.h)!;
    const after = table(epl, undefined, setPick(EMPTY, m.id, { h: 3, a: 0 })).rows.find((r) => r.team === m.h)!;
    expect([after.p - before.p, after.pts - before.pts, after.gd - before.gd, after.gf - before.gf]).toEqual([1, 3, 3, 3]);
  });
  it('every match picked → the table is complete (end-of-season criteria apply), 38 played each', () => {
    const t = table(epl, undefined, fill(EMPTY, epl.matches, 'draw', () => undefined));
    expect(t.complete).toBe(true);
    expect(t.rows.every((r) => r.p === 38)).toBe(true);
  });
  it('the Brasileirão: its own ties-on-points rules (wins before goal difference)', () => {
    const t = table(bra, LEAGUES['bra.1'], fill(EMPTY, bra.matches, 'home', () => undefined));
    expect(t.complete).toBe(true);
    for (let i = 1; i < t.rows.length; i++) {
      const [a, b] = [t.rows[i - 1]!, t.rows[i]!];
      expect(a.pts > b.pts || (a.pts === b.pts && a.w >= b.w)).toBe(true);
    }
  });
});

describe('favourites in a league: the team higher in today\'s real table', () => {
  const real = leagueTable(snap, 'eng.1');
  const pos = new Map(real.rows.map((r, i) => [r.team, i + 1]));
  const rank = (t: string) => pos.get(t);
  it('the higher-placed team wins 1-0, home or away', () => {
    const m = (h: string, a: string) => ({ id: `${h}${a}`, t: '2026-11-21T15:00Z', c: 'eng.1', st: 'pre', h, a }) as Match;
    const [first, last] = [real.rows[0]!.team, real.rows[19]!.team];
    expect(favourite(m(last, first), rank)).toEqual(AWAY);
    expect(favourite(m(first, last), rank)).toEqual(HOME);
    // a team without a rank loses to one with
    expect(favourite(m('nobody', last), rank)).toEqual(AWAY);
  });
  it('on the snapshot: every open match goes to the better-placed team', () => {
    const f = fill(EMPTY, epl.matches, 'fav', rank);
    const left = epl.matches.filter(open);
    expect(Object.keys(f.picks)).toHaveLength(left.length);
    for (const x of left) expect(f.picks[x.id]).toEqual(pos.get(x.a)! < pos.get(x.h)! ? AWAY : HOME);
    // the leader wins all its matches, the bottom team loses all
    const t = table(epl, undefined, f);
    expect(t.rows[0]!.team).toBe(real.rows[0]!.team);
    expect(t.rows[19]!.team).toBe(real.rows[19]!.team);
  });
});

describe('what is left to play, by window', () => {
  it('the Premier League: Weekend Fri–Mon / Midweek Tue–Thu, in order, every open match once', () => {
    const { pending, windows } = toPlayByWindow(epl.matches, '2026-11-15', dayOf);
    expect(pending).toEqual([]);
    expect(windows.reduce((n, g) => n + g.matches.length, 0)).toBe(280);
    expect(new Set(windows.map((g) => g.start)).size).toBe(windows.length);
    for (let i = 1; i < windows.length; i++) expect(windows[i]!.start > windows[i - 1]!.start).toBe(true);
    for (const g of windows) {
      expect(weekday(g.start)).toBe(g.kind === 'wkd' ? 5 : 2);
      for (const m of g.matches) expect(dayOf(m) >= g.start && dayOf(m) <= g.end).toBe(true);
    }
    // the first window left: the weekend of Nov 21, ten matches
    expect(windows[0]).toMatchObject({ kind: 'wkd', start: '2026-11-20', end: '2026-11-23' });
    expect(windows[0]!.matches).toHaveLength(10);
  });
  it('postponed matches and past ones still without a result are pending; picks never fill played matches', () => {
    const left = epl.matches.filter(open);
    const ppd = { ...left[30]!, st: 'ppd' as const };
    const past = { ...left[0]!, t: '2026-11-10T20:00Z' };
    const ms = epl.matches.map((m) => (m.id === ppd.id ? ppd : m.id === past.id ? past : m));
    const tp = toPlayByWindow(ms, '2026-11-15', dayOf);
    expect(tp.pending.map((m) => m.id)).toEqual([past.id, ppd.id]);
    expect(tp.pending.length + tp.windows.reduce((n, g) => n + g.matches.length, 0)).toBe(280);
    const f = fill(EMPTY, epl.matches, 'home', () => undefined);
    expect(epl.matches.filter((m) => !open(m)).some((m) => m.id in f.picks)).toBe(false);
  });
});

describe('one store, a scenario list per competition', () => {
  const ucl: Store = saveAs({ ...EMPTY_STORE, current: setPick(EMPTY, 'u1', HOME) }, 'UCL one');
  const lg: Store = saveAs({ ...EMPTY_STORE, current: setPick(EMPTY, 'e1', DRAW) }, 'EPL one');

  it('step 1\'s stored shape reads as the UCL\'s, not as a league\'s', () => {
    const v1 = '{"v":1,"current":{"picks":{"u1":{"h":1,"a":0}},"locked":{}}}';
    expect(readStore(v1)).toEqual({ current: setPick(EMPTY, 'u1', HOME), saved: [] });
    expect(readStore(v1, TOP_COMP)).toEqual(readStore(v1));
    expect(readStore(v1, 'eng.1')).toEqual(EMPTY_STORE);
  });
  it('saving a league keeps the UCL\'s picks and scenarios, and the UCL\'s stays at the top level (older pages read it)', () => {
    const text = writeStore(lg, 'eng.1', writeStore(ucl));
    expect(readStore(text)).toEqual(ucl);
    expect(readStore(text, 'eng.1')).toEqual(lg);
    const raw = JSON.parse(text!);
    expect(raw.v).toBe(1);
    expect(raw.current).toEqual(ucl.current);
    expect(raw.comps['eng.1'].current).toEqual(lg.current);
    // and back: saving the UCL keeps the league
    const again = writeStore({ ...ucl, current: EMPTY }, TOP_COMP, text);
    expect(readStore(again, 'eng.1')).toEqual(lg);
    expect(readStore(again).saved).toEqual(ucl.saved);
  });
  it('a league alone: the top level holds an empty UCL; emptying everything removes the key', () => {
    const text = writeStore(lg, 'eng.1');
    expect(readStore(text)).toEqual(EMPTY_STORE);
    expect(readBook(text)).toEqual({ 'eng.1': lg });
    expect(writeStore(EMPTY_STORE, 'eng.1', text)).toBeNull();
    expect(writeBook({})).toBeNull();
  });
  it('bad competitions are dropped, good ones kept', () => {
    const text = JSON.stringify({ v: 1, current: { picks: {} }, comps: { 'eng.1': { current: { picks: { e1: { h: 1, a: 1 } } } }, 'esp.1': 'x', 'ita.1': { current: null } } });
    expect(readBook(text)).toEqual({ 'eng.1': { current: setPick(EMPTY, 'e1', DRAW), saved: [] } });
  });
  it('a real result prunes only that competition\'s picks (each page prunes its own store)', () => {
    const played = epl.matches.find((m) => !open(m))!;
    const s: Store = { ...EMPTY_STORE, current: setPick(setPick(EMPTY, played.id, HOME), epl.matches.find(open)!.id, AWAY) };
    expect(Object.keys(pruneStore(s, epl.matches).current.picks)).toHaveLength(1);
    const text = writeStore(pruneStore(s, epl.matches), 'eng.1', writeStore(ucl));
    expect(readStore(text)).toEqual(ucl);
  });
});
