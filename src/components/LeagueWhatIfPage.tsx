// A league's what-if simulator (PLAN.md Phase 5, Decisions log 2026-11-15 "after the UCL"): the matches left to play
// (Pending first, then by window: Weekend Fri–Mon / Midweek Tue–Thu, since ESPN gives leagues no round numbers) and
// the full table rebuilt on every pick with the league's own ties-on-points rules (rankTable, config/leagues.ts),
// zones as on the Tables page. Same controls as the UCL simulator (WhatIfParts.tsx). Its own chunk.

import { useCallback, useMemo, useState } from 'react';
import { LEAGUES, type LeagueZone } from '../../config/leagues';
import type { LeagueSlug } from '../../config/season';
import { leagueMatches, rankTable } from '../data/leagueTable';
import { shortDay } from '../data/model';
import type { Match } from '../data/snapshot';
import { setPick, simMatches, toggleLock, toPlayByWindow, type Sim } from '../data/whatif';
import { TeamLogo } from './Bits';
import { useFooty } from './ctx';
import { HELP, ord, Row, signed, Tools, useFitHeight, useRowFocus, useWhatIf } from './WhatIfParts';
import { Scenarios } from './WhatIfScenarios';
import './ucl.css';
import './whatif.css';

const zoneAt = (zones: LeagueZone[], pos: number) => zones.find((z) => pos >= z.from && pos <= z.to);

export default function LeagueWhatIfPage({ league, today, onBack }: { league: LeagueSlug; today: string; onBack: () => void }) {
  const { model } = useFooty();
  const rules = LEAGUES[league];
  const names = useCallback((id: string) => model.team(id).name, [model]);
  const { members, matches } = useMemo(() => leagueMatches(model.snap, league), [model, league]);
  const rank = useCallback((ms: Match[]) => rankTable(members, ms, rules, names), [members, rules, names]);
  const real = useMemo(() => rank(matches), [rank, matches]);
  const { sim, hist, setHist, change, setMeta, store, onLoad } = useWhatIf(league, matches);
  const [team, setTeam] = useState<string>();
  const [hoverMatch, setHoverMatch] = useState<Match>();

  const table = useMemo(() => rank(simMatches(matches, sim)), [rank, matches, sim]);
  const realPos = useMemo(() => new Map(real.rows.map((r, i) => [r.team, i + 1])), [real]);
  const realRank = useCallback((t: string) => realPos.get(t), [realPos]);

  const left = useMemo(() => toPlayByWindow(matches, today, model.dayOf), [matches, today, model]);
  const mine = (m: Match) => !team || m.h === team || m.a === team;
  const pending = left.pending.filter(mine);
  const windows = left.windows.map((g) => ({ ...g, matches: g.matches.filter(mine) })).filter((g) => g.matches.length);
  const shown = [...pending, ...windows.flatMap((g) => g.matches)];
  const all = [...left.pending, ...left.windows.flatMap((g) => g.matches)];
  const picked = all.filter((m) => sim.picks[m.id]).length;

  const { focusFrom, rowRef } = useRowFocus(shown);
  const { root, height } = useFitHeight();
  const placeOf = useCallback((s: Sim, t: string) => rank(simMatches(matches, s)).rows.findIndex((r) => r.team === t) + 1, [rank, matches]);
  const hoverTeams = hoverMatch ? new Set([hoverMatch.h, hoverMatch.a]) : undefined;
  const legend = rules.zones.filter((z, i, a) => a.findIndex((x) => x.kind === z.kind) === i);
  const comp = model.comp(league);

  const rowOf = (m: Match) => (
    <Row key={m.id} m={m} pick={sim.picks[m.id]} locked={!!sim.locked[m.id]}
      teamTip={(id) => `${model.team(id).name} · ${ord(realPos.get(id) ?? 0)} in the real table`}
      rowRef={rowRef(m.id)}
      onSet={(s, move) => { change((x) => setPick(x, m.id, s)); if (move) focusFrom(m.id, 1); }}
      onLock={() => change((x) => toggleLock(x, m.id))}
      onMove={(d) => focusFrom(m.id, d)} onHover={setHoverMatch} />
  );
  const teams = [...real.rows].sort((x, y) => names(x.team).localeCompare(names(y.team)));
  const windowTitle = (g: (typeof windows)[number]) => {
    const days = [...new Set(g.matches.map((m) => model.dayOf(m)))].sort();
    return `${g.kind === 'wkd' ? 'Weekend' : 'Midweek'} · ${days.length > 1 ? `${shortDay(days[0]!)} – ${shortDay(days.at(-1)!)}` : shortDay(days[0]!)}`;
  };

  return (
    <div className="fk-ucl fk-wi fk-wi-league" data-testid="whatif-page" data-league={league} data-no-marquee>
      <div className="fk-wi-head">
        <button type="button" className="fk-btn" onClick={onBack} title="The real table">← Table</button>
        <h2>What-if <span className="fk-muted">· {comp.name}</span></h2>
        <span className="fk-muted" data-testid="wi-count">{picked} of {all.length} picked</span>
        <select className="fk-wi-team" value={team ?? ''} onChange={(e) => setTeam(e.target.value || undefined)} aria-label="Show one team's matches" data-testid="wi-team">
          <option value="">All teams</option>
          {teams.map((r) => <option key={r.team} value={r.team}>{model.team(r.team).name}</option>)}
        </select>
        <Tools shown={shown} team={team} rank={realRank} hist={hist} change={change} setHist={setHist}
          favTip="the team higher in today's real table wins 1-0" />
        <span className="fk-muted fk-wi-help">{HELP}</span>
      </div>
      <Scenarios store={store} team={team} placeOf={placeOf}
        onStore={(s) => setMeta({ saved: s.saved, active: s.active })} onLoad={onLoad} />
      <div className="fk-wi-cols" ref={root} style={{ height }}>
        <section className="fk-wi-col fk-wi-list" aria-label="Matches left to play">
          <div className="fk-wi-pending" data-testid="wi-pending">
            <div className="fk-wi-group-title">Pending <span className="fk-muted">· postponed or past without a result</span></div>
            {pending.length ? pending.map(rowOf) : <div className="fk-muted fk-wi-none">none</div>}
          </div>
          <div className="fk-wi-scroll">
            {windows.map((g) => (
              <div key={g.start} className="fk-wi-group" data-testid="wi-window">
                <div className="fk-wi-group-title">{windowTitle(g)} <span className="fk-muted">· {g.matches.length}</span></div>
                {g.matches.map(rowOf)}
              </div>
            ))}
            {!shown.length && <div className="fk-muted fk-wi-none">Nothing left to play.</div>}
          </div>
        </section>
        <section className="fk-wi-col fk-wi-table-col" aria-label="Table">
          <div className="fk-wi-group-title">{table.complete ? 'Final table' : `Table · ${all.length - picked} matches still empty`} <span className="fk-muted">· ▲▼ against the real table</span></div>
          <table className="fk-table fk-ucl-table fk-wi-table">
            <thead><tr><th>#</th><th /><th className="fk-tl">Team</th><th>P</th><th>W</th><th>D</th><th>L</th><th>GF</th><th>GA</th><th>GD</th><th>Pts</th></tr></thead>
            <tbody>
              {table.rows.map((r, i) => {
                const p = i + 1;
                const z = zoneAt(rules.zones, p);
                const end = !!z && zoneAt(rules.zones, p + 1)?.kind !== z.kind;
                const move = realPos.get(r.team)! - p;
                const cls = `${z ? `fk-lz-${z.kind}` : ''}${z?.maybe ? ' fk-lz-maybe' : ''}${end ? ' fk-zone-end' : ''}${r.team === team ? ' fk-wi-me' : ''}${hoverTeams?.has(r.team) ? ' fk-ucl-hover' : ''}`;
                const tip = [z ? `${z.label}${z.maybe ? `\nOnly ${z.maybe}` : ''}` : '', r.level ? 'Level on every rule the data allows (shared place)' : ''].filter(Boolean).join('\n');
                return (
                  <tr key={r.team} className={cls} data-testid="wi-row" data-team={model.team(r.team).abbr}>
                    <td className="fk-rank" title={tip || undefined}>{r.rank}{r.level && <span className="fk-ucl-eq">=</span>}</td>
                    <td className={`fk-wi-move${move > 0 ? ' fk-wi-up' : move < 0 ? ' fk-wi-down' : ''}`} title={`Real table: ${ord(realPos.get(r.team)!)}`}>{move > 0 ? `▲${move}` : move < 0 ? `▼${-move}` : ''}</td>
                    <td className="fk-tl fk-ucl-team">
                      <button type="button" className="fk-wi-teambtn" title={team === r.team ? 'Show every team\'s matches' : `Show ${model.team(r.team).short}'s matches only`} onClick={() => setTeam(team === r.team ? undefined : r.team)}>
                        <TeamLogo id={r.team} size={16} /> {model.team(r.team).short}
                      </button>
                    </td>
                    <td>{r.p}</td><td>{r.w}</td><td>{r.d}</td><td>{r.l}</td><td>{r.gf}</td><td>{r.ga}</td>
                    <td>{signed(r.gd)}</td><td className="fk-pts">{r.pts}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="fk-ucl-key fk-wi-key">
            {legend.map((z) => <span key={z.kind} className={`fk-ucl-zone-key fk-lz-${z.kind}`}>{z.label}</span>)}
            {rules.zones.some((z) => z.maybe) && <span className="fk-ucl-zone-key fk-lz-maybe-key">hatched: only with some outcomes</span>}
          </div>
          <p className="fk-muted fk-wi-note">Ties on points: {rules.tiebreakText.slice(1).join(' · ')}.{league === 'bra.1' ? ' Libertadores / Sudamericana places here are the base places by position; places passed down by the cup finals are not simulated yet.' : ''}</p>
        </section>
      </div>
    </div>
  );
}
