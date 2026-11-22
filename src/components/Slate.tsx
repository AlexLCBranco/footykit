// Slate: the day's matches as cards in calendarkit's shape (FK-35, src/slate/layout.ts has the sizes): a tight grid
// like a table (the cards touch and share one divider line), the header line "SLATE · 19-11 · Football" across its top.
// Each card (the home team on the first line, FK-38): a strip on the left (kickoff time, then a wrapping row of the competition, ↗, series chip, derby / neutral
// marks; no copy button, FK-51; no draw price, FK-44) beside the two team rows: "@" cell, logo, name with its league place and
// the score right after it, the tags (highlights; every tag in the hover popup), the strip of 5 windows around the match (FK-47), the
// team's price. With notes shown, the note box sits under the rows across the card (5 lines, then its own scrollbar).
// FK-73: one more line under the rows: the stadium and city, and a chip when the home team is away from its usual ground.
// Weather (FK-39): the sky at kick-off in the second line's empty cell, the full forecast in the game pop-up.
// Odds: ESPN's DraftKings lines (decimal), free, Slate only.

import { useEffect, useMemo, type CSSProperties } from 'react';
import { countdownLink } from '../data/countdownLink';
import { isPlayed } from '../data/model';
import { groundChip, groundNote, groundText, groundTip, snapshotGrounds } from '../data/homeGround';
import { neutralVenue } from '../data/neutral';
import type { Match } from '../data/snapshot';
import { NoteBox } from '../slate/NoteBox';
import type { SlateNotes } from '../slate/notes';
import { slateHeaderLabel, slateVars } from '../slate/layout';
import { CompMark, FormGames, LeaguePos, MatchLink, MatchTime, SeriesChip, TeamLink, tieNote } from './Bits';
import { DerbyTag, TeamTags } from './Tags';
import { useFooty } from './ctx';
import { dayMatches } from './DayList';
import { GameMenu } from './GameLinks';
import { StreakChip } from './Streak';
import { useMatchWeather } from '../slate/weather';
import { PopoutButton, type PopoutCtl } from './LivePopout';
import { matchVenue, WEATHER_ATTRIBUTION, WEATHER_ATTRIBUTION_URL, weatherIcon, weatherLine, type Weather } from '../data/weather';

/** FK-39: the sky's sign in the second line's empty cell; the whole forecast in its tooltip (and in the game pop-up). */
function WeatherMark({ w }: { w: Weather }) {
  const { icon, sky } = weatherIcon(w);
  return <span className="fk-wx-mark" data-testid="weather-mark" data-sky={sky} title={`At kick-off: ${sky}, ${weatherLine(w)}
${WEATHER_ATTRIBUTION}`}>{icon}</span>;
}

/** FK-39: the game pop-up's weather lines, with Open-Meteo's attribution (CC BY 4.0). */
function WeatherLines({ m, w }: { m: Match; w: Weather }) {
  const { icon, sky } = weatherIcon(w);
  const where = [m.v, m.city].filter(Boolean).join(', ') || (matchVenue(m) ? 'the venue' : '');
  return (
    <div className="fk-wx-lines" data-testid="weather-lines">
      <span>{icon} At kick-off{where ? ` in ${where}` : ''}: {sky}</span>
      <span className="fk-wx-line">{weatherLine(w)}</span>
      <a className="fk-wx-credit" href={WEATHER_ATTRIBUTION_URL} target="_blank" rel="noopener noreferrer">{WEATHER_ATTRIBUTION}</a>
    </div>
  );
}

function SideRow({ m, side, day, odds, wx }: { m: Match; side: 'a' | 'h'; day: string; odds?: number; wx?: Weather }) {
  const { model, gameMenu: menu } = useFooty();
  const id = side === 'h' ? m.h : m.a;
  const score = side === 'h' ? m.hs : m.as;
  const other = side === 'h' ? m.as : m.hs;
  const shown = (isPlayed(m) || m.st === 'in') && score !== undefined;
  const win = isPlayed(m) && score !== undefined && other !== undefined && score > other;
  const loss = isPlayed(m) && score !== undefined && other !== undefined && score < other;
  return (
    <div className={`fk-card-row${win ? ' fk-win' : ''}${loss ? ' fk-loss' : ''}`} data-side={side === 'h' ? 'home' : 'away'}>
      {/* FK-38: the home team is the first line, so no "@": the order says it (a neutral venue has its N mark).
          FK-40: the first line's empty cell holds the game button (no extra width); FK-39: the second line's, the weather. */}
      <span className="fk-card-at">{side === 'h' ? menu && <GameMenu m={m} extra={wx && <WeatherLines m={m} w={wx} />} /> : wx && <WeatherMark w={wx} />}</span>
      <TeamLink id={id} day={day} label="none" logoSize={28} className="fk-card-logo" />
      {/* FK-31: the score right after the name (and its league place, FK-28). FK-52: the name and place in a box of one
          width (a long name ends in "…", the full name on hover), so every card's score sits in the same column */}
      <span className="fk-card-teamcell">
        <span className="fk-card-namebox">
          <TeamLink id={id} day={day} label="short" logo="none" className="fk-card-team" />
          <LeaguePos id={id} />
        </span>
        {shown && <span className="fk-card-score" data-testid="card-score">{score}</span>}
      </span>
      {/* FK-50: the result streak, where calendarkit's Slate has it (after the name and score) */}
      <StreakChip teamId={id} m={m} className="fk-card-streak" />
      <span className="fk-card-tags"><TeamTags m={m} side={side} compact /></span>
      {model.followed.has(id) ? <FormGames m={m} teamId={id} /> : <span className="fk-form-gap" />}
      <span className="fk-card-odds" data-testid="card-odds" title={odds ? `${model.team(id).name} to win (decimal)` : undefined}>{odds?.toFixed(2) ?? ''}</span>
    </div>
  );
}

/** FK-73: the stadium and city under the team rows, and a chip when the home team isn't at its usual ground (how far
 * from it), or "Neutral ground". */
function VenueLine({ m }: { m: Match }) {
  const { model } = useFooty();
  const where = groundText(m);
  const note = groundNote(m, snapshotGrounds(model.snap.matches));
  return (
    <div className="fk-card-venue" data-testid="card-venue">
      <span className={`fk-card-venue-name${where ? '' : ' fk-muted'}`} data-testid="card-stadium" title={where ? `Where the match is played: ${where}` : 'The stadium has not been announced yet'}>{where ?? 'Stadium not known yet'}</span>
      {note && <span className={`fk-ground-chip fk-ground-${note.kind}`} data-testid="ground-chip" data-kind={note.kind} data-km={note.kind === 'moved' ? note.km : undefined} title={groundTip(note, m, model.team(m.h).name)}>{note.kind === 'moved' && '⚠ '}{groundChip(note)}</span>}
    </div>
  );
}

export function SlateCard({ m, day, notes, wx }: { m: Match; day: string; notes?: SlateNotes; /** FK-39: the weather at kick-off */ wx?: Weather }) {
  const { model, live } = useFooty();
  const o = live.odds.get(m.id);
  const tie = tieNote(m);
  const neutral = neutralVenue(m);
  const label = `${model.team(m.h).name} vs ${model.team(m.a).name}`;
  return (
    <article className={`fk-card${neutral ? ' fk-neutral' : ''}${m.st === 'in' ? ' fk-card-live' : ''}`} data-match-id={m.id} data-game-id={m.id} data-testid="slate-card" aria-label={label}>
      <div className="fk-card-main">
        <div className="fk-card-strip">
          {/* FK-51: no per-card copy button; the day's copy and the marquee copy cover it */}
          <span className="fk-card-time"><MatchTime m={m} /></span>
          <span className="fk-card-chips">
            <CompMark m={m} />
            <MatchLink m={m} />
            <SeriesChip m={m} />
            <DerbyTag m={m} />
            {neutral && <span className="fk-neutral-tag" title={`Neutral venue (${neutral.why})`}>N</span>}
            {tie && <span className="fk-chip fk-card-tie" title={tie}>{tie.split(' · ')[0]}</span>}
          </span>
        </div>
        <div className="fk-card-rows">
          {/* FK-38: the home team first, the away team second */}
          <SideRow m={m} side="h" day={day} odds={o?.h} wx={wx} />
          <SideRow m={m} side="a" day={day} odds={o?.a} wx={wx} />
        </div>
      </div>
      <VenueLine m={m} />
      {notes && (
        <div className="fk-card-note">
          <NoteBox store={notes} gameId={m.id} label={label} />
        </div>
      )}
    </article>
  );
}

/** The card sizes as CSS variables (src/slate/layout.ts): on the Slate grid, and on one card drawn alone (FK-77). */
export const SLATE_VARS = slateVars() as CSSProperties;

/** FK-61: opens halftime-timer on a countdown to the first match of the day that has not kicked off yet. */
function CountdownButton({ list }: { list: Match[] }) {
  const { model, now, timeZone } = useFooty();
  const c = countdownLink(list, now, (id) => model.team(id).short, timeZone);
  if (!c) return <button type="button" className="fk-lpop-btn" disabled data-capture-exclude="true" title="No more matches today" data-testid="countdown-button">⏱ Countdown</button>;
  const teams = c.name.split(" · ")[1];
  return (
    <a className="fk-lpop-btn" href={c.url} target="_blank" rel="noreferrer" data-capture-exclude="true" data-testid="countdown-button"
      title={c.first ? `Open a timer that counts down to the first match: ${teams}` : `The first match has started. Open a timer that counts down to the next match: ${teams}`}>⏱ Countdown</a>
  );
}

export function Slate({ day, notes, showNotes, popout }: { day: string; notes: SlateNotes; showNotes: boolean; /** FK-62 */ popout?: PopoutCtl }) {
  const { model, live, weather, now } = useFooty();
  // while note boxes are shown, the store follows other tabs (a note typed in the gauntlet shows here at once)
  useEffect(() => (showNotes ? notes.listen?.() : undefined), [notes, showNotes]);
  const list = useMemo(() => dayMatches(model, day, live), [model, day, live]);
  const wx = useMatchWeather(list, weather, now);
  if (!list.length) return <p className="fk-empty" data-testid="no-matches">No matches today for the followed clubs.</p>;
  return (
    <div className={`fk-slate${showNotes ? ' fk-slate-notes' : ''}`} data-testid="slate" style={SLATE_VARS}>
      <div className="fk-slate-header"><span data-testid="slate-header">{slateHeaderLabel(day)}</span><PopoutButton ctl={popout} /><CountdownButton list={list} /></div>
      {list.map((m) => <SlateCard key={m.id} m={m} day={day} notes={showNotes ? notes : undefined} wx={wx.get(m.id)} />)}
    </div>
  );
}
