// FK-67: builds public/worldcup/2026-videos.json (match number → YouTube video id) from CazéTV's playlist
// "Jogos Completos | Copa do Mundo FIFA™ 2026": lists it with yt-dlp (`--flat-playlist`, no API key, nothing
// downloaded) and pairs each video to a match by the two teams in its title and the date (src/data/wcVideos.ts).
// Only real videos: a match with none in the playlist gets no entry, and the run prints which ones. Fewer than half
// paired, or a playlist that can't be listed: nothing is written and the run fails.
// Needs yt-dlp (`winget install yt-dlp.yt-dlp`; YT_DLP names another path). Run: npm run make-wc-videos

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pairVideos, type PairMatch, type Video } from '../src/data/wcVideos.ts';

const YEAR = 2026;
const PLAYLIST = 'https://www.youtube.com/playlist?list=PLsFWLnYCEXEVWs5wf60vfwUU4FaOEre3D';
const CHANNEL = 'CazéTV';
const DIR = join(import.meta.dirname, '..', 'public', 'worldcup');

/** yt-dlp: YT_DLP, else the one on PATH, else winget's copy (a shell opened before the install has no PATH entry yet). */
function ytDlp(): string {
  if (process.env.YT_DLP) return process.env.YT_DLP;
  const pk = join(process.env.LOCALAPPDATA ?? '', 'Microsoft', 'WinGet', 'Packages');
  const dir = existsSync(pk) ? readdirSync(pk).find((d) => d.startsWith('yt-dlp.yt-dlp_')) : undefined;
  const exe = dir && join(pk, dir, 'yt-dlp.exe');
  try { execFileSync('yt-dlp', ['--version'], { stdio: 'ignore' }); return 'yt-dlp'; } catch { /* not on PATH */ }
  if (exe && existsSync(exe)) return exe;
  throw new Error('yt-dlp not found: install it (winget install yt-dlp.yt-dlp) or set YT_DLP to its path');
}

interface Entry { id: string; title?: string; timestamp?: number | null; channel?: string | null }
// approximate_date: the listing's "5 months ago" as a date (never earlier than the real one), enough for the pairing
const raw = execFileSync(ytDlp(), ['--flat-playlist', '--extractor-args', 'youtubetab:approximate_date', '-J', PLAYLIST], { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
const list = JSON.parse(raw) as { title: string; channel?: string; entries: Entry[] };
if (list.channel !== CHANNEL) throw new Error(`the playlist belongs to "${list.channel}", not ${CHANNEL}`);

const videos: Video[] = list.entries
  .filter((e) => e.title && !/^\[(private|deleted) video\]$/i.test(e.title) && (!e.channel || e.channel === CHANNEL))
  .map((e) => ({ id: e.id, title: e.title!, date: e.timestamp ? new Date(e.timestamp * 1000).toISOString().slice(0, 10) : undefined }));
const ed = JSON.parse(readFileSync(join(DIR, `${YEAR}.json`), 'utf8')) as { teams: Record<string, string>; matches: (PairMatch & { stage: string })[] };
const paired = pairVideos(ed.matches, videos);

const name = (m: PairMatch) => `${m.n} ${ed.teams[m.h]} v ${ed.teams[m.a]} (${m.date})`;
const got = Object.keys(paired.videos).length;
console.log(`"${list.title}": ${list.entries.length} entries, ${videos.length} videos; ${got} of ${ed.matches.length} matches paired`);
console.log(paired.missing.length ? `No full match for:\n${ed.matches.filter((m) => paired.missing.includes(m.n)).map((m) => `  ${name(m)}`).join('\n')}` : 'Every match has a full-match video.');
if (paired.unpaired.length) console.log(`Videos paired to no match:\n${paired.unpaired.map((v) => `  ${v.id} ${v.title}`).join('\n')}`);
if (paired.extra.length) console.log(`Second videos of a match (not used):\n${paired.extra.map((v) => `  ${v.id} ${v.title}`).join('\n')}`);

if (got * 2 < ed.matches.length) {
  console.error(`Fewer than half the matches paired (${got} of ${ed.matches.length}): nothing written.`);
  process.exit(1);
}
writeFileSync(join(DIR, `${YEAR}-videos.json`), `${JSON.stringify(paired.videos, null, 0).replace(/,/g, ',\n')}\n`);
console.log(`Wrote public/worldcup/${YEAR}-videos.json`);
