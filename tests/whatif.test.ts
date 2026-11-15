// The what-if simulator's logic (src/data/whatif.ts) on the recorded snapshot (2026-11-14, after matchday 4: 72
// league-phase matches left) and on small hand-made cases.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { UCL_PLAYOFF_PAIRS } from '../config/ucl';
import { isPlayed } from '../src/data/model';
import type { Match, Snapshot } from '../src/data/snapshot';
import { leaguePhaseMatches, positionPath, potOf, uclTable } from '../src/data/ucl';
import {
  AWAY, blocks, clear, cycle, DRAW, EMPTY, favourite, fill, history, HOME, matchdayOf, meets, open, parseScore, prune,
  push, redo, setPick, simMatches, toggleLock, toPlay, undo, type Sim,
  cleanName, edited, EMPTY_STORE, pruneStore, readStore, remove, rename, saveAs, savedSim, writeStore, type Store,
} from '../src/data/whatif';

const snap = JSON.parse(readFileSync(join(import.meta.dirname, 'fixtures/snapshot.json'), 'utf8')) as Snapshot;
const lp = leaguePhaseMatches(snap);
const left = lp.filter(open);
const played = lp.filter(isPlayed);
const dayOf = (m: Match) => m.t.slice(0, 10);
const abbr = (id: string) => snap.teams[id]!.abbr;
const table = (sim: Sim) => uclTable({ matches: simMatches(snap.matches, sim), teams: snap.teams });

describe('picking one match', () => {
  it('a click cycles empty → 1-0 → 1-1 → 0-1 → empty', () => {
    expect(cycle(undefined)).toEqual(HOME);
    expect(cycle(HOME)).toEqual(DRAW);
    expect(cycle(DRAW)).toEqual(AWAY);
    expect(cycle(AWAY)).toBeUndefined();
  });
  it('a typed score moves on by its outcome', () => {
    expect(cycle({ h: 3, a: 0 })).toEqual(DRAW);
    expect(cycle({ h: 2, a: 2 })).toEqual(AWAY);
    expect(cycle({ h: 0, a: 4 })).toBeUndefined();
  });
  it('reads typed scores', () => {
    expect(parseScore('2-1')).toEqual({ h: 2, a: 1 });
    expect(parseScore(' 3:0 ')).toEqual({ h: 3, a: 0 });
    expect(parseScore('1 1')).toEqual({ h: 1, a: 1 });
    expect(parseScore('21')).toEqual({ h: 2, a: 1 });
    expect(parseScore('10-0')).toEqual({ h: 10, a: 0 });
    expect(parseScore('')).toBeUndefined();
    expect(parseScore('a-1')).toBeUndefined();
    expect(parseScore('123')).toBeUndefined();
    expect(parseScore('-1-0')).toBeUndefined();
  });
  it('clearing a match unlocks it; an empty match has nothing to lock', () => {
    const id = left[0]!.id;
    const s = toggleLock(setPick(EMPTY, id, HOME), id);
    expect(s.locked[id]).toBe(true);
    expect(toggleLock(s, id).locked[id]).toBeUndefined();
    const cleared = setPick(s, id, undefined);
    expect(cleared).toEqual(EMPTY);
    expect(toggleLock(EMPTY, id)).toBe(EMPTY);
  });
});

describe('picks over the real results', () => {
  it('72 matches left after matchday 4', () => {
    expect(left).toHaveLength(72);
    expect(played).toHaveLength(72);
  });
  it('a pick fills an open match as if played', () => {
    const m = left[0]!;
    const out = simMatches([m], setPick(EMPTY, m.id, { h: 3, a: 2 }))[0]!;
    expect(isPlayed(out)).toBe(true);
    expect([out.hs, out.as]).toEqual([3, 2]);
    expect(m.st).not.toBe('post'); // the snapshot's match is untouched
  });
  it('a real result wins over a pick', () => {
    const m = played[0]!;
    const out = simMatches([m], setPick(EMPTY, m.id, { h: 9, a: 9 }))[0]!;
    expect([out.hs, out.as]).toEqual([m.hs, m.as]);
    expect(table(setPick(EMPTY, m.id, { h: 9, a: 9 })).rows.map((r) => [r.team, r.pts])).toEqual(uclTable(snap).rows.map((r) => [r.team, r.pts]));
  });
  it('prune drops picks for matches that got a result or are unknown, and their locks; keeps the rest as is', () => {
    let s = setPick(EMPTY, played[0]!.id, HOME);
    s = toggleLock(setPick(s, 'nope', HOME), 'nope');
    s = toggleLock(setPick(s, left[0]!.id, DRAW), left[0]!.id);
    expect(prune(s, lp)).toEqual({ picks: { [left[0]!.id]: DRAW }, locked: { [left[0]!.id]: true } });
    const clean = setPick(EMPTY, left[1]!.id, AWAY);
    expect(prune(clean, lp)).toBe(clean);
  });
  it('every match left as a home win: 8 played each, points = now + 3 per home match left, final criteria apply', () => {
    const all = fill(EMPTY, left, 'home', potOf);
    expect(Object.keys(all.picks)).toHaveLength(72);
    const t = table(all);
    const real = new Map(uclTable(snap).rows.map((r) => [r.team, r.pts]));
    expect(t.complete).toBe(true);
    expect(t.matchday).toBe(8);
    for (const r of t.rows) {
      const homeLeft = left.filter((m) => m.h === r.team).length;
      expect(r.pts, abbr(r.team)).toBe(real.get(r.team)! + 3 * homeLeft);
      expect(r.p).toBe(8);
    }
    // criteria 6-8 count once the phase is complete
    expect(t.rows.every((r) => r.oppPts > 0)).toBe(true);
  });
  it('one changed result moves the table', () => {
    const base = fill(EMPTY, left, 'draw', potOf);
    const m = left[0]!;
    const before = table(base).rows.find((r) => r.team === m.h)!;
    const after = table(setPick(base, m.id, { h: 5, a: 0 })).rows.find((r) => r.team === m.h)!;
    expect(after.pts - before.pts).toBe(2);
    expect(after.gd - before.gd).toBe(5);
  });
});

describe('bulk fills', () => {
  it('favourites: the better pot wins, the same pot → the home team', () => {
    const pots = new Map([['a', 1], ['b', 3], ['c', 3]] as const);
    const pot = (t: string) => pots.get(t as 'a');
    const m = (h: string, a: string) => ({ id: `${h}${a}`, t: '2026-11-25T20:00Z', c: 'uefa.champions', st: 'pre', h, a }) as Match;
    expect(favourite(m('b', 'a'), pot)).toEqual(AWAY);
    expect(favourite(m('a', 'b'), pot)).toEqual(HOME);
    expect(favourite(m('b', 'c'), pot)).toEqual(HOME);
    // on the snapshot: pot-1 teams win every remaining match against lower pots
    const fav = fill(EMPTY, left, 'fav', potOf);
    for (const x of left) {
      const ph = potOf(x.h)!, pa = potOf(x.a)!;
      expect(fav.picks[x.id]).toEqual(pa < ph ? AWAY : HOME);
    }
  });
  it('fills, clear and re-roll leave locked matches alone; played matches are never filled', () => {
    const [a, b] = left;
    let s = toggleLock(setPick(EMPTY, a!.id, { h: 4, a: 4 }), a!.id);
    s = setPick(s, b!.id, { h: 2, a: 0 });
    for (const kind of ['home', 'draw', 'fav', 'random'] as const) {
      const f = fill(s, [...lp], kind, potOf);
      expect(f.picks[a!.id]).toEqual({ h: 4, a: 4 });
      expect(Object.keys(f.picks)).toHaveLength(72);
      expect(played.some((m) => m.id in f.picks)).toBe(false);
    }
    expect(fill(s, [b!], 'draw', potOf).picks[b!.id]).toEqual(DRAW);
    expect(clear(fill(s, left, 'home', potOf), left)).toEqual({ picks: { [a!.id]: { h: 4, a: 4 } }, locked: { [a!.id]: true } });
  });
  it('fills only the matches given (the filtered ones)', () => {
    const team = left[0]!.h;
    const mine = left.filter((m) => m.h === team || m.a === team);
    expect(mine).toHaveLength(4);
    expect(Object.keys(fill(EMPTY, mine, 'home', potOf).picks).sort()).toEqual(mine.map((m) => m.id).sort());
  });
  it('re-roll: home / draw / away by thirds of the random number', () => {
    const rs = [0, 0.34, 0.9];
    let i = 0;
    const f = fill(EMPTY, left.slice(0, 3), 'random', potOf, () => rs[i++]!);
    expect(left.slice(0, 3).map((m) => f.picks[m.id])).toEqual([HOME, DRAW, AWAY]);
  });
});

describe('what is left to play', () => {
  it('the snapshot: 8 matchdays of 18; after matchday 4, 5–8 are left with nothing pending', () => {
    const md = matchdayOf(lp);
    const counts = new Map<number, number>();
    for (const n of md.values()) counts.set(n, (counts.get(n) ?? 0) + 1);
    expect([...counts]).toEqual([[1, 18], [2, 18], [3, 18], [4, 18], [5, 18], [6, 18], [7, 18], [8, 18]]);
    const tp = toPlay(lp, '2026-11-15', dayOf);
    expect(tp.pending).toEqual([]);
    expect(tp.matchdays.map((g) => [g.n, g.matches.length])).toEqual([[5, 18], [6, 18], [7, 18], [8, 18]]);
  });
  it('postponed matches and past matches still without a result are pending, oldest first; live ones are not', () => {
    const ppd = { ...left[40]!, st: 'ppd' as const };
    // today = matchday 5's first day; one match moved to the day before, still without a result; one live since then
    const past = { ...left[0]!, t: '2026-11-10T20:00Z', st: 'pre' as const };
    const live = { ...left[1]!, t: '2026-11-10T20:00Z', st: 'in' as const };
    const ms = lp.map((m) => (m.id === ppd.id ? ppd : m.id === past.id ? past : m.id === live.id ? live : m));
    const tp = toPlay(ms, dayOf(left[2]!), dayOf);
    expect(tp.pending.map((m) => m.id)).toEqual([past.id, ppd.id]);
    expect(tp.matchdays.flatMap((g) => g.matches).some((m) => m.id === live.id)).toBe(true);
    expect(tp.pending.length + tp.matchdays.reduce((n, g) => n + g.matches.length, 0)).toBe(72);
  });
});

describe('bracket', () => {
  it('blocks A–D: 1st/2nd meet section IV (15/16 v 17/18) … 7th/8th meet section I (9/10 v 23/24)', () => {
    expect(blocks(UCL_PLAYOFF_PAIRS)).toEqual([
      { letter: 'A', r16: [1, 2], section: 'IV', seeded: [15, 16], unseeded: [17, 18] },
      { letter: 'B', r16: [3, 4], section: 'III', seeded: [13, 14], unseeded: [19, 20] },
      { letter: 'C', r16: [5, 6], section: 'II', seeded: [11, 12], unseeded: [21, 22] },
      { letter: 'D', r16: [7, 8], section: 'I', seeded: [9, 10], unseeded: [23, 24] },
    ]);
  });
  it('who each place meets, and its pair-mate in the other half', () => {
    expect(meets(1, UCL_PLAYOFF_PAIRS)).toEqual({ playoff: [], r16: [15, 16, 17, 18], otherHalf: 2 });
    expect(meets(9, UCL_PLAYOFF_PAIRS)).toEqual({ playoff: [23, 24], r16: [7, 8], otherHalf: 10 });
    expect(meets(24, UCL_PLAYOFF_PAIRS)).toEqual({ playoff: [9, 10], r16: [7, 8], otherHalf: 23 });
    expect(meets(25, UCL_PLAYOFF_PAIRS)).toEqual({ playoff: [], r16: [] });
  });
  it('agrees with the UCL page\'s paths: the places it meets plus its pair-mate are positionPath\'s related places', () => {
    for (let pos = 1; pos <= 24; pos++) {
      const x = meets(pos, UCL_PLAYOFF_PAIRS);
      expect([...x.playoff, ...x.r16, x.otherHalf!].sort((a, b) => a - b), `${pos}`).toEqual([...positionPath(pos).related].sort((a, b) => a - b));
    }
  });
});

describe('undo / redo', () => {
  it('steps back and forward; a new change drops the redo steps; a no-op adds no step', () => {
    const a = setPick(EMPTY, 'x', HOME), b = setPick(a, 'y', DRAW), c = setPick(a, 'z', AWAY);
    let h = push(push(history(EMPTY), a), b);
    expect(push(h, { ...b })).toBe(h);
    h = undo(h);
    expect(h.now).toBe(a);
    h = redo(h);
    expect(h.now).toBe(b);
    h = push(undo(h), c);
    expect(h.now).toBe(c);
    expect(redo(h)).toBe(h);
    expect(undo(undo(undo(h))).now).toEqual(EMPTY);
  });
  it('keeps the last 200 steps', () => {
    let h = history(EMPTY);
    for (let i = 0; i < 250; i++) h = push(h, setPick(EMPTY, 'x', { h: i, a: 0 }));
    expect(h.past).toHaveLength(200);
  });
});

describe('saved scenarios', () => {
  const a = setPick(EMPTY, 'x', HOME), b = setPick(EMPTY, 'y', AWAY);
  it('save as: added in order, made active; the same name (any case) replaces it in place', () => {
    let s: Store = { ...EMPTY_STORE, current: a };
    s = saveAs(s, '  PSG   slips ');
    s = saveAs({ ...s, current: b }, 'Arsenal top');
    expect(s.saved.map((x) => x.name)).toEqual(['PSG slips', 'Arsenal top']);
    expect(s.active).toBe('Arsenal top');
    s = saveAs({ ...s, current: setPick(EMPTY, 'z', DRAW) }, 'psg SLIPS');
    expect(s.saved.map((x) => x.name)).toEqual(['psg SLIPS', 'Arsenal top']);
    expect(savedSim(s, 'psg SLIPS')).toEqual(setPick(EMPTY, 'z', DRAW));
    expect(saveAs(s, '   ')).toBe(s);
  });
  it('names: trimmed, spaces collapsed, at most 40 characters', () => {
    expect(cleanName('  a  b ')).toBe('a b');
    expect(cleanName('')).toBeUndefined();
    expect(cleanName('x'.repeat(60))).toHaveLength(40);
  });
  it('edited: the picks on screen differ from the active scenario (key order and object identity don\'t matter)', () => {
    const both = setPick(setPick(EMPTY, 'p', HOME), 'q', DRAW);
    const s = saveAs({ ...EMPTY_STORE, current: both }, 'S');
    expect(edited(s)).toBe(false);
    expect(edited({ ...s, current: setPick(setPick(EMPTY, 'q', { h: 1, a: 1 }), 'p', { h: 1, a: 0 }) })).toBe(false);
    expect(edited({ ...s, current: setPick(both, 'q', AWAY) })).toBe(true);
    expect(edited({ ...s, current: toggleLock(both, 'p') })).toBe(true);
    expect(edited({ ...s, active: undefined, current: EMPTY })).toBe(false);
  });
  it('delete keeps the picks on screen; deleting the active one clears active', () => {
    const s = saveAs(saveAs({ ...EMPTY_STORE, current: a }, 'A'), 'B');
    expect(remove(s, 'B')).toEqual({ current: a, saved: [{ name: 'A', sim: a }], active: undefined });
    expect(remove(s, 'A').active).toBe('B');
  });
  it('rename: follows the active one; a taken or empty name changes nothing', () => {
    const s = saveAs(saveAs({ ...EMPTY_STORE, current: a }, 'A'), 'B');
    expect(rename(s, 'B', 'Death side').saved.map((x) => x.name)).toEqual(['A', 'Death side']);
    expect(rename(s, 'B', 'Death side').active).toBe('Death side');
    expect(rename(s, 'B', 'a')).toBe(s);
    expect(rename(s, 'B', ' ')).toBe(s);
    expect(rename(s, 'B', 'b').saved[1]!.name).toBe('b');
  });
  it('a real result replaces picks in every scenario, saved ones too', () => {
    const p = setPick(setPick(EMPTY, played[0]!.id, HOME), left[0]!.id, DRAW);
    const s = saveAs({ ...EMPTY_STORE, current: p }, 'S');
    const out = pruneStore(s, lp);
    expect(out.current.picks).toEqual({ [left[0]!.id]: DRAW });
    expect(out.saved[0]!.sim.picks).toEqual({ [left[0]!.id]: DRAW });
    expect(pruneStore(out, lp)).toBe(out);
  });
});

describe('storage', () => {
  it('round-trips the picks, the saved scenarios and the active one', () => {
    const cur = toggleLock(setPick(setPick(EMPTY, 'a', { h: 2, a: 1 }), 'b', DRAW), 'a');
    const s = saveAs(saveAs({ ...EMPTY_STORE, current: cur }, 'One'), 'Two');
    expect(readStore(writeStore(s))).toEqual(s);
    expect(readStore(writeStore({ ...EMPTY_STORE, current: cur }))).toEqual({ current: cur, saved: [] });
  });
  it('stores nothing with no picks and no saved scenarios; saved scenarios alone are kept', () => {
    expect(writeStore(EMPTY_STORE)).toBeNull();
    const s = saveAs({ ...EMPTY_STORE, current: setPick(EMPTY, 'a', HOME) }, 'S');
    expect(readStore(writeStore({ ...s, current: EMPTY }))).toEqual({ ...s, current: EMPTY });
  });
  it('reads step 1\'s stored shape (picks only)', () => {
    expect(readStore('{"v":1,"current":{"picks":{"a":{"h":1,"a":0}},"locked":{"a":true}}}')).toEqual({ current: { picks: { a: HOME }, locked: { a: true } }, saved: [] });
  });
  it('anything else reads as empty; bad picks, locks without picks, bad or repeated scenarios and an unknown active are dropped', () => {
    for (const t of [null, '', 'x', '{}', '{"v":2,"current":{"picks":{}}}', '[]']) expect(readStore(t)).toEqual(EMPTY_STORE);
    const t = JSON.stringify({
      v: 1,
      current: { picks: { a: { h: 1, a: 0 }, b: { h: -1, a: 0 }, c: 'x' }, locked: { a: true, b: true, d: true } },
      saved: [{ name: 'S', sim: { picks: { a: { h: 0, a: 1 } }, locked: {} } }, { name: 's', sim: { picks: {}, locked: {} } }, { name: '', sim: { picks: {} } }, { name: 'N' }, null],
      active: 'gone',
    });
    expect(readStore(t)).toEqual({ current: { picks: { a: HOME }, locked: { a: true } }, saved: [{ name: 'S', sim: { picks: { a: AWAY }, locked: {} } }] });
  });
});
