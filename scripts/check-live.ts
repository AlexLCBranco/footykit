// Checks the live site's data. Usage: npx tsx scripts/check-live.ts [--expect snapshot.json] [--site URL]
//   --expect  wait (up to 5 min) until the live snapshot's generatedAt is this file's (the job's verify step)
//   default   freshness: the live snapshot is at most 7 h old, and today's day function answers 200
// The site defaults to the gauntlet's address (FOOTYKIT_SITE overrides it, e.g. the footykit Vercel URL).

import { readFileSync } from 'node:fs';

const arg = (n: string) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : undefined; };
const site = (arg('--site') ?? process.env.FOOTYKIT_SITE ?? 'https://gauntlet-home.vercel.app/football/').replace(/\/?$/, '/');
const live = async () => {
  const r = await fetch(`${site}data/snapshot.json?t=${Date.now()}`, { cache: 'no-store' });
  if (!r.ok) throw new Error(`snapshot: HTTP ${r.status}`);
  return (await r.json()) as { generatedAt: string };
};

const expectFile = arg('--expect');
if (expectFile) {
  const want = (JSON.parse(readFileSync(expectFile, 'utf8')) as { generatedAt: string }).generatedAt;
  for (let i = 0; ; i++) {
    const got = await live().then((s) => s.generatedAt, (e: unknown) => String(e));
    if (got === want) { console.log(`live snapshot is ${want}`); break; }
    if (i >= 30) { console.error(`live snapshot is ${got}, expected ${want}`); process.exit(1); }
    await new Promise((r) => setTimeout(r, 10_000));
  }
} else {
  const s = await live();
  const age = (Date.now() - Date.parse(s.generatedAt)) / 3600e3;
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const day = await fetch(`${site}api/day?date=${today}`);
  console.log(`snapshot ${s.generatedAt} (${age.toFixed(1)} h old); day function HTTP ${day.status}`);
  if (age > 7 || !day.ok) process.exit(1);
}
