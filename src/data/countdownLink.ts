// FK-61: the Slate's "Countdown" button: a link that opens halftime-timer (the owner's timer site) on a timer counting
// down to the day's first match, or, once that one has kicked off, to the next match that hasn't. Link format: halftime-
// timer's README (HT-1): `?end=<ISO date-time with offset>&name=<text>`, both URL-encoded.

import { kickoffTime } from './model.ts';
import type { Match } from './snapshot.ts';

export const HALFTIME_TIMER = 'https://halftime-timer.vercel.app/';

export interface CountdownLink {
  m: Match;
  /** true: the day's first match; false: the first has started, this is the next one that hasn't */
  first: boolean;
  /** the timer's name: "First match · Arsenal–Chelsea 16:30" */
  name: string;
  url: string;
}

/** A match that will kick off at a known time (not postponed, cancelled, or still without a time). */
const scheduled = (m: Match) => m.st === 'pre' && !m.tbd;
/** A match that was never going to be the day's first: called off, or without a kick-off time. */
const counts = (m: Match) => !m.tbd && m.st !== 'ppd' && m.st !== 'can';

/**
 * The match to count down to: the earliest one that hasn't kicked off. `teamName` gives a team's name for the timer's
 * name. Undefined when no match of the day is still to start.
 */
export function countdownLink(list: Match[], now: number, teamName: (id: string) => string, timeZone?: string): CountdownLink | undefined {
  const byTime = (x: Match, y: Match) => x.t.localeCompare(y.t);
  const m = list.filter((x) => scheduled(x) && Date.parse(x.t) > now).sort(byTime)[0];
  if (!m) return undefined;
  const first = list.filter(counts).sort(byTime)[0]?.id === m.id;
  const name = `${first ? 'First' : 'Next'} match · ${teamName(m.h)}–${teamName(m.a)} ${kickoffTime(m.t, timeZone)}`;
  // the kick-off as UTC with its "Z" offset and no milliseconds: the same match always gives the same link, so
  // halftime-timer reuses its timer instead of adding a second one
  const end = new Date(m.t).toISOString().replace(/\.\d{3}Z$/, 'Z');
  return { m, first, name, url: `${HALFTIME_TIMER}?end=${encodeURIComponent(end)}&name=${encodeURIComponent(name)}` };
}
