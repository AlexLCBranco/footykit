// The Champions League league phase (src/data/ucl.ts, config/ucl.ts) on the recorded snapshot (2026-11-14, after
// matchday 4) and on small hand-made tables. Expected values on the snapshot come from outside this code: ESPN's own
// table, and Wikipedia's (two teams shown level at 29th).

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { UCL_PLAYOFF_PAIRS, UCL_POTS, UCL_ZONES } from '../config/ucl';
import type { Match, Snapshot } from '../src/data/snapshot';
import { leaguePhaseMatches, positionPath, remaining, uclTable, zoneOf } from '../src/data/ucl';

const snap = JSON.parse(readFileSync(join(import.meta.dirname, 'fixtures/snapshot.json'), 'utf8')) as Snapshot;
const table = uclTable(snap);
const row = (abbr: string) => table.rows.find((r) => snap.teams[r.team]!.abbr === abbr)!;

describe('config', () => {
  it('four pots of nine, 36 different teams', () => {
    expect(UCL_POTS.map((p) => p.teams.length)).toEqual([9, 9, 9, 9]);
    expect(new Set(UCL_POTS.flatMap((p) => p.teams)).size).toBe(36);
  });
  it('the pots agree with the draw: every team meets one home and one away team of each pot', () => {
    for (const r of table.rows) {
      for (const pot of [1, 2, 3, 4]) {
        const s = r.slots.filter((x) => x.pot === pot);
        expect(s.map((x) => x.home).sort(), `${snap.teams[r.team]!.abbr} v pot ${pot}`).toEqual([false, true]);
      }
    }
  });
  it('zones and pairings cover 1–36 once each', () => {
    const zoned = UCL_ZONES.flatMap((z) => Array.from({ length: z.to - z.from + 1 }, (_, i) => z.from + i));
    expect(zoned).toEqual(Array.from({ length: 36 }, (_, i) => i + 1));
    const paired = UCL_PLAYOFF_PAIRS.flatMap((p) => [...p.r16, ...p.seeded, ...p.unseeded]).sort((a, b) => a - b);
    expect(paired).toEqual(Array.from({ length: 24 }, (_, i) => i + 1));
  });
});

describe('table on the recorded snapshot', () => {
  it('144 league-phase matches, 8 per team, in kickoff order', () => {
    expect(leaguePhaseMatches(snap)).toHaveLength(144);
    for (const r of table.rows) {
      expect(r.slots).toHaveLength(8);
      expect(r.slots.map((s) => s.m.t)).toEqual([...r.slots.map((s) => s.m.t)].sort());
    }
    expect(table.matchday).toBe(4);
    expect(table.complete).toBe(false);
  });
  it('every team\'s numbers equal ESPN\'s table', () => {
    const espn = snap.tables['uefa.champions']![0]!.rows;
    expect(espn).toHaveLength(36);
    for (const e of espn) {
      const r = table.rows.find((x) => x.team === e.team)!;
      expect([r.p, r.w, r.d, r.l, r.gf, r.ga, r.pts], snap.teams[e.team]!.abbr).toEqual([e.p, e.w, e.d, e.l, e.gf, e.ga, e.pts]);
    }
  });
  it('the order equals ESPN\'s wherever no tie is left', () => {
    const espn = snap.tables['uefa.champions']![0]!.rows;
    for (const e of espn) {
      const r = table.rows.find((x) => x.team === e.team)!;
      if (!r.level) expect(r.rank, snap.teams[e.team]!.abbr).toBe(e.rank);
    }
  });
  it('AEK and Leipzig share 29th, as in Wikipedia\'s table after matchday 4', () => {
    expect([row('AEK').rank, row('RBL').rank]).toEqual([29, 29]);
    expect(row('AEK').level && row('RBL').level).toBe(true);
    // listed by name inside the shared place
    expect(table.rows.indexOf(row('AEK'))).toBeLessThan(table.rows.indexOf(row('RBL')));
    expect(row('SAB').rank).toBe(31);
  });
  it('a row: PSG after matchday 4', () => {
    const psg = row('PSG');
    expect([psg.rank, psg.p, psg.pts, psg.gd]).toEqual([1, 4, 12, 15]);
    expect(psg.last5).toEqual(['W', 'W', 'W', 'W']);
    expect(remaining(psg)).toHaveLength(4);
    expect(psg.pot).toBe(1);
  });
});

// Hand-made: teams A–D (ids from pot 1–4 of the config, so they are league-phase teams), on chosen dates.
const [A, B, C, D] = UCL_POTS.map((p) => p.teams[0]!) as [string, string, string, string];
const mk = (id: string, day: string, h: string, a: string, hs?: number, as?: number): Match => ({ id, t: `${day}T20:00Z`, c: 'uefa.champions', st: hs === undefined ? 'pre' : 'post', h, a, hs, as });
const tiny = (matches: Match[]): Snapshot => ({
  v: 1, generatedAt: '2026-11-14T00:00:00Z', season: 'x', clubs: [], comps: {}, tables: {}, matches,
  teams: Object.fromEntries([A, B, C, D].map((id, i) => [id, { id, abbr: 'ABCD'[i]!, name: `Team ${'ABCD'[i]}`, short: 'x' }])),
});
const order = (s: Snapshot) => uclTable(s).rows.filter((r) => [A, B, C, D].includes(r.team)).map((r) => s.teams[r.team]!.abbr);

describe('ranking criteria', () => {
  it('goal difference, then goals, then away goals', () => {
    // A and B: 3 pts, GD +1, 2 goals; A scored away, B at home
    const s = tiny([mk('1', '2026-09-08', C, A, 1, 2), mk('2', '2026-09-08', B, D, 2, 1)]);
    expect(order(s).slice(0, 2)).toEqual(['A', 'B']);
  });
  it('wins before away wins; still level → shared place, by name', () => {
    // A: W 1-0 home, L 0-1 away; B: same at the mirrored venues → level on 1–5 → shared
    const s = tiny([mk('1', '2026-09-08', A, C, 1, 0), mk('2', '2026-09-30', D, A, 1, 0), mk('3', '2026-09-08', B, D, 1, 0), mk('4', '2026-09-30', C, B, 1, 0)]);
    const t = uclTable(s).rows.filter((r) => [A, B].includes(r.team));
    expect(t.map((r) => r.rank)).toEqual([t[0]!.rank, t[0]!.rank]);
    expect(t.every((r) => r.level)).toBe(true);
  });
  it('opponents\' criteria only once every match is played', () => {
    // A and B both beat one team 1-0 at home; A's opponent C also beat D, so A's opponents have more points
    const played = [mk('1', '2026-09-08', A, C, 1, 0), mk('2', '2026-09-08', B, D, 1, 0), mk('3', '2026-09-30', C, D, 1, 0)];
    expect(uclTable(tiny([...played, mk('4', '2026-10-20', D, C)])).rows.find((r) => r.team === A)!.level).toBe(true);
    const done = uclTable(tiny(played));
    expect(done.complete).toBe(true);
    const a = done.rows.find((r) => r.team === A)!, b = done.rows.find((r) => r.team === B)!;
    expect(a.oppPts).toBeGreaterThan(b.oppPts);
    expect(a.rank).toBeLessThan(b.rank);
    expect(a.level || b.level).toBe(false);
  });
  it('matches outside the league phase\'s dates, or with a team outside the pots, are left out', () => {
    const s = tiny([mk('1', '2026-08-20', A, B, 1, 0), mk('2', '2027-02-17', A, B, 1, 0), mk('3', '2026-09-08', A, '999999', 1, 0)]);
    expect(leaguePhaseMatches(s)).toEqual([]);
  });
});

describe('where a position leads', () => {
  it('zones', () => {
    expect([1, 8, 9, 16, 17, 24, 25, 36].map((p) => zoneOf(p).id)).toEqual(['r16', 'r16', 'po-seeded', 'po-seeded', 'po-unseeded', 'po-unseeded', 'out', 'out']);
  });
  it('pairings (Art. 19.02–19.03)', () => {
    expect(positionPath(9).related.sort((a, b) => a - b)).toEqual([7, 8, 10, 23, 24]);
    expect(positionPath(9).text).toMatch(/seeded \(2nd leg at home\), against the 23rd\/24th; the winner meets the 7th\/8th/);
    expect(positionPath(17).text).toMatch(/unseeded .* against the 15th\/16th; the winner meets the 1st\/2nd/);
    expect(positionPath(1).text).toMatch(/round of 16, seeded .* play-off 15th\/16th v 17th\/18th/);
    expect(positionPath(3).related.sort((a, b) => a - b)).toEqual([4, 13, 14, 19, 20]);
    expect(positionPath(25)).toEqual({ text: '25th: eliminated (no Europa League place)', related: [] });
  });
});
