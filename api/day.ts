// GET /football/api/day?date=YYYYMMDD → that ESPN (US Eastern) date's matches in every competition footykit shows,
// with live scores and 3-way decimal odds (src/data/day.ts). A Vercel function so the browser makes one small
// same-origin request and the CDN shares it between viewers; ESPN needs no key, so nothing secret lives here.
// A competition whose scoreboard fails is left out; if every one fails the answer is 502 and the page keeps the snapshot.

import { DAY_SLUGS, dayCacheSeconds, dayFromBoards, isEspnDate } from '../src/data/day.ts';
import { SITE, type EspnEvent } from '../src/data/espn.ts';

async function board(slug: string, date: string): Promise<{ slug: string; events: EspnEvent[] } | undefined> {
  try {
    const r = await fetch(`${SITE}/${slug}/scoreboard?dates=${date}`, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(8000) });
    if (!r.ok) return undefined;
    const j = (await r.json()) as { events?: EspnEvent[] };
    return { slug, events: j.events ?? [] };
  } catch {
    return undefined;
  }
}

export async function GET(request: Request): Promise<Response> {
  const date = new URL(request.url).searchParams.get('date');
  if (!isEspnDate(date)) return Response.json({ error: 'date=YYYYMMDD' }, { status: 400 });
  const boards = (await Promise.all(DAY_SLUGS.map((s) => board(s, date)))).filter((b) => b !== undefined);
  if (boards.length === 0) {
    return Response.json({ date, error: 'ESPN did not answer' }, { status: 502, headers: { 'cache-control': 'public, max-age=30, s-maxage=30' } });
  }
  const day = dayFromBoards(date, boards, new Date().toISOString());
  const age = dayCacheSeconds(day.matches, Date.now());
  return Response.json(day, { headers: { 'cache-control': `public, max-age=60, s-maxage=${age}, stale-while-revalidate=${age}` } });
}
