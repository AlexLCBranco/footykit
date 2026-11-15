// The page on screen (view, day, team, span) and its pure helpers: the address it writes, the tab title, the page a
// team link opens. The widget raises page changes; only App.tsx touches the URL and history.

import type { LeagueSlug } from '../../config/season';
import { addDays, addMonths, dayLabel, monthLabel, monthOf, mondayOf, shortDay, type Model } from '../data/model';

/** day = the day's matches (list), slate = the day as cards, cal = Team Calendar, list = Team List, ucl = the Champions
 * League page, table = a league table, cups = the Libertadores / Sudamericana pages */
export type View = 'day' | 'slate' | 'cal' | 'list' | 'ucl' | 'table' | 'cups';
export type Span = 1 | 2 | 'month';

export interface Page {
  view: View;
  /** the day shown by day / slate, and the day the team views start from */
  day: string;
  /** team views */
  team?: string;
  /** the league table shown (view `table`) */
  league?: LeagueSlug;
  /** the cup shown (view `cups`) */
  cup?: string;
  span: Span;
  /** Team Calendar: first Monday shown (1 / 2 weeks) */
  week: string;
  /** Team Calendar month; Team List's last month */
  month: string;
  /** Team List's first month ("load earlier" moves it back) */
  listFrom: string;
}

export const SITE_NAME = 'footykit';

// the tables' order; a plain list so the main chunk doesn't carry the league rules (config/leagues.ts, lazy page)
export const LEAGUE_SLUGS: LeagueSlug[] = ['eng.1', 'esp.1', 'ita.1', 'ger.1', 'fra.1', 'bra.1'];
export const DEFAULT_LEAGUE: LeagueSlug = LEAGUE_SLUGS[0]!;
// the cups page's competitions (config/conmebol.ts holds their rules; a plain list keeps them out of the main chunk)
export const CUP_SLUGS = ['conmebol.libertadores', 'conmebol.sudamericana'];
export const DEFAULT_CUP = CUP_SLUGS[0]!;
export const isLeague = (x: unknown): x is LeagueSlug => LEAGUE_SLUGS.includes(x as LeagueSlug);

export function defaultPage(today: string): Page {
  return { view: 'day', day: today, span: 2, week: mondayOf(today), month: monthOf(today), listFrom: monthOf(today) };
}

/** A team view of `team` around `day` (team names and logos open the Team Calendar, keeping the span shown). */
export function teamPage(p: Page, team: string, day: string, view: View = 'cal'): Page {
  return { ...p, view, team, day, week: mondayOf(day), month: monthOf(day), listFrom: monthOf(day) };
}

/** The address of a page. The date is written for sharing but never read back: a fresh visit opens on today. */
export function pageSearch(p: Page): string {
  const q = new URLSearchParams();
  if (p.view !== 'day') q.set('view', p.view);
  if (p.team && (p.view === 'cal' || p.view === 'list')) q.set('team', p.team);
  if (p.view === 'cal') q.set('span', String(p.span));
  if (p.view === 'ucl') return `?${q}`;
  if (p.view === 'table') { q.set('league', p.league ?? DEFAULT_LEAGUE); return `?${q}`; }
  if (p.view === 'cups') { q.set('cup', p.cup ?? DEFAULT_CUP); return `?${q}`; }
  q.set('date', p.view === 'cal' ? (p.span === 'month' ? p.month : p.week) : p.view === 'list' ? p.month : p.day);
  return `?${q}`;
}

/** The page a fresh visit opens: the address's view, team and span, on today. */
export function pageFromSearch(search: string, today: string, model: Model): Page {
  const q = new URLSearchParams(search);
  const p = defaultPage(today);
  const view = q.get('view');
  const team = q.get('team') ?? undefined;
  const span = q.get('span');
  if (span === '1' || span === '2') p.span = Number(span) as 1 | 2;
  else if (span === 'month') p.span = 'month';
  if ((view === 'cal' || view === 'list') && team && model.followed.has(team)) {
    // a team link from another page (the Slate part's teamCalendarUrl) names the day to open around: `on=`.
    // A bookmark's `date=` is still never read.
    const on = q.get('on');
    if (on && /^\d{4}-\d{2}-\d{2}$/.test(on)) return teamPage(p, team, on, view);
    return { ...p, view, team };
  }
  if (view === 'slate' || view === 'ucl') return { ...p, view };
  if (view === 'cups') { const c = q.get('cup'); return { ...p, view, cup: c && CUP_SLUGS.includes(c) ? c : DEFAULT_CUP }; }
  if (view === 'table') { const l = q.get('league'); return { ...p, view, league: isLeague(l) ? l : DEFAULT_LEAGUE }; }
  return p;
}

export function isPage(x: unknown): x is Page {
  const p = x as Page;
  return !!p && typeof p === 'object' && ['day', 'slate', 'cal', 'list', 'ucl', 'table', 'cups'].includes(p.view) && typeof p.day === 'string' && typeof p.week === 'string' && typeof p.month === 'string' && typeof p.listFrom === 'string';
}

/** The tab title's page part, most specific first ("ARS · Nov 2026", "Slate · Sat, Nov 21"). */
export function pagePart(p: Page, model: Model): string {
  const abbr = p.team ? model.team(p.team).abbr : '';
  if (p.view === 'cal') {
    if (p.span === 'month') return `${abbr} · ${monthLabel(p.month, false)}`;
    return `${abbr} · ${shortDay(p.week)} – ${shortDay(addDays(p.week, 7 * p.span - 1))}`;
  }
  if (p.view === 'list') return `${abbr} list · ${p.listFrom === p.month ? monthLabel(p.month, false) : `${monthLabel(p.listFrom, false)} – ${monthLabel(p.month, false)}`}`;
  if (p.view === 'slate') return `Slate · ${dayLabel(p.day)}`;
  if (p.view === 'ucl') return 'Champions League';
  if (p.view === 'table') return `${model.comp(p.league ?? DEFAULT_LEAGUE).name} table`;
  if (p.view === 'cups') return model.comp(p.cup ?? DEFAULT_CUP).name;
  return dayLabel(p.day);
}

export const pageTitle = (p: Page, model: Model) => `${pagePart(p, model)} — ${SITE_NAME}`;

/** One step of the bar's ‹ › in the current view. */
export function stepPage(p: Page, dir: 1 | -1, model: Model): Page {
  if (p.view === 'ucl' || p.view === 'table' || p.view === 'cups') return p;
  if (p.view === 'cal') return p.span === 'month' ? { ...p, month: addMonths(p.month, dir) } : { ...p, week: addDays(p.week, 7 * dir * p.span) };
  if (p.view === 'list') return { ...p, month: addMonths(p.month, dir), listFrom: addMonths(p.month, dir) };
  // day and slate: every day, "no matches" days included (never skipped), within the season
  const day = addDays(p.day, dir);
  if (day < addDays(model.firstDay, -7) || day > addDays(model.lastDay, 7)) return p;
  return { ...p, day };
}
