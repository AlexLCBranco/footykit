// Phase 1 data check: does ESPN's free, keyless API have everything footykit needs, for every followed club?
// Usage: npm run data-check   → prints a summary, writes docs/phase1-data-check.md, exits 1 if a required check fails.
// Required = league + domestic cups + continental competitions for every club. State championships only warn.
// Each club's own all-competitions feed is cross-checked against each competition's scoreboard, so a match missing
// from the club feed is caught even when the competition itself is covered.

import { writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { gzipSync } from 'node:zlib';
import { CONTINENTAL, DOMESTIC_CUPS, FOLLOWED, LEAGUE_SEASON_YEAR, SEASON_CALENDAR_YEARS, STATE_PREFIX, type LeagueSlug } from '../config/season.ts';
import { SITE, STANDINGS, aggregateOf, type EspnEvent } from '../src/data/espn.ts';
import { competitionState, isPhaseRound, type CompetitionState } from '../src/data/ko.ts';

// ---------- fetching (cached, retried, a few at a time) ----------
let requests = 0;
const cache = new Map<string, Promise<unknown>>();
const slots = { free: 6, queue: [] as (() => void)[] };
async function slot<T>(fn: () => Promise<T>): Promise<T> {
  if (slots.free === 0) await new Promise<void>((r) => slots.queue.push(r));
  slots.free--;
  try { return await fn(); } finally { slots.free++; slots.queue.shift()?.(); }
}
type Json = Record<string, unknown> & { __status?: number };
function get(url: string): Promise<Json> {
  if (!cache.has(url)) {
    cache.set(url, slot(async () => {
      for (let attempt = 1; ; attempt++) {
        requests++;
        try {
          const r = await fetch(url, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(20000) });
          if (r.ok) return (await r.json()) as Json;
          if (attempt >= 3 || r.status < 500) return { __status: r.status };
        } catch (e) {
          if (attempt >= 3) return { __status: -1, __error: String(e) };
        }
        await new Promise((r) => setTimeout(r, 1000 * attempt));
      }
    }));
  }
  return cache.get(url) as Promise<Json>;
}

// ---------- followed clubs ----------
interface Club { id: string; abbr: string; name: string; league: LeagueSlug; region: 'europe' | 'southAmerica' }
const regionOf = (l: LeagueSlug) => (l === 'bra.1' ? 'southAmerica' : 'europe') as Club['region'];
type TeamsJson = { sports?: { leagues?: { teams?: { team: { id: string; abbreviation: string; displayName: string } }[] }[] }[] };
async function teamsOf(slug: string) {
  const j = (await get(`${SITE}/${slug}/teams`)) as TeamsJson;
  return j.sports?.[0]?.leagues?.[0]?.teams?.map((t) => t.team) ?? [];
}

async function followedClubs(): Promise<{ clubs: Club[]; leagueSize: Map<LeagueSlug, number> }> {
  const leagues = new Set<LeagueSlug>([...FOLLOWED.allClubsOf, ...FOLLOWED.ifIn.leagues, ...FOLLOWED.extraClubs.map((x) => x.league)]);
  const leagueSize = new Map<LeagueSlug, number>();
  const byLeague = new Map<LeagueSlug, Awaited<ReturnType<typeof teamsOf>>>();
  for (const l of leagues) { const t = await teamsOf(l); byLeague.set(l, t); leagueSize.set(l, t.length); }
  const inComp = new Set((await teamsOf(FOLLOWED.ifIn.competition)).map((t) => t.id));
  const clubs: Club[] = [];
  const add = (l: LeagueSlug, t: { id: string; abbreviation: string; displayName: string }) => {
    if (!clubs.some((c) => c.id === t.id)) clubs.push({ id: t.id, abbr: t.abbreviation, name: t.displayName, league: l, region: regionOf(l) });
  };
  for (const l of FOLLOWED.allClubsOf) for (const t of byLeague.get(l) ?? []) add(l, t);
  for (const l of FOLLOWED.ifIn.leagues) for (const t of byLeague.get(l) ?? []) if (inComp.has(t.id)) add(l, t);
  for (const x of FOLLOWED.extraClubs) { const t = byLeague.get(x.league)?.find((t) => t.id === x.espnId); if (t) add(x.league, t); else throw new Error(`extra club ${x.espnId} not in ${x.league}`); }
  return { clubs, leagueSize };
}

// ---------- events ----------
const slugOf = (e: EspnEvent) => e.league?.slug ?? '?';
const comp0 = (e: EspnEvent) => e.competitions[0]!;
const has = (e: EspnEvent, teamId: string) => comp0(e).competitors.some((c) => c.team.id === teamId || c.id === teamId);
async function clubFeed(id: string, query: string): Promise<EspnEvent[]> {
  const j = await get(`${SITE}/all/teams/${id}/schedule${query}`);
  return (j.events as EspnEvent[] | undefined) ?? [];
}
function merge(...lists: EspnEvent[][]): EspnEvent[] {
  const m = new Map<string, EspnEvent>();
  for (const l of lists) for (const e of l) m.set(e.id, e);
  return [...m.values()].sort((a, b) => a.date.localeCompare(b.date));
}

/** A competition's matches this season, from its scoreboard (one call per calendar year). */
async function board(slug: string, years: number[], seasonYear: number): Promise<{ events: EspnEvent[]; status: string }> {
  const out: EspnEvent[] = [];
  const statuses: string[] = [];
  for (const y of years) {
    const j = await get(`${SITE}/${slug}/scoreboard?dates=${y}&limit=1000`);
    statuses.push(j.__status ? `${y}:HTTP ${j.__status}` : `${y}:ok`);
    for (const e of (j.events as EspnEvent[] | undefined) ?? []) if ((e.season?.year ?? seasonYear) === seasonYear) out.push({ ...e, league: e.league ?? { slug } });
  }
  return { events: merge(out), status: statuses.join(' ') };
}

// ---------- report helpers ----------
const PASS = 'PASS', FAIL = 'FAIL', WARN = 'WARN', NA = 'n/a';
const failures: string[] = [];
const warnings: string[] = [];
function mark(ok: boolean | 'warn' | 'na', what: string): string {
  if (ok === 'na') return NA;
  if (ok === 'warn') { warnings.push(what); return WARN; }
  if (!ok) failures.push(what);
  return ok ? PASS : FAIL;
}
const short: Record<string, string> = {
  'eng.fa': 'FAC', 'eng.league_cup': 'EFL', 'esp.copa_del_rey': 'CDR', 'ita.coppa_italia': 'CI', 'ger.dfb_pokal': 'DFB', 'fra.coupe_de_france': 'CDF',
  'bra.copa_do_brazil': 'CDB', 'uefa.champions': 'UCL', 'uefa.europa': 'UEL', 'uefa.europa.conf': 'UECL', 'conmebol.libertadores': 'LIB', 'conmebol.sudamericana': 'SUD',
};
const stateText = (s: CompetitionState) =>
  s.state === 'next-fixture' ? `next ${s.date.slice(5, 10)}` : s.state === 'awaiting-draw' ? `won ${s.lastRound ?? ''}, awaiting next round` :
    s.state === 'eliminated' ? `out (${s.round ?? '?'})` : s.state === 'phase-over' ? `${s.round} over → standings` : s.state === 'champion' ? 'champion' : `UNKNOWN: ${s.why}`;

// ---------- main ----------
const started = new Date();
const { clubs, leagueSize } = await followedClubs();
console.log(`${clubs.length} followed clubs`);

const leagues = [...new Set(clubs.map((c) => c.league))];
const compSlugs = new Set<string>(leagues);
for (const l of leagues) for (const c of DOMESTIC_CUPS[l]) compSlugs.add(c);
for (const r of new Set(clubs.map((c) => c.region))) for (const c of CONTINENTAL[r]) compSlugs.add(c);
const compYear = (slug: string) => (slug.startsWith('bra.') || slug.startsWith('conmebol.') ? LEAGUE_SEASON_YEAR['bra.1'] : LEAGUE_SEASON_YEAR['eng.1']);
const compYears = (slug: string) => (slug.startsWith('bra.') || slug.startsWith('conmebol.') ? SEASON_CALENDAR_YEARS['bra.1'] : SEASON_CALENDAR_YEARS['eng.1']);
const boards = new Map<string, Awaited<ReturnType<typeof board>>>();
await Promise.all([...compSlugs].map(async (s) => boards.set(s, await board(s, compYears(s), compYear(s)))));

const feeds = new Map<string, EspnEvent[]>();
const lastSeason = new Map<string, EspnEvent[]>();
await Promise.all(clubs.map(async (c) => {
  const [played, upcoming, prev] = await Promise.all([clubFeed(c.id, ''), clubFeed(c.id, '?fixture=true'), clubFeed(c.id, `?season=${LEAGUE_SEASON_YEAR[c.league] - 1}`)]);
  feeds.set(c.id, merge(played, upcoming));
  lastSeason.set(c.id, prev);
}));
const currentRequests = requests - clubs.length; // the last-season feeds are evidence for this check only

interface Row { club: Club; cells: Record<string, string>; notes: string[] }
const rows: Row[] = [];
const neutralCandidates: string[] = [];
const oddsSeen = new Map<string, { checked: number; threeWay: number; provider: Set<string> }>();
let venueTotal = 0, venueWith = 0;
const statusNames = new Map<string, number>();

for (const club of clubs) {
  const feed = feeds.get(club.id) ?? [];
  const notes: string[] = [];
  const cells: Record<string, string> = {};
  const inFeed = (slug: string) => feed.filter((e) => slugOf(e) === slug);
  const onBoard = (slug: string) => (boards.get(slug)?.events ?? []).filter((e) => has(e, club.id));

  cells.data = mark(feed.length > 0, `${club.abbr}: no data`);

  // league: the feed must hold the whole double round-robin
  const expected = 2 * ((leagueSize.get(club.league) ?? 0) - 1);
  const lf = inFeed(club.league).length;
  cells.league = `${mark(lf === expected, `${club.abbr}: league ${lf}/${expected}`)} ${lf}/${expected}`;

  // domestic cups and continental: feed vs scoreboard; "–" = no match in either (not entered yet / not qualified)
  const crossCheck = (slugs: string[], label: string) => {
    const parts: string[] = [];
    let ok = true, any = false;
    for (const s of slugs) {
      const f = inFeed(s).length, b = onBoard(s).length;
      if (f === 0 && b === 0) continue;
      any = true;
      if (f < b) { ok = false; notes.push(`${short[s]}: feed has ${f}, scoreboard ${b}`); }
      parts.push(`${short[s] ?? s} ${f}/${b}`);
    }
    return { text: parts.join(', ') || '–', ok, any, label };
  };
  const cups = crossCheck(DOMESTIC_CUPS[club.league], 'cups');
  // pending this season: show last season's feed as evidence that the club feed carries that cup
  let cupEvidence = '';
  if (!cups.any) {
    const prev = lastSeason.get(club.id) ?? [];
    const prevCups = DOMESTIC_CUPS[club.league].map((s) => `${short[s]} ${prev.filter((e) => slugOf(e) === s).length}`);
    cupEvidence = ` (not entered yet; last season ${prevCups.join(', ')})`;
  }
  cells.cups = `${mark(cups.ok, `${club.abbr}: cup matches missing from feed`)} ${cups.text}${cupEvidence}`;
  const cont = crossCheck(CONTINENTAL[club.region], 'continental');
  cells.continental = cont.any ? `${mark(cont.ok, `${club.abbr}: continental matches missing from feed`)} ${cont.text}` : `${NA} not qualified`;

  // state championship (Brazil only): a warning, never a failure
  if (club.region === 'southAmerica') {
    const st = feed.filter((e) => slugOf(e).startsWith(STATE_PREFIX));
    cells.state = st.length ? `${PASS} ${[...new Set(st.map(slugOf))].map((s) => s.slice(STATE_PREFIX.length)).join(',')} ${st.length}` : mark('warn', `${club.abbr}: no state championship matches`);
  } else cells.state = NA;

  // kickoff times, TBD and postponed
  const noDate = feed.filter((e) => !e.date);
  const tbd = feed.filter((e) => e.timeValid === false || comp0(e).timeValid === false);
  const postponed = feed.filter((e) => /POSTPONED|CANCELED|SUSPENDED|DELAYED/.test(comp0(e).status?.type?.name ?? ''));
  for (const e of feed) { const n = comp0(e).status?.type?.name ?? '?'; statusNames.set(n, (statusNames.get(n) ?? 0) + 1); }
  cells.kickoff = `${mark(noDate.length === 0, `${club.abbr}: matches without a date`)}${tbd.length ? ` ${tbd.length} TBD` : ''}${postponed.length ? ` ${postponed.length} postponed` : ''}`;
  if (tbd.length) notes.push(`${tbd.length} match(es) with kickoff time TBD, ${tbd[0]!.date.slice(0, 10)} … ${tbd[tbd.length - 1]!.date.slice(0, 10)} (${[...new Set(tbd.map(slugOf))].join(', ')})`);
  for (const e of postponed) notes.push(`${e.date.slice(0, 10)} ${e.shortName} ${slugOf(e)} ${comp0(e).status?.type?.name}${e.timeValid === false ? ' (time TBD)' : ''}`);

  // elimination per knockout competition
  const koSlugs = [...DOMESTIC_CUPS[club.league], ...CONTINENTAL[club.region]];
  const states: string[] = [];
  let elimOk = true;
  for (const s of koSlugs) {
    const evs = inFeed(s);
    if (!evs.length) continue;
    const st = competitionState(evs, club.id);
    if (st.state === 'unknown') { elimOk = false; notes.push(`${short[s]}: ${st.why}`); }
    states.push(`${short[s]}: ${stateText(st)}`);
  }
  cells.elimination = `${mark(elimOk, `${club.abbr}: knockout state unknown`)} ${states.join('; ') || '–'}`;

  // venues
  const competitive = feed.filter((e) => !/friendly/.test(slugOf(e)));
  const withVenue = competitive.filter((e) => comp0(e).venue?.fullName && comp0(e).venue?.address?.city);
  venueTotal += competitive.length; venueWith += withVenue.length;
  const gaps = competitive.filter((e) => !withVenue.includes(e));
  for (const e of gaps) notes.push(`no venue city: ${e.date.slice(0, 10)} ${e.shortName} ${slugOf(e)} ${JSON.stringify(comp0(e).venue ?? null)}`);
  cells.venue = `${gaps.length ? mark('warn', `${club.abbr}: ${gaps.length} match(es) without venue name/city`) : PASS} ${withVenue.length}/${competitive.length}`;

  // neutral venues: a home match away from the club's usual league ground
  const homeLeague = inFeed(club.league).filter((e) => comp0(e).competitors.find((c) => c.homeAway === 'home')?.team.id === club.id);
  const grounds = new Map<string, number>();
  for (const e of homeLeague) { const v = comp0(e).venue?.fullName ?? ''; grounds.set(v, (grounds.get(v) ?? 0) + 1); }
  const usual = [...grounds.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  for (const e of competitive) {
    const homeId = comp0(e).competitors.find((c) => c.homeAway === 'home')?.team.id;
    if (homeId === club.id && usual && comp0(e).venue?.fullName !== usual) {
      neutralCandidates.push(`${e.date.slice(0, 10)} ${e.shortName} (${slugOf(e)}, ${e.seasonType?.name ?? ''}) at ${comp0(e).venue?.fullName}, ${comp0(e).venue?.address?.city} — neutralSite=${comp0(e).neutralSite}; ${club.abbr}'s usual ground: ${usual}`);
    }
  }

  // 3-way odds on the club's next match, from that competition's scoreboard
  const next = feed.find((e) => comp0(e).status?.type?.state === 'pre');
  if (next) {
    const be = boards.get(slugOf(next))?.events.find((e) => e.id === next.id);
    const o = be?.competitions[0]?.odds?.find((x) => x);
    const ml = o?.moneyline;
    const three = !!(ml?.home?.close?.odds && ml.away?.close?.odds && ml.draw?.close?.odds);
    const k = slugOf(next);
    const s = oddsSeen.get(k) ?? { checked: 0, threeWay: 0, provider: new Set<string>() };
    s.checked++; if (three) { s.threeWay++; if (o?.provider?.name) s.provider.add(o.provider.name); }
    oddsSeen.set(k, s);
    cells.odds = be ? (three ? `yes (${short[k] ?? k} ${next.date.slice(5, 10)})` : `no (${short[k] ?? k} ${next.date.slice(5, 10)})`) : `not on a fetched scoreboard (${k})`;
  } else cells.odds = '–';
  rows.push({ club, cells, notes });
}

// ---------- competition-level checks ----------
type StandJson = { children?: { name?: string; standings?: { entries?: unknown[] } }[] };
const standingsRows: string[] = [];
for (const s of [...leagues, 'uefa.champions', 'conmebol.libertadores', 'conmebol.sudamericana']) {
  const j = (await get(`${STANDINGS}/${s}/standings`)) as StandJson & Json;
  const groups = j.children ?? [];
  const sizes = groups.map((g) => g.standings?.entries?.length ?? 0);
  const ok = groups.length > 0 && sizes.every((n) => n > 0);
  standingsRows.push(`| ${s} | ${mark(ok, `standings ${s}`)} | ${groups.length} table(s): ${groups.map((g, i) => `${g.name} (${sizes[i]})`).join(', ').slice(0, 160)} |`);
}

const coverageRows: string[] = [];
for (const s of compSlugs) {
  const b = boards.get(s)!;
  const covered = b.events.length > 0;
  coverageRows.push(`| ${s} | ${mark(covered, `no scoreboard data for ${s}`)} | ${b.events.length} | ${b.status} |`);
}

// knockout data: second legs carry both clubs' aggregate scores (club feeds, this season and last)
const koRows: string[] = [];
const allFeedEvents = merge(...feeds.values(), ...lastSeason.values());
for (const s of [...compSlugs].filter((x) => !leagues.includes(x as LeagueSlug))) {
  const evs = allFeedEvents.filter((e) => slugOf(e) === s && comp0(e).status?.type?.completed);
  const ko = evs.filter((e) => !isPhaseRound(e.seasonType?.name));
  const legs2 = ko.filter((e) => comp0(e).leg?.value === 2);
  const withAgg = legs2.filter((e) => comp0(e).competitors.every((c) => aggregateOf(c) !== undefined));
  const rounds = [...new Set(ko.map((e) => e.seasonType?.name))].join(', ');
  koRows.push(`| ${s} | ${ko.length} | ${legs2.length} | ${withAgg.length}/${legs2.length} | ${rounds.slice(0, 140)} |`);
  if (legs2.length && withAgg.length < legs2.length) failures.push(`${s}: second legs without aggregate`);
}

// report-only: injuries, suspensions, call-ups
type RosterJson = { athletes?: { injuries?: unknown[]; status?: { name?: string; type?: string } }[] };
let rosterAthletes = 0, injured = 0;
const athleteStatus = new Map<string, number>();
await Promise.all(clubs.map(async (c) => {
  const r = (await get(`${SITE}/${c.league}/teams/${c.id}/roster`)) as RosterJson;
  for (const a of r.athletes ?? []) {
    rosterAthletes++; if (a.injuries?.length) injured++;
    const st = a.status?.name ?? a.status?.type ?? '(none)';
    athleteStatus.set(st, (athleteStatus.get(st) ?? 0) + 1);
  }
}));
let coreInjuryItems = 0;
for (const c of clubs.slice(0, 10)) {
  const j = (await get(`https://sports.core.api.espn.com/v2/sports/soccer/leagues/${c.league}/teams/${c.id}/injuries`)) as { count?: number };
  coreInjuryItems += j.count ?? 0;
}

// CORS: a real browser page on another origin
async function corsCheck(): Promise<string[]> {
  const { chromium } = await import('@playwright/test');
  const server = createServer((_q, res) => res.writeHead(200, { 'Content-Type': 'text/html' }).end('<!doctype html><title>cors</title>'));
  await new Promise<void>((r) => server.listen(0, r));
  const port = (server.address() as { port: number }).port;
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.goto(`http://localhost:${port}/`);
    const urls = [`${SITE}/all/teams/${clubs[0]!.id}/schedule?fixture=true`, `${SITE}/eng.1/scoreboard`, `${STANDINGS}/eng.1/standings`];
    const out: string[] = [];
    for (const u of urls) {
      const r = await page.evaluate(async (url) => {
        try { const x = await fetch(url); return `HTTP ${x.status}, ${(await x.text()).length} bytes`; } catch (e) { return `blocked: ${String(e)}`; }
      }, u);
      // What CORS needs is ESPN's Access-Control-Allow-Origin answer to a cross-origin request. Headless Chromium is
      // reported separately: ESPN refuses its 'HeadlessChrome' user agent (403, no CORS header), which only matters
      // for automated tests (they must use recorded fixtures, never live ESPN).
      const h = await fetch(u, { headers: { Origin: 'https://gauntlet-home.vercel.app' } });
      const acao = h.headers.get('access-control-allow-origin');
      out.push(`| ${u.replace(SITE, '…/site/v2/sports/soccer').replace(STANDINGS, '…/v2/sports/soccer')} | ${mark(acao === '*', `CORS ${u}`)} Allow-Origin: ${acao} | headless Chromium: ${r} |`);
    }
    return out;
  } finally { await browser.close(); server.close(); }
}
const corsRows = await corsCheck();

// postponed matches with a replacement event: same competition, same home and away club
const rescheduled: string[] = [];
for (const [slug, b] of boards) {
  const key = (e: EspnEvent) => comp0(e).competitors.map((c) => `${c.homeAway}:${c.team.id}`).sort().join(' ');
  for (const p of b.events.filter((e) => /POSTPONED/.test(comp0(e).status?.type?.name ?? ''))) {
    const repl = b.events.find((e) => e.id !== p.id && key(e) === key(p) && e.seasonType?.name === p.seasonType?.name);
    rescheduled.push(`${slug}: ${p.shortName} ${p.date.slice(0, 10)} (id ${p.id}, postponed) → ${repl ? `${repl.date.slice(0, 10)} (id ${repl.id}, ${comp0(repl).status?.type?.name})` : 'no replacement listed yet'}`);
  }
}

// snapshot size estimate: every match of every competition the app shows, slimmed to what it reads
const slim = (e: EspnEvent) => {
  const c = comp0(e);
  return {
    id: e.id, d: e.date, c: slugOf(e), r: e.seasonType?.name, l: c.leg?.value, t: c.timeValid === false ? 0 : undefined,
    s: c.status?.type?.name, v: c.venue?.fullName, n: c.neutralSite || undefined,
    h: c.competitors.map((x) => [x.team.id, typeof x.score === 'object' ? x.score.value : x.score, aggregateOf(x), typeof x.score === 'object' ? x.score.shootoutScore : undefined]),
  };
};
const everyEvent = merge(...feeds.values(), ...[...boards.values()].map((b) => b.events));
const slimJson = JSON.stringify(everyEvent.map(slim));
const slimBytes = slimJson.length;
const slimGzip = gzipSync(slimJson).length;

// ---------- write the report ----------
const cols = ['data', 'league', 'cups', 'continental', 'state', 'kickoff', 'elimination', 'venue', 'odds'] as const;
const md: string[] = [];
md.push(`# Phase 1 — data check (ESPN)`, '', `Generated by \`npm run data-check\` on ${started.toISOString()} (${((Date.now() - started.getTime()) / 1000).toFixed(0)} s). ${clubs.length} clubs.`, '');
md.push(`**Result: ${failures.length ? `${failures.length} required check(s) FAILED` : 'every required check passed'}; ${warnings.length} warning(s).**`, '');
md.push('Cells: `feed/scoreboard` counts per competition (the club feed must hold every match the competition scoreboard has). "–" = no match in either (not entered yet / not qualified).', '');
md.push(`| club | ${cols.join(' | ')} |`, `|${'---|'.repeat(cols.length + 1)}`);
for (const r of rows) md.push(`| ${r.club.abbr} ${r.club.name} (${r.club.league}) | ${cols.map((c) => r.cells[c] ?? '').join(' | ')} |`);
md.push('', '## Notes per club', '');
for (const r of rows) if (r.notes.length) md.push(`- **${r.club.abbr}**: ${r.notes.join('; ')}`);
md.push('', '## Competition scoreboards (this season)', '', '| competition | covered | matches | calls |', '|---|---|---|---|', ...coverageRows);
md.push('', '## Standings', '', '| competition | available | tables |', '|---|---|---|', ...standingsRows);
md.push('', '## Knockout data (completed knockout matches in club feeds, this season + last)', '', '| competition | KO matches | 2nd legs | 2nd legs with aggregate | rounds |', '|---|---|---|---|---|', ...koRows);
md.push('', '## Venues', '', `${venueWith}/${venueTotal} competitive matches have a venue name and city.`, '');
md.push(`Home matches away from the club's usual league ground (neutral-venue candidates — ESPN's \`neutralSite\` flag shown for each):`, '', ...[...new Set(neutralCandidates)].map((x) => `- ${x}`));
md.push('', '## 3-way odds (next match of each club)', '', '| competition | next matches checked | with home/draw/away | provider |', '|---|---|---|---|');
for (const [k, v] of oddsSeen) md.push(`| ${k} | ${v.checked} | ${v.threeWay} | ${[...v.provider].join(', ')} |`);
md.push('', '## Match statuses seen', '', [...statusNames].map(([k, v]) => `${k} ${v}`).join(', '));
md.push('', '## Report only (not in v1)', '');
md.push(`- Injuries: rosters of all ${clubs.length} clubs list ${rosterAthletes} players, ${injured} with an injury entry; ESPN's core injuries endpoint returned ${coreInjuryItems} items for 10 clubs.`);
md.push(`- Player status values on rosters (suspensions would show here): ${[...athleteStatus].map(([k, v]) => `${k} ${v}`).join(', ')}.`);
md.push('- National-team call-ups: ESPN has no call-up endpoint.');
md.push('', '## CORS', '', 'Allow-Origin = ESPN’s answer to a request with `Origin: https://gauntlet-home.vercel.app`. Headless Chromium = a fetch from a page on http://localhost in Playwright.', '',
  '| endpoint | Allow-Origin | headless Chromium |', '|---|---|---|', ...corsRows);
md.push('', '## Postponed matches that were rescheduled under a new id', '', 'ESPN keeps the postponed event and adds a new one; the scoreboard lists both, so the app must drop the postponed copy.', '', ...rescheduled.map((x) => `- ${x}`));
md.push('', '## Volume', '', `- Requests for one full refresh (club feeds ×2, scoreboards, team lists): ~${currentRequests}.`);
md.push(`- Slim snapshot estimate: ${everyEvent.length} matches → ${(slimBytes / 1024).toFixed(0)} KB JSON, ${(slimGzip / 1024).toFixed(0)} KB gzipped.`);
if (failures.length) md.push('', '## Failures', '', ...failures.map((f) => `- ${f}`));
if (warnings.length) md.push('', '## Warnings', '', ...warnings.map((f) => `- ${f}`));
writeFileSync('docs/phase1-data-check.md', md.join('\n') + '\n');

console.log(`requests ${requests}; failures ${failures.length}; warnings ${warnings.length}`);
for (const f of failures) console.log('FAIL', f);
for (const w of warnings) console.log('WARN', w);
console.log('report: docs/phase1-data-check.md');
process.exit(failures.length ? 1 : 0);
