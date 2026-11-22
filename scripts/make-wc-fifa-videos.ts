// FK-68: builds public/worldcup/2022-videos.json (match number → the full match's address) from FIFA's own free replays
// of the 2022 World Cup:
//   1. FIFA+ "Full Match Replay" pages (https://www.fifa.com/en/watch/<id>). Their ids are random, so they are read from
//      FIFA's video sitemap (robots.txt on fifa.com names it: cxm-api.fifa.com/fifaplusweb/api/sitemaps → sitemap-en →
//      sitemaps/en/videos/<n>), which gives every video's address, title and length.
//   2. Only for a match with no FIFA+ page: FIFA's official YouTube "FULL MATCH" upload (the channel's live / premiere
//      tab and its "FULL MATCHES REPLAYS | HISTORIC FIFA WORLD CUP GAMES" playlist, listed with yt-dlp, nothing downloaded).
// Each video is paired to its match by the two teams in its title (src/data/wcVideos.ts) and checked to answer before it
// is written. Never a built or guessed address: a match with no replay gets no entry, and the run prints which ones.
// Needs yt-dlp for step 2 (`winget install yt-dlp.yt-dlp`; YT_DLP names another path). Run: npm run make-wc-fifa-videos

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { editionNames, isFullMatchOf, pairVideos, preferFirst, type PairMatch, type Video } from '../src/data/wcVideos.ts';

const YEAR = 2022;
const HOST = 'Qatar';
const API = 'https://cxm-api.fifa.com/fifaplusweb/api';
const YT_CHANNEL = 'FIFA';
const YT_LISTS = ['https://www.youtube.com/@fifa/streams', 'https://www.youtube.com/playlist?list=PLCGIzmTE4d0jq6wHT2TvSspZ_HLiIx4_y'];
/** A full match is at least 90 minutes; anything shorter under a "full match" title is not one. */
const MIN_SECONDS = 90 * 60;
const DIR = join(import.meta.dirname, '..', 'public', 'worldcup');

const get = async (url: string) => {
  const r = await fetch(url, { headers: { 'user-agent': 'footykit make-wc-fifa-videos' } });
  if (!r.ok) throw new Error(`${r.status} for ${url}`);
  return r.text();
};
const tag = (xml: string, name: string) => xml.match(new RegExp(`<${name}>([^<]*)</${name}>`))?.[1]?.replace(/&amp;/g, '&').trim();

// ---------- 1. FIFA+ ----------
async function fifaPlus(): Promise<Video[]> {
  const index = await get(`${API}/sitemap-en`);
  const pages = [...index.matchAll(/<loc>([^<]*\/sitemaps\/en\/videos\/\d+)<\/loc>/g)].map((m) => m[1]!);
  if (!pages.length) throw new Error("FIFA's sitemap lists no video pages (its shape changed?)");
  const found = new Map<string, Video>();
  let seen = 0;
  for (const page of pages) {
    for (const block of (await get(page)).split('<url>').slice(1)) {
      seen++;
      const url = tag(block, 'loc'), title = tag(block, 'video:title'), seconds = Number(tag(block, 'video:duration'));
      if (!url || !title || !/^https:\/\/www\.fifa\.com\/en\/watch\/[\w-]+$/.test(url)) continue;
      if (isFullMatchOf(title, YEAR, HOST) && seconds >= MIN_SECONDS) found.set(url, { id: url, title });
    }
  }
  console.log(`FIFA+: ${pages.length} sitemap pages, ${seen} videos, ${found.size} full matches of the ${YEAR} World Cup`);
  // each page's own data must answer and still be that replay
  const live: Video[] = [];
  for (const v of found.values()) {
    try {
      const page = JSON.parse(await get(`${API}/pages/en/watch/${v.id.split('/').pop()}`)) as { template?: string; meta?: { title?: string } };
      if (page.template === 'videoDetailsTemplate' && page.meta?.title && isFullMatchOf(page.meta.title, YEAR, HOST)) live.push(v);
      else console.log(`  not a replay page any more, left out: ${v.id} ${v.title}`);
    } catch (e) { console.log(`  does not answer, left out: ${v.id} (${String(e)})`); }
  }
  return live;
}

// ---------- 2. FIFA's YouTube ----------
/** yt-dlp: YT_DLP, else the one on PATH, else winget's copy (a shell opened before the install has no PATH entry yet). */
function ytDlp(): string {
  if (process.env.YT_DLP) return process.env.YT_DLP;
  try { execFileSync('yt-dlp', ['--version'], { stdio: 'ignore' }); return 'yt-dlp'; } catch { /* not on PATH */ }
  const pk = join(process.env.LOCALAPPDATA ?? '', 'Microsoft', 'WinGet', 'Packages');
  const dir = existsSync(pk) ? readdirSync(pk).find((d) => d.startsWith('yt-dlp.yt-dlp_')) : undefined;
  const exe = dir && join(pk, dir, 'yt-dlp.exe');
  if (exe && existsSync(exe)) return exe;
  throw new Error('yt-dlp not found: install it (winget install yt-dlp.yt-dlp) or set YT_DLP to its path');
}

async function youTube(): Promise<Video[]> {
  const found = new Map<string, Video>();
  const exe = ytDlp();
  for (const list of YT_LISTS) {
    const raw = execFileSync(exe, ['--flat-playlist', '-J', list], { encoding: 'utf8', maxBuffer: 512 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] });
    const data = JSON.parse(raw) as { channel?: string; entries: { id: string; title?: string; duration?: number | null; channel?: string | null }[] };
    if (data.channel !== YT_CHANNEL) throw new Error(`${list} belongs to "${data.channel}", not ${YT_CHANNEL}`);
    for (const e of data.entries) {
      if (!e.title || (e.channel && e.channel !== YT_CHANNEL) || !/^[\w-]{11}$/.test(e.id)) continue;
      if (isFullMatchOf(e.title, YEAR, HOST) && (e.duration ?? 0) >= MIN_SECONDS) found.set(e.id, { id: `https://www.youtube.com/watch?v=${e.id}`, title: e.title });
    }
  }
  console.log(`FIFA's YouTube: ${found.size} full matches of the ${YEAR} World Cup`);
  // YouTube's own check that the video is public and FIFA's (oEmbed answers 200 with the uploader's name)
  const live: Video[] = [];
  for (const v of found.values()) {
    try {
      const o = JSON.parse(await get(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(v.id)}`)) as { author_name?: string };
      if (o.author_name === YT_CHANNEL) live.push(v);
      else console.log(`  not FIFA's video, left out: ${v.id} (${o.author_name})`);
    } catch (e) { console.log(`  does not answer, left out: ${v.id} (${String(e)})`); }
  }
  return live;
}

// ---------- pair, report, write ----------
const ed = JSON.parse(readFileSync(join(DIR, `${YEAR}.json`), 'utf8')) as { teams: Record<string, string>; matches: (PairMatch & { stage: string })[] };
const names = editionNames(ed.teams);
const plus = pairVideos(ed.matches, await fifaPlus(), names);
const yt = pairVideos(ed.matches, await youTube(), names);
const videos = preferFirst(plus.videos, yt.videos);

const name = (m: PairMatch & { stage: string }) => `${m.n} ${ed.teams[m.h]} v ${ed.teams[m.a]} (${m.stage}, ${m.date})`;
const onPlus = Object.keys(plus.videos).length, total = Object.keys(videos).length;
console.log(`${total} of ${ed.matches.length} matches have a full replay: ${onPlus} on FIFA+, ${total - onPlus} only on FIFA's YouTube`);
const missing = ed.matches.filter((m) => !videos[m.n]);
console.log(missing.length ? `No full match for:\n${missing.map((m) => `  ${name(m)}`).join('\n')}` : 'Every match has a full-match video.');
for (const [where, p] of [['FIFA+', plus], ["FIFA's YouTube", yt]] as const) {
  if (p.unpaired.length) console.log(`${where} videos paired to no match:\n${p.unpaired.map((v) => `  ${v.id} ${v.title}`).join('\n')}`);
  if (p.extra.length) console.log(`${where}: second videos of a match (not used):\n${p.extra.map((v) => `  ${v.id} ${v.title}`).join('\n')}`);
}
if (!onPlus) {
  console.error('No FIFA+ replay found at all (the sitemap or the titles changed?): nothing written.');
  process.exit(1);
}
writeFileSync(join(DIR, `${YEAR}-videos.json`), `${JSON.stringify(videos, null, 0).replace(/",/g, '",\n')}\n`);
console.log(`Wrote public/worldcup/${YEAR}-videos.json`);
