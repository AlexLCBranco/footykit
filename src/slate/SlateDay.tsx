// The Slate as a self-contained part: one local day of the followed clubs' matches as cards with a note box each —
// what footykit's Slate view shows and what a gauntlet widget can put on the whiteboard. Inputs only (calendarkit's
// Slate API): the data (loadFootyData), a day, a time zone, a notes store, a width, and the host's choices (team links,
// live scores and odds). Nothing from footykit's app shell: no URL, no history, no bar.
// At rest it starts no timer and no animation frame; with `live` off (the default) it makes no request at all.

import { useCallback, useMemo, useState } from 'react';
import { Ctx, type FootyCtx } from '../components/ctx';
import { SeriesPopup, type SeriesOpen } from '../components/Popups';
import { Slate } from '../components/Slate';
import { useLive } from '../components/useLive';
import { EMPTY_LIVE } from '../data/live';
import type { Model } from '../data/model';
import { EMPTY_NOTE, type SlateNotes } from './notes';
import '../components/footy.css';

export interface SlateDayProps {
  data: Model;
  /** the local day shown, YYYY-MM-DD (in `timeZone`); a day without matches says so */
  day: string;
  /** IANA zone for kickoff times and days; default: the browser's (must be the one `data` was built with) */
  timeZone?: string;
  /** the matches' notes (localNotesStore()); none: info-only cards */
  notes?: SlateNotes;
  /** the width the cards fill (CSS px) */
  width?: number;
  /** the address a team name opens in a new tab (teamCalendarUrl); none: team names are plain text */
  teamLink?: (teamId: string, day: string) => string;
  /** fetch the day's live scores and 3-way odds (/football/api/day, CDN-cached; one request per minute only while a
   *  match is live or about to start); off: no request, the odds column stays empty */
  live?: boolean;
  /** the clock for tests; default Date.now() at render */
  now?: number;
}

export function SlateDay({ data, day, timeZone, notes, width = 1840, teamLink, live: liveOn = false, now }: SlateDayProps) {
  const live = useLive(day, timeZone, liveOn);
  const [series, setSeries] = useState<SeriesOpen | null>(null);
  const closeSeries = useCallback(() => setSeries(null), []);
  const ctx: FootyCtx = useMemo(() => ({
    model: data,
    now: now ?? Date.now(),
    timeZone,
    live: liveOn ? live : EMPTY_LIVE,
    teamHref: teamLink,
    onSeries: (a, b, el) => { const r = el.getBoundingClientRect(); setSeries({ a, b, x: r.left, y: r.bottom }); },
  }), [data, now, timeZone, live, liveOn, teamLink]);
  return (
    <Ctx.Provider value={ctx}>
      <div className="fk-root fk-slate-widget" style={{ width }} data-testid="slate-day">
        <Slate day={day} notes={notes ?? NO_NOTES} showNotes={!!notes} />
        {series && <SeriesPopup open={series} onClose={closeSeries} />}
      </div>
    </Ctx.Provider>
  );
}

/** Info-only cards: Slate never reads the store when notes are hidden. */
const NO_NOTES: SlateNotes = { get: () => EMPTY_NOTE, set: () => undefined, flush: () => undefined, subscribe: () => () => undefined };

/** A followed club's Team Calendar around `day`, for a host outside footykit (opened in a new tab). */
export function teamCalendarUrl(teamId: string, day: string, base = '/football/'): string {
  return `${base}?${new URLSearchParams({ view: 'cal', team: teamId, on: day })}`;
}
