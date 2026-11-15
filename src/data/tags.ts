// The context tags of a match (Phase 3), worked out once per model and match: for each side the windows before and
// after, the window streak, the competitions still alive and the relegation race; for the match the window advantage
// and the derby. The views only choose how to draw them (src/components/Tags.tsx).

import type { Rivalry } from '../../config/rivalries.ts';
import { compInfo } from '../../config/competitions.ts';
import { competitionsAlive, type CompAlive } from './alive.ts';
import type { Model } from './model.ts';
import { rivalryOf } from './rivalry.ts';
import type { Match } from './snapshot.ts';
import { firstLegOf, windowAdvantage, windowStreak, windowsAround, type WindowSlot } from './windows.ts';
import { z4At, type Z4Info } from './z4r.ts';

/** Show the streak tag from this many windows in a row (a display choice: 3 = more than one week of two a week). */
export const STREAK_TAG_MIN = 3;

export interface SideTags {
  team: string;
  prev: WindowSlot;
  next: WindowSlot;
  streak?: number;
  /** undefined for a team whose schedule isn't complete in the snapshot */
  alive?: CompAlive[];
  z4?: Z4Info;
  /** had the previous window free while the opponent played */
  rested: boolean;
}

export interface MatchTags {
  a: SideTags;
  h: SideTags;
  derby?: Rivalry;
}

const cache = new WeakMap<Model, Map<string, MatchTags>>();

export function matchTags(model: Model, m: Match): MatchTags {
  let c = cache.get(model);
  if (!c) cache.set(model, (c = new Map()));
  const key = `${m.id}|${m.t}|${m.st}`;
  const hit = c.get(key);
  if (hit) return hit;
  const adv = windowAdvantage(model, m);
  const side = (team: string): SideTags => ({
    team,
    ...windowsAround(model, team, m),
    streak: windowStreak(model, team, m),
    alive: model.followed.has(team) ? competitionsAlive(model, team, m) : undefined,
    z4: z4At(model, team, m),
    rested: adv === team,
  });
  const tags: MatchTags = { a: side(m.a), h: side(m.h), derby: rivalryOf(m) };
  c.set(key, tags);
  return tags;
}

export type SlotKind = 'free' | 'league' | 'cup' | 'unknown' | 'none';

/** One window's headline: free, league or cup (cup = domestic cup, continental, state or super cup). */
export function slotKind(s: WindowSlot): SlotKind {
  if (s.state === 'free') return 'free';
  if (s.state === 'unknown') return 'unknown';
  if (s.state !== 'played') return 'none';
  return s.matches.some((m) => compInfo(m.c).kind !== 'league') ? 'cup' : 'league';
}

/** The window's cup match, if any, else its first match. */
export const slotMatch = (s: WindowSlot): Match | undefined => s.matches.find((m) => compInfo(m.c).kind !== 'league') ?? s.matches[0];

/** "2-0": the first-leg score from `teamId`'s side, when `m` is a second leg. */
export function firstLegScore(model: Model, m: Match, teamId: string): string | undefined {
  const l1 = firstLegOf(model, m);
  if (!l1 || l1.hs === undefined || l1.as === undefined || l1.st !== 'post') return undefined;
  return l1.h === teamId ? `${l1.hs}-${l1.as}` : `${l1.as}-${l1.hs}`;
}

export const aliveCount = (s: SideTags) => s.alive?.filter((x) => x.status === 'alive').length;

export const ordinal = (n: number) => `${n}${n % 100 >= 11 && n % 100 <= 13 ? 'th' : n % 10 === 1 ? 'st' : n % 10 === 2 ? 'nd' : n % 10 === 3 ? 'rd' : 'th'}`;
