// Team Calendar: one club's matches on a Monday-first grid, 1 week, 2 weeks or a month. A cell shows the match
// (competition, vs / @ opponent, kickoff or score with the result's colour). Free windows (no match in that midweek
// or weekend window) are tinted, FIFA windows marked on the day number.

import { addDays, addMonths, isPlayed, monthOf, mondayOf, resultFor, weekdayShort, type Model } from '../data/model';
import { formAt } from '../data/form';
import { neutralVenue } from '../data/neutral';
import { fifaWindowOn, isFreeWindowDay, windowOf } from '../data/windows';
import { matchUrl, type Match } from '../data/snapshot';
import { withLive } from '../data/live';
import { CompMark, FormSquares, MatchTime, SeriesChip, TeamLink, tieNote } from './Bits';
import { useFooty } from './ctx';
import type { Span } from './page';

export function calendarDays(span: Span, week: string, month: string): { days: string[]; month?: string } {
  if (span !== 'month') return { days: Array.from({ length: 7 * span }, (_, i) => addDays(week, i)) };
  // whole Monday–Sunday weeks from the one holding the 1st to the one holding the month's last day
  const first = mondayOf(`${month}-01`);
  const lastDay = addDays(`${addMonths(month, 1)}-01`, -1);
  const end = addDays(mondayOf(lastDay), 6);
  const days: string[] = [];
  for (let d = first; d <= end; d = addDays(d, 1)) days.push(d);
  return { days, month };
}

function CellMatch({ m, team, day }: { m: Match; team: string; day: string }) {
  const { model } = useFooty();
  const home = m.h === team;
  const opp = home ? m.a : m.h;
  const r = resultFor(m, team);
  const neutral = neutralVenue(m);
  const mine = home ? m.hs : m.as, theirs = home ? m.as : m.hs;
  const tie = tieNote(m);
  return (
    <div className={`fk-cell-match${r ? ` fk-res-${r}` : ''}${neutral ? ' fk-neutral' : ''}`} data-testid="cal-match">
      <div className="fk-cell-top">
        <CompMark slug={m.c} round={m.r} />
        <span className="fk-cell-ha" title={neutral ? `Neutral venue (${neutral.why})` : home ? 'Home' : 'Away'}>{neutral ? 'v' : home ? 'vs' : '@'}</span>
        <TeamLink id={opp} day={day} />
      </div>
      <div className="fk-cell-bottom">
        {isPlayed(m) || m.st === 'in' ? (
          <a className="fk-cell-score" href={matchUrl(m.id)} target="_blank" rel="noopener noreferrer" title={`${model.team(m.a).name} ${m.as}-${m.hs} ${model.team(m.h).name}${tie ? ` · ${tie}` : ''} — open on ESPN`}>
            {r ?? ''} {mine}-{theirs}{m.hp !== undefined ? ' p' : ''}
          </a>
        ) : (
          <a className="fk-cell-time" href={matchUrl(m.id)} target="_blank" rel="noopener noreferrer" title="Open the match on ESPN"><MatchTime m={m} /></a>
        )}
        <FormSquares line={formAt(model, team, m)} teamId={team} />
        <SeriesChip m={m} />
      </div>
    </div>
  );
}

export function byDayFor(model: Model, team: string, live: ReturnType<typeof useFooty>['live']): Map<string, Match[]> {
  const out = new Map<string, Match[]>();
  for (const m of withLive(model.byTeam.get(team) ?? [], live)) {
    const d = model.dayOf(m);
    const l = out.get(d);
    if (l) l.push(m); else out.set(d, [m]);
  }
  return out;
}

export function TeamCalendar({ team, span, week, month, today, showFree = true }: { team: string; span: Span; week: string; month: string; today: string; showFree?: boolean }) {
  const { model, live } = useFooty();
  const { days, month: m } = calendarDays(span, week, month);
  const byDay = byDayFor(model, team, live);
  return (
    <section className={`fk-cal fk-cal-${span}`} data-testid="team-calendar">
      <div className="fk-cal-grid">
        {days.slice(0, 7).map((d) => <div key={`h${d}`} className="fk-cal-wd">{weekdayShort(d)}</div>)}
        {days.map((d) => {
          const matches = byDay.get(d) ?? [];
          const fifa = fifaWindowOn(d);
          const free = showFree && matches.length === 0 && isFreeWindowDay(model, team, d);
          const w = windowOf(d);
          const out = m !== undefined && monthOf(d) !== m;
          return (
            <div key={d} className={`fk-cal-cell fk-win-${w.kind}${free ? ' fk-free' : ''}${out ? ' fk-out' : ''}${d === today ? ' fk-today' : ''}${fifa ? ' fk-fifa' : ''}`} data-day={d} title={[free ? `Free ${w.kind === 'mid' ? 'midweek' : 'weekend'} window` : '', fifa?.label ?? ''].filter(Boolean).join('\n') || undefined}>
              <div className="fk-cal-date">
                <span>{Number(d.slice(8, 10))}</span>
                {fifa && <span className="fk-fifa-dot" aria-label={fifa.label}>FIFA</span>}
              </div>
              {matches.map((x) => <CellMatch key={x.id} m={x} team={team} day={d} />)}
            </div>
          );
        })}
      </div>
      <p className="fk-legend" data-capture-exclude="true">
        <span className="fk-key fk-key-free" /> free window (no match that midweek Tue–Thu / weekend Fri–Mon) · <span className="fk-key fk-key-fifa">FIFA</span> FIFA window · <TeamLink id={team} day={today} label="name" /> calendar
      </p>
    </section>
  );
}
