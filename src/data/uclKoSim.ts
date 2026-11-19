// FK-56: the Champions League simulator's knockout phase — the play-offs (9th–24th), then the round of 16 to the final —
// built from a frozen league-phase order (the table as it stood when "Start knockouts from current standings" was
// pressed) and picked tie by tie. UEFA fixes the sections by position (config/ucl.ts UCL_PLAYOFF_PAIRS, Art. 19) but
// DRAWS three things in each one; the owner chose (2026-11-19) a swap per section for each, starting from one rule:
//   pairing  — off: 9 v 24 and 10 v 23 (seeded[0] v unseeded[1], seeded[1] v unseeded[0]); on: 9 v 23 and 10 v 24
//   r16      — off: the seeded[0] tie's winner meets r16[1] (8th), the other r16[0] (7th); on: the other way round
//   half     — off: r16[0]'s tie in the top half; on: in the bottom half
// Each half has one round-of-16 tie of each letter; quarter-finals A v D and B v C in each half, then the semis and the
// final (the UCL page's knockout note). A pick is the team sent through; one no longer in its tie (a swap or a new
// order moved it) is ignored, so everything after it waits again.

import { UCL_PLAYOFF_PAIRS } from '../../config/ucl.ts';
import { blocks, type Block } from './whatif.ts';

export type Letter = Block['letter'];
export interface Draw { pairing?: boolean; r16?: boolean; half?: boolean }
export interface KoSim {
  /** team ids by league-phase position (index 0 = 1st), frozen when the knockouts were started */
  order: string[];
  /** each section's drawn choices (absent = the rule above) */
  draws?: Partial<Record<Letter, Draw>>;
  /** tie key → the team picked through */
  picks?: Record<string, string>;
}

export interface KoTie {
  key: string;
  round: 'po' | 'r16' | 'qf' | 'sf' | 'final';
  letter?: Letter;
  /** the two sides; undefined = waiting for an earlier tie */
  a?: string;
  b?: string;
  /** league positions of the sides (play-offs and the seeded round-of-16 sides) */
  posA?: number;
  posB?: number;
  winner?: string;
}

export interface KoBracket { po: KoTie[]; r16: KoTie[]; qf: KoTie[]; sf: KoTie[]; final: KoTie; champion?: string }

/** The four sections A–D (a function: whatif.ts imports this module too, so nothing runs at load). */
export const koBlocks = () => blocks(UCL_PLAYOFF_PAIRS);

/** The play-off pairings of one section under its draw, as [seeded, unseeded] positions, tie 1 first. */
export function playoffPairs(b: Block, d: Draw = {}): [[number, number], [number, number]] {
  const [s0, s1] = b.seeded, [u0, u1] = b.unseeded;
  return d.pairing ? [[s0, u0], [s1, u1]] : [[s0, u1], [s1, u0]];
}

export function koBracket(ko: KoSim): KoBracket {
  const team = (p: number) => ko.order[p - 1];
  const picks = ko.picks ?? {};
  const decide = (t: KoTie): KoTie => {
    const p = picks[t.key];
    return t.a && t.b && (p === t.a || p === t.b) ? { ...t, winner: p } : t;
  };
  const po: KoTie[] = [];
  const r16: KoTie[] = [];
  const top = new Map<Letter, KoTie>(), bottom = new Map<Letter, KoTie>();
  for (const b of koBlocks()) {
    const d = ko.draws?.[b.letter] ?? {};
    const ties = playoffPairs(b, d).map(([s, u], i) => decide({ key: `po-${b.letter}${i + 1}`, round: 'po', letter: b.letter, a: team(u), b: team(s), posA: u, posB: s }));
    po.push(...ties);
    // which seed each play-off winner meets
    const [forR0, forR1] = d.r16 ? [ties[0]!, ties[1]!] : [ties[1]!, ties[0]!];
    const t0 = decide({ key: `r16-${b.letter}1`, round: 'r16', letter: b.letter, a: forR0.winner, b: team(b.r16[0]), posB: b.r16[0] });
    const t1 = decide({ key: `r16-${b.letter}2`, round: 'r16', letter: b.letter, a: forR1.winner, b: team(b.r16[1]), posB: b.r16[1] });
    r16.push(t0, t1);
    top.set(b.letter, d.half ? t1 : t0);
    bottom.set(b.letter, d.half ? t0 : t1);
  }
  const qf: KoTie[] = [];
  for (const [half, h] of [['t', top], ['b', bottom]] as const) {
    for (const [x, y] of [['A', 'D'], ['B', 'C']] as const) {
      qf.push(decide({ key: `qf-${half}${x}${y}`, round: 'qf', a: h.get(x)!.winner, b: h.get(y)!.winner }));
    }
  }
  const sf = [decide({ key: 'sf-t', round: 'sf', a: qf[0]!.winner, b: qf[1]!.winner }), decide({ key: 'sf-b', round: 'sf', a: qf[2]!.winner, b: qf[3]!.winner })];
  const final = decide({ key: 'final', round: 'final', a: sf[0]!.winner, b: sf[1]!.winner });
  return { po, r16, qf, sf, final, champion: final.winner };
}

/** Pick `team` through tie `key` (the same team again clears it). */
export function pickKo(ko: KoSim, key: string, team: string): KoSim {
  const picks = { ...ko.picks };
  if (picks[key] === team) delete picks[key];
  else picks[key] = team;
  return { ...ko, picks };
}

/** Flip one of a section's drawn choices. */
export function swapDraw(ko: KoSim, letter: Letter, what: keyof Draw): KoSim {
  const d = { ...ko.draws?.[letter] };
  if (d[what]) delete d[what];
  else d[what] = true;
  const draws = { ...ko.draws, [letter]: d };
  return { ...ko, draws };
}

/** A stored knockout state, checked (localStorage is never trusted). */
export function readKo(x: unknown): KoSim | undefined {
  const k = x as KoSim | null;
  if (!k || typeof k !== 'object' || !Array.isArray(k.order) || k.order.length < 24 || !k.order.every((t) => typeof t === 'string')) return undefined;
  const picks = Object.fromEntries(Object.entries(k.picks && typeof k.picks === 'object' ? k.picks : {}).filter(([, t]) => typeof t === 'string'));
  const draws: Partial<Record<Letter, Draw>> = {};
  for (const l of ['A', 'B', 'C', 'D'] as const) {
    const d = k.draws?.[l];
    if (d && typeof d === 'object') draws[l] = { ...(d.pairing === true ? { pairing: true } : {}), ...(d.r16 === true ? { r16: true } : {}), ...(d.half === true ? { half: true } : {}) };
  }
  return { order: [...k.order], draws, picks };
}
