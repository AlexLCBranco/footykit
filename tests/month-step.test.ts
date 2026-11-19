// FK-49: the side arrows' month step in every calendar view, disabled at the data's first / last month.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildModel, monthOf } from '../src/data/model';
import type { Snapshot } from '../src/data/snapshot';
import { defaultPage, monthStep, shiftMonthDay, stepPage, type Page } from '../src/components/page';

const snap = JSON.parse(readFileSync(join(import.meta.dirname, 'fixtures/snapshot.json'), 'utf8')) as Snapshot;
const model = buildModel(snap, 'America/Sao_Paulo');
const base = defaultPage('2026-11-21');
const cal = (p: Partial<Page>): Page => ({ ...base, view: 'cal', team: '382', ...p });

describe('shiftMonthDay', () => {
  it('keeps the day of the month, clamped to the month\'s last', () => {
    expect(shiftMonthDay('2026-11-21', 1)).toBe('2026-12-21');
    expect(shiftMonthDay('2026-01-31', 1)).toBe('2026-02-28');
    expect(shiftMonthDay('2026-03-31', -1)).toBe('2026-02-28');
    expect(shiftMonthDay('2026-12-15', 1)).toBe('2027-01-15');
  });
});

describe('monthStep (FK-49)', () => {
  it('Team Calendar month span: the same step as the bar\'s ‹ ›', () => {
    const p = cal({ span: 'month', month: '2026-11' });
    expect(monthStep(p, 1, model)).toEqual(stepPage(p, 1, model));
    expect(monthStep(p, -1, model)).toEqual(stepPage(p, -1, model));
    expect(monthStep(p, -1, model)!.month).toBe('2026-10');
  });
  it('a week view: the Monday of the same day a month away', () => {
    const p = cal({ span: 2, week: '2026-11-16' });
    const n = monthStep(p, 1, model)!;
    expect(n.week).toBe('2026-12-14'); // Dec 16 is a Wednesday → its Monday
    expect(n.month).toBe('2026-12');
    expect(monthStep(p, -1, model)!.week).toBe('2026-10-12');
  });
  it('the League view Calendar: the day a month away', () => {
    const p: Page = { ...base, view: 'league', lcomp: 'eng.1', lmode: 'cal', day: '2026-11-21' };
    expect(monthStep(p, -1, model)!.day).toBe('2026-10-21');
  });
  it('disabled (undefined) at the data\'s first and last month', () => {
    const first = monthOf(model.firstDay), last = monthOf(model.lastDay);
    expect(monthStep(cal({ span: 'month', month: first }), -1, model)).toBeUndefined();
    expect(monthStep(cal({ span: 'month', month: first }), 1, model)).toBeDefined();
    expect(monthStep(cal({ span: 'month', month: last }), 1, model)).toBeUndefined();
    expect(monthStep(cal({ span: 'month', month: last }), -1, model)).toBeDefined();
  });
});
