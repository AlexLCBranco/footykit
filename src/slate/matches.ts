// FK-77 (gauntlet GT-21, the combined Slate): the list of a day's matches for a host that mixes football with another
// sport's games in time order. Each match has its id and its start as an exact instant.
//
// Which day a match belongs to here is the owner's rule for the combined Slate (2026-11-21), the same in calendarkit
// (CK-34): the day it starts on in São Paulo time, and a start before 05:00 São Paulo time counts for the day before
// (a late NBA game belongs to the night it is part of; football never starts that late). footykit's own Slate keeps
// its rule (the day the match starts on in the viewer's time zone, from midnight): for football the two give the same
// days whenever the viewer is on São Paulo time, because no match starts between midnight and 05:00 there.

import { addDays, dayKey, type Model } from '../data/model';
import type { Match } from '../data/snapshot';

/** The zone the combined Slate's days are counted in, and the hour its day starts. */
export const SLATE_DAY_ZONE = 'America/Sao_Paulo';
export const SLATE_DAY_START_HOUR = 5;

/** The combined Slate's day (YYYY-MM-DD) of an instant: São Paulo's calendar day, with 00:00–04:59 counted for the day before. */
export function slateDayOf(instant: string | number): string {
  const t = typeof instant === 'string' ? Date.parse(instant) : instant;
  return dayKey(t - SLATE_DAY_START_HOUR * 3_600_000, SLATE_DAY_ZONE);
}

export interface SlateMatch {
  /** the match's id (ESPN's): what `SlateMatchCard` takes, and the key of its note */
  id: string;
  /** the kick-off as an exact instant, ISO 8601 in UTC ("2026-11-21T12:30:00.000Z") */
  start: string;
  /** the same instant in milliseconds, for sorting with another sport's games */
  startMs: number;
  /** true when the kick-off time is not decided yet (the date holds, the instant is only its placeholder) */
  timeUnknown: boolean;
}

/**
 * The followed clubs' matches of one combined-Slate day, in start order (ties keep the Slate's order). A match without
 * a kick-off time yet has no instant to place it by, so it stays on the day footykit's Slate shows it.
 */
export function slateMatches(data: Model, day: string): SlateMatch[] {
  const seen = new Set<string>();
  const out: (SlateMatch & { order: number })[] = [];
  // the viewer's zone can put a match a calendar day either side of São Paulo's; the 05:00 rule one more day back
  for (let d = -2; d <= 2; d++) {
    for (const m of data.byDay.get(addDays(day, d)) ?? []) {
      if (seen.has(m.id) || matchSlateDay(data, m) !== day) continue;
      seen.add(m.id);
      const startMs = Date.parse(m.t);
      out.push({ id: m.id, start: new Date(startMs).toISOString(), startMs, timeUnknown: !!m.tbd, order: out.length });
    }
  }
  return out.sort((a, b) => a.startMs - b.startMs || a.order - b.order).map(({ id, start, startMs, timeUnknown }) => ({ id, start, startMs, timeUnknown }));
}

/** The combined Slate's day of a match (its own day in footykit while its time is not decided). */
export const matchSlateDay = (data: Model, m: Match): string => (m.tbd ? data.dayOf(m) : slateDayOf(m.t));

/** A match by id, among the followed clubs' matches. */
export function findMatch(data: Model, id: string): Match | undefined {
  for (const list of data.byDay.values()) { const m = list.find((x) => x.id === id); if (m) return m; }
  return undefined;
}
