// The Champions League page's stakes column: hidden while the sure bounds rarely settle anything (before the eve of
// matchday 7, Alex's rule), drawn from then on with the engine's chips (tests/ucl-stakes.test.ts checks those).

import { cleanup, render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { Ctx, type FootyCtx } from '../src/components/ctx';
import UclPage from '../src/components/UclPage';
import { buildModel } from '../src/data/model';
import type { Match, Snapshot } from '../src/data/snapshot';
import { leaguePhaseMatches } from '../src/data/ucl';

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
