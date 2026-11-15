// The footykit widget: the packed bar and the view of the page. Widget API (as calendarkit's): it takes the data
// (`model`), its size, optional `now` / `timeZone`, the page to show, and raises page changes; it never touches the
// URL or history (App.tsx does).

import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { dayLabel } from '../data/model';
import { DEFAULT_TRAILING } from '../data/trailing';
import { localNotesStore } from '../slate/notes';
import { Ctx, type FootyCtx } from './ctx';
import { CopyButton } from './Copy';
import { DayList } from './DayList';
import { DayStrip } from './DayStrip';
import { DEFAULT_CUP, DEFAULT_LEAGUE, leagueWhatIfPage, simLeague, stepPage, teamPage, uclWhatIfPage, type Page } from './page';
import { SeriesPopup, StandingsPopup, type SeriesOpen } from './Popups';
import { Slate } from './Slate';
import { createSelectionStore, useMarqueeSelection } from './selection';
import { SelectionBar, SelectionStyle } from './SelectionBar';
import { TeamCalendar } from './TeamCalendar';
import { TeamList } from './TeamList';
import { saveTagVariant, savedTagVariant, TAG_VARIANTS, type TagVariant } from './Tags';
import { TopBar, type History } from './TopBar';
import { useLive } from './useLive';
import type { Model } from '../data/model';
import { addMonths } from '../data/model';
import './footy.css';

// the Champions League page is its own chunk: the day views never download it
const UclPage = lazy(() => import('./UclPage'));
const WhatIfPage = lazy(() => import('./WhatIfPage'));
const LeagueTablePage = lazy(() => import('./LeagueTablePage'));
const LeagueWhatIfPage = lazy(() => import('./LeagueWhatIfPage'));
const CupsPage = lazy(() => import('./CupsPage'));
const TrailingPage = lazy(() => import('./TrailingPage'));

export interface FootyProps {
  model: Model;
  page: Page;
  today: string;
  now: number;
  timeZone?: string;
  width: number;
  history: History;
  onPage: (p: Page) => void;
  /** off in tests that must not fetch the day layer */
  live?: boolean;
}

function Info({ model, timeZone }: { model: Model; timeZone?: string }) {
  const [open, setOpen] = useState(false);
  const when = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone }).format(Date.parse(model.snap.generatedAt));
  const zone = timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  return (
    <span className="fk-pop-wrap">
      <button type="button" className="fk-icon-btn" aria-label="About this page" aria-expanded={open} title={`Times in ${zone}\nData updated ${when}`} onClick={() => setOpen(!open)} data-testid="bar-info">
        <span className="fk-info">i</span>
      </button>
      {open && (
        <div className="fk-pop fk-info-pop" role="dialog">
          <span>Times in your zone ({zone}).</span>
          <span data-testid="data-updated">Schedule data updated {when}; scores and odds of the day on screen refresh every minute while a match is live.</span>
          <span className="fk-pop-head">Key</span>
          <span><span className="fk-form-sq fk-form-W" /> <span className="fk-form-sq fk-form-D" /> <span className="fk-form-sq fk-form-L" /> last 5 results, all competitions (after a played match, going into one to come). Click: standings.</span>
          <span><span className="fk-neutral-tag">N</span> neutral venue ("v" instead of "@").</span>
          <span><span className="fk-chip">2/3</span> meeting k of n this season — click for the season series.</span>
          <span><span className="fk-chip fk-fifa-chip">FIFA</span> inside a FIFA window (Brasileirão matches flagged).</span>
          <span>Odds: DraftKings via ESPN, decimal, Slate only.</span>
          <span className="fk-pop-head">Tags (hover them for details)</span>
          <span><span className="fk-tag fk-tag-cup">◂UCL</span> <span className="fk-tag fk-tag-free">free▸</span> previous / next window (midweek Tue–Thu, weekend Fri–Mon): free, league or cup / continental; a second leg shows the first-leg score.</span>
          <span><span className="fk-tag fk-tag-streak">5th</span> straight window with a match · <span className="fk-tag fk-tag-rest">REST</span> had the previous window free while the opponent played · <span className="fk-tag fk-tag-alive">3C</span> competitions still alive · <span className="fk-tag fk-tag-z4">Z4R</span> relegation race · <span className="fk-chip fk-derby">DERBY</span> rivalry.</span>
        </div>
      )}
    </span>
  );
}

export function Footy({ model, page, today, now, timeZone, width, history, onPage, live: liveOn = true }: FootyProps) {
  const dayView = page.view === 'day' || page.view === 'slate';
  const live = useLive(page.day, timeZone, liveOn && dayView);
  const [series, setSeries] = useState<SeriesOpen | null>(null);
  const [standings, setStandings] = useState<{ team?: string } | null>(null);
  const [showNotes, setShowNotes] = useState(false);
  const [tags, setTags] = useState<TagVariant>(savedTagVariant);
  const notes = useMemo(() => localNotesStore(), []);
  // Marquee selection (mouse): only to copy several matches as one image. A new view or day starts with none.
  const [selection] = useState(createSelectionStore);
  const marquee = useRef<HTMLDivElement>(null);
  const onMarquee = useMarqueeSelection(selection, marquee);
  const viewKey = `${page.view}|${page.league}|${page.cup}|${page.comp}|${page.day}|${page.team}|${page.span}|${page.week}|${page.month}`;
  useEffect(() => selection.clear(), [viewKey, selection]);
  // What a copy takes: the Slate's cards, the day's list (not the map column beside it: the map is never in a copy, and
  // its space shouldn't be either), else the whole view.
  const captureTarget = () => {
    const root = document.querySelector<HTMLElement>('[data-testid="footy"] .fk-capture');
    return root?.querySelector<HTMLElement>('.fk-slate, .fk-daylist') ?? root;
  };

  const ctx: FootyCtx = useMemo(() => ({
    model, now, timeZone, live, tags,
    onTeam: (id, day) => onPage(teamPage(page, id, day, 'cal')),
    onSeries: (a, b, el) => { const r = el.getBoundingClientRect(); setSeries({ a, b, x: r.left, y: r.bottom }); },
    onStandings: (team) => setStandings({ team }),
  }), [model, now, timeZone, live, tags, page, onPage]);

  const closeSeries = useCallback(() => setSeries(null), []);
  let view: ReactNode;
  if (page.view === 'cal' && page.team) view = <TeamCalendar team={page.team} span={page.span} week={page.week} month={page.month} today={today} />;
  else if (page.view === 'list' && page.team) view = <TeamList team={page.team} from={page.listFrom} to={page.month} onEarlier={() => onPage({ ...page, listFrom: addMonths(page.listFrom, -1) })} />;
  else if (page.view === 'ucl') view = <Suspense fallback={<div className="fk-muted" style={{ padding: 14 }}>Loading…</div>}><UclPage today={today} onWhatIf={() => onPage(uclWhatIfPage(page))} /></Suspense>;
  else if (page.view === 'whatif' && simLeague(page)) view = <Suspense fallback={<div className="fk-muted" style={{ padding: 14 }}>Loading…</div>}><LeagueWhatIfPage key={simLeague(page)} league={simLeague(page)!} today={today} onBack={() => onPage({ ...page, view: 'table' })} /></Suspense>;
  else if (page.view === 'whatif') view = <Suspense fallback={<div className="fk-muted" style={{ padding: 14 }}>Loading…</div>}><WhatIfPage today={today} onBack={() => onPage({ ...page, view: 'ucl' })} /></Suspense>;
  else if (page.view === 'table') view = <Suspense fallback={<div className="fk-muted" style={{ padding: 14 }}>Loading…</div>}><LeagueTablePage league={page.league ?? DEFAULT_LEAGUE} today={today} onWhatIf={() => onPage(leagueWhatIfPage(page))} /></Suspense>;
  else if (page.view === 'cups') view = <Suspense fallback={<div className="fk-muted" style={{ padding: 14 }}>Loading…</div>}><CupsPage cup={page.cup ?? DEFAULT_CUP} today={today} /></Suspense>;
  else if (page.view === 'trailing') view = <Suspense fallback={<div className="fk-muted" style={{ padding: 14 }}>Loading…</div>}><TrailingPage comp={page.comp ?? DEFAULT_TRAILING} today={today} /></Suspense>;
  else if (page.view === 'slate') view = <Slate day={page.day} notes={notes} showNotes={showNotes} />;
  else view = <DayList key={page.day} day={page.day} width={width} />;

  return (
    <Ctx.Provider value={ctx}>
      <div className="fk-root" style={{ width }} data-testid="footy">
        <TopBar page={page} today={today} history={history} onPage={onPage} onStep={(d) => onPage(stepPage(page, d, model))}
          onStandings={() => setStandings(standings ? null : { team: page.team })}
          info={<Info model={model} timeZone={timeZone} />}
          end={<>
            <label className="fk-check fk-tag-pick" title="Context tags next to each team (Phase 3 variants, to compare): hover a team's tags for the details">
              Tags
              <select value={tags} onChange={(e) => { const v = e.target.value as TagVariant; setTags(v); saveTagVariant(v); }} data-testid="tag-variant" aria-label="Tag display">
                {TAG_VARIANTS.map(([v, text]) => <option key={v} value={v}>{text}</option>)}
              </select>
            </label>
            {page.view === 'slate' && (
              <label className="fk-check" title="Note boxes under each card (PRE / LIVE / POST)"><input type="checkbox" checked={!showNotes} onChange={(e) => setShowNotes(!e.target.checked)} data-testid="hide-notes" /> Hide notes</label>
            )}
            <CopyButton target={captureTarget} label={`Copy ${dayView ? dayLabel(page.day) : 'this view'} as an image`} />
          </>} />
        {dayView && <DayStrip day={page.day} today={today} onDay={(d) => onPage({ ...page, day: d })} />}
        <div className="fk-capture fk-select-area" key={page.view} onPointerDown={onMarquee}>{view}</div>
        <div ref={marquee} className="fk-marquee" aria-hidden="true" data-testid="marquee" />
        <SelectionStyle store={selection} />
        <SelectionBar store={selection} target={captureTarget} />
        {series && <SeriesPopup open={series} onClose={closeSeries} />}
        {standings && <StandingsPopup team={standings.team} onClose={() => setStandings(null)} />}
      </div>
    </Ctx.Provider>
  );
}
