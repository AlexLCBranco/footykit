// FK-28: a team's current place in its domestic league table (the snapshot's table, as ESPN ranks it), shown after
// its name on the Slate cards and list rows, in every competition. A team in no domestic league table (a European or
// South American club from a league footykit doesn't follow) has none.

import { LEAGUE_SEASON_YEAR, type LeagueSlug } from '../../config/season.ts';

const LEAGUES = Object.keys(LEAGUE_SEASON_YEAR) as LeagueSlug[];
import type { Model } from './model.ts';

export interface LeaguePlace { rank: number; league: string; teams: number }

const cache = new WeakMap<Model, Map<string, LeaguePlace>>();

export function leaguePosition(model: Model, teamId: string): LeaguePlace | undefined {
  let places = cache.get(model);
  if (!places) {
    places = new Map();
    for (const league of LEAGUES) {
      for (const t of model.snap.tables[league] ?? []) {
        for (const r of t.rows) if (r.rank && !places.has(r.team)) places.set(r.team, { rank: r.rank, league, teams: t.rows.length });
      }
    }
    cache.set(model, places);
  }
  return places.get(teamId);
}
