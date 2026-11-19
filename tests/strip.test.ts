// FK-47: the Slate card's strip by window — five slots (2 windows before, this match's window, 2 after), the midweek
// (Tue–Thu) / weekend (Fri–Mon) windows of the window tags; an empty window is its own slot, two matches share one.
// FK-48: `shift` moves the five windows.
import { describe, expect, it } from 'vitest';
import { buildModel } from '../src/data/model';
import type { Match, Snapshot } from '../src/data/snapshot';
import { emptyWindowText, stripWindows, windowLabel } from '../src/data/strip';

const m = (id: string, day: number, h: string, a: string, extra: Partial<Match> = {}): Match =>
  ({ id, t: `2026-11-${String(day).padStart(2, '0')}T15:00Z`, c: 'eng.1', st: 'pre', h, a, ...extra });
const played = (hs: number, as: number): Partial<Match> => ({ st: 'post', hs, as });
function model(matches: Match[]) {
  const teams = Object.fromEntries(['1', '2', '3'].map((id) => [id, { id, abbr: `T${id}`, name: `Team ${id}`, short: `T${id}` }]));
  const snap: Snapshot = { v: 1, generatedAt: '2026-11-01T00:00:00Z', season: 'x', clubs: [{ ...teams['1']!, league: 'eng.1', region: 'europe' }], teams, comps: {}, matches, tables: {} };
  return buildModel(snap, 'UTC');
}

// Nov 2026: Sun 1. Windows: mid Tue 3, wkd Fri 6, mid Tue 10, wkd Fri 13, mid Tue 17, wkd Fri 20, mid Tue 24, wkd Fri 27
const season = [
  m('a', 7, '1', '2', played(2, 0)), // wkd 6
  m('b', 11, '3', '1', played(1, 1)), // mid 10
  m('x', 14, '1', '2', { st: 'ppd' }), // wkd 13: postponed, so the window is free
  m('c', 17, '1', '3', { c: 'uefa.champions' }), // mid 17: the card's match
  m('d', 21, '2', '1'), // wkd 20: two matches
  m('e', 23, '1', '3', { c: 'eng.league_cup' }),
  m('f', 25, '3', '1'), // mid 24
];
const md = model(season);
const view = (ws: ReturnType<typeof stripWindows>) => ws.map((w) => `${w.start.slice(8)}:${w.state}:${w.games.map((g) => g.id + (g.now ? '*' : '')).join('+')}`);

describe('stripWindows (FK-47)', () => {
  it('five windows: 2 before, this match\'s (marked), 2 after; an empty window is its own slot; two matches share one', () => {
    const ws = stripWindows(md, '1', season[3]!);
    expect(view(ws)).toEqual(['10:played:b', '13:free:', '17:played:c*', '20:played:d+e', '24:played:f']);
    expect(ws.map((w) => w.offset)).toEqual([-2, -1, 0, 1, 2]);
    expect(ws.map((w) => w.kind)).toEqual(['mid', 'wkd', 'mid', 'wkd', 'mid']);
    // results, home / away, the competition (the middle slot shows its icon)
    expect(ws[0]!.games[0]).toMatchObject({ r: 'D', gf: 1, ga: 1, home: false, opp: '3' });
    expect(ws[2]!.games[0]).toMatchObject({ now: true, c: 'uefa.champions', home: true });
    expect(ws[3]!.games.map((g) => g.r)).toEqual([undefined, undefined]);
  });
  it('at the start of the season: the windows before it are shown, empty', () => {
    expect(view(stripWindows(md, '1', season[0]!))).toEqual(['30:before:', '03:before:', '06:played:a*', '10:played:b', '13:free:']);
  });
  it('after the last fixture: "nothing fixtured yet"', () => {
    const ws = stripWindows(md, '1', season[6]!);
    expect(view(ws)).toEqual(['17:played:c', '20:played:d+e', '24:played:f*', '27:unscheduled:', '01:unscheduled:']);
    expect(emptyWindowText(ws[3]!)).toBe('Nothing fixtured yet · weekend 27–30 Nov');
  });
  it('the hover names the window ("No match · midweek 11–13 Nov"), across months too', () => {
    const ws = stripWindows(md, '1', season[3]!);
    expect(emptyWindowText(ws[1]!)).toBe('No match · weekend 13–16 Nov');
    expect(windowLabel({ kind: 'mid', start: '2026-11-10', end: '2026-11-12' })).toBe('midweek 10–12 Nov');
    expect(windowLabel({ kind: 'wkd', start: '2026-10-30', end: '2026-11-02' })).toBe('weekend 30 Oct–2 Nov');
  });
  it('FK-48: a shift moves the five windows one window at a time', () => {
    expect(view(stripWindows(md, '1', season[3]!, 1))).toEqual(['13:free:', '17:played:c*', '20:played:d+e', '24:played:f', '27:unscheduled:']);
    expect(view(stripWindows(md, '1', season[3]!, -3))).toEqual(['30:before:', '03:before:', '06:played:a', '10:played:b', '13:free:']);
    expect(stripWindows(md, '1', season[3]!, -3).map((w) => w.offset)).toEqual([-5, -4, -3, -2, -1]);
  });
});
