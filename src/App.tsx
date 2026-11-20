// App shell: loads the snapshot, keeps the page in the address and in real browser history entries (← → in the bar and
// the browser's own buttons), sets the tab title, moves "today" along at midnight. A fresh visit (new tab, typed
// address, bookmark) opens on today with the address's view and team; a reload keeps the page it showed (day, view,
// scroll) from the tab's history entry (history.state, which a reload keeps and a new visit doesn't have).

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { SNAPSHOT_URL } from './address';
import { BUILD_INFO } from './build-info';
import { Footy } from './components/Footy';
import { isPage, pageFromSearch, pagePart, pageSearch, pageTitle, type Page } from './components/page';
import { buildModel, dayKey, type Model } from './data/model';
import type { Snapshot } from './data/snapshot';
import { SiteVersion } from './SiteVersion';

/** One history entry: the page, its place in this tab's trail, the trail's labels (for the ← → tooltips) and scroll. */
interface Entry { fk: 1; page: Page; idx: number; trail: string[]; scroll?: number }
const isEntry = (x: unknown): x is Entry => !!x && typeof x === 'object' && (x as Entry).fk === 1 && isPage((x as Entry).page) && Number.isInteger((x as Entry).idx) && Array.isArray((x as Entry).trail);

/** Tests fix "now" with window.__FK_NOW__ (an ISO instant); the address's date is never read. */
const nowMs = () => {
  const t = (window as { __FK_NOW__?: string }).__FK_NOW__;
  return t ? Date.parse(t) : Date.now();
};

function useSnapshot() {
  const [state, setState] = useState<{ snap?: Snapshot; error?: string }>({});
  const load = useCallback(() => {
    setState({});
    fetch(SNAPSHOT_URL)
      .then((r) => (r.ok ? (r.json() as Promise<Snapshot>) : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((snap) => setState({ snap }), (e: unknown) => setState({ error: String(e) }));
  }, []);
  useEffect(load, [load]);
  return { ...state, retry: load };
}

/** "Today" in the viewer's zone, moved along at local midnight and when the tab wakes. */
function useToday(timeZone?: string): [string, number] {
  const [now, setNow] = useState(nowMs);
  useEffect(() => {
    const today = dayKey(now, timeZone);
    let next = now + 60_000;
    while (dayKey(next, timeZone) === today) next += 60 * 60_000;
    const id = setTimeout(() => setNow(nowMs()), Math.min(next - now + 1000, 2 ** 31 - 1));
    const wake = () => { if (!document.hidden && dayKey(nowMs(), timeZone) !== today) setNow(nowMs()); };
    document.addEventListener('visibilitychange', wake);
    return () => { clearTimeout(id); document.removeEventListener('visibilitychange', wake); };
  }, [now, timeZone]);
  return [dayKey(now, timeZone), now];
}

function useWidth() {
  const [w, setW] = useState(() => Math.min(document.documentElement.clientWidth, 1872) - 32);
  useEffect(() => {
    const f = () => setW(Math.min(document.documentElement.clientWidth, 1872) - 32);
    window.addEventListener('resize', f);
    return () => window.removeEventListener('resize', f);
  }, []);
  return w;
}

function Loaded({ model }: { model: Model }) {
  const timeZone = model.timeZone;
  const [today, now] = useToday(timeZone);
  const width = useWidth();
  const [entry, setEntry] = useState<Entry>(() => {
    const e: unknown = window.history.state;
    if (isEntry(e)) return e;
    const page = pageFromSearch(location.search, today, model);
    return { fk: 1, page, idx: 0, trail: [pagePart(page, model)] };
  });
  const scrollTo = useRef<number | undefined>(entry.scroll);

  // the entry on screen is always the tab's current history entry
  useLayoutEffect(() => {
    if (!isEntry(window.history.state)) window.history.replaceState(entry, '', pageSearch(entry.page));
    document.title = pageTitle(entry.page, model);
  }, [entry, model]);

  // a reload puts the scroll back once the view is drawn
  useEffect(() => {
    if (scrollTo.current !== undefined) { window.scrollTo(0, scrollTo.current); scrollTo.current = undefined; }
  }, []);

  // the browser's back / forward; attached before the first paint, so a back pressed right after a reload is never missed
  useLayoutEffect(() => {
    const pop = (e: PopStateEvent) => { if (isEntry(e.state)) { setEntry(e.state); scrollTo.current = e.state.scroll; } };
    window.addEventListener('popstate', pop);
    return () => window.removeEventListener('popstate', pop);
  }, []);

  // the scroll position is written into the entry a moment after scrolling stops
  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | undefined;
    const onScroll = () => {
      clearTimeout(t);
      t = setTimeout(() => {
        const e: unknown = window.history.state;
        if (isEntry(e)) window.history.replaceState({ ...e, scroll: window.scrollY }, '');
      }, 250);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { clearTimeout(t); window.removeEventListener('scroll', onScroll); };
  }, []);

  // history writes happen here, not in a state updater (React may call an updater twice)
  const current = useRef(entry);
  current.current = entry;
  const onPage = useCallback((page: Page) => {
    const cur = current.current;
    if (JSON.stringify(cur.page) === JSON.stringify(page)) return;
    const idx = cur.idx + 1;
    const trail = [...cur.trail.slice(0, idx), pagePart(page, model)];
    const next: Entry = { fk: 1, page, idx, trail };
    // the entry we leave learns the new page too (its → tooltip)
    window.history.replaceState({ ...cur, trail, scroll: window.scrollY }, '');
    window.history.pushState(next, '', pageSearch(page));
    current.current = next;
    setEntry(next);
    window.scrollTo(0, 0);
  }, [model]);

  const history = {
    back: entry.idx > 0 ? entry.trail[entry.idx - 1] ?? 'the previous page' : undefined,
    forward: entry.trail[entry.idx + 1],
    onBack: () => window.history.back(),
    onForward: () => window.history.forward(),
  };
  return <Footy model={model} page={entry.page} today={today} now={now} timeZone={timeZone} width={width} history={history} onPage={onPage} />;
}

export function App() {
  const { snap, error, retry } = useSnapshot();
  const model = useMemo(() => (snap ? buildModel(snap) : undefined), [snap]);
  return (
    <div className="app">
      {model ? <Loaded model={model} /> : error ? (
        <div className="app-status"><p>Couldn't load the schedule ({error}).</p><button type="button" className="app-retry" onClick={retry}>Try again</button></div>
      ) : (
        <div className="app-status">Loading…</div>
      )}
      <SiteVersion {...BUILD_INFO} />
    </div>
  );
}
