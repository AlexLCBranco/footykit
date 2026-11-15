// A league's table page (PLAN.md Phase 4): the table rebuilt with the league's ties-on-points rules
// (src/data/leagueTable.ts), each row's last 5 results and next 3 matches as squares, zones by meaning (hatched where
// only some outcomes give the place), the rules and sources under it. The Brasileirão also lists the finals that can
// still open Libertadores places. Its own chunk, like the UCL page.

import { useMemo, type ReactNode } from 'react';
import { BRA_EXTRA_FINALS, BRA_EXTRA_SOURCES, LEAGUES, type LeagueZone } from '../../config/leagues';
import type { LeagueSlug } from '../../config/season';
import { tieWinner } from '../data/alive';
import { leagueTable } from '../data/leagueTable';
import { dayLabel, isPlayed, kickoffTime, shortDay } from '../data/model';
import { matchUrl, type Match } from '../data/snapshot';
import { TeamLink } from './Bits';
import { useFooty } from './ctx';
import './ucl.css';

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
    'Open the match on ESPN',
  ].filter(Boolean).join('\n');
  return (
    <a className={`fk-usq fk-usq-${res ?? 'next'}${m.st === 'in' || (!played && day === today) ? ' fk-usq-now' : ''}`} href={matchUrl(m.id)} target="_blank" rel="noopener noreferrer" draggable={false} title={tip} data-testid="league-square">
      <span className="fk-usq-opp"><span className="fk-usq-at">{home ? 'vs' : '@'}</span>{opp.abbr}</span>
      <span className="fk-usq-res">{played ? `${gf}-${ga}` : m.st === 'ppd' ? 'PPD' : shortDay(day)}</span>
    </a>
  );
}

/** The Brasileirão's pending finals and what each can open (results read from the snapshot). */
function BraExtras() {
  const { model } = useFooty();
  return (
    <section className="fk-lt-extra" data-testid="bra-extras">
      <h3>Possible extra Libertadores places</h3>
      <ul>
        {BRA_EXTRA_FINALS.map((f) => {
          const legs = model.snap.matches.filter((m) => m.c === f.comp && /^final$/i.test((m.r ?? '').trim()));
          const last = legs[legs.length - 1];
          const winner = last && tieWinner(last);
          const nm = (id: string) => model.team(id).short.trim();
          const who = last ? `${nm(last.h)} v ${nm(last.a)}, ${shortDay(model.dayOf(last))}${winner ? ` — won by ${nm(winner)}` : ''}` : 'final not in the data';
          return <li key={f.comp}><b>{f.what.split(':')[0]}</b> ({who}):{f.what.split(':').slice(1).join(':')}.</li>;
        })}
      </ul>
      <p className="fk-ucl-src">Sources: {BRA_EXTRA_SOURCES.map((s, i) => <a key={s} href={s} target="_blank" rel="noopener noreferrer">{i ? 'bahia.ba' : 'Wikipedia (pt)'}</a>).reduce<ReactNode[]>((a, x, i) => (i ? [...a, ' · ', x] : [x]), [])}</p>
    </section>
  );
}

const zoneAt = (zones: LeagueZone[], pos: number) => zones.find((z) => pos >= z.from && pos <= z.to);

export default function LeagueTablePage({ league, today }: { league: LeagueSlug; today: string }) {
  const { model } = useFooty();
  const rules = LEAGUES[league];
  const table = useMemo(() => leagueTable(model.snap, league), [model, league]);
  const comp = model.comp(league);
  const played = Math.max(0, ...table.rows.map((r) => r.p));
  const legend = rules.zones.filter((z, i, a) => a.findIndex((x) => x.kind === z.kind) === i);
  return (
    <div className="fk-ucl fk-lt" data-testid="league-page" data-league={league}>
      <div className="fk-ucl-head">
        <h2>{comp.name}</h2>
        <span className="fk-muted">{table.complete ? 'final table' : `after ${played} rounds`}</span>
        <span className="fk-ucl-key">
          {legend.map((z) => <span key={z.kind} className={`fk-ucl-zone-key fk-lz-${z.kind}`}>{z.label}</span>)}
          {rules.zones.some((z) => z.maybe) && <span className="fk-ucl-zone-key fk-lz-maybe-key">hatched: only with some outcomes</span>}
        </span>
      </div>
      <table className="fk-table fk-ucl-table">
        <thead>
          <tr>
            <th>#</th><th className="fk-tl">Team</th><th>P</th><th>W</th><th>D</th><th>L</th><th>GF</th><th>GA</th><th>GD</th><th>Pts</th>
            <th className="fk-tl" title="The last 5 league results and the next 3 league matches">Last 5 · next 3</th>
          </tr>
        </thead>
        <tbody>
          {table.rows.map((r, i) => {
            const pos = i + 1;
            const z = zoneAt(rules.zones, pos);
            const end = z && z.to === pos;
            const tip = [z ? `${z.label}${z.maybe ? `\nOnly ${z.maybe}` : ''}` : '', r.level ? 'Level with another team on every rule the data allows (shared place)' : ''].filter(Boolean).join('\n');
            return (
              <tr key={r.team} className={`${z ? `fk-lz-${z.kind}` : ''}${z?.maybe ? ' fk-lz-maybe' : ''}${end ? ' fk-zone-end' : ''}`} data-testid="league-row" data-team={model.team(r.team).abbr}>
                <td className="fk-rank" title={tip || undefined}>{r.rank}{r.level && <span className="fk-ucl-eq">=</span>}</td>
                <td className="fk-tl fk-ucl-team"><TeamLink id={r.team} day={today} label="short" /></td>
                <td>{r.p}</td><td>{r.w}</td><td>{r.d}</td><td>{r.l}</td><td>{r.gf}</td><td>{r.ga}</td>
                <td>{r.gd > 0 ? `+${r.gd}` : r.gd < 0 ? `−${-r.gd}` : 0}</td>
                <td className="fk-pts">{r.pts}</td>
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
          })}
        </tbody>
      </table>
      {league === 'bra.1' && <BraExtras />}
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
