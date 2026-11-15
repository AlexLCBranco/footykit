// The Champions League knockout phase (PLAN.md Phase 4 step 3): the play-off round and the bracket, from ESPN's ties
// placed by league-phase position (config/ucl.ts, Art. 19, confirmed by Alex 2026-11-15):
//  - play-off sections I–IV: 9/10 v 23/24, 11/12 v 21/22, 13/14 v 19/20, 15/16 v 17/18 (a tie's section is its better-placed team's);
//  - round-of-16 ties A–D: 1/2 v winner IV, 3/4 v III, 5/6 v II, 7/8 v I (a tie's letter is its top-8 team's);
//  - each half has one A, B, C and D; quarter-finals A v D and B v C; the halves meet in the final.
// Which half a team goes to is drawn and ESPN only has fixtures, so the halves are known once the semi-finals are
// fixtured (each joins two quarter-finals); until then ties are listed by section / letter, never guessed into a half.

import { UCL_PLAYOFF_PAIRS } from '../../config/ucl.ts';
import { isPlayed } from './model.ts';
import type { Match } from './snapshot.ts';

export type KoRound = 'po' | 'r16' | 'qf' | 'sf' | 'final';
export const KO_ROUNDS: KoRound[] = ['po', 'r16', 'qf', 'sf', 'final'];

/** ESPN's stage name → round ("Knockout Round Playoffs", "Round of 16", "Quarterfinals", "Semifinals", "Final"). */
export function koRound(name: string | undefined): KoRound | undefined {
  const n = (name ?? '').toLowerCase();
  if (/knockout.*play-?off|play-?off/.test(n) && !/qualif/.test(n)) return 'po';
  if (/round of 16|last 16/.test(n)) return 'r16';
  if (/quarter/.test(n)) return 'qf';
  if (/semi/.test(n)) return 'sf';
  if (/^final$/.test(n.trim())) return 'final';
  return undefined;
}

export interface Tie {
  round: KoRound;
  /** the better-placed team in the league phase first */
  a: string;
  b: string;
  /** by kickoff */
  legs: Match[];
  /** goals over the legs played so far */
  goalsA: number;
  goalsB: number;
  pensA?: number;
  pensB?: number;
  winner?: string;
}

const SECTIONS = ['I', 'II', 'III', 'IV'] as const;
const LETTERS = ['D', 'C', 'B', 'A'] as const; // same order as UCL_PLAYOFF_PAIRS (7/8 … 1/2)
export type Section = (typeof SECTIONS)[number];
export type Letter = (typeof LETTERS)[number];

export interface PlayoffSection { id: Section; seeded: [number, number]; unseeded: [number, number]; r16: Letter; ties: Tie[] }
export interface R16Group { letter: Letter; seeded: [number, number]; from: Section; ties: Tie[] }
export interface Bracket {
  sections: PlayoffSection[];
  /** A, B, C, D */
  r16: R16Group[];
  /** with the R16 letters feeding each ("AD" / "BC") once known */
  qf: { tie: Tie; kind?: 'AD' | 'BC' }[];
  sf: Tie[];
  final?: Tie;
  /** the R16 ties and quarter-finals of each half, once the semi-finals show them */
  halves?: { r16: Tie[]; qf: Tie[]; sf: Tie }[];
}

/** Two-leg (or one-match) ties of the knockout rounds, from the competition's matches. */
export function koTies(matches: Match[], pos: (team: string) => number): Tie[] {
  const by = new Map<string, Match[]>();
  for (const m of matches) {
    const round = koRound(m.r);
    if (!round || m.st === 'can') continue;
    const k = `${round}|${[m.h, m.a].sort().join('-')}`;
    by.set(k, [...(by.get(k) ?? []), m]);
  }
  return [...by].map(([k, legs]) => {
    legs.sort((x, y) => x.t.localeCompare(y.t));
    const round = k.split('|')[0] as KoRound;
    const [x, y] = [legs[0]!.h, legs[0]!.a];
    const [a, b] = pos(x) <= pos(y) ? [x, y] : [y, x];
    const tie: Tie = { round, a, b, legs, goalsA: 0, goalsB: 0 };
    for (const m of legs) {
      if (!isPlayed(m)) continue;
      tie.goalsA += m.h === a ? m.hs! : m.as!;
      tie.goalsB += m.h === a ? m.as! : m.hs!;
      if (m.hp !== undefined && m.ap !== undefined) { tie.pensA = m.h === a ? m.hp : m.ap; tie.pensB = m.h === a ? m.ap : m.hp; }
    }
    // decided once every leg is played: goals over the legs (ESPN's aggregate fields aren't always there; the legs'
    // scores include extra time), then the shootout. No away goals.
    // every round but the final is two legs (Art. 20); a second leg not fixtured yet leaves the tie open
    if (legs.length === (round === 'final' ? 1 : 2) && legs.every(isPlayed)) {
      tie.winner = tie.goalsA > tie.goalsB ? a : tie.goalsB > tie.goalsA ? b
        : tie.pensA !== undefined && tie.pensB !== undefined && tie.pensA !== tie.pensB ? (tie.pensA > tie.pensB ? a : b) : undefined;
    }
    return tie;
  });
}

const has = (t: Tie, team: string | undefined) => !!team && (t.a === team || t.b === team);

export function uclBracket(matches: Match[], pos: (team: string) => number): Bracket {
  const ties = koTies(matches, pos);
  const of = (r: KoRound) => ties.filter((t) => t.round === r);
  const sections: PlayoffSection[] = UCL_PLAYOFF_PAIRS.map((p, i) => ({ id: SECTIONS[i]!, seeded: p.seeded, unseeded: p.unseeded, r16: LETTERS[i]!, ties: [] }));
  for (const t of of('po')) sections.find((s) => s.seeded.includes(pos(t.a)) || s.unseeded.includes(pos(t.b)))?.ties.push(t);
  const r16: R16Group[] = UCL_PLAYOFF_PAIRS.map((p, i) => ({ letter: LETTERS[i]!, seeded: p.r16, from: SECTIONS[i]!, ties: [] as Tie[] })).reverse();
  for (const t of of('r16')) r16.find((g) => g.seeded.includes(pos(t.a)))?.ties.push(t);
  const letterOf = (t: Tie) => r16.find((g) => g.ties.includes(t))?.letter;
  // a quarter-final holds one team of each tie that fed it
  const feeders = (q: Tie) => of('r16').filter((t) => has(q, t.a) || has(q, t.b));
  const qf = of('qf').map((tie) => {
    const ls = feeders(tie).map(letterOf).filter(Boolean).sort().join('');
    return { tie, kind: ls === 'AD' ? ('AD' as const) : ls === 'BC' ? ('BC' as const) : undefined };
  });
  const sf = of('sf');
  const final = of('final')[0];
  let halves: Bracket['halves'];
  if (sf.length === 2 && qf.length === 4) {
    const qIn = (s: Tie) => qf.map((q) => q.tie).filter((q) => has(s, q.a) || has(s, q.b));
    const built = sf.map((s) => {
      const qs = qIn(s).sort((x, y) => (qf.find((q) => q.tie === x)!.kind === 'AD' ? -1 : 0) - (qf.find((q) => q.tie === y)!.kind === 'AD' ? -1 : 0));
      const order: Letter[] = ['A', 'D', 'B', 'C'];
      const rs = of('r16').filter((t) => qs.some((q) => has(q, t.a) || has(q, t.b))).sort((x, y) => order.indexOf(letterOf(x)!) - order.indexOf(letterOf(y)!));
      return { r16: rs, qf: qs, sf: s };
    });
    if (built.every((h) => h.qf.length === 2 && h.r16.length === 4)) halves = built;
  }
  return { sections, r16, qf, sf, final, halves };
}
