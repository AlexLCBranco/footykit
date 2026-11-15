// Brasileirão places (src/data/braPlaces.ts), one case per paragraph of CBF's REC 2026 Art. 6–7, read literally
// (a freed place keeps its stage), on a 20-club table "c1" … "c20" in order; and the recorded snapshot's live case.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { allocate, fateIn, finalOf, rowPlaces, scenarios, type Inputs } from '../src/data/braPlaces';
import { leagueTable } from '../src/data/leagueTable';
import type { Snapshot } from '../src/data/snapshot';

const order = Array.from({ length: 20 }, (_, i) => `c${i + 1}`);
const relegated = new Set(order.slice(16));
const run = (x: Partial<Inputs>) => {
  const a = allocate({ order, relegated, ...x });
  const fmt = (stage: string) => [...a.lib].filter(([, p]) => p.stage === stage).map(([t, p]) => `${t}${p.route === 'table' ? '' : `:${p.route}`}`).sort((p, q) => Number(p.split(':')[0]!.slice(1)) - Number(q.split(':')[0]!.slice(1)) || p.localeCompare(q));
  return { group: fmt('group'), prelim: fmt('prelim'), sula: a.sula };
};

describe('REC 2026 Art. 6–7', () => {
  it('§1: the table\'s five and the cup\'s two (finalists outside the top 5)', () => {
    expect(run({ cupChamp: 'c9', cupVice: 'c12' })).toEqual({ group: ['c1', 'c2', 'c3', 'c4', 'c9:cup'], prelim: ['c5', 'c12:cupVice'], sula: ['c6', 'c7', 'c8', 'c10', 'c11', 'c13'] });
  });
  it('§2: a Libertadores champion in the top 4 keeps the CONMEBOL place; its group-stage place passes to 6th (5th is in)', () => {
    expect(run({ libChamp: 'c2' })).toEqual({ group: ['c1', 'c2:lib', 'c3', 'c4', 'c6:passed'], prelim: ['c5'], sula: ['c7', 'c8', 'c9', 'c10', 'c11', 'c12'] });
  });
  it('§2: a Sudamericana champion outside the places adds a place without moving anyone', () => {
    expect(run({ sulaChamp: 'c8' }).group).toEqual(['c1', 'c2', 'c3', 'c4', 'c8:sula']);
  });
  it('§3: cup champions 5th take the cup\'s group stage; their preliminary place passes to 6th', () => {
    expect(run({ cupChamp: 'c5', cupVice: 'c12' })).toEqual({ group: ['c1', 'c2', 'c3', 'c4', 'c5:cup'], prelim: ['c6:passed', 'c12:cupVice'], sula: ['c7', 'c8', 'c9', 'c10', 'c11', 'c13'] });
  });
  it('§4: cup runners-up 5th (preliminary both ways) keep the table\'s place; the cup\'s passes to 6th', () => {
    expect(run({ cupChamp: 'c9', cupVice: 'c5' }).prelim).toEqual(['c5', 'c6:passed']);
  });
  it('§5: cup champions in the top 4 → the runners-up move up to the group stage; their preliminary place passes down', () => {
    expect(run({ cupChamp: 'c1', cupVice: 'c12' })).toEqual({ group: ['c1', 'c2', 'c3', 'c4', 'c12:cupMovedUp'], prelim: ['c5', 'c6:passed'], sula: ['c7', 'c8', 'c9', 'c10', 'c11', 'c13'] });
  });
  it('§5 with both finalists in the top 4: both cup places pass down, group stage first', () => {
    expect(run({ cupChamp: 'c1', cupVice: 'c2' })).toEqual({ group: ['c1', 'c2', 'c3', 'c4', 'c6:passed'], prelim: ['c5', 'c7:passed'], sula: ['c8', 'c9', 'c10', 'c11', 'c12', 'c13'] });
  });
  it('a relegated cup finalist passes its place down the table', () => {
    expect(run({ cupChamp: 'c18', cupVice: 'c9' })).toEqual({ group: ['c1', 'c2', 'c3', 'c4', 'c6:passed'], prelim: ['c5', 'c9:cupVice'], sula: ['c7', 'c8', 'c10', 'c11', 'c12', 'c13'] });
  });
  it('the most places: Libertadores and Sudamericana champions qualified, cup finalists too → 9', () => {
    const r = run({ libChamp: 'c1', sulaChamp: 'c7', cupChamp: 'c2', cupVice: 'c7' });
    expect(r.group.length + r.prelim.length).toBe(9);
  });
});

describe('the recorded snapshot (2026-11-14): three finals to play', () => {
  const snap = JSON.parse(readFileSync(join(import.meta.dirname, 'fixtures/snapshot.json'), 'utf8')) as Snapshot;
  const t = leagueTable(snap, 'bra.1');
  const ord = t.rows.map((r) => r.team);
  const rel = new Set(ord.slice(16));
  const ab = (id: string) => snap.teams[id]!.abbr;
  const finals = { cup: finalOf(snap.matches, 'bra.copa_do_brazil'), lib: finalOf(snap.matches, 'conmebol.libertadores'), sula: finalOf(snap.matches, 'conmebol.sudamericana') };
  it('the finals: Grêmio v Palmeiras, Palmeiras v Estudiantes, Atlético-MG v Boca, none played', () => {
    expect(finals.cup!.finalists.map(ab).sort()).toEqual(['GRE', 'PAL']);
    expect(finals.lib!.finalists.map(ab).sort()).toEqual(['EST', 'PAL']);
    expect(finals.sula!.finalists.map(ab).sort()).toEqual(['CABJ', 'CAM']);
    expect([finals.cup!.winner, finals.lib!.winner, finals.sula!.winner]).toEqual([undefined, undefined, undefined]);
  });
  const all = scenarios(ord, rel, finals);
  it('8 outcomes; the top 4 are in the group stage in every one', () => {
    expect(all).toHaveLength(8);
    for (const s of all) for (const tm of ord.slice(0, 4)) expect(fateIn(s, tm)).toBe('group');
  });
  it('Grêmio (18th, relegated as things stand) never gets a place; 6th always gets one', () => {
    const gre = ord.find((x) => ab(x) === 'GRE')!;
    expect(new Set(all.map((s) => fateIn(s, gre)))).toEqual(new Set(['none']));
    expect(all.every((s) => fateIn(s, ord[5]!) !== 'sula' && fateIn(s, ord[5]!) !== 'none')).toBe(true);
  });
  it('Atlético-MG (7th): group stage when it wins the Sudamericana, or when Palmeiras win the Libertadores', () => {
    const cam = ord.find((x) => ab(x) === 'CAM')!;
    const pal = ord.find((x) => ab(x) === 'PAL')!;
    // the cup's group-stage place passes down whoever wins (Grêmio relegated, Palmeiras in the top 4) and goes to 6th;
    // Palmeiras winning the Libertadores frees their 2nd place too (§2), and that goes to 7th
    for (const s of all) expect(fateIn(s, cam) === 'group').toBe(s.sula === cam || s.lib === pal);
  });
  it('the Copa do Brasil final changes nothing while Grêmio are relegated', () => {
    const key = (s: (typeof all)[number]) => ord.map((x) => fateIn(s, x)).join();
    for (const s of all) expect(key(s)).toBe(key(all.find((o) => o.lib === s.lib && o.sula === s.sula && o.cup !== s.cup)!));
  });
});

describe('row places in words', () => {
  const snap = JSON.parse(readFileSync(join(import.meta.dirname, 'fixtures/snapshot.json'), 'utf8')) as Snapshot;
  const ord = leagueTable(snap, 'bra.1').rows.map((r) => r.team);
  const all = scenarios(ord, new Set(ord.slice(16)), { cup: finalOf(snap.matches, 'bra.copa_do_brazil'), lib: finalOf(snap.matches, 'conmebol.libertadores'), sula: finalOf(snap.matches, 'conmebol.sudamericana') });
  const rows = rowPlaces(all, ord, (id) => snap.teams[id]!.short.trim());
  const at = (pos: number) => rows.get(ord[pos - 1]!)!;
  it('settled places say how they were earned', () => {
    expect(at(1)).toEqual({ fate: 'group', open: false, text: 'Libertadores group stage' });
    expect(at(6)).toEqual({ fate: 'group', open: false, text: 'Libertadores group stage, a place passed down the table' });
  });
  it('an open place names the results that give it', () => {
    expect(at(7).open).toBe(true);
    expect(at(7).text).toContain('Libertadores group stage if Palmeiras win the Libertadores, or Atlético-MG win the Sudamericana');
  });
});

describe('row places in words: fixes', () => {
  const snap = JSON.parse(readFileSync(join(import.meta.dirname, 'fixtures/snapshot.json'), 'utf8')) as Snapshot;
  const ord = leagueTable(snap, 'bra.1').rows.map((r) => r.team);
  const all = scenarios(ord, new Set(ord.slice(16)), { cup: finalOf(snap.matches, 'bra.copa_do_brazil'), lib: finalOf(snap.matches, 'conmebol.libertadores'), sula: finalOf(snap.matches, 'conmebol.sudamericana') });
  const rows = rowPlaces(all, ord, (id) => snap.teams[id]!.short.trim());
  it('a place that is the same either way doesn\'t claim a route that depends on a final (Palmeiras, 2nd)', () => {
    expect(rows.get(ord[1]!)!.text).toBe('Libertadores group stage');
  });
  it('a place that needs two results says both (Bragantino, 8th)', () => {
    expect(rows.get(ord[7]!)!.text).toContain('Libertadores group stage if Palmeiras win the Libertadores and Atlético-MG win the Sudamericana');
    expect(rows.get(ord[7]!)!.text).not.toContain('other outcomes');
  });
});
