// FK-65: the shared layout's navigation (backlogkit's NAV_PATTERN.md), as pure functions over the page: the five Where
// places, each place's What (the thing looked at) and How (the way it's looked at), the breadcrumb with each part's
// siblings, and the "Go anywhere" search entries. The header and the page rows only draw what these return.

import type { LeagueSlug } from '../../config/season';
import type { Model } from '../data/model';
import { DEFAULT_TRAILING, TRAILING_COMPS } from '../data/trailing';
import { fold } from '../data/fold';
import {
  CUP_SLUGS, DEFAULT_CUP, DEFAULT_LEAGUE, LEAGUE_SLUGS, UCL_SLUG, WC_LATEST, WC_NO_BRACKET, WC_SLUG, WC_YEARS, cupPage, historyPage, isLeague,
  simLeague, teamClickPage, type Page,
} from './page';

export type Where = 'today' | 'clubs' | 'leagues' | 'cups' | 'tools';
export const WHERE: [Where, string, string][] = [
  ['today', 'Today', "The day's matches of every followed club"],
  ['clubs', 'Clubs', "One club's calendar and list"],
  ['leagues', 'Leagues', 'League tables, calendars, simulators and history'],
  ['cups', 'Cups', 'Champions League, Libertadores, the World Cup and the other cups'],
  ['tools', 'Tools', 'Smaller tools (goals while trailing)'],
];

/** The competitions on the Cups place's What row, in order. */
export const CUP_WHAT = [UCL_SLUG, ...CUP_SLUGS, WC_SLUG];

export const compName = (model: Model, slug: string) => (slug === WC_SLUG ? 'World Cup' : model.comp(slug).name);

/** The place a page belongs to. */
export function whereOf(p: Page): Where {
  switch (p.view) {
    case 'day': case 'slate': return 'today';
    case 'clubs': case 'cal': case 'list': return 'clubs';
    case 'table': return 'leagues';
    case 'whatif': return simLeague(p) ? 'leagues' : 'cups';
    case 'history': return isLeague(p.hcomp ?? DEFAULT_LEAGUE) ? 'leagues' : 'cups';
    case 'league': return isLeague(p.lcomp ?? DEFAULT_LEAGUE) ? 'leagues' : 'cups';
    case 'trailing': return 'tools';
    default: return 'cups';
  }
}

// ---------- Leagues ----------
export type LeagueHow = 'table' | 'cal' | 'sim' | 'history';
export const LEAGUE_HOWS: [LeagueHow, string, string][] = [
  ['table', 'Table', 'The table now, and round by round'],
  ['cal', 'Calendar', "Every game of the league, a day or a week at a time"],
  ['sim', 'Simulator', 'Pick the results left to play and see the table change'],
  ['history', 'History', 'Past seasons: final tables and champions'],
];

/** The league a page shows (or the last one shown, away from Leagues). */
export function leagueOf(p: Page): LeagueSlug {
  const c = p.view === 'history' ? p.hcomp : p.view === 'league' ? p.lcomp : p.view === 'whatif' ? simLeague(p) : p.league;
  return isLeague(c) ? c : p.league ?? DEFAULT_LEAGUE;
}
export function leagueHowOf(p: Page): LeagueHow {
  return p.view === 'league' ? 'cal' : p.view === 'whatif' ? 'sim' : p.view === 'history' ? 'history' : 'table';
}
/** League `l` looked at `how` (the calendar opens on today unless it already shows a day). */
export function leaguePage(p: Page, l: LeagueSlug, how: LeagueHow, today: string): Page {
  const base: Page = { ...p, league: l, team: undefined };
  if (how === 'cal') return { ...base, view: 'league', lcomp: l, day: p.view === 'league' ? p.day : today, lmode: p.view === 'league' ? p.lmode : undefined };
  if (how === 'sim') return { ...base, view: 'whatif', uclSim: false };
  if (how === 'history') return historyPage(base, l, p.view === 'history' && p.hcomp === l ? p.hseason : undefined);
  return { ...base, view: 'table' };
}

// ---------- Cups ----------
export type CupHow = 'main' | 'pots' | 'cal' | 'sim' | 'history' | 'groups' | 'bracket';
export function cupHows(cup: string): [CupHow, string, string][] {
  if (cup === WC_SLUG) return [
    ['groups', 'Groups', "Every group's final table"],
    ['bracket', 'Bracket', 'The knockout rounds'],
    ['sim', 'Simulator', 'Change results and see the tables and bracket update'],
  ];
  const sim: [CupHow, string, string] = ['sim', 'Simulator', cup === UCL_SLUG ? 'Pick the results left to play and see the table and the knockout places change' : 'Pick the winner of each tie still to play'];
  const rest: [CupHow, string, string][] = [['cal', 'Calendar', 'Every game of the cup, a day or a week at a time'], sim, ['history', 'History', 'Past seasons: brackets and champions']];
  if (cup === UCL_SLUG) return [['main', 'League phase', 'The league-phase table and the knockouts'], ['pots', 'Pots', 'The four pots of the draw'], ...rest];
  return [['main', 'Bracket', 'The bracket, groups and rules'], ...rest];
}

/** The cup a page shows (or the last one picked, away from Cups). */
export function cupOf(p: Page): string {
  if (p.view === 'ucl' || (p.view === 'whatif' && !simLeague(p))) return UCL_SLUG;
  if (p.view === 'wc') return WC_SLUG;
  if (p.view === 'cups') return p.cup ?? DEFAULT_CUP;
  if (p.view === 'history' && p.hcomp && !isLeague(p.hcomp)) return p.hcomp;
  if (p.view === 'league' && p.lcomp && !isLeague(p.lcomp)) return p.lcomp;
  return p.cup && CUP_WHAT.includes(p.cup) ? p.cup : UCL_SLUG;
}
export const wcYearOf = (p: Page) => p.wcYear ?? WC_LATEST;
/** The World Cup's How when none is picked: the bracket, or the groups for an edition without one. */
export const wcDefaultHow = (year: number): CupHow => (WC_NO_BRACKET.includes(year) ? 'groups' : 'bracket');
export function cupHowOf(p: Page): CupHow {
  switch (p.view) {
    case 'ucl': return p.uclTab === 'pots' ? 'pots' : 'main';
    case 'whatif': return 'sim';
    case 'cups': return p.cupSim ? 'sim' : 'main';
    case 'wc': return p.wcSim ? 'sim' : p.wcHow ?? wcDefaultHow(wcYearOf(p));
    case 'history': return 'history';
    case 'league': return 'cal';
    default: return 'main';
  }
}
/** Cup `cup` looked at `how`; a How the cup doesn't have falls back to its first. */
export function cupHowPage(p: Page, cup: string, how: CupHow, today: string): Page {
  const has = cupHows(cup).some(([h]) => h === how);
  const h: CupHow = has ? how : cup === WC_SLUG ? wcDefaultHow(wcYearOf(p)) : 'main';
  const base: Page = { ...p, cup, team: undefined };
  if (h === 'cal') return { ...base, view: 'league', lcomp: cup, day: p.view === 'league' ? p.day : today, lmode: p.view === 'league' ? p.lmode : undefined };
  if (h === 'history') return historyPage(base, cup, p.view === 'history' && p.hcomp === cup ? p.hseason : undefined);
  if (cup === WC_SLUG) {
    const keep = p.view === 'wc' ? { wcTeam: p.wcTeam } : { wcTeam: undefined };
    // the edition's default How is left out of the address (an old `?view=wc&year=…` link and a click land on the same page)
    return h === 'sim' ? { ...base, ...keep, view: 'wc', wcSim: true } : { ...base, ...keep, view: 'wc', wcSim: undefined, wcHow: (h === 'groups' || h === 'bracket') && h !== wcDefaultHow(wcYearOf(p)) ? h : undefined };
  }
  if (cup === UCL_SLUG) return h === 'sim' ? { ...base, view: 'whatif', uclSim: true } : { ...base, view: 'ucl', uclTab: h === 'pots' ? 'pots' : undefined };
  return { ...cupPage(base, cup), cupSim: h === 'sim' || undefined };
}
/** Another World Cup edition, the How kept. */
export const wcEditionPage = (p: Page, year: number): Page => ({ ...p, view: 'wc', cup: WC_SLUG, wcYear: year, wcAt: undefined });

// ---------- Today, Clubs, Tools ----------
export type TodayHow = 'day' | 'slate';
export const TODAY_HOWS: [TodayHow, string, string][] = [['day', 'List', "The day's matches as a list, with the travel map"], ['slate', 'Slate', "The day's matches as cards, with notes and odds"]];
export const CLUB_HOWS: ['cal' | 'list', string, string][] = [['cal', 'Calendar', "The club's matches on a calendar"], ['list', 'List', "The club's matches as a list"]];
export const TOOLS: ['trailing', string, string][] = [['trailing', 'Trailing', 'Goals scored while trailing, per competition']];
export const trailingComps = (model: Model) => TRAILING_COMPS.filter((c) => model.snap.comps[c]);

/** What a Where tab opens: the place as last seen where the page remembers it. */
export function whereTarget(p: Page, w: Where, today: string): Page {
  const base: Page = { ...p, team: undefined };
  if (w === 'today') return { ...base, view: 'day', day: today };
  if (w === 'clubs') return p.team && (p.view === 'cal' || p.view === 'list') ? p : { ...base, view: 'clubs' };
  if (w === 'leagues') return leaguePage(p, leagueOf(p), 'table', today);
  if (w === 'cups') { const c = cupOf(p); return cupHowPage(p, c, c === WC_SLUG ? wcDefaultHow(wcYearOf(p)) : 'main', today); }
  return { ...base, view: 'trailing', comp: p.comp ?? DEFAULT_TRAILING };
}

// ---------- breadcrumb ----------
export interface CrumbItem { label: string; page: Page; on: boolean }
export interface Crumb { label: string; items: CrumbItem[] }

export function crumbs(p: Page, model: Model, today: string): Crumb[] {
  const w = whereOf(p);
  const out: Crumb[] = [{ label: WHERE.find(([x]) => x === w)![1], items: WHERE.map(([x, label]) => ({ label, page: whereTarget(p, x, today), on: x === w })) }];
  if (w === 'today') {
    const v = p.view === 'slate' ? 'slate' : 'day';
    out.push({ label: TODAY_HOWS.find(([h]) => h === v)![1], items: TODAY_HOWS.map(([h, label]) => ({ label, page: { ...p, view: h }, on: h === v })) });
  } else if (w === 'clubs') {
    if (p.team && (p.view === 'cal' || p.view === 'list')) {
      const club = model.clubById.get(p.team);
      const mates = model.clubs.filter((c) => c.league === club?.league).sort((a, b) => a.name.localeCompare(b.name));
      out.push({ label: model.team(p.team).name, items: mates.map((c) => ({ label: c.name, page: { ...teamClickPage(p, c.id, today, today), view: p.view }, on: c.id === p.team })) });
      out.push({ label: p.view === 'list' ? 'List' : 'Calendar', items: CLUB_HOWS.map(([h, label]) => ({ label, page: { ...p, view: h }, on: h === p.view })) });
    }
  } else if (w === 'leagues') {
    const l = leagueOf(p), how = leagueHowOf(p);
    out.push({ label: model.comp(l).name, items: LEAGUE_SLUGS.map((x) => ({ label: model.comp(x).name, page: leaguePage(p, x, how, today), on: x === l })) });
    out.push({ label: LEAGUE_HOWS.find(([h]) => h === how)![1], items: LEAGUE_HOWS.map(([h, label]) => ({ label, page: leaguePage(p, l, h, today), on: h === how })) });
    if (how === 'history' && p.hseason) out.push({ label: String(p.hseason), items: [] });
  } else if (w === 'cups') {
    const c = cupOf(p), how = cupHowOf(p);
    out.push({ label: compName(model, c), items: CUP_WHAT.map((x) => ({ label: compName(model, x), page: cupHowPage(p, x, how, today), on: x === c })) });
    if (c === WC_SLUG) {
      const y = wcYearOf(p);
      out.push({ label: String(y), items: [...WC_YEARS].reverse().map((x) => ({ label: String(x), page: wcEditionPage(p, x), on: x === y })) });
    }
    const hows = cupHows(c);
    out.push({ label: hows.find(([h]) => h === how)?.[1] ?? hows[0]![1], items: hows.map(([h, label]) => ({ label, page: cupHowPage(p, c, h, today), on: h === how })) });
  } else {
    out.push({ label: 'Trailing', items: TOOLS.map(([v, label]) => ({ label, page: { ...p, view: v }, on: p.view === v })) });
    const comp = p.comp ?? DEFAULT_TRAILING;
    out.push({ label: model.comp(comp).name, items: trailingComps(model).map((c) => ({ label: model.comp(c).name, page: { ...p, comp: c }, on: c === comp })) });
  }
  return out;
}

// ---------- Go anywhere ----------
export interface WcTeamEdition { code: string; name: string; year: number; reached: string }
export interface SearchEntry { label: string; kind: string; keys: string; page: Page; rank: number }

const entry = (label: string, kind: string, extra: string, page: Page, rank: number): SearchEntry => ({ label, kind, keys: fold(`${label} ${extra}`), page, rank });

/** Every place, competition (in each of its Hows), club and World Cup edition; with the World Cup index loaded, every
 * team at every edition ("brazil 2002" → Brazil's 2002 World Cup). */
export function searchEntries(p: Page, model: Model, today: string, wc: WcTeamEdition[] = []): SearchEntry[] {
  const out: SearchEntry[] = [];
  for (const [w, label, tip] of WHERE) out.push(entry(label, 'Place', tip, whereTarget(p, w, today), 0));
  out.push(entry('Slate', 'Today', 'cards notes odds', { ...p, view: 'slate', day: today, team: undefined }, 1));
  out.push(entry('Trailing', 'Tools', 'goals while trailing', { ...p, view: 'trailing', team: undefined }, 1));
  for (const l of LEAGUE_SLUGS) {
    const c = model.comp(l);
    for (const [h, how] of LEAGUE_HOWS) out.push(entry(h === 'table' ? c.name : `${c.name} · ${how}`, 'League', `${c.code} ${how} league`, leaguePage(p, l, h, today), h === 'table' ? 1 : 2));
  }
  for (const cup of CUP_WHAT) {
    const name = compName(model, cup);
    const code = cup === WC_SLUG ? 'WC fifa' : model.comp(cup).code;
    for (const [h, how] of cupHows(cup)) out.push(entry(h === 'main' ? name : `${name} · ${how}`, 'Cup', `${code} ${how} cup`, cupHowPage(p, cup, h, today), h === 'main' ? 1 : 2));
  }
  for (const c of model.clubs) {
    const t = model.team(c.id);
    out.push(entry(c.name, 'Club', `${t.short} ${t.abbr} ${model.comp(c.league).name}`, teamClickPage(p, c.id, today, today), 1));
  }
  for (const y of WC_YEARS) out.push(entry(`World Cup ${y}`, 'World Cup', `wc fifa ${y}`, wcEditionPage({ ...p, wcTeam: undefined }, y), 2));
  for (const t of wc) out.push(entry(`${t.name} at the ${t.year} World Cup`, 'World Cup', `${t.code} ${t.reached} wc fifa`, { ...wcEditionPage(p, t.year), wcTeam: t.code }, 3));
  return out;
}

/** The entries matching every word of `query` (any order, case and accents ignored), best first. */
export function searchFind(entries: SearchEntry[], query: string, limit = 12): SearchEntry[] {
  const words = fold(query).split(/\s+/).filter(Boolean);
  if (!words.length) return entries.filter((e) => e.rank === 0);
  const q = fold(query).trim();
  return entries
    .filter((e) => words.every((w) => e.keys.includes(w)))
    .map((e) => ({ e, s: (fold(e.label) === q ? 0 : fold(e.label).startsWith(q) ? 1 : words.every((w) => fold(e.label).includes(w)) ? 2 : 3) * 10 + e.rank }))
    .sort((a, b) => a.s - b.s || a.e.label.length - b.e.label.length)
    .slice(0, limit)
    .map((x) => x.e);
}
