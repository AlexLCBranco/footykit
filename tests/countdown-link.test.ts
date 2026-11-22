// FK-61: the Slate's Countdown link: which match it counts down to, the timer's name, and the halftime-timer address.
import { describe, expect, it } from 'vitest';
import { countdownLink, HALFTIME_TIMER } from '../src/data/countdownLink';
import type { Match } from '../src/data/snapshot';

const m = (id: string, t: string, h: string, a: string, extra: Partial<Match> = {}): Match => ({ id, t, c: 'eng.1', st: 'pre', h, a, ...extra });
const NAMES: Record<string, string> = { ars: 'Arsenal', che: 'Chelsea', liv: 'Liverpool', eve: 'Everton', mci: 'Man City', ful: 'Fulham' };
const name = (id: string) => NAMES[id]!;
const day = [m('2', '2026-11-21T19:30:00Z', 'ars', 'che'), m('1', '2026-11-21T15:00:00Z', 'mci', 'ful'), m('3', '2026-11-21T22:00:00Z', 'liv', 'eve')];
const at = (iso: string) => Date.parse(iso);
const params = (url: string) => Object.fromEntries(new URL(url).searchParams);

describe('countdownLink (FK-61)', () => {
  it('before anything has started: the first match of the day, named "First match"', () => {
    const c = countdownLink(day, at('2026-11-21T10:00:00Z'), name, 'Europe/London')!;
    expect(c.m.id).toBe('1');
    expect(c.first).toBe(true);
    expect(c.name).toBe('First match · Man City–Fulham 15:00');
  });

  it('once the first match has kicked off: the next one that has not, named "Next match"', () => {
    const c = countdownLink(day, at('2026-11-21T15:00:00Z'), name, 'Europe/London')!;
    expect(c.m.id).toBe('2');
    expect(c.first).toBe(false);
    expect(c.name).toBe('Next match · Arsenal–Chelsea 19:30');
    expect(countdownLink(day, at('2026-11-21T21:00:00Z'), name, 'Europe/London')!.name).toBe('Next match · Liverpool–Everton 22:00');
  });

  it('a live or finished match is never the target, whatever its kick-off time says', () => {
    const live = [m('1', '2026-11-21T15:00:00Z', 'mci', 'ful', { st: 'in' }), day[0]!];
    expect(countdownLink(live, at('2026-11-21T14:59:00Z'), name)!.m.id).toBe('2');
  });

  it('no match left to start: nothing to count down to', () => {
    expect(countdownLink(day, at('2026-11-21T22:00:00Z'), name)).toBeUndefined();
    expect(countdownLink([], at('2026-11-21T10:00:00Z'), name)).toBeUndefined();
    expect(countdownLink([m('1', '2026-11-21T15:00:00Z', 'mci', 'ful', { st: 'post' })], at('2026-11-21T10:00:00Z'), name)).toBeUndefined();
  });

  it('a postponed or cancelled match, or one without a kick-off time, is skipped and does not count as the first', () => {
    const list = [m('0', '2026-11-21T12:00:00Z', 'liv', 'eve', { st: 'ppd' }), m('9', '2026-11-21T00:00:00Z', 'ars', 'che', { tbd: 1 }), day[1]!];
    const c = countdownLink(list, at('2026-11-21T10:00:00Z'), name, 'Europe/London')!;
    expect(c.m.id).toBe('1');
    expect(c.first).toBe(true);
  });

  it("the link is halftime-timer's format: the kick-off with its offset and the name, both URL-encoded", () => {
    const c = countdownLink(day, at('2026-11-21T10:00:00Z'), name, 'America/Sao_Paulo')!;
    expect(c.url.startsWith(`${HALFTIME_TIMER}?end=`)).toBe(true);
    expect(c.url).toBe('https://halftime-timer.vercel.app/?end=2026-11-21T15%3A00%3A00Z&name=First%20match%20%C2%B7%20Man%20City%E2%80%93Fulham%2012%3A00');
    expect(params(c.url)).toEqual({ end: '2026-11-21T15:00:00Z', name: 'First match · Man City–Fulham 12:00' });
    // the same instant halftime-timer will count down to
    expect(Date.parse(params(c.url).end!)).toBe(at('2026-11-21T15:00:00Z'));
  });
});
