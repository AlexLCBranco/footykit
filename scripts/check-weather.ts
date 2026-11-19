// FK-39: one live check of Open-Meteo for one venue (the Etihad), the request footykit's Slate builds; prints the
// weather at the next full hour. `--record` saves the answer for two venues (Etihad, Maracanã) as the unit tests'
// fixture (tests/fixtures/open-meteo.json). Run: npx tsx scripts/check-weather.ts [--record]
import { writeFileSync } from 'node:fs';
import VENUES from '../config/venues.json';
import { readAnswer, weatherLine, weatherRequest, type WeatherAnswer } from '../src/data/weather';
import type { Venue } from '../src/data/venues';

const table = VENUES as Record<string, Venue>;
const keys = ['Etihad Stadium|Manchester|England', 'Estadio do Maracana|Rio de Janeiro|Brazil'];
const record = process.argv.includes('--record');
const places = (record ? keys : keys.slice(0, 1)).map((k) => table[k]!);
const url = weatherRequest(places)!;
const r = await fetch(url);
if (!r.ok) throw new Error(`Open-Meteo answered ${r.status}`);
const answer = (await r.json()) as WeatherAnswer;
const hours = readAnswer(answer, places.length);
const next = new Date(Math.ceil(Date.now() / 3_600_000) * 3_600_000).toISOString().slice(0, 13);
hours.forEach((h, i) => {
  const w = h.get(next);
  if (!w) throw new Error(`${keys[i]}: no weather for ${next} (${h.size} hours in the answer)`);
  console.log(`${keys[i]} at ${next}Z: ${weatherLine(w)} (code ${w.code}); ${h.size} hours`);
});
if (record) writeFileSync('tests/fixtures/open-meteo.json', JSON.stringify(answer));
