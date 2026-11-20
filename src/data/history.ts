// FK-64: every competition's past seasons (public/history/<comp>/<year>.json, built by scripts/make-history.ts from
// ESPN's past scoreboards and standings): a league's final table (ESPN's official standings) with each team's last 5
// as squares, a cup's group tables and knockout bracket (ties from the matches, two legs added up), and a summary per
// competition: champions by season and who usually goes far.

import { bracketColumns, stageTies, type CupTie } from './cups.ts';
import type { Match, Table, Team } from './snapshot.ts';

/** The competitions with a history: the six leagues, the Champions League, the cups. */
export const HISTORY_COMPS = ['eng.1', 'esp.1', 'ita.1', 'ger.1', 'fra.1', 'bra.1', 'uefa.champions', 'conmebol.libertadores', 'conmebol.sudamericana', 'bra.copa_do_brazil', 'eng.fa', 'eng.league_cup', 'esp.copa_del_rey', 'ita.coppa_italia', 'ger.dfb_pokal', 'fra.coupe_de_france'];

export interface HistSeason {
  comp: string; year: number; label: string;
  teams: Record<string, Team>; matches: Match[]; tables: Table[];
}
export interface HistSummary {
  year: number; label: string;
  champion?: string; runnerUp?: string;
  /** league: places 1–4; cup: the semi-finalists */
  far: string[];
  /** league: the teams in ESPN's relegation places */
  relegated: string[];
  complete: boolean;
}
export interface HistIndex { [comp: string]: { name: string; kind: 'league' | 'cup'; seasons: HistSummary[]; teams: Record<string, string> } }

/** "2010-11" for a European season, "2010" for a calendar-year one (South America). */
export const seasonLabel = (year: number, calendar: boolean) => (calendar ? String(year) : `${year}-${String((year + 1) % 100).padStart(2, '0')}`);

const isRelegation = (z?: string) => !!z && /relegat/i.test(z) && !/play-?off|playoff/i.test(z);

/** The knockout rounds of a cup season in play order (a round = ESPN's stage name; group / league phases left out). */
export function koRounds(s: Pick<HistSeason, 'matches'>): { round: string; legs: 1 | 2; ties: CupTie[] }[] {
  const ko = s.matches.filter((m) => m.r && !/group|league stage|league phase|qualif/i.test(m.r) && m.st !== 'can');
  const names = [...new Set([...ko].sort((a, b) => a.t.localeCompare(b.t)).map((m) => m.r!))];
  // the final last, whatever its date
  names.sort((a, b) => Number(/^finals?$/i.test(a)) - Number(/^finals?$/i.test(b)));
  return names.map((round) => {
    const ms = ko.filter((m) => m.r === round);
    const per = new Map<string, number>();
    for (const m of ms) { const k = [m.h, m.a].sort().join(); per.set(k, (per.get(k) ?? 0) + 1); }
    const legs = (Math.max(...per.values()) >= 2 ? 2 : 1) as 1 | 2;
    return { round, legs, ties: stageTies(ms, round, legs) };
  });
}

/** The bracket: back from the final while each round has twice the next one's ties (16 at most), in bracket order. */
export function histBracket(s: Pick<HistSeason, 'matches'>) {
  const rounds = koRounds(s).filter((r) => r.round !== 'Third Place' && !/third/i.test(r.round));
  const fi = rounds.findIndex((r) => /^finals?$/i.test(r.round));
  if (fi < 0) return { bracket: [], earlier: rounds, cols: [] as CupTie[][] };
  let from = fi;
  while (from > 0 && rounds[from - 1]!.ties.length <= 16 && rounds[from - 1]!.ties.length === 2 * rounds[from]!.ties.length) from--;
  const bracket = rounds.slice(from, fi + 1);
  return { bracket, earlier: rounds.slice(0, from), cols: bracketColumns(bracket.map((r) => r.ties)) };
}

/** A season's champion, runner-up, the teams that went far and the relegated ones. */
export function summarize(s: HistSeason, kind: 'league' | 'cup'): HistSummary {
  const calendar = /^(bra|conmebol)\./.test(s.comp);
  const base = { year: s.year, label: seasonLabel(s.year, calendar) };
  if (kind === 'league') {
    const t = s.tables[0];
    const rows = t?.rows ?? [];
    const n = rows.length;
    // complete when every team played every other twice
    const complete = n > 0 && rows.every((r) => r.p === 2 * (n - 1));
    return { ...base, champion: complete ? rows[0]?.team : undefined, runnerUp: complete ? rows[1]?.team : undefined, far: rows.slice(0, 4).map((r) => r.team), relegated: rows.filter((r) => isRelegation(r.zone)).map((r) => r.team), complete };
  }
  const { bracket } = histBracket(s);
  const final = bracket[bracket.length - 1]?.ties[0];
  const semis = bracket.length >= 2 ? bracket[bracket.length - 2]!.ties.flatMap((t) => [t.a, t.b]) : [];
  const champion = final?.winner;
  return { ...base, champion, runnerUp: champion ? (champion === final!.a ? final!.b : final!.a) : undefined, far: semis, relegated: [], complete: !!champion };
}

export interface TeamRecord { team: string; titles: number; finals: number; far: number; relegated: number; seasons: number }
/** Who usually goes far: per team, titles, finals (runner-up), top 4 / semi-finals, relegations, seasons seen. */
export function records(seasons: HistSummary[], played: Map<string, number>): TeamRecord[] {
  const by = new Map<string, TeamRecord>();
  const get = (t: string) => { let r = by.get(t); if (!r) by.set(t, (r = { team: t, titles: 0, finals: 0, far: 0, relegated: 0, seasons: played.get(t) ?? 0 })); return r; };
  for (const s of seasons) {
    if (s.champion) get(s.champion).titles++;
    if (s.runnerUp) get(s.runnerUp).finals++;
    for (const t of s.far) get(t).far++;
    for (const t of s.relegated) get(t).relegated++;
  }
  return [...by.values()].sort((a, b) => b.titles - a.titles || b.finals - a.finals || b.far - a.far || a.relegated - b.relegated);
}

const BASE = `${import.meta.env?.BASE_URL ?? '/'}history/`;
const cache = new Map<string, Promise<unknown>>();
const load = <T,>(file: string): Promise<T> => {
  let p = cache.get(file);
  if (!p) { p = fetch(BASE + file).then((r) => { if (!r.ok) throw new Error(`${r.status} ${file}`); return r.json(); }); cache.set(file, p); p.catch(() => cache.delete(file)); }
  return p as Promise<T>;
};
export const loadHistIndex = () => load<HistIndex>('index.json');
export const loadHistSeason = (comp: string, year: number) => load<HistSeason>(`${comp}/${year}.json`);
