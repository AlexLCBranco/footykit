// FK-65: a page's controls (NAV_PATTERN.md §2): What (the thing looked at) as chips (an edition: FK-74's dropdown), How
// as a small switch, then the page's own controls (dates, span, checkboxes). FK-75: where they all fit beside the tabs
// (`controlsInHeader`: Today and Clubs) they are drawn inside the header's tabs row, on one line and without the
// "What" / "How" labels; elsewhere they are rows under the header that scroll away with the page.

import type { ReactNode } from 'react';
import { addDays, dayLabel, mondayOf, monthLabel, shortDay } from '../data/model';
import { DEFAULT_TRAILING } from '../data/trailing';
import { ClubPicker } from './ClubPicker';
import { EditionPicker } from './EditionPicker';
import { useFooty } from './ctx';
import {
  CLUB_HOWS, compName, CUP_WHAT, cupHowOf, cupHowPage, cupHows, cupOf, LEAGUE_HOWS, leagueHowOf, leagueOf, leaguePage, TODAY_HOWS, TOOLS, trailingComps,
  wcEditionPage, wcYearOf, whereOf,
} from './nav';
import { LEAGUE_SLUGS, WC_SLUG, WC_YEARS, type LeagueMode, type Page, type Span } from './page';

/** A segmented switch (How, and the smaller switches beside it). */
export function Switch<T extends string | number>({ value, options, onChange, label, testId }: { value: T; options: [T, string, string?][]; onChange: (v: T) => void; label: string; testId?: string }) {
  return (
    <div className="fk-tabs" role="tablist" aria-label={label} data-testid={testId}>
      {options.map(([v, text, tip]) => (
        <button key={String(v)} type="button" role="tab" aria-selected={value === v} className={`fk-tab${value === v ? ' fk-tab-on' : ''}`} data-text={text} title={tip} data-value={v} onClick={() => value !== v && onChange(v)}>
          {text}
        </button>
      ))}
    </div>
  );
}

/** What: every option visible as a chip, the chosen one highlighted. */
function Chips<T extends string | number>({ value, options, onChange, label, testId }: { value: T; options: [T, string, string?][]; onChange: (v: T) => void; label: string; testId: string }) {
  return (
    <div className="fk-chips" role="radiogroup" aria-label={label} data-testid={testId}>
      {options.map(([v, text, tip]) => (
        <button key={String(v)} type="button" role="radio" aria-checked={value === v} className={`fk-chip-btn${value === v ? ' fk-chip-on' : ''}`} title={tip} data-value={v} data-text={text}
          onClick={() => value !== v && onChange(v)}>{text}</button>
      ))}
    </div>
  );
}

const Row = ({ label, children, wide = false }: { label: string; children: ReactNode; wide?: boolean }) => (
  <div className={`fk-prow${wide ? ' fk-prow-wide' : ''}`}><span className="fk-prow-label">{label}</span>{children}</div>
);

function DateBlock({ page, today, onPage, onStep }: { page: Page; today: string; onPage: (p: Page) => void; onStep: (dir: 1 | -1) => void }) {
  const leagueWeek = page.view === 'league' && page.lmode === 'cal' ? mondayOf(page.day) : undefined;
  const dateText = leagueWeek ? `${shortDay(leagueWeek)} – ${shortDay(addDays(leagueWeek, 6))}` : page.view === 'cal'
    ? page.span === 'month' ? monthLabel(page.month) : `${shortDay(page.week)} – ${shortDay(addDays(page.week, 7 * page.span - 1))}`
    : page.view === 'list' ? monthLabel(page.month) : dayLabel(page.day);
  const isToday = leagueWeek ? today >= leagueWeek && today <= addDays(leagueWeek, 6) : page.view === 'cal' ? (page.span === 'month' ? page.month === today.slice(0, 7) : today >= page.week && today <= addDays(page.week, 7 * page.span - 1)) : page.view === 'list' ? page.month === today.slice(0, 7) : page.day === today;
  const goToday = () => onPage({ ...page, day: today, week: mondayOf(today), month: today.slice(0, 7), listFrom: today.slice(0, 7) });
  return (
    <span className="fk-date-block">
      <button type="button" className="fk-step" aria-label="Previous" title="Previous" onClick={() => onStep(-1)}>‹</button>
      <span className="fk-date-text" data-testid="date-text">{dateText}</span>
      <button type="button" className="fk-step" aria-label="Next" title="Next" onClick={() => onStep(1)}>›</button>
      {/* calendarkit's date block order: ‹ date › · date picker · Today (PeriodNav.tsx) */}
      {(page.view === 'day' || page.view === 'slate' || page.view === 'league') && (
        <input type="date" className="fk-date-input" value={page.day} aria-label="Pick a date" title="Pick a date" onChange={(e) => e.target.value && onPage({ ...page, day: e.target.value })} />
      )}
      <button type="button" className="fk-btn fk-today" disabled={isToday} onClick={goToday} data-testid="today" title={isToday ? 'Showing today' : 'Back to today'}>Today</button>
    </span>
  );
}

export function PageRows({ page, today, onPage, onStep, extra, inHeader = false }: { page: Page; today: string; onPage: (p: Page) => void; onStep: (dir: 1 | -1) => void; /** the page's own checkboxes */ extra?: ReactNode; /** drawn inside the header's tabs row (FK-75) */ inHeader?: boolean }) {
  const { model } = useFooty();
  const where = whereOf(page);
  let what: ReactNode = null, what2: ReactNode = null, how: ReactNode = null, more: ReactNode = null;

  if (where === 'today') {
    how = <Switch label="How" testId="how" value={page.view === 'slate' ? 'slate' : 'day'} options={TODAY_HOWS} onChange={(v) => onPage({ ...page, view: v })} />;
    more = <DateBlock page={page} today={today} onPage={onPage} onStep={onStep} />;
  } else if (where === 'clubs') {
    const team = page.view === 'cal' || page.view === 'list' ? page.team : undefined;
    // FK-75: "All clubs" is always on screen beside the club box: one click goes back to every club; lit while no club is open
    what = (
      <span className="fk-club-group" data-testid="club-group">
        <button type="button" className={`fk-chip-btn fk-all-clubs${team ? '' : ' fk-chip-on'}`} aria-pressed={!team} data-text="All clubs" data-testid="all-clubs"
          title={team ? 'Go back to the page with every club' : 'You are looking at every club'} onClick={() => team && onPage({ ...page, view: 'clubs', team: undefined })}>All clubs</button>
        <ClubPicker team={team} onPick={(id) => onPage(id ? { ...page, view: page.view === 'list' ? 'list' : 'cal', team: id } : { ...page, view: 'clubs', team: undefined })} />
      </span>
    );
    if (team) {
      how = <Switch label="How" testId="team-views" value={page.view as 'cal' | 'list'} options={CLUB_HOWS} onChange={(v) => onPage({ ...page, view: v })} />;
      more = (
        <>
          {page.view === 'cal' && <Switch<Span> label="Span" testId="span" value={page.span} options={[[1, '1 week'], [2, '2 weeks'], ['month', 'Month']]} onChange={(s) => onPage({ ...page, span: s, week: page.span === 'month' && s !== 'month' ? mondayOf(today.slice(0, 7) === page.month ? today : `${page.month}-01`) : page.week, month: s === 'month' && page.span !== 'month' ? addDays(page.week, 3).slice(0, 7) : page.month })} />}
          <DateBlock page={page} today={today} onPage={onPage} onStep={onStep} />
        </>
      );
    }
  } else if (where === 'leagues') {
    const l = leagueOf(page), h = leagueHowOf(page);
    what = <Chips label="League" testId="what-league" value={l} options={LEAGUE_SLUGS.map((x) => [x, model.comp(x).name])} onChange={(x) => onPage(leaguePage(page, x, h, today))} />;
    how = <Switch label="How" testId="how" value={h} options={LEAGUE_HOWS} onChange={(x) => onPage(leaguePage(page, l, x, today))} />;
  } else if (where === 'cups') {
    const c = cupOf(page), h = cupHowOf(page);
    what = <Chips label="Competition" testId="what-cup" value={c} options={CUP_WHAT.map((x) => [x, compName(model, x)])} onChange={(x) => onPage(cupHowPage(page, x, h, today))} />;
    if (c === WC_SLUG) what2 = <EditionPicker noun="World Cup" testId="what-edition" value={wcYearOf(page)} editions={WC_EDITIONS} onChange={(y) => onPage(wcEditionPage(page, y))} />; // FK-74: a dropdown, not a strip of 23 chips
    how = <Switch label="How" testId="how" value={h} options={cupHows(c)} onChange={(x) => onPage(cupHowPage(page, c, x, today))} />;
  } else {
    what = <Chips label="Tool" testId="what-tool" value={page.view} options={TOOLS} onChange={(v) => onPage({ ...page, view: v })} />;
    what2 = <Chips label="Competition" testId="what-comp" value={page.comp ?? DEFAULT_TRAILING} options={trailingComps(model).map((x) => [x, model.comp(x).name])} onChange={(x) => onPage({ ...page, comp: x })} />;
  }
  if (page.view === 'league') {
    more = (
      <>
        <Switch<LeagueMode> label="League mode" testId="league-modes" value={page.lmode ?? 'list'} options={[['list', 'Day', 'One day'], ['cal', 'Week', 'A week of days']]} onChange={(m) => onPage({ ...page, lmode: m === 'list' ? undefined : m })} />
        <DateBlock page={page} today={today} onPage={onPage} onStep={onStep} />
      </>
    );
  }
  if (inHeader) return <div className="fk-head-controls" data-testid="page-rows">{what}{how}{more}{extra}</div>;
  return (
    <div className="fk-prows" data-testid="page-rows" data-capture-exclude="true">
      <div className="fk-prows-line">
        {what && <Row label="What">{what}</Row>}
        {how && <Row label="How">{how}</Row>}
        {more}
        {extra}
      </div>
      {what2 && <div className="fk-prows-line"><Row label={c2label(page)} wide>{what2}</Row></div>}
    </div>
  );
}

const c2label = (p: Page) => (p.view === 'trailing' ? 'Competition' : 'Edition');
const WC_EDITIONS = WC_YEARS.map((y) => ({ value: y, label: String(y) }));
