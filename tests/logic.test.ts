// Phase 2 logic on the recorded snapshot (tests/fixtures/snapshot.json, 2026-11-14) and on small hand-made matches:
// days, form / record / streak (calendarkit's rule), season series with aggregates, windows, neutral venues, the page
// helpers and the day layer's merge.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { copyColumns } from '../src/components/Copy';
import { defaultPage, leagueWhatIfPage, pageFromSearch, pagePart, pageSearch, simLeague, stepPage, teamPage, uclWhatIfPage } from '../src/components/page';
import { formAt } from '../src/data/form';
import { espnDatesFor, isHot, withLive } from '../src/data/live';
import { addDays, addMonths, buildModel, dayKey, mondayOf, resultFor } from '../src/data/model';
import { neutralVenue } from '../src/data/neutral';
import { seasonSeries } from '../src/data/series';
import type { Match, Snapshot } from '../src/data/snapshot';
import { fifaWindowOn, isFreeWindowDay, windowOf } from '../src/data/windows';

const snap = JSON.parse(readFileSync(join(import.meta.dirname, 'fixtures/snapshot.json'), 'utf8')) as Snapshot;
const SP = 'America/Sao_Paulo';
const model = buildModel(snap, SP);
const ARS = '359', VAS = '3454';

const m = (id: string, t: string, h: string, a: string, extra: Partial<Match> = {}): Match => ({ id, t, c: 'eng.1', st: 'post', h, a, ...extra });
function tiny(matches: Match[]): Snapshot {
  const teams = Object.fromEntries(['1', '2', '3'].map((id) => [id, { id, abbr: `T${id}`, name: `Team ${id}`, short: `T${id}` }]));
  return { v: 1, generatedAt: '2026-11-14T00:00:00Z', season: 'x', clubs: [{ ...teams['1']!, league: 'eng.1', region: 'europe' }], teams, comps: {}, matches, tables: {} };
}

describe('days in the viewer\'s zone', () => {
  it('a 00:30 UTC kickoff is the previous day in Brazil', () => {
    expect(dayKey('2026-11-19T00:30Z', SP)).toBe('2026-11-18');
    expect(dayKey('2026-11-19T00:30Z', 'Europe/London')).toBe('2026-11-19');
  });
  it('indexes followed clubs\' matches per local day, by kickoff', () => {
    const d = model.byDay.get('2026-11-18')!;
    expect(d.length).toBeGreaterThan(0);
    expect(d.every((x) => model.followed.has(x.h) || model.followed.has(x.a))).toBe(true);
    expect(d.map((x) => x.t)).toEqual([...d.map((x) => x.t)].sort());
    expect(d.some((x) => x.t === '2026-11-19T00:30Z')).toBe(true);
  });
  it('day arithmetic', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(mondayOf('2026-11-22')).toBe('2026-11-16');
    expect(addMonths('2026-12', 1)).toBe('2027-01');
  });
});

describe('form, record and streak', () => {
  const s = tiny([
    m('a', '2026-08-01T15:00Z', '1', '2', { hs: 2, as: 0 }),
    m('b', '2026-08-08T15:00Z', '3', '1', { hs: 1, as: 1 }),
    m('c', '2026-08-12T19:00Z', '1', '3', { c: 'eng.league_cup', hs: 0, as: 1 }),
    m('d', '2026-08-15T15:00Z', '2', '1', { hs: 0, as: 3 }),
    m('e', '2026-08-22T15:00Z', '1', '3', { st: 'pre' }),
  ]);
  const md = buildModel(s, 'UTC');
  it('a played match shows the line including it', () => {
    const f = formAt(md, '1', s.matches[3]!);
    expect(f.last5).toEqual(['W', 'D', 'L', 'W']);
    expect(f.record).toEqual([2, 1, 0]); // the cup defeat is not in the league record
    expect(f.streak).toBe('W1');
  });
  it('a match to come shows the line going in', () => {
    expect(formAt(md, '1', s.matches[4]!).last5).toEqual(['W', 'D', 'L', 'W']);
    expect(formAt(md, '1', s.matches[2]!).last5).toEqual(['W', 'D', 'L']);
  });
  it('a shootout after a draw is a draw', () => {
    expect(resultFor(m('x', 't', '1', '2', { hs: 1, as: 1, hp: 4, ap: 3 }), '1')).toBe('D');
  });
  it('runs of 3+', () => {
    const t = tiny(['1', '2', '3', '4'].map((k, i) => m(k, `2026-08-0${i + 1}T15:00Z`, '1', '2', { hs: 1, as: 1 })));
    const f = formAt(buildModel(t, 'UTC'), '1', t.matches[3]!);
    expect(f).toMatchObject({ streak: 'D4', unbeaten: 4, winless: 4 });
  });
});

describe('season series', () => {
  it('Vasco v Atlético-MG? no — Vasco\'s Copa do Brasil semi: two legs, aggregate and shootout on leg 2', () => {
    const semi = snap.matches.find((x) => x.c === 'bra.copa_do_brazil' && x.r === 'Semifinals' && x.leg === 2 && (x.h === VAS || x.a === VAS))!;
    const opp = semi.h === VAS ? semi.a : semi.h;
    const s = seasonSeries(model, VAS, opp);
    const cup = s.filter((x) => x.m.c === 'bra.copa_do_brazil');
    expect(cup).toHaveLength(2);
    expect(cup[1]!.tie).toEqual({ agg: [2, 2], pens: [4, 5] });
    expect(cup[0]!.tie).toBeUndefined();
    expect(s.map((x) => x.m.t)).toEqual([...s.map((x) => x.m.t)].sort());
  });
  it('league meetings home and away', () => {
    const s = seasonSeries(model, ARS, '382');
    expect(s.filter((x) => x.m.c === 'eng.1')).toHaveLength(2);
  });
});

describe('windows', () => {
  it('midweek Tue–Thu, weekend Fri–Mon', () => {
    expect(windowOf('2026-11-17')).toEqual({ kind: 'mid', start: '2026-11-17' });
    expect(windowOf('2026-11-19')).toEqual({ kind: 'mid', start: '2026-11-17' });
    expect(windowOf('2026-11-20')).toEqual({ kind: 'wkd', start: '2026-11-20' });
    expect(windowOf('2026-11-23')).toEqual({ kind: 'wkd', start: '2026-11-20' });
  });
  it('a window with no match is free; one with a match is not', () => {
    // Arsenal (fixture): Sat Nov 21 at Newcastle, Tue Nov 24 v Dortmund; nothing Nov 17–19 (FIFA window)
    expect(isFreeWindowDay(model, ARS, '2026-11-18')).toBe(true);
    expect(isFreeWindowDay(model, ARS, '2026-11-22')).toBe(false);
    expect(isFreeWindowDay(model, ARS, '2026-11-26')).toBe(false);
  });
  it('FIFA windows from config', () => {
    expect(fifaWindowOn('2026-11-14')?.label).toMatch(/November 2026/);
    expect(fifaWindowOn('2026-11-18')).toBeUndefined();
  });
});

describe('neutral venues (config rules)', () => {
  it('finals and one-off super cups, not league matches', () => {
    expect(neutralVenue({ ...m('x', 't', '1', '2'), c: 'conmebol.sudamericana', r: 'Final' })).toBeDefined();
    expect(neutralVenue({ ...m('x', 't', '1', '2'), c: 'eng.fa', r: 'Semifinals' })).toBeDefined();
    expect(neutralVenue({ ...m('x', 't', '1', '2'), c: 'eng.league_cup', r: 'Semifinals' })).toBeUndefined();
    expect(neutralVenue({ ...m('x', 't', '1', '2'), c: 'eng.charity' })).toBeDefined();
    expect(neutralVenue({ ...m('x', 't', '1', '2'), c: 'ger.super_cup' })).toBeUndefined();
    expect(neutralVenue(m('x', 't', '1', '2'))).toBeUndefined();
  });
  it('the fixture\'s Sudamericana final is flagged', () => {
    const f = snap.matches.find((x) => x.c === 'conmebol.sudamericana' && x.r === 'Final');
    expect(f && neutralVenue(f)).toBeTruthy();
  });
});

describe('page helpers', () => {
  const p = defaultPage('2026-11-14');
  it('the address never pins a fresh visit to its date', () => {
    const q = pageSearch({ ...p, day: '2026-10-01' });
    expect(q).toContain('date=2026-10-01');
    expect(pageFromSearch(q, '2026-11-14', model).day).toBe('2026-11-14');
  });
  it('a team link opens that team\'s calendar around the day, keeping the span', () => {
    const t = teamPage({ ...p, span: 1 }, ARS, '2026-11-21');
    expect(t).toMatchObject({ view: 'cal', team: ARS, span: 1, week: '2026-11-16', month: '2026-11' });
    expect(pageFromSearch(pageSearch(t), '2026-11-14', model)).toMatchObject({ view: 'cal', team: ARS, span: 1 });
    expect(pagePart(t, model)).toBe('ARS · Nov 16 – Nov 22');
  });
  it('days are stepped one at a time, empty days included', () => {
    expect(stepPage(p, 1, model).day).toBe('2026-11-15');
    expect(stepPage({ ...p, view: 'cal', team: ARS, span: 2, week: '2026-11-16' }, 1, model).week).toBe('2026-11-30');
  });
  it('an unknown team in the address falls back to the day view', () => {
    expect(pageFromSearch('?view=cal&team=999999', '2026-11-14', model).view).toBe('day');
  });
  it('the UCL what-if keeps the league the Tables page shows', () => {
    const table = { ...p, view: 'table' as const, league: 'bra.1' as const };
    const sim = uclWhatIfPage({ ...table, view: 'ucl' });
    expect(simLeague(sim)).toBeUndefined();
    expect(pageSearch(sim)).toBe('?view=whatif');
    expect(pagePart(sim, model)).toBe('UCL what-if');
    expect({ ...sim, view: 'table' as const }.league).toBe('bra.1');
    // the league's simulator, from the Tables page, after a trip to the UCL's
    const lsim = leagueWhatIfPage({ ...sim, view: 'table' });
    expect(simLeague(lsim)).toBe('bra.1');
    expect(pageSearch(lsim)).toBe('?view=whatif&league=bra.1');
    // an address, or history from before the flag, without a league is the UCL's
    expect(simLeague(pageFromSearch('?view=whatif', '2026-11-14', model))).toBeUndefined();
    expect(simLeague({ ...p, view: 'whatif' })).toBeUndefined();
    expect(simLeague(pageFromSearch('?view=whatif&league=ger.1', '2026-11-14', model))).toBe('ger.1');
  });
});

describe('day layer merge', () => {
  it('the ESPN (US Eastern) dates a Brazilian day needs', () => {
    expect(espnDatesFor('2026-11-18', SP)).toEqual(['20261117', '20261118']);
    // Brazil's 00:00–24:00 is 22:00 / 23:00 the evening before → 22:00 that day in New York
    expect(espnDatesFor('2026-11-18', 'America/New_York')).toEqual(['20261118']);
  });
  it('a live copy replaces the snapshot match but keeps its aggregate and venue', () => {
    const base = m('1', '2026-11-18T22:00Z', '1', '2', { st: 'pre', v: 'Ground', ha: 1, aa: 0 });
    const liveM = { ...base, st: 'in' as const, hs: 1, as: 0, clk: "67'", v: undefined, ha: undefined, aa: undefined };
    const [out] = withLive([base], { matches: new Map([['1', liveM]]), odds: new Map() });
    expect(out).toMatchObject({ st: 'in', hs: 1, clk: "67'", v: 'Ground', ha: 1 });
  });
  it('hot while live or within 15 min of kickoff', () => {
    const now = Date.parse('2026-11-18T21:50Z');
    expect(isHot([m('1', '2026-11-18T22:00Z', '1', '2', { st: 'pre' })], now)).toBe(true);
    expect(isHot([m('1', '2026-11-18T23:00Z', '1', '2', { st: 'pre' })], now)).toBe(false);
    expect(isHot([m('1', '2026-11-18T20:00Z', '1', '2', { st: 'post' })], now)).toBe(false);
  });
});

describe('copy layout: largest-cards rule', () => {
  it('a wide page takes several columns; one card one column', () => {
    expect(copyColumns(1, { width: 500, height: 90 })).toBe(1);
    expect(copyColumns(12, { width: 500, height: 90 })).toBeGreaterThan(1);
    const cols = copyColumns(20, { width: 500, height: 90 });
    expect(cols).toBeGreaterThanOrEqual(2);
    expect(cols).toBeLessThanOrEqual(5);
  });
});
