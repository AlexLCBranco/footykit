// Checks that every rivalry's source page answers and prints its first lines, so a human can see the page is about
// those two clubs. Wikipedia's summary API, one request at a time (it rate-limits bursts). Not run in CI: network.

import { RIVALRIES } from '../config/rivalries.ts';

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
let failed = 0;
for (const r of RIVALRIES) {
  const u = new URL(r.source);
  const title = u.pathname.replace('/wiki/', '');
  let res: Response | undefined;
  for (let i = 0; i < 5; i++) {
    res = await fetch(`${u.origin}/api/rest_v1/page/summary/${title}`, { headers: { 'User-Agent': 'footykit-check/1.0 (rivalry sources)' } });
    if (res.status !== 429) break;
    await wait(4000 * (i + 1));
  }
  const j = res?.ok ? ((await res.json()) as { title?: string; extract?: string }) : {};
  if (!res?.ok) failed++;
  console.log(`${res?.ok ? 'ok  ' : 'FAIL'} ${r.name} (${r.teams.join('–')}) → ${j.title ?? res?.status}: ${(j.extract ?? '').slice(0, 150).replace(/\n/g, ' ')}`);
  await wait(1200);
}
if (failed) {
  console.error(`${failed} source page(s) did not answer`);
  process.exit(1);
}
