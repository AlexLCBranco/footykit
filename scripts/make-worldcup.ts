// FK-59: builds the World Cup history files in public/worldcup/ (one per edition + index.json) from free sources:
//   - 1930–2022: the Fjelstul World Cup Database (CC-BY-SA 4.0, © 2023 Joshua C. Fjelstul, Ph.D.,
//     https://www.github.com/jfjelstul/worldcup): matches, venues, scorers, official group standings.
//   - 2026: openfootball's worldcup.json (public domain, https://github.com/openfootball/worldcup.json): results,
//     scorers, host city (no stadium names), FIFA team codes; the round-of-32 third-place combinations (Annex C of the
//     regulations) from Wikipedia's "2026 FIFA World Cup third-place table".
// Nothing is typed in by hand: a part a source lacks is left out and the page says it is missing.
// `--wiki` also writes tests/fixtures/wc-wiki-tables.json: Wikipedia's final group tables for the editions the tests
// check against a second source (see tests/worldcup.test.ts). Run: npm run make-worldcup [-- --wiki]

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { reached } from '../src/data/worldcup.ts';

const OUT = join(import.meta.dirname, '..', 'public', 'worldcup');
const FJ = 'https://raw.githubusercontent.com/jfjelstul/worldcup/master/data-csv/';
const OF = 'https://raw.githubusercontent.com/openfootball/worldcup.json/master/';
const WIKI = 'https://en.wikipedia.org/w/api.php?action=parse&prop=wikitext&format=json&formatversion=2&page=';
const UA = { 'User-Agent': 'footykit-data/1.0 (World Cup history build)' };

async function get(url: string, tries = 6): Promise<string> {
  const r = await fetch(url, { headers: UA });
  // Wikipedia rate-limits bursts: wait and retry
  if (r.status === 429 && tries > 1) { await new Promise((ok) => setTimeout(ok, 4000 * (7 - tries))); return get(url, tries - 1); }
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.text();
}

/** RFC 4180 CSV → rows of objects. */
function csv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i]!;
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(cell); cell = ''; } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const [head, ...body] = rows;
  return body.filter((r) => r.length === head!.length).map((r) => Object.fromEntries(head!.map((h, i) => [h, r[i]!])));
}

// ---- the edition file's shape (read by src/data/worldcup.ts, which re-declares it) ----
type Goal = [side: 0 | 1, name: string, minute: string, kind?: 'og' | 'pen'];
interface WcMatch {
  n: number; stage: string; group?: string; date: string; time?: string; venue?: string; city?: string;
  h: string; a: string; s: [number, number]; et?: [number, number]; p?: [number, number];
  replay?: boolean; playoff?: boolean; walkover?: boolean; goals?: Goal[];
}
interface WcGroup { name: string; stage: string; order: string[]; adv: string[] }
interface WcEdition {
  year: number; host: string; champion: string; win: 2 | 3;
  teams: Record<string, string>; matches: WcMatch[]; groups: WcGroup[];
  thirds?: { adv: string[] };
  scorers: 'full' | 'partial' | 'none'; venues: 'stadium' | 'city';
  thirdsTable?: { groups: string; vs: Record<string, string> }[];
  /** 2026: FIFA's code of each team (ids are the earlier editions' codes) */
  fifa?: Record<string, string>;
  source: string[];
}

const STAGE: Record<string, string> = {
  // the standings file names the first group stage "first group stage" / "first round" where the matches say "group stage"
  'group stage': 'Group stage', 'first group stage': 'Group stage', 'first round': 'Group stage', 'second group stage': 'Second group stage', 'final round': 'Final round',
  'round of 16': 'Round of 16', 'quarter-finals': 'Quarter-finals', 'semi-finals': 'Semi-finals',
  'third-place match': 'Third place', final: 'Final',
};
const FJ_SRC = 'Fjelstul World Cup Database (CC-BY-SA 4.0, © 2023 Joshua C. Fjelstul, Ph.D.) https://www.github.com/jfjelstul/worldcup';
const OF_SRC = 'openfootball worldcup.json (public domain) https://github.com/openfootball/worldcup.json';

async function fjelstul(): Promise<WcEdition[]> {
  const [matches, goals, standings, tournaments] = await Promise.all(['matches', 'goals', 'group_standings', 'tournaments'].map(async (f) => csv(await get(`${FJ}${f}.csv`))));
  const men = (r: Record<string, string>) => r.tournament_name!.includes("Men's");
  const goalsBy = new Map<string, Record<string, string>[]>();
  for (const g of goals!.filter(men)) { const l = goalsBy.get(g.match_id!) ?? []; l.push(g); goalsBy.set(g.match_id!, l); }
  const out: WcEdition[] = [];
  for (const t of tournaments!.filter(men)) {
    const tid = t.tournament_id!;
    const year = Number(t.year);
    const teams: Record<string, string> = {};
    const ms = matches!.filter((m) => m.tournament_id === tid);
    const seen = new Map<string, number>();
    let withGoals = 0, scored = 0;
    const wm: WcMatch[] = ms.map((m, i) => {
      const h = m.home_team_code!, a = m.away_team_code!;
      teams[h] = m.home_team_name!; teams[a] = m.away_team_name!;
      const hs = Number(m.home_team_score), as = Number(m.away_team_score);
      const et = m.extra_time === '1';
      const gl = (goalsBy.get(m.match_id!) ?? []).sort((x, y) => Number(x.minute_regulation) + Number(x.minute_stoppage) / 100 - Number(y.minute_regulation) - Number(y.minute_stoppage) / 100);
      const total = hs + as;
      if (total) scored++;
      const full = gl.length === total;
      if (total && full) withGoals++;
      const goalsOut: Goal[] | undefined = full && total ? gl.map((g) => {
        const name = [g.given_name === 'not applicable' ? '' : g.given_name, g.family_name].filter(Boolean).join(' ');
        const kind = g.own_goal === '1' ? 'og' : g.penalty === '1' ? 'pen' : undefined;
        return [g.team_id === m.home_team_id ? 0 : 1, name, g.minute_label!.replace(/'/g, '’'), ...(kind ? [kind] : [])] as Goal;
      }) : undefined;
      // the 90' score: the goals outside extra time (only when every goal is in the data)
      let s: [number, number] = [hs, as];
      if (et) {
        if (goalsOut) s = [0, 1].map((side) => gl.filter((g) => !g.match_period!.includes('extra time') && (g.team_id === m.home_team_id ? 0 : 1) === side).length) as [number, number];
        else s = [Math.min(hs, as), Math.min(hs, as)]; // level after 90' (that's why extra time was played)
      }
      const group = m.group_name === 'not applicable' ? undefined : m.group_name;
      // a second meeting of two teams in one group is a play-off (1954, 1958), not counted in the table
      const key = `${m.stage_name}|${group}|${[h, a].sort().join('-')}`;
      const playoff = !!group && seen.has(key);
      seen.set(key, i);
      const pen = m.penalty_shootout === '1';
      return {
        n: i + 1, stage: STAGE[m.stage_name!] ?? m.stage_name!, ...(group ? { group } : {}), date: m.match_date!, time: m.match_time,
        venue: m.stadium_name, city: m.city_name, h, a, s,
        ...(et ? { et: [hs, as] as [number, number] } : {}),
        ...(pen ? { p: [Number(m.home_team_score_penalties), Number(m.away_team_score_penalties)] as [number, number] } : {}),
        ...(m.replay === '1' ? { replay: true } : {}), ...(playoff ? { playoff: true } : {}),
        ...(goalsOut ? { goals: goalsOut } : {}),
      };
    });
    const st = standings!.filter((r) => r.tournament_id === tid);
    const groups: WcGroup[] = [];
    for (const r of st) {
      const stage = STAGE[r.stage_name!] ?? r.stage_name!;
      let g = groups.find((x) => x.name === r.group_name && x.stage === stage);
      if (!g) groups.push((g = { name: r.group_name!, stage, order: [], adv: [] }));
      g.order[Number(r.position) - 1] = r.team_code!;
      if (r.advanced === '1') g.adv.push(r.team_code!);
    }
    // the standings and the matches can name a group differently (1982's second round: "Group A" vs "Group 1"):
    // the matches take the standings' name of the group with the same teams
    for (const g of groups) {
      if (wm.some((m) => m.stage === g.stage && m.group === g.name)) continue;
      const set = [...g.order].sort().join();
      // (1950's final round matches have no group name at all)
      const names = [...new Set(wm.filter((m) => m.stage === g.stage).map((m) => m.group))];
      const at = names.findIndex((nm) => [...new Set(wm.filter((m) => m.stage === g.stage && m.group === nm).flatMap((m) => [m.h, m.a]))].sort().join() === set);
      if (at < 0) throw new Error(`${year} ${g.stage} ${g.name}: no matches`);
      const hit = names[at];
      for (const m of wm) if (m.stage === g.stage && m.group === hit) m.group = `\u0000${g.name}`;
    }
    for (const m of wm) if (m.group?.startsWith('\u0000')) m.group = m.group.slice(1);
    const champ = Object.entries(teams).find(([, n]) => n === t.winner)?.[0] ?? t.winner!;
    out.push({
      year, host: t.host_country!, champion: champ, win: year >= 1994 ? 3 : 2, teams, matches: wm, groups,
      scorers: withGoals === scored ? 'full' : withGoals ? 'partial' : 'none', venues: 'stadium', source: [FJ_SRC],
    });
  }
  return out;
}

/** "13:00 UTC-6" → "13:00" (local time, as the other editions). */
const localTime = (t?: string) => t?.split(' ')[0];

interface OfGoal { name: string; minute: string; penalty?: boolean; owngoal?: boolean }
interface OfMatch { num?: number; round: string; group?: string; date: string; time?: string; ground?: string; team1: string; team2: string; score: { ft: [number, number]; et?: [number, number]; p?: [number, number] }; goals1?: OfGoal[]; goals2?: OfGoal[] }

// openfootball's short names → the names the other editions (and Wikipedia's squad sections) use
const NAME_2026: Record<string, string> = { USA: 'United States', 'Bosnia & Herzegovina': 'Bosnia and Herzegovina' };

async function openfootball2026(earlier: WcEdition[]): Promise<WcEdition> {
  const j = JSON.parse(await get(`${OF}2026/worldcup.json`)) as { matches: OfMatch[] };
  const tj = JSON.parse(await get(`${OF}2026/worldcup.teams.json`)) as { name: string; fifa_code: string }[];
  // one id per team across editions: the earlier editions' code when the name matches one (they use ISO-style codes,
  // e.g. DEU, where 2026 has FIFA's GER), else FIFA's; `fifa` keeps FIFA's code for each
  const byName = new Map<string, string>();
  for (const e of earlier) for (const [c, n] of Object.entries(e.teams)) byName.set(n, c);
  const fifaOf = new Map(tj.map((t) => [t.name, t.fifa_code]));
  const teams: Record<string, string> = {};
  const fifa: Record<string, string> = {};
  const id = (raw: string) => {
    const f = fifaOf.get(raw); if (!f) throw new Error(`no code for ${raw}`);
    const name = NAME_2026[raw] ?? raw;
    const c = byName.get(name) ?? f;
    teams[c] = name; fifa[c] = f;
    return c;
  };
  const STAGE26: Record<string, string> = { 'Round of 32': 'Round of 32', 'Round of 16': 'Round of 16', 'Quarter-final': 'Quarter-finals', 'Semi-final': 'Semi-finals', 'Match for third place': 'Third place', Final: 'Final' };
  let scored = 0, withGoals = 0;
  const matches: WcMatch[] = j.matches.map((m, i) => {
    const sc = m.score as { ft: [number, number]; et?: [number, number]; p?: [number, number] };
    const h = id(m.team1), a = id(m.team2);
    const g1 = (m.goals1 ?? []) as { name: string; minute: string; penalty?: boolean; owngoal?: boolean }[];
    const g2 = (m.goals2 ?? []) as typeof g1;
    const fin = sc.et ?? sc.ft;
    const total = fin[0] + fin[1];
    if (total) scored++;
    const full = g1.length + g2.length === total && (m.goals1 || m.goals2);
    if (total && full) withGoals++;
    const goals: Goal[] | undefined = full && total ? [...g1.map((g) => [0, g] as const), ...g2.map((g) => [1, g] as const)]
      .map(([side, g]) => [side, g.name, `${g.minute}’`, ...(g.owngoal ? ['og'] : g.penalty ? ['pen'] : [])] as Goal)
      .sort((x, y) => parseFloat(x[2].replace('+', '.')) - parseFloat(y[2].replace('+', '.'))) : undefined;
    return {
      n: m.num ?? i + 1, stage: m.group ? 'Group stage' : STAGE26[m.round] ?? m.round, ...(m.group ? { group: m.group } : {}),
      date: m.date, time: localTime(m.time), city: m.ground, h, a, s: sc.ft,
      ...(sc.et ? { et: sc.et } : {}), ...(sc.p ? { p: sc.p } : {}), ...(goals ? { goals } : {}),
    };
  });
  const groups: WcGroup[] = [...new Set(matches.filter((m) => m.group).map((m) => m.group!))].sort().map((name) => ({
    name, stage: 'Group stage', order: [...new Set(matches.filter((m) => m.group === name).flatMap((m) => [m.h, m.a]))], adv: [],
  }));
  const final = matches.find((m) => m.stage === 'Final')!;
  const fs = final.et ?? final.s;
  const champion = final.p ? (final.p[0] > final.p[1] ? final.h : final.a) : fs[0] > fs[1] ? final.h : final.a;
  return {
    year: 2026, host: 'Canada, Mexico, United States', champion, win: 3, teams, fifa, matches, groups,
    scorers: withGoals === scored ? 'full' : withGoals ? 'partial' : 'none', venues: 'city',
    thirdsTable: await thirdsTable2026(),
    source: [OF_SRC, 'Wikipedia, Template:2026 FIFA World Cup third-place table (Annex C of the FIFA World Cup 2026 Regulations)'],
  };
}

const wikitext = async (page: string): Promise<string | undefined> => {
  const j = JSON.parse(await get(WIKI + encodeURIComponent(page))) as { parse?: { wikitext: string } };
  return j.parse?.wikitext;
};

/** Annex C: for each set of eight groups whose third-placed teams go through, which third meets which group winner. */
async function thirdsTable2026() {
  const w = (await wikitext('Template:2026 FIFA World Cup third-place table'))!;
  const head = w.slice(0, w.indexOf('! scope="row"'));
  const winners = [...head.matchAll(/\|\s*(1[A-L])<br>vs/g)].map((m) => m[1]!);
  if (winners.length !== 8) throw new Error('third-place table: header changed');
  const rows = w.split(/\n\|-[^\n]*\n/).filter((r) => /^! scope="row" \| \d+/.test(r.trim()));
  const out = rows.map((r) => {
    const cells = r.trim().replace(/^! scope="row" \| \d+\*?\n\|/, '').replace(/\n! rowspan="495" \|\n\|/, ' ||').split('||').map((c) => c.trim());
    const groups = cells.slice(0, 12).map((c) => c.replace(/'''/g, '')).filter(Boolean).join('');
    const vs = Object.fromEntries(cells.slice(12, 20).map((c, i) => [winners[i]!, /3[A-L]/.exec(c)?.[0] ?? c]));
    return { groups, vs };
  });
  if (out.length !== 495 || out.some((r) => r.groups.length !== 8 || Object.values(r.vs).some((v) => !/^3[A-L]$/.test(v)))) throw new Error(`third-place table: parsed ${out.length} rows badly`);
  return out;
}

// ---- Wikipedia final group tables (the second source the tests compare with) ----
type WikiTable = { order: string[]; rows: Record<string, [w: number, d: number, l: number, gf: number, ga: number]> };
function sportsTables(w: string): WikiTable[] {
  const out: WikiTable[] = [];
  for (const m of w.matchAll(/#invoke:\s*Sports table\s*\|\s*main/gi)) {
    let depth = 0, i = m.index! - 2, end = i;
    for (; i < w.length; i++) { if (w.startsWith('{{', i)) { depth++; i++; } else if (w.startsWith('}}', i)) { depth--; i++; if (!depth) { end = i; break; } } }
    const b = w.slice(m.index!, end);
    let order = (/team_order\s*=\s*([^|\n]+)/.exec(b)?.[1] ?? '').split(',').map((s) => s.trim()).filter(Boolean);
    // older pages list the order as team1= … teamN=
    if (!order.length) order = [...b.matchAll(/\|\s*team(\d+)\s*=\s*([A-Z]{3})\b/g)].sort((x, y) => Number(x[1]) - Number(y[1])).map((m) => m[2]!);
    if (!order.length) continue;
    const n = (k: string, t: string) => Number(new RegExp(`\\|\\s*${k}_${t}\\s*=\\s*(\\d+)`).exec(b)?.[1] ?? NaN);
    out.push({ order, rows: Object.fromEntries(order.map((t) => [t, [n('win', t), n('draw', t), n('loss', t), n('gf', t), n('ga', t)]])) });
  }
  return out;
}
async function wikiTables(year: number): Promise<WikiTable[]> {
  const main = (await wikitext(`${year} FIFA World Cup`))!;
  const pages = new Set<string>();
  for (const m of main.matchAll(/\{\{:([^|}]+)\|transcludesection=standings/gi)) pages.add(m[1]!.trim());
  for (const m of main.matchAll(/\{\{(\d{4} FIFA World Cup group tables)\|/g)) pages.add(`Template:${m[1]}`);
  const tables: WikiTable[] = sportsTables(main);
  for (const p of pages) tables.push(...sportsTables((await wikitext(p)) ?? ''));
  // one table per group (a page may repeat one)
  return tables.filter((t, i) => tables.findIndex((x) => JSON.stringify(x) === JSON.stringify(t)) === i);
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const old = await fjelstul();
  const eds = [...old, await openfootball2026(old)];
  for (const e of eds) writeFileSync(join(OUT, `${e.year}.json`), JSON.stringify(e));
  writeFileSync(join(OUT, 'index.json'), JSON.stringify(eds.map((e) => ({ year: e.year, host: e.host, champion: e.champion, championName: e.teams[e.champion], teams: Object.keys(e.teams).length,
    reached: Object.fromEntries(Object.entries(reached(e as never)).map(([c, r]) => [c, [e.teams[c], r]])) }))));
  writeFileSync(join(OUT, 'LICENSE.md'), `World Cup data for 1930–2022 is derived from the Fjelstul World Cup Database\n© 2023 Joshua C. Fjelstul, Ph.D., https://www.github.com/jfjelstul/worldcup, licensed CC-BY-SA 4.0\n(https://creativecommons.org/licenses/by-sa/4.0/legalcode). Modifications: reshaped to one file per edition,\n90-minute scores worked out from the goal minutes. These derived files are under the same CC-BY-SA 4.0 license.\n\n2026 data: openfootball worldcup.json (public domain); third-place combinations from Wikipedia (CC-BY-SA 4.0).\n`);
  for (const e of eds) console.log(e.year, e.matches.length, 'matches', Object.keys(e.teams).length, 'teams', 'scorers', e.scorers, e.groups.length, 'groups');
  if (process.argv.includes('--wiki')) {
    const fx: Record<number, WikiTable[]> = {};
    for (const y of [1982, 1994, 2014, 2022, 2026]) { fx[y] = await wikiTables(y); console.log('wiki', y, fx[y].length, 'tables'); }
    writeFileSync(join(import.meta.dirname, '..', 'tests', 'fixtures', 'wc-wiki-tables.json'), JSON.stringify(fx));
  }
}

await main();
