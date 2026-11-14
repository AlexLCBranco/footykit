// Test fixtures from a real snapshot run (`npx tsx scripts/update-snapshot.ts --raw test-output/raw.json.gz`):
// - tests/fixtures/raw-subset.json.gz: the raw ESPN payloads cut down to a few clubs (Arsenal, Flamengo, PSG, Vasco,
//   Botafogo) and the matches involving them, plus the rescheduled-postponed cases; input of tests/build.test.ts.
// - tests/fixtures/snapshot.json: the full snapshot, what e2e and the app's logic tests load.
// Usage: npx tsx scripts/make-fixture.ts [raw.json.gz] [snapshot.json]

import { copyFileSync, readFileSync, writeFileSync } from 'node:fs';
import { gunzipSync, gzipSync } from 'node:zlib';
import type { EspnEvent } from '../src/data/espn.ts';
import type { RawInput } from './snapshot/build.ts';

const [rawFile = 'test-output/raw.json.gz', snapFile = 'test-output/snapshot.json'] = process.argv.slice(2);
const raw = JSON.parse(gunzipSync(readFileSync(rawFile)).toString()) as RawInput;
const CLUBS = new Set(['359', '819', '160', '3454', '6086']);

const involves = (e: EspnEvent) => e.competitions[0]?.competitors.some((c) => CLUBS.has(c.team.id));
const postponed = (e: EspnEvent) => /POSTPONED/.test(e.competitions[0]?.status?.type?.name ?? '');
const pairsOfPostponed = new Set(raw.boards.flatMap((b) => b.events.filter(postponed).map((e) => e.competitions[0]!.competitors.map((c) => c.team.id).sort().join('-'))));
const keep = (e: EspnEvent) => involves(e) || pairsOfPostponed.has(e.competitions[0]!.competitors.map((c) => c.team.id).sort().join('-'));

/** Drop the bulky parts no code reads (links, logos, broadcasts, betting links), keep the rest as ESPN sent it. */
function trim(e: EspnEvent): EspnEvent {
  const strip = (o: unknown): unknown => {
    if (Array.isArray(o)) return o.map(strip);
    if (!o || typeof o !== 'object') return o;
    return Object.fromEntries(Object.entries(o).filter(([k]) => !['links', 'logos', 'logo', 'broadcasts', 'geoBroadcasts', 'broadcast', 'tickets', 'link', 'details', 'headlines', 'playByPlayAthletes', 'statistics', 'leaders'].includes(k)).map(([k, v]) => [k, strip(v)]));
  };
  return strip(e) as EspnEvent;
}

const feeds = raw.feeds.filter((e) => e.competitions[0]?.competitors.some((c) => CLUBS.has(c.team.id))).map(trim);
const boards = raw.boards.map((b) => ({ slug: b.slug, events: b.events.filter(keep).map(trim) }));
const standings = raw.standings.filter((s) => ['eng.1', 'bra.1', 'conmebol.libertadores'].includes(s.slug))
  .map((s) => ({ slug: s.slug, json: JSON.parse(JSON.stringify(s.json, (k, v) => (['links', 'logos'].includes(k) ? undefined : v))) }));
const teamLists = Object.fromEntries(Object.entries(raw.teamLists).map(([k, v]) => [k, v.map((t) => ({ id: t.id, abbreviation: t.abbreviation, displayName: t.displayName, shortDisplayName: t.shortDisplayName }))]));
const subset: RawInput = { generatedAt: raw.generatedAt, teamLists, feeds, boards, standings };
const gz = gzipSync(JSON.stringify(subset));
writeFileSync('tests/fixtures/raw-subset.json.gz', gz);
copyFileSync(snapFile, 'tests/fixtures/snapshot.json');
console.log(`raw-subset: ${feeds.length} feed events, ${boards.reduce((n, b) => n + b.events.length, 0)} board events, ${(gz.length / 1024).toFixed(0)} KB; snapshot copied`);
