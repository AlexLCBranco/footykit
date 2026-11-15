// The snapshot indexed for the views: matches per followed club and per local day, in the viewer's time zone.
// Days are "YYYY-MM-DD" keys in that zone (all times in the browser's zone: Alex is in Brazil). Built once per
// snapshot and zone; every lookup after that is a Map get.

import type { Club, Comp, Match, Snapshot, Team } from './snapshot.ts';

const formatters = new Map<string, Intl.DateTimeFormat>();
/** Intl formatters are slow to create: one per locale + options. */
export function dateFormat(locale: string, opts: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const k = `${locale}|${JSON.stringify(opts)}`;
  let f = formatters.get(k);
  if (!f) formatters.set(k, (f = new Intl.DateTimeFormat(locale, opts)));
  return f;
}

/** The local day of an instant: "YYYY-MM-DD". */
export const dayKey = (t: number | string, timeZone?: string) =>
  dateFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone }).format(typeof t === 'string' ? Date.parse(t) : t);

/** Day arithmetic on keys (calendar days, no time zone involved). */
export function addDays(day: string, n: number): string {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
export const daysBetween = (a: string, b: string) => Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / 86400000);

/** A team's rest days, as calendarkit's Team List counts them: every day between its first and last match with no
 * match of the team. Rest between two matches = the difference of their dates (back to back = 1, one empty day = 2),
 * so a gap of n days holds n − 1 rest days. Always from all the team's matches, never a filtered list. */
export function restDays(matchDays: Iterable<string>): string[] {
  const days = new Set(matchDays);
  const sorted = [...days].sort();
  const out: string[] = [];
  if (!sorted.length) return out;
  for (let d = sorted[0]!; d < sorted.at(-1)!; d = addDays(d, 1)) if (!days.has(d)) out.push(d);
  return out;
}
/** 0 = Sunday … 6 = Saturday */
export const weekday = (day: string) => new Date(`${day}T12:00:00Z`).getUTCDay();
/** The Monday that starts the week holding `day` (European weeks: club football's round runs Fri–Mon). */
export const mondayOf = (day: string) => addDays(day, -((weekday(day) + 6) % 7));
export const monthOf = (day: string) => day.slice(0, 7);
export const addMonths = (month: string, n: number) => {
  const [y, m] = month.split('-').map(Number) as [number, number];
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return d.toISOString().slice(0, 7);
};

/** "21:30" in the viewer's zone (24 h, as in Brazil and Europe). */
export const kickoffTime = (iso: string, timeZone?: string) =>
  dateFormat('en-GB', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone }).format(Date.parse(iso));

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
/** "Sat, Nov 21" */
export const dayLabel = (day: string) => `${WEEKDAYS[weekday(day)]}, ${MONTHS[Number(day.slice(5, 7)) - 1]} ${Number(day.slice(8, 10))}`;
/** "Nov 21" */
export const shortDay = (day: string) => `${MONTHS[Number(day.slice(5, 7)) - 1]} ${Number(day.slice(8, 10))}`;
/** "November 2026" */
export const monthLabel = (month: string, long = true) =>
  `${long ? ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][Number(month.slice(5, 7)) - 1] : MONTHS[Number(month.slice(5, 7)) - 1]} ${month.slice(0, 4)}`;
export const weekdayShort = (day: string) => WEEKDAYS[weekday(day)]!;

export interface Model {
  snap: Snapshot;
  timeZone?: string;
  clubs: Club[];
  followed: Set<string>;
  clubById: Map<string, Club>;
  team: (id: string) => Team;
  comp: (slug: string) => Comp;
  /** a followed club's matches, by kickoff */
  byTeam: Map<string, Match[]>;
  /** matches involving a followed club, per local day, by kickoff */
  byDay: Map<string, Match[]>;
  dayOf: (m: Match) => string;
  /** first and last local day with a followed club's match */
  firstDay: string;
  lastDay: string;
}

const UNKNOWN_COMP = (slug: string): Comp => ({ slug, code: slug.toUpperCase(), name: slug, kind: 'cup' });

export function buildModel(snap: Snapshot, timeZone?: string): Model {
  const followed = new Set(snap.clubs.map((c) => c.id));
  const clubById = new Map(snap.clubs.map((c) => [c.id, c]));
  const byTeam = new Map<string, Match[]>(snap.clubs.map((c) => [c.id, []]));
  const byDay = new Map<string, Match[]>();
  const days = new Map<string, string>();
  for (const m of snap.matches) {
    const inH = followed.has(m.h), inA = followed.has(m.a);
    if (!inH && !inA) continue;
    if (inH) byTeam.get(m.h)!.push(m);
    if (inA) byTeam.get(m.a)!.push(m);
    const d = dayKey(m.t, timeZone);
    days.set(m.id, d);
    let l = byDay.get(d);
    if (!l) byDay.set(d, (l = []));
    l.push(m);
  }
  const keys = [...byDay.keys()].sort();
  return {
    snap,
    timeZone,
    clubs: snap.clubs,
    followed,
    clubById,
    team: (id) => snap.teams[id] ?? { id, abbr: '?', name: 'Unknown team', short: 'Unknown' },
    comp: (slug) => snap.comps[slug] ?? UNKNOWN_COMP(slug),
    byTeam,
    byDay,
    dayOf: (m) => days.get(m.id) ?? dayKey(m.t, timeZone),
    firstDay: keys[0] ?? dayKey(Date.now(), timeZone),
    lastDay: keys[keys.length - 1] ?? dayKey(Date.now(), timeZone),
  };
}

/** Has a result to show (finished, or stopped with a score). */
export const isPlayed = (m: Match) => m.st === 'post' && m.hs !== undefined && m.as !== undefined;
export const isOff = (m: Match) => m.st === 'ppd' || m.st === 'can';

/** W / D / L for `teamId` (a shootout after a draw is still a draw on the day). */
export function resultFor(m: Match, teamId: string): 'W' | 'D' | 'L' | undefined {
  if (!isPlayed(m)) return undefined;
  const mine = m.h === teamId ? m.hs! : m.as!;
  const theirs = m.h === teamId ? m.as! : m.hs!;
  return mine > theirs ? 'W' : mine < theirs ? 'L' : 'D';
}

export const opponentOf = (m: Match, teamId: string) => (m.h === teamId ? m.a : m.h);
