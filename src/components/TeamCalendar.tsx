// Team Calendar: one club's matches on a Monday-first grid, 1 week, 2 weeks or a month. A cell shows the match
// (competition, vs / @ opponent, kickoff or score with the result's colour). Free windows (no match in that midweek
// or weekend window) are tinted, FIFA windows marked on the day number.

import { addDays, addMonths, isPlayed, monthLabel, monthOf, mondayOf, resultFor, weekdayShort, type Model } from '../data/model';
import { formAt } from '../data/form';
import { neutralVenue } from '../data/neutral';
import { fifaWindowOn, isFreeWindowDay, windowOf } from '../data/windows';
import { matchUrl, type Match } from '../data/snapshot';
import { withLive } from '../data/live';
import { CompMark, FormSquares, MatchTime, SeriesChip, TeamLink, tieNote } from './Bits';
import { useFooty } from './ctx';
import { DerbyTag, TeamTags } from './Tags';
import { RunLabel } from './Runs';
import { fmtRange, TeamHeader } from './TeamHeader';
import type { Span } from './page';
import { useLayoutEffect, useRef, useState } from 'react';

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
  const scored = (isPlayed(m) || m.st === 'in') && mine !== undefined && theirs !== undefined;
  // calendarkit's "BOS 108 @ 97 ORL": the club first, the winner's number bright, the loser's dimmed (a draw: both plain)
  const num = (n: number | undefined, won: boolean, lost: boolean) => <span className={`fk-cell-num${won ? ' fk-num-win' : lost ? ' fk-num-lose' : ''}`}>{n}</span>;
  const ha = neutral ? 'v' : home ? 'vs' : '@';
  const haTip = neutral ? `Neutral venue (${neutral.why})` : home ? 'Home' : 'Away';
  const link = { href: matchUrl(m, model), target: '_blank', rel: 'noopener noreferrer' };
  return (
    <div className={`fk-cell-match${r ? ` fk-res-${r}` : ''}${neutral ? ' fk-neutral' : ''}`} data-testid="cal-match" data-game-id={m.id}>
      <div className="fk-cell-top">
        <CompMark slug={m.c} round={m.r} />
        {!scored && <a className="fk-cell-time" {...link} title="Search the match on Google"><MatchTime m={m} /></a>}
        <DerbyTag m={m} />
      </div>
      <div className="fk-cell-line" data-testid="cal-line">
        <TeamLink id={team} day={day} />
        {scored ? (
          <a className="fk-cell-score" {...link} title={`${model.team(m.a).name} ${m.as}-${m.hs} ${model.team(m.h).name}${tie ? ` · ${tie}` : ''} (${haTip.toLowerCase()}) — search on Google`}>
            {num(mine, r === 'W', r === 'L')}
            <span className="fk-cell-ha">{ha}</span>
            {num(theirs, r === 'L', r === 'W')}
            {m.hp !== undefined && <span className="fk-cell-ha">p</span>}
          </a>
        ) : (
          <span className="fk-cell-ha" title={haTip}>{ha}</span>
        )}
        <TeamLink id={opp} day={day} logo="after" />
      </div>
      <div className="fk-cell-tags"><TeamTags m={m} side={home ? 'h' : 'a'} /></div>
      <div className="fk-cell-bottom">
        {r && <span className={`fk-res fk-res-${r}`} title={r === 'W' ? 'Win' : r === 'L' ? 'Defeat' : 'Draw'}>{r}</span>}
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

/** FK-18: the week rows grow so the grid reaches the bottom of the window (the legend and the page's bottom padding
 * still fit under it); each span's own minimum row height stays, so a short window scrolls instead of squashing. */
function useFillHeight(weeks: number) {
  const ref = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number>();
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const top = el.getBoundingClientRect().top + window.scrollY;
      const below = (el.nextElementSibling?.getBoundingClientRect().height ?? 0) + 8 + 16; // legend + its margin + .app's bottom padding
      setHeight(Math.floor(window.innerHeight - top - below));
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [weeks]);
  return { ref, style: height ? { minHeight: height, gridTemplateRows: `auto repeat(${weeks}, minmax(var(--fk-cal-row), 1fr))` } : undefined };
}

export function TeamCalendar({ team, span, week, month, today, showFree = true }: { team: string; span: Span; week: string; month: string; today: string; showFree?: boolean }) {
  const { model, live } = useFooty();
  const { days, month: m } = calendarDays(span, week, month);
  const fill = useFillHeight(days.length / 7);
  const byDay = byDayFor(model, team, live);
  return (
    <section className={`fk-cal fk-cal-${span}`} data-testid="team-calendar">
      <TeamHeader team={team} period={span === 'month' ? monthLabel(month) : fmtRange(days[0]!, days[days.length - 1]!)} />
      <div className="fk-cal-grid" ref={fill.ref} style={fill.style} data-weeks={days.length / 7}>
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
                {matches.length > 0 && <span className="fk-cal-runs">{matches.map((x) => <RunLabel key={x.id} m={x} team={team} />)}</span>}
                {fifa && <span className="fk-fifa-dot" aria-label={fifa.label}>FIFA</span>}
              </div>
              {matches.map((x) => <CellMatch key={x.id} m={x} team={team} day={d} />)}
            </div>
          );
        })}
      </div>
      <WindowLegend team={team} today={today} what="calendar" />
    </section>
  );
}

/** The key under a club's Calendar and List: free windows, FIFA windows, and in the List the midweek / weekend bands. */
export function WindowLegend({ team, today, what }: { team: string; today: string; what: 'calendar' | 'list' }) {
  return (
    <p className="fk-legend" data-capture-exclude="true" data-testid="window-legend">
      {what === 'list' && <><span className="fk-key fk-key-band fk-band-mid" /> midweek Tue–Thu · <span className="fk-key fk-key-band fk-band-wkd" /> weekend Fri–Mon · </>}
      <span className="fk-key fk-key-free" /> free window (no match that midweek Tue–Thu / weekend Fri–Mon) · <span className="fk-key fk-key-fifa">FIFA</span> FIFA window · <TeamLink id={team} day={today} label="name" /> {what}
    </p>
  );
}
