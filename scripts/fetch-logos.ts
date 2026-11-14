// Downloads team and competition logos into public/logos/ (teams: <espnId>.png, competitions: c-<slug>.png), 80 px,
// through ESPN's image resizer. The app only ever loads these local files, never ESPN's CDN. Already-present files are
// kept, so a run only fetches what is new (a promoted club, a new cup opponent).
// Usage: npm run fetch-logos [snapshot.json]   (default test-output/snapshot.json, else tests/fixtures/snapshot.json)
// Logos are trademarks of their clubs and competitions; stored locally for this personal project.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { SITE } from '../src/data/espn.ts';
import type { Snapshot } from '../src/data/snapshot.ts';
import { logoTeams } from '../src/data/logos.ts';

const file = process.argv[2] ?? (existsSync('test-output/snapshot.json') ? 'test-output/snapshot.json' : 'tests/fixtures/snapshot.json');
const snap = JSON.parse(readFileSync(file, 'utf8')) as Snapshot;
const dir = join(import.meta.dirname, '..', 'public', 'logos');
mkdirSync(dir, { recursive: true });

const resized = (path: string) => `https://a.espncdn.com/combiner/i?img=${encodeURIComponent(path)}&w=80&h=80&scale=crop&cquality=80&location=origin`;

async function save(url: string, to: string): Promise<boolean> {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(15000) });
    const type = r.headers.get('content-type') ?? '';
    if (!r.ok || !type.startsWith('image/')) return false;
    writeFileSync(to, Buffer.from(await r.arrayBuffer()));
    return true;
  } catch {
    return false;
  }
}

const missing: string[] = [];
let fetched = 0;
const teams = logoTeams(snap);
const queue = [...teams].filter((id) => !existsSync(join(dir, `${id}.png`)));
await Promise.all(Array.from({ length: 6 }, async () => {
  for (let id = queue.shift(); id; id = queue.shift()) {
    if (await save(resized(`/i/teamlogos/soccer/500/${id}.png`), join(dir, `${id}.png`))) fetched++;
    else missing.push(`${snap.teams[id]?.name ?? '?'} (${id})`);
  }
}));

for (const slug of Object.keys(snap.comps)) {
  const to = join(dir, `c-${slug}.png`);
  if (existsSync(to)) continue;
  const j = (await (await fetch(`${SITE}/${slug}/scoreboard?limit=1`)).json()) as { leagues?: { logos?: { href: string; rel?: string[] }[] }[] };
  const logos = j.leagues?.[0]?.logos ?? [];
  const href = (logos.find((l) => l.rel?.includes('default')) ?? logos[0])?.href;
  if (href && (await save(resized(new URL(href).pathname), to))) fetched++;
  else missing.push(`competition ${slug}`);
}

console.log(`${teams.size} teams need a logo; fetched ${fetched} new file(s)`);
if (missing.length) console.log(`no logo (shown as a plain disc): ${missing.join(', ')}`);
