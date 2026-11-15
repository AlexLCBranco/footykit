// The Brasileirão simulator's places (src/data/braPlaces.ts pickFinals / braRowZones) and picked final winners in
// the what-if store (src/data/whatif.ts), on the recorded snapshot (2026-11-14: three finals to play, 41 matches left).

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { LEAGUES } from '../config/leagues';
import { braRowZones, finalOf, pickFinals, type Finals } from '../src/data/braPlaces';
import { leagueMatches, leagueTable, rankTable } from '../src/data/leagueTable';
import type { Snapshot } from '../src/data/snapshot';
import {
  clear, edited, EMPTY, EMPTY_STORE, fill, HOME, open, prune, pruneStore, readStore, saveAs, setPick, setWinner,
  simMatches, toggleLock, writeStore,
} from '../src/data/whatif';

const snap = JSON.parse(readFileSync(join(import.meta.dirname, 'fixtures/snapshot.json'), 'utf8')) as Snapshot;
const short = (id: string) => snap.teams[id]!.short.trim();
const finals: Finals = { cup: finalOf(snap.matches, 'bra.copa_do_brazil'), lib: finalOf(snap.matches, 'conmebol.libertadores'), sula: finalOf(snap.matches, 'conmebol.sudamericana') };
const order = leagueTable(snap, 'bra.1').rows.map((r) => r.team);
const zones = (f: Finals, ord = order) => braRowZones(ord, LEAGUES['bra.1'].zones, f, short);
// teams by code among the finalists (codes repeat across the snapshot's leagues)
const finalists = [finals.cup!, finals.lib!, finals.sula!].flatMap((x) => x.finalists);
const id = (abbr: string) => finalists.find((k) => snap.teams[k]!.abbr === abbr)!;
const [CAM, PAL, EST, GRE] = ['CAM', 'PAL', 'EST', 'GRE'].map(id) as [string, string, string, string];

describe('picked final winners', () => {
  it('a pick fills an open final; a pick that is not a finalist is ignored', () => {
    const p = pickFinals(finals, { sula: CAM, lib: GRE });
    expect(p.sula!.winner).toBe(CAM);
    expect(p.lib!.winner).toBeUndefined();
    expect(p.cup).toBe(finals.cup);
  });
  it('a real winner stands over a pick', () => {
    const decided: Finals = { ...finals, lib: { ...finals.lib!, winner: EST } };
    expect(pickFinals(decided, { lib: PAL }).lib!.winner).toBe(EST);
  });
});

describe('the places over the picks', () => {
  const cam = order.indexOf(CAM);
  it('no picks: the Tables page\'s places (7th, Atlético-MG, hatched: it depends on the finals)', () => {
    expect(cam).toBe(6);
    expect(zones(finals)[cam]).toMatchObject({ kind: 'lib', open: true });
  });
  it('Atlético-MG picked to win the Sudamericana: group stage, settled, as champions', () => {
    const z = zones(pickFinals(finals, { sula: CAM }))[cam]!;
    expect(z).toMatchObject({ kind: 'lib', open: false });
    expect(z.tip).toContain('as Sudamericana champions');
  });
  it('Boca and Estudiantes picked: Atlético-MG drop to the Sudamericana places (no place passed to 7th)', () => {
    const other = (k: 'lib' | 'sula', t: string) => finals[k]!.finalists.find((x) => x !== t)!;
    const z = zones(pickFinals(finals, { sula: other('sula', CAM), lib: other('lib', PAL) }))[cam]!;
    expect(z.open).toBe(false);
    expect(z.kind).not.toBe('lib');
  });
  it('every final picked: no place is hatched; relegation stays by position', () => {
    const z = zones(pickFinals(finals, { sula: CAM, lib: PAL, cup: GRE }));
    expect(z.every((x) => !x || !x.open)).toBe(true);
    expect(z.slice(16).every((x) => x?.kind === 'rel')).toBe(true);
  });
  it('the places follow the picked table: Grêmio winning every match left climbs out of the drop and takes the cup\'s place', () => {
    const { members, matches } = leagueMatches(snap, 'bra.1');
    let sim = EMPTY;
    for (const m of matches.filter(open)) if (m.h === GRE || m.a === GRE) sim = setPick(sim, m.id, m.h === GRE ? { h: 5, a: 0 } : { h: 0, a: 5 });
    const ord = rankTable(members, simMatches(matches, sim), LEAGUES['bra.1'], short).rows.map((r) => r.team);
    expect(ord.indexOf(GRE)).toBeLessThan(16);
    const z = zones(pickFinals(finals, { cup: GRE }), ord)[ord.indexOf(GRE)]!;
    expect(z.kind).toBe('lib');
    expect(z.tip).toContain('as Copa do Brasil champions');
  });
});

describe('final winners in the store', () => {
  const states = { cup: finals.cup!, lib: finals.lib!, sula: finals.sula! };
  it('set and clear; the picks\' other changes keep them', () => {
    let s = setWinner(EMPTY, 'sula', CAM);
    expect(s.winners).toEqual({ sula: CAM });
    s = setPick(s, 'm1', HOME);
    s = toggleLock(s, 'm1');
    s = fill(s, [], 'home', () => undefined);
    s = clear(s, []);
    expect(s.winners).toEqual({ sula: CAM });
    expect(setWinner(s, 'sula', undefined).winners).toBeUndefined();
  });
  it('pruned once the final is played, or when the team is not a finalist', () => {
    const s = setWinner(setWinner(EMPTY, 'sula', CAM), 'lib', GRE);
    expect(prune(s, [], states).winners).toEqual({ sula: CAM });
    expect(prune(s, [], { ...states, sula: { ...states.sula, winner: CAM } }).winners).toBeUndefined();
    const ok = setWinner(EMPTY, 'sula', CAM);
    expect(prune(ok, [], states)).toBe(ok);
    expect(pruneStore(saveAs({ ...EMPTY_STORE, current: s }, 'S'), [], states).saved[0]!.sim.winners).toEqual({ sula: CAM });
  });
  it('kept in fk:whatif:v1 with the league; a winner alone is worth keeping; a changed winner marks the scenario edited', () => {
    const s = setWinner(EMPTY, 'lib', PAL);
    const text = writeStore({ ...EMPTY_STORE, current: s }, 'bra.1');
    expect(text).not.toBeNull();
    expect(readStore(text, 'bra.1').current).toEqual(s);
    const saved = saveAs({ ...EMPTY_STORE, current: s }, 'Pal');
    expect(edited({ ...saved, current: setWinner(s, 'lib', EST) })).toBe(true);
    expect(edited(saved)).toBe(false);
  });
  it('bad winners are dropped on reading', () => {
    const text = JSON.stringify({ v: 1, current: { picks: {} }, comps: { 'bra.1': { current: { picks: {}, winners: { lib: PAL, sula: 3, cup: '' } } } } });
    expect(readStore(text, 'bra.1').current).toEqual({ picks: {}, locked: {}, winners: { lib: PAL } });
  });
});
