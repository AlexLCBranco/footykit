// Competitions a club is still alive in going into a match (the "1C / 2C / 3C" tag): a league match just before a big
// cup match is likely a filler with rotated players. Worked out from the snapshot's matches only (no draw is
// guessed): a competition counts from the club's first scheduled match in it, so a cup the club enters later (the FA
// Cup's third round in January) counts once its tie is fixtured.
//
// At match `m` (going in), competition `c` is:
// - alive when the club has a match in `c` at or after `m`'s kickoff (`m` itself included);
// - over when nobody has a match in `c` from then on (the competition is finished or between editions);
// - else, from the club's last match in `c`: a league is over; a group / league phase is decided by ESPN's table
//   note (eliminated, or sent to another competition, is out); a knockout tie it won is alive (awaiting the next
//   round), one it lost is out. A tie whose winner the scores can't tell is "unknown", never guessed.

import { compInfo } from '../../config/competitions.ts';
import { isPlayed, shortDay, type Model } from './model.ts';
import { isPhaseRound } from './rounds.ts';
import type { Match } from './snapshot.ts';

export type CompStatus = 'alive' | 'out' | 'unknown';

export interface CompAlive {
  comp: string;
  status: CompStatus;
  /** why, for the hover ("next: Nov 25, Semifinals", "awaiting the draw", "won the Semifinals tie") */
  why: string;
}

const counted = (m: Match) => m.st !== 'can' && m.st !== 'ppd';

/** Who won the tie decided in `m`: aggregate for a second leg, else the score, then the shootout. */
export function tieWinner(m: Match): string | undefined {
  if (!isPlayed(m) || m.leg === 1) return undefined;
  const cmp = (h?: number, a?: number) => (h === undefined || a === undefined || h === a ? undefined : h > a ? m.h : m.a);
  const main = m.leg === 2 ? cmp(m.ha, m.aa) : cmp(m.hs, m.as);
  return main ?? cmp(m.hp, m.ap);
}

/** Last kickoff of each competition in the snapshot (any teams). */
const lastKick = new WeakMap<Model, Map<string, string>>();
function lastKickoff(model: Model, comp: string): string | undefined {
  let map = lastKick.get(model);
  if (!map) {
    map = new Map();
    for (const m of model.snap.matches) if (counted(m) && (map.get(m.c) ?? '') < m.t) map.set(m.c, m.t);
    lastKick.set(model, map);
  }
  return map.get(comp);
}

/** A group / league-phase finish, from ESPN's table note for the club. */
function phaseFinish(model: Model, comp: string, teamId: string): CompAlive {
  const row = (model.snap.tables[comp] ?? []).flatMap((t) => t.rows).find((r) => r.team === teamId);
  if (!row) return { comp, status: 'unknown', why: 'phase over, no table to tell' };
  const zone = row.zone ?? '';
  const sentElsewhere = comp === 'conmebol.libertadores' && /sudamericana/i.test(zone);
  if (!zone || /eliminat/i.test(zone) || sentElsewhere) return { comp, status: 'out', why: `out in the ${compPhase(row.rank)}${zone ? ` (${zone})` : ''}` };
  return { comp, status: 'alive', why: zone };
}
const compPhase = (rank: number) => `group / league phase, ${rank}${rank === 1 ? 'st' : rank === 2 ? 'nd' : rank === 3 ? 'rd' : 'th'}`;

export function competitionsAlive(model: Model, teamId: string, m: Match): CompAlive[] {
  const mine = (model.byTeam.get(teamId) ?? []).filter(counted);
  const comps = [...new Set(mine.map((x) => x.c))];
  const out: CompAlive[] = [];
  for (const c of comps) {
    const inC = mine.filter((x) => x.c === c);
    const next = inC.find((x) => x.t >= m.t);
    if (next) {
      out.push({ comp: c, status: 'alive', why: next.id === m.id ? 'this match' : `next: ${shortDay(model.dayOf(next))}${next.r ? `, ${next.r}` : ''}` });
      continue;
    }
    if ((lastKickoff(model, c) ?? '') < m.t) {
      out.push({ comp: c, status: 'out', why: 'finished' });
      continue;
    }
    const last = inC[inC.length - 1]!;
    if (compInfo(c).kind === 'league') out.push({ comp: c, status: 'out', why: 'season over' });
    else if (isPhaseRound(last.r) && last.leg === undefined) out.push(phaseFinish(model, c, teamId));
    else {
      const w = tieWinner(last);
      const round = last.r ? `the ${last.r} tie` : 'its last tie';
      if (!isPlayed(last)) out.push({ comp: c, status: 'unknown', why: `${round} isn't played yet` });
      else if (w === undefined) out.push({ comp: c, status: 'unknown', why: `can't tell who won ${round}` });
      else if (w === teamId) out.push({ comp: c, status: 'alive', why: `won ${round}, next round not fixtured yet` });
      else out.push({ comp: c, status: 'out', why: `lost ${round}` });
    }
  }
  return out;
}
