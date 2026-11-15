// The snapshot builder on recorded ESPN payloads (tests/fixtures/raw-subset.json.gz, made by scripts/make-fixture.ts),
// and the guard that app code never reads raw ESPN fields.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { buildSnapshot, type RawInput } from '../scripts/snapshot/build.ts';
import { problems } from '../scripts/update-snapshot.ts';
import { decimalOdds, slimMatch, stageName, type EspnEvent } from '../src/data/espn.ts';

const raw = JSON.parse(gunzipSync(readFileSync(join(import.meta.dirname, 'fixtures/raw-subset.json.gz'))).toString()) as RawInput;
const { snapshot: s, report } = buildSnapshot(raw);
const ARS = '359', VAS = '3454', BOT = '6086';
const of = (id: string) => s.matches.filter((m) => m.h === id || m.a === id);

describe('buildSnapshot', () => {
  it('resolves the followed clubs from the config rules', () => {
    expect(s.clubs).toHaveLength(54);
    expect(s.clubs.filter((c) => c.league === 'eng.1')).toHaveLength(20);
    expect(s.clubs.filter((c) => c.league === 'bra.1')).toHaveLength(20);
    expect(s.clubs.find((c) => c.id === '160')).toMatchObject({ abbr: 'PSG', league: 'fra.1', region: 'europe' });
  });

  it('holds every competition of a club, friendlies left out', () => {
    const comps = new Set(of(ARS).map((m) => m.c));
    expect(comps).toContain('eng.1');
    expect(comps).toContain('uefa.champions');
    expect(comps).toContain('eng.league_cup');
    expect([...new Set(s.matches.map((m) => m.c))].filter((c) => c.includes('friendly'))).toEqual([]);
    expect(of(ARS).filter((m) => m.c === 'eng.1')).toHaveLength(38);
  });

  it('is sorted by kickoff and has no duplicate ids', () => {
    const ts = s.matches.map((m) => m.t);
    expect(ts).toEqual([...ts].sort());
    expect(new Set(s.matches.map((m) => m.id)).size).toBe(s.matches.length);
  });

  it('keeps scores only on played matches, with aggregates and shootouts', () => {
    for (const m of s.matches) if (m.st === 'pre') expect([m.hs, m.as, m.ha, m.hp]).toEqual([undefined, undefined, undefined, undefined]);
    // Copa do Brasil semi-final, second leg: 2-1 on the day, 2-2 on aggregate, Vasco lost the shootout 4-5
    const semi = of(VAS).find((m) => m.c === 'bra.copa_do_brazil' && m.r === 'Semifinals' && m.leg === 2)!;
    expect(semi).toMatchObject({ hs: 2, as: 1, ha: 2, aa: 2, hp: 4, ap: 5 });
  });

  it('names rounds for cups only', () => {
    expect(s.matches.filter((m) => m.c === 'eng.1' && m.r)).toEqual([]);
    expect(of(ARS).some((m) => m.c === 'uefa.champions' && m.r === 'League Phase')).toBe(true);
  });

  it('drops a postponed match that was rescheduled under a new id', () => {
    expect(report.droppedPostponed.length).toBeGreaterThan(0);
    for (const id of report.droppedPostponed) expect(s.matches.some((m) => m.id === id)).toBe(false);
  });

  it('flags undecided kickoff times', () => {
    expect(s.matches.some((m) => m.tbd === 1)).toBe(true);
  });

  it('builds the tables with zones', () => {
    const pl = s.tables['eng.1']![0]!;
    expect(pl.rows).toHaveLength(20);
    expect(pl.rows.map((r) => r.rank)).toEqual([...Array(20).keys()].map((i) => i + 1));
    expect(pl.rows[0]!.zone).toBeTruthy();
    expect(s.tables['conmebol.libertadores']).toHaveLength(8);
  });

  it('knows every team in its matches', () => {
    for (const m of s.matches) { expect(s.teams[m.h], m.h).toBeDefined(); expect(s.teams[m.a], m.a).toBeDefined(); }
    expect(s.teams[BOT]?.abbr).toBe('BOT');
  });

  it('problems(): the cut-down snapshot misses most clubs\' matches; the full fixture has none', () => {
    expect(problems(s).length).toBeGreaterThan(0);
    const full = JSON.parse(readFileSync(join(import.meta.dirname, 'fixtures/snapshot.json'), 'utf8'));
    expect(problems(full)).toEqual([]);
  });
});

describe('decimalOdds', () => {
  it.each([['+150', 2.5], ['-200', 1.5], [400, 5], ['EVEN', 2], ['', undefined], [undefined, undefined]] as const)('%s → %s', (a, d) => {
    expect(decimalOdds(a)).toBe(d);
  });
});

describe('app code reads the snapshot, never raw ESPN', () => {
  it('only the ESPN modules, the job and the day function import src/data/espn.ts', () => {
    const root = join(import.meta.dirname, '..');
    const files: string[] = [];
    const walk = (d: string) => { for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) walk(p); else if (/\.tsx?$/.test(f)) files.push(p); } };
    walk(join(root, 'src'));
    const allowed = /[\\/]src[\\/]data[\\/](espn|ko|day)\.ts$/;
    const hits = files.filter((f) => !allowed.test(f) && /from '[./]*(data\/)?espn(\.ts)?'/.test(readFileSync(f, 'utf8')));
    expect(hits.map((f) => f.slice(root.length + 1))).toEqual([]);
  });
});

describe('stage names', () => {
  // a Libertadores group match from a scoreboard: no seasonType, only the season slug (ESPN, 2026)
  const ev = { id: '1', date: '2026-04-08T00:30Z', season: { year: 2026, slug: 'group-stage' }, competitions: [{ date: '2026-04-08T00:30Z', status: { type: { state: 'pre' } }, competitors: [{ homeAway: 'home', team: { id: '1' } }, { homeAway: 'away', team: { id: '2' } }] }] } as unknown as EspnEvent;
  it('a scoreboard event without seasonType still gets its stage from the season slug', () => {
    expect(slimMatch(ev, 'conmebol.libertadores', false)?.r).toBe('Group Stage');
    expect(slimMatch({ ...ev, season: { year: 2026, slug: 'round-of-16' } }, 'conmebol.libertadores', false)?.r).toBe('Round of 16');
  });
  it('seasonType wins when present; league rounds stay unnamed', () => {
    expect(slimMatch({ ...ev, seasonType: { name: 'Quarterfinals' } }, 'conmebol.libertadores', false)?.r).toBe('Quarterfinals');
    expect(slimMatch({ ...ev, season: { year: 2026, slug: '2026-brazilian-serie-a' } }, 'bra.1', true)?.r).toBeUndefined();
  });
  it('stageName', () => {
    expect(['knockout-round-playoffs', 'league-phase', 'first-stage', undefined].map(stageName)).toEqual(['Knockout Round Playoffs', 'League Phase', 'First Stage', undefined]);
  });
});
