// The two popups: the season series (every meeting of two teams this season as clickable squares, the aggregate on a
// two-leg tie) and the quick standings (movable by its header, resizable by its edges and corners, place remembered
// in localStorage `fk:stpop:v1`, "↺" resets; like calendarkit's).

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { shortDay } from '../data/model';
import { neutralVenue } from '../data/neutral';
import { meetingWinner, seasonSeries, seriesStatus } from '../data/series';
import { matchUrl } from '../data/snapshot';
import { CompMark, TeamLink, TeamLogo } from './Bits';
import { useFooty } from './ctx';
import { EDGES, useFloatBox } from './floatBox';
import { SplitTable } from './SplitTable';

/** The season series popup: where, the chip that opened it (its match outlined). */
export interface SeriesOpen { a: string; b: string; x: number; y: number; current?: string }

/** FK-33: calendarkit's season series popup ("G2/4"): a header "A – B · N meetings" with the series' state on the
 * right, one card per meeting across all competitions, oldest first (where: the home crest and "AWAY @ HOME"; played:
 * the winner and score; the date; the match that opened it outlined). A card searches the match on Google. */
export function SeriesPopup({ open, onClose }: { open: SeriesOpen; onClose: () => void }) {
  const { model, onTeam } = useFooty();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const away = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) onClose(); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('pointerdown', away);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('pointerdown', away); document.removeEventListener('keydown', esc); };
  }, [onClose]);
  const meetings = seasonSeries(model, open.a, open.b);
  const ta = model.team(open.a), tb = model.team(open.b);
  const abbr = (id: string) => model.team(id).abbr;
  const width = Math.min(innerWidth - 16, 24 + meetings.length * 96);
  const name = (id: string) => (onTeam && model.followed.has(id)
    ? <button type="button" className="fk-series-team" onClick={() => { onTeam(id, model.dayOf(meetings[0]!.m)); onClose(); }} title={`${model.team(id).name}: open its calendar`}>{abbr(id)}</button>
    : <span title={model.team(id).name}>{abbr(id)}</span>);
  return (
    <div ref={ref} className="fk-pop fk-series-pop" role="dialog" aria-label={`${ta.abbr} – ${tb.abbr} this season`} data-testid="series-popup" style={{ left: Math.max(8, Math.min(open.x, innerWidth - width - 8)), top: open.y + 6 }}>
      <div className="fk-series-head">
        <span className="fk-series-title">{name(open.a)} – {name(open.b)} · {meetings.length} meeting{meetings.length === 1 ? '' : 's'}</span>
        <span className="fk-series-status" data-testid="series-status">{seriesStatus(meetings, open.a, open.b, abbr)}</span>
      </div>
      <div className="fk-series-row">
        {meetings.map(({ m, tie }) => {
          const w = meetingWinner(m);
          const day = model.dayOf(m);
          const where = `${abbr(m.a)} ${neutralVenue(m) ? 'v' : '@'} ${abbr(m.h)}`;
          const hi = Math.max(m.hs ?? 0, m.as ?? 0), lo = Math.min(m.hs ?? 0, m.as ?? 0);
          const pens = m.hp !== undefined && m.ap !== undefined ? ` (p ${Math.max(m.hp, m.ap)}–${Math.min(m.hp, m.ap)})` : '';
          const comp = `${model.comp(m.c).name}${m.r ? ` · ${m.r}` : ''}${m.leg ? ` · leg ${m.leg}` : ''}`;
          const label = w ? `${shortDay(day)}, ${where}: ${w === 'draw' ? `draw ${hi}–${lo}` : `${abbr(w)} won ${hi}–${lo}${pens}`}` : `${shortDay(day)}, ${where}: to come`;
          return (
            <a key={m.id} className={`fk-series-sq${w ? ' fk-series-played' : ' fk-series-next'}${m.id === open.current ? ' fk-series-current' : ''}`} href={matchUrl(m, model)} target="_blank" rel="noopener noreferrer"
              data-testid="series-square" data-current={m.id === open.current || undefined} aria-label={`${label}. Search on Google`}
              title={`${comp}${tie ? `\nAggregate ${ta.abbr} ${tie.agg[0]}-${tie.agg[1]} ${tb.abbr}${tie.pens ? `, pens ${tie.pens[0]}-${tie.pens[1]}` : ''}` : ''}\nSearch the match on Google`}>
              <span className="fk-series-match" data-testid="series-match"><TeamLogo id={m.h} size={18} />{where}</span>
              {w && <span className="fk-series-win">{w === 'draw' ? 'Draw' : abbr(w)}</span>}
              {w && <span className="fk-series-score">{hi}–{lo}{pens}</span>}
              <span className="fk-series-date">{shortDay(day)}</span>
              <span className="fk-series-comp"><CompMark slug={m.c} round={m.r} /></span>
            </a>
          );
        })}
      </div>
    </div>
  );
}

export const STANDINGS_BOX_KEY = 'fk:stpop:v1';
const MIN = { w: 380, h: 220 };

/** Tables a club appears in, its league first. */
function tablesFor(model: ReturnType<typeof useFooty>['model'], team?: string): string[] {
  const all = Object.keys(model.snap.tables);
  const league = team ? model.clubById.get(team)?.league : undefined;
  const mine = all.filter((s) => model.snap.tables[s]!.some((t) => t.rows.some((r) => r.team === team)));
  const rest = all.filter((s) => !mine.includes(s));
  return [...(league && mine.includes(league) ? [league] : []), ...mine.filter((s) => s !== league), ...rest];
}

export function StandingsPopup({ team, onClose }: { team?: string; onClose: () => void }) {
  const { model, now } = useFooty();
  const order = tablesFor(model, team);
  const [slug, setSlug] = useState(order[0]);
  useEffect(() => setSlug(tablesFor(model, team)[0]), [model, team]);
  const { ref, style, dragProps, edgeProps, reset } = useFloatBox(STANDINGS_BOX_KEY, MIN);
  const tables = slug ? model.snap.tables[slug] ?? [] : [];
  const shown = tables.length > 1 && team ? tables.filter((t) => t.rows.some((r) => r.team === team)) : tables;
  const day = new Intl.DateTimeFormat('en-CA').format(now);
  // No scrolling box inside: the popup grows with its tables (they split to fit its width). Taller than the window,
  // it stops being pinned to the window and sits on the page, so the page scrolls to its end; the margin keeps it
  // where it was on screen.
  const [tall, setTall] = useState<number>();
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const over = el.offsetHeight > window.innerHeight - 16;
    if (over && tall === undefined) setTall(window.scrollY);
    else if (!over && tall !== undefined && el.offsetHeight < window.innerHeight - 80) setTall(undefined);
  }, [ref, tall, slug, team, style]);
  return (
    <div ref={ref} className={`fk-float fk-standings${tall !== undefined ? ' fk-float-tall' : ''}`} style={tall !== undefined ? { ...style, marginTop: tall } : style} role="dialog" aria-label="Quick standings" data-testid="standings-popup" data-no-marquee="true" data-capture-exclude="true">
      <div className="fk-float-head" {...dragProps}>
        <span className="fk-float-title">Standings</span>
        <select value={slug} onChange={(e) => setSlug(e.target.value)} aria-label="Competition">
          {order.map((s) => <option key={s} value={s}>{model.comp(s).name}</option>)}
        </select>
        <span className="fk-float-tools">
          <button type="button" className="fk-icon" title="Reset place and size" onClick={reset}>↺</button>
          <button type="button" className="fk-icon fk-float-close" title="Close" aria-label="Close" onClick={onClose}>×</button>
        </span>
      </div>
      <div className="fk-float-body">
        {shown.map((t) => (
          <SplitTable key={t.name} className="fk-table" bound="parent" testId="standings-split" caption={shown.length > 1 || tables.length > 1 ? t.name : undefined}
            head={<tr><th>#</th><th className="fk-tl">Team</th><th title="Points">Pts</th><th>P</th><th>W</th><th>D</th><th>L</th><th>GF</th><th>GA</th><th>GD</th></tr>}
            rows={t.rows.map((r) => (
                <tr key={r.team} className={r.team === team ? 'fk-me' : undefined}>
                  <td className="fk-rank" style={r.zc ? { boxShadow: `inset 3px 0 ${r.zc}` } : undefined} title={r.zone}>{r.rank}</td>
                  <td className="fk-tl"><TeamLink id={r.team} day={day} label="short" logoSize={16} /></td>
                  <td className="fk-pts" data-testid="pts">{r.pts}</td><td>{r.p}</td><td>{r.w}</td><td>{r.d}</td><td>{r.l}</td><td>{r.gf}</td><td>{r.ga}</td><td>{r.gf - r.ga > 0 ? '+' : ''}{r.gf - r.ga}</td>
                </tr>
              ))} />
        ))}
        <p className="fk-muted fk-pop-foot">ESPN's table as of the last snapshot ({new Date(model.snap.generatedAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}). Zone colours are ESPN's.</p>
      </div>
      {EDGES.map((e) => <span key={e} className={`fk-edge fk-edge-${e}`} {...edgeProps(e)} />)}
    </div>
  );
}
