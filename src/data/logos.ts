// Which teams need a local logo: everyone a followed club meets this season, and every team in a table footykit shows.

import type { Snapshot } from './snapshot.ts';

export function logoTeams(s: Snapshot): Set<string> {
  const followed = new Set(s.clubs.map((c) => c.id));
  const out = new Set<string>(followed);
  for (const m of s.matches) if (followed.has(m.h) || followed.has(m.a)) { out.add(m.h); out.add(m.a); }
  for (const tables of Object.values(s.tables)) for (const t of tables) for (const r of t.rows) out.add(r.team);
  return out;
}
