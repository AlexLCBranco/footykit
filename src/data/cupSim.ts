// FK-30: the cups' simulator. The owner picks the winner of each tie still to play (picks only, never generated) and
// the bracket shows what follows: a picked winner counts as through, the next round lists who is in it, and a picked
// final crowns a champion. Where the next round's ties aren't fixtured, its pairings aren't known (most domestic cups
// draw each round anew), so the page lists the clubs through without pairing them: nothing is invented.

import type { CupTie } from './cups.ts';

export interface SimRound { round: string; ties: CupTie[]; /** ties not fixtured yet */ open: number }

/** A tie's key in the picks: the round and its two teams (stable across snapshots; ESPN's match ids differ per leg). */
export const tieKey = (t: Pick<CupTie, 'round' | 'a' | 'b'>) => `${t.round}|${[t.a, t.b].sort().join('-')}`;

export interface SimTie extends CupTie {
  /** the owner's pick, when the tie is still open and the pick is one of its teams */
  picked?: string;
  /** the real winner, else the pick */
  through?: string;
}

export interface CupSimView {
  rounds: { round: string; ties: SimTie[]; open: number;
    /** clubs through to this round (real or picked) whose tie in it isn't fixtured yet */ waiting: string[] }[];
  champion?: { team: string; picked: boolean };
  /** ties still open and not picked */
  left: number;
  /** picks that apply (an open tie, one of its teams) */
  used: number;
}

export function simulateCup(rounds: SimRound[], picks: Record<string, string>): CupSimView {
  let left = 0, used = 0;
  const out: CupSimView['rounds'] = [];
  let prevThrough: string[] = [];
  for (const r of rounds) {
    const ties: SimTie[] = r.ties.map((t) => {
      if (t.winner) return { ...t, through: t.winner };
      const p = picks[tieKey(t)];
      if (p === t.a || p === t.b) { used++; return { ...t, picked: p, through: p }; }
      left++;
      return { ...t };
    });
    const inRound = new Set(ties.flatMap((t) => [t.a, t.b]));
    out.push({ round: r.round, ties, open: r.open, waiting: r.open > 0 || !ties.length ? prevThrough.filter((x) => !inRound.has(x)) : [] });
    prevThrough = ties.flatMap((t) => (t.through ? [t.through] : []));
  }
  const last = out[out.length - 1];
  const final = last && last.round === 'Final' && last.ties.length === 1 ? last.ties[0]! : undefined;
  const champion = final?.through ? { team: final.through, picked: !final.winner } : undefined;
  return { rounds: out, champion, left, used };
}

/** Set (or with `team` undefined, clear) the pick of one tie. */
export function pickTie(picks: Record<string, string>, t: CupTie, team: string | undefined): Record<string, string> {
  const next = { ...picks };
  if (team) next[tieKey(t)] = team;
  else delete next[tieKey(t)];
  return next;
}

/** The picks that still mean something: an open tie of the cup, one of its teams (a real result replaces a pick). */
export function prunePicks(rounds: SimRound[], picks: Record<string, string>): Record<string, string> {
  const open = new Map(rounds.flatMap((r) => r.ties.filter((t) => !t.winner).map((t) => [tieKey(t), t] as const)));
  const kept = Object.fromEntries(Object.entries(picks).filter(([k, team]) => { const t = open.get(k); return !!t && (t.a === team || t.b === team); }));
  return Object.keys(kept).length === Object.keys(picks).length ? picks : kept;
}
