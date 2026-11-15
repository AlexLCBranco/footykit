// Snapshot job: fetch ESPN, build the snapshot (scripts/snapshot/build.ts), check it, write it, and with --upload put
// it in Vercel Blob as `footykit/snapshot.json` (one file, overwritten each run; needs BLOB_READ_WRITE_TOKEN).
// Usage: npx tsx scripts/update-snapshot.ts [--out file] [--raw file.json.gz] [--upload]
//   --out  where to write the snapshot (default test-output/snapshot.json)
//   --raw  also save the raw ESPN payloads (gzipped), the input for tests/fixtures (scripts/make-fixture.ts)
//   --from rebuild from raw payloads saved earlier (gzipped) instead of fetching: the fixtures after a builder change
// Exits 1 when the snapshot looks broken (a followed club with no matches, a league without a table), so a bad run
// never replaces a good snapshot.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { gunzipSync, gzipSync } from 'node:zlib';
import { DROPPED } from '../config/competitions.ts';
import { CONTINENTAL, DOMESTIC_CUPS, FOLLOWED, LEAGUE_SEASON_YEAR, SEASON_CALENDAR_YEARS, type LeagueSlug } from '../config/season.ts';
import { SITE, STANDINGS, type EspnEvent } from '../src/data/espn.ts';
import type { Snapshot } from '../src/data/snapshot.ts';
import { buildSnapshot, resolveClubs, type RawInput, type StandingsJson, type TeamLite } from './snapshot/build.ts';
import { get, requestCount, type Json } from './snapshot/fetch.ts';

export const BLOB_PATH = 'footykit/snapshot.json';

const arg = (name: string) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : undefined; };

type TeamsJson = { sports?: { leagues?: { teams?: { team: TeamLite }[] }[] }[] };
async function teamList(slug: string): Promise<TeamLite[]> {
  const j = (await get(`${SITE}/${slug}/teams`)) as TeamsJson & Json;
  if (j.__status) throw new Error(`${slug}/teams: HTTP ${j.__status}`);
  return j.sports?.[0]?.leagues?.[0]?.teams?.map((t) => t.team) ?? [];
}

const isSouth = (slug: string) => slug.startsWith('bra.') || slug.startsWith('conmebol.');

/** A competition's matches this season (one scoreboard call per calendar year; ESPN refuses date ranges). */
async function board(slug: string): Promise<{ slug: string; events: EspnEvent[] }> {
  const seasonYear = LEAGUE_SEASON_YEAR[isSouth(slug) ? 'bra.1' : 'eng.1'];
  const years = SEASON_CALENDAR_YEARS[isSouth(slug) ? 'bra.1' : 'eng.1'];
  const events: EspnEvent[] = [];
  for (const y of years) {
    const j = await get(`${SITE}/${slug}/scoreboard?dates=${y}&limit=1000`);
    if (j.__status) throw new Error(`${slug} scoreboard ${y}: HTTP ${j.__status}`);
    for (const e of (j.events as EspnEvent[] | undefined) ?? []) if ((e.season?.year ?? seasonYear) === seasonYear) events.push(e);
  }
  return { slug, events };
}

export async function fetchRaw(): Promise<RawInput> {
  const generatedAt = new Date().toISOString();
  const leagues = new Set<string>([...FOLLOWED.allClubsOf, ...FOLLOWED.ifIn.leagues, ...FOLLOWED.extraClubs.map((x) => x.league), FOLLOWED.ifIn.competition]);
  const teamLists: RawInput['teamLists'] = {};
  await Promise.all([...leagues].map(async (l) => { teamLists[l] = await teamList(l); }));
  const clubs = resolveClubs(teamLists);

  const feeds: EspnEvent[] = [];
  await Promise.all(clubs.map(async (c) => {
    for (const q of ['', '?fixture=true']) {
      const j = await get(`${SITE}/all/teams/${c.id}/schedule${q}`);
      if (j.__status) throw new Error(`${c.abbr} schedule${q}: HTTP ${j.__status}`);
      for (const e of (j.events as EspnEvent[] | undefined) ?? []) if (!DROPPED(e.league?.slug ?? '')) feeds.push(e);
    }
  }));

  // Every match of the followed clubs' leagues, cups and continental competitions (tables and brackets need the
  // matches between other clubs too).
  const followedLeagues = [...new Set(clubs.map((c) => c.league))] as LeagueSlug[];
  const slugs = new Set<string>(followedLeagues);
  for (const l of followedLeagues) for (const s of DOMESTIC_CUPS[l]) slugs.add(s);
  for (const r of new Set(clubs.map((c) => c.region))) for (const s of CONTINENTAL[r]) slugs.add(s);
  const boards = await Promise.all([...slugs].map(board));

  const tableSlugs = [...followedLeagues, ...CONTINENTAL.europe, ...CONTINENTAL.southAmerica];
  const standings = await Promise.all(tableSlugs.map(async (slug) => {
    const j = await get(`${STANDINGS}/${slug}/standings`);
    if (j.__status) throw new Error(`${slug} standings: HTTP ${j.__status}`);
    return { slug, json: j as StandingsJson };
  }));
  return { generatedAt, teamLists, feeds, boards, standings };
}

/** Reasons the snapshot must not replace the live one. */
export function problems(s: Snapshot): string[] {
  const out: string[] = [];
  if (s.clubs.length < 40) out.push(`only ${s.clubs.length} followed clubs`);
  for (const c of s.clubs) {
    const n = s.matches.filter((m) => m.c === c.league && (m.h === c.id || m.a === c.id)).length;
    if (n === 0) out.push(`${c.abbr}: no ${c.league} matches`);
  }
  for (const l of new Set(s.clubs.map((c) => c.league))) if (!s.tables[l]?.[0]?.rows.length) out.push(`${l}: no table`);
  return out;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const t0 = Date.now();
  const from = arg('--from');
  const raw: RawInput = from ? JSON.parse(gunzipSync(readFileSync(from)).toString()) : await fetchRaw();
  const { snapshot, report } = buildSnapshot(raw);
  const bad = problems(snapshot);
  const json = JSON.stringify(snapshot);
  console.log(`${snapshot.clubs.length} clubs, ${snapshot.matches.length} matches, ${Object.keys(snapshot.teams).length} teams, ${Object.keys(snapshot.comps).length} competitions; ${(json.length / 1024).toFixed(0)} KB (${(gzipSync(json).length / 1024).toFixed(0)} KB gzipped); ${requestCount()} requests, ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  if (report.unknownComps.length) console.log(`WARN competitions not in config/competitions.ts (shown with a generic code): ${report.unknownComps.join(', ')}`);
  if (report.droppedPostponed.length) console.log(`postponed copies dropped (rescheduled under a new id): ${report.droppedPostponed.join(', ')}`);
  const rawOut = arg('--raw');
  if (rawOut) { mkdirSync(dirname(rawOut), { recursive: true }); writeFileSync(rawOut, gzipSync(JSON.stringify(raw))); console.log(`raw: ${rawOut}`); }
  if (bad.length) { for (const b of bad) console.error(`FAIL ${b}`); process.exit(1); }
  const out = arg('--out') ?? 'test-output/snapshot.json';
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, json);
  console.log(`wrote ${out}`);
  if (process.argv.includes('--upload')) {
    const { put } = await import('@vercel/blob');
    // cacheControlMaxAge 60: a new snapshot reaches readers within a minute (Blob's CDN minimum)
    const r = await put(BLOB_PATH, json, { access: 'public', addRandomSuffix: false, allowOverwrite: true, contentType: 'application/json', cacheControlMaxAge: 60 });
    console.log(`uploaded ${r.url}`);
  }
}
