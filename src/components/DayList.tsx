// Main view: every followed club's matches for one local day, by kickoff. A day without matches says so (days are
// never skipped). Rows: time | competition | AWAY 2 @ 1 HOME with form | tie line, series chip, ↗. Beside it (when the
// window leaves room) the travel map: hovering a row focuses its match, a click pins it (again, Esc or the empty map
// unpins; a new day starts unpinned: DayList is keyed by day).

import { lazy, Suspense, useEffect, useState } from 'react';
import { fifaWindowOn } from '../data/windows';
import { withLive } from '../data/live';
import { dayLabel, isPlayed } from '../data/model';
import type { Match } from '../data/snapshot';
import { CompMark, MatchLink, MatchTime, Scoreline, SeriesChip } from './Bits';
import { useFooty } from './ctx';

export function dayMatches(model: ReturnType<typeof useFooty>['model'], day: string, live: ReturnType<typeof useFooty>['live']): Match[] {
  return withLive(model.byDay.get(day) ?? [], live);
}

// the map and its basemaps are a separate chunk, loaded the first time a day list has room for it
const TravelMap = lazy(() => import('../map/TravelMap'));
/** The list column's width; the map takes the rest when that is at least MAP_MIN px. */
export const LIST_W = 980;
const MAP_MIN = 420;

export function MatchRow({ m, day, flagFifa, pinned, onHover, onPin }: { m: Match; day: string; flagFifa?: boolean; pinned?: boolean; onHover?: (id?: string) => void; onPin?: (id: string) => void }) {
  const { model } = useFooty();
  const fifa = flagFifa && model.comp(m.c).slug === 'bra.1' ? fifaWindowOn(day) : undefined;
  return (
    <div className={`fk-row${isPlayed(m) ? ' fk-row-played' : ''}${pinned ? ' fk-row-pinned' : ''}`} data-testid="match-row" data-game-id={m.id} data-comp={model.comp(m.c).code} data-pinned={pinned || undefined}
      onMouseEnter={onHover && (() => onHover(m.id))} onMouseLeave={onHover && (() => onHover(undefined))} onClick={onPin && (() => onPin(m.id))}>
      <MatchTime m={m} />
      <CompMark slug={m.c} round={m.r} />
      <Scoreline m={m} day={day} />
      <span className="fk-row-end">
        {fifa && <span className="fk-chip fk-fifa-chip" title={`${fifa.label}: clubs may be missing internationals`}>FIFA</span>}
        <SeriesChip m={m} />
        <MatchLink m={m} />
      </span>
    </div>
  );
}

export function DayList({ day, width }: { day: string; width: number }) {
  const { model, live } = useFooty();
  const list = dayMatches(model, day, live);
  const fifa = fifaWindowOn(day);
  const [hover, setHover] = useState<string>();
  const [pinned, setPinned] = useState<string>();
  const pin = (id?: string) => setPinned((p) => (id === undefined || p === id ? undefined : id));
  useEffect(() => {
    if (!pinned) return;
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setPinned(undefined); };
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [pinned]);
  const mapW = width - LIST_W - 24;
  return (
    <div className="fk-day-grid">
    <section className="fk-daylist" data-testid="day-list" aria-label={`Matches on ${dayLabel(day)}`}>
      <header className="fk-day-head">
        <h2>{dayLabel(day)}</h2>
        <span className="fk-muted">{list.length ? `${list.length} match${list.length > 1 ? 'es' : ''}` : ''}</span>
        {fifa && <span className="fk-chip fk-fifa-chip" title={`Source: ${fifa.source}`}>{fifa.label}</span>}
      </header>
      {list.length === 0 ? (
        <p className="fk-empty" data-testid="no-matches">No matches today for the followed clubs.</p>
      ) : (
        <div className="fk-rows">{list.map((m) => <MatchRow key={m.id} m={m} day={day} flagFifa pinned={pinned === m.id} onHover={setHover} onPin={pin} />)}</div>
      )}
    </section>
    {mapW >= MAP_MIN && (
      <Suspense fallback={<aside className="fk-map" data-capture-exclude="true" />}>
        <TravelMap list={list} focus={hover ?? pinned} pinned={pinned} onFocus={setHover} onPin={pin} width={Math.min(mapW, 820)} />
      </Suspense>
    )}
    </div>
  );
}
