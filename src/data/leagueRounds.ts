// FK-43: a league's matchdays (rounds), worked out from the schedule (its own file, without the league rules, so the
// main chunk can label a match's round, FK-46; the table after round N is in matchdays.ts). ESPN's feeds give no round number for
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

import { isPlayed } from './model.ts';
import type { Match } from './snapshot.ts';

/** FK-46: the leagues whose worked-out rounds are a best guess (many moved matches; see above): their labels say "~". */
export const APPROX_ROUNDS: readonly string[] = ['esp.1', 'bra.1'];

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
