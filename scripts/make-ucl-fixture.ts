// tests/fixtures/ucl-2025-26.json: the whole 2025-26 Champions League (league phase and knockout phase) from ESPN's
// scoreboards, slimmed like the snapshot's matches. The UCL bracket's tests run on it: a complete season whose real
// bracket is known (Wikipedia, 2025-26 knockout phase), unlike this season, which is mid league phase.
// Usage: npx tsx scripts/make-ucl-fixture.ts

import { writeFileSync } from 'node:fs';
import { SITE, slimMatch, teamsOf, type EspnEvent } from '../src/data/espn.ts';
import type { Match, Team } from '../src/data/snapshot.ts';

const OUT = 'tests/fixtures/ucl-2025-26.json';
const events: EspnEvent[] = [];
for (const y of [2025, 2026]) {
  const j = (await (await fetch(`${SITE}/uefa.champions/scoreboard?dates=${y}&limit=1000`)).json()) as { events?: (EspnEvent & { season?: { year?: number; slug?: string } })[] };
  // the 2025-26 season is ESPN's season year 2025; qualifying rounds aren't the page's business
  for (const e of j.events ?? []) if (e.season?.year === 2025 && !/qualif/i.test(e.season?.slug ?? '')) events.push(e);
}
const matches: Match[] = [];
const teams: Record<string, Team> = {};
for (const e of events) {
  const m = slimMatch(e, 'uefa.champions', false);
  if (!m) continue;
  // scoreboard events don't always carry the stage's name; the season slug always names it
  const slug = (e as { season?: { slug?: string } }).season?.slug;
  if (!m.r && slug) m.r = slug.split('-').map((w) => w[0]!.toUpperCase() + w.slice(1)).join(' ');
  matches.push(m);
  for (const t of teamsOf(e)) teams[t.id] = t;
}
matches.sort((a, b) => a.t.localeCompare(b.t));
writeFileSync(OUT, `${JSON.stringify({ source: `${SITE}/uefa.champions/scoreboard?dates=2025|2026`, fetched: new Date().toISOString().slice(0, 10), teams, matches })}\n`);
console.log(`${OUT}: ${matches.length} matches, ${Object.keys(teams).length} teams; rounds: ${[...new Set(matches.map((m) => m.r))].join(', ')}`);
