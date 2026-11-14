// Copy as image: per match (a card's corner button), the whole day (the bar's Copy), and a marquee selection.
// Images are transparent around the cards (for drawing on the whiteboard), pixel ratio 4. A copied Slate lays its
// cards out by the largest-cards rule: the column count whose image, fitted to one whiteboard page (1920 × 911),
// shows the cards largest.

import { useState } from 'react';
import { COPY_PIXEL_RATIO, copyAsImage } from './copyAsImage';

export const COPY_GAP = 24;
export const PAGE = { width: 1920, height: 911 };

const fitScale = (img: { width: number; height: number }, page = PAGE) => Math.min(page.width / img.width, page.height / img.height);

/** Columns for `n` cards of `card` size, `gap` apart and half a gap around: the count that shows them largest on the
 * page. Ties: fewer columns. */
export function copyColumns(n: number, card: { width: number; height: number }, page = PAGE, gap = COPY_GAP): number {
  let best = 1, bestScale = 0;
  for (let cols = 1; cols <= Math.max(1, n); cols++) {
    const rows = Math.ceil(n / cols);
    const s = fitScale({ width: cols * (card.width + gap), height: rows * (card.height + gap) }, page);
    if (s > bestScale + 1e-9) { best = cols; bestScale = s; }
  }
  return best;
}

/** Copies `node`. A grid of cards (`.fk-slate`, `.fk-rows`) is first laid out by copyColumns; the layout is put back
 * after. */
export async function copyNode(node: HTMLElement): Promise<void> {
  const cards = [...node.querySelectorAll<HTMLElement>(':scope > .fk-card, :scope > .fk-row')];
  const restore: (() => void)[] = [];
  if (node.matches('.fk-slate') && cards.length > 1) {
    const r = cards[0]!.getBoundingClientRect();
    const cols = copyColumns(cards.length, { width: r.width, height: r.height });
    const old = node.getAttribute('style');
    Object.assign(node.style, { display: 'grid', gridTemplateColumns: `repeat(${cols}, ${r.width}px)`, gap: `${COPY_GAP}px`, padding: `${COPY_GAP / 2}px`, width: 'max-content', background: 'transparent' });
    restore.push(() => (old === null ? node.removeAttribute('style') : node.setAttribute('style', old)));
  }
  try {
    await copyAsImage(node, { pixelRatio: COPY_PIXEL_RATIO });
  } finally {
    restore.forEach((f) => f());
  }
}

/** A copy button: `target` finds what to copy from the button. Shows ✓ for a moment, "!" on failure. */
export function CopyButton({ target, label, small }: { target: (button: HTMLElement) => HTMLElement | null; label: string; small?: boolean }) {
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'fail'>('idle');
  return (
    <button type="button" className={`fk-icon-btn fk-copy${small ? ' fk-copy-small' : ''}`} data-capture-exclude="true" title={state === 'fail' ? 'Copy failed' : label} aria-label={label} data-testid="copy" disabled={state === 'busy'}
      onClick={async (e) => {
        const node = target(e.currentTarget);
        if (!node) return;
        setState('busy');
        try { await copyNode(node); setState('done'); } catch { setState('fail'); }
        setTimeout(() => setState('idle'), 1500);
      }}>
      {state === 'done' ? '✓' : state === 'fail' ? '!' : (
        <svg viewBox="0 0 16 16" width={small ? 12 : 16} height={small ? 12 : 16} aria-hidden="true"><path fill="currentColor" d="M5 1.5h8.5V12H12V3H5z" /><path fill="currentColor" d="M2.5 4.5H11V15H2.5zM4 6v7.5h5.5V6z" /></svg>
      )}
    </button>
  );
}
