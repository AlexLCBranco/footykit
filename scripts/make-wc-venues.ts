// FK-69: builds public/worldcup/<year>-venues.json for the editions in config/wcStadiums.ts: each host city's stadium
// (name, roof and its source from the config; coordinates from the stadium's Wikidata item), and for every match the
// weather at kick-off from Open-Meteo's historical archive (free, no key; saved here so the page never asks for it),
// plus the roof state where config/wcStadiums.ts records one. Prints what is missing. Run: npm run make-wc-venues

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { WC_ROOF_STATE, WC_STADIUMS } from '../config/wcStadiums.ts';
import { ARCHIVE_SOURCE, archiveRequest, playedWeather, type ArchiveAnswer, type WcVenues } from '../src/data/wcVenues.ts';

const DIR = join(import.meta.dirname, '..', 'public', 'worldcup');
const UA = 'footykit/1.0 (https://github.com/AlexLCBranco/footykit)';
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function coordinates(ids: string[]): Promise<Record<string, { lat: number; lon: number }>> {
  const q = `SELECT ?item ?coord WHERE { VALUES ?item { ${ids.map((i) => `wd:${i}`).join(' ')} } ?item wdt:P625 ?coord. }`;
  const r = await fetch('https://query.wikidata.org/sparql', { method: 'POST', headers: { accept: 'application/sparql-results+json', 'content-type': 'application/x-www-form-urlencoded', 'user-agent': UA }, body: `query=${encodeURIComponent(q)}` });
  if (!r.ok) throw new Error(`Wikidata ${r.status}`);
  const rows = ((await r.json()) as { results: { bindings: { item: { value: string }; coord: { value: string } }[] } }).results.bindings;
  const out: Record<string, { lat: number; lon: number }> = {};
  for (const row of rows) {
    const m = /Point\(([-\d.]+) ([-\d.]+)\)/.exec(row.coord.value);
    const id = row.item.value.split('/').pop()!;
    if (m && !out[id]) out[id] = { lat: Math.round(Number(m[2]) * 1e4) / 1e4, lon: Math.round(Number(m[1]) * 1e4) / 1e4 };
  }
  return out;
}

for (const [y, facts] of Object.entries(WC_STADIUMS)) {
  const year = Number(y);
  const ed = JSON.parse(readFileSync(join(DIR, `${year}.json`), 'utf8')) as { matches: { n: number; date: string; time?: string; city?: string }[] };
  const at = await coordinates(facts.map((f) => f.wikidata));
  const out: WcVenues = { stadiums: {}, matches: {}, weatherSource: ARCHIVE_SOURCE };
  for (const f of facts) {
    const p = at[f.wikidata];
    if (!p) throw new Error(`${f.name}: Wikidata ${f.wikidata} has no coordinates`);
    out.stadiums[f.city] = { name: f.name, ...p, roof: f.roof, src: `https://www.wikidata.org/wiki/${f.wikidata}`, roofSrc: f.source };
  }
  const noStadium = ed.matches.filter((m) => !m.city || !out.stadiums[m.city]);
  if (noStadium.length) throw new Error(`${year}: no stadium for the city of matches ${noStadium.map((m) => `${m.n} (${m.city})`).join(', ')}`);
  const noWeather: number[] = [];
  for (const f of facts) {
    const mine = ed.matches.filter((m) => m.city === f.city);
    if (!mine.length) continue;
    const days = mine.map((m) => m.date).sort();
    // a day past the last match: a late kick-off's two hours run into the next day
    const to = new Date(Date.parse(`${days[days.length - 1]}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10);
    const r = await fetch(archiveRequest(out.stadiums[f.city]!, days[0]!, to), { headers: { 'user-agent': UA } });
    if (!r.ok) throw new Error(`Open-Meteo archive ${r.status} for ${f.name}`);
    const answer = (await r.json()) as ArchiveAnswer;
    for (const m of mine) {
      const w = m.time ? playedWeather(answer, m.date, m.time) : undefined;
      const state = WC_ROOF_STATE[year]?.[m.n];
      if (!w) noWeather.push(m.n);
      if (w || state) out.matches[m.n] = { ...(state ? { roofOpen: state.open } : {}), ...(w ? { w } : {}) };
    }
    await sleep(400);
  }
  writeFileSync(join(DIR, `${year}-venues.json`), `${JSON.stringify(out, null, 1)}\n`);
  const noState = ed.matches.filter((m) => out.stadiums[m.city!]!.roof === 'retractable' && out.matches[m.n]?.roofOpen === undefined).map((m) => m.n);
  console.log(`${year}: ${facts.length} stadiums, ${Object.values(out.matches).filter((m) => m.w).length} of ${ed.matches.length} matches with weather`);
  console.log(noWeather.length ? `No weather in the archive for matches: ${noWeather.join(', ')}` : 'Every match has its weather.');
  console.log(noState.length ? `Retractable roof, open or closed not recorded (${noState.length} matches): ${noState.join(', ')}` : 'Every retractable-roof match has its roof state.');
  console.log(`Wrote public/worldcup/${year}-venues.json`);
}
