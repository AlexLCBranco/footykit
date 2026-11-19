// Copy as image: per match (a card's corner button), the whole day (the bar's Copy), and a marquee selection.
// Images are transparent around the cards (for drawing on the whiteboard), pixel ratio 4. A copied Slate lays its
// cards out by the largest-cards rule: the column count whose image, fitted to one whiteboard page (1920 × 911),
// shows the cards largest.

import { useState } from 'react';
import { COPY_PIXEL_RATIO, copyAsImage } from './copyAsImage';

/** FK-35: calendarkit's tight copy (CK-7): the cards share one 1 px divider line (a gap of -1, each card reaching 1 px
 * into the next), with COPY_MARGIN of transparent page around them. */
export const COPY_GAP = -1;
export const COPY_MARGIN = 12;
export const PAGE = { width: 1920, height: 911 };

const fitScale = (img: { width: number; height: number }, page = PAGE) => Math.min(page.width / img.width, page.height / img.height);

/** Columns for `n` cards of `card` size, `gap` apart (-1: a shared border) and `margin` around: the count that shows
 * them largest on the page (calendarkit's slateCopyColumns). Ties: fewer columns. */
export function copyColumns(n: number, card: { width: number; height: number }, page = PAGE, gap = COPY_GAP, margin = COPY_MARGIN): number {
  let best = 1, bestScale = 0;
  for (let cols = 1; cols <= Math.max(1, n); cols++) {
    const rows = Math.ceil(n / cols);
    const s = fitScale({ width: cols * card.width + (cols - 1) * gap + 2 * margin, height: rows * card.height + (rows - 1) * gap + 2 * margin }, page);
    if (s > bestScale + 1e-9) { best = cols; bestScale = s; }
  }
  return best;
}

/** Copies `node` (with `only`: just those matches, see isolate()). A Slate's cards are first laid out by
 * copyColumns; everything is put back after. */
export async function copyNode(node: HTMLElement, only?: ReadonlySet<string>): Promise<void> {
  const restore: (() => void)[] = [];
  if (only) restore.push(isolate(node, only));
  const cards = [...node.querySelectorAll<HTMLElement>(':scope > .fk-card')].filter((c) => c.style.display !== 'none');
  if (node.matches('.fk-slate') && cards.length > 1) {
    const r = cards[0]!.getBoundingClientRect();
    const cols = copyColumns(cards.length, { width: r.width, height: r.height });
    const old = node.getAttribute('style');
    // the cards keep their 1 px reach into the next one (margin -1), so the tracks are a pixel narrower than a card
    Object.assign(node.style, { display: 'grid', gridTemplateColumns: `repeat(${cols}, ${r.width - 1}px)`, gap: '0', padding: `${COPY_MARGIN}px ${COPY_MARGIN + 1}px ${COPY_MARGIN + 1}px ${COPY_MARGIN}px`, width: 'max-content', background: 'transparent' });
    restore.push(() => (old === null ? node.removeAttribute('style') : node.setAttribute('style', old)));
  }
  try {
    await copyAsImage(node, { pixelRatio: COPY_PIXEL_RATIO });
  } finally {
    restore.reverse().forEach((f) => f());
  }
}

/**
 * Hides everything in `node` but the matches in `ids`: unselected items, and the containers left empty (a Team List
 * month, a calendar day). A calendar's grid becomes a row of the selected days' cells (no empty cells, no weekday
 * header). Returns the undo.
 */
export function isolate(node: HTMLElement, ids: ReadonlySet<string>): () => void {
  const undo: (() => void)[] = [];
  const hide = (el: HTMLElement) => {
    const before = el.style.display;
    el.style.display = 'none';
    undo.push(() => (el.style.display = before));
  };
  for (const el of node.querySelectorAll<HTMLElement>('[data-game-id]')) if (!ids.has(el.dataset.gameId!)) hide(el);
  const anyShown = (el: HTMLElement) => [...el.querySelectorAll<HTMLElement>('[data-game-id]')].some((x) => ids.has(x.dataset.gameId!));
  for (const el of node.querySelectorAll<HTMLElement>('.fk-tl-month, .fk-cal-cell')) if (!anyShown(el)) hide(el);
  for (const el of node.querySelectorAll<HTMLElement>('.fk-cal-wd, .fk-legend, .fk-earlier, .fk-empty')) hide(el);
  for (const grid of node.querySelectorAll<HTMLElement>('.fk-cal-grid')) {
    const cell = grid.querySelector<HTMLElement>('.fk-cal-cell');
    const w = cell?.getBoundingClientRect().width ?? 200;
    const before = grid.getAttribute('style');
    Object.assign(grid.style, { display: 'flex', flexWrap: 'wrap', width: 'max-content', maxWidth: `${Math.round(w * 4 + 12)}px` });
    for (const c of grid.querySelectorAll<HTMLElement>('.fk-cal-cell')) c.style.width = `${w}px`;
    undo.push(() => {
      if (before === null) grid.removeAttribute('style'); else grid.setAttribute('style', before);
      for (const c of grid.querySelectorAll<HTMLElement>('.fk-cal-cell')) c.style.width = '';
    });
  }
  return () => undo.reverse().forEach((f) => f());
}

/** A copy button: `target` finds what to copy from the button. Shows ✓ for a moment, "!" on failure. */
export function CopyButton({ target, label, small, only }: { target: (button: HTMLElement) => HTMLElement | null; label: string; small?: boolean; only?: ReadonlySet<string> }) {
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'fail'>('idle');
  return (
    <button type="button" className={`fk-icon-btn fk-copy${small ? ' fk-copy-small' : ''}`} data-capture-exclude="true" title={state === 'fail' ? 'Copy failed' : label} aria-label={label} data-testid="copy" disabled={state === 'busy'}
      onClick={async (e) => {
        const node = target(e.currentTarget);
        if (!node) return;
        setState('busy');
        try { await copyNode(node, only); setState('done'); } catch { setState('fail'); }
        setTimeout(() => setState('idle'), 1500);
      }}>
      {state === 'done' ? '✓' : state === 'fail' ? '!' : (
        <svg viewBox="0 0 16 16" width={small ? 12 : 16} height={small ? 12 : 16} aria-hidden="true"><path fill="currentColor" d="M5 1.5h8.5V12H12V3H5z" /><path fill="currentColor" d="M2.5 4.5H11V15H2.5zM4 6v7.5h5.5V6z" /></svg>
      )}
    </button>
  );
}
