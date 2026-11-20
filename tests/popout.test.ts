// FK-62: the live scores window's content: a countdown before the first kick-off, then one line per match.
import { describe, expect, it } from 'vitest';
import { countdownText, countdownTo, popLines } from '../src/data/popout';
import type { Match } from '../src/data/snapshot';

const m = (id: string, t: string, st: Match['st'], hs?: number, as?: number, clk?: string): Match =>
  ({ id, t, c: 'eng.1', st, h: `H${id}`, a: `A${id}`, ...(hs === undefined ? {} : { hs, as }), ...(clk ? { clk } : {}) });

describe('the lines', () => {
  const day = [m('3', '2026-11-21T20:00Z', 'pre'), m('1', '2026-11-21T12:30Z', 'post', 2, 1), m('2', '2026-11-21T15:00Z', 'in', 0, 0, "67'"), m('4', '2026-11-21T17:30Z', 'ppd')];
  const lines = popLines(day, 'UTC');
  it('in kick-off order', () => expect(lines.map((l) => l.id)).toEqual(['1', '2', '4', '3']));
  it('final / live / off / upcoming, with the time or live minute and scores where there are some', () => {
    expect(lines.map((l) => [l.kind, l.time, l.hs, l.as])).toEqual([
      ['final', 'FT', 2, 1], ['live', "67'", 0, 0], ['off', 'PPD', undefined, undefined], ['upcoming', '20:00', undefined, undefined],
    ]);
  });
});

describe('the countdown', () => {
  const day = [m('2', '2026-11-21T17:30Z', 'pre'), m('1', '2026-11-21T15:00Z', 'pre')];
  it('counts to the first kick-off while nothing has started', () => expect(countdownTo(day, Date.parse('2026-11-21T14:00Z'))!.id).toBe('1'));
  it('ends at kick-off (the list takes over by itself)', () => expect(countdownTo(day, Date.parse('2026-11-21T15:00Z'))).toBeUndefined());
  it('ends once a match is live or over', () => {
    expect(countdownTo([m('1', '2026-11-21T15:00Z', 'in', 0, 0), m('2', '2026-11-21T17:30Z', 'pre')], Date.parse('2026-11-21T14:00Z'))).toBeUndefined();
  });
  it('skips postponed and TBD matches', () => {
    const tbd: Match = { ...m('0', '2026-11-21T13:00Z', 'pre'), tbd: 1 } as unknown as Match;
    expect(countdownTo([tbd, m('9', '2026-11-21T12:00Z', 'ppd'), ...day], Date.parse('2026-11-21T11:00Z'))!.id).toBe('1');
  });
  it('h:mm:ss / m:ss', () => {
    expect(countdownText(3_909_000)).toBe('1:05:09');
    expect(countdownText(247_000)).toBe('4:07');
    expect(countdownText(-5)).toBe('0:00');
  });
});
