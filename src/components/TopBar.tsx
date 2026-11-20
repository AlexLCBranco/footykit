// The packed bar (calendarkit's menu that won): one row packed to the left — page history ← →, the scope (All clubs
// or one club), the scope's views, its date controls — and the icon buttons at the right end (ⓘ, Quick standings).
// Never hidden on scroll.

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { addDays, dayLabel, mondayOf, monthLabel, shortDay } from '../data/model';
import { useFooty } from './ctx';
import { ClubPicker } from './ClubPicker';
import { WC_SLUG, CUP_SLUGS, DEFAULT_CUP, DEFAULT_LEAGUE, LEAGUE_SLUGS, LEAGUE_VIEW_COMPS, cupPage, simLeague, UCL_SLUG, type LeagueMode, type Page, type Span, type View } from './page';
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

/** The cup picker: on the bar, and (FK-55) as a cup page's title (`title`: the heading's size, its own test id). */
export function CupPicker({ cup, onPick, title = false }: { cup: string; onPick: (c: string) => void; title?: boolean }) {
  const { model } = useFooty();
  return (
    <label className={`fk-scope${title ? ' fk-scope-title' : ''}`} title={title ? 'Switch competition' : 'The cup shown'}>
      <select value={cup} onChange={(e) => onPick(e.target.value)} aria-label={title ? 'Competition' : 'Cup'} data-testid={title ? 'cup-title-picker' : 'cup-picker'}>
        {[UCL_SLUG, ...CUP_SLUGS].map((c) => <option key={c} value={c}>{model.comp(c).name}</option>)}
        <option value={WC_SLUG}>World Cup</option>
      </select>
    </label>
  );
}

/** FK-45: the League view's competition: the six leagues, the Champions League, the cups. */
function LeagueViewPicker({ comp, onPick }: { comp: string; onPick: (c: string) => void }) {
  const { model } = useFooty();
  return (
    <label className="fk-scope" title="The competition shown">
      <select value={comp} onChange={(e) => onPick(e.target.value)} aria-label="Competition" data-testid="league-view-picker">
        <optgroup label="Leagues">{LEAGUE_SLUGS.map((c) => <option key={c} value={c}>{model.comp(c).name}</option>)}</optgroup>
        <optgroup label="Cups">{LEAGUE_VIEW_COMPS.filter((c) => !LEAGUE_SLUGS.includes(c as LeagueSlug)).map((c) => <option key={c} value={c}>{model.comp(c).name}</option>)}</optgroup>
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

/**
 * FK-58: the "Extra tools" icon button beside the other icon buttons: a small menu of the minor tools (Trailing first;
 * future small tools go here, not in the main tabs). It looks pressed while one of its tools is the page shown.
 */
function ExtraTools({ page, onPage }: { page: Page; onPage: (p: Page) => void }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => { if (!(e instanceof KeyboardEvent ? e.key === 'Escape' : !box.current?.contains(e.target as Node))) return; setOpen(false); };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', close);
    return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', close); };
  }, [open]);
  const tools: [View, string, string][] = [['trailing', 'Trailing', 'Goals scored while trailing, per competition']];
  const on = tools.some(([v]) => v === page.view);
  return (
    <span className="fk-extra" ref={box}>
      <button type="button" className={`fk-icon-btn${on ? ' fk-icon-btn-on' : ''}`} title="Extra tools" aria-label="Extra tools" aria-haspopup="menu" aria-expanded={open} aria-pressed={on} onClick={() => setOpen((o) => !o)} data-testid="extra-tools">
        <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M2 2h5v5H2zM9 2h5v5H9zM2 9h5v5H2z" /><path fill="currentColor" d="M10.8 9h1.4v2.3h2.3v1.4h-2.3V15h-1.4v-2.3H8.5v-1.4h2.3z" /></svg>
      </button>
      {open && (
        <span className="fk-extra-menu" role="menu" data-testid="extra-tools-menu">
          {tools.map(([v, text, tip]) => (
            <button key={v} type="button" role="menuitem" className={`fk-extra-item${page.view === v ? ' fk-extra-item-on' : ''}`} title={tip}
              onClick={() => { setOpen(false); onPage({ ...page, view: v, team: undefined }); }} data-testid={`extra-${v}`}>{text}</button>
          ))}
        </span>
      )}
    </span>
  );
}

export function TopBar({ page, today, history, onPage, onStep, onStandings, info, end }: {
  page: Page; today: string; history: History; onPage: (p: Page) => void; onStep: (dir: 1 | -1) => void; onStandings: () => void; info: ReactNode; end?: ReactNode;
}) {
  const team = page.view === 'cal' || page.view === 'list' ? page.team : undefined;
  const leagueWeek = page.view === 'league' && page.lmode === 'cal' ? mondayOf(page.day) : undefined;
  const dateText = leagueWeek ? `${shortDay(leagueWeek)} – ${shortDay(addDays(leagueWeek, 6))}` : page.view === 'cal'
    ? page.span === 'month' ? monthLabel(page.month) : `${shortDay(page.week)} – ${shortDay(addDays(page.week, 7 * page.span - 1))}`
    : page.view === 'list' ? monthLabel(page.month) : dayLabel(page.day);
  const isToday = leagueWeek ? today >= leagueWeek && today <= addDays(leagueWeek, 6) : page.view === 'cal' ? (page.span === 'month' ? page.month === today.slice(0, 7) : today >= page.week && today <= addDays(page.week, 7 * page.span - 1)) : page.view === 'list' ? page.month === today.slice(0, 7) : page.day === today;
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
      <Tabs<View> label="View" testId="views" value={page.view === 'whatif' ? (simLeague(page) ? 'table' : 'cups') : page.view === 'ucl' || page.view === 'wc' ? 'cups' : page.view === 'history' ? ((LEAGUE_SLUGS as string[]).includes(page.hcomp ?? '') ? 'table' : 'cups') : page.view} options={[['day', 'List'], ['slate', 'Slate'], ['table', 'Tables'], ['cups', 'Cups'], ['league', 'League']]} onChange={(v) => onPage({ ...page, view: v, team: undefined, ...(v === 'league' && page.view !== 'league' ? { day: today } : {}) })} />
      {team && page.view === 'cal' && <Tabs<Span> label="Span" testId="span" value={page.span} options={[[1, '1 week'], [2, '2 weeks'], ['month', 'Month']]} onChange={(s) => onPage({ ...page, span: s, week: page.span === 'month' && s !== 'month' ? mondayOf(today.slice(0, 7) === page.month ? today : `${page.month}-01`) : page.week, month: s === 'month' && page.span !== 'month' ? addDays(page.week, 3).slice(0, 7) : page.month })} />}
      {(page.view === 'table' || (page.view === 'whatif' && simLeague(page))) && <LeaguePicker league={page.league ?? DEFAULT_LEAGUE} onPick={(l) => onPage({ ...page, league: l })} />}
      {page.view === 'league' && (
        <>
          <LeagueViewPicker comp={page.lcomp ?? DEFAULT_LEAGUE} onPick={(c) => onPage({ ...page, lcomp: c })} />
          <Tabs<LeagueMode> label="League mode" testId="league-modes" value={page.lmode ?? 'list'} options={[['list', 'List'], ['cal', 'Calendar']]} onChange={(m) => onPage({ ...page, lmode: m === 'list' ? undefined : m })} />
        </>
      )}
      {page.view === 'trailing' && <CompPicker comp={page.comp ?? DEFAULT_TRAILING} onPick={(c) => onPage({ ...page, comp: c })} />}
      {/* FK-29: the UCL page (and its simulator) sits in the Cups section: the picker shows it and leads back to the other cups */}
      {(page.view === 'cups' || page.view === 'ucl' || page.view === 'wc' || (page.view === 'whatif' && !simLeague(page))) && <CupPicker cup={page.view === 'cups' ? page.cup ?? DEFAULT_CUP : page.view === 'wc' ? WC_SLUG : UCL_SLUG}
        onPick={(c) => onPage(cupPage(page, c))} />}
      {page.view !== 'ucl' && page.view !== 'whatif' && page.view !== 'table' && page.view !== 'cups' && page.view !== 'trailing' && page.view !== 'wc' && page.view !== 'history' && <span className="fk-date-block">
        <button type="button" className="fk-step" aria-label="Previous" title="Previous" onClick={() => onStep(-1)}>‹</button>
        <span className="fk-date-text" data-testid="date-text">{dateText}</span>
        <button type="button" className="fk-step" aria-label="Next" title="Next" onClick={() => onStep(1)}>›</button>
        {/* calendarkit's date block order: ‹ date › · date picker · Today (PeriodNav.tsx) */}
        {(page.view === 'day' || page.view === 'slate' || page.view === 'league') && (
          <input type="date" className="fk-date-input" value={page.day} aria-label="Pick a date" onChange={(e) => e.target.value && onPage({ ...page, day: e.target.value })} />
        )}
        <button type="button" className="fk-btn fk-today" disabled={isToday} onClick={goToday} data-testid="today" title={isToday ? 'Showing today' : 'Back to today'}>Today</button>
      </span>}
      <span className="fk-bar-end">
        <ExtraTools page={page} onPage={onPage} />
        {end}
        <button type="button" className="fk-icon-btn" title="Quick standings" aria-label="Quick standings" onClick={onStandings} data-testid="standings-button">
          <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M2 2.5h12v2H2zM2 6.5h12v1.6H2zM2 10h12v1.6H2zM2 13.4h12V15H2z" /><path fill="currentColor" d="M5.2 6.5h1.2V15H5.2z" opacity=".55" /></svg>
        </button>
        {info}
      </span>
    </div>
  );
}

