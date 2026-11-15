// Goals while trailing: ESPN's goal events → the snapshot's goal list (goalsOf), the scoreline walk (goalStates) and
// the per-competition table (trailingTable), on hand-built matches and on the recorded snapshot.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { goalsOf, slimMatch, type EspnCompetition, type EspnEvent } from '../src/data/espn.ts';
import type { Goal, Match, Snapshot } from '../src/data/snapshot.ts';
import { TRAILING_COMPS, goalStates, trailingTable } from '../src/data/trailing.ts';

const snap = JSON.parse(readFileSync(join(import.meta.dirname, 'fixtures/snapshot.json'), 'utf8')) as Snapshot;

type Detail = NonNullable<EspnCompetition['details']>[number];
const goal = (clock: string, team: string, extra: Partial<Detail> = {}): Detail => ({ scoringPlay: true, clock: { displayValue: clock }, team: { id: team }, ...extra });
const comp = (details: Detail[]): EspnCompetition => ({ id: 'x', date: '', competitors: [], details });

describe('goalsOf (ESPN goal events → the snapshot)', () => {
  it('orders by the minute shown: 45+2 before 46, 90+4 before extra time', () => {
    const c = comp([goal("46'", 'H'), goal("45'+2'", 'A'), goal("105'+1'", 'H'), goal("90'+4'", 'A'), { scoringPlay: false, clock: { displayValue: "50'" }, team: { id: 'H' } }]);
    expect(goalsOf(c, 'H', 2, 2)).toEqual([['45+2', 'a'], ['46', 'h'], ['90+4', 'a'], ['105+1', 'h']]);
  });

  it('marks own goals and leaves shootout kicks out', () => {
    const c = comp([goal("10'", 'A', { ownGoal: true }), goal("120'", 'H', { shootout: true }), goal("120'", 'A', { shootout: true })]);
    expect(goalsOf(c, 'H', 0, 1)).toEqual([['10', 'a', 1]]);
  });

  it('gives nothing when the goals do not add up to the score', () => {
    expect(goalsOf(comp([goal("90'+4'", 'A')]), 'H', 0, 2)).toBeUndefined();
    expect(goalsOf(comp([goal("12'", 'H')]), 'H', 0, 1)).toBeUndefined();
    expect(goalsOf({ ...comp([]), details: undefined }, 'H', 1, 0)).toBeUndefined();
  });

  it('slimMatch keeps the list on a played match with goals only', () => {
    const ev = (hs: string, as: string, details: Detail[]): EspnEvent => ({ id: '1', date: '2026-11-01T15:00Z', competitions: [{ id: '1', date: '2026-11-01T15:00Z', status: { type: { state: 'post', completed: true } }, details,
      competitors: [{ id: 'H', homeAway: 'home', score: hs, team: { id: 'H' } }, { id: 'A', homeAway: 'away', score: as, team: { id: 'A' } }] }] });
    expect(slimMatch(ev('1', '0', [goal("33'", 'H')]), 'eng.1', true)?.g).toEqual([['33', 'h']]);
    expect(slimMatch(ev('0', '0', []), 'eng.1', true)?.g).toBeUndefined();
  });
});

describe('goalStates (the scoreline walk)', () => {
  it('0-2 → 1-2 → 2-2 → 2-3 → 3-3: every home goal came from behind', () => {
    const g: Goal[] = [['5', 'a'], ['20', 'a'], ['40', 'h'], ['55', 'h'], ['70', 'a'], ['88', 'h']];
    expect(goalStates(g)).toEqual(['level', 'leading', 'trailing', 'trailing', 'level', 'trailing']);
  });

  it('a goal that does not level still counts (2-4 → 3-4)', () => {
    const g: Goal[] = [['1', 'a'], ['2', 'a'], ['3', 'h'], ['4', 'h'], ['5', 'a'], ['6', 'a'], ['7', 'h']];
    expect(goalStates(g).at(-1)).toBe('trailing');
  });

  it('an own goal counts for the side credited: B leads, B\'s player scores in his own net = A scores while trailing', () => {
    expect(goalStates([['10', 'h'], ['30', 'a', 1]])).toEqual(['level', 'trailing']);
  });

  it('extra time counts', () => {
    expect(goalStates([['95', 'h'], ['112', 'a'], ['119', 'a'], ['120+1', 'h']])).toEqual(['level', 'trailing', 'level', 'trailing']);
  });
});

describe('trailingTable', () => {
  const m = (id: string, h: string, a: string, hs: number, as: number, g?: Goal[], extra: Partial<Match> = {}): Match => ({ id, t: `2026-10-0${id}T15:00:00Z`, c: 'x.1', st: 'post', h, a, hs, as, ...(g ? { g } : {}), ...extra });
  const base = { v: 1, generatedAt: '', season: '', clubs: [], teams: {}, comps: {}, tables: {} } as unknown as Snapshot;

  it('counts per team, sorts by goals while trailing then per game, shares equal ranks, notes missing goal lists', () => {
    const s: Snapshot = { ...base, matches: [
      m('1', 'A', 'B', 2, 1, [['10', 'a'], ['50', 'h'], ['80', 'h']]), // A: 1 trailing, 1 level; B: 1 level
      m('2', 'B', 'C', 1, 1, [['3', 'h'], ['60', 'a']]), // C: 1 trailing
      m('3', 'C', 'A', 0, 3), // goals but no list: counted as played, noted
      m('4', 'A', 'C', 0, 0), // 0-0: nothing missing
      m('5', 'A', 'B', 4, 0, undefined, { st: 'pre', hs: undefined, as: undefined }), // not played: ignored
      { ...m('6', 'A', 'B', 1, 0, [['1', 'h']]), c: 'other' }, // another competition
    ] };
    const t = trailingTable(s, 'x.1');
    // A and C: 1 in 3 matches each, so they share 1st (listed by name); B 3rd
    expect(t.rows.map((r) => [r.team, r.rank, r.p, r.trailing, r.level, r.leading])).toEqual([
      ['A', 1, 3, 1, 1, 0],
      ['C', 1, 3, 1, 0, 0],
      ['B', 3, 2, 0, 2, 0],
    ]);
    expect(t.missing.map((x) => x.id)).toEqual(['3']);
  });

  it('per game splits two teams equal on goals while trailing', () => {
    const s: Snapshot = { ...base, matches: [m('1', 'A', 'B', 1, 1, [['1', 'h'], ['2', 'a']]), m('2', 'B', 'C', 0, 0), m('3', 'C', 'D', 1, 1, [['1', 'h'], ['2', 'a']])] };
    expect(trailingTable(s, 'x.1').rows.slice(0, 2).map((r) => [r.team, r.rank, r.perGame])).toEqual([['D', 1, 1], ['B', 2, 0.5]]);
  });
});

describe('on the recorded snapshot', () => {
  it('every competition shown has every played match\'s goals (the Libertadores\' one awarded match aside)', () => {
    for (const c of TRAILING_COMPS) {
      const missing = trailingTable(snap, c).missing.map((m) => m.id);
      expect(missing, c).toEqual(c === 'conmebol.libertadores' ? ['401865517'] : []);
    }
  });

  it('each team\'s goals while trailing, level and leading add up to its goals in the competition', () => {
    const t = trailingTable(snap, 'uefa.champions');
    expect(t.rows).toHaveLength(36);
    for (const r of t.rows) {
      const gf = snap.matches.filter((m) => m.c === 'uefa.champions' && m.st === 'post').reduce((n, m) => n + (m.h === r.team ? m.hs! : m.a === r.team ? m.as! : 0), 0);
      expect(r.trailing + r.level + r.leading, r.team).toBe(gf);
    }
    const order = t.rows.map((r) => [r.trailing, r.perGame] as const);
    for (let i = 1; i < order.length; i++) expect(order[i - 1]![0] > order[i]![0] || (order[i - 1]![0] === order[i]![0] && order[i - 1]![1] >= order[i]![1])).toBe(true);
  });
});
