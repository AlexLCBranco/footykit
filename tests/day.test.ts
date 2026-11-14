// The day layer's pure parts: a recorded Premier League scoreboard (2026-11-21, before kickoff) → matches and odds;
// the CDN cache time per state of the day.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { dayCacheSeconds, dayFromBoards, isEspnDate } from '../src/data/day.ts';
import type { EspnEvent } from '../src/data/espn.ts';
import type { Match } from '../src/data/snapshot.ts';

const board = JSON.parse(readFileSync(join(import.meta.dirname, 'fixtures/board-eng1-20261121.json'), 'utf8')) as { events: EspnEvent[] };

describe('dayFromBoards', () => {
  const day = dayFromBoards('20261121', [{ slug: 'eng.1', events: board.events }], '2026-11-14T12:00:00Z');
  it('reads every match of the scoreboard, in kickoff order, as league matches', () => {
    expect(day.matches).toHaveLength(board.events.length);
    expect(day.matches.map((m) => m.t)).toEqual([...day.matches.map((m) => m.t)].sort());
    expect(day.matches.every((m) => m.c === 'eng.1' && m.st === 'pre' && m.r === undefined && m.hs === undefined)).toBe(true);
  });
  it('turns DraftKings moneylines into 3-way decimal odds', () => {
    const o = Object.values(day.odds);
    expect(o.length).toBeGreaterThan(0);
    for (const x of o) { expect(x.h).toBeGreaterThan(1); expect(x.d).toBeGreaterThan(1); expect(x.a).toBeGreaterThan(1); expect(x.p).toBe('DraftKings'); }
  });
});

describe('dayCacheSeconds', () => {
  const now = Date.parse('2026-11-21T15:00:00Z');
  const m = (t: string, st: Match['st']): Match => ({ id: t, t, c: 'eng.1', st, h: '1', a: '2' });
  it('60 s while a match is live', () => expect(dayCacheSeconds([m('2026-11-21T14:00:00Z', 'in')], now)).toBe(60));
  it('60 s within 2 h of a kickoff', () => expect(dayCacheSeconds([m('2026-11-21T16:30:00Z', 'pre')], now)).toBe(60));
  it('60 s for a match past kickoff still marked pre', () => expect(dayCacheSeconds([m('2026-11-21T14:30:00Z', 'pre')], now)).toBe(60));
  it('10 min for a day whose matches are far off', () => expect(dayCacheSeconds([m('2026-11-21T20:00:00Z', 'pre')], now)).toBe(600));
  it('1 day once every match is over and the day is past', () => expect(dayCacheSeconds([m('2026-11-20T15:00:00Z', 'post')], now)).toBe(86400));
  it('10 min just after the last final whistle', () => expect(dayCacheSeconds([m('2026-11-21T12:00:00Z', 'post')], now)).toBe(600));
  it('a day without matches is past after 6 h', () => expect(dayCacheSeconds([], now)).toBe(86400));
});

it('isEspnDate', () => {
  expect(isEspnDate('20261121')).toBe(true);
  expect(isEspnDate('2026-11-21')).toBe(false);
  expect(isEspnDate(null)).toBe(false);
});
