// UCL stakes chips (src/data/uclStakes.ts). The recorded snapshot is after matchday 4, so the league phase is played on
// with seeded random scores up to the eve of matchday 7 and of matchday 8; then every claim the engine makes is
// checked against thousands of random completions ranked by the real table (criteria 1–8). A claim must hold in every
// one of them: "secured" = the team (and anyone level with it) finishes inside the top K; "lost" = outside it.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { Match, Snapshot } from '../src/data/snapshot';
import { leaguePhaseMatches, remaining, uclTable, type UclTable } from '../src/data/ucl';
import { stakeChips, TARGETS, verdict, type Outcome } from '../src/data/uclStakes';

const base = JSON.parse(readFileSync(join(import.meta.dirname, 'fixtures/snapshot.json'), 'utf8')) as Snapshot;

function rng(seed: number) {
  return () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const goals = (r: () => number) => [0, 0, 1, 1, 1, 2, 2, 3, 4][Math.floor(r() * 9)]!;

/** The snapshot with every league-phase match before `until` played (random scores). */
function playedUntil(snap: Snapshot, until: string, seed: number): Snapshot {
  const r = rng(seed);
  const lp = new Set(leaguePhaseMatches(snap).map((m) => m.id));
  return { ...snap, matches: snap.matches.map((m): Match => (lp.has(m.id) && m.st !== 'post' && m.t < until ? { ...m, st: 'post', hs: goals(r), as: goals(r) } : m)) };
}

/** Places a team can be given in a final table: its row's index, widened to its whole group when it is level. */
function places(t: UclTable, team: string): [number, number] {
  const i = t.rows.findIndex((r) => r.team === team);
  const row = t.rows[i]!;
  if (!row.level) return [i + 1, i + 1];
  const same = t.rows.map((r, k) => (r.rank === row.rank ? k + 1 : 0)).filter(Boolean);
  return [Math.min(...same), Math.max(...same)];
}

const states = [
  { name: 'eve of matchday 7', snap: playedUntil(base, '2027-01-15', 7) },
  { name: 'eve of matchday 8', snap: playedUntil(base, '2027-01-25', 8) },
];

describe.each(states)('$name', ({ snap }) => {
  const table = uclTable(snap);
  const outcomes: (Outcome | undefined)[] = [undefined, 'W', 'D', 'L'];
  const claims = table.rows.flatMap((row) => TARGETS.flatMap((k) => outcomes.map((o) => ({ team: row.team, k, o, v: verdict(table, row.team, k, o), next: remaining(row)[0] }))))
    .filter((c) => c.v.secured || c.v.lost);

  it('makes claims (the test isn\'t empty)', () => {
    expect(claims.length).toBeGreaterThan(20);
    expect(table.rows.some((r) => stakeChips(table, r.team).some((c) => c.kind === 'need' || c.kind === 'risk'))).toBe(true);
  });

  it('every claim holds in 2,000 random completions', () => {
    const r = rng(99);
    const open = leaguePhaseMatches(snap).filter((m) => m.st !== 'post').map((m) => m.id);
    expect(open.length).toBeGreaterThan(0);
    for (let n = 0; n < 2000; n++) {
      const scores = new Map(open.map((id) => [id, [goals(r), goals(r)] as const]));
      const done: Snapshot = { ...snap, matches: snap.matches.map((m) => (scores.has(m.id) ? { ...m, st: 'post' as const, hs: scores.get(m.id)![0], as: scores.get(m.id)![1] } : m)) };
      const fin = uclTable(done);
      expect(fin.complete).toBe(true);
      for (const c of claims) {
        if (c.o) {
          const [hs, as] = scores.get(c.next!.m.id)!;
          const mine = c.next!.home ? hs - as : as - hs;
          if ((mine > 0 ? 'W' : mine < 0 ? 'L' : 'D') !== c.o) continue;
        }
        const [best, worst] = places(fin, c.team);
        if (c.v.secured) expect(worst, `${base.teams[c.team]!.abbr} secured top ${c.k} (${c.o ?? 'now'})`).toBeLessThanOrEqual(c.k);
        if (c.v.lost) expect(best, `${base.teams[c.team]!.abbr} lost top ${c.k} (${c.o ?? 'now'})`).toBeGreaterThan(c.k);
      }
    }
  }, 60_000);
});

describe('chips', () => {
  it('nothing is claimed after matchday 4 that isn\'t settled (the recorded table): no chips at all', () => {
    const t = uclTable(base);
    expect(t.rows.flatMap((r) => stakeChips(t, r.team))).toEqual([]);
  });
  it('the texts on the eve of matchday 8', () => {
    const t = uclTable(states[1]!.snap);
    const texts = new Set(t.rows.flatMap((r) => stakeChips(t, r.team).map((c) => c.text)));
    for (const x of texts) expect(x).toMatch(/^(Top 8 ✓|Top 24 ✓|Out|(Win|Draw) = (top 8|top 24)|(Draw|Loss) = (no top 8|out))$/);
  });
  it('a team sure of the top 8 shows only that', () => {
    const t = uclTable(states[1]!.snap);
    for (const r of t.rows) {
      const chips = stakeChips(t, r.team);
      if (chips.some((c) => c.text === 'Top 8 ✓')) expect(chips).toHaveLength(1);
    }
  });
});
