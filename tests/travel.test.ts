// The venue table (config/venues.json, from Wikidata) and the travel worked out from it, on the recorded snapshot.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import VENUES from '../config/venues.json';
import { buildModel } from '../src/data/model';
import type { Snapshot } from '../src/data/snapshot';
import { matchTravel, teamTravel, venueOf } from '../src/data/travel';
import { km, type Venue } from '../src/data/venues';

const snap = JSON.parse(readFileSync(join(import.meta.dirname, 'fixtures/snapshot.json'), 'utf8')) as Snapshot;
const model = buildModel(snap, 'America/Sao_Paulo');
const table = VENUES as Record<string, Venue>;
const ARS = '359';
const SOUTH = ['Brazil', 'Argentina', 'Uruguay', 'Paraguay', 'Chile', 'Bolivia', 'Peru', 'Ecuador', 'Colombia', 'Venezuela'];

describe('venue table', () => {
  it('every place has a Wikidata source and lies on its country\'s continent', () => {
    const entries = Object.entries(table);
    expect(entries.length).toBeGreaterThan(200);
    for (const [key, v] of entries) {
      expect(v.src, key).toMatch(/^https:\/\/www\.wikidata\.org\/wiki\/Q\d+$/);
      const country = key.split('|')[2]!;
      if (SOUTH.includes(country)) expect(v.lon, key).toBeLessThan(-30);
      else if (country) expect(v.lon, key).toBeGreaterThan(-25);
    }
  });
  it('known places', () => {
    const find = (name: string) => Object.entries(table).find(([k]) => k.startsWith(`${name}|`))?.[1];
    // Newcastle's St James' Park, not Exeter's St James Park
    expect(find("St. James' Park")!.lat).toBeGreaterThan(54.9);
    // Dortmund's stadium although ESPN gives its city as "Aue"
    expect(km(find('Signal Iduna Park')!, { lat: 51.51, lon: 7.47 })).toBeLessThan(5);
    // La Paz, ~3,600 m (the city's figure: the stadium item has none)
    expect(find('Estadio Hernando Siles')!.elev).toBeGreaterThan(3500);
  });
  it('almost every followed club\'s match has a known venue', () => {
    const followed = new Set(snap.clubs.map((c) => c.id));
    const ms = snap.matches.filter((m) => (followed.has(m.h) || followed.has(m.a)) && m.v);
    const known = ms.filter((m) => venueOf(m));
    expect(known.length / ms.length).toBeGreaterThan(0.98);
  });
});

describe('travel', () => {
  const atNewcastle = snap.matches.find((m) => m.a === ARS && m.t.startsWith('2026-11-21'))!;
  it('both teams: previous and next match, straight-line km, days between', () => {
    const [ars, newc] = matchTravel(model, atNewcastle);
    expect(ars.team).toBe(ARS);
    expect(newc.team).toBe(atNewcastle.h);
    expect(model.dayOf(ars.prev!.m)).toBe('2026-11-07');
    expect(ars.prev!.days).toBe(14);
    expect(model.dayOf(ars.next!.m)).toBe('2026-11-24');
    expect(ars.next!.days).toBe(3);
    // London ↔ Newcastle, straight line
    expect(ars.prev!.km).toBeGreaterThan(370);
    expect(ars.prev!.km).toBeLessThan(420);
  });
  it('two matches at the same ground: stayed, 0 km', () => {
    const own = (model.byTeam.get(ARS) ?? []).filter((m) => m.st === 'post');
    // two home matches in a row at the Emirates (not the Community Shield in Cardiff, where Arsenal were also "home")
    const i = own.findIndex((m, k) => k > 0 && m.v === 'Emirates Stadium' && own[k - 1]!.v === 'Emirates Stadium' && model.byTeam.get(ARS)!.indexOf(own[k - 1]!) === model.byTeam.get(ARS)!.indexOf(m) - 1);
    const t = teamTravel(model, own[i]!, ARS);
    expect(t.prev).toMatchObject({ stayed: true, km: 0 });
  });
  it('the first match of the season has no previous one; the last no next', () => {
    const own = model.byTeam.get(ARS)!;
    expect(teamTravel(model, own[0]!, ARS).prev).toBeUndefined();
    expect(teamTravel(model, own[own.length - 1]!, ARS).next).toBeUndefined();
  });
  it('a team that is not followed has no legs (its schedule isn\'t loaded)', () => {
    const vsOther = model.byTeam.get(ARS)!.find((m) => !model.followed.has(m.h === ARS ? m.a : m.h))!;
    const other = vsOther.h === ARS ? vsOther.a : vsOther.h;
    expect(teamTravel(model, vsOther, other)).toEqual({ team: other, followed: false });
  });
});
