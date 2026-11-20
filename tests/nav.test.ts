// FK-65: the shared layout's navigation — every old address lands on the right page and round-trips, each page sits
// in the right place with the right What / How, the breadcrumb's parts jump sideways, and "Go anywhere" finds things.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildModel } from '../src/data/model';
import type { Snapshot } from '../src/data/snapshot';
import { bracket, type WcEdition } from '../src/data/worldcup';
import { crumbs, cupHowOf, cupHowPage, cupOf, leagueHowOf, leagueOf, leaguePage, searchEntries, searchFind, whereOf, whereTarget, type WcTeamEdition } from '../src/components/nav';
import { pageFromSearch, pageSearch, WC_NO_BRACKET, WC_YEARS, type Page } from '../src/components/page';

const snap = JSON.parse(readFileSync(join(import.meta.dirname, 'fixtures/snapshot.json'), 'utf8')) as Snapshot;
const model = buildModel(snap, 'America/Sao_Paulo');
const today = '2026-11-20';
const team = model.clubs[0]!.id;
const open = (search: string) => pageFromSearch(search, today, model);

describe('every old address form lands on the right page (FK-65 redirects)', () => {
  const cases: [string, string, Partial<Page>, string][] = [
    ['', 'today', { view: 'day' }, '?date=2026-11-20'],
    ['?view=slate', 'today', { view: 'slate' }, '?view=slate&date=2026-11-20'],
    [`?view=cal&team=${team}&span=2`, 'clubs', { view: 'cal', team, span: 2 }, ''],
    [`?view=list&team=${team}`, 'clubs', { view: 'list', team }, ''],
    [`?view=cal&team=${team}&on=2026-12-03`, 'clubs', { view: 'cal', team, span: 'month' }, ''],
    ['?view=ucl', 'cups', { view: 'ucl' }, '?view=ucl'],
    ['?view=ucl&tab=pots', 'cups', { view: 'ucl', uclTab: 'pots' }, '?view=ucl&tab=pots'],
    ['?view=whatif', 'cups', { view: 'whatif' }, '?view=whatif'],
    ['?view=whatif&league=bra.1', 'leagues', { view: 'whatif', league: 'bra.1' }, '?view=whatif&league=bra.1'],
    ['?view=table&league=ger.1', 'leagues', { view: 'table', league: 'ger.1' }, '?view=table&league=ger.1'],
    ['?view=cups&cup=eng.fa', 'cups', { view: 'cups', cup: 'eng.fa' }, '?view=cups&cup=eng.fa'],
    ['?view=cups&cup=uefa.champions', 'cups', { view: 'ucl' }, '?view=ucl'],
    ['?view=cups&cup=fifa.world', 'cups', { view: 'wc', wcYear: 2026 }, '?view=wc&year=2026'],
    ['?view=trailing&comp=uefa.champions', 'tools', { view: 'trailing', comp: 'uefa.champions' }, '?view=trailing&comp=uefa.champions'],
    ['?view=league&comp=eng.1&mode=cal', 'leagues', { view: 'league', lcomp: 'eng.1', lmode: 'cal' }, '?view=league&comp=eng.1&mode=cal&date=2026-11-20'],
    ['?view=league&comp=conmebol.libertadores', 'cups', { view: 'league', lcomp: 'conmebol.libertadores' }, '?view=league&comp=conmebol.libertadores&date=2026-11-20'],
    ['?view=wc&year=2002&team=BRA', 'cups', { view: 'wc', wcYear: 2002, wcTeam: 'BRA' }, '?view=wc&year=2002&team=BRA'],
    ['?view=wc&year=2014&sim=1', 'cups', { view: 'wc', wcYear: 2014, wcSim: true }, '?view=wc&year=2014&sim=1'],
    ['?view=history&comp=eng.1&season=2004', 'leagues', { view: 'history', hcomp: 'eng.1', hseason: 2004 }, '?view=history&comp=eng.1&season=2004'],
    ['?view=history&comp=uefa.champions', 'cups', { view: 'history', hcomp: 'uefa.champions' }, '?view=history&comp=uefa.champions'],
    // the new forms
    ['?view=clubs', 'clubs', { view: 'clubs' }, '?view=clubs'],
    ['?view=cups&cup=eng.fa&sim=1', 'cups', { view: 'cups', cup: 'eng.fa', cupSim: true }, '?view=cups&cup=eng.fa&sim=1'],
    ['?view=wc&year=2002&how=groups', 'cups', { view: 'wc', wcYear: 2002, wcHow: 'groups' }, '?view=wc&year=2002&how=groups'],
  ];
  it.each(cases)('%s → %s', (search, where, want, canonical) => {
    const p = open(search);
    expect(p).toMatchObject(want);
    expect(whereOf(p)).toBe(where);
    if (canonical) expect(pageSearch(p)).toBe(canonical);
    // the canonical address opens the same page again
    expect(open(pageSearch(p))).toMatchObject(want);
  });
});

describe('What and How', () => {
  it('Leagues: a league chip keeps the How, a How keeps the league', () => {
    const sim = leaguePage(open('?view=table&league=eng.1'), 'eng.1', 'sim', today);
    expect([leagueOf(sim), leagueHowOf(sim)]).toEqual(['eng.1', 'sim']);
    const bra = leaguePage(sim, 'bra.1', leagueHowOf(sim), today);
    expect(pageSearch(bra)).toBe('?view=whatif&league=bra.1');
    expect(leagueHowOf(leaguePage(bra, 'bra.1', 'history', today))).toBe('history');
    expect(pageSearch(leaguePage(bra, 'bra.1', 'cal', today))).toBe('?view=league&comp=bra.1&date=2026-11-20');
  });
  it('Cups: switching competition keeps the How it has, else its first', () => {
    const fa = cupHowPage(open('?view=ucl'), 'eng.fa', 'sim', today);
    expect(pageSearch(fa)).toBe('?view=cups&cup=eng.fa&sim=1');
    expect(cupHowOf(cupHowPage(fa, 'uefa.champions', 'sim', today))).toBe('sim');
    // Pots exist only for the Champions League
    expect(cupHowOf(cupHowPage(open('?view=ucl&tab=pots'), 'eng.fa', 'pots', today))).toBe('main');
    // the World Cup's default is the bracket, Groups for 1950
    expect(cupHowOf(cupHowPage(fa, 'fifa.world', 'main', today))).toBe('bracket');
    expect(cupHowOf(open('?view=wc&year=1950'))).toBe('groups');
    expect(cupHowOf(cupHowPage(open('?view=wc&year=2002&how=groups'), 'eng.fa', 'groups', today))).toBe('main');
  });
  it('the Where tabs go back to the last league and cup', () => {
    const wc = open('?view=wc&year=2002');
    const away = whereTarget(wc, 'today', today);
    expect(cupOf(whereTarget(away, 'cups', today))).toBe('fifa.world');
    expect(leagueOf(whereTarget(open('?view=table&league=ita.1'), 'leagues', today))).toBe('ita.1');
    expect(whereTarget(open('?'), 'clubs', today).view).toBe('clubs');
    expect(whereTarget(open('?'), 'tools', today).view).toBe('trailing');
  });
  it('WC_NO_BRACKET is exactly the editions whose data has no knockout bracket', () => {
    const none = WC_YEARS.filter((y) => !bracket(JSON.parse(readFileSync(join(import.meta.dirname, `../public/worldcup/${y}.json`), 'utf8')) as WcEdition).length);
    expect(none).toEqual(WC_NO_BRACKET);
  });
});

describe('breadcrumb', () => {
  it('Cups › World Cup › 2002 › Bracket, each part with its siblings', () => {
    const p = open('?view=wc&year=2002');
    const c = crumbs(p, model, today);
    expect(c.map((x) => x.label)).toEqual(['Cups', 'World Cup', '2002', 'Bracket']);
    expect(c[0]!.items.map((x) => x.label)).toEqual(['Today', 'Clubs', 'Leagues', 'Cups', 'Tools']);
    expect(c[1]!.items.find((x) => x.on)?.label).toBe('World Cup');
    expect(c[2]!.items).toHaveLength(23);
    const y1998 = c[2]!.items.find((x) => x.label === '1998')!.page;
    expect(pageSearch(y1998)).toBe('?view=wc&year=1998');
    const groups = c[3]!.items.find((x) => x.label === 'Groups')!.page;
    expect(pageSearch(groups)).toBe('?view=wc&year=2002&how=groups');
  });
  it('a club: Clubs › its name (its league mates) › Calendar / List', () => {
    const c = crumbs(open(`?view=list&team=${team}`), model, today);
    expect(c.map((x) => x.label)).toEqual(['Clubs', model.team(team).name, 'List']);
    const league = model.clubById.get(team)!.league;
    expect(c[1]!.items.length).toBe(model.clubs.filter((x) => x.league === league).length);
    expect(c[1]!.items.every((x) => x.page.view === 'list')).toBe(true);
  });
  it('every place and How has a breadcrumb that ends on the page itself', () => {
    for (const s of ['', '?view=slate', '?view=clubs', '?view=table&league=eng.1', '?view=whatif', '?view=cups&cup=eng.fa&sim=1', '?view=trailing', '?view=history&comp=eng.1']) {
      const p = open(s);
      const c = crumbs(p, model, today);
      const last = c[c.length - 1]!;
      if (last.items.length) expect(pageSearch(last.items.find((x) => x.on)!.page)).toBe(pageSearch(p));
    }
  });
});

describe('Go anywhere', () => {
  const wc: WcTeamEdition[] = [
    { code: 'BRA', name: 'Brazil', year: 2002, reached: 'Winner' },
    { code: 'BRA', name: 'Brazil', year: 1998, reached: 'Runner-up' },
    { code: 'GER', name: 'Germany', year: 2002, reached: 'Runner-up' },
  ];
  const entries = searchEntries(open('?'), model, today, wc);
  it('"brazil 2002" → Brazil at the 2002 World Cup', () => {
    const [top] = searchFind(entries, 'brazil 2002');
    expect(top!.label).toBe('Brazil at the 2002 World Cup');
    expect(pageSearch(top!.page)).toBe('?view=wc&year=2002&team=BRA');
  });
  it('a club by name, accents and case ignored; a competition; an edition; a page', () => {
    const club = model.clubs.find((c) => /[À-ÿ]/.test(c.name)) ?? model.clubs[0]!;
    const plain = club.name.normalize('NFD').replace(/\p{M}/gu, '').toUpperCase();
    expect(searchFind(entries, plain)[0]!.page).toMatchObject({ view: 'cal', team: club.id });
    expect(pageSearch(searchFind(entries, 'premier league')[0]!.page)).toBe('?view=table&league=eng.1');
    expect(pageSearch(searchFind(entries, 'world cup 1970')[0]!.page)).toBe('?view=wc&year=1970');
    expect(searchFind(entries, 'slate')[0]!.page.view).toBe('slate');
    expect(pageSearch(searchFind(entries, 'fa cup simulator')[0]!.page)).toBe('?view=cups&cup=eng.fa&sim=1');
  });
  it('nothing typed: the places', () => {
    expect(searchFind(entries, '').map((e) => e.label)).toEqual(['Today', 'Clubs', 'Leagues', 'Cups', 'Tools']);
  });
});
