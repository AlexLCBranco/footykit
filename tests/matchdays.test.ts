// FK-43: rounds worked out from the schedule (ESPN gives no round number for league matches) and the table after
// round N. A postponed match counts in the round it belongs to, not the one of the date it was played.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { leagueTable } from '../src/data/leagueTable';
import { leagueMatchdays, matchdays, tableAfter } from '../src/data/matchdays';
import type { Match, Snapshot } from '../src/data/snapshot';

const m = (id: string, day: string, h: string, a: string, hs?: number, as?: number): Match =>
  ({ id, t: `2026-${day}T15:00Z`, c: 'eng.1', st: hs === undefined ? 'pre' : 'post', h, a, ...(hs === undefined ? {} : { hs, as }) });

// 4 teams, 6 rounds; round 2's B v D is postponed and played after round 4
const season = [
  m('1a', '08-01', 'A', 'B', 1, 0), m('1b', '08-01', 'C', 'D', 2, 2),
  m('2a', '08-08', 'A', 'C', 0, 1), m('2b', '09-20', 'B', 'D', 3, 0), // played late
  m('3a', '08-15', 'A', 'D', 2, 0), m('3b', '08-15', 'B', 'C', 1, 1),
  m('4a', '08-22', 'B', 'A', 0, 0), m('4b', '08-22', 'D', 'C', 1, 0),
  m('5a', '09-26', 'C', 'A'), m('5b', '09-26', 'D', 'B'),
  m('6a', '10-03', 'D', 'A'), m('6b', '10-03', 'C', 'B'),
];
const teams = Object.fromEntries(['A', 'B', 'C', 'D'].map((id) => [id, { id, abbr: id, name: `Team ${id}`, short: id }]));
const snap = { matches: season, teams, tables: { 'eng.1': [{ name: 'x', rows: ['A', 'B', 'C', 'D'].map((team, i) => ({ team, rank: i + 1, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 })) }] } } as unknown as Snapshot;

describe('matchdays', () => {
  const d = matchdays(['A', 'B', 'C', 'D'], season);
  it('rounds of teams / 2 matches, each team once', () => {
    expect(d.rounds.map((r) => r.map((x) => x.id))).toEqual([['1a', '1b'], ['2a', '2b'], ['3a', '3b'], ['4a', '4b'], ['5a', '5b'], ['6a', '6b']]);
  });
  it('the postponed match counts in its own round, not the date it was played', () => expect(d.roundOf.get('2b')).toBe(2));
  it('the latest round with a played match', () => expect(d.latest).toBe(4));
});

describe('the table after round N', () => {
  it('after round 1, 2 and 4', () => {
    const r1 = tableAfter(snap, 'eng.1', 1).rows;
    expect(r1.map((r) => [r.team, r.p, r.pts])).toEqual([['A', 1, 3], ['C', 1, 1], ['D', 1, 1], ['B', 1, 0]]);
    // round 2 includes B v D, played on Sep 20
    const r2 = tableAfter(snap, 'eng.1', 2).rows;
    expect(Object.fromEntries(r2.map((r) => [r.team, r.p]))).toEqual({ A: 2, B: 2, C: 2, D: 2 });
    expect(r2.find((r) => r.team === 'B')!.pts).toBe(3);
    // the latest round equals the table now
    const now = leagueTable(snap, 'eng.1').rows.map((r) => [r.team, r.pts, r.p]);
    expect(tableAfter(snap, 'eng.1', 4).rows.map((r) => [r.team, r.pts, r.p])).toEqual(now);
  });
  it('last 5 up to the round, next 3 after it (as played)', () => {
    const a = tableAfter(snap, 'eng.1', 2).rows.find((r) => r.team === 'A')!;
    expect(a.last.map((x) => x.id)).toEqual(['1a', '2a']);
    expect(a.next.map((x) => x.id)).toEqual(['3a', '4a', '5a']);
  });
});

describe('on the recorded snapshot', () => {
  const real = JSON.parse(readFileSync(join(import.meta.dirname, 'fixtures/snapshot.json'), 'utf8')) as Snapshot;
  it('the Premier League: 38 rounds of 10; after round N every team has played N; the latest is the table now', () => {
    const { days } = leagueMatchdays(real, 'eng.1');
    expect(days.rounds.map((r) => r.length)).toEqual(Array(38).fill(10));
    expect(days.latest).toBe(10);
    for (let n = 1; n <= days.latest; n++) expect(new Set(tableAfter(real, 'eng.1', n).rows.map((r) => r.p))).toEqual(new Set([n]));
    for (const league of ['eng.1', 'esp.1', 'ita.1', 'ger.1', 'fra.1', 'bra.1'] as const) {
      const { days: dd } = leagueMatchdays(real, league);
      expect(tableAfter(real, league, dd.latest).rows.map((r) => [r.team, r.pts]), league).toEqual(leagueTable(real, league).rows.map((r) => [r.team, r.pts]));
    }
  });
});
