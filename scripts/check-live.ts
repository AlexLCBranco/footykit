// Checks the live site's data. Usage: npx tsx scripts/check-live.ts [--expect snapshot.json] [--site URL]
//   --expect  wait until the live snapshot's generatedAt is this file's (the job's verify step): first look after
//             30 s, then every 30 s, at most WAIT.tries looks (5 min) — at most 10 live requests per run
//   default   freshness: the live snapshot is at most 7 h old, and today's day function answers 200 (2 requests)
// The site defaults to the gauntlet's address (FOOTYKIT_SITE overrides it, e.g. the footykit Vercel URL).
// Vercel requests are a budget (CLAUDE.md): keep this script to a handful of live requests per run.

import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

/** The --expect wait: how often and how many times it looks at the live site. */
export const WAIT = { intervalMs: 30_000, tries: 10 };

/** Looks (after one interval, then every interval) until get() returns want; true if it did within WAIT.tries looks. */
export async function waitForSnapshot(
  get: () => Promise<string>,
  want: string,
  sleep: (ms: number) => Promise<void> = (ms) => new Promise((r) => setTimeout(r, ms)),
  log: (got: string) => void = () => {},
): Promise<boolean> {
  for (let i = 0; i < WAIT.tries; i++) {
    await sleep(WAIT.intervalMs);
    const got = await get();
    if (got === want) return true;
    log(got);
  }
  return false;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const arg = (n: string) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : undefined; };
  const site = (arg('--site') || process.env.FOOTYKIT_SITE || 'https://gauntlet-home.vercel.app/football/').replace(/\/?$/, '/');
  const live = async () => {
    const r = await fetch(`${site}data/snapshot.json?t=${Date.now()}`, { cache: 'no-store' });
    if (!r.ok) throw new Error(`snapshot: HTTP ${r.status}`);
    return (await r.json()) as { generatedAt: string };
  };

  const expectFile = arg('--expect');
  if (expectFile) {
    const want = (JSON.parse(readFileSync(expectFile, 'utf8')) as { generatedAt: string }).generatedAt;
    let last = '';
    const ok = await waitForSnapshot(() => live().then((s) => s.generatedAt, (e: unknown) => String(e)), want, undefined, (g) => { last = g; });
    if (ok) console.log(`live snapshot is ${want}`);
    else { console.error(`live snapshot is ${last}, expected ${want}`); process.exit(1); }
  } else {
    const s = await live();
    const age = (Date.now() - Date.parse(s.generatedAt)) / 3600e3;
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const day = await fetch(`${site}api/day?date=${today}`);
    console.log(`snapshot ${s.generatedAt} (${age.toFixed(1)} h old); day function HTTP ${day.status}`);
    if (age > 7 || !day.ok) process.exit(1);
  }
}
