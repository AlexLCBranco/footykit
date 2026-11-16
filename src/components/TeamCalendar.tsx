// Team Calendar: one club's matches on a Monday-first grid, 1 week, 2 weeks or a month, on calendarkit's Team Calendar
// design (FK-24: TeamMonthGrid.tsx, grid.css, game-card.css): a day number, then each match as a compact card scaled to
// the cell. Free windows (no match in that midweek or weekend window) are tinted, FIFA windows marked by the day number.

import { addDays, addMonths, isPlayed, kickoffTime, monthLabel, monthOf, mondayOf, resultFor, shortDay, weekdayShort, type Model } from '../data/model';
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
import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react';

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

/** A cell's match as calendarkit's compact GameCard (FK-24): the one-line matchup with logos
 * (FK-20: the club first, the winner bright, the loser muted); the kickoff above it, played or not, then the chips where calendarkit puts its streak, series,
 * fatigue chips and game marker: W/D/L and form, the season series, the context tags, the competition, a derby. */
function CellMatch({ m, team, day }: { m: Match; team: string; day: string }) {
  const { model, timeZone } = useFooty();
  const home = m.h === team;
  const opp = home ? m.a : m.h;
  const r = resultFor(m, team);
  const neutral = neutralVenue(m);
  const mine = home ? m.hs : m.as, theirs = home ? m.as : m.hs;
  const tie = tieNote(m);
  const scored = (isPlayed(m) || m.st === 'in') && mine !== undefined && theirs !== undefined;
  // calendarkit's .ck-score / .ck-score-win: the winner's number bright and bold, the loser's muted (a draw: both plain)
  const num = (n: number | undefined, won: boolean, lost: boolean) => <span className={`fk-cell-num${won ? ' fk-num-win' : lost ? ' fk-num-lose' : ''}`}>{n}</span>;
  const ha = neutral ? 'v' : home ? 'vs' : '@';
  const haTip = neutral ? `Neutral venue (${neutral.why})` : home ? 'Home' : 'Away';
  const link = { href: matchUrl(m, model), target: '_blank', rel: 'noopener noreferrer' };
  const c = model.comp(m.c);
  return (
    <article className={`fk-cell-match${r ? ` fk-res-${r}` : ''}${neutral ? ' fk-neutral' : ''}${scored ? ' fk-cell-final' : ''}`} data-testid="cal-match" data-game-id={m.id}>
      {/* the kickoff on top, played or not (calendarkit's .ck-time); a live / off match shows its state */}
      <a className="fk-cell-time" {...link} title="Search the match on Google">{isPlayed(m) ? <span className="fk-time">{m.tbd ? 'TBD' : kickoffTime(m.t, timeZone)}</span> : <MatchTime m={m} />}</a>
      <div className="fk-cell-line" data-testid="cal-line">
        <TeamLink id={team} day={day} logoSize={16} className={r === 'L' ? 'fk-loss' : ''} />
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
        <TeamLink id={opp} day={day} logo="after" logoSize={16} className={r === 'W' ? 'fk-loss' : ''} />
      </div>
      <div className="fk-cell-tags">
        {r && <span className={`fk-res fk-res-${r}`} title={r === 'W' ? 'Win' : r === 'L' ? 'Defeat' : 'Draw'}>{r}</span>}
        <FormSquares line={formAt(model, team, m)} teamId={team} />
        <SeriesChip m={m} />
        <TeamTags m={m} side={home ? 'h' : 'a'} />
        <span className={`fk-cell-comp fk-comp-pill-${c.kind}`} title={`${c.name}${m.r ? ` · ${m.r}` : ''}`} data-testid="cal-comp"><CompMark slug={m.c} round={m.r} />{c.code}</span>
        <DerbyTag m={m} />
      </div>
    </article>
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

/** FK-18: the week rows grow so the grid reaches the bottom of the window (the page's bottom padding still fits
 * under it); each span's own minimum row height stays, so a short window scrolls instead of squashing. */
function useFillHeight(weeks: number) {
  const ref = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number>();
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const top = el.getBoundingClientRect().top + window.scrollY;
      setHeight(Math.floor(window.innerHeight - top - 16)); // .app's bottom padding
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [weeks]);
  return { ref, height };
}

/** calendarkit's Team Calendar content scale (TeamMonthGrid.tsx): the largest zoom, in 0.05 steps from
 * TEAM_SCALE_MAX (week views TEAM_WEEK_SCALE_MAX) down to TEAM_SCALE_MIN, at which every shown cell's content fits
 * TEAM_SCALE_FILL of a cell's free height (a month: the cell of a 6-week month, so 5- and 6-week months match) and
 * its width. Measured before paint; footykit measures the shown cells (no probe card). */
export const TEAM_CELL_MIN_HEIGHT = 92;
export const TEAM_SCALE_MAX = 2;
export const TEAM_WEEK_SCALE_MAX = 3;
export const TEAM_SCALE_MIN = 0.8;
export const TEAM_SCALE_FILL = 0.9;
function useCellScale(grid: React.RefObject<HTMLDivElement | null>, height: number | undefined, weeks: number, weekView: boolean, key: string) {
  const [scale, setScale] = useState({ key: '', s: 1 });
  const k = `${key}|${height}|${window.innerWidth}`;
  useLayoutEffect(() => {
    const g = grid.current;
    if (!g || !height || scale.key === k) return;
    const cell = g.querySelector<HTMLElement>('.fk-cal-cell');
    const head = g.querySelector<HTMLElement>('.fk-cal-wd');
    if (!cell || !head) return;
    const px = (v: string) => parseFloat(v) || 0;
    const gs = getComputedStyle(g), cs = getComputedStyle(cell);
    const gap = px(gs.rowGap);
    const rowH = Math.max(TEAM_CELL_MIN_HEIGHT, (height - head.getBoundingClientRect().height - gap * weeks) / weeks);
    const h6 = weekView ? rowH : Math.max(TEAM_CELL_MIN_HEIGHT, (weeks * (rowH + gap)) / 6 - gap);
    const num = cell.querySelector<HTMLElement>('.fk-cal-date')!.getBoundingClientRect().height;
    const room = (h6 - num - px(cs.paddingTop) - px(cs.rowGap) - px(cs.paddingBottom) - 2 * px(cs.borderBottomWidth)) * TEAM_SCALE_FILL;
    const bodies = [...g.querySelectorAll<HTMLElement>('.fk-cell-body')].filter((b) => b.childElementCount);
    let s = weekView ? TEAM_WEEK_SCALE_MAX : TEAM_SCALE_MAX;
    for (; s > TEAM_SCALE_MIN; s = Math.round((s - 0.05) * 100) / 100) {
      g.style.setProperty('--fk-cal-scale', String(s));
      if (bodies.every((b) => b.getBoundingClientRect().height <= room && b.scrollWidth <= b.clientWidth)) break;
    }
    s = Math.max(TEAM_SCALE_MIN, s);
    g.style.setProperty('--fk-cal-scale', String(s));
    setScale({ key: k, s });
  }, [grid, height, scale.key, k, weeks, weekView]);
  return scale.s;
}

export function TeamCalendar({ team, span, week, month, today, showFree = true }: { team: string; span: Span; week: string; month: string; today: string; showFree?: boolean }) {
  const { model, live, now, tags, hiddenTags } = useFooty();
  const { days, month: m } = calendarDays(span, week, month);
  const weeks = days.length / 7;
  const fill = useFillHeight(weeks);
  const byDay = byDayFor(model, team, live);
  const scale = useCellScale(fill.ref, fill.height, weeks, span !== 'month', `${team}|${span}|${days[0]}|${now}|${tags}|${[...(hiddenTags ?? [])].join()}`);
  return (
    <section className={`fk-cal fk-cal-${span}`} data-testid="team-calendar">
      <TeamHeader team={team} period={span === 'month' ? monthLabel(month) : fmtRange(days[0]!, days[days.length - 1]!)} />
      <div className="fk-cal-grid" ref={fill.ref} data-weeks={weeks} data-scale={scale}
        style={{ ...(fill.height ? { minHeight: fill.height } : {}), gridTemplateRows: `auto repeat(${weeks}, minmax(${TEAM_CELL_MIN_HEIGHT}px, 1fr))`, '--fk-cal-scale': scale } as CSSProperties}>
        {days.slice(0, 7).map((d) => <div key={`h${d}`} className="fk-cal-wd" role="columnheader">{weekdayShort(d)}</div>)}
        {days.map((d) => {
          const matches = byDay.get(d) ?? [];
          const fifa = fifaWindowOn(d);
          const free = showFree && matches.length === 0 && isFreeWindowDay(model, team, d);
          const w = windowOf(d);
          const out = m !== undefined && monthOf(d) !== m;
          const past = matches.length > 0 && matches.every((x) => isPlayed(x) || x.st === 'can' || x.st === 'ppd');
          // a week view can cross a month: the 1st says which (calendarkit)
          const num = span !== 'month' && d.endsWith('-01') ? shortDay(d) : String(Number(d.slice(8, 10)));
          return (
            <div key={d} className={`fk-cal-cell fk-win-${w.kind}${matches.length ? ' fk-cell-game' : ''}${past ? ' fk-cell-past' : ''}${free ? ' fk-free' : ''}${out ? ' fk-out' : ''}${d === today ? ' fk-today' : ''}${fifa ? ' fk-fifa' : ''}`} data-day={d} role="gridcell" title={[free ? `Free ${w.kind === 'mid' ? 'midweek' : 'weekend'} window` : '', fifa?.label ?? ''].filter(Boolean).join('\n') || undefined}>
              <div className="fk-cal-date">
                <span className="fk-daynum">{num}</span>
                {matches.length > 0 && <span className="fk-cal-runs">{matches.map((x) => <RunLabel key={x.id} m={x} team={team} />)}</span>}
                {fifa && <span className="fk-fifa-dot" aria-label={fifa.label}>FIFA</span>}
              </div>
              <div className="fk-cell-body">{matches.map((x) => <CellMatch key={x.id} m={x} team={team} day={d} />)}</div>
            </div>
          );
        })}
      </div>
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
