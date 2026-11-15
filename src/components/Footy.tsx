// The footykit widget: the packed bar and the view of the page. Widget API (as calendarkit's): it takes the data
// (`model`), its size, optional `now` / `timeZone`, the page to show, and raises page changes; it never touches the
// URL or history (App.tsx does).

import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { dayLabel } from '../data/model';
import { localNotesStore } from '../slate/notes';
import { Ctx, type FootyCtx } from './ctx';
import { CopyButton } from './Copy';
import { DayList } from './DayList';
import { DayStrip } from './DayStrip';
import { stepPage, teamPage, type Page } from './page';
import { SeriesPopup, StandingsPopup, type SeriesOpen } from './Popups';
import { Slate } from './Slate';
import { TeamCalendar } from './TeamCalendar';
import { TeamList } from './TeamList';
import { TopBar, type History } from './TopBar';
import { useLive } from './useLive';
import type { Model } from '../data/model';
import { addMonths } from '../data/model';
import './footy.css';

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
  const notes = useMemo(() => localNotesStore(), []);

  const ctx: FootyCtx = useMemo(() => ({
    model, now, timeZone, live,
    onTeam: (id, day) => onPage(teamPage(page, id, day, 'cal')),
    onSeries: (a, b, el) => { const r = el.getBoundingClientRect(); setSeries({ a, b, x: r.left, y: r.bottom }); },
    onStandings: (team) => setStandings({ team }),
  }), [model, now, timeZone, live, page, onPage]);

  const closeSeries = useCallback(() => setSeries(null), []);
  let view: ReactNode;
  if (page.view === 'cal' && page.team) view = <TeamCalendar team={page.team} span={page.span} week={page.week} month={page.month} today={today} />;
  else if (page.view === 'list' && page.team) view = <TeamList team={page.team} from={page.listFrom} to={page.month} onEarlier={() => onPage({ ...page, listFrom: addMonths(page.listFrom, -1) })} />;
  else if (page.view === 'slate') view = <Slate day={page.day} notes={notes} showNotes={showNotes} />;
  else view = <DayList key={page.day} day={page.day} width={width} />;

  return (
    <Ctx.Provider value={ctx}>
      <div className="fk-root" style={{ width }} data-testid="footy">
        <TopBar page={page} today={today} history={history} onPage={onPage} onStep={(d) => onPage(stepPage(page, d, model))}
          onStandings={() => setStandings(standings ? null : { team: page.team })}
          info={<Info model={model} timeZone={timeZone} />}
          end={<>
            {page.view === 'slate' && (
              <label className="fk-check" title="Note boxes under each card (PRE / LIVE / POST)"><input type="checkbox" checked={!showNotes} onChange={(e) => setShowNotes(!e.target.checked)} data-testid="hide-notes" /> Hide notes</label>
            )}
            <CopyButton target={() => document.querySelector<HTMLElement>('[data-testid="footy"] .fk-capture .fk-slate') ?? document.querySelector<HTMLElement>('[data-testid="footy"] .fk-capture')} label={`Copy ${dayView ? dayLabel(page.day) : 'this view'} as an image`} />
          </>} />
        {dayView && <DayStrip day={page.day} today={today} onDay={(d) => onPage({ ...page, day: d })} />}
        <div className="fk-capture" key={page.view}>{view}</div>
        {series && <SeriesPopup open={series} onClose={closeSeries} />}
        {standings && <StandingsPopup team={standings.team} onClose={() => setStandings(null)} />}
      </div>
    </Ctx.Provider>
  );
}
