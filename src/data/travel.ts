// Travel around a match, for each of its two teams: the previous match → this one → the next one (any competition),
// with the straight-line km between venues and the days between matches. Worked out once per match and model.

import VENUES from '../../config/venues.json';
import { daysBetween, type Model } from './model.ts';
import type { Match } from './snapshot.ts';
import { km, venueKey, type Venue } from './venues.ts';

const TABLE = VENUES as Record<string, Venue>;

export const venueOf = (m: Match, table: Record<string, Venue> = TABLE): Venue | undefined => (m.v || m.city ? table[venueKey(m)] : undefined);

export interface Leg {
  /** the other match (previous or next) */
  m: Match;
  /** straight-line km; undefined when a venue isn't known */
  km?: number;
  /** same venue as this match */
  stayed: boolean;
  /** days between the two matches' local days */
  days: number;
}

export interface TeamTravel { team: string; prev?: Leg; next?: Leg; followed: boolean }

const played = (m: Match) => m.st !== 'ppd' && m.st !== 'can';

/** The previous and next match of `team` around `m`. Only a followed club's whole schedule is known; for any other
 * team only its matches against followed clubs are, so its legs are left out. */
export function teamTravel(model: Model, m: Match, team: string, table: Record<string, Venue> = TABLE): TeamTravel {
  const list = model.byTeam.get(team);
  if (!list) return { team, followed: false };
  const own = list.filter(played);
  const i = own.findIndex((x) => x.id === m.id);
  const here = venueOf(m, table);
  const leg = (o: Match | undefined): Leg | undefined => {
    if (!o) return undefined;
    const there = venueOf(o, table);
    const stayed = venueKey(o) === venueKey(m) && !!m.v;
    return { m: o, stayed, km: stayed ? 0 : here && there ? Math.round(km(here, there)) : undefined, days: Math.abs(daysBetween(model.dayOf(o), model.dayOf(m))) };
  };
  return { team, followed: true, prev: leg(i > 0 ? own[i - 1] : undefined), next: leg(i >= 0 ? own[i + 1] : undefined) };
}

const cache = new WeakMap<Model, Map<string, [TeamTravel, TeamTravel]>>();
/** Away team first, then home (the line's order). */
export function matchTravel(model: Model, m: Match): [TeamTravel, TeamTravel] {
  let c = cache.get(model);
  if (!c) cache.set(model, (c = new Map()));
  let t = c.get(m.id);
  if (!t) c.set(m.id, (t = [teamTravel(model, m, m.a), teamTravel(model, m, m.h)]));
  return t;
}
