// Slate: the day's matches as cards in calendarkit's shape (FK-35, src/slate/layout.ts has the sizes): a tight grid
// like a table (the cards touch and share one divider line), the header line "SLATE · 19-11 · Football" across its top.
// Each card (the home team on the first line, FK-38): a strip on the left (kickoff time, then a wrapping row of the competition, ↗, series chip, derby / neutral
// marks, the draw price and the copy button) beside the two team rows: "@" cell, logo, name with its league place and
// the score right after it, the tags (highlights; every tag in the hover popup), the last 2 / next 2 games (FK-36), the
// team's price. With notes shown, the note box sits under the rows across the card (5 lines, then its own scrollbar).
// Odds: ESPN's DraftKings lines (decimal), free, Slate only.

import { useEffect, type CSSProperties } from 'react';
import { isPlayed } from '../data/model';
import { neutralVenue } from '../data/neutral';
import type { Match } from '../data/snapshot';
import { NoteBox } from '../slate/NoteBox';
import type { SlateNotes } from '../slate/notes';
import { slateHeaderLabel, slateVars } from '../slate/layout';
import { CompMark, FormGames, LeaguePos, MatchLink, MatchTime, SeriesChip, TeamLink, tieNote } from './Bits';
import { DerbyTag, TeamTags } from './Tags';
import { useFooty } from './ctx';
import { dayMatches } from './DayList';
import { CopyButton } from './Copy';

function SideRow({ m, side, day, odds }: { m: Match; side: 'a' | 'h'; day: string; odds?: number }) {
  const { model } = useFooty();
  const id = side === 'h' ? m.h : m.a;
  const score = side === 'h' ? m.hs : m.as;
  const other = side === 'h' ? m.as : m.hs;
  const shown = (isPlayed(m) || m.st === 'in') && score !== undefined;
  const win = isPlayed(m) && score !== undefined && other !== undefined && score > other;
  const loss = isPlayed(m) && score !== undefined && other !== undefined && score < other;
  return (
    <div className={`fk-card-row${win ? ' fk-win' : ''}${loss ? ' fk-loss' : ''}`} data-side={side === 'h' ? 'home' : 'away'}>
      {/* FK-38: the home team is the first line, so no "@": the order says it (a neutral venue has its N mark) */}
      <span className="fk-card-at" />
      <TeamLink id={id} day={day} label="none" logoSize={28} className="fk-card-logo" />
      {/* FK-31: the score right after the name (and its league place, FK-28) */}
      <span className="fk-card-teamcell">
        <TeamLink id={id} day={day} label="short" logo="none" className="fk-card-team" />
        <LeaguePos id={id} />
        {shown && <span className="fk-card-score" data-testid="card-score">{score}</span>}
      </span>
      <span className="fk-card-tags"><TeamTags m={m} side={side} compact /></span>
      {model.followed.has(id) ? <FormGames m={m} teamId={id} /> : <span className="fk-form-gap" />}
      <span className="fk-card-odds" data-testid="card-odds" title={odds ? `${model.team(id).name} to win (decimal)` : undefined}>{odds?.toFixed(2) ?? ''}</span>
    </div>
  );
}

export function SlateCard({ m, day, notes }: { m: Match; day: string; notes?: SlateNotes }) {
  const { model, live } = useFooty();
  const o = live.odds.get(m.id);
  const tie = tieNote(m);
  const neutral = neutralVenue(m);
  const label = `${model.team(m.h).name} vs ${model.team(m.a).name}`;
  return (
    <article className={`fk-card${neutral ? ' fk-neutral' : ''}${m.st === 'in' ? ' fk-card-live' : ''}`} data-match-id={m.id} data-game-id={m.id} data-testid="slate-card" aria-label={label}>
      <div className="fk-card-main">
        <div className="fk-card-strip">
          <span className="fk-card-time">
            <MatchTime m={m} />
            <span className="fk-card-copy" data-capture-exclude="true">
              <CopyButton target={(b) => b.closest('.fk-card') as HTMLElement} label={`Copy ${model.team(m.h).abbr} vs ${model.team(m.a).abbr} as an image`} small />
            </span>
          </span>
          <span className="fk-card-chips">
            <CompMark slug={m.c} round={[m.r, m.leg ? `leg ${m.leg}` : ''].filter(Boolean).join(' · ') || undefined} />
            <MatchLink m={m} />
            <SeriesChip m={m} />
            <DerbyTag m={m} />
            {neutral && <span className="fk-neutral-tag" title={`Neutral venue (${neutral.why})`}>N</span>}
            {tie && <span className="fk-chip fk-card-tie" title={tie}>{tie.split(' · ')[0]}</span>}
            {o && <span className="fk-card-draw" title={`Draw (decimal${o.p ? `, ${o.p}` : ''})`}>X {o.d.toFixed(2)}</span>}
          </span>
        </div>
        <div className="fk-card-rows">
          {/* FK-38: the home team first, the away team second */}
          <SideRow m={m} side="h" day={day} odds={o?.h} />
          <SideRow m={m} side="a" day={day} odds={o?.a} />
        </div>
      </div>
      {notes && (
        <div className="fk-card-note">
          <NoteBox store={notes} gameId={m.id} label={label} />
        </div>
      )}
    </article>
  );
}

const VARS = slateVars() as CSSProperties;

export function Slate({ day, notes, showNotes }: { day: string; notes: SlateNotes; showNotes: boolean }) {
  const { model, live } = useFooty();
  // while note boxes are shown, the store follows other tabs (a note typed in the gauntlet shows here at once)
  useEffect(() => (showNotes ? notes.listen?.() : undefined), [notes, showNotes]);
  const list = dayMatches(model, day, live);
  if (!list.length) return <p className="fk-empty" data-testid="no-matches">No matches today for the followed clubs.</p>;
  return (
    <div className={`fk-slate${showNotes ? ' fk-slate-notes' : ''}`} data-testid="slate" style={VARS}>
      <div className="fk-slate-header" data-testid="slate-header">{slateHeaderLabel(day)}</div>
      {list.map((m) => <SlateCard key={m.id} m={m} day={day} notes={showNotes ? notes : undefined} />)}
    </div>
  );
}
