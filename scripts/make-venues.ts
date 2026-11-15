// Builds config/venues.json — where every venue a followed club plays at is, and how high — from Wikidata, so the map
// never relies on guessed coordinates. Each entry keeps its source (the Wikidata item). ESPN gives a venue's name,
// city and country but no coordinates (Phase 1).
// A few batched queries on Wikidata's query service (one per country, not one per venue: the plain API rate-limits a
// lookup per venue): every stadium with coordinates and all its names and aliases, then the venues' cities (any item
// of that name in the country with a population figure: Spanish and Italian municipalities aren't typed as
// settlements in Wikidata, so a class filter loses Madrid or Bilbao). Matching
// is local: the venue's name against the stadium names (accents, punctuation and words like "Estadio" / "Stadium"
// ignored), within 40 km of the city when the city is known. No stadium found → the city's coordinates,
// `precision: "city"`. Neither → listed (not on the map). Elevation: the stadium's (P2044), else the city's.
// Existing entries are kept, so a re-run only looks up new venues.
// Usage: npx tsx scripts/make-venues.ts [snapshot.json]

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import type { Snapshot } from '../src/data/snapshot.ts';
import { km, venueKey, type Venue } from '../src/data/venues.ts';

const OUT = 'config/venues.json';
const file = process.argv[2] ?? (existsSync('test-output/snapshot.json') ? 'test-output/snapshot.json' : 'tests/fixtures/snapshot.json');
const snap = JSON.parse(readFileSync(file, 'utf8')) as Snapshot;
// Wikimedia asks automated clients for a descriptive user agent; a generic one, no personal details.
const UA = 'footykit-venues/0.2 (personal sports calendar; batched one-off lookup)';

/** ESPN country name → Wikidata country item. */
const COUNTRY: Record<string, string> = {
  England: 'Q145', Scotland: 'Q145', Wales: 'Q145', 'Northern Ireland': 'Q145', 'United Kingdom': 'Q145', Spain: 'Q29', Italy: 'Q38', Germany: 'Q183',
  France: 'Q142', Brazil: 'Q155', Argentina: 'Q414', Uruguay: 'Q77', Paraguay: 'Q733', Chile: 'Q298', Bolivia: 'Q750', Peru: 'Q419', Ecuador: 'Q736',
  Colombia: 'Q739', Venezuela: 'Q717', Portugal: 'Q45', Netherlands: 'Q55', Belgium: 'Q31', Austria: 'Q40', Switzerland: 'Q39', Turkey: 'Q43',
  Türkiye: 'Q43', Greece: 'Q41', Denmark: 'Q35', Norway: 'Q20', Sweden: 'Q34', Czechia: 'Q213', 'Czech Republic': 'Q213', Poland: 'Q36',
  Croatia: 'Q224', Serbia: 'Q403', Ukraine: 'Q212', Cyprus: 'Q229', Azerbaijan: 'Q227', Kazakhstan: 'Q232', Hungary: 'Q28', Romania: 'Q218',
  Slovakia: 'Q214', Slovenia: 'Q215', Bulgaria: 'Q219', Israel: 'Q801', Ireland: 'Q27', Finland: 'Q33', Iceland: 'Q189', 'Saudi Arabia': 'Q851',
  Qatar: 'Q846', Kuwait: 'Q817', 'United States': 'Q30', USA: 'Q30', Mexico: 'Q96', Monaco: 'Q235', Moldova: 'Q217', Georgia: 'Q230', Armenia: 'Q399',
  Scotland_: 'Q22',
};

async function sparql(q: string): Promise<Record<string, { value: string }>[]> {
  for (let attempt = 1; ; attempt++) {
    const r = await fetch('https://query.wikidata.org/sparql', {
      method: 'POST',
      headers: { accept: 'application/sparql-results+json', 'content-type': 'application/x-www-form-urlencoded', 'user-agent': UA },
      body: new URLSearchParams({ query: q }),
    });
    if (r.ok) return ((await r.json()) as { results: { bindings: Record<string, { value: string }>[] } }).results.bindings;
    if (attempt >= 3) throw new Error(`query service: HTTP ${r.status}`);
    await new Promise((res) => setTimeout(res, 5000 * attempt));
  }
}
const pause = () => new Promise((r) => setTimeout(r, 1000));

interface Place { id: string; lat: number; lon: number; elev?: number; pop?: number; names: string[] }
const point = (wkt: string) => { const m = /Point\(([-\d.e]+) ([-\d.e]+)\)/.exec(wkt); return m ? { lon: Number(m[1]), lat: Number(m[2]) } : undefined; };
function places(rows: Record<string, { value: string }>[]): Place[] {
  const out = new Map<string, Place>();
  for (const r of rows) {
    const p = point(r.coord?.value ?? '');
    if (!p) continue;
    const id = r.item!.value.split('/').pop()!;
    const prev = out.get(id);
    const names = (r.names?.value ?? '').split('|').filter(Boolean);
    const elev = r.elev ? Math.round(Number(r.elev.value)) : undefined;
    const pop = r.pop ? Number(r.pop.value) : undefined;
    if (prev) { prev.names.push(...names); prev.elev ??= elev; prev.pop = Math.max(prev.pop ?? 0, pop ?? 0) || undefined; } else out.set(id, { id, ...p, elev, pop, names });
  }
  return [...out.values()];
}

const NAMES = 'FILTER(LANG(?name) IN ("en","pt","es","it","de","fr"))';
/** Every class that is a kind of stadium, resolved once: filtering on them directly is far cheaper than the subclass
 * path per item (that timed out on Brazil). */
let stadiumClasses: string[] = [];
const stadiumQuery = (country: string) => `SELECT ?item ?coord ?elev (GROUP_CONCAT(DISTINCT ?name; separator="|") AS ?names) WHERE {
  VALUES ?cls { ${stadiumClasses.map((c) => `wd:${c}`).join(' ')} }
  ?item wdt:P31 ?cls; wdt:P17 wd:${country}; wdt:P625 ?coord.
  OPTIONAL { ?item wdt:P2044 ?elev. }
  { ?item rdfs:label ?name } UNION { ?item skos:altLabel ?name } ${NAMES}
} GROUP BY ?item ?coord ?elev`;
const cityQuery = (country: string, cities: string[]) => `SELECT ?item ?coord ?elev (MAX(?p) AS ?pop) (GROUP_CONCAT(DISTINCT ?name; separator="|") AS ?names) WHERE {
  VALUES ?l { ${cities.flatMap((c) => ['en', 'pt', 'es', 'it', 'de', 'fr'].map((lang) => `${JSON.stringify(c)}@${lang}`)).join(' ')} }
  ?item rdfs:label ?l.
  ?item wdt:P1082 ?p; wdt:P17 wd:${country}; wdt:P625 ?coord.
  OPTIONAL { ?item wdt:P2044 ?elev. }
  ?item rdfs:label ?name. ${NAMES}
} GROUP BY ?item ?coord ?elev`;

const STOP = new Set(['estadio', 'stadio', 'stade', 'stadion', 'stadium', 'arena', 'municipal', 'comunale', 'olimpico', 'de', 'do', 'da', 'dos', 'das', 'del', 'della', 'di', 'la', 'le', 'el', 'the', 'and', 'y', 'e', 'fc', 'cf', 'club', 'park', 'ground', 'campo', 'nuevo', 'nou']);
const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\(.*?\)/g, ' ').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
const tokens = (s: string) => norm(s).split(' ').filter((t) => t && !STOP.has(t));
const plain = (s: string) => norm(s).replace(/\s/g, '');

/** How well a venue name matches a place's names: 2 = same name, 1 = every significant word of one in the other. */
function score(venue: string, p: Place): number {
  let best = 0;
  const vt = tokens(venue), vp = plain(venue);
  for (const n of p.names) {
    if (plain(n) === vp) return 2;
    const nt = tokens(n);
    if (!vt.length || !nt.length) continue;
    const inN = vt.every((t) => nt.includes(t)), inV = nt.every((t) => vt.includes(t));
    if ((inN || inV) && Math.min(vt.length, nt.length) >= 1) best = Math.max(best, 1);
  }
  return best;
}

const venues: Record<string, Venue> = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : {};
const followed = new Set(snap.clubs.map((c) => c.id));
const todo = new Map<string, { v: string; city: string; ctry: string }>();
for (const m of snap.matches) {
  if (!followed.has(m.h) && !followed.has(m.a)) continue;
  if (!m.v && !m.city) continue;
  const key = venueKey(m);
  if (!venues[key]) todo.set(key, { v: m.v ?? '', city: m.city ?? '', ctry: m.ctry ?? '' });
}
console.log(`${Object.keys(venues).length} known, ${todo.size} to look up`);

const missing: string[] = [];
/** Placed by a unique exact name, without the city check: listed for a look. */
const unchecked: string[] = [];
const byCountry = new Map<string, [string, { v: string; city: string; ctry: string }][]>();
for (const e of todo) {
  const c = COUNTRY[e[1].ctry];
  if (!c) { missing.push(`${e[1].v} (${e[1].city}, ${e[1].ctry}): country not in the table`); continue; }
  byCountry.set(c, [...(byCountry.get(c) ?? []), e]);
}
// stadium, association football venue and multi-purpose stadium: the last two are not under "stadium" in Wikidata
stadiumClasses = (await sparql('SELECT DISTINCT ?c WHERE { VALUES ?root { wd:Q483110 wd:Q1154710 wd:Q1049757 } ?c wdt:P279* ?root }')).map((r) => r.c!.value.split('/').pop()!);
console.log(`${stadiumClasses.length} stadium classes`);
const save = () => writeFileSync(OUT, JSON.stringify(Object.fromEntries(Object.entries(venues).sort(([a], [b]) => a.localeCompare(b))), null, 1) + '\n');
/** A country's stadiums, the classes asked in groups of 8 (one query for all of them times out on big countries). */
async function stadiumsOf(country: string): Promise<Place[]> {
  const all = stadiumClasses;
  const rows: Record<string, { value: string }>[] = [];
  for (let i = 0; i < all.length; i += 8) {
    stadiumClasses = all.slice(i, i + 8);
    try { rows.push(...(await sparql(stadiumQuery(country)))); } finally { stadiumClasses = all; }
    await pause();
  }
  return places(rows);
}
for (const [country, list] of byCountry) {
  let stadiums: Place[];
  try {
    stadiums = await stadiumsOf(country);
  } catch (e) {
    for (const [, x] of list) missing.push(`${x.v} (${x.city}, ${x.ctry}): ${String(e)}`);
    continue;
  }
  const cityNames = [...new Set(list.map(([, x]) => x.city).filter(Boolean))];
  // ESPN writes some cities without accents ("Sao Paulo"): ask for both spellings
  // … and some with hyphens where the place's name has spaces ("Newcastle-upon-Tyne")
  const withAccents = cityNames.flatMap((c) => [c, ...(c.includes('-') ? [c.replace(/-/g, ' ')] : []), ...({ 'Sao Paulo': ['São Paulo'], 'Goiania': ['Goiânia'], 'Belem': ['Belém'], 'Cuiaba': ['Cuiabá'], 'Florianopolis': ['Florianópolis'], 'Ribeirao Preto': ['Ribeirão Preto'], 'Maceio': ['Maceió'], 'Vitoria': ['Vitória'], 'Chapeco': ['Chapecó'], 'Brasilia': ['Brasília'] } as Record<string, string[]>)[c] ?? []]);
  let cities: Place[] = [];
  try { cities = withAccents.length ? places(await sparql(cityQuery(country, withAccents))) : []; } catch (e) { console.log(`${country}: no city items (${String(e)})`); }
  await pause();
  for (const [key, x] of list) {
    const cityPlaces = cities.filter((p) => p.names.some((n) => norm(n) === norm(x.city)));
    // Several places can share a city's name ("Bremen", "Valencia"): a stadium is taken when it lies near ANY of them;
    // for the city fallback, the most populous one.
    const city = [...cityPlaces].sort((a, b) => (b.pop ?? 0) - (a.pop ?? 0))[0];
    const near = (s: Place) => (cityPlaces.length ? Math.min(...cityPlaces.map((c) => km(s, c))) : 0);
    // Without the city, a name match is only trusted when no other stadium of the country matches as well
    // (St James' Park is in Newcastle and in Exeter).
    const candidates = cityPlaces.length ? stadiums.map((s) => ({ s, sc: score(x.v, s), d: near(s) })).filter((c) => c.sc > 0 && c.d < 40) : [];
    candidates.sort((a, b) => b.sc - a.sc || a.d - b.d);
    // ESPN sometimes names the wrong city (Signal Iduna Park in "Aue"): a stadium of exactly that name, the only one in
    // the country, is taken wherever it is
    const exact = stadiums.filter((st) => score(x.v, st) === 2);
    const hit = candidates[0]?.s ?? (exact.length === 1 ? exact[0] : undefined);
    if (hit && !candidates.length) unchecked.push(`${x.v} (${x.city}) → ${hit.lat.toFixed(2)}, ${hit.lon.toFixed(2)} ${hit.id}`);
    // a city of that name on the wrong continent (an overseas namesake) is not it
    const southAmerican = ['Brazil', 'Argentina', 'Uruguay', 'Paraguay', 'Chile', 'Bolivia', 'Peru', 'Ecuador', 'Colombia', 'Venezuela'].includes(x.ctry);
    const cityOk = city && (city.lon < -25) === southAmerican ? city : undefined;
    const at = hit ?? cityOk;
    if (!at) { missing.push(`${x.v} (${x.city}, ${x.ctry})`); continue; }
    // Stadium items rarely carry an elevation: the city's then — the nearest place of that name that has one (the most
    // populous "La Paz" is the department, without one)
    const cityElev = cityPlaces.filter((p) => p.elev !== undefined && km(p, at) < 40).sort((a, b) => km(a, at) - km(b, at))[0]?.elev;
    const elev = hit?.elev ?? cityElev;
    venues[key] = { lat: Math.round(at.lat * 1e4) / 1e4, lon: Math.round(at.lon * 1e4) / 1e4, ...(elev !== undefined ? { elev } : {}), precision: hit ? 'venue' : 'city', src: `https://www.wikidata.org/wiki/${at.id}` };
  }
  console.log(`${country}: ${list.length} venues, ${stadiums.length} stadiums, ${cities.length} city items`);
  save();
}

// Venues ESPN spells differently from Wikidata: taken from the item named in config/venue-overrides.json.
const overrides = Object.entries(JSON.parse(readFileSync('config/venue-overrides.json', 'utf8')) as Record<string, string>).filter(([k]) => !k.startsWith('_'));
if (overrides.length) {
  const rows = await sparql(`SELECT ?item ?coord ?elev WHERE { VALUES ?item { ${overrides.map(([, q]) => `wd:${q}`).join(' ')} } ?item wdt:P625 ?coord. OPTIONAL { ?item wdt:P2044 ?elev. } }`);
  const byId = new Map(places(rows).map((p) => [p.id, p]));
  for (const [key, q] of overrides) {
    const p = byId.get(q);
    if (!p) { missing.push(`${key}: override ${q} has no coordinates`); continue; }
    venues[key] = { lat: Math.round(p.lat * 1e4) / 1e4, lon: Math.round(p.lon * 1e4) / 1e4, ...(p.elev !== undefined ? { elev: p.elev } : {}), precision: 'venue', src: `https://www.wikidata.org/wiki/${q}` };
    const i = missing.findIndex((m) => m.startsWith(key.split('|')[0]!));
    if (i >= 0) missing.splice(i, 1);
  }
}
save();
const all = Object.values(venues);
console.log(`${OUT}: ${all.length} venues (${all.filter((v) => v.precision === 'venue').length} stadium items, ${all.filter((v) => v.precision === 'city').length} at city level), ${all.filter((v) => (v.elev ?? 0) >= 2000).length} at 2,000 m or more`);
if (unchecked.length) console.log(`placed by name only (city not found): ${unchecked.join('; ')}`);
if (missing.length) console.log(`not found (not on the map): ${missing.join('; ')}`);
