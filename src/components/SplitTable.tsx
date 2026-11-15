// No scrollbars inside tables (app-wide rule): a table taller than its room flows its rows into 2 or 3 side-by-side
// tables, each repeating the header, rows split evenly (36 → 18 | 18 or 12 | 12 | 12). Rows move whole, so zone bars
// and ▲▼ stay with them. The column count is the fewest that fit the height, within the width; when even 2 don't fit
// the width (a narrow window, a small popup) it stays 1 column and the page grows instead.

import { useLayoutEffect, useRef, useState, type ReactElement, type ReactNode } from 'react';

/** The column count: the fewest (1…max) whose height fits `room`, among those that fit `width`; when none fits the
 * height, the most that fit the width. Pure, for the tests. */
export function splitCount({ rows, rowH, headH, tableW, width, room, gap, max }: {
  rows: number; rowH: number; headH: number; tableW: number; width: number; room: number; gap: number; max: number;
}): number {
  let widest = 1;
  for (let k = 1; k <= max; k++) {
    if (k > 1 && (k * tableW + (k - 1) * gap > width || rows < 2 * k)) break;
    widest = k;
    if (headH + Math.ceil(rows / k) * rowH <= room) return k; // the longest run
  }
  return widest;
}

/** Rows split evenly into `k` runs, in order, the longer runs first: 36 in 2 → 18 | 18; 20 in 3 → 7 | 7 | 6;
 * 10 in 3 → 4 | 3 | 3. */
export function chunks<T>(rows: T[], k: number): T[][] {
  const base = Math.floor(rows.length / k), extra = rows.length % k;
  const out: T[][] = [];
  for (let i = 0, at = 0; i < k; i++) { const n = base + (i < extra ? 1 : 0); out.push(rows.slice(at, at + n)); at += n; }
  return out.filter((c) => c.length);
}

const GAP = 18;

/**
 * `bound`: what the tables must fit in. "window": the page's first screen (a page's own table; below it the page
 * scrolls as usual). "parent": the window's bottom as the tables sit now, minus what comes after them in their holder
 * (a simulator column, the standings popup), so the holder's own end shows too.
 */
export function SplitTable({ head, rows, className, bound = 'window', max = 3, caption, testId, onMouseLeave }: {
  head: ReactNode; rows: ReactElement[]; className: string; bound?: 'window' | 'parent'; max?: number;
  caption?: ReactNode; testId?: string; onMouseLeave?: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [k, setK] = useState(1);
  const [tick, setTick] = useState(0);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const on = () => setTick((t) => t + 1);
    window.addEventListener('resize', on);
    const ro = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(on);
    ro?.observe(el.parentElement ?? el);
    return () => { window.removeEventListener('resize', on); ro?.disconnect(); };
  }, []);

  useLayoutEffect(() => {
    const el = ref.current;
    const first = el?.querySelector('table');
    if (!el || !first) return;
    const tables = [...el.querySelectorAll('table')];
    const body = first.tBodies[0];
    const shownRows = body?.rows.length ?? 0;
    if (!shownRows) return;
    const rowH = body!.offsetHeight / shownRows;
    const headH = first.offsetHeight - body!.offsetHeight;
    const tableW = Math.max(...tables.map((t) => t.offsetWidth));
    const top = el.getBoundingClientRect().top;
    let room: number;
    if (bound === 'window') room = window.innerHeight - (top + window.scrollY) - 8;
    else {
      // the window bottom, not the holder's own: a column or popup grows with what it holds, so its height would
      // always "fit"; what follows the tables in it (a key, a note) must fit too
      let after = 0;
      for (let n = el.nextElementSibling; n; n = n.nextElementSibling) after += (n as HTMLElement).offsetHeight;
      room = window.innerHeight - top - after - 16;
    }
    const width = el.clientWidth;
    const next = splitCount({ rows: rows.length, rowH, headH, tableW, width, room, gap: GAP, max });
    if (next !== k) setK(next);
  }, [rows.length, bound, max, k, tick]);

  return (
    <div ref={ref} className="fk-split" style={{ gap: GAP }} data-testid={testId} data-cols={k} onMouseLeave={onMouseLeave}>
      {chunks(rows, k).map((c, i) => (
        <table key={i} className={className}>
          {caption && i === 0 ? <caption>{caption}</caption> : caption ? <caption aria-hidden="true">&nbsp;</caption> : null}
          <thead>{head}</thead>
          <tbody>{c}</tbody>
        </table>
      ))}
    </div>
  );
}
