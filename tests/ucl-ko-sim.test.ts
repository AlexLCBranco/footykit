// FK-56: the UCL simulator's knockout phase: play-off pairs from UCL_PLAYOFF_PAIRS, winners into the right round-of-16
// slots, the per-section draw swaps (pairing, which seed, which half), picks that fall away when a swap moves a team.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { UCL_PLAYOFF_PAIRS } from '../config/ucl';
import { buildModel } from '../src/data/model';
import type { Snapshot } from '../src/data/snapshot';
import { uclTable } from '../src/data/ucl';
import { koBracket, pickKo, playoffPairs, readKo, swapDraw, type KoSim } from '../src/data/uclKoSim';
import { koBlocks } from '../src/data/uclKoSim';
import { prune, readStore } from '../src/data/whatif';

/** Teams named by their position: "p1" … "p36". */
const order = Array.from({ length: 36 }, (_, i) => `p${i + 1}`);
const base: KoSim = { order };
const at = (t?: string) => (t ? Number(t.slice(1)) : undefined);

describe('koBracket (FK-56)', () => {
  it('play-offs: positions 9–24 only, in UCL_PLAYOFF_PAIRS sections, 9 v 24 and 10 v 23 by default', () => {
    const b = koBracket(base);
    expect(b.po).toHaveLength(8);
    const all = b.po.flatMap((t) => [at(t.a)!, at(t.b)!]).sort((x, y) => x - y);
    expect(all).toEqual(Array.from({ length: 16 }, (_, i) => i + 9));
    for (const p of UCL_PLAYOFF_PAIRS) {
      const ties = b.po.filter((t) => p.seeded.includes(at(t.b)!));
      expect(ties).toHaveLength(2);
      for (const t of ties) expect(p.unseeded).toContain(at(t.a)); // seeded pair v its unseeded pair
    }
    const d = b.po.filter((t) => t.letter === 'D').map((t) => [at(t.b), at(t.a)]);
    expect(d).toEqual([[9, 24], [10, 23]]);
    // the seeded side (9th–16th) is listed second: it hosts the second leg
    expect(b.po.every((t) => at(t.b)! <= 16)).toBe(true);
    // 1st–8th wait in the round of 16
    expect(b.r16.map((t) => at(t.b)).sort((x, y) => x! - y!)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(b.r16.every((t) => t.a === undefined)).toBe(true);
  });

  it('a play-off winner lands in the round-of-16 slot it feeds (9 v 24 → 8th, 10 v 23 → 7th; swapped: the other way)', () => {
    let k = pickKo(base, 'po-D1', 'p24'); // 24th beats 9th
    k = pickKo(k, 'po-D2', 'p10');
    let b = koBracket(k);
    const vs = (seed: number) => b.r16.find((t) => at(t.b) === seed)!.a;
    expect(vs(8)).toBe('p24');
    expect(vs(7)).toBe('p10');
    b = koBracket(swapDraw(k, 'D', 'r16'));
    expect(vs(7)).toBe('p24');
    expect(vs(8)).toBe('p10');
    // every section feeds its own pair: section of 15/16 v 17/18 → 1st / 2nd
    const a = koBracket(pickKo(pickKo(base, 'po-A1', 'p15'), 'po-A2', 'p17'));
    expect(a.r16.filter((t) => t.letter === 'A').map((t) => [at(t.b), at(t.a)])).toEqual([[1, 17], [2, 15]]);
  });

  it('the pairing swap: 9 v 23 and 10 v 24; a pick no longer in its tie is dropped (and what followed waits)', () => {
    const blockD = koBlocks().find((b) => b.letter === 'D')!;
    expect(playoffPairs(blockD, { pairing: true })).toEqual([[9, 23], [10, 24]]);
    let k = pickKo(base, 'po-D1', 'p24');
    k = pickKo(k, 'r16-D2', 'p24'); // 24th then beats 8th
    expect(koBracket(k).r16.find((t) => t.key === 'r16-D2')!.winner).toBe('p24');
    const swapped = koBracket(swapDraw(k, 'D', 'pairing'));
    expect(swapped.po.find((t) => t.key === 'po-D1')!.winner).toBeUndefined(); // 24th now plays 10th, in tie 2
    expect(swapped.r16.find((t) => t.key === 'r16-D2')!.a).toBeUndefined();
    expect(swapped.r16.find((t) => t.key === 'r16-D2')!.winner).toBeUndefined();
  });

  it('quarter-finals A v D and B v C in each half; the half swap moves a tie to the other half; on to the champion', () => {
    // every play-off and round-of-16 tie won by the better-placed side
    let k = base;
    for (let pass = 0; pass < 5; pass++) {
      const b = koBracket(k);
      for (const t of [...b.po, ...b.r16, ...b.qf, ...b.sf, b.final]) {
        if (t.a && t.b && !t.winner) k = pickKo(k, t.key, at(t.a)! < at(t.b)! ? t.a : t.b);
      }
    }
    const b = koBracket(k);
    expect(b.qf.map((t) => [at(t.a), at(t.b)])).toEqual([[1, 7], [3, 5], [2, 8], [4, 6]]);
    expect(b.sf.map((t) => [at(t.a), at(t.b)])).toEqual([[1, 3], [2, 4]]);
    expect(b.champion).toBe('p1');
    // the half swap of section A puts 1st in the bottom half (vs 8th then 2nd's side)
    const h = koBracket(swapDraw(k, 'A', 'half'));
    expect(h.qf.find((t) => t.a === 'p2' || t.b === 'p2')!.key.startsWith('qf-t')).toBe(true);
    expect(h.qf.find((t) => t.a === 'p1' || t.b === 'p1')!.key.startsWith('qf-b')).toBe(true);
  });

  it('a click on the picked team again clears it', () => {
    const k = pickKo(pickKo(base, 'po-D1', 'p9'), 'po-D1', 'p9');
    expect(koBracket(k).po[0]!.winner).toBeUndefined();
  });

  it('"start from current standings" takes the current table\'s order; the state survives storage and pruning', () => {
    const snap = JSON.parse(readFileSync(join(import.meta.dirname, 'fixtures/snapshot.json'), 'utf8')) as Snapshot;
    const model = buildModel(snap, 'America/Sao_Paulo');
    const table = uclTable(model.snap, (id) => model.team(id).name);
    const k: KoSim = { order: table.rows.map((r) => r.team) };
    const b = koBracket(k);
    expect(b.r16.find((t) => t.posB === 1)!.b).toBe(table.rows[0]!.team);
    expect(b.po.find((t) => t.posB === 9)!.b).toBe(table.rows[8]!.team);
    const stored = swapDraw(pickKo(k, 'po-D1', b.po[0]!.b!), 'C', 'half');
    expect(readKo(JSON.parse(JSON.stringify(stored)))).toEqual(stored);
    expect(readKo({ order: ['x'] })).toBeUndefined();
    const sim = prune({ picks: {}, locked: {}, ko: stored }, []);
    expect(sim.ko).toEqual(stored);
    const back = readStore(JSON.stringify({ v: 1, current: { picks: {}, locked: {}, ko: stored } }), 'uefa.champions');
    expect(back.current.ko).toEqual(stored);
  });
});
