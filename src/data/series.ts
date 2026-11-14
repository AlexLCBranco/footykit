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
