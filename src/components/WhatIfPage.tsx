// The Champions League what-if simulator (PLAN.md Phase 5, Decisions log 2026-11-15): the league-phase matches left
// to play (Pending first), the table rebuilt on every pick, and the knockout places it leads to, in three columns on
// one screen. Speed is the point: a click cycles a result, 1 / X / 2 set it and move on, bulk fills, locks, undo.
// The logic is src/data/whatif.ts; the table is the UCL page's own engine (uclTable). Its own chunk.

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { UCL_PLAYOFF_PAIRS, UCL_ZONES } from '../../config/ucl';
import { shortDay } from '../data/model';
import type { Match } from '../data/snapshot';
import { leaguePhaseMatches, potOf, uclTable, zoneOf } from '../data/ucl';
import {
  AWAY, blocks, clear, cycle, DRAW, fill, history, HOME, isQuick, meets, parseScore, pruneStore, push, readStore, redo, scoreText,
  setPick, simMatches, toggleLock, toPlay, undo, WHATIF_KEY, writeStore, type Fill, type Store, type Score, type Sim,
} from '../data/whatif';
import { TeamLogo } from './Bits';
import { useFooty } from './ctx';
import { Scenarios } from './WhatIfScenarios';
import './ucl.css';
import './whatif.css';

function load(): string | null {
  try { return localStorage.getItem(WHATIF_KEY); } catch { return null; }
}
function save(text: string | null) {
  try {
    if (text) localStorage.setItem(WHATIF_KEY, text);
    else localStorage.removeItem(WHATIF_KEY);
  } catch { /* private mode: the scenario lasts for this page only */ }
}

const ord = (n: number) => `${n}${n % 10 === 1 && n !== 11 ? 'st' : n % 10 === 2 && n !== 12 ? 'nd' : n % 10 === 3 && n !== 13 ? 'rd' : 'th'}`;
const signed = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${-n}` : '0');
const FILLS: [Fill, string, string][] = [
  ['home', 'Home wins', 'Every unlocked match shown: home win 1-0'],
  ['fav', 'Favourites', 'Every unlocked match shown: the better pot wins 1-0 (UEFA coefficient order); same pot → home win'],
  ['draw', 'Draws', 'Every unlocked match shown: 1-1'],
  ['random', 'Re-roll', 'Every unlocked match shown: home / draw / away at random (1/3 each), 1-0 / 1-1 / 0-1'],
];

function Row({ m, pick, locked, onSet, onLock, onMove, onHover, rowRef }: {
  m: Match; pick?: Score; locked: boolean;
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
    <span className={`fk-wi-side${w ? ' fk-wi-won' : ''}`} title={`${t.name} · pot ${potOf(id)}`}>
      <TeamLogo id={id} size={16} /><span className="fk-wi-abbr">{t.abbr}</span><span className={`fk-pot fk-pot-${potOf(id)}`}>{potOf(id)}</span>
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

export default function WhatIfPage({ today, onBack }: { today: string; onBack: () => void }) {
  const { model } = useFooty();
  const names = useCallback((id: string) => model.team(id).name, [model]);
  const lp = useMemo(() => leaguePhaseMatches(model.snap), [model]);
  const real = useMemo(() => uclTable(model.snap, names), [model, names]);
  const [start] = useState(() => pruneStore(readStore(load()), lp));
  const [hist, setHist] = useState(() => history(start.current));
  const [saved, setSaved] = useState<Omit<Store, 'current'>>(() => ({ saved: start.saved, active: start.active }));
  const sim = hist.now;
  const change = useCallback((f: (s: Sim) => Sim) => setHist((h) => push(h, f(h.now))), []);
  const [team, setTeam] = useState<string>();
  const [hoverMatch, setHoverMatch] = useState<Match>();

  // stored on every change, never on the first render (an untouched visit leaves no key)
  const loaded = useRef({ sim, saved });
  useEffect(() => {
    if (sim !== loaded.current.sim || saved !== loaded.current.saved) save(writeStore({ current: sim, ...saved }));
  }, [sim, saved]);

  const table = useMemo(() => uclTable({ matches: simMatches(lp, sim), teams: model.snap.teams }, names), [lp, sim, model, names]);
  const realPos = useMemo(() => new Map(real.rows.map((r, i) => [r.team, i + 1])), [real]);
  const pos = useMemo(() => new Map(table.rows.map((r, i) => [r.team, i + 1])), [table]);
  const at = (p: number) => table.rows[p - 1]!.team;

  const left = useMemo(() => toPlay(lp, today, model.dayOf), [lp, today, model]);
  const mine = (m: Match) => !team || m.h === team || m.a === team;
  const pending = left.pending.filter(mine);
  const matchdays = left.matchdays.map((g) => ({ ...g, matches: g.matches.filter(mine) })).filter((g) => g.matches.length);
  const shown = [...pending, ...matchdays.flatMap((g) => g.matches)];
  const all = [...left.pending, ...left.matchdays.flatMap((g) => g.matches)];
  const picked = all.filter((m) => sim.picks[m.id]).length;

  const rows = useRef(new Map<string, HTMLDivElement>());
  const focusFrom = (id: string, dir: 1 | -1) => {
    const i = shown.findIndex((m) => m.id === id);
    const next = shown[i + dir];
    if (next) rows.current.get(next.id)?.focus();
  };

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

  // the three columns fill the window under the bar and scroll on their own
  const root = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number>();
  useLayoutEffect(() => {
    const fit = () => { const top = root.current?.getBoundingClientRect().top ?? 0; setHeight(Math.max(420, window.innerHeight - top - 8)); };
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);

  const focus = team ?? hoverMatch?.h;
  const focusPos = focus ? pos.get(focus) : undefined;
  const path = focusPos ? meets(focusPos, UCL_PLAYOFF_PAIRS) : undefined;
  const mark = (p: number) => {
    if (!focusPos) return '';
    if (p === focusPos) return ' fk-wi-self';
    if (path?.otherHalf === p) return ' fk-wi-other-half';
    if (path?.playoff.includes(p) || path?.r16.includes(p)) return ' fk-wi-meets';
    return '';
  };
  const hoverTeams = hoverMatch ? new Set([hoverMatch.h, hoverMatch.a]) : undefined;
  const levelText = table.complete ? 'level on criteria 1–8: decided by cards or club coefficient (not in the data)' : 'level on criteria 1–5 (6–8 apply once every match has a result)';

  const rowOf = (m: Match) => (
    <Row key={m.id} m={m} pick={sim.picks[m.id]} locked={!!sim.locked[m.id]}
      rowRef={(el) => { if (el) rows.current.set(m.id, el); else rows.current.delete(m.id); }}
      onSet={(s, move) => { change((x) => setPick(x, m.id, s)); if (move) focusFrom(m.id, 1); }}
      onLock={() => change((x) => toggleLock(x, m.id))}
      onMove={(d) => focusFrom(m.id, d)} onHover={setHoverMatch} />
  );
  const chip = (p: number) => (
    <span className={`fk-wi-chip${mark(p)}`} title={`${ord(p)} now: ${model.team(at(p)).name}`} data-testid="wi-slot">
      <span className="fk-wi-chip-pos">{p}</span>{model.team(at(p)).abbr}
    </span>
  );
  const teams = [...real.rows].sort((x, y) => names(x.team).localeCompare(names(y.team)));

  return (
    <div className="fk-ucl fk-wi" data-testid="whatif-page" data-no-marquee>
      <div className="fk-wi-head">
        <button type="button" className="fk-btn" onClick={onBack} title="The real table">← UCL</button>
        <h2>What-if <span className="fk-muted">· league phase</span></h2>
        <span className="fk-muted" data-testid="wi-count">{picked} of {all.length} picked</span>
        <select className="fk-wi-team" value={team ?? ''} onChange={(e) => setTeam(e.target.value || undefined)} aria-label="Show one team's matches" data-testid="wi-team">
          <option value="">All teams</option>
          {teams.map((r) => <option key={r.team} value={r.team}>{model.team(r.team).name}</option>)}
        </select>
        <span className="fk-wi-tools">
          {FILLS.map(([k, text, tip]) => (
            <button key={k} type="button" className="fk-btn" title={`${tip}${team ? ` (${model.team(team).short}'s matches only)` : ''}`} data-testid={`wi-fill-${k}`}
              onClick={() => change((x) => fill(x, shown, k, potOf))}>{text}</button>
          ))}
          <button type="button" className="fk-btn" title={`Clear every unlocked match shown${team ? ` (${model.team(team).short}'s only)` : ''}`} data-testid="wi-clear" onClick={() => change((x) => clear(x, shown))}>Clear</button>
          <button type="button" className="fk-btn" disabled={!hist.past.length} title="Undo (Ctrl+Z)" data-testid="wi-undo" onClick={() => setHist(undo)}>↶</button>
          <button type="button" className="fk-btn" disabled={!hist.future.length} title="Redo (Ctrl+Y)" data-testid="wi-redo" onClick={() => setHist(redo)}>↷</button>
        </span>
        <span className="fk-muted fk-wi-help">click a match: 1-0 → 1-1 → 0-1 → empty · keys 1 X 2 (then next) · 0 clear · L lock · ↑↓</span>
      </div>
      <Scenarios store={{ current: sim, ...saved }} team={team} lp={lp}
        onStore={(s) => setSaved({ saved: s.saved, active: s.active })}
        onLoad={(name, s) => { change(() => s); setSaved((x) => ({ ...x, active: name })); }} />
      <div className="fk-wi-cols" ref={root} style={{ height }}>
        <section className="fk-wi-col fk-wi-list" aria-label="Matches left to play">
          <div className="fk-wi-pending" data-testid="wi-pending">
            <div className="fk-wi-group-title">Pending <span className="fk-muted">· postponed or past without a result</span></div>
            {pending.length ? pending.map(rowOf) : <div className="fk-muted fk-wi-none">none</div>}
          </div>
          <div className="fk-wi-scroll">
            {matchdays.map((g) => (
              <div key={g.n} className="fk-wi-group">
                <div className="fk-wi-group-title">Matchday {g.n} <span className="fk-muted">· {[...new Set(g.matches.map((m) => shortDay(model.dayOf(m))))].join(', ')}</span></div>
                {g.matches.map(rowOf)}
              </div>
            ))}
            {!shown.length && <div className="fk-muted fk-wi-none">Nothing left to play.</div>}
          </div>
        </section>
        <section className="fk-wi-col fk-wi-table-col" aria-label="Table">
          <div className="fk-wi-group-title">{table.complete ? 'Final table' : `Table · ${all.length - picked} matches still empty`} <span className="fk-muted">· ▲▼ against the real table</span></div>
          <table className="fk-table fk-ucl-table fk-wi-table">
            <thead><tr><th>#</th><th /><th className="fk-tl">Team</th><th>P</th><th>GD</th><th>Pts</th></tr></thead>
            <tbody>
              {table.rows.map((r, i) => {
                const p = i + 1;
                const zone = zoneOf(p);
                const move = realPos.get(r.team)! - p;
                const cls = `fk-zone-${zone.id}${zone.to === p ? ' fk-zone-end' : ''}${r.team === team ? ' fk-wi-me' : ''}${hoverTeams?.has(r.team) ? ' fk-ucl-hover' : ''}${mark(p)}`;
                return (
                  <tr key={r.team} className={cls} data-testid="wi-row" data-team={model.team(r.team).abbr} title={r.level ? `Shared place: ${levelText}` : undefined}>
                    <td className="fk-rank">{r.rank}{r.level && <span className="fk-ucl-eq">=</span>}</td>
                    <td className={`fk-wi-move${move > 0 ? ' fk-wi-up' : move < 0 ? ' fk-wi-down' : ''}`} title={`Real table: ${ord(realPos.get(r.team)!)}`}>{move > 0 ? `▲${move}` : move < 0 ? `▼${-move}` : ''}</td>
                    <td className="fk-tl fk-ucl-team">
                      <button type="button" className="fk-wi-teambtn" title={team === r.team ? 'Show every team\'s matches' : `Show ${model.team(r.team).short}'s matches only`} onClick={() => setTeam(team === r.team ? undefined : r.team)}>
                        <TeamLogo id={r.team} size={16} /> {model.team(r.team).short}
                      </button>
                      <span className={`fk-pot fk-pot-${r.pot}`} title={`Pot ${r.pot}`}>{r.pot}</span>
                    </td>
                    <td>{r.p}</td><td>{signed(r.gd)}</td><td className="fk-pts">{r.pts}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="fk-ucl-key fk-wi-key">{UCL_ZONES.map((z) => <span key={z.id} className={`fk-ucl-zone-key fk-zone-${z.id}`}>{z.from}–{z.to}</span>)}</div>
        </section>
        <section className="fk-wi-col fk-wi-bracket" aria-label="Knockout places" data-testid="wi-bracket">
          <div className="fk-wi-group-title">Knockout places <span className="fk-muted">· {table.complete ? 'from this table' : 'if it ended here'}</span></div>
          {focus && focusPos && (
            <p className="fk-wi-path" data-testid="wi-path">
              <b>{model.team(focus).short}</b> {ord(focusPos)}
              {path && path.r16.length ? <>
                {path.playoff.length ? <> · play-off v <b>{path.playoff.map((p) => model.team(at(p)).abbr).join(' / ')}</b></> : null}
                {' · '}R16 v <b>{path.r16.map((p) => model.team(at(p)).abbr).join(' / ')}</b>
                {' · '}<span className="fk-wi-other-txt">other half: {model.team(at(path.otherHalf!)).abbr}</span> (meets it only in the final)
              </> : ' · out'}
            </p>
          )}
          {blocks(UCL_PLAYOFF_PAIRS).map((b) => (
            <div key={b.letter} className="fk-wi-block" data-testid="wi-block">
              <div className="fk-wi-block-title">{b.letter} · round of 16</div>
              <div className="fk-wi-halves" title="One in each half (which half is drawn): they can only meet in the final">
                {chip(b.r16[0])}<span className="fk-wi-split" aria-label="opposite halves">⇅</span>{chip(b.r16[1])}
              </div>
              <div className="fk-wi-vs">v the winners of play-off {b.section}</div>
              <div className="fk-wi-po">
                <span className="fk-wi-halves" title="Seeded pair: one in each tie, so one in each half">{chip(b.seeded[0])}<span className="fk-wi-split">⇅</span>{chip(b.seeded[1])}</span>
                <span className="fk-muted">v</span>
                <span className="fk-wi-halves" title="Unseeded pair: one in each tie, so one in each half">{chip(b.unseeded[0])}<span className="fk-wi-split">⇅</span>{chip(b.unseeded[1])}</span>
              </div>
            </div>
          ))}
          <p className="fk-muted fk-wi-note">⇅ = the two go to opposite halves (each half has one tie of each letter; which half is drawn). Quarter-finals: A v D and B v C in each half. Pick a team (table or filter) or hover a match to see its path: <span className="fk-wi-meets-key">can meet</span> <span className="fk-wi-other-key">other half</span>.</p>
        </section>
      </div>
    </div>
  );
}
