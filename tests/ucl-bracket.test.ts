// The UCL knockout phase (src/data/uclBracket.ts) on the whole recorded 2025-26 season (tests/fixtures/ucl-2025-26.json,
// ESPN's scoreboards; scripts/make-ucl-fixture.ts). Expected values come from Wikipedia's 2025-26 knockout-phase page:
// the league-phase places, the ties, aggregates and the bracket.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { Match, Team } from '../src/data/snapshot';
import { uclTable, type Phase, type Pot } from '../src/data/ucl';
import { koRound, koTies, uclBracket, type Tie } from '../src/data/uclBracket';

const fx = JSON.parse(readFileSync(join(import.meta.dirname, 'fixtures/ucl-2025-26.json'), 'utf8')) as { teams: Record<string, Team>; matches: Match[] };
const id = (abbr: string) => Object.values(fx.teams).find((t) => t.abbr === abbr)!.id;
const ab = (team: string | undefined) => (team ? fx.teams[team]!.abbr : '?');
// Wikipedia: league-phase places 1–24 (Arsenal 1st … Benfica 24th)
const TOP24 = ['ARS', 'MUN', 'LIV', 'TOT', 'BAR', 'CHE', 'SCP', 'MNC', 'RMA', 'INT', 'PSG', 'NEW', 'JUV', 'ATM', 'ATA', 'B04', 'DOR', 'OLY', 'BRU', 'GAL', 'MON', 'QAR', 'BODO', 'SLB'];
const POS = new Map(TOP24.map((a, i) => [id(a), i + 1]));
const pos = (t: string) => POS.get(t) ?? 99;
const show = (t: Tie) => `${ab(t.a)} ${t.goalsA}-${t.goalsB} ${ab(t.b)}${t.pensA !== undefined ? ` p${t.pensA}-${t.pensB}` : ''} → ${ab(t.winner)}`;
const bracket = uclBracket(fx.matches, pos);

describe('the league phase table on a finished season (criteria 1–8)', () => {
  it('gives Wikipedia\'s places 1–24', () => {
    const lp = fx.matches.filter((m) => koRound(m.r) === undefined && /league/i.test(m.r ?? ''));
    const teams = new Set(lp.flatMap((m) => [m.h, m.a]));
    const phase: Phase = { pots: new Map([...teams].map((t) => [t, 1 as Pot])), from: '2025-09-16', to: '2026-01-28' };
    const t = uclTable({ matches: fx.matches, teams: fx.teams }, undefined, phase);
    expect(t.complete).toBe(true);
    expect(t.rows.slice(0, 24).map((r) => ab(r.team))).toEqual(TOP24);
  });
});

describe('ties', () => {
  it('rounds from ESPN\'s stage names', () => {
    expect(['Knockout Round Playoffs', 'Round Of 16', 'Round of 16', 'Quarterfinals', 'Semifinals', 'Final', 'League Phase', 'Qualifying Round Playoffs'].map(koRound)).toEqual(['po', 'r16', 'r16', 'qf', 'sf', 'final', undefined, undefined]);
  });
  it('8 + 8 + 4 + 2 + 1 ties; two legs each but the final', () => {
    const ties = koTies(fx.matches, pos);
    expect(['po', 'r16', 'qf', 'sf', 'final'].map((r) => ties.filter((t) => t.round === r).length)).toEqual([8, 8, 4, 2, 1]);
    for (const t of ties) expect(t.legs).toHaveLength(t.round === 'final' ? 1 : 2);
  });
  it('aggregates and winners (Wikipedia), the better-placed team first', () => {
    const ties = koTies(fx.matches, pos);
    const po = ties.filter((t) => t.round === 'po').map(show).sort();
    expect(po).toEqual([
      'ATA 4-3 DOR → ATA', 'ATM 7-4 BRU → ATM', 'B04 2-0 OLY → B04', 'INT 2-5 BODO → BODO',
      'JUV 5-7 GAL → GAL', 'NEW 9-3 QAR → NEW', 'PSG 5-4 MON → PSG', 'RMA 3-1 SLB → RMA',
    ]);
    expect(show(ties.find((t) => t.round === 'final')!)).toBe('ARS 1-1 PSG p3-4 → PSG');
    // Sporting won 5-0 after extra time to turn round a 3-0 first-leg defeat
    expect(show(ties.find((t) => t.round === 'r16' && t.a === id('SCP'))!)).toBe('SCP 5-3 BODO → SCP');
  });
});

describe('bracket', () => {
  it('play-off sections by place', () => {
    expect(bracket.sections.map((s) => `${s.id}:${s.ties.map((t) => ab(t.a)).sort().join(',')}`)).toEqual(['I:INT,RMA', 'II:NEW,PSG', 'III:ATM,JUV', 'IV:ATA,B04']);
  });
  it('round-of-16 letters by the top-8 team, fed by their section', () => {
    expect(bracket.r16.map((g) => `${g.letter}:${g.ties.map((t) => ab(t.a)).sort().join(',')}`)).toEqual(['A:ARS,MUN', 'B:LIV,TOT', 'C:BAR,CHE', 'D:MNC,SCP']);
    expect(bracket.r16.map((g) => g.from)).toEqual(['IV', 'III', 'II', 'I']);
  });
  it('quarter-finals are A v D and B v C', () => {
    expect(bracket.qf.map((q) => q.kind).sort()).toEqual(['AD', 'AD', 'BC', 'BC']);
  });
  it('the halves, from the semi-finals: Arsenal\'s and Bayern\'s', () => {
    expect(bracket.halves).toHaveLength(2);
    const h = bracket.halves!.map((x) => ({ r16: x.r16.map((t) => ab(t.a)), sf: show(x.sf) }));
    expect(h).toContainEqual({ r16: ['ARS', 'SCP', 'TOT', 'BAR'], sf: 'ARS 2-1 ATM → ARS' });
    expect(h).toContainEqual({ r16: ['MUN', 'MNC', 'LIV', 'CHE'], sf: 'MUN 5-6 PSG → PSG' });
    expect(show(bracket.final!)).toBe('ARS 1-1 PSG p3-4 → PSG');
  });
  it('before the semi-finals are fixtured: no halves', () => {
    const early = uclBracket(fx.matches.filter((m) => !['sf', 'final'].includes(koRound(m.r) ?? '')), pos);
    expect(early.halves).toBeUndefined();
    expect(early.qf).toHaveLength(4);
  });
  it('mid-way through a tie: goals so far, no winner', () => {
    const firstLegs = fx.matches.filter((m) => koRound(m.r) === 'po' && m.leg === 1);
    const t = koTies(firstLegs, pos).find((x) => x.a === id('JUV'))!;
    expect([t.goalsA, t.goalsB, t.winner]).toEqual([2, 5, undefined]);
  });
});
