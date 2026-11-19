// FK-43: a league's matchdays (rounds) and its table as it stood after round N. ESPN's feeds give no round number for
// league matches (checked 2026-11-19: not in the snapshot, the raw schedule / scoreboard payloads, nor the live
// scoreboard), so the rounds are worked out from the schedule: every team plays once a round, N/2 matches make a round.
// In kick-off order, each match goes to the earliest round that is still open (not yet full) and where both of its teams
// are still missing. A postponed match played weeks later therefore lands in the round it was missing from — the round
// it belongs to, not the one of the date it was played. Limits (the schedule alone can't tell): a match brought forward
// before its round's turn counts in the earliest round both teams are free in, and two rounds played interleaved can
// swap a few matches (each team still plays once per round, so P after round N stays right). On the recorded 2026
// snapshot it is exact for the Premier League, Serie A, the Bundesliga and Ligue 1 (every team P = N after round N);
// LaLiga and the Brasileirão show their games in hand. Cancelled matches are left out.
// The table after round N is the league's own table engine (rankTable) over the matches of rounds 1..N.

import { LEAGUES } from '../../config/leagues.ts';
import type { LeagueSlug } from '../../config/season.ts';
import { leagueMatches, rankTable, type LeagueRow } from './leagueTable.ts';
import { isPlayed } from './model.ts';
import type { Match, Snapshot } from './snapshot.ts';

export interface Matchdays {
  /** the rounds in order, each its matches (kick-off order) */
  rounds: Match[][];
  /** match id → its round, 1-based */
  roundOf: Map<string, number>;
  /** the last round with a played match (0 before the season starts): the table "now" */
  latest: number;
}

/** Splits a league's matches into rounds of `members.length / 2` matches, each team once per round (see the top). */
export function matchdays(members: readonly string[], matches: readonly Match[]): Matchdays {
  const size = Math.max(1, Math.floor(members.length / 2));
  const rounds: { matches: Match[]; teams: Set<string> }[] = [];
  const roundOf = new Map<string, number>();
  const list = matches.filter((m) => m.st !== 'can').sort((a, b) => (a.t < b.t ? -1 : a.t > b.t ? 1 : a.id < b.id ? -1 : 1));
  let firstOpen = 0;
  for (const m of list) {
    let r = firstOpen;
    while (r < rounds.length && (rounds[r]!.matches.length >= size || rounds[r]!.teams.has(m.h) || rounds[r]!.teams.has(m.a))) r++;
    if (r === rounds.length) rounds.push({ matches: [], teams: new Set() });
    const round = rounds[r]!;
    round.matches.push(m);
    round.teams.add(m.h).add(m.a);
    roundOf.set(m.id, r + 1);
    while (firstOpen < rounds.length && rounds[firstOpen]!.matches.length >= size) firstOpen++;
  }
  let latest = 0;
  rounds.forEach((rd, i) => { if (rd.matches.some(isPlayed)) latest = i + 1; });
  return { rounds: rounds.map((rd) => rd.matches), roundOf, latest };
}

const cache = new WeakMap<object, Map<LeagueSlug, { members: string[]; matches: Match[]; days: Matchdays }>>();

/** A league's members, matches and matchdays (worked out once per snapshot). */
export function leagueMatchdays(snap: Pick<Snapshot, 'matches' | 'tables'>, league: LeagueSlug) {
  let byLeague = cache.get(snap);
  if (!byLeague) cache.set(snap, (byLeague = new Map()));
  const hit = byLeague.get(league);
  if (hit) return hit;
  const { members, matches } = leagueMatches(snap, league);
  const out = { members, matches, days: matchdays(members, matches) };
  byLeague.set(league, out);
  return out;
}

/**
 * The table after round `n`: the matches of rounds 1..n that are played, ranked by the league's rules; each row's
 * last 5 are its played matches of rounds 1..n and its next 3 the first three of the later rounds (by date, played or not).
 */
export function tableAfter(snap: Pick<Snapshot, 'matches' | 'tables' | 'teams'>, league: LeagueSlug, n: number): { rows: LeagueRow[]; complete: boolean } {
  const { members, matches, days } = leagueMatchdays(snap, league);
  const round = (m: Match) => days.roundOf.get(m.id) ?? Infinity;
  const upTo = matches.filter((m) => round(m) <= n);
  const t = rankTable(members, upTo, LEAGUES[league], (id) => snap.teams[id]?.name ?? id);
  const rows = t.rows.map((r) => {
    // in the order they were (or will be) played
    const mine = matches.filter((m) => (m.h === r.team || m.a === r.team) && days.roundOf.has(m.id)).sort((a, b) => (a.t < b.t ? -1 : 1));
    return { ...r, last: mine.filter((m) => round(m) <= n && isPlayed(m)).slice(-5), next: mine.filter((m) => round(m) > n).slice(0, 3) };
  });
  // the season's last round with every match played is the final table
  return { rows, complete: t.complete && n >= days.rounds.length };
}
