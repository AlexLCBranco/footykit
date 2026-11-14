// Main view: every followed club's matches for one local day, by kickoff. A day without matches says so (days are
// never skipped). Rows: time | competition | AWAY 2 @ 1 HOME with form | tie line, series chip, ↗.

import { fifaWindowOn } from '../data/windows';
import { withLive } from '../data/live';
import { dayLabel, isPlayed } from '../data/model';
import type { Match } from '../data/snapshot';
import { CompMark, MatchLink, MatchTime, Scoreline, SeriesChip } from './Bits';
import { useFooty } from './ctx';

export function dayMatches(model: ReturnType<typeof useFooty>['model'], day: string, live: ReturnType<typeof useFooty>['live']): Match[] {
  return withLive(model.byDay.get(day) ?? [], live);
}

export function MatchRow({ m, day, flagFifa }: { m: Match; day: string; flagFifa?: boolean }) {
  const { model } = useFooty();
  const fifa = flagFifa && model.comp(m.c).slug === 'bra.1' ? fifaWindowOn(day) : undefined;
  return (
    <div className={`fk-row${isPlayed(m) ? ' fk-row-played' : ''}`} data-testid="match-row" data-comp={model.comp(m.c).code}>
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

export function DayList({ day }: { day: string }) {
  const { model, live } = useFooty();
  const list = dayMatches(model, day, live);
  const fifa = fifaWindowOn(day);
  return (
    <section className="fk-daylist" data-testid="day-list" aria-label={`Matches on ${dayLabel(day)}`}>
      <header className="fk-day-head">
        <h2>{dayLabel(day)}</h2>
        <span className="fk-muted">{list.length ? `${list.length} match${list.length > 1 ? 'es' : ''}` : ''}</span>
        {fifa && <span className="fk-chip fk-fifa-chip" title={`Source: ${fifa.source}`}>{fifa.label}</span>}
      </header>
      {list.length === 0 ? (
        <p className="fk-empty" data-testid="no-matches">No matches today for the followed clubs.</p>
      ) : (
        <div className="fk-rows">{list.map((m) => <MatchRow key={m.id} m={m} day={day} flagFifa />)}</div>
      )}
    </section>
  );
}
