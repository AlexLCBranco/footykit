// Knockout logic: who won a tie, and whether a club is still alive in a competition. ESPN's `winner` flag on a second
// leg is the winner of that match, not of the tie (Botafogo won 1-0 at home and went out 2-6 on aggregate), so the tie
// is decided from the aggregate and shootout scores, with ESPN's own note as the last resort.

import { aggregateOf, scoreOf, shootoutOf, type EspnEvent } from './espn.ts';
import { isPhaseRound } from './rounds.ts';

export { isPhaseRound };

export type TieResult = 'won' | 'lost' | 'unknown';

export const isCompleted = (e: EspnEvent) => e.competitions[0]?.status?.type?.completed === true;
const legOf = (e: EspnEvent) => e.competitions[0]?.leg?.value;

/** Result of the tie decided in `e` for `teamId` (`e` is a single match or a second leg). */
export function tieResult(e: EspnEvent, teamId: string): TieResult {
  const c = e.competitions[0];
  if (!c || !isCompleted(e)) return 'unknown';
  const me = c.competitors.find((x) => x.team.id === teamId || x.id === teamId);
  const opp = c.competitors.find((x) => x !== me);
  if (!me || !opp) return 'unknown';
  const cmp = (a: number | undefined, b: number | undefined): TieResult | undefined =>
    a === undefined || b === undefined || a === b ? undefined : a > b ? 'won' : 'lost';
  const twoLeg = (legOf(e) ?? 0) >= 2;
  const main = twoLeg ? cmp(aggregateOf(me), aggregateOf(opp)) : cmp(scoreOf(me), scoreOf(opp));
  const decided = main ?? cmp(shootoutOf(me), shootoutOf(opp));
  if (decided) return decided;
  // ESPN's ingest note names the club that went through ("Vitória advances.", "Estudiantes de La Plata wins.")
  const said = (c.notes ?? []).map((n) => n.text ?? n.headline ?? '').join(' ');
  const name = (x: typeof me) => x.team.displayName ?? '';
  const says = (x: typeof me) => !!name(x) && new RegExp(`${escape(name(x))} (wins|advances|win|advance)\\b`).test(said);
  if (says(me) && !says(opp)) return 'won';
  if (says(opp) && !says(me)) return 'lost';
  return 'unknown';
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export type CompetitionState =
  | { state: 'next-fixture'; date: string; round?: string } // a match still to play
  | { state: 'awaiting-draw'; lastRound?: string } // won its last tie, next round not fixtured yet
  | { state: 'eliminated'; round?: string; date: string }
  | { state: 'champion' }
  | { state: 'phase-over'; round?: string } // last match was a group / league-phase match: standings decide
  | { state: 'unknown'; why: string };

/** Where a club stands in one competition, from its own matches in it. */
export function competitionState(events: EspnEvent[], teamId: string): CompetitionState {
  const sorted = [...events].sort((a, b) => a.date.localeCompare(b.date));
  const next = sorted.find((e) => !isCompleted(e) && !/POSTPONED|CANCELED/.test(e.competitions[0]?.status?.type?.name ?? ''));
  if (next) return { state: 'next-fixture', date: next.date, round: next.seasonType?.name };
  const last = [...sorted].reverse().find(isCompleted);
  if (!last) return { state: 'unknown', why: 'no completed or upcoming match' };
  const round = last.seasonType?.name;
  if (isPhaseRound(round) && legOf(last) === undefined) return { state: 'phase-over', round };
  if (legOf(last) === 1) return { state: 'unknown', why: `first leg of ${round ?? 'a tie'} played, no second leg listed` };
  const r = tieResult(last, teamId);
  if (r === 'lost') return { state: 'eliminated', round, date: last.date };
  if (r === 'won') return /^final$/i.test(round ?? '') ? { state: 'champion' } : { state: 'awaiting-draw', lastRound: round };
  return { state: 'unknown', why: `could not tell who won the ${round ?? ''} tie on ${last.date.slice(0, 10)}` };
}
