// The what-if simulators' shared parts (PLAN.md Phase 5): the picks with undo / redo kept per competition in
// `fk:whatif:v1`, a match row (click cycle, 1 / X / 2, typed score, lock), the bulk-fill toolbar, and the columns'
// height. The UCL simulator (WhatIfPage.tsx) and the leagues' (LeagueWhatIfPage.tsx) build on them; the logic is
// src/data/whatif.ts.

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { shortDay } from '../data/model';
import type { Match } from '../data/snapshot';
import {
  AWAY, clear, cycle, DRAW, fill, history, HOME, isQuick, parseScore, pruneStore, push, readStore, redo, scoreText, undo,
  WHATIF_KEY, writeStore, type FinalState, type Fill, type History, type Rank, type Score, type Sim, type Store,
} from '../data/whatif';
import { TeamLogo } from './Bits';
import { useFooty } from './ctx';

function load(): string | null {
  try { return localStorage.getItem(WHATIF_KEY); } catch { return null; }
}
function save(text: string | null) {
  try {
    if (text) localStorage.setItem(WHATIF_KEY, text);
    else localStorage.removeItem(WHATIF_KEY);
  } catch { /* private mode: the scenario lasts for this page only */ }
}

export const ord = (n: number) => `${n}${n % 10 === 1 && n !== 11 ? 'st' : n % 10 === 2 && n !== 12 ? 'nd' : n % 10 === 3 && n !== 13 ? 'rd' : 'th'}`;
export const signed = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${-n}` : '0');

export type Meta = Omit<Store, 'current'>;

/** One competition's picks (with undo / redo) and saved scenarios, kept on every change but never on the first render
 * (an untouched visit leaves no key). The other competitions' stores are re-read before writing, so they stay. */
export function useWhatIf(comp: string, matches: Match[], finals?: Record<string, FinalState | undefined>) {
  const [start] = useState(() => pruneStore(readStore(load(), comp), matches, finals));
  const [hist, setHist] = useState<History>(() => history(start.current));
  const [meta, setMeta] = useState<Meta>(() => ({ saved: start.saved, active: start.active }));
  const sim = hist.now;
  const change = useCallback((f: (s: Sim) => Sim) => setHist((h) => push(h, f(h.now))), []);
  const loaded = useRef({ sim, meta });
  useEffect(() => {
    if (sim !== loaded.current.sim || meta !== loaded.current.meta) save(writeStore({ current: sim, ...meta }, comp, load()));
  }, [sim, meta, comp]);

  // undo / redo anywhere on the page (not while typing a score)
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || (e.target instanceof HTMLInputElement)) return;
      const k = e.key.toLowerCase();
      if (k === 'z' && !e.shiftKey) { e.preventDefault(); setHist(undo); }
      else if (k === 'y' || (k === 'z' && e.shiftKey)) { e.preventDefault(); setHist(redo); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const store: Store = { current: sim, ...meta };
  const onLoad = useCallback((name: string, s: Sim) => { change(() => s); setMeta((x) => ({ ...x, active: name })); }, [change]);
  return { sim, hist, setHist, change, meta, setMeta, store, onLoad };
}

/** The columns fill the window under the bar and scroll on their own. */
export function useFitHeight() {
  const root = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number>();
  useLayoutEffect(() => {
    const fit = () => { const top = root.current?.getBoundingClientRect().top ?? 0; setHeight(Math.max(420, window.innerHeight - top - 8)); };
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);
  return { root, height };
}

export function Row({ m, pick, locked, badge, teamTip, onSet, onLock, onMove, onHover, rowRef }: {
  m: Match; pick?: Score; locked: boolean;
  /** shown after a team's code (the UCL's pot, a league's place) */
  badge?: (team: string) => ReactNode;
  teamTip?: (team: string) => string;
  onSet: (s: Score | undefined, move: boolean) => void; onLock: () => void; onMove: (dir: 1 | -1) => void;
  onHover: (m?: Match) => void; rowRef: (el: HTMLDivElement | null) => void;
}) {
  const { model } = useFooty();
  const h = model.team(m.h), a = model.team(m.a);
  const win = pick ? (pick.h > pick.a ? 'h' : pick.h < pick.a ? 'a' : 'd') : undefined;
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget || e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key.toLowerCase();
    const set = (s: Score | undefined, move = true) => { e.preventDefault(); onSet(s, move); };
    if (k === '1') set(HOME);
    else if (k === 'x') set(DRAW);
    else if (k === '2') set(AWAY);
    else if (k === '0' || k === 'delete' || k === 'backspace') set(undefined, false);
    else if (k === ' ' || k === 'enter') set(cycle(pick), false);
    else if (k === 'l') { e.preventDefault(); onLock(); }
    else if (k === 'arrowdown' || k === 'j') { e.preventDefault(); onMove(1); }
    else if (k === 'arrowup' || k === 'k') { e.preventDefault(); onMove(-1); }
  };
  const typed = (el: HTMLInputElement, move: boolean) => {
    const s = parseScore(el.value);
    if (s) onSet(s, move);
    el.value = '';
  };
  const side = (t: typeof h, id: string, w: boolean) => (
    <span className={`fk-wi-side${w ? ' fk-wi-won' : ''}`} title={teamTip ? teamTip(id) : t.name}>
      <TeamLogo id={id} size={16} /><span className="fk-wi-abbr">{t.abbr}</span>{badge?.(id)}
    </span>
  );
  return (
    <div ref={rowRef} role="button" tabIndex={0} className={`fk-wi-row${pick ? ' fk-wi-picked' : ''}${locked ? ' fk-wi-locked' : ''}${m.st === 'ppd' ? ' fk-wi-ppd' : ''}`}
      data-testid="wi-match" data-id={m.id} data-pick={pick ? scoreText(pick) : ''}
      title={`${h.name} v ${a.name}, ${shortDay(model.dayOf(m))}${m.st === 'ppd' ? ' (postponed)' : ''}\nClick: 1-0 → 1-1 → 0-1 → empty · keys 1 X 2, 0 clears, L locks`}
      onClick={() => onSet(cycle(pick), false)} onKeyDown={onKey} onMouseEnter={() => onHover(m)} onMouseLeave={() => onHover(undefined)}>
      <button type="button" className="fk-wi-lock" aria-label={locked ? 'Unlock' : 'Lock'} aria-pressed={locked} disabled={!pick} tabIndex={-1}
        title={pick ? (locked ? 'Locked: bulk fills, clear and re-roll leave it (L)' : 'Lock this result (L)') : 'Pick a result to lock it'}
        onClick={(e) => { e.stopPropagation(); onLock(); }}>{locked ? '🔒' : '·'}</button>
      {side(h, m.h, win === 'h')}
      <span className={`fk-wi-score fk-wi-${win ?? 'none'}${pick && !isQuick(pick) ? ' fk-wi-typed' : ''}`}>{pick ? scoreText(pick) : 'v'}</span>
      {side(a, m.a, win === 'a')}
      <input className="fk-wi-type" placeholder="2-1" aria-label="Type a score" size={3} maxLength={5}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === 'Enter') { e.preventDefault(); typed(e.currentTarget, true); }
          if (e.key === 'Escape') { e.currentTarget.value = ''; (e.currentTarget.parentElement as HTMLElement).focus(); }
        }}
        onBlur={(e) => typed(e.currentTarget, false)} />
      <span className="fk-wi-day">{shortDay(model.dayOf(m))}</span>
    </div>
  );
}

/** A group of matches left to play: a UCL matchday or a league's window. `key` sorts in play order. */
export interface NavGroup { key: string; title: ReactNode; matches: Match[] }

/** One group on screen at a time, the next to play first. ◀ ▶ (or ← → anywhere but a text box or a list) step; the
 * rows keep ↑ ↓. When the groups change (a team picked), the one shown stays, or the next one left after it. */
export function useGroupNav(groups: NavGroup[]) {
  const [key, setKey] = useState<string>();
  let at = groups.length ? 0 : -1;
  if (key !== undefined && groups.length) { const i = groups.findIndex((g) => g.key >= key); at = i < 0 ? groups.length - 1 : i; }
  const step = useRef<(d: 1 | -1) => void>(() => {});
  useEffect(() => { step.current = (d) => { const g = groups[at + d]; if (g) setKey(g.key); }; });
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA')) return;
      if (e.key === 'ArrowLeft') { e.preventDefault(); step.current(-1); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); step.current(1); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);
  const go = (d: 1 | -1) => { const g = groups[at + d]; if (g) setKey(g.key); };
  return { group: at >= 0 ? groups[at] : undefined, at, count: groups.length, step: go };
}

/** The group's header with its arrows. `unit` names a step in the tooltips ("matchday", "window"). */
export function GroupNav({ nav, unit, children }: { nav: ReturnType<typeof useGroupNav>; unit: string; children?: ReactNode }) {
  if (!nav.group) return null;
  return (
    <div className="fk-wi-group-title fk-wi-nav" data-testid="wi-nav">
      <button type="button" className="fk-wi-arrow" disabled={nav.at === 0} aria-label={`Previous ${unit}`} title={`Previous ${unit} (←)`} onClick={() => nav.step(-1)} data-testid="wi-prev">◀</button>
      <span className="fk-wi-nav-title" data-testid="wi-nav-title">{nav.group.title}</span>
      <button type="button" className="fk-wi-arrow" disabled={nav.at === nav.count - 1} aria-label={`Next ${unit}`} title={`Next ${unit} (→)`} onClick={() => nav.step(1)} data-testid="wi-next">▶</button>
      <span className="fk-muted fk-wi-nav-of">{nav.at + 1} of {nav.count}</span>
      {children}
    </div>
  );
}

/** "Reset" beside a matchday's header: empties that matchday's picks (the matches shown), locked results stay, as
 * the toolbar's Clear; one step of undo. Shown only while there is a pick it would empty. */
export function ResetGroup({ matches, sim, change, unit }: { matches: Match[]; sim: Sim; change: (f: (s: Sim) => Sim) => void; unit: string }) {
  const n = matches.filter((m) => sim.picks[m.id] && !sim.locked[m.id]).length;
  if (!n) return null;
  return (
    <button type="button" className="fk-btn fk-wi-reset" data-testid="wi-reset" onClick={() => change((x) => clear(x, matches))}
      title={`Empty this ${unit}'s ${n} pick${n === 1 ? '' : 's'} (locked results stay) · Ctrl+Z undoes`}>Reset</button>
  );
}

/** Focus moves between the rows shown (keys 1 / X / 2 move on, ↑↓). */
export function useRowFocus(shown: Match[]) {
  const rows = useRef(new Map<string, HTMLDivElement>());
  const focusFrom = (id: string, dir: 1 | -1) => {
    const i = shown.findIndex((m) => m.id === id);
    const next = shown[i + dir];
    if (next) rows.current.get(next.id)?.focus();
  };
  const rowRef = (id: string) => (el: HTMLDivElement | null) => { if (el) rows.current.set(id, el); else rows.current.delete(id); };
  return { focusFrom, rowRef };
}

/** The bulk fills, clear, undo / redo, over every match left (every matchday, not only the one on screen). `favTip` says what "favourites" means here. */
export function Tools({ shown, team, favTip, rank, hist, change, setHist }: {
  shown: Match[]; team?: string; favTip: string; rank: Rank;
  hist: History; change: (f: (s: Sim) => Sim) => void; setHist: (f: (h: History) => History) => void;
}) {
  const { model } = useFooty();
  const fills: [Fill, string, string][] = [
    ['home', 'Home wins', 'Every unlocked match left, every matchday: home win 1-0'],
    ['fav', 'Favourites', `Every unlocked match left, every matchday: ${favTip}`],
    ['draw', 'Draws', 'Every unlocked match left, every matchday: 1-1'],
    ['random', 'Re-roll', 'Every unlocked match left, every matchday: home / draw / away at random (1/3 each), 1-0 / 1-1 / 0-1'],
  ];
  const only = team ? ` (${model.team(team).short}'s matches only)` : '';
  return (
    <span className="fk-wi-tools">
      {fills.map(([k, text, tip]) => (
        <button key={k} type="button" className="fk-btn" title={`${tip}${only}`} data-testid={`wi-fill-${k}`}
          onClick={() => change((x) => fill(x, shown, k, rank))}>{text}</button>
      ))}
      <button type="button" className="fk-btn" title={`Clear every unlocked match left, every matchday${only}`} data-testid="wi-clear" onClick={() => change((x) => clear(x, shown))}>Clear</button>
      <button type="button" className="fk-btn" disabled={!hist.past.length} title="Undo (Ctrl+Z)" data-testid="wi-undo" onClick={() => setHist(undo)}>↶</button>
      <button type="button" className="fk-btn" disabled={!hist.future.length} title="Redo (Ctrl+Y)" data-testid="wi-redo" onClick={() => setHist(redo)}>↷</button>
    </span>
  );
}

export const HELP = 'click a match: 1-0 → 1-1 → 0-1 → empty · keys 1 X 2 (then next) · 0 clear · L lock · ↑↓ · ← → matchday';
