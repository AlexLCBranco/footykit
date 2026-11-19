// FK-39: the weather at kick-off — the Open-Meteo request (several venues at once), reading its answer (recorded:
// tests/fixtures/open-meteo.json, Etihad + Maracanã, 2026-11-19), forecasts only, and the store's cache (one request
// for a day's venues, a venue asked again at most once an hour).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { fmtTemp, inForecast, kickoffHour, matchVenue, readAnswer, weatherIcon, weatherLine, weatherRequest, type WeatherAnswer } from '../src/data/weather';
import type { Match } from '../src/data/snapshot';
import { createWeatherStore, REFRESH_MS } from '../src/slate/weather';

const answer = JSON.parse(readFileSync(join(import.meta.dirname, 'fixtures/open-meteo.json'), 'utf8')) as WeatherAnswer;
const etihad = { v: 'Etihad Stadium', city: 'Manchester', ctry: 'England' };
const maracana = { v: 'Estadio do Maracana', city: 'Rio de Janeiro', ctry: 'Brazil' };
const m = (id: string, t: string, extra: Partial<Match> = {}): Match => ({ id, t, c: 'eng.1', st: 'pre', h: '1', a: '2', ...etihad, ...extra });
const NOW = Date.parse('2026-11-19T09:30Z');

describe('the request', () => {
  it('one call for several venues: their places, the hourly fields, UTC, the whole forecast', () => {
    const url = new URL(weatherRequest([matchVenue(m('a', ''))!.at, matchVenue(m('b', '', maracana))!.at])!);
    expect(url.origin + url.pathname).toBe('https://api.open-meteo.com/v1/forecast');
    expect(url.searchParams.get('latitude')!.split(',')).toHaveLength(2);
    expect(url.searchParams.get('hourly')).toBe('temperature_2m,apparent_temperature,precipitation_probability,wind_speed_10m,weather_code');
    expect(url.searchParams.get('timezone')).toBe('GMT');
    expect(url.searchParams.get('forecast_days')).toBe('16');
    expect(weatherRequest([])).toBeUndefined();
  });
  it('a venue missing from config/venues.json: no place', () => {
    expect(matchVenue(m('a', '', { v: 'Nowhere Park', city: 'X', ctry: 'Y' }))).toBeUndefined();
  });
  it('forecasts only: today to 16 days ahead, set kick-off, not over', () => {
    expect(inForecast(m('a', '2026-11-19T20:00Z'), NOW)).toBe(true);
    expect(inForecast(m('a', '2026-12-04T20:00Z'), NOW)).toBe(true);
    expect(inForecast(m('a', '2026-12-05T00:00Z'), NOW)).toBe(false);
    expect(inForecast(m('a', '2026-11-18T20:00Z'), NOW)).toBe(false);
    expect(inForecast(m('a', '2026-11-19T20:00Z', { tbd: 1 }), NOW)).toBe(false);
    expect(inForecast(m('a', '2026-11-19T08:00Z', { st: 'post' }), NOW)).toBe(false);
  });
});

describe('reading the answer', () => {
  const [man, rio] = readAnswer(answer, 2);
  it('each venue its hours, keyed by the UTC hour', () => {
    expect(man!.size).toBeGreaterThan(300);
    expect(rio!.size).toBeGreaterThan(300);
    const w = man!.get(kickoffHour('2026-11-19T10:30Z'))!;
    expect(w).toEqual({ temp: expect.any(Number), feels: expect.any(Number), rain: expect.any(Number), wind: expect.any(Number), code: expect.any(Number) });
    expect(rio!.get('2026-11-19T10')!.temp).toBeGreaterThan(man!.get('2026-11-19T10')!.temp); // Rio in November is warmer
  });
  it('a kick-off at 19:45 reads the 19:00 hour', () => expect(kickoffHour('2026-11-19T19:45Z')).toBe('2026-11-19T19'));
  it('a single-venue answer (an object, not a list) reads too; a broken one gives nothing', () => {
    expect(readAnswer((answer as unknown[])[0] as WeatherAnswer, 1)[0]!.size).toBeGreaterThan(300);
    expect(readAnswer({} as WeatherAnswer, 1)[0]!.size).toBe(0);
  });
  it('the line and the sign', () => {
    expect(weatherLine({ temp: -3.6, feels: -8.2, rain: 40, wind: 21.6, code: 71 })).toBe('−4 °C, feels −8 °C · rain 40% · wind 22 km/h');
    expect(fmtTemp(0.2)).toBe('0 °C');
    expect(weatherIcon({ temp: 0, feels: 0, rain: 0, wind: 0, code: 71 }).sky).toBe('snow');
    expect(weatherIcon({ temp: 0, feels: 0, rain: 0, wind: 0, code: 61 }).sky).toBe('rain');
    expect(weatherIcon({ temp: 0, feels: 0, rain: 0, wind: 0, code: 0 }).sky).toBe('clear');
    expect(weatherIcon({ temp: 0, feels: 0, rain: 0, wind: 0, code: 95 }).sky).toBe('thunderstorm');
  });
});

describe('the store: one request per day\'s venues, at most hourly per venue', () => {
  const flush = () => new Promise((r) => setTimeout(r, 0));
  it('asks once for both venues, then not again within the hour; again after it', async () => {
    let now = NOW;
    const urls: string[] = [];
    const store = createWeatherStore(async (u) => { urls.push(u); return answer; }, () => now);
    const day = [m('a', '2026-11-19T15:00Z'), m('b', '2026-11-19T20:00Z', maracana), m('c', '2026-11-19T17:30Z')];
    store.show(day);
    store.show(day); // in flight: no second request
    await flush();
    expect(urls).toHaveLength(1);
    expect(new URL(urls[0]!).searchParams.get('latitude')!.split(',')).toHaveLength(2); // the Etihad once
    expect(store.get(matchVenue(day[0]!)!.key)!.get('2026-11-19T15')).toBeDefined();
    now += REFRESH_MS - 1;
    store.show(day);
    await flush();
    expect(urls).toHaveLength(1);
    now += 2;
    store.show(day);
    await flush();
    expect(urls).toHaveLength(2);
  });
  it('matches past the forecast or without a known venue: no request', async () => {
    const urls: string[] = [];
    const store = createWeatherStore(async (u) => { urls.push(u); return answer; }, () => NOW);
    store.show([m('a', '2027-01-10T15:00Z'), m('b', '2026-11-19T15:00Z', { v: 'Nowhere Park', city: 'X', ctry: 'Y' })]);
    await flush();
    expect(urls).toEqual([]);
  });
  it('a failed answer: no weather, and the venue is asked again next time', async () => {
    let fail = true;
    const urls: string[] = [];
    const store = createWeatherStore(async (u) => { urls.push(u); if (fail) throw new Error('down'); return answer; }, () => NOW);
    const day = [m('a', '2026-11-19T15:00Z')];
    store.show(day);
    await flush();
    expect(store.get(matchVenue(day[0]!)!.key)).toBeUndefined();
    fail = false;
    store.show(day);
    await flush();
    expect(urls).toHaveLength(2);
    expect(store.get(matchVenue(day[0]!)!.key)).toBeDefined();
  });
});
