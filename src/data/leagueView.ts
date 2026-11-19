// FK-45: the League view's data: a competition's games per local day and its teams. Pure.

import type { Match } from './snapshot.ts';

/** A competition's matches per local day, by kickoff. */
export function compDays(matches: Match[], comp: string, dayOf: (m: Match) => string): Map<string, Match[]> {
  const out = new Map<string, Match[]>();
  for (const m of matches) {
    if (m.c !== comp) continue;
    const d = dayOf(m);
    let l = out.get(d);
    if (!l) out.set(d, (l = []));
    l.push(m);
  }
  for (const l of out.values()) l.sort((a, b) => a.t.localeCompare(b.t) || a.id.localeCompare(b.id));
  return out;
}

/** The competition's teams (everyone with a match in it), by name. */
export function compTeams(matches: Match[], comp: string, name: (id: string) => string): string[] {
  const ids = new Set<string>();
  for (const m of matches) if (m.c === comp) { ids.add(m.h); ids.add(m.a); }
  return [...ids].sort((a, b) => name(a).localeCompare(name(b)));
}
