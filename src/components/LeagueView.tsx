// FK-45: the League view — one competition at a time, like calendarkit's League schedule but for many competitions:
// every game of the competition (all its teams, not only the followed clubs), in List mode (one day, "No games" days
// shown) or Calendar mode (the week's 7 days as columns; a day's header opens it in the List), the competition's teams
// (a followed club's name opens its Team Calendar; the others have none), and its standings: a league's table (with
// FK-43's step-through), the UCL's page or a cup's bracket / groups (the Cups tab's own pages, reused as they are).
// A first version (the owner redesigns it by using it live). Its own chunk, like the other competition pages.

import { useMemo, useState, type ReactNode } from 'react';
import { SideHost } from './SideArrows';
import { addDays, dayLabel, isPlayed, kickoffTime, mondayOf, shortDay } from '../data/model';
import { matchUrl, type Match } from '../data/snapshot';
import { compDays, compTeams } from '../data/leagueView';
import { TeamLink } from './Bits';
import { useFooty } from './ctx';
import { MatchRow } from './DayList';
import CupsPage from './CupsPage';
import LeagueTablePage from './LeagueTablePage';
import UclPage from './UclPage';
import { isLeague, UCL_SLUG, type LeagueMode } from './page';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function DayGames({ day, list }: { day: string; list: Match[] }) {
  return (
    <section className="fk-daylist fk-lv-day" data-testid="league-day" data-day={day} aria-label={`Games on ${dayLabel(day)}`}>
      <header className="fk-day-head">
        <h2>{dayLabel(day)}</h2>
        <span className="fk-muted">{list.length ? `${list.length} game${list.length > 1 ? 's' : ''}` : ''}</span>
      </header>
      {list.length === 0
        ? <p className="fk-empty" data-testid="league-no-games">No games</p>
        : <div className="fk-rows">{list.map((m) => <MatchRow key={m.id} m={m} day={day} />)}</div>}
    </section>
  );
}

/** One game in a Calendar day column: time (or the score), AWAY @ HOME, a link to the Google search. */
function CalGame({ m }: { m: Match }) {
  const { model, timeZone } = useFooty();
  const a = model.team(m.a), h = model.team(m.h);
  const scored = m.hs !== undefined && m.as !== undefined && (isPlayed(m) || m.st === 'in');
  return (
    <a className={`fk-lv-game${m.st === 'in' ? ' fk-lv-live' : ''}`} href={matchUrl(m, model)} target="_blank" rel="noopener noreferrer" draggable={false}
      title={`${a.name} at ${h.name}${m.r ? `\n${m.r}` : ''}\nSearch the match on Google`} data-testid="league-cal-game" data-game-id={m.id}>
      <span className="fk-lv-time">{scored ? '' : m.tbd ? 'TBD' : kickoffTime(m.t, timeZone)}</span>
      <span className="fk-lv-teams">{a.abbr} {scored ? <b>{m.as}–{m.hs}</b> : '@'} {h.abbr}</span>
    </a>
  );
}

function WeekGames({ day, today, byDay, onDay }: { day: string; today: string; byDay: Map<string, Match[]>; onDay: (d: string) => void }) {
  const start = mondayOf(day);
  return (
    <section className="fk-lv-week" data-testid="league-week" data-week={start}>
      {WEEKDAYS.map((w, i) => {
        const d = addDays(start, i);
        const list = byDay.get(d) ?? [];
        return (
          <div key={d} className={`fk-lv-col${d === today ? ' fk-lv-today' : ''}`} data-testid="league-cal-day" data-day={d}>
            <button type="button" className="fk-lv-colhead" title={`Open ${dayLabel(d)} in the List`} onClick={() => onDay(d)}>
              <span>{w}</span> <span className="fk-muted">{shortDay(d)}</span>
            </button>
            {list.length ? list.map((m) => <CalGame key={m.id} m={m} />) : <span className="fk-lv-none fk-muted">No games</span>}
          </div>
        );
      })}
    </section>
  );
}

/** `onList`: a Calendar day header opens that day in List mode. */
export default function LeagueView({ comp, mode, day, today, onList, side }: { comp: string; mode: LeagueMode; day: string; today: string; onList: (d: string) => void; /** FK-49: the side arrows (Calendar mode) */ side?: ReactNode }) {
  const { model } = useFooty();
  const byDay = useMemo(() => compDays(model.snap.matches, comp, model.dayOf), [model, comp]);
  const teams = useMemo(() => compTeams(model.snap.matches, comp, (id) => model.team(id).short), [model, comp]);
  // the UCL page's League phase / Pots tabs, kept here (not in the address)
  const [uclTab, setUclTab] = useState<'table' | 'pots'>('table');
  return (
    <div className="fk-lv" data-testid="league-view" data-comp={comp}>
      {mode === 'cal' ? <SideHost side={side}><WeekGames day={day} today={today} byDay={byDay} onDay={onList} /></SideHost> : <DayGames day={day} list={byDay.get(day) ?? []} />}
      <section className="fk-lv-teams-box" data-testid="league-teams" aria-label="Teams">
        <h3>Teams <span className="fk-muted">{teams.length}</span></h3>
        <div className="fk-lv-team-list">
          {teams.map((id) => <span key={id} className="fk-lv-team" data-testid="league-team" data-team={model.team(id).abbr}><TeamLink id={id} day={today} label="short" /></span>)}
        </div>
      </section>
      <section className="fk-lv-standings" data-testid="league-standings">
        {isLeague(comp) ? <LeagueTablePage key={comp} league={comp} today={today} /> : comp === UCL_SLUG ? <UclPage today={today} tab={uclTab} onTab={setUclTab} /> : <CupsPage cup={comp} today={today} />}
      </section>
    </div>
  );
}
