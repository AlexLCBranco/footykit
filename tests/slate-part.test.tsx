// The Slate part (src/slate/index.ts) on its own, as a gauntlet widget would use it: renders a day's cards from the
// data alone, makes no request and starts no timer at rest, links team names only when the host asks, keeps notes
// in fk:notes:v1; and the team link it builds opens that team's calendar around the day.

import { act, cleanup, render, screen } from '@testing-library/react';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { pageFromSearch } from '../src/components/page';
import { buildModel } from '../src/data/model';
import type { Snapshot } from '../src/data/snapshot';
import { createNotesStore, NOTES_KEY, SlateDay, teamCalendarUrl } from '../src/slate';

const snap = JSON.parse(readFileSync(join(import.meta.dirname, 'fixtures/snapshot.json'), 'utf8')) as Snapshot;
const TZ = 'America/Sao_Paulo';
const data = buildModel(snap, TZ);
const DAY = '2026-11-21';
const NOW = Date.parse('2026-11-21T15:00:00Z');

afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); localStorage.clear(); });

describe('Slate part', () => {
  it('renders the day\'s cards from the data alone; no request, no timer at rest', () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    vi.useFakeTimers();
    render(<SlateDay data={data} day={DAY} timeZone={TZ} now={NOW} />);
    expect(screen.getAllByTestId('slate-card')).toHaveLength(20);
    expect(vi.getTimerCount()).toBe(0);
    expect(fetchSpy).not.toHaveBeenCalled();
    // info-only cards: no note boxes
    expect(screen.queryAllByTestId('note-text')).toHaveLength(0);
  });

  it('team names: plain text without a host link, links to the team calendar with teamLink', () => {
    const { unmount } = render(<SlateDay data={data} day={DAY} timeZone={TZ} now={NOW} />);
    expect(document.querySelectorAll('a.fk-team-link')).toHaveLength(0);
    expect(document.querySelectorAll('button.fk-team-link')).toHaveLength(0);
    unmount();
    render(<SlateDay data={data} day={DAY} timeZone={TZ} now={NOW} teamLink={(id, day) => teamCalendarUrl(id, day)} />);
    const ars = document.querySelector<HTMLAnchorElement>('a.fk-team-link[data-team="ARS"]')!;
    expect(ars.getAttribute('href')).toBe('/football/?view=cal&team=359&on=2026-11-21');
    expect(ars.target).toBe('_blank');
  });

  it('notes: typed into a card, kept per match in fk:notes:v1', () => {
    vi.useFakeTimers();
    const notes = createNotesStore(localStorage, window);
    render(<SlateDay data={data} day={DAY} timeZone={TZ} now={NOW} notes={notes} />);
    const card = screen.getAllByTestId('slate-card')[0]!;
    const box = card.querySelector('textarea')!;
    act(() => { notes.set(card.dataset.matchId!, { pre: 'ESPN lineups at 13:45' }, true); });
    expect(box.value).toBe('ESPN lineups at 13:45');
    expect(JSON.parse(localStorage.getItem(NOTES_KEY)!)[card.dataset.matchId!]).toMatchObject({ pre: 'ESPN lineups at 13:45', shown: 'pre' });
  });

  it('teamCalendarUrl opens that team\'s calendar around the day', () => {
    const p = pageFromSearch('?view=cal&team=359&on=2026-11-21', '2026-12-30', data);
    expect(p).toMatchObject({ view: 'cal', team: '359', week: '2026-11-16', month: '2026-11' });
    // a bookmark's date= is still never read
    expect(pageFromSearch('?view=cal&team=359&date=2026-11-16', '2026-12-30', data).week).toBe('2026-12-28');
  });

  it('the part imports nothing from the app shell', () => {
    const shell = /from '\.\.\/(App|components\/(Footy|TopBar|DayList|DayStrip|TeamCalendar|TeamList|page))'/;
    const dir = join(import.meta.dirname, '../src/slate');
    const hits = readdirSync(dir).filter((f) => shell.test(readFileSync(join(dir, f), 'utf8')));
    expect(hits).toEqual([]);
  });
});
