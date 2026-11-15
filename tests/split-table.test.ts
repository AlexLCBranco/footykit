// The no-scrollbar rule's arithmetic (src/components/SplitTable.tsx): how many side-by-side tables, and which rows each.

import { describe, expect, it } from 'vitest';
import { chunks, splitCount } from '../src/components/SplitTable';

describe('chunks', () => {
  it('splits evenly, in order, longer runs first', () => {
    const r = Array.from({ length: 36 }, (_, i) => i + 1);
    expect(chunks(r, 2).map((c) => [c[0], c.at(-1)])).toEqual([[1, 18], [19, 36]]);
    expect(chunks(r, 3).map((c) => [c[0], c.at(-1)])).toEqual([[1, 12], [13, 24], [25, 36]]);
    expect(chunks(Array.from({ length: 20 }, (_, i) => i), 3).map((c) => c.length)).toEqual([7, 7, 6]);
    expect(chunks(Array.from({ length: 10 }, (_, i) => i), 3).map((c) => c.length)).toEqual([4, 3, 3]);
    expect(chunks([1, 2, 3], 1)).toEqual([[1, 2, 3]]);
  });
});

describe('splitCount', () => {
  const base = { rows: 36, rowH: 21, headH: 23, tableW: 320, gap: 18, max: 3 };
  it('one column when it fits the height', () => {
    expect(splitCount({ ...base, width: 2000, room: 23 + 36 * 21 })).toBe(1);
  });
  it('the fewest columns that fit the height', () => {
    expect(splitCount({ ...base, width: 2000, room: 23 + 18 * 21 })).toBe(2);
    expect(splitCount({ ...base, width: 2000, room: 23 + 12 * 21 })).toBe(3);
  });
  it('never more than the width holds: 1 column (the page scrolls) when 2 do not fit', () => {
    expect(splitCount({ ...base, width: 600, room: 300 })).toBe(1);
    expect(splitCount({ ...base, width: 700, room: 300 })).toBe(2);
  });
  it('the most the width holds when even 3 are too tall', () => {
    expect(splitCount({ ...base, width: 2000, room: 100 })).toBe(3);
  });
  it('never splits a short table into near-empty columns', () => {
    expect(splitCount({ ...base, rows: 3, width: 2000, room: 40 })).toBe(1);
  });
});
