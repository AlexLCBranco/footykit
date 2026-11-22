// The Slate as a self-contained part: one local day of the followed clubs' matches as cards with a note box each —
// what footykit's Slate view shows and what a gauntlet widget can put on the whiteboard. Inputs only (calendarkit's
// Slate API): the data (loadFootyData), a day, a time zone, a notes store, a width, and the host's choices (team links,
// live scores and odds). Nothing from footykit's app shell: no URL, no history, no bar.
// At rest it starts no timer and no animation frame; with `live` off (the default) it makes no request at all.
// FK-77: `SlateMatchCard` is one match's card on its own (for a host that mixes it with another sport's cards): the
// same `SlateCard` the whole-day Slate is made of, with the same inputs, so there is one card code.

import { useMemo, type ReactNode } from 'react';
import { Ctx, useFooty, type FootyCtx } from '../components/ctx';
import { useSeriesPopup } from '../components/Popups';
import { Slate, SLATE_VARS, SlateCard } from '../components/Slate';
import { useStreakPopup } from '../components/Streak';
import { useLive } from '../components/useLive';
import { EMPTY_LIVE, withLive } from '../data/live';
import type { Model } from '../data/model';
import { SLATE_CARD_WIDTH } from './layout';
import { findMatch } from './matches';
import { EMPTY_NOTE, type SlateNotes } from './notes';
import { pageWeatherStore, useMatchWeather } from './weather';
import '../components/footy.css';

/** What the whole-day Slate and one card on its own both take from the host. */
export interface SlateHostProps {
  data: Model;
  /** IANA zone for kickoff times and days; default: the browser's (must be the one `data` was built with) */
  timeZone?: string;
  /** the matches' notes (localNotesStore()); none: info-only cards */
  notes?: SlateNotes;
  /** the address a team name opens in a new tab (teamCalendarUrl); none: team names are plain text */
  teamLink?: (teamId: string, day: string) => string;
  /** fetch the day's live scores and 3-way odds (/football/api/day, CDN-cached; one request per minute only while a
   *  match is live or about to start); off: no request, the odds column stays empty */
  live?: boolean;
  /** FK-40: each card's game button (injury pages, the betting site's football section); default off */
  gameMenu?: boolean;
  /** FK-39: the weather at kick-off (Open-Meteo, one request for the day's venues, at most hourly); default off: no request */
  weather?: boolean;
  /** the clock for tests; default Date.now() at render */
  now?: number;
}

export interface SlateDayProps extends SlateHostProps {
  /** the local day shown, YYYY-MM-DD (in `timeZone`); a day without matches says so */
  day: string;
  /** the width the cards fill (CSS px) */
  width?: number;
}

/** The cards' surroundings (data, clock, live layer, the host's choices, the hover popups), for `day`. */
function SlateFrame({ day, className, width, children, host }: { day: string; className: string; width?: number; children: (live: FootyCtx['live']) => ReactNode; host: SlateHostProps }) {
  const { data, timeZone, teamLink, live: liveOn = false, now, gameMenu = false, weather = false } = host;
  const live = useLive(day, timeZone, liveOn);
  const series = useSeriesPopup();
  const streak = useStreakPopup();
  const ctx: FootyCtx = useMemo(() => ({
    model: data,
    now: now ?? Date.now(),
    timeZone,
    live: liveOn ? live : EMPTY_LIVE,
    teamHref: teamLink,
    gameMenu,
    weather: weather ? pageWeatherStore() : undefined,
    onSeries: series.onSeries,
    onSeriesLeave: series.onSeriesLeave,
  }), [data, now, timeZone, live, liveOn, teamLink, gameMenu, weather, series.onSeries, series.onSeriesLeave]);
  return (
    <Ctx.Provider value={ctx}>
      <div className={`fk-root fk-slate-widget${className}`} style={{ width }} data-testid={className ? 'slate-match' : 'slate-day'} onMouseOver={streak.onOver} onFocus={streak.onOver} onMouseLeave={streak.onLeave}>
        {children(ctx.live)}
        {series.node}
        {streak.node}
      </div>
    </Ctx.Provider>
  );
}

export function SlateDay({ day, width = 1840, ...host }: SlateDayProps) {
  return (
    <SlateFrame day={day} className="" width={width} host={host}>
      {() => <Slate day={day} notes={host.notes ?? NO_NOTES} showNotes={!!host.notes} />}
    </SlateFrame>
  );
}

export interface SlateMatchCardProps extends SlateHostProps {
  /** the match (an id from `slateMatches`) */
  matchId: string;
  /** the card's width (CSS px); default: the Slate's card width (561) without notes, the room it is given with notes */
  width?: number;
}

/** The card with the live layer merged in and its weather (asked for only when the host turned `weather` on). */
function OneCard({ data, matchId, day, live, notes, now }: { data: Model; matchId: string; day: string; live: FootyCtx['live']; notes?: SlateNotes; now?: number }) {
  const { weather } = useFooty();
  const list = useMemo(() => { const m = findMatch(data, matchId); return m ? withLive([m], live) : []; }, [data, matchId, live]);
  const wx = useMatchWeather(list, weather, now);
  const m = list[0];
  if (!m) return null;
  return (
    <div className={`fk-slate fk-slate-one${notes ? ' fk-slate-notes' : ''}`} style={SLATE_VARS}>
      <SlateCard m={m} day={day} notes={notes} wx={wx.get(m.id)} />
    </div>
  );
}

/**
 * FK-77: one match's card alone, exactly the card the Slate shows for it (561 × 96 without notes; live score included
 * with `live`). Draws nothing for an id that is not one of the followed clubs' matches.
 */
export function SlateMatchCard({ matchId, width, ...host }: SlateMatchCardProps) {
  const m = findMatch(host.data, matchId);
  // the card is drawn as on its own day in footykit (its "last games" and tags are worked out as of that day)
  const day = m ? host.data.dayOf(m) : '';
  if (!m) return null;
  return (
    <SlateFrame day={day} className=" fk-slate-single" width={width ?? (host.notes ? undefined : SLATE_CARD_WIDTH)} host={host}>
      {(live) => <OneCard data={host.data} matchId={matchId} day={day} live={live} notes={host.notes} now={host.now} />}
    </SlateFrame>
  );
}

/** Info-only cards: Slate never reads the store when notes are hidden. */
const NO_NOTES: SlateNotes = { get: () => EMPTY_NOTE, set: () => undefined, flush: () => undefined, subscribe: () => () => undefined };

/** A followed club's Team Calendar around `day`, for a host outside footykit (opened in a new tab). */
export function teamCalendarUrl(teamId: string, day: string, base = '/football/'): string {
  return `${base}?${new URLSearchParams({ view: 'cal', team: teamId, on: day })}`;
}
