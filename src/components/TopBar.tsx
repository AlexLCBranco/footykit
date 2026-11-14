// The packed bar (calendarkit's menu that won): one row packed to the left — page history ← →, the scope (All clubs
// or one club), the scope's views, its date controls — and the icon buttons at the right end (ⓘ, Quick standings).
// Never hidden on scroll.

import type { ReactNode } from 'react';
import { addDays, dayLabel, mondayOf, monthLabel, shortDay } from '../data/model';
import { useFooty } from './ctx';
import { TeamLogo } from './Bits';
import type { Page, Span, View } from './page';

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

function TeamPicker({ team, onPick }: { team?: string; onPick: (id: string | undefined) => void }) {
  const { model } = useFooty();
  const groups = new Map<string, typeof model.clubs>();
  for (const c of model.clubs) { const k = model.comp(c.league).name; groups.set(k, [...(groups.get(k) ?? []), c]); }
  return (
    <label className={`fk-scope${team ? ' fk-scope-team' : ''}`} title="Show one club, or all followed clubs">
      {team && <TeamLogo id={team} size={22} />}
      <select value={team ?? ''} onChange={(e) => onPick(e.target.value || undefined)} aria-label="Club" data-testid="scope-picker">
        <option value="">All clubs</option>
        {[...groups].map(([league, clubs]) => (
          <optgroup key={league} label={league}>
            {[...clubs].sort((a, b) => a.name.localeCompare(b.name)).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </optgroup>
        ))}
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
      <TeamPicker team={team} onPick={(id) => onPage(id ? { ...page, view: page.view === 'list' ? 'list' : 'cal', team: id } : { ...page, view: 'day' })} />
      {team ? (
        <>
          <Tabs<View> label="View" testId="views" value={page.view} options={[['cal', 'Calendar'], ['list', 'List']]} onChange={(v) => onPage({ ...page, view: v })} />
          {page.view === 'cal' && <Tabs<Span> label="Span" testId="span" value={page.span} options={[[1, '1 week'], [2, '2 weeks'], ['month', 'Month']]} onChange={(s) => onPage({ ...page, span: s, week: page.span === 'month' && s !== 'month' ? mondayOf(today.slice(0, 7) === page.month ? today : `${page.month}-01`) : page.week, month: s === 'month' && page.span !== 'month' ? addDays(page.week, 3).slice(0, 7) : page.month })} />}
        </>
      ) : (
        <Tabs<View> label="View" testId="views" value={page.view} options={[['day', 'List'], ['slate', 'Slate']]} onChange={(v) => onPage({ ...page, view: v })} />
      )}
      <span className="fk-date-block">
        <button type="button" className="fk-step" aria-label="Previous" title="Previous" onClick={() => onStep(-1)}>‹</button>
        <span className="fk-date-text" data-testid="date-text">{dateText}</span>
        <button type="button" className="fk-step" aria-label="Next" title="Next" onClick={() => onStep(1)}>›</button>
        <button type="button" className="fk-btn" disabled={isToday} onClick={goToday} data-testid="today">Today</button>
        {(page.view === 'day' || page.view === 'slate') && (
          <input type="date" className="fk-date-input" value={page.day} aria-label="Pick a date" onChange={(e) => e.target.value && onPage({ ...page, day: e.target.value })} />
        )}
      </span>
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

