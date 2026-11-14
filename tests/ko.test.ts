import { describe, expect, it } from 'vitest';
import { competitionState, isPhaseRound, tieResult } from '../src/data/ko.ts';
import type { EspnEvent } from '../src/data/espn.ts';

type Side = { id: string; name?: string; score: number; agg?: number; pens?: number };
function ev(date: string, round: string, home: Side, away: Side, opts: { leg?: number; done?: boolean; note?: string; status?: string } = {}): EspnEvent {
  const done = opts.done ?? true;
  const comp = (s: Side, ha: 'home' | 'away') => ({
    id: s.id, homeAway: ha, team: { id: s.id, displayName: s.name },
    score: { value: s.score, aggregateScore: s.agg, shootoutScore: s.pens },
  });
  return {
    id: date, date, seasonType: { name: round },
    competitions: [{
      id: date, date, leg: opts.leg ? { value: opts.leg } : undefined,
      competitors: [comp(home, 'home'), comp(away, 'away')],
      notes: opts.note ? [{ text: opts.note }] : [],
      status: { type: { completed: done, state: done ? 'post' : 'pre', name: opts.status ?? (done ? 'STATUS_FULL_TIME' : 'STATUS_SCHEDULED') } },
    }],
  };
}

describe('tieResult', () => {
  it('second leg: decided by aggregate, not by the match winner', () => {
    // Botafogo 1-0 Cienciano at home after losing 1-6 away: out 2-6
    const e = ev('2026-08-21', 'Round of 16', { id: 'BOT', score: 1, agg: 2 }, { id: 'CIE', score: 0, agg: 6 }, { leg: 2 });
    expect(tieResult(e, 'BOT')).toBe('lost');
    expect(tieResult(e, 'CIE')).toBe('won');
  });
  it('second leg level on aggregate: decided by the shootout', () => {
    const e = ev('2026-10-23', 'Semifinals', { id: 'FLA', score: 0, agg: 0, pens: 2 }, { id: 'EST', score: 0, agg: 0, pens: 3 }, { leg: 2 });
    expect(tieResult(e, 'FLA')).toBe('lost');
  });
  it('single match: score, then shootout', () => {
    expect(tieResult(ev('2026-10-28', 'Round of 16', { id: 'BOU', score: 2 }, { id: 'AVL', score: 1 }), 'AVL')).toBe('lost');
    expect(tieResult(ev('2026-10-27', 'Round of 16', { id: 'FLE', score: 1, pens: 5 }, { id: 'ARS', score: 1, pens: 3 }), 'ARS')).toBe('lost');
  });
  it('falls back to ESPN’s note when scores cannot tell', () => {
    const e = ev('2026-05-15', 'Fifth Round', { id: 'VIT', name: 'Vitória', score: 2 }, { id: 'FLA', name: 'Flamengo', score: 0 }, { leg: 2, note: 'Vitória advances.' });
    expect(tieResult(e, 'FLA')).toBe('lost');
  });
  it('unknown when nothing decides it', () => {
    expect(tieResult(ev('2026-05-15', 'Final', { id: 'A', score: 1 }, { id: 'B', score: 1 }), 'A')).toBe('unknown');
  });
});

describe('competitionState', () => {
  it('a match to come: next-fixture', () => {
    const s = competitionState([ev('2026-12-16', 'Quarterfinals', { id: 'LIV', score: 0 }, { id: 'BOU', score: 0 }, { done: false })], 'LIV');
    expect(s).toEqual({ state: 'next-fixture', date: '2026-12-16', round: 'Quarterfinals' });
  });
  it('postponed matches are not the next fixture', () => {
    const s = competitionState([ev('2026-12-16', 'Quarterfinals', { id: 'LIV', score: 0 }, { id: 'BOU', score: 0 }, { done: false, status: 'STATUS_POSTPONED' })], 'LIV');
    expect(s.state).toBe('unknown');
  });
  it('lost the last tie: eliminated', () => {
    const s = competitionState([
      ev('2026-09-15', 'Third Round', { id: 'IPS', score: 0 }, { id: 'ARS', score: 2 }),
      ev('2026-10-27', 'Fourth Round', { id: 'FLE', score: 1, pens: 5 }, { id: 'ARS', score: 1, pens: 3 }),
    ], 'ARS');
    expect(s).toMatchObject({ state: 'eliminated', round: 'Fourth Round' });
  });
  it('won the last tie, nothing fixtured: awaiting the draw', () => {
    expect(competitionState([ev('2026-11-08', 'Semifinals', { id: 'VAS', score: 1, agg: 2, pens: 4 }, { id: 'PAL', score: 1, agg: 2, pens: 5 }, { leg: 2 })], 'PAL'))
      .toEqual({ state: 'awaiting-draw', lastRound: 'Semifinals' });
  });
  it('won the final: champion', () => {
    expect(competitionState([ev('2026-12-06', 'Final', { id: 'GRE', score: 0 }, { id: 'PAL', score: 1 })], 'PAL')).toEqual({ state: 'champion' });
  });
  it('first leg played with no second leg listed: unknown, never guessed', () => {
    expect(competitionState([ev('2026-08-14', 'Round of 16', { id: 'CIE', score: 6 }, { id: 'BOT', score: 1 }, { leg: 1 })], 'BOT').state).toBe('unknown');
  });
  it('last match in a group: the standings decide', () => {
    expect(competitionState([ev('2026-05-27', 'Group Stage', { id: 'CFC', score: 1 }, { id: 'BOT', score: 3 })], 'BOT')).toEqual({ state: 'phase-over', round: 'Group Stage' });
  });
});

describe('isPhaseRound', () => {
  it.each([['Group Stage', true], ['League Phase', true], ['Knockout Round Playoffs', false], ['Round of 16', false], ['Final', false]])('%s → %s', (r, want) => {
    expect(isPhaseRound(r)).toBe(want);
  });
});
