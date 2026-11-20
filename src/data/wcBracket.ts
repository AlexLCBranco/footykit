// FK-69 / FK-70: the World Cup bracket as drawn: which card feeds which (the lines), the champion's path, and the
// poster's team tiles. Pure; WcBracket.tsx draws it.

import type { KoColumn, KoTie } from './worldcup.ts';

/** A card's place: its column in twoSided()'s order and its row in the column. */
export interface Slot { col: number; row: number }
export const slotId = (s: Slot) => `${s.col}-${s.row}`;

/**
 * The card the tie at `s` feeds: the next column toward the final, the row of its pair (two ties feed one). The
 * final feeds nothing.
 */
export function feeds(cols: Pick<KoColumn, 'side'>[], s: Slot): Slot | undefined {
  const side = cols[s.col]?.side;
  if (!side || side === 'final') return undefined;
  const col = side === 'left' ? s.col + 1 : s.col - 1;
  return { col, row: cols[col]!.side === 'final' ? 0 : Math.floor(s.row / 2) };
}

/** Whether the line out of this tie is on the champion's path: the champion won it. */
export const onChampionPath = (t: KoTie | null | undefined, champion: string | undefined) => !!t && !!champion && t.winner === champion;

// ---- FK-70: the poster ----
/** A poster tile: a team in a round (undefined = not decided / no match), dimmed when it went out in that round. */
export interface PosterTile { team?: string; out: boolean }
export interface PosterColumn { side: 'left' | 'final' | 'right'; stage: string; tiles: PosterTile[]; champion?: boolean }

/**
 * The poster's columns from the bracket's: each round's teams (two per tie, top to bottom), then the finalist of each
 * side either side of the champion in the middle. A slot with no tie, or a tie with no winner yet, gives placeholders.
 */
export function posterColumns(cols: KoColumn[]): PosterColumn[] {
  const tiles = (c: KoColumn): PosterTile[] => c.ties.flatMap((t): PosterTile[] => (t ?[t.a, t.b].map((team) => ({ team, out: !!t.winner && t.winner !== team })) : [{ out: false }, { out: false }]));
  const final = cols.find((c) => c.side === 'final');
  const f = final?.ties[0];
  const finalist = (team: string | undefined): PosterTile => ({ team, out: !!f?.winner && f.winner !== team });
  return [
    ...cols.filter((c) => c.side === 'left').map((c): PosterColumn => ({ side: 'left', stage: c.stage, tiles: tiles(c) })),
    { side: 'left', stage: 'Final', tiles: [finalist(f?.a)] },
    { side: 'final', stage: 'Champion', tiles: [{ team: f?.winner, out: false }], champion: true },
    { side: 'right', stage: 'Final', tiles: [finalist(f?.b)] },
    ...cols.filter((c) => c.side === 'right').map((c): PosterColumn => ({ side: 'right', stage: c.stage, tiles: tiles(c) })),
  ];
}

/** The tile the poster tile at `s` feeds: the next column toward the middle, the row of its pair. The champion feeds nothing. */
export function posterFeeds(cols: Pick<PosterColumn, 'side' | 'champion'>[], s: Slot): Slot | undefined {
  const c = cols[s.col];
  if (!c || c.champion) return undefined;
  const col = c.side === 'left' ? s.col + 1 : s.col - 1;
  return { col, row: cols[col]!.champion ? 0 : Math.floor(s.row / 2) };
}
