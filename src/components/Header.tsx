// FK-65: the pinned header (backlogkit's NAV_PATTERN.md §1), the same on every page: back / forward and the breadcrumb
// (each part opens its siblings), "Go anywhere" (Ctrl+K) and the icon buttons on the right, and under them the five
// Where tabs. It never changes height and never hides on scroll; the page rows under it scroll away.

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { WcIndexEntry } from '../data/worldcup';
import { useFooty } from './ctx';
import { crumbs, searchEntries, searchFind, WHERE, whereOf, whereTarget, type Crumb, type WcTeamEdition, type Where } from './nav';
import type { Page } from './page';
import './nav.css';

export interface History { back?: string; forward?: string; onBack: () => void; onForward: () => void }

const ICONS: Record<Where, ReactNode> = {
  today: <><rect x="2" y="3.5" width="12" height="10.5" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.5" /><path d="M2 6.5h12M5 2v3M11 2v3" stroke="currentColor" strokeWidth="1.5" /><rect x="5" y="8.5" width="3" height="3" fill="currentColor" /></>,
  clubs: <path d="M8 1.8l5.2 2v4c0 3.2-2.3 5.4-5.2 6.4C5.1 13.2 2.8 11 2.8 7.8v-4z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />,
  leagues: <><path d="M2 3h12M2 6.3h12M2 9.6h12M2 12.9h12" stroke="currentColor" strokeWidth="1.4" /><path d="M5 2v12" stroke="currentColor" strokeWidth="1.4" opacity=".6" /></>,
  cups: <><path d="M4.5 2h7v3.5a3.5 3.5 0 01-7 0z" fill="none" stroke="currentColor" strokeWidth="1.5" /><path d="M4.5 3.5H2.3c0 2 1 3 2.4 3M11.5 3.5h2.2c0 2-1 3-2.4 3M8 9v3M5.3 14h5.4" fill="none" stroke="currentColor" strokeWidth="1.5" /></>,
  tools: <><path d="M2 2h5v5H2zM9 2h5v5H9zM2 9h5v5H2z" fill="currentColor" /><path d="M10.8 9h1.4v2.3h2.3v1.4h-2.3V15h-1.4v-2.3H8.5v-1.4h2.3z" fill="currentColor" /></>,
};

/** Closes a popover on Escape or a click outside `box`. */
export function useDismiss(open: boolean, box: React.RefObject<HTMLElement | null>, close: () => void) {
  useEffect(() => {
    if (!open) return;
    const f = (e: Event) => { if (e instanceof KeyboardEvent ? e.key === 'Escape' : !box.current?.contains(e.target as Node)) close(); };
    document.addEventListener('pointerdown', f);
    document.addEventListener('keydown', f);
    return () => { document.removeEventListener('pointerdown', f); document.removeEventListener('keydown', f); };
  }, [open, box, close]);
}

function CrumbPart({ c, last, onPage }: { c: Crumb; last: boolean; onPage: (p: Page) => void }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLSpanElement>(null);
  useDismiss(open, box, () => setOpen(false));
  return (
    <span className="fk-crumb" ref={box} data-testid="crumb">
      <span className="fk-crumb-sep" aria-hidden="true">›</span>
      <button type="button" className={`fk-crumb-btn${last ? ' fk-crumb-last' : ''}`} aria-haspopup={c.items.length ? 'menu' : undefined} aria-expanded={c.items.length ? open : undefined}
        title={c.items.length ? `${c.label}: jump to another` : c.label} disabled={!c.items.length} onClick={() => setOpen((o) => !o)} data-testid="crumb-btn">{c.label}</button>
      {open && (
        <span className="fk-crumb-menu" role="menu" data-testid="crumb-menu">
          {c.items.map((it) => (
            <button key={it.label} type="button" role="menuitem" className={`fk-crumb-item${it.on ? ' fk-crumb-item-on' : ''}`} aria-current={it.on || undefined}
              ref={it.on ? (el) => el?.scrollIntoView({ block: 'nearest' }) : undefined}
              onClick={() => { setOpen(false); if (!it.on) onPage(it.page); }}>{it.label}</button>
          ))}
        </span>
      )}
    </span>
  );
}

/** "Go anywhere": Ctrl+K (⌘K) or the button; type and Enter (or click) to jump. */
function GoAnywhere({ page, today, onPage }: { page: Page; today: string; onPage: (p: Page) => void }) {
  const { model } = useFooty();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const [wc, setWc] = useState<WcTeamEdition[]>();
  useEffect(() => {
    const key = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setOpen(true); } };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, []);
  // the World Cup's teams per edition come with its index, fetched the first time the search opens
  useEffect(() => {
    if (!open || wc) return;
    let live = true;
    import('../data/worldcup').then((m) => m.loadIndex()).then((idx: WcIndexEntry[]) => {
      if (live) setWc(idx.flatMap((e) => Object.entries(e.reached).map(([code, [name, reached]]) => ({ code, name, year: e.year, reached }))));
    }, () => undefined);
    return () => { live = false; };
  }, [open, wc]);
  const entries = useMemo(() => (open ? searchEntries(page, model, today, wc) : []), [open, page, model, today, wc]);
  const found = useMemo(() => searchFind(entries, q), [entries, q]);
  const close = () => { setOpen(false); setQ(''); setActive(0); };
  const go = (i: number) => { const e = found[i]; if (!e) return; close(); onPage(e.page); };
  return (
    <>
      <button type="button" className="fk-go-btn" onClick={() => setOpen(true)} aria-label="Go anywhere (Ctrl+K)" title="Go anywhere: a club, a competition, a World Cup (Ctrl+K)" data-testid="go-anywhere">
        <svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true"><circle cx="6.8" cy="6.8" r="4.6" fill="none" stroke="currentColor" strokeWidth="1.8" /><path d="M10.3 10.3l3.9 3.9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
        <span className="fk-go-text">Go anywhere</span>
        <kbd className="fk-go-kbd">Ctrl K</kbd>
      </button>
      {open && (
        <div className="fk-go-shade" onPointerDown={(e) => { if (e.target === e.currentTarget) close(); }} data-capture-exclude="true">
          <div className="fk-go" role="dialog" aria-label="Go anywhere" data-testid="go-dialog">
            <input autoFocus className="fk-go-input" placeholder='Type a club, a competition, "brazil 2002"…' value={q} spellCheck={false} autoComplete="off"
              role="combobox" aria-expanded="true" aria-controls="fk-go-list" aria-label="Where to go" data-testid="go-input"
              onChange={(e) => { setQ(e.target.value); setActive(0); }}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, found.length - 1)); }
                else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
                else if (e.key === 'Enter') { e.preventDefault(); go(active); }
                else if (e.key === 'Escape') { e.preventDefault(); close(); }
              }} />
            <div className="fk-go-list" id="fk-go-list" role="listbox" data-testid="go-list">
              {found.map((e, i) => (
                <div key={`${e.kind}|${e.label}`} role="option" aria-selected={i === active} className={`fk-go-item${i === active ? ' fk-go-on' : ''}`}
                  onMouseEnter={() => setActive(i)} onClick={() => go(i)} data-testid="go-item">
                  <span>{e.label}</span><span className="fk-muted">{e.kind}</span>
                </div>
              ))}
              {!found.length && <div className="fk-go-none fk-muted">Nothing matches "{q}"</div>}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function Header({ page, today, history, onPage, end }: { page: Page; today: string; history: History; onPage: (p: Page) => void; end: ReactNode }) {
  const { model } = useFooty();
  const where = whereOf(page);
  const parts = crumbs(page, model, today);
  return (
    <header className="fk-header" data-testid="top-bar" data-capture-exclude="true">
      <div className="fk-head-row">
        <span className="fk-hist" role="group" aria-label="Page history" data-testid="page-history">
          <button type="button" className="fk-hist-btn" disabled={!history.back} title={history.back ? `Back to ${history.back}` : 'Nothing to go back to'} aria-label="Back" onClick={history.onBack}>←</button>
          <button type="button" className="fk-hist-btn" disabled={!history.forward} title={history.forward ? `Forward to ${history.forward}` : 'Nothing to go forward to'} aria-label="Forward" onClick={history.onForward}>→</button>
        </span>
        <nav className="fk-crumbs" aria-label="You are here" data-testid="breadcrumb">
          {parts.map((c, i) => <CrumbPart key={`${i}|${c.label}`} c={c} last={i === parts.length - 1} onPage={onPage} />)}
        </nav>
        <span className="fk-head-end">
          <GoAnywhere page={page} today={today} onPage={onPage} />
          {end}
        </span>
      </div>
      <nav className="fk-where" aria-label="Places" data-testid="where-tabs">
        {WHERE.map(([w, label, tip]) => (
          <button key={w} type="button" className={`fk-where-tab${w === where ? ' fk-where-on' : ''}`} aria-current={w === where ? 'page' : undefined} title={tip}
            onClick={() => onPage(whereTarget(page, w, today))} data-testid={`where-${w}`} data-text={label}>
            <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">{ICONS[w]}</svg>
            <span className="fk-where-label">{label}</span>
          </button>
        ))}
      </nav>
    </header>
  );
}
