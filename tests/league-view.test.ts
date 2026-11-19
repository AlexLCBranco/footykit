// FK-45: the League view's data (every game of a competition by local day, its teams) and its address.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildModel } from '../src/data/model';
import type { Snapshot } from '../src/data/snapshot';
import { compDays, compTeams } from '../src/data/leagueView';
import { defaultPage, leagueViewPage, pageFromSearch, pageSearch, pagePart, stepPage } from '../src/components/page';

const snap = JSON.parse(readFileSync(join(import.meta.dirname, 'fixtures/snapshot.json'), 'utf8')) as Snapshot;
const model = buildModel(snap, 'America/Sao_Paulo');

describe('compDays / compTeams', () => {
  it('has every game of the competition, not only the followed clubs\'', () => {
    const days = compDays(snap.matches, 'eng.league_cup', model.dayOf);
    const all = [...days.values()].flat();
    expect(all.length).toBe(snap.matches.filter((m) => m.c === 'eng.league_cup').length);
    expect(all.some((m) => !model.followed.has(m.h) && !model.followed.has(m.a))).toBe(true);
    expect(compTeams(snap.matches, 'eng.league_cup', (id) => model.team(id).short)).toHaveLength(92);
  });
  it('groups by local day, by kickoff', () => {
    const day = compDays(snap.matches, 'eng.1', model.dayOf).get('2026-11-21')!;
    expect(day).toHaveLength(7);
    expect(day.map((m) => m.t)).toEqual([...day.map((m) => m.t)].sort());
    expect(compDays(snap.matches, 'eng.1', model.dayOf).get('2026-11-20')).toBeUndefined();
  });
  it('lists 20 teams for a 20-club league, sorted by name', () => {
    const t = compTeams(snap.matches, 'eng.1', (id) => model.team(id).short);
    expect(t).toHaveLength(20);
    const names = t.map((id) => model.team(id).short);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
  });
});

describe('League view page', () => {
  const base = defaultPage('2026-11-21');
  it('round-trips through the address (competition and mode; a fresh visit opens on today)', () => {
    const p = { ...leagueViewPage(base, 'bra.copa_do_brazil', '2026-11-25'), lmode: 'cal' as const };
    const q = pageSearch(p);
    expect(q).toContain('view=league');
    expect(q).toContain('comp=bra.copa_do_brazil');
    expect(q).toContain('mode=cal');
    const back = pageFromSearch(q, '2026-11-21', model);
    expect(back).toMatchObject({ view: 'league', lcomp: 'bra.copa_do_brazil', lmode: 'cal', day: '2026-11-21' });
    expect(pageFromSearch('?view=league&comp=nope', '2026-11-21', model).lcomp).toBe('eng.1');
  });
  it('steps a day in List, a week in Calendar; titles say which', () => {
    const p = leagueViewPage(base, 'eng.1', '2026-11-21');
    expect(stepPage(p, 1, model).day).toBe('2026-11-22');
    expect(stepPage({ ...p, lmode: 'cal' }, -1, model).day).toBe('2026-11-14');
    expect(pagePart(p, model)).toBe('Premier League · Nov 21');
    expect(pagePart({ ...p, lmode: 'cal' }, model)).toBe('Premier League · Nov 16 – 22');
  });
});
