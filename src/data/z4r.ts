// Z4R, the relegation-race tag (PLAN.md Phase 3), the same rule for every league's zone (config/relegation.ts):
// - through round 8: tag only a team in the zone or within 1 point of the zone line;
// - from round 9: tag a team in the zone or within 3 points of the zone line.
// "Round" is the team's own league round going into the match (league matches played + 1), so a cup match counts as
// the round to come. Standings are rebuilt from the snapshot's league results before the match's kickoff (3 / 1 / 0;
// the recorded snapshot's rebuilt tables equal ESPN's): the tag describes the situation the match is played in.
// No tiebreaker is applied: only points decide. A team level on points with the zone line, where the tiebreakers
// would decide who is in, is "level" — and level is within any gap, so the tag doesn't depend on the tiebreakers.

import { RELEGATION, Z4R_RULE } from '../../config/relegation.ts';
import type { LeagueSlug } from '../../config/season.ts';
import { isPlayed, type Model } from './model.ts';
import type { Match } from './snapshot.ts';

export interface Z4Info {
  league: LeagueSlug;
  /** the team's league round going in */
  round: number;
  pts: number;
  /** points of the highest place in the zone (the zone line) and of the lowest safe place */
  linePts: number;
  safePts: number;
  /** first zone place (17 for the Brasileirão's Z4) */
  linePlace: number;
  status: 'in' | 'level' | 'above';
  /** above: points above the zone line; in: points short of the lowest safe place */
  gap: number;
  /** the rule says tag it */
  tagged: boolean;
  label: string;
}

const leagueMatches = new WeakMap<Model, Map<string, Match[]>>();
function playedLeague(model: Model, league: string): Match[] {
  let map = leagueMatches.get(model);
  if (!map) {
    map = new Map();
    for (const m of model.snap.matches) {
      if (!isPlayed(m)) continue;
      const l = map.get(m.c);
      if (l) l.push(m); else map.set(m.c, [m]);
    }
    leagueMatches.set(model, map);
  }
  return map.get(league) ?? [];
}

/** Points and league matches played per team, from results before `before` (ISO kickoff). */
export function pointsBefore(model: Model, league: string, before: string): Map<string, { pts: number; p: number }> {
  // the league's members are the teams in ESPN's table (a team outside it is never ranked)
  const table = new Map<string, { pts: number; p: number }>();
  for (const r of model.snap.tables[league]?.[0]?.rows ?? []) table.set(r.team, { pts: 0, p: 0 });
  const add = (team: string, pts: number) => { const x = table.get(team); if (x) { x.p++; x.pts += pts; } };
  for (const m of playedLeague(model, league)) {
    if (m.t >= before) break; // sorted by kickoff
    add(m.h, m.hs! > m.as! ? 3 : m.hs === m.as ? 1 : 0);
    add(m.a, m.as! > m.hs! ? 3 : m.hs === m.as ? 1 : 0);
  }
  return table;
}

const cache = new WeakMap<Model, Map<string, Z4Info | null>>();

/** The team's relegation-race situation going into `m`, in its own league; undefined for a team outside the six
 * leagues (a Libertadores opponent) or before it has played a league match (no standings yet). */
export function z4At(model: Model, teamId: string, m: Match): Z4Info | undefined {
  const league = leagueOf(model, teamId);
  if (!league) return undefined;
  let c = cache.get(model);
  if (!c) cache.set(model, (c = new Map()));
  const key = `${teamId}|${m.t}`;
  if (c.has(key)) return c.get(key) ?? undefined;
  const info = compute(model, league, teamId, m.t);
  c.set(key, info ?? null);
  return info;
}

function compute(model: Model, league: LeagueSlug, teamId: string, before: string): Z4Info | undefined {
  const rule = RELEGATION[league];
  const table = pointsBefore(model, league, before);
  const me = table.get(teamId);
  if (!me || me.p === 0) return undefined;
  const sorted = [...table.values()].map((x) => x.pts).sort((a, b) => b - a);
  const zone = rule.direct + rule.playoff;
  const lineIdx = sorted.length - zone;
  const linePts = sorted[lineIdx]!, safePts = sorted[lineIdx - 1]!;
  const status: Z4Info['status'] = me.pts > linePts ? 'above' : me.pts < linePts || safePts > linePts ? 'in' : 'level';
  const gap = status === 'above' ? me.pts - linePts : status === 'in' ? safePts - me.pts : 0;
  const round = me.p + 1;
  const limit = round <= Z4R_RULE.earlyRounds ? Z4R_RULE.early : Z4R_RULE.late;
  const tagged = status !== 'above' || gap <= limit;
  return { league, round, pts: me.pts, linePts, safePts, linePlace: lineIdx + 1, status, gap, tagged, label: rule.label };
}

/** The league a team plays in this season: a followed club's from config, another team's from the league tables. */
function leagueOf(model: Model, teamId: string): LeagueSlug | undefined {
  const club = model.clubById.get(teamId);
  if (club) return club.league;
  return (Object.keys(RELEGATION) as LeagueSlug[]).find((l) => model.snap.tables[l]?.[0]?.rows.some((r) => r.team === teamId));
}

/** "2 pts above Z4", "in Z4, 3 pts from safety", "level on points with Z4's line (tiebreakers decide)". */
export function z4Text(z: Z4Info): string {
  const pts = (n: number) => `${n} pt${n === 1 ? '' : 's'}`;
  if (z.status === 'above') return `${pts(z.gap)} above ${z.label}`;
  if (z.status === 'level') return `level on points with ${z.label}'s line (${z.linePlace}th) — tiebreakers decide`;
  return `in ${z.label}, ${pts(z.gap)} from safety`;
}
