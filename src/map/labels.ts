// Label geometry for the maps (copied from calendarkit src/map/view.ts): text widths and a greedy label placer that
// never lets two labels (or a label and a dot) overlap.

// ---------------------------------------------------------------- text widths

let ctx: CanvasRenderingContext2D | null | undefined;
const widths = new Map<string, number>();
/** Width (px) of `text` in `font` (a CSS font shorthand): measured once on a canvas; estimated where there's none (tests). */
export function textWidth(text: string, font: string): number {
  const key = `${font}|${text}`;
  const hit = widths.get(key);
  if (hit !== undefined) return hit;
  if (ctx === undefined) ctx = typeof navigator !== 'undefined' && !/jsdom/i.test(navigator.userAgent) && typeof document !== 'undefined' ? document.createElement('canvas').getContext('2d') : null;
  let w: number;
  if (ctx) {
    ctx.font = font;
    w = ctx.measureText(text).width;
  } else w = text.length * (parseFloat(/(\d+(\.\d+)?)px/.exec(font)?.[1] ?? '12') * 0.62);
  widths.set(key, w);
  return w;
}

// ---------------------------------------------------------------- label placement

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}
const overlap = (a: Rect, b: Rect) => Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));

export interface LabelAsk {
  key: string;
  /** Candidate boxes (px in the box), best first; one per variant and position. `variant` tells which text it is. */
  options: (Rect & { variant: number })[];
  /** Must be shown even when every option overlaps (the least overlapping one is taken). */
  force?: boolean;
}

/**
 * Greedy: each ask in order takes its first option that overlaps nothing placed (labels, `blocked` boxes such as dots)
 * and stays inside `bounds` (with a 2 px gap kept between labels). An ask with no free option is left out — or, `force`,
 * takes the least overlapping one.
 */
export function placeLabels(asks: readonly LabelAsk[], blocked: readonly Rect[], bounds: Rect, gap = 2): Map<string, Rect & { variant: number }> {
  const taken: Rect[] = [...blocked];
  const out = new Map<string, Rect & { variant: number }>();
  const inside = (r: Rect) => r.x >= bounds.x && r.y >= bounds.y && r.x + r.w <= bounds.x + bounds.w && r.y + r.h <= bounds.y + bounds.h;
  const grown = (r: Rect): Rect => ({ x: r.x - gap, y: r.y - gap, w: r.w + 2 * gap, h: r.h + 2 * gap });
  for (const a of asks) {
    let best: (Rect & { variant: number }) | undefined;
    let bestCost = Infinity;
    for (const o of a.options) {
      const cost = taken.reduce((s, t) => s + overlap(grown(o), t), 0) + (inside(o) ? 0 : 1e6);
      if (cost === 0) {
        best = o;
        bestCost = 0;
        break;
      }
      if (cost < bestCost) [best, bestCost] = [o, cost];
    }
    if (!best || (bestCost > 0 && !a.force)) continue;
    out.set(a.key, best);
    taken.push(best);
  }
  return out;
}

/** Boxes of a w × h label around a point (px), nearest first: right, left, above, below, then the four corners. */
export function around(p: { x: number; y: number }, w: number, h: number, r = 9): Rect[] {
  return [
    { x: p.x + r, y: p.y - h / 2, w, h },
    { x: p.x - r - w, y: p.y - h / 2, w, h },
    { x: p.x - w / 2, y: p.y - r - h, w, h },
    { x: p.x - w / 2, y: p.y + r, w, h },
    { x: p.x + r * 0.7, y: p.y - r * 0.7 - h, w, h },
    { x: p.x + r * 0.7, y: p.y + r * 0.7, w, h },
    { x: p.x - r * 0.7 - w, y: p.y - r * 0.7 - h, w, h },
    { x: p.x - r * 0.7 - w, y: p.y + r * 0.7, w, h },
  ];
}
