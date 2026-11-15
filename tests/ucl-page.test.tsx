// The Champions League page's stakes column: hidden while the sure bounds rarely settle anything (before the eve of
// matchday 7, Alex's rule), drawn from then on with the engine's chips (tests/ucl-stakes.test.ts checks those).

import { cleanup, render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { Ctx, type FootyCtx } from '../src/components/ctx';
import UclPage from '../src/components/UclPage';
import { UclKnockout } from '../src/components/UclKnockout';
import { buildModel } from '../src/data/model';
import type { Match, Snapshot } from '../src/data/snapshot';
import { leaguePhaseMatches, uclTable } from '../src/data/ucl';

const snap = JSON.parse(readFileSync(join(import.meta.dirname, 'fixtures/snapshot.json'), 'utf8')) as Snapshot;
const lp = new Set(leaguePhaseMatches(snap).map((m) => m.id));
/** every league-phase match before `until` played 1-0 or 0-0 by turns */
const playedUntil = (until: string): Snapshot => {
  let k = 0;
  return { ...snap, matches: snap.matches.map((m): Match => (lp.has(m.id) && m.st !== 'post' && m.t < until ? { ...m, st: 'post', hs: k++ % 3 ? 1 : 0, as: 0 } : m)) };
};
function show(s: Snapshot) {
  const ctx: FootyCtx = { model: buildModel(s, 'UTC'), now: Date.parse('2026-11-21T15:00:00Z'), timeZone: 'UTC', live: { matches: new Map() } as unknown as FootyCtx['live'], onSeries: () => {} };
  render(<Ctx.Provider value={ctx}><UclPage today="2026-11-21" /></Ctx.Provider>);
}
afterEach(cleanup);

describe('UCL page stakes', () => {
  it('after matchday 4: no stakes column', () => {
    show(snap);
    expect(screen.getAllByTestId('ucl-row')).toHaveLength(36);
    expect(screen.queryByText('Stakes')).toBeNull();
  });
  it('on the eve of matchday 7: chips with their tooltips', () => {
    show(playedUntil('2027-01-15'));
    expect(screen.getByText('Stakes')).toBeTruthy();
    const chips = screen.getAllByTestId('ucl-stake');
    expect(chips.length).toBeGreaterThan(5);
    for (const c of chips) expect(c.getAttribute('title')).toMatch(/\w/);
  });
});

describe('UCL page knockout section', () => {
  it('mid league phase: projected sections from the table now', () => {
    show(snap);
    const ko = screen.getByTestId('ucl-knockout');
    expect(ko.textContent).toContain('if the league phase ended now');
    expect(screen.getAllByTestId('ko-projected').length).toBeGreaterThanOrEqual(8);
    expect(screen.queryAllByTestId('ko-tie')).toHaveLength(0);
    // section I: 9th/10th v 23rd/24th, the clubs there after matchday 4 (ESPN's table: Brugge, Sporting; Atlético, PSV)
    expect(ko.textContent).toContain('BRU / SCP v ATM / PSV');
  });
  it('a finished season (2025-26): 23 ties, drawn in halves', () => {
    const fx = JSON.parse(readFileSync(join(import.meta.dirname, 'fixtures/ucl-2025-26.json'), 'utf8')) as { teams: Snapshot['teams']; matches: Match[] };
    const teams = new Set(fx.matches.filter((m) => /league/i.test(m.r ?? '')).flatMap((m) => [m.h, m.a]));
    const phase = { pots: new Map([...teams].map((t) => [t, 1 as const])), from: '2025-09-16', to: '2026-01-28' };
    const s: Snapshot = { ...snap, teams: fx.teams, matches: fx.matches, tables: {} };
    const table = uclTable(s, undefined, phase);
    const ctx: FootyCtx = { model: buildModel(s, 'UTC'), now: Date.parse('2026-06-01T00:00:00Z'), timeZone: 'UTC', live: { matches: new Map() } as unknown as FootyCtx['live'], onSeries: () => {} };
    render(<Ctx.Provider value={ctx}><UclKnockout table={table} today="2026-06-01" /></Ctx.Provider>);
    expect(screen.getAllByTestId('ko-tie')).toHaveLength(8 + 8 + 4 + 2 + 1);
    expect(screen.queryAllByTestId('ko-projected')).toHaveLength(0);
    expect(screen.getAllByText('Half 1')).toHaveLength(2);
  });
});
