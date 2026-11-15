// League tables (src/data/leagueTable.ts, config/leagues.ts): on the recorded snapshot against ESPN's own tables, and
// each league's ties-on-points rules on small hand-made seasons.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { LEAGUES } from '../config/leagues';
import type { LeagueSlug } from '../config/season';
import { leagueTable } from '../src/data/leagueTable';
import type { Match, Snapshot, TableRow } from '../src/data/snapshot';

const snap = JSON.parse(readFileSync(join(import.meta.dirname, 'fixtures/snapshot.json'), 'utf8')) as Snapshot;
const SLUGS = Object.keys(LEAGUES) as LeagueSlug[];

describe.each(SLUGS)('%s on the recorded snapshot', (league) => {
  const t = leagueTable(snap, league);
  const espn = snap.tables[league]![0]!.rows;
  it('every team\'s numbers equal ESPN\'s', () => {
    expect(t.rows).toHaveLength(espn.length);
    for (const e of espn) {
      const r = t.rows.find((x) => x.team === e.team)!;
      expect([r.p, r.w, r.d, r.l, r.gf, r.ga, r.pts], snap.teams[e.team]!.abbr).toEqual([e.p, e.w, e.d, e.l, e.gf, e.ga, e.pts]);
    }
  });
  it('the order equals ESPN\'s wherever no tie is left', () => {
    for (const e of espn) {
      const r = t.rows.find((x) => x.team === e.team)!;
      if (!r.level) expect(r.rank, snap.teams[e.team]!.abbr).toBe(e.rank);
    }
  });
  it('the last 5 played and the next 3, in kickoff order', () => {
    for (const r of t.rows) {
      expect(r.last.length).toBeLessThanOrEqual(5);
      expect(r.next.length).toBeLessThanOrEqual(3);
      const ts = [...r.last, ...r.next].map((m) => m.t);
      expect(ts).toEqual([...ts].sort());
    }
  });
  it('zones: inside the table, not overlapping', () => {
    const z = LEAGUES[league].zones;
    for (const x of z) expect(x.to).toBeLessThanOrEqual(espn.length);
    for (let i = 1; i < z.length; i++) expect(z[i]!.from).toBeGreaterThan(z[i - 1]!.to);
  });
});

// Hand-made: four teams; scores chosen so that two teams end level on points.
const mk = (id: string, day: string, h: string, a: string, hs?: number, as?: number): Match => ({ id, t: `${day}T15:00Z`, c: '', st: hs === undefined ? 'pre' : 'post', h, a, hs, as });
function season(league: LeagueSlug, matches: Match[]): Snapshot {
  const ids = ['1', '2', '3', '4'];
  const rows: TableRow[] = ids.map((team, i) => ({ team, rank: i + 1, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 }));
  return {
    v: 1, generatedAt: '', season: 'x', clubs: [], comps: {},
    teams: Object.fromEntries(ids.map((id) => [id, { id, abbr: `T${id}`, name: `Team ${id}`, short: `T${id}` }])),
    tables: { [league]: [{ name: '', rows }] },
    matches: matches.map((m) => ({ ...m, c: league })),
  };
}
const order = (s: Snapshot, l: LeagueSlug) => leagueTable(s, l).rows.map((r) => `${r.team}${r.level ? '=' : ''}`);

// 1 and 2: 6 pts each. 2 beat 1 twice (h2h), but 1 has the better goal difference (big wins over 3 and 4).
const H2H_VS_GD = [
  mk('a', '2026-09-01', '1', '3', 5, 0), mk('b', '2026-09-02', '1', '4', 5, 0),
  mk('c', '2026-09-03', '2', '1', 1, 0), mk('d', '2026-09-04', '1', '2', 0, 1),
  mk('e', '2026-09-05', '3', '2', 1, 0), mk('f', '2026-09-06', '4', '2', 1, 0),
];

describe('ties on points', () => {
  it('La Liga / Serie A: head-to-head before goal difference', () => {
    expect(order(season('esp.1', H2H_VS_GD), 'esp.1').slice(0, 2)).toEqual(['2', '1']);
    expect(order(season('ita.1', H2H_VS_GD), 'ita.1').slice(0, 2)).toEqual(['2', '1']);
  });
  it('Premier League / Bundesliga / Ligue 1: goal difference first', () => {
    for (const l of ['eng.1', 'ger.1', 'fra.1'] as const) expect(order(season(l, H2H_VS_GD), l).slice(0, 2)).toEqual(['1', '2']);
  });
  it('head-to-head waits for every match between the tied teams (one leg only → skipped)', () => {
    const oneLeg = H2H_VS_GD.filter((m) => m.id !== 'd').concat(mk('d', '2026-12-01', '1', '2'), mk('g', '2026-09-07', '2', '4', 1, 0));
    // 1 and 2 on 6 pts; 2 won the only meeting played, the return leg isn't → goal difference decides (1: +9)
    const s = season('esp.1', oneLeg);
    const t = leagueTable(s, 'esp.1').rows;
    expect(t.find((r) => r.team === '1')!.pts).toBe(t.find((r) => r.team === '2')!.pts);
    expect(order(s, 'esp.1').slice(0, 2)).toEqual(['1', '2']);
  });
  it('Brasileirão: wins before goal difference', () => {
    // 1: a win and three draws (6 pts, GD +4); 2: two wins (6 pts, GD +2) → 2 first on wins
    const s = season('bra.1', [
      mk('a', '2026-05-01', '1', '3', 4, 0), mk('b', '2026-05-02', '1', '4', 0, 0), mk('c', '2026-05-03', '3', '1', 0, 0), mk('d', '2026-05-04', '4', '1', 0, 0),
      mk('e', '2026-05-05', '2', '3', 1, 0), mk('f', '2026-05-06', '2', '4', 1, 0),
    ]);
    expect(order(s, 'bra.1').slice(0, 2)).toEqual(['2', '1']);
  });
  it('still level after every criterion: a shared place, listed by name', () => {
    const s = season('eng.1', [mk('a', '2026-09-01', '1', '3', 1, 0), mk('b', '2026-09-01', '2', '4', 1, 0)]);
    const t = leagueTable(s, 'eng.1').rows;
    expect(t.slice(0, 2).map((r) => [r.team, r.rank, r.level])).toEqual([['1', 1, true], ['2', 1, true]]);
  });
});

it('the bar\'s league list is the configured leagues, in order', async () => {
  const { LEAGUE_SLUGS } = await import('../src/components/page');
  expect(LEAGUE_SLUGS).toEqual(SLUGS);
});
