// The packed bar (calendarkit's menu that won): one row packed to the left — page history ← →, the scope (All clubs
// or one club), the scope's views, its date controls — and the icon buttons at the right end (ⓘ, Quick standings).
// Never hidden on scroll.

import type { ReactNode } from 'react';
import { addDays, dayLabel, mondayOf, monthLabel, shortDay } from '../data/model';
import { useFooty } from './ctx';
import { ClubPicker } from './ClubPicker';
import { CUP_SLUGS, DEFAULT_CUP, DEFAULT_LEAGUE, LEAGUE_SLUGS, simLeague, type Page, type Span, type View } from './page';
import type { LeagueSlug } from '../../config/season';
import { DEFAULT_TRAILING, TRAILING_COMPS } from '../data/trailing';

export interface History { back?: string; forward?: string; onBack: () => void; onForward: () => void }

function Tabs<T extends string | number>({ value, options, onChange, label, testId }: { value: T; options: [T, string][]; onChange: (v: T) => void; label: string; testId?: string }) {
  return (
    <div className="fk-tabs" role="tablist" aria-label={label} data-testid={testId}>
      {options.map(([v, text]) => (
        <button key={String(v)} type="button" role="tab" aria-selected={value === v} className={`fk-tab${value === v ? ' fk-tab-on' : ''}`} data-text={text} onClick={() => onChange(v)}>
          {text}
        </button>
      ))}
    </div>
  );
}

function LeaguePicker({ league, onPick }: { league: LeagueSlug; onPick: (l: LeagueSlug) => void }) {
  const { model } = useFooty();
  return (
    <label className="fk-scope" title="The league table shown">
      <select value={league} onChange={(e) => onPick(e.target.value as LeagueSlug)} aria-label="League" data-testid="league-picker">
        {LEAGUE_SLUGS.map((l) => <option key={l} value={l}>{model.comp(l).name}</option>)}
      </select>
    </label>
  );
}

function CupPicker({ cup, onPick }: { cup: string; onPick: (c: string) => void }) {
  const { model } = useFooty();
  return (
    <label className="fk-scope" title="The cup shown">
      <select value={cup} onChange={(e) => onPick(e.target.value)} aria-label="Cup" data-testid="cup-picker">
        {CUP_SLUGS.map((c) => <option key={c} value={c}>{model.comp(c).name}</option>)}
      </select>
    </label>
  );
}

function CompPicker({ comp, onPick }: { comp: string; onPick: (c: string) => void }) {
  const { model } = useFooty();
  return (
    <label className="fk-scope" title="The competition shown">
      <select value={comp} onChange={(e) => onPick(e.target.value)} aria-label="Competition" data-testid="comp-picker">
        {TRAILING_COMPS.filter((c) => model.snap.comps[c]).map((c) => <option key={c} value={c}>{model.comp(c).name}</option>)}
      </select>
    </label>
  );
}

export function TopBar({ page, today, history, onPage, onStep, onStandings, info, end }: {
  page: Page; today: string; history: History; onPage: (p: Page) => void; onStep: (dir: 1 | -1) => void; onStandings: () => void; info: ReactNode; end?: ReactNode;
}) {
  const team = page.view === 'cal' || page.view === 'list' ? page.team : undefined;
  const dateText = page.view === 'cal'
    ? page.span === 'month' ? monthLabel(page.month) : `${shortDay(page.week)} – ${shortDay(addDays(page.week, 7 * page.span - 1))}`
    : page.view === 'list' ? monthLabel(page.month) : dayLabel(page.day);
  const isToday = page.view === 'cal' ? (page.span === 'month' ? page.month === today.slice(0, 7) : today >= page.week && today <= addDays(page.week, 7 * page.span - 1)) : page.view === 'list' ? page.month === today.slice(0, 7) : page.day === today;
  const goToday = () => onPage({ ...page, day: today, week: mondayOf(today), month: today.slice(0, 7), listFrom: today.slice(0, 7) });
  return (
    <div className="fk-bar" data-testid="top-bar" data-capture-exclude="true">
      <span className="fk-hist" role="group" aria-label="Page history" data-testid="page-history">
        <button type="button" className="fk-hist-btn" disabled={!history.back} title={history.back ? `Back to ${history.back}` : 'Nothing to go back to'} aria-label="Back" onClick={history.onBack}>←</button>
        <button type="button" className="fk-hist-btn" disabled={!history.forward} title={history.forward ? `Forward to ${history.forward}` : 'Nothing to go forward to'} aria-label="Forward" onClick={history.onForward}>→</button>
      </span>
      {/* the club and its own views, grouped; the × leaves team mode for the main List on today (FK-16) */}
      <span className={`fk-club-group${team ? ' fk-club-group-on' : ''}`} data-testid="club-group">
        <ClubPicker team={team} onPick={(id) => onPage(id ? { ...page, view: page.view === 'list' ? 'list' : 'cal', team: id } : { ...page, view: 'day', team: undefined })} />
        {team && (
          <>
            <button type="button" className="fk-club-clear" aria-label="Leave this club" title="Leave this club: back to all clubs, today" data-testid="club-clear"
              onClick={() => onPage({ ...page, view: 'day', team: undefined, day: today })}>×</button>
            <Tabs<View> label="Club view" testId="team-views" value={page.view} options={[['cal', 'Calendar'], ['list', 'List']]} onChange={(v) => onPage({ ...page, view: v })} />
          </>
        )}
      </span>
      {/* the main views stay on the bar in team mode (none selected then); one leaves the club */}
      <Tabs<View> label="View" testId="views" value={page.view === 'whatif' ? (simLeague(page) ? 'table' : 'ucl') : page.view} options={[['day', 'List'], ['slate', 'Slate'], ['ucl', 'UCL'], ['table', 'Tables'], ['cups', 'Cups'], ['trailing', 'Trailing']]} onChange={(v) => onPage({ ...page, view: v, team: undefined })} />
      {team && page.view === 'cal' && <Tabs<Span> label="Span" testId="span" value={page.span} options={[[1, '1 week'], [2, '2 weeks'], ['month', 'Month']]} onChange={(s) => onPage({ ...page, span: s, week: page.span === 'month' && s !== 'month' ? mondayOf(today.slice(0, 7) === page.month ? today : `${page.month}-01`) : page.week, month: s === 'month' && page.span !== 'month' ? addDays(page.week, 3).slice(0, 7) : page.month })} />}
      {(page.view === 'table' || (page.view === 'whatif' && simLeague(page))) && <LeaguePicker league={page.league ?? DEFAULT_LEAGUE} onPick={(l) => onPage({ ...page, league: l })} />}
      {page.view === 'trailing' && <CompPicker comp={page.comp ?? DEFAULT_TRAILING} onPick={(c) => onPage({ ...page, comp: c })} />}
      {page.view === 'cups' && <CupPicker cup={page.cup ?? DEFAULT_CUP} onPick={(c) => onPage({ ...page, cup: c })} />}
      {page.view !== 'ucl' && page.view !== 'whatif' && page.view !== 'table' && page.view !== 'cups' && page.view !== 'trailing' && <span className="fk-date-block">
        <button type="button" className="fk-step" aria-label="Previous" title="Previous" onClick={() => onStep(-1)}>‹</button>
        <span className="fk-date-text" data-testid="date-text">{dateText}</span>
        <button type="button" className="fk-step" aria-label="Next" title="Next" onClick={() => onStep(1)}>›</button>
        {/* calendarkit's date block order: ‹ date › · date picker · Today (PeriodNav.tsx) */}
        {(page.view === 'day' || page.view === 'slate') && (
          <input type="date" className="fk-date-input" value={page.day} aria-label="Pick a date" onChange={(e) => e.target.value && onPage({ ...page, day: e.target.value })} />
        )}
        <button type="button" className="fk-btn fk-today" disabled={isToday} onClick={goToday} data-testid="today" title={isToday ? 'Showing today' : 'Back to today'}>Today</button>
      </span>}
      <span className="fk-bar-end">
        {end}
        <button type="button" className="fk-icon-btn" title="Quick standings" aria-label="Quick standings" onClick={onStandings} data-testid="standings-button">
          <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M2 2.5h12v2H2zM2 6.5h12v1.6H2zM2 10h12v1.6H2zM2 13.4h12V15H2z" /><path fill="currentColor" d="M5.2 6.5h1.2V15H5.2z" opacity=".55" /></svg>
        </button>
        {info}
      </span>
    </div>
  );
}

