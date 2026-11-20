// FK-64: builds public/history/ — every competition footykit shows, each past season from ESPN's free data (the same
// API the snapshot job reads): all its matches (scoreboard by calendar year, `dates=YYYY`, kept by ESPN's season) and,
// for leagues and group stages, the season's final standings (`standings?season=YYYY`). Seasons go back as far as ESPN
// has them; the current season is left out (it's on the live pages). index.json holds each season's champion, the
// teams that went far, the relegated ones, for the summaries. Nothing is filled in by hand: a season ESPN has only in
// part is marked incomplete (no champion shown).
// `--check` also writes tests/fixtures/history-check.json: final tables worked out from football-data.co.uk's results
// (a second, independent source) for a few league seasons, which tests/history.test.ts compares with ESPN's.
// Run: npm run make-history [-- --check]

import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { compInfo } from '../config/competitions.ts';
import { slimMatch, teamsOf, type EspnEvent } from '../src/data/espn.ts';
import { HISTORY_COMPS, seasonLabel, summarize, type HistIndex, type HistSeason } from '../src/data/history.ts';
import type { Match, Team } from '../src/data/snapshot.ts';
import { tablesOf, type StandingsJson } from './snapshot/build.ts';

const OUT = join(import.meta.dirname, '..', 'public', 'history');
const SITE = 'https://site.api.espn.com/apis/site/v2/sports/soccer';
const STAND = 'https://site.api.espn.com/apis/v2/sports/soccer';

const NAMES: Record<string, string> = {
  'eng.1': 'Premier League', 'esp.1': 'LaLiga', 'ita.1': 'Serie A', 'ger.1': 'Bundesliga', 'fra.1': 'Ligue 1', 'bra.1': 'Brasileirão',
  'uefa.champions': 'Champions League', 'conmebol.libertadores': 'Libertadores', 'conmebol.sudamericana': 'Sudamericana', 'bra.copa_do_brazil': 'Copa do Brasil',
  'eng.fa': 'FA Cup', 'eng.league_cup': 'League Cup', 'esp.copa_del_rey': 'Copa del Rey', 'ita.coppa_italia': 'Coppa Italia', 'ger.dfb_pokal': 'DFB-Pokal', 'fra.coupe_de_france': 'Coupe de France',
};
const FIRST_YEAR = 2000;
/** the current seasons (on the live pages, not history): 2026-27 in Europe, 2026 in South America */
const CURRENT = 2026;

async function json<T>(url: string, tries = 4): Promise<T | undefined> {
  for (let i = 0; i < tries; i++) {
    try { const r = await fetch(url); if (r.ok) return (await r.json()) as T; } catch { /* retry */ }
    await new Promise((ok) => setTimeout(ok, 1500 * (i + 1)));
  }
  return undefined;
}

async function competition(comp: string) {
  const isLeague = compInfo(comp).kind === 'league';
  const events = new Map<string, EspnEvent & { season?: { year?: number } }>();
  for (let y = FIRST_YEAR; y <= CURRENT; y++) {
    const j = await json<{ events?: (EspnEvent & { season?: { year?: number } })[] }>(`${SITE}/${comp}/scoreboard?dates=${y}&limit=1000`);
    for (const e of j?.events ?? []) events.set(e.id, e);
  }
  const bySeason = new Map<number, { matches: Match[]; teams: Record<string, Team> }>();
  for (const e of events.values()) {
    const year = e.season?.year;
    if (!year || year >= CURRENT) continue;
    const m = slimMatch(e, comp, isLeague);
    // past seasons: a postponed fixture shows again on the day it was played; cancelled ones never were
    if (!m || m.st === 'can' || m.st === 'ppd') continue;
    let s = bySeason.get(year);
    if (!s) bySeason.set(year, (s = { matches: [], teams: {} }));
    s.matches.push(m);
    for (const t of teamsOf(e)) s.teams[t.id] = t;
  }
  const seasons: HistSeason[] = [];
  for (const [year, s] of [...bySeason].sort((a, b) => a[0] - b[0])) {
    if (s.matches.filter((m) => m.st === 'post').length < 2) continue;
    const st = await json<StandingsJson>(`${STAND}/${comp}/standings?season=${year}`);
    const tables = st ? tablesOf(st).filter((t) => t.rows.length) : [];
    s.matches.sort((a, b) => a.t.localeCompare(b.t));
    seasons.push({ comp, year, label: seasonLabel(year, /^(bra|conmebol)\./.test(comp)), teams: s.teams, matches: s.matches, tables });
  }
  return { isLeague, seasons };
}

/** football-data.co.uk's results for a season → each team's W D L GF GA Pts (3 a win). */
async function footballData(comp: string, year: number) {
  const code = { 'eng.1': 'E0', 'esp.1': 'SP1', 'ita.1': 'I1', 'ger.1': 'D1', 'fra.1': 'F1' }[comp];
  if (!code) return undefined;
  const yy = (n: number) => String(n % 100).padStart(2, '0');
  const r = await fetch(`https://www.football-data.co.uk/mmz4281/${yy(year)}${yy(year + 1)}/${code}.csv`);
  if (!r.ok) return undefined;
  const lines = (await r.text()).split(/\r?\n/).filter(Boolean);
  const head = lines[0]!.split(',');
  const col = (n: string) => head.indexOf(n);
  const rec: Record<string, number[]> = {};
  for (const l of lines.slice(1)) {
    const c = l.split(',');
    const h = c[col('HomeTeam')]!, a = c[col('AwayTeam')]!;
    const hg = Number(c[col('FTHG')]), ag = Number(c[col('FTAG')]);
    if (!h || Number.isNaN(hg)) continue;
    for (const [t, f, g] of [[h, hg, ag], [a, ag, hg]] as const) {
      const x = (rec[t] ??= [0, 0, 0, 0, 0, 0]);
      x[0]! += f > g ? 1 : 0; x[1]! += f === g ? 1 : 0; x[2]! += f < g ? 1 : 0; x[3]! += f; x[4]! += g; x[5]! += f > g ? 3 : f === g ? 1 : 0;
    }
  }
  return Object.values(rec);
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const index: HistIndex = {};
  const only = process.argv.find((a) => a.startsWith('--comp='))?.slice(7);
  // --reindex: rebuild index.json from the season files already saved (no download)
  const reindex = process.argv.includes('--reindex');
  for (const comp of only ? [only] : HISTORY_COMPS) {
    const { isLeague, seasons } = reindex
      ? { isLeague: compInfo(comp).kind === 'league', seasons: readdirSync(join(OUT, comp)).map((f) => JSON.parse(readFileSync(join(OUT, comp, f), 'utf8')) as HistSeason).sort((a, b) => a.year - b.year) }
      : await competition(comp);
    mkdirSync(join(OUT, comp), { recursive: true });
    const teams: Record<string, string> = {};
    for (const s of seasons) {
      if (!reindex) writeFileSync(join(OUT, comp, `${s.year}.json`), JSON.stringify(s));
      for (const t of Object.values(s.teams)) teams[t.id] = t.short ?? t.name;
    }
    const kind = isLeague ? 'league' : 'cup';
    index[comp] = { name: NAMES[comp] ?? comp, kind, seasons: seasons.map((s) => summarize(s, kind)), teams };
    const done = index[comp]!.seasons.filter((s) => s.complete);
    console.log(comp.padEnd(24), `${seasons.length} seasons, ${done.length} complete, first ${seasons[0]?.label}, first complete ${done[0]?.label}`);
  }
  if (!only) writeFileSync(join(OUT, 'index.json'), JSON.stringify(index));
  if (process.argv.includes('--check')) {
    const check: Record<string, Record<number, number[][]>> = {};
    for (const comp of ['eng.1', 'esp.1', 'ita.1', 'ger.1', 'fra.1']) for (const year of [2005, 2015, 2023]) {
      const t = await footballData(comp, year);
      if (t) (check[comp] ??= {})[year] = t;
    }
    writeFileSync(join(import.meta.dirname, '..', 'tests', 'fixtures', 'history-check.json'), JSON.stringify(check));
  }
}

await main();
