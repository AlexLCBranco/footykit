// FK-69: the World Cup bracket as match cards joined by lines: two sides meeting at the final in the middle, every card
// always showing both teams (flag, full name, score once), the date and kick-off time, the stadium and its roof, the
// weather at kick-off when the match was under the sky, and a Watch button where there is a video. The champion's path
// is drawn in the accent colour. FK-70: the same shape as a poster of flag tiles (teams, not matches), copied as an image.

import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { peekVenues, peekVideos, scoreText, wcMatchUrl, wcVideoTip, wcVideoUrl, type KoColumn, type KoTie, type WcEdition } from '../data/worldcup';
import { feeds, onChampionPath, posterColumns, posterFeeds, slotId, type PosterTile, type Slot } from '../data/wcBracket';
import { flagOf, flagUrl } from '../data/wcFlags';
import { cardWeather, ROOF_TIP, roofTag, weatherText, weatherTip } from '../data/wcVenues';
import { CopyButton } from './Copy';
import { matchTip, STAGE_TIP, Team } from './WorldCupPage';
import './wcBracket.css';

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const dateText = (d: string) => { const [y, m, day] = d.split('-'); return `${Number(day)} ${MON[Number(m) - 1]} ${y}`; };

/** The team's flag, or for a team with none in the set (a country that no longer exists) a neutral tile with its code. */
export function Flag({ ed, code }: { ed: Pick<WcEdition, 'teams' | 'fifa'>; code: string }) {
  const name = ed.teams[code] ?? code;
  const file = flagOf(code, name);
  if (file) return <img className="fk-bk-flag" src={flagUrl(file)} alt="" draggable={false} data-testid="wc-flag" data-flag={file} />;
  return <span className="fk-bk-flag fk-bk-noflag" title={`${name}: no flag shown (the free flag set has none for it)`} data-testid="wc-noflag">{ed.fifa?.[code] ?? code}</span>;
}

interface Line { d: string; champ: boolean }
/**
 * The lines of a bracket: every element with `data-feeds="<slot>"` is joined to the element with that `data-slot`, from
 * its inner edge to the other's outer edge by a right-angled path, measured from the page (so cards of any height
 * line up) and again whenever the bracket's box changes size.
 */
function useLines(key: unknown) {
  const box = useRef<HTMLDivElement>(null);
  const [lines, setLines] = useState<Line[]>([]);
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const draw = () => {
      const base = el.getBoundingClientRect();
      const out: Line[] = [];
      for (const from of el.querySelectorAll<HTMLElement>('[data-feeds]')) {
        const to = el.querySelector<HTMLElement>(`[data-slot="${from.dataset.feeds}"]`);
        if (!to) continue;
        const a = from.getBoundingClientRect(), b = to.getBoundingClientRect();
        const right = b.left >= a.left;
        const r = (n: number) => Math.round(n * 2) / 2;
        const x1 = r((right ? a.right : a.left) - base.left), x2 = r((right ? b.left : b.right) - base.left);
        const y1 = r(a.top + a.height / 2 - base.top), y2 = r(b.top + b.height / 2 - base.top);
        out.push({ d: `M${x1} ${y1}H${r((x1 + x2) / 2)}V${y2}H${x2}`, champ: from.dataset.champ === '1' });
      }
      setLines((old) => (JSON.stringify(old) === JSON.stringify(out) ? old : out));
    };
    draw();
    if (typeof ResizeObserver !== 'function') return;
    const ro = new ResizeObserver(draw);
    ro.observe(el);
    return () => ro.disconnect();
  }, [key]);
  // the champion's path last, so it is drawn over the others where they share a stretch
  const svg = (
    <svg className="fk-bk-lines" aria-hidden="true" data-testid="wc-lines">
      {[...lines].sort((a, b) => Number(a.champ) - Number(b.champ)).map((l) => <path key={l.d} d={l.d} className={l.champ ? 'fk-bk-line fk-bk-line-champ' : 'fk-bk-line'} data-testid="wc-line" data-champ={l.champ || undefined} />)}
    </svg>
  );
  return { box, svg };
}

/** Where a card sits and what it feeds, as attributes the lines are drawn from. */
const wire = (slot: Slot, to: Slot | undefined, champ: boolean) => ({ 'data-slot': slotId(slot), 'data-feeds': to ? slotId(to) : undefined, 'data-champ': champ ? '1' : undefined });

/** One knockout match as a card. `big`: the final (trophy and champion on top). */
export function MatchCard({ ed, t, onTeam, big, wiring }: { ed: WcEdition; t: KoTie; onTeam: (c: string) => void; big?: boolean; wiring?: ReturnType<typeof wire> }) {
  const m = t.matches[t.matches.length - 1]!;
  const venues = peekVenues(ed.year);
  const st = m.city ? venues?.stadiums[m.city] : undefined;
  const mv = venues?.matches[m.n];
  const stadium = st?.name ?? m.venue;
  const tag = roofTag(st?.roof, mv?.roofOpen);
  const w = cardWeather(st, mv);
  const video = peekVideos(ed.year)?.[m.n];
  const f = m.et ?? m.s;
  const n = (c: string) => ed.teams[c] ?? c;
  const side = (code: string) => {
    const i = m.h === code ? 0 : 1;
    return (
      <div className={`fk-bk-side${t.winner ? (t.winner === code ? ' fk-bk-win' : ' fk-bk-out') : ''}`} data-testid="wc-side" data-team={code} data-out={(t.winner && t.winner !== code) || undefined}>
        <Flag ed={ed} code={code} />
        <Team ed={ed} code={code} onTeam={onTeam} className="fk-bk-team" />
        {/* the score, once: it opens the match search (FK-66) */}
        <a className="fk-bk-score fk-wc-score" href={wcMatchUrl(ed, m)} target="_blank" rel="noopener noreferrer" title={`${m.p ? `${f[i]} goals, ${m.p[i]} in the penalty shootout (in brackets)` : `${f[i]} goals`}${m.et ? ' after extra time' : ''}\n\n${matchTip(ed, m)}`} data-testid="wc-score">
          {f[i]}{m.p ? <span className="fk-bk-pens"> ({m.p[i]})</span> : null}
        </a>
      </div>
    );
  };
  return (
    <div className={`fk-bk-card${big ? ' fk-bk-final' : ''}`} data-testid="wc-tie" data-n={m.n} {...wiring}>
      {big && t.winner && <div className="fk-bk-champion" data-testid="wc-trophy"><span aria-hidden="true">🏆</span> <button type="button" className="fk-wc-name" title={`${n(t.winner)}: World Cup history`} onClick={() => onTeam(t.winner!)}><b>{n(t.winner)}</b></button> <span className="fk-muted">world champion</span></div>}
      {side(t.a)}
      {side(t.b)}
      {t.matches.slice(0, -1).map((x) => (
        <a key={x.n} className="fk-bk-line2 fk-bk-earlier" href={wcMatchUrl(ed, x)} target="_blank" rel="noopener noreferrer" title={matchTip(ed, x)} data-testid="wc-match">Earlier match, {dateText(x.date)}: {scoreText(x)}</a>
      ))}
      <div className="fk-bk-line2">
        <a href={wcMatchUrl(ed, m)} target="_blank" rel="noopener noreferrer" title={matchTip(ed, m)} data-testid="wc-match">{dateText(m.date)}{m.time ? <> · <span title="Kick-off, local time">{m.time}</span></> : null}</a>
        {m.replay && <span className="fk-bk-tag">replay</span>}
        {m.et && <span className="fk-bk-tag" title={`After extra time (90 minutes: ${m.s[0]}–${m.s[1]})`} data-testid="wc-aet">a.e.t.</span>}
        {m.p && <span className="fk-bk-tag" title="Decided by a penalty shootout: its score is in brackets">pens</span>}
      </div>
      {(stadium || m.city) && (
        <div className="fk-bk-line2" data-testid="wc-stadium" title={[stadium, m.city].filter(Boolean).join(', ')}>
          <span className="fk-bk-stadium">{stadium ?? m.city}</span>
          {tag && <span className="fk-bk-tag fk-bk-roof" title={ROOF_TIP[tag]} data-testid="wc-roof">{tag}</span>}
        </div>
      )}
      {w && <div className="fk-bk-line2 fk-bk-weather" title={weatherTip(w)} data-testid="wc-weather">{weatherText(w)}</div>}
      {video && <a className="fk-bk-watch" href={wcVideoUrl(video)} target="_blank" rel="noopener noreferrer" draggable={false} title={wcVideoTip(ed.year, video)} aria-label={`${n(m.h)} v ${n(m.a)}: ${wcVideoTip(ed.year, video)}`} data-testid="wc-video" data-n={m.n}><span aria-hidden="true">▶</span> Watch</a>}
    </div>
  );
}

/** A slot with no match to show: not decided yet, or (in history) a walkover. */
export function EmptyCard({ label, tip, wiring }: { label: string; tip?: string; wiring?: ReturnType<typeof wire> }) {
  return <div className="fk-bk-card fk-bk-empty" title={tip} data-testid="wc-empty" {...wiring}>{label}</div>;
}

/** The bracket of match cards. `cols`: twoSided(bracket). */
export function CardBracket({ ed, cols, third, onTeam }: { ed: WcEdition; cols: KoColumn[]; third?: KoTie; onTeam: (c: string) => void }) {
  const { box, svg } = useLines(ed);
  return (
    <div className="fk-bk-scroll">
      <div className="fk-bk" ref={box} data-testid="wc-bracket" style={{ gridTemplateColumns: cols.map((c) => (c.side === 'final' ? 'minmax(210px, 1.3fr)' : 'minmax(168px, 1fr)')).join(' ') }}>
        {svg}
        {cols.map((c, ci) => (
          <div key={`${c.side}-${c.stage}`} className={`fk-bk-col fk-bk-${c.side}`} data-testid="wc-ko-col" data-side={c.side} data-stage={c.stage}>
            <div className="fk-ko-col-title fk-bk-title" title={STAGE_TIP[c.stage]}>{c.stage}</div>
            <div className="fk-bk-ties">
              {c.ties.map((t, ri) => {
                const slot = { col: ci, row: ri };
                const wiring = wire(slot, feeds(cols, slot), onChampionPath(t, ed.champion));
                return (
                  <div key={t ? `${t.a}-${t.b}` : `none${ri}`} className="fk-bk-slot">
                    {t ? <MatchCard ed={ed} t={t} onTeam={onTeam} big={c.side === 'final'} wiring={wiring} />
                      : <EmptyCard label="No match (walkover)" tip="The data has no match here: the team went through without playing (walkover)" wiring={wiring} />}
                  </div>
                );
              })}
              {c.side === 'final' && third && (
                <div className="fk-bk-third" data-testid="wc-third-place">
                  <div className="fk-ko-col-title fk-bk-title" title={STAGE_TIP['Third place']}>Third place</div>
                  <MatchCard ed={ed} t={third} onTeam={onTeam} />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Tile({ ed, tile, wiring, outer }: { ed: WcEdition; tile: PosterTile; wiring: ReturnType<typeof wire>; outer: boolean }) {
  const code = tile.team;
  return (
    <div className={`fk-poster-tile${tile.out ? ' fk-poster-out' : ''}${code ? '' : ' fk-poster-empty'}`} data-testid="wc-poster-tile" data-team={code} data-out={tile.out || undefined} data-outer={outer || undefined} {...wiring}>
      {code ? <><Flag ed={ed} code={code} /><span className="fk-poster-name">{ed.teams[code] ?? code}</span></> : <span className="fk-poster-name" title="Not decided">?</span>}
    </div>
  );
}

/** FK-70: the bracket as a poster: a flag tile and name per team per round, growing toward the champion in the middle. */
export function Poster({ ed, cols }: { ed: WcEdition; cols: KoColumn[] }) {
  const pcs = posterColumns(cols);
  const { box, svg } = useLines(ed);
  const depth = (i: number) => Math.min(i, pcs.length - 1 - i);
  return (
    <div className="fk-bk-scroll">
      <div className="fk-poster" data-testid="wc-poster">
        <h3 className="fk-poster-title" data-testid="wc-poster-title">World Cup {ed.year}</h3>
        <div className="fk-poster-grid" ref={box} style={{ gridTemplateColumns: pcs.map((c) => (c.champion ? 'minmax(150px, 1.4fr)' : 'minmax(118px, 1fr)')).join(' ') }}>
          {svg}
          {pcs.map((c, ci) => (
            <div key={ci} className={`fk-poster-col fk-poster-${c.side} fk-poster-d${depth(ci)}${c.champion ? ' fk-poster-champion' : ''}`} data-testid="wc-poster-col" data-stage={c.stage}>
              {c.champion && <div className="fk-poster-trophy" aria-hidden="true">🏆</div>}
              {c.tiles.map((tile, ri) => {
                const slot = { col: ci, row: ri };
                // a line is on the champion's path when the champion is the team moving along it
                return <div key={ri} className="fk-poster-slot"><Tile ed={ed} tile={tile} outer={ci === 0 || ci === pcs.length - 1} wiring={wire(slot, posterFeeds(pcs, slot), !!tile.team && tile.team === ed.champion)} /></div>;
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** FK-70: the "Poster" switch and, in poster mode, the copy button. `children`: the bracket or the poster. */
export function BracketTools({ poster, onPoster, children }: { poster: boolean; onPoster: (on: boolean) => void; children: ReactNode }) {
  return (
    <div className="fk-bk-wrap">
      <div className="fk-bk-tools">
        <button type="button" className={`fk-tab${poster ? ' fk-tab-on' : ''}`} aria-pressed={poster} onClick={() => onPoster(!poster)} title="Poster: the bracket as flags and team names only, ready to copy as an image" data-testid="wc-poster-switch">Poster</button>
        {poster && <CopyButton target={(b) => b.closest('.fk-bk-wrap')?.querySelector<HTMLElement>('.fk-poster') ?? null} label="Copy the poster as an image" />}
      </div>
      {children}
    </div>
  );
}
