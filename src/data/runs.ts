// Road trips and homestands, ported from calendarkit (src/data/runs.ts): RUN_MIN_GAMES or more of a club's matches in
// a row all away (road trip) or all at home (homestand). Counted over the club's whole season in every competition,
// never a shown range, so a run crossing a month keeps its full length everywhere. A neutral-venue match belongs to
// neither side and breaks a run, and so does a gap of RUN_BREAK_DAYS or more between two matches. Cancelled and
// postponed matches aren't played, so they don't count. Pure; one computation per model and club.

import { daysBetween, type Model } from './model.ts';
import { neutralVenue } from './neutral.ts';
import type { Match } from './snapshot.ts';

/** The fewest matches in a row that make a road trip or a homestand (calendarkit's value; tune here). */
export const RUN_MIN_GAMES = 3;
/** Days between two match dates that end a run (calendarkit's value; tune here). */
export const RUN_BREAK_DAYS = 6;

export type RunKind = 'road' | 'home';

export interface Run {
  kind: RunKind;
  /** the run's matches in date order (≥ RUN_MIN_GAMES) */
  matches: Match[];
  /** first and last match days (local day keys) */
  from: string;
  to: string;
}

export interface TeamRuns {
  runs: Run[];
  /** match id → its run and its 0-based place in it */
  byMatch: Map<string, { run: Run; index: number }>;
}

const cache = new WeakMap<Model, Map<string, TeamRuns>>();

/** The side a match is for the club: home, road, or neither (neutral venue). */
function sideOf(m: Match, team: string): RunKind | undefined {
  if (neutralVenue(m)) return undefined;
  return m.h === team ? 'home' : 'road';
}

/** The club's road trips and homestands, in date order. */
export function teamRuns(model: Model, team: string): TeamRuns {
  let byTeam = cache.get(model);
  if (!byTeam) cache.set(model, (byTeam = new Map()));
  const hit = byTeam.get(team);
  if (hit) return hit;
  const runs: Run[] = [];
  let cur: Match[] = [];
  let kind: RunKind | undefined;
  const close = () => {
    if (kind && cur.length >= RUN_MIN_GAMES) runs.push({ kind, matches: cur, from: model.dayOf(cur[0]!), to: model.dayOf(cur.at(-1)!) });
    cur = [];
    kind = undefined;
  };
  for (const m of model.byTeam.get(team) ?? []) {
    if (m.st === 'can' || m.st === 'ppd') continue;
    const side = sideOf(m, team);
    const gap = cur.length ? daysBetween(model.dayOf(cur.at(-1)!), model.dayOf(m)) : 0;
    if (side !== kind || gap >= RUN_BREAK_DAYS) close();
    if (!side) continue;
    kind = side;
    cur.push(m);
  }
  close();
  const byMatch = new Map<string, { run: Run; index: number }>();
  for (const run of runs) run.matches.forEach((m, index) => byMatch.set(m.id, { run, index }));
  const out = { runs, byMatch };
  byTeam.set(team, out);
  return out;
}

/** "Road trip" / "Homestand". */
export const runName = (kind: RunKind) => (kind === 'road' ? 'Road trip' : 'Homestand');

/** The label on each match of a run, its place in it: "Road trip · 2/4". */
export const runLabel = (run: Run, index: number) => `${runName(run.kind)} · ${index + 1}/${run.matches.length}`;

/** The label's tooltip: "Road trip · match 2 of 4", the dates, and for a road trip the cities in order (a city played
 * twice in a row once). */
export function runTip(model: Model, run: Run, index: number, dayLabel: (d: string) => string): string {
  const lines = [`${runName(run.kind)} · match ${index + 1} of ${run.matches.length}`, `${dayLabel(run.from)} – ${dayLabel(run.to)}`];
  if (run.kind === 'road') lines.push(run.matches.map((m) => m.city || model.team(m.h).short).filter((c, i, a) => c !== a[i - 1]).join(' → '));
  return lines.join('\n');
}
