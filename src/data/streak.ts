// FK-50: a club's result streak (W / D / L in a row, every competition), the games behind "W3" / "D2" / "L1" — the
// same rule as calendarkit's streak (src/data/streak.ts there) with draws: a played match shows the streak through it,
// a match to come the streak going into it (the current one). A match decided on penalties counts as the draw it was
// after 90 / 120 minutes (ESPN's score; the shootout is apart), marked `pens`.

import { playedUpTo } from './form.ts';
import { isPlayed, resultFor, type Model } from './model.ts';
import type { Match } from './snapshot.ts';

export interface StreakGame {
  m: Match;
  r: 'W' | 'D' | 'L';
  home: boolean;
  opp: string;
  gf: number;
  ga: number;
  /** decided on penalties (counted as a draw) */
  pens: boolean;
}

/** The streak's games, newest first, at `m` (none: the current streak, through the last played match). */
export function streakGames(model: Model, teamId: string, m?: Match): StreakGame[] {
  const played = m ? playedUpTo(model, teamId, m) : (model.byTeam.get(teamId) ?? []).filter(isPlayed);
  const out: StreakGame[] = [];
  for (let i = played.length - 1; i >= 0; i--) {
    const x = played[i]!;
    const r = resultFor(x, teamId)!;
    if (out.length && r !== out[0]!.r) break;
    const home = x.h === teamId;
    out.push({ m: x, r, home, opp: home ? x.a : x.h, gf: (home ? x.hs : x.as)!, ga: (home ? x.as : x.hs)!, pens: x.hp !== undefined && x.ap !== undefined });
  }
  return out;
}

/** "W3" / "D2" / "L1" as kind and length, or undefined before the first played match. */
export function streakAt(model: Model, teamId: string, m?: Match): { kind: 'W' | 'D' | 'L'; n: number } | undefined {
  const g = streakGames(model, teamId, m);
  return g.length ? { kind: g[0]!.r, n: g.length } : undefined;
}
