// Raw ESPN payloads → the Snapshot the app reads (src/data/snapshot.ts). Pure: the fetching lives in
// scripts/update-snapshot.ts, so this runs in unit tests on recorded payloads.

import { COMPETITIONS as COMPS_KNOWN, DROPPED, compInfo, type CompKind } from '../../config/competitions.ts';
import { FOLLOWED, SEASON_ID, type LeagueSlug } from '../../config/season.ts';
import { slimMatch, teamsOf, type EspnEvent } from '../../src/data/espn.ts';
import type { Club, Comp, Match, Snapshot, Table, Team } from '../../src/data/snapshot.ts';

export interface TeamLite { id: string; abbreviation: string; displayName: string; shortDisplayName?: string }

export interface RawInput {
  generatedAt: string;
  /** each followed league's (and the `ifIn` competition's) team list */
  teamLists: Record<string, TeamLite[]>;
  /** every followed club's feed, played and to come, any order, duplicates allowed */
  feeds: EspnEvent[];
  /** competition scoreboards, already limited to this season */
  boards: { slug: string; events: EspnEvent[] }[];
  standings: { slug: string; json: StandingsJson }[];
}

export type StandingsJson = {
  children?: { name?: string; standings?: { entries?: { team: { id: string }; note?: { description?: string; color?: string }; stats?: { name?: string; value?: number }[] }[] } }[];
};

const regionOf = (l: LeagueSlug): Club['region'] => (l === 'bra.1' ? 'southAmerica' : 'europe');

/** The followed clubs, from the config rules and ESPN's current team lists (promotions and this season's
 * Champions League field follow automatically). Throws when an `extraClubs` id is not in its league. */
export function resolveClubs(teamLists: RawInput['teamLists']): Club[] {
  const clubs: Club[] = [];
  const add = (l: LeagueSlug, t: TeamLite) => {
    if (!clubs.some((c) => c.id === t.id)) clubs.push({ id: t.id, abbr: t.abbreviation, name: t.displayName, short: t.shortDisplayName ?? t.displayName, league: l, region: regionOf(l) });
  };
  for (const l of FOLLOWED.allClubsOf) for (const t of teamLists[l] ?? []) add(l, t);
  const inComp = new Set((teamLists[FOLLOWED.ifIn.competition] ?? []).map((t) => t.id));
  for (const l of FOLLOWED.ifIn.leagues) for (const t of teamLists[l] ?? []) if (inComp.has(t.id)) add(l, t);
  for (const x of FOLLOWED.extraClubs) {
    const t = teamLists[x.league]?.find((t) => t.id === x.espnId);
    if (!t) throw new Error(`extra club ${x.espnId} (${x.note}) is not in ${x.league}`);
    add(x.league, t);
  }
  return clubs;
}

export function tablesOf(json: StandingsJson): Table[] {
  return (json.children ?? []).map((g) => ({
    name: g.name ?? '',
    rows: (g.standings?.entries ?? []).map((e) => {
      const s = (n: string) => e.stats?.find((x) => x.name === n)?.value ?? 0;
      const row: Table['rows'][number] = { team: e.team.id, rank: s('rank'), p: s('gamesPlayed'), w: s('wins'), d: s('ties'), l: s('losses'), gf: s('pointsFor'), ga: s('pointsAgainst'), pts: s('points') };
      if (e.note?.description) row.zone = e.note.description;
      if (e.note?.color) row.zc = e.note.color;
      return row;
    }).sort((a, b) => a.rank - b.rank),
  }));
}

const leagueKind = (slug: string) => compInfo(slug).kind === 'league';

/** Fields defined on `b` win over `a` (the club feed carries aggregates and shootouts the scoreboard lacks). */
function mergeMatch(a: Match | undefined, b: Match): Match {
  if (!a) return b;
  const out: Match = { ...a };
  for (const [k, v] of Object.entries(b)) if (v !== undefined) (out as unknown as Record<string, unknown>)[k] = v;
  return out;
}

export interface BuildReport { unknownComps: string[]; droppedPostponed: string[] }

export function buildSnapshot(raw: RawInput): { snapshot: Snapshot; report: BuildReport } {
  const clubs = resolveClubs(raw.teamLists);
  const teams: Record<string, Team> = {};
  for (const c of clubs) teams[c.id] = { id: c.id, abbr: c.abbr, name: c.name, short: c.short };
  const comps: Record<string, Comp> = {};
  const byId = new Map<string, Match>();
  const unknown = new Set<string>();

  const take = (e: EspnEvent, slug: string) => {
    if (DROPPED(slug)) return;
    const info = compInfo(slug, e.league?.name);
    comps[slug] ??= { slug, code: info.code, name: info.name, kind: info.kind as CompKind };
    const m = slimMatch(e, slug, leagueKind(slug));
    if (!m) return;
    byId.set(m.id, mergeMatch(byId.get(m.id), m));
    for (const t of teamsOf(e)) teams[t.id] ??= t;
  };
  for (const b of raw.boards) for (const e of b.events) take(e, e.league?.slug ?? b.slug);
  for (const e of raw.feeds) take(e, e.league?.slug ?? '?');
  for (const slug of Object.keys(comps)) if (!(slug in COMPS_KNOWN)) unknown.add(slug);

  // ESPN keeps a postponed event and lists the rescheduled match under a new id: drop the postponed copy then.
  const key = (m: Match) => `${m.c}|${m.h}|${m.a}|${m.r ?? ''}|${m.leg ?? ''}`;
  const live = new Set([...byId.values()].filter((m) => m.st !== 'ppd' && m.st !== 'can').map(key));
  const droppedPostponed: string[] = [];
  for (const m of byId.values()) if (m.st === 'ppd' && live.has(key(m))) { byId.delete(m.id); droppedPostponed.push(m.id); }

  const matches = [...byId.values()].sort((a, b) => a.t.localeCompare(b.t) || a.id.localeCompare(b.id));
  const tables: Record<string, Table[]> = {};
  for (const s of raw.standings) { const t = tablesOf(s.json); if (t.length) tables[s.slug] = t; }

  return {
    snapshot: { v: 1, generatedAt: raw.generatedAt, season: SEASON_ID, clubs, teams, comps, matches, tables },
    report: { unknownComps: [...unknown].sort(), droppedPostponed },
  };
}
