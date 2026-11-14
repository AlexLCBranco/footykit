// The two popups: the season series (every meeting of two teams this season as clickable squares, the aggregate on a
// two-leg tie) and the quick standings (movable by its header, resizable by its edges and corners, place remembered
// in localStorage `fk:stpop:v1`, "↺" resets; like calendarkit's).

import { useEffect, useRef, useState } from 'react';
import { isPlayed, resultFor, shortDay } from '../data/model';
import { seasonSeries } from '../data/series';
import { matchUrl } from '../data/snapshot';
import { CompMark, TeamLink } from './Bits';
import { useFooty } from './ctx';
import { EDGES, useFloatBox } from './floatBox';

export interface SeriesOpen { a: string; b: string; x: number; y: number }

export function SeriesPopup({ open, onClose }: { open: SeriesOpen; onClose: () => void }) {
  const { model, timeZone } = useFooty();
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
  return (
    <div ref={ref} className="fk-pop fk-series-pop" role="dialog" aria-label={`${ta.abbr} – ${tb.abbr} this season`} data-testid="series-popup" style={{ left: Math.min(open.x, innerWidth - 380), top: open.y + 6 }}>
      <div className="fk-pop-head">{ta.name} – {tb.name}: {meetings.length} meeting{meetings.length === 1 ? '' : 's'} this season</div>
      <div className="fk-squares">
        {meetings.map(({ m, tie }) => {
          const r = resultFor(m, open.a);
          const home = m.h === open.a;
          const when = shortDay(model.dayOf(m));
          const score = isPlayed(m) ? `${home ? m.hs : m.as}-${home ? m.as : m.hs}` : m.tbd ? 'TBD' : new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone }).format(Date.parse(m.t));
          return (
            <a key={m.id} className={`fk-square${r ? ` fk-res-${r}` : ''}`} href={matchUrl(m.id)} target="_blank" rel="noopener noreferrer" data-testid="series-square"
              title={`${when} · ${model.comp(m.c).name}${m.r ? ` · ${m.r}` : ''}${m.leg ? ` · leg ${m.leg}` : ''}\n${model.team(m.a).name} at ${model.team(m.h).name}${tie ? `\nAggregate ${ta.abbr} ${tie.agg[0]}-${tie.agg[1]} ${tb.abbr}${tie.pens ? `, pens ${tie.pens[0]}-${tie.pens[1]}` : ''}` : ''}\nOpen on ESPN`}>
              <span className="fk-square-top"><CompMark slug={m.c} round={m.r} /> {home ? 'vs' : '@'}</span>
              <span className="fk-square-score">{score}</span>
              <span className="fk-square-date">{when}</span>
              {tie && <span className="fk-square-agg">agg {tie.agg[0]}-{tie.agg[1]}{tie.pens ? ` (p ${tie.pens[0]}-${tie.pens[1]})` : ''}</span>}
            </a>
          );
        })}
      </div>
      <div className="fk-muted fk-pop-foot">From {ta.abbr}'s side. Click a square for the match on ESPN.</div>
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
  return (
    <div ref={ref} className="fk-float fk-standings" style={style} role="dialog" aria-label="Quick standings" data-testid="standings-popup" data-no-marquee="true" data-capture-exclude="true">
      <div className="fk-float-head" {...dragProps}>
        <span className="fk-pop-head">Standings</span>
        <select value={slug} onChange={(e) => setSlug(e.target.value)} aria-label="Competition">
          {order.map((s) => <option key={s} value={s}>{model.comp(s).name}</option>)}
        </select>
        <span className="fk-float-tools">
          <button type="button" className="fk-icon" title="Reset place and size" onClick={reset}>↺</button>
          <button type="button" className="fk-icon" title="Close" onClick={onClose}>×</button>
        </span>
      </div>
      <div className="fk-float-body">
        {shown.map((t) => (
          <table key={t.name} className="fk-table">
            {shown.length > 1 || tables.length > 1 ? <caption>{t.name}</caption> : null}
            <thead><tr><th>#</th><th className="fk-tl">Team</th><th>P</th><th>W</th><th>D</th><th>L</th><th>GF</th><th>GA</th><th>GD</th><th>Pts</th></tr></thead>
            <tbody>
              {t.rows.map((r) => (
                <tr key={r.team} className={r.team === team ? 'fk-me' : undefined}>
                  <td className="fk-rank" style={r.zc ? { boxShadow: `inset 3px 0 ${r.zc}` } : undefined} title={r.zone}>{r.rank}</td>
                  <td className="fk-tl"><TeamLink id={r.team} day={day} label="short" logoSize={16} /></td>
                  <td>{r.p}</td><td>{r.w}</td><td>{r.d}</td><td>{r.l}</td><td>{r.gf}</td><td>{r.ga}</td><td>{r.gf - r.ga > 0 ? '+' : ''}{r.gf - r.ga}</td><td className="fk-pts">{r.pts}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ))}
        <p className="fk-muted fk-pop-foot">ESPN's table as of the last snapshot ({new Date(model.snap.generatedAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}). Zone colours are ESPN's.</p>
      </div>
      {EDGES.map((e) => <span key={e} className={`fk-edge fk-edge-${e}`} {...edgeProps(e)} />)}
    </div>
  );
}
