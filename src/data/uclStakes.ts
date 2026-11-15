// UCL stakes chips (PLAN.md Phase 4 step 2): what a team's next league-phase match can settle — a place in the top 8
// (round of 16) or the top 24 (knockout play-offs) — and what is settled already. Points only (Alex, 2026-11-15):
// calendarkit enumerates every outcome, but a UCL matchday has 18 matches (3^18 outcomes), so this uses sure bounds.
// A claim is made only when it holds whatever else happens, goal difference included:
//  - secured: fewer than K other teams can still reach the team's lowest possible points (a team that could finish
//    level counts as a threat: the tiebreakers might favour it);
//  - lost: at least K other teams already have more points than the team's highest possible.
// Each other team's range is its points now plus 0 … 3 per match left, except the next opponent, whose result in this
// match follows from the team's. Pairs of other teams meeting each other aren't linked, so a claim can be missed (most
// often early on) but never wrong; tests/ucl-stakes.test.ts checks every claim against simulated completions.

import { remaining, type UclRow, type UclSlot, type UclTable } from './ucl.ts';

export type Outcome = 'W' | 'D' | 'L';
export type Target = 8 | 24;
export const TARGETS: Target[] = [8, 24];
const PTS: Record<Outcome, number> = { W: 3, D: 1, L: 0 };
const OPP: Record<Outcome, Outcome> = { W: 'L', D: 'D', L: 'W' };

export interface Chip {
  kind: 'in' | 'out' | 'need' | 'risk';
  text: string;
  tip: string;
}

interface Range { min: number; max: number }

function rangeOf(r: UclRow, fixed?: { slot: UclSlot; res: Outcome }): Range {
  const left = remaining(r).length;
  if (!fixed) return { min: r.pts, max: r.pts + 3 * left };
  return { min: r.pts + PTS[fixed.res], max: r.pts + PTS[fixed.res] + 3 * (left - 1) };
}

/** For `team`: secured / lost for target K with its next match's result `res` (or as things stand: `res` undefined). */
export function verdict(table: UclTable, team: string, k: Target, res?: Outcome): { secured: boolean; lost: boolean } {
  const me = table.rows.find((r) => r.team === team)!;
  const next = remaining(me)[0];
  const mine = res && next ? rangeOf(me, { slot: next, res }) : rangeOf(me);
  let threats = 0, above = 0;
  for (const r of table.rows) {
    if (r.team === team) continue;
    const theirs = res && next && r.team === next.opp ? rangeOf(r, { slot: remaining(r).find((s) => s.m.id === next.m.id)!, res: OPP[res] }) : rangeOf(r);
    if (theirs.max >= mine.min) threats++;
    if (theirs.min > mine.max) above++;
  }
  return { secured: threats < k, lost: above >= k };
}

const NAME: Record<Target, { in: string; out: string; place: string }> = {
  8: { in: 'Top 8 ✓', out: 'No top 8', place: 'a top-8 place (round of 16)' },
  24: { in: 'Top 24 ✓', out: 'Out', place: 'a top-24 place (knockout play-offs)' },
};
const OUTCOME_TEXT: Record<Outcome, string> = { W: 'Win', D: 'Draw', L: 'Loss' };

/**
 * A team's chips: what is settled already, then what its next match settles — the weakest result that secures a place
 * ("Draw = top 8": a win or a draw is enough) and the best result that still loses it ("Draw = out": it must win).
 * `against`: the next opponent's name, for the tooltips.
 */
export function stakeChips(table: UclTable, team: string, against = 'the next opponent'): Chip[] {
  const chips: Chip[] = [];
  const left = remaining(table.rows.find((r) => r.team === team)!).length;
  for (const k of TARGETS) {
    const now = verdict(table, team, k);
    if (now.secured) { chips.push({ kind: 'in', text: NAME[k].in, tip: `Sure of ${NAME[k].place}, whatever else happens` }); break; }
    // out of the top 8 goes without saying for most of the table: only "Out" (of the top 24) is shown
    if (now.lost) { if (k === 24) chips.push({ kind: 'out', text: NAME[k].out, tip: `Can no longer reach ${NAME[k].place}` }); continue; }
    if (!left) continue;
    const by = Object.fromEntries((['W', 'D', 'L'] as const).map((o) => [o, verdict(table, team, k, o)])) as Record<Outcome, { secured: boolean; lost: boolean }>;
    // a loss that secures it, or a win that loses it, would already be settled now (same bounds): only these two are left
    const enough = (['D', 'W'] as const).find((o) => by[o].secured);
    if (enough) {
      chips.push({ kind: 'need', text: `${OUTCOME_TEXT[enough]} = ${k === 8 ? 'top 8' : 'top 24'}`, tip: `${enough === 'W' ? 'A win' : 'A draw or a win'} against ${against} secures ${NAME[k].place}, whatever else happens` });
    }
    const fatal = (['D', 'L'] as const).find((o) => by[o].lost);
    if (fatal) {
      const word = k === 8 ? 'no top 8' : 'out';
      chips.push({ kind: 'risk', text: `${OUTCOME_TEXT[fatal]} = ${word}`, tip: `${fatal === 'L' ? 'A loss' : 'A draw or a loss'} against ${against} ends its chance of ${NAME[k].place}${fatal === 'D' ? ': it must win' : ''}` });
    }
  }
  return chips;
}
