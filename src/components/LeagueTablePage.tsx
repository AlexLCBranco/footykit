// A league's table page (PLAN.md Phase 4): the table rebuilt with the league's ties-on-points rules
// (src/data/leagueTable.ts), each row's last 5 results and next 3 matches as squares, zones by meaning (hatched where
// only some outcomes give the place), the rules and sources under it. The Brasileirão also lists the finals that can
// still open Libertadores places. Its own chunk, like the UCL page.

import { useEffect, useMemo, useRef, useState } from 'react';
import { BRA_CONTINENTAL, BRA_CUP, LEAGUES, type LeagueZone } from '../../config/leagues';
import type { LeagueSlug } from '../../config/season';
import { braRowZones, finalOf, type Finals, type RowZone } from '../data/braPlaces';
import { leagueTable } from '../data/leagueTable';
import { leagueMatchdays, movesAfter, tableAfter, type Move } from '../data/matchdays';
import { ordinal } from '../data/tags';
import { dayLabel, isPlayed, kickoffTime, shortDay } from '../data/model';
import { matchUrl, type Match } from '../data/snapshot';
import { TeamLink } from './Bits';
import { useFooty } from './ctx';
import './ucl.css';
import { SplitTable } from './SplitTable';

function Square({ m, team, today }: { m: Match; team: string; today: string }) {
  const { model, timeZone } = useFooty();
  const home = m.h === team;
  const opp = model.team(home ? m.a : m.h);
  const day = model.dayOf(m);
  const played = isPlayed(m);
  const gf = home ? m.hs! : m.as!, ga = home ? m.as! : m.hs!;
  const res = played ? (gf > ga ? 'W' : gf < ga ? 'L' : 'D') : undefined;
  const tip = [
    played ? `${res === 'W' ? 'Won' : res === 'L' ? 'Lost' : 'Drew'} ${gf}-${ga} ${home ? 'vs' : 'at'} ${opp.name}` : `${home ? 'vs' : 'at'} ${opp.name}`,
    `${dayLabel(day)}${m.tbd ? '' : `, ${kickoffTime(m.t, timeZone)}`}`,
    m.st === 'ppd' ? 'Postponed' : '',
    'Search the match on Google',
  ].filter(Boolean).join('\n');
  return (
    <a className={`fk-usq fk-usq-${res ?? 'next'}${m.st === 'in' || (!played && day === today) ? ' fk-usq-now' : ''}`} href={matchUrl(m, model)} target="_blank" rel="noopener noreferrer" draggable={false} title={tip} data-testid="league-square">
      <span className="fk-usq-opp"><span className="fk-usq-at">{home ? 'vs' : '@'}</span>{opp.abbr}</span>
      <span className="fk-usq-res">{played ? `${gf}-${ga}` : m.st === 'ppd' ? 'PPD' : shortDay(day)}</span>
    </a>
  );
}

/** The finals that still decide Brasileirão places (REC Art. 6), as the snapshot has them. */
function BraFinals({ finals }: { finals: Finals }) {
  const { model } = useFooty();
  const nm = (id: string) => model.team(id).short.trim();
  const rows: [string, Finals['cup']][] = [['Copa do Brasil', finals.cup], ['Libertadores', finals.lib], ['Sudamericana', finals.sula]];
  return (
    <section className="fk-lt-extra" data-testid="bra-extras">
      <h3>Finals that decide places</h3>
      <ul>
        {rows.map(([n, f]) => (
          <li key={n}><b>{n} final</b>: {f ? `${nm(f.finalists[0])} v ${nm(f.finalists[1])}, ${f.legs.map((m) => shortDay(model.dayOf(m))).join(' / ')}${f.winner ? ` — won by ${nm(f.winner)}` : ''}` : 'not in the data (its places are left out)'}</li>
        ))}
      </ul>
      <p>Hover a hatched place to see which results give it. Places are worked out as things stand: the table now and the finals played; a final still to play is worked out both ways.</p>
    </section>
  );
}

/** FK-57: places moved since the round before: green ▲1, red ▼2, grey – */
function MoveCell({ mv, n }: { mv?: Move; n: number }) {
  if (!mv) return <td className="fk-lt-move" />;
  const cls = mv.delta > 0 ? 'up' : mv.delta < 0 ? 'down' : 'same';
  return (
    <td className={`fk-lt-move fk-lt-move-${cls}`} title={`Was ${ordinal(mv.was)} after round ${n - 1}`} data-testid="lt-move" data-delta={mv.delta}>
      {mv.delta > 0 ? `▲${mv.delta}` : mv.delta < 0 ? `▼${-mv.delta}` : '–'}
    </td>
  );
}

const zoneAt = (zones: LeagueZone[], pos: number) => zones.find((z) => pos >= z.from && pos <= z.to);

export default function LeagueTablePage({ league, today, onWhatIf }: { league: LeagueSlug; today: string; onWhatIf?: () => void }) {
  const { model } = useFooty();
  const rules = LEAGUES[league];
  // FK-43: the table as it stood after round N (◀ ▶ beside the label, or ← →); it opens on the latest played round
  const { days } = useMemo(() => leagueMatchdays(model.snap, league), [model, league]);
  const [picked, setPicked] = useState<{ league: LeagueSlug; n: number }>();
  const latest = days.latest;
  const n = picked?.league === league ? Math.min(picked.n, latest) : latest;
  const now = useMemo(() => leagueTable(model.snap, league), [model, league]);
  const table = useMemo(() => (n < latest ? { league, ...tableAfter(model.snap, league, n) } : now), [model, league, n, latest, now]);
  const mvs = useMemo(() => movesAfter(model.snap, league, n, table.rows), [model, league, n, table]);
  const step = (d: 1 | -1) => { const to = n + d; if (to >= 1 && to <= latest) setPicked({ league, n: to }); };
  const stepRef = useRef(step);
  useEffect(() => { stepRef.current = step; });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA')) return;
      if (e.key === 'ArrowLeft') { e.preventDefault(); stepRef.current(-1); } else if (e.key === 'ArrowRight') { e.preventDefault(); stepRef.current(1); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);
  const comp = model.comp(league);
  const legend = rules.zones.filter((z, i, a) => a.findIndex((x) => x.kind === z.kind) === i);
  // each row's zone: by position from config, except the Brasileirão's continental places, which come from CBF's rules
  // and the finals (src/data/braPlaces.ts); relegation stays by position
  const bra = useMemo(() => {
    if (league !== 'bra.1') return undefined;
    const order = table.rows.map((r) => r.team);
    const finals: Finals = { cup: finalOf(model.snap.matches, BRA_CUP), lib: finalOf(model.snap.matches, BRA_CONTINENTAL.lib), sula: finalOf(model.snap.matches, BRA_CONTINENTAL.sula) };
    return { finals, zones: braRowZones(order, rules.zones, finals, (id) => model.team(id).short.trim()) };
  }, [league, table, rules, model]);
  const zones: (RowZone | undefined)[] = bra?.zones ?? table.rows.map((_, i) => {
    const cfg = zoneAt(rules.zones, i + 1);
    return cfg && { kind: cfg.kind, open: !!cfg.maybe, tip: `${cfg.label}${cfg.maybe ? `\nOnly ${cfg.maybe}` : ''}` };
  });
  return (
    <div className="fk-ucl fk-lt" data-testid="league-page" data-league={league}>
      <div className="fk-ucl-head">
        <h2>{comp.name}</h2>
        <span className="fk-lt-nav" data-testid="lt-nav">
          <button type="button" className="fk-lt-arrow" disabled={n <= 1} aria-label="The table a round earlier" title="A round earlier (←)" onClick={() => step(-1)} data-testid="lt-prev">◀</button>
          <span className="fk-muted" data-testid="lt-round" data-round={n} title={n < latest ? `The table as it stood after round ${n}: the matches of rounds 1–${n} (a postponed match counts in its own round)` : 'The table now'}>
            {table.complete ? 'final table' : `after ${n} round${n === 1 ? '' : 's'}`}
          </span>
          <button type="button" className="fk-lt-arrow" disabled={n >= latest} aria-label="The table a round later" title="A round later (→)" onClick={() => step(1)} data-testid="lt-next">▶</button>
        </span>
        {onWhatIf && !now.complete && <button type="button" className="fk-btn" onClick={onWhatIf} title="Pick the results left to play and see the table change" data-testid="league-whatif">Simulator</button>}
        <span className="fk-ucl-key">
          {legend.map((z) => <span key={z.kind} className={`fk-ucl-zone-key fk-lz-${z.kind}`}>{z.label}</span>)}
          {rules.zones.some((z) => z.maybe) && <span className="fk-ucl-zone-key fk-lz-maybe-key">hatched: only with some outcomes</span>}
        </span>
      </div>
      <SplitTable className="fk-table fk-ucl-table" testId="league-split" head={<tr>
            <th>#</th><th className="fk-lt-move" title="Places moved since the round before"></th><th className="fk-tl">Team</th><th title="Points">Pts</th><th>P</th><th>W</th><th>D</th><th>L</th><th>GF</th><th>GA</th><th>GD</th>
            <th className="fk-tl" title="The last 5 league results and the next 3 league matches">Last 5 · next 3</th>
          </tr>} rows={table.rows.map((r, i) => {
            const z = zones[i];
            const end = !!z && zones[i + 1]?.kind !== z.kind;
            const tip = [z?.tip ?? '', r.level ? 'Level with another team on every rule the data allows (shared place)' : ''].filter(Boolean).join('\n');
            return (
              <tr key={r.team} className={`${z ? `fk-lz-${z.kind}` : ''}${z?.open ? ' fk-lz-maybe' : ''}${end ? ' fk-zone-end' : ''}`} data-testid="league-row" data-team={model.team(r.team).abbr}>
                <td className="fk-rank" title={tip || undefined}>{r.rank}{r.level && <span className="fk-ucl-eq">=</span>}</td>
                <MoveCell mv={mvs?.get(r.team)} n={n} />
                <td className="fk-tl fk-ucl-team"><TeamLink id={r.team} day={today} label="short" /></td>
                <td className="fk-pts" data-testid="pts">{r.pts}</td><td>{r.p}</td><td>{r.w}</td><td>{r.d}</td><td>{r.l}</td><td>{r.gf}</td><td>{r.ga}</td>
                <td>{r.gd > 0 ? `+${r.gd}` : r.gd < 0 ? `−${-r.gd}` : 0}</td>
                <td className="fk-tl">
                  <span className="fk-lt-squares">
                    {Array.from({ length: 5 - r.last.length }, (_, k) => <span key={`e${k}`} />)}
                    {r.last.map((m) => <Square key={m.id} m={m} team={r.team} today={today} />)}
                    <span className="fk-lt-gap" />
                    {r.next.map((m) => <Square key={m.id} m={m} team={r.team} today={today} />)}
                  </span>
                </td>
              </tr>
            );
          })} />
      {bra && <BraFinals finals={bra.finals} />}
      <div className="fk-ucl-rules" data-testid="league-rules">
        <section>
          <h3>Places</h3>
          <ul>{rules.zones.map((z) => <li key={`${z.from}`}>{z.from === z.to ? `${z.from}` : `${z.from}–${z.to}`}: {z.label}{z.maybe ? ` (only ${z.maybe})` : ''}</li>)}</ul>
          {rules.notes.map((n) => <p key={n}>{n}</p>)}
        </section>
        <section>
          <h3>Equal on points</h3>
          <ol>{rules.tiebreakText.map((t) => <li key={t}>{t}</li>)}</ol>
          <p>Teams still level on every rule footykit can apply (cards, fair play and lots aren't in the data) share a place (=).</p>
          <p className="fk-ucl-src">Source: <a href={rules.source} target="_blank" rel="noopener noreferrer">Wikipedia, {comp.name}</a></p>
        </section>
      </div>
    </div>
  );
}
