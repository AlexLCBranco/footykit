// Team List: one club's matches as rows, one calendar month at a time ("Load earlier" adds the month before). A row:
// date, time, competition, AWAY 2 @ 1 HOME with form, the result and league record at that point, series, ↗.
// With "Rest days" on (calendarkit's Team List), a quiet "Rest" row for each day without a match between the club's
// first and last match; a break is just a run of them.

import { useMemo } from 'react';
import { addMonths, daysBetween, dayLabel, monthLabel, monthOf, restDays, resultFor } from '../data/model';
import { formAt, recordText } from '../data/form';
import { withLive } from '../data/live';
import type { Match } from '../data/snapshot';
import { CompMark, MatchLink, MatchTime, Scoreline, SeriesChip } from './Bits';
import { useFooty } from './ctx';

export function TeamList({ team, from, to, onEarlier, showRest = false }: { team: string; from: string; to: string; onEarlier: () => void; showRest?: boolean }) {
  const { model, live } = useFooty();
  const all = withLive(model.byTeam.get(team) ?? [], live);
  // from every match of the club, never the months shown (a filter would invent rest days)
  const rest = useMemo(() => (showRest ? restDays((model.byTeam.get(team) ?? []).map((m) => model.dayOf(m))) : []), [showRest, model, team]);
  const rows = all.filter((m) => { const mo = monthOf(model.dayOf(m)); return mo >= from && mo <= to; });
  const earliest = all.length ? monthOf(model.dayOf(all[0]!)) : from;
  const months: string[] = [];
  for (let mo = from; mo <= to; mo = addMonths(mo, 1)) months.push(mo);
  // each rest day's gap: the match days around it (for its tooltip)
  const matchDays = useMemo(() => [...new Set((model.byTeam.get(team) ?? []).map((m) => model.dayOf(m)))].sort(), [model, team]);
  const gapOf = (d: string) => {
    const next = matchDays.find((x) => x > d);
    const prev = [...matchDays].reverse().find((x) => x < d);
    return prev && next ? daysBetween(prev, next) : undefined;
  };
  return (
    <section className="fk-teamlist" data-testid="team-list">
      {from > earliest && (
        <button type="button" className="fk-btn fk-earlier" data-capture-exclude="true" onClick={onEarlier}>Load earlier ({monthLabel(addMonths(from, -1))})</button>
      )}
      {months.map((mo) => {
        const list = rows.filter((m) => monthOf(model.dayOf(m)) === mo);
        const restIn = rest.filter((d) => monthOf(d) === mo);
        // matches and rest days in date order (a rest day never shares a date with a match)
        const items: (Match | string)[] = [...list, ...restIn].sort((a, b) => {
          const da = typeof a === 'string' ? a : model.dayOf(a), db = typeof b === 'string' ? b : model.dayOf(b);
          return da < db ? -1 : da > db ? 1 : 0;
        });
        return (
          <div key={mo} className="fk-tl-month">
            <h3>{monthLabel(mo)}</h3>
            {items.length === 0 && <p className="fk-empty">No matches.</p>}
            {items.map((m) => {
              if (typeof m === 'string') {
                const gap = gapOf(m);
                return (
                  <div key={m} className="fk-rest-row" data-testid="rest-row" data-rest={m} aria-label={`${dayLabel(m)}, rest day`}
                    title={gap ? `${gap} days between matches (rest counted as the difference of the match dates)` : undefined}>
                    <span className="fk-tl-date">{dayLabel(m)}</span>
                    <span className="fk-rest">Rest</span>
                  </div>
                );
              }
              const day = model.dayOf(m);
              const r = resultFor(m, team);
              const f = formAt(model, team, m);
              return (
                <div key={m.id} className={`fk-row fk-tl-row${r ? ` fk-res-${r}` : ''}`} data-testid="team-row" data-game-id={m.id}>
                  <span className="fk-tl-date">{dayLabel(day)}</span>
                  <MatchTime m={m} />
                  <CompMark slug={m.c} round={m.r} />
                  <Scoreline m={m} day={day} label="short" form={false} />
                  <span className="fk-row-end">
                    {r && <span className={`fk-res fk-res-${r}`}>{r}</span>}
                    <span className="fk-muted fk-tl-rec" title="League record W-D-L (after a played match, going into one to come)">{recordText(f.record)}</span>
                    {f.streak && <span className="fk-muted" title="Streak, all competitions">{f.streak}</span>}
                    <SeriesChip m={m} />
                    <MatchLink m={m} />
                  </span>
                </div>
              );
            })}
          </div>
        );
      })}
    </section>
  );
}
