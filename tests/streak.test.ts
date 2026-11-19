// FK-50: the result streak (W / D / L in a row, all competitions; a shootout counts as a draw), at a played match
// (through it) and at a match to come (going into it: the current streak).

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildModel, isPlayed } from '../src/data/model';
import type { Match, Snapshot } from '../src/data/snapshot';
import { streakAt, streakGames } from '../src/data/streak';

const fixture = readFileSync(join(import.meta.dirname, 'fixtures/snapshot.json'), 'utf8');
const TEAM = '382'; // Man City

/** The fixture with Man City's last played matches (oldest first) given these results ('Dp': a draw won / lost on pens). */
function withResults(results: ('W' | 'D' | 'L' | 'Dp')[]) {
  const snap = JSON.parse(fixture) as Snapshot;
  const mine = snap.matches.filter((m) => (m.h === TEAM || m.a === TEAM)).sort((a, b) => a.t.localeCompare(b.t));
  const played = mine.filter(isPlayed);
  const last = played.slice(-results.length);
  last.forEach((m, i) => {
    const r = results[i]!;
    const [mine_, theirs] = r === 'W' ? [2, 0] : r === 'L' ? [0, 1] : [1, 1];
    if (m.h === TEAM) { m.hs = mine_; m.as = theirs; } else { m.as = mine_; m.hs = theirs; }
    delete m.hp; delete m.ap; delete m.ha; delete m.aa;
    if (r === 'Dp') { m.hp = 4; m.ap = 3; }
  });
  const model = buildModel(snap, 'America/Sao_Paulo');
  const find = (m: Match) => model.snap.matches.find((x) => x.id === m.id)!;
  return { model, last: last.map(find), next: find(mine.find((m) => !isPlayed(m))!) };
}

describe('streakGames / streakAt (FK-50)', () => {
  it('W3: three wins in a row, newest first; the draw before breaks it', () => {
    const { model, last } = withResults(['D', 'W', 'W', 'W']);
    expect(streakAt(model, TEAM)).toEqual({ kind: 'W', n: 3 });
    const g = streakGames(model, TEAM);
    expect(g.map((x) => x.m.id)).toEqual(last.slice(1).reverse().map((m) => m.id));
    expect(g.every((x) => x.r === 'W' && x.gf === 2 && x.ga === 0)).toBe(true);
  });
  it('a draw breaks a win streak: D1', () => {
    const { model } = withResults(['W', 'W', 'D']);
    expect(streakAt(model, TEAM)).toEqual({ kind: 'D', n: 1 });
  });
  it('L2 after wins', () => {
    const { model } = withResults(['W', 'L', 'L']);
    expect(streakAt(model, TEAM)).toEqual({ kind: 'L', n: 2 });
  });
  it('a match decided on penalties counts as a draw, marked pens', () => {
    const { model } = withResults(['W', 'D', 'Dp']);
    expect(streakAt(model, TEAM)).toEqual({ kind: 'D', n: 2 });
    expect(streakGames(model, TEAM).map((g) => g.pens)).toEqual([true, false]);
  });
  it('a played match shows the streak through it; the next match the current streak', () => {
    const { model, last, next } = withResults(['L', 'W', 'W', 'D']);
    expect(streakAt(model, TEAM, last[3])).toEqual({ kind: 'D', n: 1 }); // through the draw
    expect(streakAt(model, TEAM, last[2])).toEqual({ kind: 'W', n: 2 }); // through the 2nd win
    expect(streakAt(model, TEAM, last[1])).toEqual({ kind: 'W', n: 1 });
    expect(streakAt(model, TEAM, next)).toEqual(streakAt(model, TEAM)); // going in = current
    expect(streakAt(model, TEAM, next)).toEqual({ kind: 'D', n: 1 });
  });
});
