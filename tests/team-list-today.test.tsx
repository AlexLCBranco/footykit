// FK-27: today's line in the Team List is highlighted, on a match day and on a day without a match, with rest days
// on or off.

import { cleanup, render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { Ctx, type FootyCtx } from '../src/components/ctx';
import { TeamList } from '../src/components/TeamList';
import { buildModel } from '../src/data/model';
import type { Snapshot } from '../src/data/snapshot';

const snap = JSON.parse(readFileSync(join(import.meta.dirname, 'fixtures/snapshot.json'), 'utf8')) as Snapshot;
const model = buildModel(snap, 'America/Sao_Paulo');
const FLA = '819';
function show(today: string, showRest: boolean) {
  const ctx: FootyCtx = { model, now: Date.parse(`${today}T15:00:00Z`), timeZone: 'America/Sao_Paulo', live: { matches: new Map() } as unknown as FootyCtx['live'], onSeries: () => {} };
  render(<Ctx.Provider value={ctx}><TeamList team={FLA} from={today.slice(0, 7)} to={today.slice(0, 7)} today={today} onEarlier={() => {}} showRest={showRest} /></Ctx.Provider>);
}
afterEach(cleanup);

describe('Team List today', () => {
  it('a rest day: its rest line is the highlighted one', () => {
    show('2026-10-27', true); // Flamengo played Oct 26 and Oct 29
    const marked = document.querySelectorAll('[data-today]');
    expect(marked).toHaveLength(1);
    expect(marked[0]!.getAttribute('data-rest')).toBe('2026-10-27');
    expect(marked[0]!.className).toContain('fk-is-today');
    expect(screen.getByTestId('today-mark').textContent).toBe('Today');
  });
  it('rest days off: today still gets its own line', () => {
    show('2026-10-27', false);
    expect(screen.queryAllByTestId('rest-row').map((r) => r.getAttribute('data-rest'))).toEqual(['2026-10-27']);
    expect(screen.getByTestId('rest-row').textContent).toContain('No match');
  });
  it('a match day: the match row is highlighted', () => {
    show('2026-10-29', false);
    const marked = document.querySelectorAll('[data-today]');
    expect(marked).toHaveLength(1);
    expect(marked[0]!.getAttribute('data-testid')).toBe('team-row');
  });
});
