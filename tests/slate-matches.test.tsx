// FK-77: the Slate kit's day list (each match with its exact start instant, in start order, by the combined Slate's
// day rule: São Paulo time, a start before 05:00 counts for the day before) and one match's card on its own, which
// must be exactly the card the whole-day Slate shows.
import { cleanup, render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildModel } from '../src/data/model';
import type { Match, Snapshot } from '../src/data/snapshot';
import { SLATE_CARD_WIDTH, SLATE_DAY_START_HOUR, SLATE_DAY_ZONE, SlateDay, slateDayOf, SlateMatchCard, slateMatches } from '../src/slate';

const snap = JSON.parse(readFileSync(join(import.meta.dirname, 'fixtures/snapshot.json'), 'utf8')) as Snapshot;
const TZ = 'America/Sao_Paulo';
const data = buildModel(snap, TZ);
const DAY = '2026-11-21';
const NOW = Date.parse('2026-11-21T15:00:00Z');
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); });

/** A copy of the fixture with one match moved to `t` (São Paulo is UTC−3 all year). */
const withMatchAt = (t: string, tbd = false) => {
  const first = data.byDay.get(DAY)![0]!;
  const moved: Match = { ...first, t, ...(tbd ? { tbd: 1 as const } : {}) };
  return { id: first.id, model: buildModel({ ...snap, matches: snap.matches.map((m) => (m.id === first.id ? moved : m)) }, TZ) };
};

describe('the combined Slate\'s day (owner\'s rule, 2026-11-21)', () => {
  it('is counted in São Paulo time and starts at 05:00', () => {
    expect(SLATE_DAY_ZONE).toBe('America/Sao_Paulo');
    expect(SLATE_DAY_START_HOUR).toBe(5);
  });
  it('a 04:30 start counts for the day before; a 05:00 start for that day', () => {
    expect(slateDayOf('2026-11-22T07:30:00Z')).toBe('2026-11-21'); // 04:30 on Nov 22 in São Paulo
    expect(slateDayOf('2026-11-22T07:59:59Z')).toBe('2026-11-21'); // 04:59:59
    expect(slateDayOf('2026-11-22T08:00:00Z')).toBe('2026-11-22'); // 05:00
    expect(slateDayOf(Date.parse('2026-11-22T08:00:00Z'))).toBe('2026-11-22');
  });
  it('an evening or a just-after-midnight start belongs to that night', () => {
    expect(slateDayOf('2026-11-22T00:00:00Z')).toBe('2026-11-21'); // 21:00 on Nov 21
    expect(slateDayOf('2026-11-22T03:30:00Z')).toBe('2026-11-21'); // 00:30 on Nov 22: a late game of the night of the 21st
    expect(slateDayOf('2026-11-21T08:00:00Z')).toBe('2026-11-21'); // 05:00 on Nov 21
    expect(slateDayOf('2026-11-21T07:59:00Z')).toBe('2026-11-20'); // 04:59 on Nov 21
  });
  it('does not depend on the computer\'s own time zone, or on a year boundary', () => {
    expect(slateDayOf('2027-01-01T06:00:00Z')).toBe('2026-12-31'); // 03:00 on Jan 1 in São Paulo
    expect(slateDayOf('2027-01-01T09:00:00Z')).toBe('2027-01-01');
  });
});

describe('the day\'s list of matches', () => {
  const list = slateMatches(data, DAY);
  it('is in start-time order, each with its id and an exact instant', () => {
    expect(list.length).toBeGreaterThan(1);
    for (const m of list) {
      expect(m.start).toMatch(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/);
      expect(m.startMs).toBe(Date.parse(m.start));
      expect(typeof m.id).toBe('string');
    }
    expect(list.map((m) => m.startMs)).toEqual([...list.map((m) => m.startMs)].sort((a, b) => a - b));
    expect(new Set(list.map((m) => m.id)).size).toBe(list.length);
  });
  it('the instants are the matches\' own kick-offs', () => {
    const byId = new Map(snap.matches.map((m) => [m.id, m]));
    for (const m of list) expect(m.startMs, m.id).toBe(Date.parse(byId.get(m.id)!.t));
    expect(list[0]!.start).toBe('2026-11-21T12:30:00.000Z'); // Man City v Fulham, 09:30 in São Paulo
  });
  it('on the fixture\'s day it is the very matches footykit\'s own Slate shows (no football starts before 05:00)', () => {
    expect([...list.map((m) => m.id)].sort()).toEqual(data.byDay.get(DAY)!.map((m) => m.id).sort());
    expect(list).toHaveLength(20);
  });
  it('a 04:30 start is listed for the day before, a 05:00 start for its own day', () => {
    const early = withMatchAt('2026-11-22T07:30:00Z'); // 04:30 on Nov 22
    expect(slateMatches(early.model, '2026-11-21').map((m) => m.id)).toContain(early.id);
    expect(slateMatches(early.model, '2026-11-22').map((m) => m.id)).not.toContain(early.id);
    expect(slateMatches(early.model, '2026-11-21').at(-1)!.id).toBe(early.id); // the last game of that night
    const five = withMatchAt('2026-11-22T08:00:00Z'); // 05:00 on Nov 22
    expect(slateMatches(five.model, '2026-11-22').map((m) => m.id)).toContain(five.id);
    expect(slateMatches(five.model, '2026-11-21').map((m) => m.id)).not.toContain(five.id);
    expect(slateMatches(five.model, '2026-11-22')[0]!.id).toBe(five.id);
  });
  it('a viewer in another time zone gets the same list (the rule is São Paulo\'s, not the viewer\'s)', () => {
    for (const zone of ['Europe/London', 'Asia/Tokyo', 'America/Los_Angeles'])
      expect(slateMatches(buildModel(snap, zone), DAY).map((m) => m.id), zone).toEqual(list.map((m) => m.id));
  });
  it('a match with no kick-off time yet stays on the day footykit shows it, and says its time is not known', () => {
    const tbd = withMatchAt('2026-11-22T03:00:00Z', true); // a midnight placeholder on Nov 22
    const got = slateMatches(tbd.model, '2026-11-22').find((m) => m.id === tbd.id);
    expect(got?.timeUnknown).toBe(true);
    expect(slateMatches(tbd.model, '2026-11-21').map((m) => m.id)).not.toContain(tbd.id);
    expect(list.every((m) => m.timeUnknown === false)).toBe(true);
  });
  it('a day with no match is an empty list', () => {
    expect(slateMatches(data, '2020-01-01')).toEqual([]);
  });
});

describe('one match\'s card on its own', () => {
  const id = slateMatches(data, DAY)[0]!.id;
  const cardHtml = () => document.querySelector(`[data-testid="slate-card"][data-match-id="${id}"]`)!.outerHTML;
  it('is exactly the card the whole-day Slate shows for that match', () => {
    const day = render(<SlateDay data={data} day={DAY} timeZone={TZ} now={NOW} />);
    const inSlate = cardHtml();
    day.unmount();
    render(<SlateMatchCard data={data} matchId={id} timeZone={TZ} now={NOW} />);
    expect(screen.getAllByTestId('slate-card')).toHaveLength(1);
    expect(cardHtml()).toBe(inSlate);
    // alone: no Slate header, and the Slate's card width
    expect(screen.queryByTestId('slate-header')).toBeNull();
    expect(screen.getByTestId('slate-match').style.width).toBe(`${SLATE_CARD_WIDTH}px`);
  });
  it('every card of the day, drawn alone, equals its card in the Slate', () => {
    const day = render(<SlateDay data={data} day={DAY} timeZone={TZ} now={NOW} />);
    const inSlate = new Map([...document.querySelectorAll('[data-testid="slate-card"]')].map((c) => [c.getAttribute('data-match-id')!, c.outerHTML]));
    day.unmount();
    for (const m of slateMatches(data, DAY)) {
      const one = render(<SlateMatchCard data={data} matchId={m.id} timeZone={TZ} now={NOW} />);
      expect(document.querySelector('[data-testid="slate-card"]')!.outerHTML, m.id).toBe(inSlate.get(m.id));
      one.unmount();
    }
  });
  it('makes no request and starts no timer at rest; an unknown id draws nothing', () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    vi.useFakeTimers();
    render(<SlateMatchCard data={data} matchId={id} timeZone={TZ} now={NOW} />);
    expect(vi.getTimerCount()).toBe(0);
    expect(fetchSpy).not.toHaveBeenCalled();
    cleanup();
    const { container } = render(<SlateMatchCard data={data} matchId="no-such-match" timeZone={TZ} now={NOW} />);
    expect(container.innerHTML).toBe('');
  });
  it('several cards with live scores on share one request per day, and show the live score', async () => {
    const ids = slateMatches(data, DAY).slice(0, 3).map((m) => m.id);
    const m0 = data.byDay.get(DAY)!.find((m) => m.id === ids[0])!;
    const fetchSpy = vi.fn((url: string) => Promise.resolve({ ok: true, json: () => Promise.resolve({ date: new URL(url, 'http://x').searchParams.get('date'), fetchedAt: '', odds: {}, matches: [{ ...m0, st: 'post', hs: 4, as: 3 }] }) }));
    vi.stubGlobal('fetch', fetchSpy);
    render(<>{ids.map((x) => <SlateMatchCard key={x} data={data} matchId={x} timeZone={TZ} now={NOW} live />)}</>);
    await vi.waitFor(() => expect(document.querySelector(`[data-match-id="${ids[0]}"] .fk-card-row[data-side="home"]`)!.textContent).toContain('4'));
    const dates = fetchSpy.mock.calls.map(([u]) => new URL(u, 'http://x').searchParams.get('date'));
    expect(dates.length).toBe(new Set(dates).size); // three cards, each date asked once
    expect(screen.getAllByTestId('slate-card')).toHaveLength(3);
  });
});
