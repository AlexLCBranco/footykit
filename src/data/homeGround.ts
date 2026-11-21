// FK-73: is the home team at its usual stadium? A club's usual ground is the venue of most of its home matches this
// season (more than half of them, at least 3; matches at a neutral venue, config/neutral.ts, and cancelled ones left
// out), or the one set by hand in
// config/homeGrounds.ts. A match somewhere else gets a note with the straight-line distance from the usual ground; a
// neutral-venue match gets "Neutral ground" instead. No reason is given (owner: knowing it's elsewhere is enough).
// ESPN spells a stadium differently now and then: two names with the same Wikidata item (config/venues.json) are the
// same ground.

import VENUES from '../../config/venues.json';
import { HOME_GROUND_OVERRIDES, type HomeGroundOverride } from '../../config/homeGrounds.ts';
import { neutralVenue } from './neutral.ts';
import type { Match } from './snapshot.ts';
import { km, venueKey, type Venue } from './venues.ts';

const TABLE = VENUES as Record<string, Venue>;

export interface GroundOpts {
  table?: Record<string, Venue>;
  overrides?: Record<string, HomeGroundOverride>;
  neutral?: (m: Match) => { why: string } | undefined;
}

/** Two venue keys name the same stadium: the same key, or the same Wikidata item for the stadium itself. */
export function sameGround(a: string, b: string, table: Record<string, Venue> = TABLE): boolean {
  if (a === b) return true;
  const x = table[a], y = table[b];
  return !!x && !!y && x.precision === 'venue' && y.precision === 'venue' && x.src === y.src;
}

/** A usual ground needs this many home matches at it: for a team outside the followed leagues the snapshot has only
 * its matches against followed clubs, and one or two of them say nothing about where it usually plays. */
export const MIN_HOME_MATCHES = 3;

/** Each team's usual home ground (a venue key): the venue of more than half of its home matches, and of at least
 * MIN_HOME_MATCHES; none otherwise (nothing says which is home). An override wins. */
export function usualGrounds(matches: readonly Match[], opts: GroundOpts = {}): Map<string, string> {
  const { table = TABLE, overrides = HOME_GROUND_OVERRIDES, neutral = neutralVenue } = opts;
  const counts = new Map<string, Map<string, number>>();
  for (const m of matches) {
    if (!m.v || m.st === 'can' || neutral(m)) continue;
    let c = counts.get(m.h);
    if (!c) counts.set(m.h, (c = new Map()));
    // one count per stadium, however ESPN spelled it
    const k = venueKey(m);
    const known = [...c.keys()].find((x) => sameGround(x, k, table)) ?? k;
    c.set(known, (c.get(known) ?? 0) + 1);
  }
  const out = new Map<string, string>();
  for (const [team, c] of counts) {
    const [first] = [...c].sort((a, b) => b[1] - a[1]);
    const all = [...c.values()].reduce((a, b) => a + b, 0);
    if (first && first[1] >= MIN_HOME_MATCHES && first[1] * 2 > all) out.set(team, first[0]);
  }
  for (const [team, o] of Object.entries(overrides)) out.set(team, o.venue);
  return out;
}

export type GroundNote =
  | { kind: 'neutral'; why: string }
  /** the home team is not at its usual ground; `km` from it when both places are known and it isn't next door */
  | { kind: 'moved'; usual: { name: string; city: string }; km?: number };

/** What to say about where `m` is played, or nothing: the home team is at its usual ground, the stadium isn't known,
 * or the team's usual ground can't be told. */
export function groundNote(m: Match, usual: Map<string, string>, opts: GroundOpts = {}): GroundNote | undefined {
  const { table = TABLE, neutral = neutralVenue } = opts;
  const n = neutral(m);
  if (n) return { kind: 'neutral', why: n.why };
  if (!m.v) return undefined;
  const home = usual.get(m.h);
  const here = venueKey(m);
  if (!home || sameGround(home, here, table)) return undefined;
  const [name = '', city = ''] = home.split('|');
  const a = table[home], b = table[here];
  const d = a && b ? Math.round(km(a, b)) : 0;
  return { kind: 'moved', usual: { name, city }, ...(d >= 1 ? { km: d } : {}) };
}

/** "Emirates Stadium, London"; undefined when ESPN gives no stadium. */
export const groundText = (m: Pick<Match, 'v' | 'city'>): string | undefined => (m.v ? [m.v, m.city].filter(Boolean).join(', ') : undefined);

/** The chip's words: "Not their stadium · 380 km from home", "Neutral ground". */
export function groundChip(n: GroundNote): string {
  if (n.kind === 'neutral') return 'Neutral ground';
  return `Not their stadium${n.km ? ` · ${n.km.toLocaleString('en-US')} km from home` : ''}`;
}

/** The chip's hover, in full sentences. */
export function groundTip(n: GroundNote, m: Pick<Match, 'v' | 'city'>, homeName: string): string {
  if (n.kind === 'neutral') return `Neither team is at home.\n${n.why}`;
  const usual = [n.usual.name, n.usual.city].filter(Boolean).join(', ');
  return `${homeName} usually play at home at ${usual}.\nThis match is at ${groundText(m)}${n.km ? `, ${n.km.toLocaleString('en-US')} km away` : ''}.`;
}

const cache = new WeakMap<readonly Match[], Map<string, string>>();
/** `usualGrounds` of a snapshot's matches, worked out once. */
export function snapshotGrounds(matches: readonly Match[]): Map<string, string> {
  let u = cache.get(matches);
  if (!u) cache.set(matches, (u = usualGrounds(matches)));
  return u;
}
