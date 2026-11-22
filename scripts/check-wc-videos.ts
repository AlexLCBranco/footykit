// FK-67 / FK-68: the live check of every address in public/worldcup/<year>-videos.json: each one must answer.
// A FIFA+ replay page (www.fifa.com/en/watch/<id>) is drawn by script from FIFA's data host, so that host's page data is
// what is asked (200 and still a video page); a YouTube video is asked through YouTube's oEmbed (200 only for a video
// that exists and is public). Prints what fails and exits 1. Run: npm run check-wc-videos [-- 2022]
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { isFifaPlus, WC_VIDEO_YEARS } from '../src/data/worldcup.ts';

const DIR = join(import.meta.dirname, '..', 'public', 'worldcup');
const years = process.argv.slice(2).map(Number).filter(Boolean);

async function answers(url: string): Promise<string | undefined> {
  try {
    if (isFifaPlus(url)) {
      const r = await fetch(`https://cxm-api.fifa.com/fifaplusweb/api/pages/en/watch/${url.split('/').pop()}`);
      if (!r.ok) return `FIFA answered ${r.status}`;
      const page = (await r.json()) as { template?: string };
      return page.template === 'videoDetailsTemplate' ? undefined : `not a video page (${page.template})`;
    }
    const r = await fetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(url)}`);
    return r.ok ? undefined : `YouTube answered ${r.status}`;
  } catch (e) { return String(e); }
}

let bad = 0;
for (const year of years.length ? years : WC_VIDEO_YEARS) {
  const videos = Object.entries(JSON.parse(readFileSync(join(DIR, `${year}-videos.json`), 'utf8')) as Record<string, string>);
  const failed: string[] = [];
  // a few at a time: quick, and gentle on the two sites
  for (let i = 0; i < videos.length; i += 8) {
    await Promise.all(videos.slice(i, i + 8).map(async ([n, url]) => { const why = await answers(url); if (why) failed.push(`  match ${n}: ${url} (${why})`); }));
  }
  console.log(`${year}: ${videos.length - failed.length} of ${videos.length} addresses answer${failed.length ? `\n${failed.join('\n')}` : ''}`);
  bad += failed.length;
}
if (bad) process.exit(1);
