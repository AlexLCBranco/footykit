// FK-60: the World Cup simulator. With the real results it must rebuild the real tables and bracket; a changed group
// result must move teams through the edition's own pairings.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { groupTables, type WcEdition } from '../src/data/worldcup';
import { clearAll, fastResult, koSlots, simulable, simulate, sourceText } from '../src/data/wcSim';

const ed = (y: number) => JSON.parse(readFileSync(join(import.meta.dirname, '..', 'public', 'worldcup', `${y}.json`), 'utf8')) as WcEdition;

describe('the real results reproduce the real tables and bracket', () => {
  for (const y of [2002, 2018, 2022, 2026]) {
    it(String(y), () => {
      const e = ed(y);
      const v = simulate(e, {});
      expect(v.tables.map((t) => t.rows.map((r) => r.team))).toEqual(groupTables(e).map((t) => t.rows.map((r) => r.team)));
      for (const t of v.ties) {
        expect([t.h, t.a], `${y} M${t.slot.n}`).toEqual([t.slot.real.h, t.slot.real.a]);
        expect(t.r, `${y} M${t.slot.n}`).toBeDefined();
        expect(t.changed).toBe(false);
      }
      expect(v.champion).toBe(e.champion);
      expect(v.changed.size).toBe(0);
    });
  }
});

describe('the pairings come from the real bracket', () => {
  it('2022: 1A v 2B … ; later rounds from match winners; third place from the semi-final losers', () => {
    const s = koSlots(ed(2022));
    expect(s.filter((x) => x.stage === 'Round of 16').map((x) => x.from.map(sourceText).join(' v ')).sort()).toEqual(['1A v 2B', '1B v 2A', '1C v 2D', '1D v 2C', '1E v 2F', '1F v 2E', '1G v 2H', '1H v 2G']);
    expect(s.find((x) => x.stage === 'Final')!.from.every((f) => f.kind === 'win')).toBe(true);
    expect(s.find((x) => x.stage === 'Third place')!.from.every((f) => f.kind === 'lose')).toBe(true);
  });
  it('2026: eight round-of-32 matches against a third (Annex C)', () => {
    const s = koSlots(ed(2026)).filter((x) => x.stage === 'Round of 32');
    expect(s).toHaveLength(16);
    expect(s.flatMap((x) => x.from).filter((f) => f.kind === 'third').map(sourceText).sort()).toEqual(['1A', '1B', '1D', '1E', '1G', '1I', '1K', '1L'].map((w) => `3rd (v ${w})`));
  });
});

describe('a changed result follows the rules', () => {
  it('2022: Poland beat Argentina 2-0 → Poland win Group C, Argentina go out; the round of 16 refills', () => {
    const e = ed(2022);
    const name = (c?: string) => (c ? e.teams[c] : undefined);
    const m = e.matches.find((x) => x.group === 'Group C' && [name(x.h), name(x.a)].sort().join() === 'Argentina,Poland')!;
    const r = name(m.h) === 'Poland' ? { s: [2, 0] as [number, number] } : { s: [0, 2] as [number, number] };
    const v = simulate(e, { [m.n]: { r } });
    const c = v.tables.find((t) => t.group.name === 'Group C')!;
    expect(c.rows.map((x) => name(x.team))).toEqual(['Poland', 'Mexico', 'Argentina', 'Saudi Arabia']);
    const r16 = v.ties.filter((t) => t.slot.stage === 'Round of 16').map((t) => [name(t.h), name(t.a)].sort().join(' v '));
    expect(r16).toContain('Australia v Poland'); // 1C v 2D
    expect(r16).toContain('France v Mexico'); // 1D v 2C
    expect(r16.join()).not.toContain('Argentina');
    // the real round-of-16 results no longer apply to changed pairings: those ties are open
    const poland = v.ties.find((t) => t.slot.stage === 'Round of 16' && (name(t.h) === 'Poland' || name(t.a) === 'Poland'))!;
    expect(poland.r).toBeUndefined();
    expect(poland.changed).toBe(true);
    expect(v.champion).toBeUndefined();
    // picking the open tie carries the winner on
    const v2 = simulate(e, { [m.n]: { r }, [poland.slot.n]: { r: fastResult('1'), h: poland.h, a: poland.a } });
    expect(v2.ties.find((t) => t.slot.n === poland.slot.n)!.winner).toBe(poland.h);
  });
  it('fast picks: 1 / X / 2 are 1-0, 1-1, 0-1', () => {
    expect([fastResult('1').s, fastResult('X').s, fastResult('2').s]).toEqual([[1, 0], [1, 1], [0, 1]]);
  });
  it('2026: a changed group moves which thirds go through and who they meet', () => {
    const e = ed(2026);
    const real = simulate(e, {});
    expect(real.thirds!.vs).toEqual({ '1A': '3E', '1B': '3J', '1D': '3B', '1E': '3D', '1G': '3I', '1I': '3F', '1K': '3L', '1L': '3K' });
    // the last third through (8th: Senegal, Group I) loses its win 0-3 instead → out; the 9th third comes in
    const eighth = real.thirds!.rows[7]!;
    const win = e.matches.find((m) => m.group === eighth.group && (m.h === eighth.team ? m.s[0] > m.s[1] : m.a === eighth.team && m.s[1] > m.s[0]))!;
    const v = simulate(e, { [win.n]: { r: { s: (win.h === eighth.team ? [0, 3] : [3, 0]) as [number, number] } } });
    expect(v.thirds!.through.has(eighth.team)).toBe(false);
    expect(v.thirds!.through.has(real.thirds!.rows[8]!.team)).toBe(true);
    expect(v.thirds!.vs).not.toEqual(real.thirds!.vs);
    // the Round of 32 follows the new Annex C row: every third-place slot holds a qualified third
    for (const t of v.ties.filter((x) => x.slot.stage === 'Round of 32')) for (const [i, src] of t.slot.from.entries()) if (src.kind === 'third') expect(v.thirds!.through.has((i ? t.a : t.h)!)).toBe(true);
    expect(v.thirds!.through.size).toBe(8);
    expect([...v.thirds!.through]).not.toEqual([...real.thirds!.through]);
  });
  it('clear all: no results, tables at zero, no knockout team decided', () => {
    const e = ed(2018);
    const v = simulate(e, clearAll(e));
    expect(v.tables.every((t) => t.rows.every((r) => r.p === 0))).toBe(true);
    expect(v.ties.every((t) => !t.h && !t.a)).toBe(true);
  });
  it('covers 1998–2022 and 2026 only', () => {
    expect([1994, 1998, 2022, 2026].map(simulable)).toEqual([false, true, true, true]);
  });
});
