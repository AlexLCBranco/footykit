// FK-30: the cups' simulator — picks only, a pick sends a team through, the next round lists who is in it without
// pairing them where the ties aren't fixtured, a picked final names the champion, real results replace picks.

import { describe, expect, it } from 'vitest';
import { pickTie, prunePicks, simulateCup, tieKey, type SimRound } from '../src/data/cupSim';
import type { CupTie } from '../src/data/cups';

const tie = (round: string, a: string, b: string, winner?: string): CupTie => ({ round, a, b, legs: [], goalsA: 0, goalsB: 0, ...(winner ? { winner } : {}) });
const rounds: SimRound[] = [
  { round: 'Quarterfinals', ties: [tie('Quarterfinals', 'A', 'B', 'A'), tie('Quarterfinals', 'C', 'D'), tie('Quarterfinals', 'E', 'F'), tie('Quarterfinals', 'G', 'H')], open: 0 },
  { round: 'Semifinals', ties: [], open: 2 },
  { round: 'Final', ties: [], open: 1 },
];

describe('cup simulator', () => {
  it('no picks: nothing generated, open ties left to pick', () => {
    const v = simulateCup(rounds, {});
    expect(v.left).toBe(3);
    expect(v.used).toBe(0);
    expect(v.rounds[1]!.waiting).toEqual(['A']); // only the real winner is through
    expect(v.champion).toBeUndefined();
  });
  it('a pick sends its team through to the next round, unpaired while that round is not fixtured', () => {
    let picks = pickTie({}, rounds[0]!.ties[1]!, 'D');
    picks = pickTie(picks, rounds[0]!.ties[2]!, 'E');
    const v = simulateCup(rounds, picks);
    expect(v.rounds[0]!.ties[1]!.picked).toBe('D');
    expect(v.rounds[0]!.ties[1]!.through).toBe('D');
    expect(v.rounds[1]!.waiting).toEqual(['A', 'D', 'E']);
    expect(v.left).toBe(1);
    expect(v.used).toBe(2);
    // clearing a pick
    expect(pickTie(picks, rounds[0]!.ties[1]!, undefined)).toEqual({ [tieKey(rounds[0]!.ties[2]!)]: 'E' });
  });
  it('a pick for a decided tie or a team not in the tie is ignored and pruned', () => {
    const picks = { [tieKey(rounds[0]!.ties[0]!)]: 'B', [tieKey(rounds[0]!.ties[1]!)]: 'Z', [tieKey(rounds[0]!.ties[3]!)]: 'H' };
    const v = simulateCup(rounds, picks);
    expect(v.rounds[0]!.ties[0]!.through).toBe('A');
    expect(v.rounds[0]!.ties[1]!.picked).toBeUndefined();
    expect(prunePicks(rounds, picks)).toEqual({ [tieKey(rounds[0]!.ties[3]!)]: 'H' });
    const clean = { [tieKey(rounds[0]!.ties[3]!)]: 'H' };
    expect(prunePicks(rounds, clean)).toBe(clean); // unchanged: same object
  });
  it('a fixtured final: its pick names the champion; a real final names the real one', () => {
    const r: SimRound[] = [{ round: 'Semifinals', ties: [tie('Semifinals', 'A', 'B', 'A'), tie('Semifinals', 'C', 'D', 'D')], open: 0 }, { round: 'Final', ties: [tie('Final', 'A', 'D')], open: 0 }];
    expect(simulateCup(r, {}).champion).toBeUndefined();
    expect(simulateCup(r, { [tieKey(r[1]!.ties[0]!)]: 'D' }).champion).toEqual({ team: 'D', picked: true });
    expect(simulateCup(r, {}).rounds[1]!.waiting).toEqual([]); // both finalists are in the fixtured final
    const played: SimRound[] = [r[0]!, { round: 'Final', ties: [tie('Final', 'A', 'D', 'A')], open: 0 }];
    expect(simulateCup(played, { [tieKey(r[1]!.ties[0]!)]: 'D' }).champion).toEqual({ team: 'A', picked: false });
  });
  it('a tie key ignores which side is home', () => {
    expect(tieKey(tie('Final', 'A', 'D'))).toBe(tieKey(tie('Final', 'D', 'A')));
  });
});
