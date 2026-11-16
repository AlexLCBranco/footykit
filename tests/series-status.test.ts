// FK-33: the season series popup's state line and each meeting's winner (draws and shootouts included).

import { describe, expect, it } from 'vitest';
import { meetingWinner, seriesStatus, type Meeting } from '../src/data/series';
import type { Match } from '../src/data/snapshot';

const m = (h: string, a: string, hs?: number, as?: number, extra: Partial<Match> = {}): Match =>
  ({ id: `${h}${a}${hs}${as}${extra.t ?? ''}`, t: '2026-10-01T19:00Z', c: 'eng.1', st: hs === undefined ? 'pre' : 'post', h, a, ...(hs === undefined ? {} : { hs, as }), ...extra }) as Match;
const meet = (...ms: Match[]): Meeting[] => ms.map((x) => ({ m: x }));
const abbr = (id: string) => id.toUpperCase();

describe('meetingWinner', () => {
  it('home, away, draw, to come', () => {
    expect(meetingWinner(m('a', 'b', 2, 1))).toBe('a');
    expect(meetingWinner(m('a', 'b', 0, 1))).toBe('b');
    expect(meetingWinner(m('a', 'b', 1, 1))).toBe('draw');
    expect(meetingWinner(m('a', 'b'))).toBeUndefined();
  });
  it('a single knockout match level after extra time goes to the shootout winner; a two-leg tie leg stays a draw', () => {
    expect(meetingWinner(m('a', 'b', 1, 1, { hp: 3, ap: 4 }))).toBe('b');
    expect(meetingWinner(m('a', 'b', 1, 1, { hp: 3, ap: 4, ha: 2, aa: 2 }))).toBe('draw');
  });
});

describe('seriesStatus', () => {
  it('nothing played yet', () => {
    expect(seriesStatus(meet(m('a', 'b')), 'a', 'b', abbr)).toBe('Only meeting');
    expect(seriesStatus(meet(m('a', 'b'), m('b', 'a')), 'a', 'b', abbr)).toBe('No games played yet');
  });
  it('one side leads, with draws counted after', () => {
    expect(seriesStatus(meet(m('a', 'b', 0, 2), m('b', 'a')), 'a', 'b', abbr)).toBe('B leads 1–0');
    expect(seriesStatus(meet(m('a', 'b', 0, 2), m('b', 'a', 1, 1), m('a', 'b')), 'a', 'b', abbr)).toBe('B leads 1–0 · 1 draw');
  });
  it('tied, split, won', () => {
    expect(seriesStatus(meet(m('a', 'b', 1, 1), m('b', 'a')), 'a', 'b', abbr)).toBe('Series tied 0–0 · 1 draw');
    expect(seriesStatus(meet(m('a', 'b', 1, 0), m('b', 'a', 1, 0)), 'a', 'b', abbr)).toBe('Series split 1–1');
    expect(seriesStatus(meet(m('a', 'b', 1, 0), m('b', 'a', 0, 3), m('a', 'b', 2, 2)), 'a', 'b', abbr)).toBe('A won 2–0 · 1 draw');
  });
});
