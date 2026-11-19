// FK-46: what a match's competition icon says on hover: the competition and where in it the match is. A league match:
// its round, worked out from the schedule (FK-43; ESPN gives none), with "~" where those rounds are a best guess
// ("Brasileirão · ~Round 35"). A cup or continental match: ESPN's stage in plain words and the leg ("Copa do Brasil ·
// Semi-final, 1st leg"). Pure; the rounds are worked out once per snapshot.

import { compInfo } from '../../config/competitions.ts';
import { APPROX_ROUNDS, matchdays, type Matchdays } from './leagueRounds.ts';
import type { Match, Snapshot } from './snapshot.ts';

/** ESPN's stage names (plural, title case) as one tie's stage. Any other name is shown as ESPN gives it. */
const STAGES: Record<string, string> = {
  Final: 'Final',
  Finals: 'Final',
  Semifinals: 'Semi-final',
  Quarterfinals: 'Quarter-final',
  'Round of 16': 'Round of 16',
  'Round of 32': 'Round of 32',
  'Knockout Round Playoffs': 'Knockout play-off',
  'Playoff Round': 'Play-off round',
  Playoffs: 'Play-offs',
  'League Phase': 'League phase',
  'Group Stage': 'Group stage',
  'Regular Season': 'Regular season',
  'Qualifying Round': 'Qualifying round',
  'Preliminary Round': 'Preliminary round',
  'First Round': 'First round',
  'Second Round': 'Second round',
  'Third Round': 'Third round',
  'Fourth Round': 'Fourth round',
  'Fifth Round': 'Fifth round',
  'Sixth Round': 'Sixth round',
  'First Stage': 'First stage',
  'Second Stage': 'Second stage',
  'Third Stage': 'Third stage',
};

const LEG = ['', '1st', '2nd', '3rd'];

/** "Semi-final, 1st leg"; undefined when ESPN gives no stage. Parts after " - " are mapped one by one. */
export function stageText(r: string | undefined, leg?: number): string | undefined {
  if (!r) return leg ? `${LEG[leg] ?? `${leg}th`} leg` : undefined;
  const stage = r.split(' - ').map((p) => STAGES[p] ?? p).join(' – ');
  return leg ? `${stage}, ${LEG[leg] ?? `${leg}th`} leg` : stage;
}

const cache = new WeakMap<object, Map<string, Matchdays>>();

/** A league match's round (1-based) and whether that league's rounds are a best guess. */
export function leagueRound(snap: Pick<Snapshot, 'matches' | 'tables'>, m: Match): { n: number; approx: boolean } | undefined {
  if (compInfo(m.c).kind !== 'league') return undefined;
  let byLeague = cache.get(snap);
  if (!byLeague) cache.set(snap, (byLeague = new Map()));
  let days = byLeague.get(m.c);
  if (!days) {
    // the league's members from its table, its matches among them (leagueTable.ts's leagueMatches, without the rules)
    const members = (snap.tables[m.c]?.[0]?.rows ?? []).map((r) => r.team);
    const inLeague = new Set(members);
    days = matchdays(members, snap.matches.filter((x) => x.c === m.c && inLeague.has(x.h) && inLeague.has(x.a)));
    byLeague.set(m.c, days);
  }
  const n = days.roundOf.get(m.id);
  return n ? { n, approx: APPROX_ROUNDS.includes(m.c) } : undefined;
}

/** "Premier League · Round 12", "Brasileirão · ~Round 35", "Copa do Brasil · Semi-final, 1st leg", or just the name. */
export function compLabel(snap: Pick<Snapshot, 'matches' | 'tables'>, m: Match, name: string): string {
  const round = leagueRound(snap, m);
  const where = round ? `${round.approx ? '~' : ''}Round ${round.n}` : stageText(m.r, m.leg);
  return where ? `${name} · ${where}` : name;
}
