// FK-36: the Slate card's strip — the last 2 played matches before the card's match and the next 2 after it; fewer at
// the start and end of the season; cancelled / postponed matches skipped.
import { describe, expect, it } from 'vitest';
import { stripAround } from '../src/data/form';
import { buildModel } from '../src/data/model';
import type { Match, Snapshot } from '../src/data/snapshot';

const m = (id: string, day: number, h: string, a: string, extra: Partial<Match> = {}): Match =>
  ({ id, t: `2026-08-${String(day).padStart(2, '0')}T15:00Z`, c: 'eng.1', st: 'pre', h, a, ...extra });
const played = (hs: number, as: number): Partial<Match> => ({ st: 'post', hs, as });
function model(matches: Match[]) {
  const teams = Object.fromEntries(['1', '2', '3'].map((id) => [id, { id, abbr: `T${id}`, name: `Team ${id}`, short: `T${id}` }]));
  const snap: Snapshot = { v: 1, generatedAt: '2026-08-01T00:00:00Z', season: 'x', clubs: [{ ...teams['1']!, league: 'eng.1', region: 'europe' }], teams, comps: {}, matches, tables: {} };
  return buildModel(snap, 'UTC');
}

const season = [
  m('a', 1, '1', '2', played(2, 0)),
  m('b', 4, '3', '1', played(1, 1)),
  m('c', 8, '1', '3', played(0, 1)),
  m('x', 9, '1', '2', { st: 'ppd' }),
  m('d', 11, '2', '1'),
  m('e', 15, '1', '3'),
  m('f', 18, '3', '1'),
];
const md = model(season);
const ids = (s: { before: { id: string }[]; after: { id: string }[] }) => [s.before.map((g) => g.id), s.after.map((g) => g.id)];

describe('stripAround (FK-36)', () => {
  it('mid-season: 2 played before, next 2 after, the postponed one skipped', () => {
    const s = stripAround(md, '1', season[4]!); // d
    expect(ids(s)).toEqual([['b', 'c'], ['e', 'f']]);
    expect(s.before.map((g) => [g.r, g.gf, g.ga, g.home])).toEqual([['D', 1, 1, false], ['L', 0, 1, true]]);
    expect(s.after.every((g) => g.r === undefined)).toBe(true);
    expect(s.after.map((g) => g.opp)).toEqual(['3', '3']);
  });
  it('a played match: the ones after it show their results once played', () => {
    expect(ids(stripAround(md, '1', season[0]!))).toEqual([[], ['b', 'c']]);
    expect(stripAround(md, '1', season[0]!).after.map((g) => g.r)).toEqual(['D', 'L']);
  });
  it('start of the season: fewer before', () => {
    expect(ids(stripAround(md, '1', season[1]!))).toEqual([['a'], ['c', 'd']]);
  });
  it('end of the season: fewer after', () => {
    expect(ids(stripAround(md, '1', season[5]!))).toEqual([['b', 'c'], ['f']]);
    expect(ids(stripAround(md, '1', season[6]!))).toEqual([['b', 'c'], []]);
  });
  it('only played matches count before (a match to come before this one is not "before")', () => {
    const s2 = [m('p', 1, '1', '2', played(1, 0)), m('q', 2, '1', '3'), m('r', 3, '2', '1')];
    expect(ids(stripAround(model(s2), '1', s2[2]!))).toEqual([['p'], []]);
  });
});
