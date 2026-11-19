// FK-46: the competition icon's hover label: a league match's round ("~" where rounds are a best guess), a cup's stage.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { Match, Snapshot } from '../src/data/snapshot';
import { compLabel, stageText } from '../src/data/compLabel';
import { leagueMatchdays } from '../src/data/matchdays';

const snap = JSON.parse(readFileSync(join(import.meta.dirname, 'fixtures/snapshot.json'), 'utf8')) as Snapshot;

describe('compLabel', () => {
  it('a league match: its round, the same one the table\'s step-through uses', () => {
    const m = snap.matches.find((x) => x.id === '401879233')!; // Man City v Fulham, Nov 21
    const n = leagueMatchdays(snap, 'eng.1').days.roundOf.get(m.id)!;
    expect(n).toBeGreaterThan(0);
    expect(compLabel(snap, m, 'Premier League')).toBe(`Premier League · Round ${n}`);
  });
  it('an approximate-round league says "~Round"', () => {
    const m = snap.matches.find((x) => x.c === 'bra.1' && x.st === 'pre')!;
    const n = leagueMatchdays(snap, 'bra.1').days.roundOf.get(m.id)!;
    expect(compLabel(snap, m, 'Brasileirão')).toBe(`Brasileirão · ~Round ${n}`);
    const es = snap.matches.find((x) => x.c === 'esp.1')!;
    expect(compLabel(snap, es, 'LaLiga')).toMatch(/^LaLiga · ~Round \d+$/);
  });
  it('a cup tie: the stage and the leg', () => {
    const m: Match = { id: 'x', t: '2026-09-10T22:00Z', c: 'bra.copa_do_brazil', st: 'post', h: '1', a: '2', r: 'Semifinals', leg: 1 };
    expect(compLabel(snap, m, 'Copa do Brasil')).toBe('Copa do Brasil · Semi-final, 1st leg');
    expect(compLabel(snap, { ...m, r: 'Finals', leg: 2 }, 'Copa do Brasil')).toBe('Copa do Brasil · Final, 2nd leg');
    expect(compLabel(snap, { ...m, r: 'Third Round', leg: undefined }, 'EFL Cup')).toBe('EFL Cup · Third round');
    expect(compLabel(snap, { ...m, r: undefined, leg: undefined }, 'Supercopa')).toBe('Supercopa');
  });
  it('stage names', () => {
    expect(stageText('Quarterfinals', 2)).toBe('Quarter-final, 2nd leg');
    expect(stageText('Taça Guanabara - Semifinals', 1)).toBe('Taça Guanabara – Semi-final, 1st leg');
    expect(stageText('Some New Stage')).toBe('Some New Stage');
  });
});
