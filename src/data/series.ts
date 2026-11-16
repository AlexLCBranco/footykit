// Season series: every meeting of two teams this season, across all competitions, oldest first. A two-leg knockout
// tie is one entry per leg; the second leg carries the aggregate (and the shootout when there was one).

import type { Model } from './model.ts';
import type { Match } from './snapshot.ts';

export interface Meeting { m: Match; tie?: { agg: [number, number]; pens?: [number, number] } }

/** Meetings of `a` and `b`, aggregates given from `a`'s side. Only a followed club's matches are indexed, so one of
 * the two must be followed. */
export function seasonSeries(model: Model, a: string, b: string): Meeting[] {
  const list = model.byTeam.get(a) ?? model.byTeam.get(b) ?? [];
  return list.filter((m) => (m.h === a && m.a === b) || (m.h === b && m.a === a)).map((m) => {
    if (m.ha === undefined || m.aa === undefined) return { m };
    const aHome = m.h === a;
    const tie: Meeting['tie'] = { agg: aHome ? [m.ha, m.aa] : [m.aa, m.ha] };
    if (m.hp !== undefined && m.ap !== undefined) tie.pens = aHome ? [m.hp, m.ap] : [m.ap, m.hp];
    return { m, tie };
  });
}

/** The winner of one meeting: a team, 'draw', or undefined while it is to come. A two-leg tie's leg is the match
 * itself (its aggregate is shown beside it, not counted). */
export function meetingWinner(m: Match): string | 'draw' | undefined {
  if (m.st !== 'post' || m.hs === undefined || m.as === undefined) return undefined;
  if (m.hs !== m.as) return m.hs > m.as ? m.h : m.a;
  // level after extra time: a shootout decides the match (a knockout's single match or second leg)
  if (m.hp !== undefined && m.ap !== undefined && m.hp !== m.ap && m.ha === undefined) return m.hp > m.ap ? m.h : m.a;
  return 'draw';
}

/** The series' state on top of its popup (calendarkit's): "ARS leads 1–0", "Series tied 1–1", "ARS won 2–0",
 * "Only meeting", "No games played yet"; draws counted after it ("· 1 draw"). */
export function seriesStatus(meetings: Meeting[], a: string, b: string, abbr: (id: string) => string): string {
  let wa = 0, wb = 0, d = 0;
  for (const { m } of meetings) {
    const w = meetingWinner(m);
    if (w === a) wa++; else if (w === b) wb++; else if (w === 'draw') d++;
  }
  const played = wa + wb + d;
  if (!played) return meetings.length === 1 ? 'Only meeting' : 'No games played yet';
  const done = played === meetings.length;
  const draws = d ? ` · ${d} draw${d > 1 ? 's' : ''}` : '';
  if (wa === wb) return `Series ${done ? 'split' : 'tied'} ${wa}–${wb}${draws}`;
  const [lead, hi, lo] = wa > wb ? [a, wa, wb] : [b, wb, wa];
  return `${abbr(lead)} ${done ? 'won' : 'leads'} ${hi}–${lo}${draws}`;
}
