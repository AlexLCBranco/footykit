// Libertadores / Sudamericana (src/data/cups.ts, config/conmebol.ts) on the recorded snapshot (2026-11-14: groups and
// knockout stages played up to the finals). Expected values from outside this code: ESPN's group tables, and
// Wikipedia's 2026 Libertadores final stages (round-of-16 results).

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CUPS } from '../config/conmebol';
import { bracketColumns, cupGroups, stageTies, type CupTie } from '../src/data/cups';
import type { Snapshot } from '../src/data/snapshot';

const snap = JSON.parse(readFileSync(join(import.meta.dirname, 'fixtures/snapshot.json'), 'utf8')) as Snapshot;
const ab = (id?: string) => (id ? snap.teams[id]!.abbr : '?');
const [LIB, SULA] = CUPS as [(typeof CUPS)[number], (typeof CUPS)[number]];
const show = (t: CupTie) => `${ab(t.a)} ${t.goalsA}-${t.goalsB} ${ab(t.b)}${t.pensA !== undefined ? ` p${t.pensA}-${t.pensB}` : ''} → ${ab(t.winner)}`;
const legs = (cfg: typeof LIB, r: string) => (r === cfg.knockout[cfg.knockout.length - 1] || cfg.singleLeg.includes(r) ? 1 : 2);
const ties = (cfg: typeof LIB, r: string) => stageTies(snap.matches.filter((m) => m.c === cfg.slug), r, legs(cfg, r));

describe.each([LIB, SULA])('$slug groups', (cfg) => {
  const groups = cupGroups(snap, cfg);
  it('8 groups of 4, 6 matches each per team', () => {
    expect(groups).toHaveLength(8);
    for (const g of groups) {
      expect(g.rows).toHaveLength(4);
      expect(g.matches).toHaveLength(12);
      expect(g.complete).toBe(true);
    }
  });
  it('numbers and order equal ESPN\'s group tables (order where no tie is left)', () => {
    for (const g of groups) {
      const espn = snap.tables[cfg.slug]!.find((t) => t.name === g.name)!.rows;
      for (const e of espn) {
        const r = g.rows.find((x) => x.team === e.team)!;
        expect([r.p, r.w, r.d, r.l, r.gf, r.ga, r.pts], `${g.name} ${ab(e.team)}`).toEqual([e.p, e.w, e.d, e.l, e.gf, e.ga, e.pts]);
        if (!r.level) expect(r.rank, `${g.name} ${ab(e.team)}`).toBe(e.rank);
      }
    }
  });
});

describe('ties', () => {
  it('stage sizes', () => {
    expect([...LIB.qualifying, ...LIB.knockout].map((r) => ties(LIB, r).length)).toEqual([3, 8, 4, 8, 4, 2, 1]);
    expect([...SULA.qualifying, ...SULA.knockout].map((r) => ties(SULA, r).length)).toEqual([16, 8, 8, 4, 2, 1]);
  });
  it('Libertadores round of 16 (Wikipedia), the 2nd-leg host first', () => {
    expect(ties(LIB, 'Round of 16').map(show).sort()).toEqual([
      'CDUC 1-4 EST → EST', 'COQ 1-1 PLA p6-7 → PLA', 'COR 1-0 ROS → COR', 'CPT 1-2 PAL → PAL',
      'FLA 3-2 CRU → FLA', 'IDV 4-1 TOL → IDV', 'LDU 1-1 MIR p5-4 → LDU', 'RIV 1-1 FLU p4-5 → FLU',
    ]);
  });
  it('a single-leg first stage decided on penalties; the finals still to play are open', () => {
    expect(ties(SULA, 'First Stage').every((t) => t.legs.length === 1 && t.winner)).toBe(true);
    const fin = ties(LIB, 'Final')[0]!;
    expect([[ab(fin.a), ab(fin.b)].sort(), fin.winner]).toEqual([['EST', 'PAL'], undefined]);
  });
});

describe('bracket order from the ties', () => {
  const cols = bracketColumns(LIB.knockout.map((r) => ties(LIB, r)));
  const teams = (t: CupTie) => [t.a, t.b];
  it('each pair of ties feeds the tie beside it in the next round', () => {
    for (let i = 0; i < cols.length - 1; i++) {
      cols[i + 1]!.forEach((n, j) => {
        const pair = cols[i]!.slice(2 * j, 2 * j + 2);
        for (const t of pair) expect(teams(t).some((x) => teams(n).includes(x)), `${show(t)} feeds ${show(n)}`).toBe(true);
      });
    }
  });
  it('the halves: Palmeiras / Fluminense and Estudiantes / Flamengo', () => {
    const sf = cols[2]!.map((t) => [ab(t.a), ab(t.b)].sort().join('-')).sort();
    expect(sf).toEqual(['EST-FLA', 'FLU-PAL']);
  });
});

describe('domestic cups', async () => {
  const { DOMESTIC_CUPS } = await import('../config/domesticCups');
  const { cupRounds } = await import('../src/data/cups');
  const rounds = (slug: string) => {
    const cfg = DOMESTIC_CUPS.find((c) => c.slug === slug)!;
    return cupRounds(snap.matches.filter((m) => m.c === slug), cfg.twoLeg, (id) => snap.teams[id]?.name);
  };
  it('Copa do Brasil: rounds in order, single then two legs, the final one match', () => {
    const r = rounds('bra.copa_do_brazil');
    expect(r.map((x) => `${x.round}:${x.legs}:${x.ties.length}`)).toEqual([
      'First Round:1:14', 'Second Round:1:44', 'Third Round:1:24', 'Fourth Round:1:12', 'Fifth Round:2:16', 'Round of 16:2:8', 'Quarterfinals:2:4', 'Semifinals:2:2', 'Final:1:1',
    ]);
    const sf = r.find((x) => x.round === 'Semifinals')!.ties.map((t) => `${ab(t.a)}-${ab(t.b)}:${ab(t.winner)}`).sort();
    // Grêmio 2-0, 1-1 v Atlético-MG; Palmeiras 1-0, 1-2 v Vasco, level 2-2, then 5-4 on penalties
    expect(sf[0]).toBe('CAM-GRE:GRE');
    expect(sf[1]).toBe('VAS-PAL:PAL');
  });
  it('Coppa Italia: the semi-finals and the final are slots (ESPN\'s "TBD" teams), not ties', () => {
    const r = rounds('ita.coppa_italia');
    expect(r.find((x) => x.round === 'Semifinals')).toMatchObject({ legs: 2, ties: [], open: 2 });
    expect(r.find((x) => x.round === 'Final')).toMatchObject({ legs: 1, ties: [], open: 1 });
  });
  it('every configured cup has matches in the snapshot', () => {
    for (const c of DOMESTIC_CUPS) expect(rounds(c.slug).length, c.slug).toBeGreaterThan(0);
  });
});

it('the bar\'s cup list is the configured cups', async () => {
  const { CUP_SLUGS } = await import('../src/components/page');
  const { DOMESTIC_CUPS } = await import('../config/domesticCups');
  expect([...CUP_SLUGS].sort()).toEqual([...CUPS, ...DOMESTIC_CUPS].map((c) => c.slug).sort());
});
