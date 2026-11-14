// Slate: the day's matches as compact cards (calendarkit's current Slate): a strip on the left (time, competition,
// ↗, series), the away and home rows (logo, name, form, score, 3-way odds), the PRE / LIVE / POST switch in the card's
// top-right corner and the note box under the rows at full card width (5 lines, then its own scrollbar). Opens with
// notes hidden. Odds: ESPN's DraftKings lines (decimal), free, Slate only.

import { formAt } from '../data/form';
import { isPlayed } from '../data/model';
import { neutralVenue } from '../data/neutral';
import type { Match } from '../data/snapshot';
import { NoteBox } from '../slate/NoteBox';
import type { SlateNotes } from '../slate/notes';
import { CompMark, FormSquares, MatchLink, MatchTime, SeriesChip, TeamLink, tieNote } from './Bits';
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
  return (
    <div className={`fk-card-row${win ? ' fk-win' : ''}`}>
      <span className="fk-card-at">{side === 'h' ? (neutralVenue(m) ? 'v' : '@') : ''}</span>
      <TeamLink id={id} day={day} label="short" logoSize={26} className="fk-card-team" />
      {model.followed.has(id) ? <FormSquares line={formAt(model, id, m)} teamId={id} /> : <span className="fk-form-gap" />}
      <span className="fk-card-score">{shown ? score : ''}</span>
      <span className="fk-card-odds" title={odds ? `${model.team(id).name} to win (decimal)` : undefined}>{odds?.toFixed(2) ?? ''}</span>
    </div>
  );
}

export function SlateCard({ m, day, notes }: { m: Match; day: string; notes?: SlateNotes }) {
  const { model, live } = useFooty();
  const o = live.odds.get(m.id);
  const tie = tieNote(m);
  const neutral = neutralVenue(m);
  return (
    <article className={`fk-card${neutral ? ' fk-neutral' : ''}${m.st === 'in' ? ' fk-card-live' : ''}`} data-match-id={m.id} data-testid="slate-card">
      <div className="fk-card-main">
        <div className="fk-card-strip">
          <MatchTime m={m} />
          <span className="fk-card-chips">
            <CompMark slug={m.c} round={m.r} />
            <MatchLink m={m} />
            <SeriesChip m={m} />
            {neutral && <span className="fk-neutral-tag" title={`Neutral venue (${neutral.why})`}>N</span>}
          </span>
          {o && <span className="fk-card-draw" title={`Draw (decimal${o.p ? `, ${o.p}` : ''})`}>X {o.d.toFixed(2)}</span>}
        </div>
        <div className="fk-card-rows">
          <SideRow m={m} side="a" day={day} odds={o?.a} />
          <SideRow m={m} side="h" day={day} odds={o?.h} />
          {(tie || m.r) && <div className="fk-card-sub fk-muted">{[m.r, m.leg ? `leg ${m.leg}` : '', tie].filter(Boolean).join(' · ')}</div>}
        </div>
        <span className="fk-card-corner" data-capture-exclude="true">
          <CopyButton target={(b) => b.closest('.fk-card') as HTMLElement} label={`Copy ${model.team(m.a).abbr} @ ${model.team(m.h).abbr} as an image`} small />
        </span>
      </div>
      {notes && (
        <div className="fk-card-note">
          <NoteBox store={notes} gameId={m.id} label={`${model.team(m.a).name} at ${model.team(m.h).name}`} />
        </div>
      )}
    </article>
  );
}

export function Slate({ day, notes, showNotes }: { day: string; notes: SlateNotes; showNotes: boolean }) {
  const { model, live } = useFooty();
  const list = dayMatches(model, day, live);
  if (!list.length) return <p className="fk-empty" data-testid="no-matches">No matches today for the followed clubs.</p>;
  return (
    <div className={`fk-slate${showNotes ? ' fk-slate-notes' : ''}`} data-testid="slate">
      {list.map((m) => <SlateCard key={m.id} m={m} day={day} notes={showNotes ? notes : undefined} />)}
    </div>
  );
}
