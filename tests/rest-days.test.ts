// Rest rows in the Team List (calendarkit's rule): days without a match between the first and the last.

import { describe, expect, it } from 'vitest';
import { daysBetween, restDays } from '../src/data/model';

describe('restDays', () => {
  it('every empty day between the first and last match, none outside', () => {
    expect(restDays(['2026-11-01', '2026-11-04', '2026-11-05'])).toEqual(['2026-11-02', '2026-11-03']);
  });
  it('rest = the difference of match dates: back to back = 1 (no rest row), one empty day = 2 (one row)', () => {
    expect(daysBetween('2026-11-04', '2026-11-05')).toBe(1);
    expect(restDays(['2026-11-04', '2026-11-05'])).toEqual([]);
    expect(daysBetween('2026-11-04', '2026-11-06')).toBe(2);
    expect(restDays(['2026-11-04', '2026-11-06'])).toEqual(['2026-11-05']);
  });
  it('an international break is just a run of rest days; two matches a day count once; order does not matter', () => {
    const r = restDays(['2026-11-30', '2026-11-08', '2026-11-08', '2026-11-21']);
    expect(r).toHaveLength(22 - 2);
    expect(r[0]).toBe('2026-11-09');
    expect(r.at(-1)).toBe('2026-11-29');
    expect(restDays([])).toEqual([]);
    expect(restDays(['2026-11-08'])).toEqual([]);
  });
});
