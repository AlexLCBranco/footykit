// Road trips and homestands (FK-21, calendarkit's runs): on small hand-made seasons.

import { describe, expect, it } from 'vitest';
import { buildModel } from '../src/data/model';
import { RUN_BREAK_DAYS, RUN_MIN_GAMES, runLabel, teamRuns } from '../src/data/runs';
import type { Match, Snapshot } from '../src/data/snapshot';

const ME = '1';
let n = 0;
/** a match of club 1 on `day` (noon UTC): 'H' at home, 'A' away, 'N' a Libertadores final (neutral) */
const m = (day: string, side: 'H' | 'A' | 'N', extra: Partial<Match> = {}): Match => ({
  id: String(++n), t: `${day}T15:00:00Z`, c: side === 'N' ? 'conmebol.libertadores' : 'bra.1', r: side === 'N' ? 'Final' : undefined,
  st: 'pre', h: side === 'A' ? '2' : ME, a: side === 'A' ? ME : '2', ...extra,
});
const season = (matches: Match[]) => buildModel({
  v: 1, generatedAt: '', season: '', clubs: [{ id: ME, abbr: 'ME', name: 'Me', short: 'Me', league: 'bra.1', region: 'sa' }],
  teams: {}, comps: {}, matches, tables: {},
} as unknown as Snapshot, 'UTC');
const kinds = (ms: Match[]) => teamRuns(season(ms), ME).runs.map((r) => `${r.kind}${r.matches.length}`);

describe('teamRuns', () => {
  it('starts with calendarkit\'s values', () => {
    expect(RUN_MIN_GAMES).toBe(3);
    expect(RUN_BREAK_DAYS).toBe(6);
  });
  it('3+ in a row away = a road trip, 3+ at home = a homestand; 2 in a row is nothing', () => {
    expect(kinds([m('2026-11-01', 'A'), m('2026-11-04', 'A'), m('2026-11-07', 'A'), m('2026-11-10', 'H'), m('2026-11-13', 'H'), m('2026-11-16', 'A')])).toEqual(['road3']);
    expect(kinds([m('2026-11-01', 'H'), m('2026-11-04', 'H'), m('2026-11-07', 'H'), m('2026-11-10', 'H')])).toEqual(['home4']);
  });
  it('a neutral venue breaks a run, and so does a gap of RUN_BREAK_DAYS or more', () => {
    expect(kinds([m('2026-11-01', 'A'), m('2026-11-04', 'A'), m('2026-11-07', 'N'), m('2026-11-10', 'A'), m('2026-11-13', 'A')])).toEqual([]);
    expect(kinds([m('2026-11-01', 'A'), m('2026-11-04', 'A'), m('2026-11-10', 'A')])).toEqual([]); // 6 days: broken
    expect(kinds([m('2026-11-01', 'A'), m('2026-11-04', 'A'), m('2026-11-09', 'A')])).toEqual(['road3']); // 5 days: still on
  });
  it('counts every competition, skips cancelled / postponed, and labels each match "Road trip · k/n"', () => {
    const ms = [m('2026-11-01', 'A'), m('2026-11-03', 'A', { c: 'uefa.champions' }), m('2026-11-05', 'H', { st: 'ppd' }), m('2026-11-07', 'A')];
    const t = teamRuns(season(ms), ME);
    expect(t.runs.map((r) => r.matches.length)).toEqual([3]);
    const at = t.byMatch.get(ms[1]!.id)!;
    expect(runLabel(at.run, at.index)).toBe('Road trip · 2/3');
    expect(t.byMatch.has(ms[2]!.id)).toBe(false);
  });
});
