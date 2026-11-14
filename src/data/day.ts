// The day layer: one ESPN date's matches with live scores and 3-way odds, served by api/day.ts and merged by the page
// over the snapshot for the day on screen, so a final score shows a minute or two after full time.
// ESPN's `dates=YYYYMMDD` is a US Eastern day; the page asks for every Eastern date its local day touches.

import { COMPETITIONS, compInfo } from '../../config/competitions.ts';
import { decimalOdds, slimMatch, type EspnEvent } from './espn.ts';
import type { Match } from './snapshot.ts';

/** 3-way decimal odds and their provider. */
export interface Odds { h: number; d: number; a: number; p?: string }

export interface DayData {
  /** ESPN date, YYYYMMDD */
  date: string;
  fetchedAt: string;
  matches: Match[];
  odds: Record<string, Odds>;
}

/** Competitions the day function reads (every competition footykit shows). */
export const DAY_SLUGS = Object.keys(COMPETITIONS);

export const isEspnDate = (s: string | null): s is string => !!s && /^\d{8}$/.test(s);

type OddsLine = { open?: { odds?: string }; close?: { odds?: string } } | undefined;
type EspnOdds = {
  provider?: { name?: string };
  moneyline?: { home?: OddsLine; away?: OddsLine; draw?: OddsLine };
  homeTeamOdds?: { moneyLine?: number };
  awayTeamOdds?: { moneyLine?: number };
  drawOdds?: { moneyLine?: number };
};

function oddsOf(e: EspnEvent): Odds | undefined {
  const list = (e.competitions[0] as { odds?: (EspnOdds | null)[] } | undefined)?.odds ?? [];
  for (const o of list) {
    if (!o) continue;
    const line = (l: OddsLine, fallback?: number) => decimalOdds(l?.close?.odds ?? l?.open?.odds ?? fallback);
    const h = line(o.moneyline?.home, o.homeTeamOdds?.moneyLine);
    const d = line(o.moneyline?.draw, o.drawOdds?.moneyLine);
    const a = line(o.moneyline?.away, o.awayTeamOdds?.moneyLine);
    if (h && d && a) return o.provider?.name ? { h, d, a, p: o.provider.name } : { h, d, a };
  }
  return undefined;
}

/** One date's scoreboards → DayData. Odds only for matches not finished (a closed line is no longer news). */
export function dayFromBoards(date: string, boards: { slug: string; events: EspnEvent[] }[], fetchedAt: string): DayData {
  const matches: Match[] = [];
  const odds: Record<string, Odds> = {};
  for (const b of boards) {
    const league = compInfo(b.slug).kind === 'league';
    for (const e of b.events) {
      const m = slimMatch(e, b.slug, league);
      if (!m) continue;
      matches.push(m);
      if (m.st === 'pre') { const o = oddsOf(e); if (o) odds[m.id] = o; }
    }
  }
  matches.sort((a, b) => a.t.localeCompare(b.t) || a.id.localeCompare(b.id));
  return { date, fetchedAt, matches, odds };
}

const MIN = 60_000;

/** How long the CDN may keep a date's answer: 60 s while a match is live or within 2 h of kickoff (or kicked off
 * without a final), 1 day once every match is over and the date is past, 10 min otherwise. */
export function dayCacheSeconds(matches: Match[], now: number): number {
  const hot = matches.some((m) => {
    if (m.st === 'in') return true;
    const k = Date.parse(m.t);
    return m.st === 'pre' && !m.tbd && k - now < 120 * MIN && now - k < 180 * MIN;
  });
  if (hot) return 60;
  const allOver = matches.every((m) => m.st !== 'pre' && m.st !== 'in');
  const last = Math.max(0, ...matches.map((m) => Date.parse(m.t)));
  if (allOver && now - last > 6 * 60 * MIN) return 86400;
  return 600;
}
