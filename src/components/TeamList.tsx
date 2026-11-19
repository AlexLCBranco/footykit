// Team List: one club's matches as rows, one calendar month at a time ("Load earlier" adds the month before). A row:
// date, time, competition, AWAY 2 @ 1 HOME with form, the result and league record at that point, series, ↗.
// With "Rest days" on (calendarkit's Team List), a quiet "Rest" row for each day without a match between the club's
// first and last match; a break is just a run of them.

import { useMemo } from 'react';
import { addMonths, daysBetween, dayLabel, monthLabel, monthOf, restDays, resultFor } from '../data/model';
import { formAt, recordText } from '../data/form';
import { withLive } from '../data/live';
import { fifaWindowOn, isFreeWindowDay, windowOf } from '../data/windows';
import type { Match } from '../data/snapshot';
import { CompMark, MatchLink, MatchTime, Scoreline, SeriesChip } from './Bits';
import { useFooty } from './ctx';
import { WindowLegend } from './TeamCalendar';
import { RunLabel } from './Runs';
import { fmtMonthSpan, TeamHeader } from './TeamHeader';
import { StreakChip } from './Streak';

/** Day lines grouped by fixture window (midweek Tue–Thu, weekend Fri–Mon), in order: one band per window, by date
 * (a window's rest lines are in its band too). */
export function bandsOf<T>(items: T[], dayOf: (x: T) => string): { kind: 'mid' | 'wkd'; start: string; items: T[] }[] {
  const out: { kind: 'mid' | 'wkd'; start: string; items: T[] }[] = [];
  for (const x of items) {
    const w = windowOf(dayOf(x));
    const last = out[out.length - 1];
    if (last && last.start === w.start) last.items.push(x);
    else out.push({ kind: w.kind, start: w.start, items: [x] });
  }
  return out;
}

/** A day line's date cell: the date, and the FIFA marker on a FIFA-window day (the Team Calendar's). */
function LineDate({ day, today }: { day: string; today?: boolean }) {
  const fifa = fifaWindowOn(day);
  return (
    <span className="fk-tl-date">
      {dayLabel(day)}
      {today && <span className="fk-today-pill" data-testid="today-mark">Today</span>}
      {fifa && <span className="fk-fifa-dot" title={fifa.label} data-testid="fifa-mark">FIFA</span>}
    </span>
  );
}

export function TeamList({ team, from, to, today, onEarlier, showRest = false, showFree = true }: { team: string; from: string; to: string; today: string; onEarlier: () => void; showRest?: boolean; showFree?: boolean }) {
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
      <TeamHeader team={team} period={fmtMonthSpan(from, to)} />
      {from > earliest && (
        <button type="button" className="fk-btn fk-earlier" data-capture-exclude="true" onClick={onEarlier}>Load earlier ({monthLabel(addMonths(from, -1))})</button>
      )}
      {months.map((mo) => {
        const list = rows.filter((m) => monthOf(model.dayOf(m)) === mo);
        const restIn = rest.filter((d) => monthOf(d) === mo);
        // FK-27: today always has a line, highlighted, even with rest days off or outside the club's season
        if (monthOf(today) === mo && !list.some((m) => model.dayOf(m) === today) && !restIn.includes(today)) restIn.push(today);
        // matches and rest days in date order (a rest day never shares a date with a match)
        const items: (Match | string)[] = [...list, ...restIn].sort((a, b) => {
          const da = typeof a === 'string' ? a : model.dayOf(a), db = typeof b === 'string' ? b : model.dayOf(b);
          return da < db ? -1 : da > db ? 1 : 0;
        });
        return (
          <div key={mo} className="fk-tl-month">
            <h3>{monthLabel(mo)}</h3>
            {items.length === 0 && <p className="fk-empty">No matches.</p>}
            {bandsOf(items, (x) => (typeof x === 'string' ? x : model.dayOf(x))).map((band) => (
              <div key={band.start} className={`fk-band fk-band-${band.kind}`} data-testid="window-band" data-window={band.kind} data-start={band.start}>
            {band.items.map((m) => {
              if (typeof m === 'string') {
                const gap = gapOf(m);
                // the Team Calendar's free-window tint, on top of the band
                const free = showFree && isFreeWindowDay(model, team, m);
                const tip = [free ? `Free ${band.kind === 'mid' ? 'midweek' : 'weekend'} window` : '', fifaWindowOn(m)?.label ?? '', gap ? `${gap} days between matches (rest counted as the difference of the match dates)` : ''].filter(Boolean).join('\n');
                const isToday = m === today;
                // today without a match, outside the rest days (rest days off, or before / after the season)
                const restDay = rest.includes(m);
                return (
                  <div key={m} className={`fk-rest-row${free ? ' fk-free' : ''}${fifaWindowOn(m) ? ' fk-fifa' : ''}${isToday ? ' fk-is-today' : ''}`} data-testid="rest-row" data-rest={m} data-free={free || undefined} data-today={isToday || undefined} aria-label={`${dayLabel(m)}, ${isToday ? 'today, ' : ''}${restDay ? 'rest day' : 'no match'}`}
                    aria-current={isToday ? 'date' : undefined} title={tip || undefined}>
                    <LineDate day={m} today={isToday} />
                    <span className="fk-rest">{restDay ? 'Rest' : 'No match'}</span>
                  </div>
                );
              }
              const day = model.dayOf(m);
              const r = resultFor(m, team);
              const f = formAt(model, team, m);
              return (
                <div key={m.id} className={`fk-row fk-tl-row${r ? ` fk-res-${r}` : ''}${fifaWindowOn(day) ? ' fk-fifa' : ''}${day === today ? ' fk-is-today' : ''}`} data-testid="team-row" data-game-id={m.id} data-today={day === today || undefined} aria-current={day === today ? 'date' : undefined}>
                  <LineDate day={day} today={day === today} />
                  <MatchTime m={m} />
                  <CompMark m={m} showName />
                  <Scoreline m={m} day={day} label="short" form={false} />
                  <span className="fk-row-end">
                    <RunLabel m={m} team={team} />
                    {r && <span className={`fk-res fk-res-${r}`}>{r}</span>}
                    <span className="fk-muted fk-tl-rec" title="League record W-D-L (after a played match, going into one to come)">{recordText(f.record)}</span>
                    <StreakChip teamId={team} m={m} />
                    <SeriesChip m={m} />
                    <MatchLink m={m} />
                  </span>
                </div>
              );
            })}
              </div>
            ))}
          </div>
        );
      })}
      <WindowLegend team={team} today={today} what="list" />
    </section>
  );
}
