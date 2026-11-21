// FK-73: a club's usual home ground, the "not their stadium" note with its distance, the hand override, neutral grounds.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { groundChip, groundNote, groundText, groundTip, sameGround, snapshotGrounds, usualGrounds } from '../src/data/homeGround';
import type { Match, Snapshot } from '../src/data/snapshot';
import type { Venue } from '../src/data/venues';

const snap = JSON.parse(readFileSync(join(import.meta.dirname, 'fixtures/snapshot.json'), 'utf8')) as Snapshot;

let n = 0;
const game = (h: string, v: string | undefined, city = 'Town', extra: Partial<Match> = {}): Match => ({ id: `m${n++}`, t: '2026-08-01T15:00Z', c: 'eng.1', st: 'pre', h, a: 'opp', v, city: v ? city : undefined, ctry: v ? 'Land' : undefined, ...extra });
const place = (lat: number, lon: number, src: string, precision: Venue['precision'] = 'venue'): Venue => ({ lat, lon, src, precision });
const TABLE: Record<string, Venue> = {
  'Home Park|Town|Land': place(0, 0, 'Q1'),
  'Home Park (Sponsor Arena)|Town|Land': place(0, 0, 'Q1'),
  'Far Field|Away City|Land': place(0, 3, 'Q2'), // 3° of longitude on the equator ≈ 334 km
  'Next Door|Town|Land': place(0.001, 0, 'Q3'),
};
const opts = { table: TABLE, overrides: {}, neutral: () => undefined };

describe('usual home ground', () => {
  it('the venue of most home matches (at least 3, more than half)', () => {
    const ms = [game('A', 'Home Park'), game('A', 'Home Park'), game('A', 'Home Park'), game('A', 'Far Field', 'Away City')];
    expect(usualGrounds(ms, opts).get('A')).toBe('Home Park|Town|Land');
  });
  it('too few home matches, or no venue with more than half: no usual ground, so no note', () => {
    const few = [game('B', 'Home Park'), game('B', 'Home Park'), game('B', 'Far Field', 'Away City')];
    expect(usualGrounds(few, opts).has('B')).toBe(false);
    expect(groundNote(few[2]!, usualGrounds(few, opts), opts)).toBeUndefined();
    const split = [...Array.from({ length: 3 }, () => game('C', 'Home Park')), ...Array.from({ length: 3 }, () => game('C', 'Far Field', 'Away City'))];
    expect(usualGrounds(split, opts).has('C')).toBe(false);
  });
  it('one stadium under two spellings (same Wikidata item) counts once and is never "moved"', () => {
    expect(sameGround('Home Park|Town|Land', 'Home Park (Sponsor Arena)|Town|Land', TABLE)).toBe(true);
    const ms = [game('D', 'Home Park'), game('D', 'Home Park'), game('D', 'Home Park (Sponsor Arena)'), game('D', 'Home Park (Sponsor Arena)')];
    const u = usualGrounds(ms, opts);
    expect(u.get('D')).toBe('Home Park|Town|Land');
    expect(ms.map((m) => groundNote(m, u, opts))).toEqual([undefined, undefined, undefined, undefined]);
  });
  it('cancelled, venue-less and neutral-venue matches do not count', () => {
    const ms = [game('E', 'Home Park'), game('E', 'Home Park'), game('E', 'Home Park'),
      game('E', 'Far Field', 'Away City', { st: 'can' }), game('E', 'Far Field', 'Away City', { st: 'can' }), game('E', 'Far Field', 'Away City', { st: 'can' }), game('E', 'Far Field', 'Away City', { st: 'can' }),
      game('E', undefined), game('E', 'Far Field', 'Away City', { r: 'Final' }), game('E', 'Far Field', 'Away City', { r: 'Final' }), game('E', 'Far Field', 'Away City', { r: 'Final' }), game('E', 'Far Field', 'Away City', { r: 'Final' })];
    const neutral = (m: Match) => (m.r === 'Final' ? { why: 'the final' } : undefined);
    expect(usualGrounds(ms, { ...opts, neutral }).get('E')).toBe('Home Park|Town|Land');
  });
  it('an override by hand wins', () => {
    const ms = [game('F', 'Home Park'), game('F', 'Home Park'), game('F', 'Home Park')];
    const u = usualGrounds(ms, { ...opts, overrides: { F: { venue: 'Far Field|Away City|Land', source: 'test' } } });
    expect(u.get('F')).toBe('Far Field|Away City|Land');
    expect(groundNote(ms[0]!, u, opts)).toEqual({ kind: 'moved', usual: { name: 'Far Field', city: 'Away City' }, km: 334 });
  });
});

describe('the note on a match', () => {
  const home = [game('G', 'Home Park'), game('G', 'Home Park'), game('G', 'Home Park')];
  const usual = (extra: Match) => usualGrounds([...home, extra], opts);
  it('at the usual ground: nothing', () => {
    expect(groundNote(home[0]!, usualGrounds(home, opts), opts)).toBeUndefined();
  });
  it('somewhere else: "Not their stadium" with the straight-line km from home, the usual ground named on hover', () => {
    const m = game('G', 'Far Field', 'Away City');
    const note = groundNote(m, usual(m), opts)!;
    expect(note).toEqual({ kind: 'moved', usual: { name: 'Home Park', city: 'Town' }, km: 334 });
    expect(groundChip(note)).toBe('Not their stadium · 334 km from home');
    expect(groundTip(note, m, 'Gunners')).toBe('Gunners usually play at home at Home Park, Town.\nThis match is at Far Field, Away City, 334 km away.');
  });
  it('a place footykit has no coordinates for, or next door: the chip without a distance', () => {
    const unknown = game('G', 'Mystery Ground', 'Nowhere');
    expect(groundChip(groundNote(unknown, usual(unknown), opts)!)).toBe('Not their stadium');
    const near = game('G', 'Next Door');
    expect(groundNote(near, usual(near), opts)).toEqual({ kind: 'moved', usual: { name: 'Home Park', city: 'Town' } });
  });
  it('a neutral venue: "Neutral ground" instead, whoever is named at home', () => {
    const m = game('G', 'Far Field', 'Away City', { r: 'Final' });
    const note = groundNote(m, usualGrounds(home, opts), { ...opts, neutral: () => ({ why: 'The final is at Far Field' }) })!;
    expect(groundChip(note)).toBe('Neutral ground');
    expect(groundTip(note, m, 'Gunners')).toBe('Neither team is at home.\nThe final is at Far Field');
  });
  it('no stadium from ESPN: no note, no text', () => {
    const m = game('G', undefined);
    expect(groundNote(m, usualGrounds(home, opts), opts)).toBeUndefined();
    expect(groundText(m)).toBeUndefined();
    expect(groundText(home[0]!)).toBe('Home Park, Town');
  });
});

describe('the recorded season', () => {
  const usual = snapshotGrounds(snap.matches);
  const find = (id: string) => snap.matches.find((m) => m.id === id)!;
  it('Santos v Grêmio on Nov 23 is at the Morumbi, 55 km from Vila Belmiro', () => {
    const m = find('401841320');
    expect(groundChip(groundNote(m, usual)!)).toBe('Not their stadium · 55 km from home');
    expect(groundTip(groundNote(m, usual)!, m, 'Santos')).toContain('usually play at home at Estádio Vila Belmiro (Urbano Caldeira), Santos.');
  });
  it('the Sudamericana final is on neutral ground', () => {
    expect(groundNote(find('401913961'), usual)).toMatchObject({ kind: 'neutral' });
  });
  it('every followed club has a usual ground, and most of its home matches carry no note', () => {
    for (const c of snap.clubs) {
      expect(usual.has(c.id), c.name).toBe(true);
      const home = snap.matches.filter((m) => m.h === c.id && m.v);
      const noted = home.filter((m) => groundNote(m, usual)?.kind === 'moved').length;
      expect(noted * 2, c.name).toBeLessThan(home.length);
    }
  });
});
