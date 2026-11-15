// The Champions League page (PLAN.md Phase 4, step 1): the league-phase table of all 36 teams with each team's 8
// matches as squares (calendarkit's Cup squares, with draws and pots), zones, where each position leads, the remaining
// opponents, and the rules it follows (config/ucl.ts). Its own chunk: the day views never download it.

import { useMemo, useState } from 'react';
import { UCL_KNOCKOUT_SOURCE, UCL_POTS, UCL_POTS_SOURCE, UCL_TIEBREAKERS, UCL_REGS, UCL_TIEBREAKERS_SOURCE, UCL_ZONES } from '../../config/ucl';
import { dayLabel, kickoffTime, shortDay } from '../data/model';
import { matchUrl } from '../data/snapshot';
import { positionPath, remaining, uclTable, zoneOf, type UclRow, type UclSlot } from '../data/ucl';
import { stakeChips } from '../data/uclStakes';
import { TeamLink } from './Bits';
import { useFooty } from './ctx';
import { UclKnockout } from './UclKnockout';
import './ucl.css';

const RESULT = { W: 'Won', D: 'Drew', L: 'Lost' } as const;
/** Stakes chips from the eve of matchday 7 (Alex, 2026-11-15): earlier the sure bounds rarely settle anything. */
const STAKES_FROM_MATCHDAY = 6;

function Square({ s, team, today }: { s: UclSlot; team: string; today: string }) {
  const { model, timeZone } = useFooty();
  const opp = model.team(s.opp);
  const day = model.dayOf(s.m);
  const when = `${dayLabel(day)}${s.m.tbd ? '' : `, ${kickoffTime(s.m.t, timeZone)}`}`;
  const where = s.home ? 'vs' : 'at';
  const venue = [s.m.v, s.m.city].filter(Boolean).join(', ');
  const tip = [
    s.played ? `${RESULT[s.res!]} ${s.gf}-${s.ga} ${where} ${opp.name}` : `${model.team(team).short} ${where} ${opp.name}`,
    `${opp.name}: pot ${s.pot}`,
    when + (venue ? ` · ${venue}` : ''),
    s.m.st === 'ppd' ? 'Postponed' : '',
    'Open the match on ESPN',
  ].filter(Boolean).join('\n');
  const now = s.m.st === 'in' || (!s.played && day === today);
  return (
    <a className={`fk-usq fk-usq-${s.res ?? 'next'}${now ? ' fk-usq-now' : ''}`} href={matchUrl(s.m.id)} target="_blank" rel="noopener noreferrer" draggable={false} title={tip} data-testid="ucl-square" data-pot={s.pot}>
      <span className="fk-usq-opp"><span className="fk-usq-at">{s.home ? 'vs' : '@'}</span>{opp.abbr}</span>
      <span className="fk-usq-res">{s.played ? `${s.gf}-${s.ga}` : shortDay(day)}</span>
      <span className="fk-usq-pot" aria-label={`pot ${s.pot}`}>{s.pot}</span>
    </a>
  );
}

function Left({ row, ranks }: { row: UclRow; ranks: Map<string, number> }) {
  const { model } = useFooty();
  const left = remaining(row);
  if (!left.length) return <span className="fk-muted">—</span>;
  const tip = ['Still to play (pot, place now):', ...left.map((s) => `${s.home ? 'vs' : '@'} ${model.team(s.opp).name} — pot ${s.pot}, ${ranks.get(s.opp)}`)].join('\n');
  return (
    <span className="fk-ucl-left" title={tip}>
      {[...left].sort((a, b) => a.pot - b.pot).map((s) => <span key={s.m.id} className={`fk-pot fk-pot-${s.pot}`}>{s.pot}</span>)}
    </span>
  );
}

export default function UclPage({ today, onWhatIf }: { today: string; onWhatIf?: () => void }) {
  const { model } = useFooty();
  const table = useMemo(() => uclTable(model.snap, (id) => model.team(id).name), [model]);
  const [hover, setHover] = useState<number | null>(null);
  const related = hover ? new Set(positionPath(hover).related) : undefined;
  const ranks = new Map(table.rows.map((r) => [r.team, r.rank]));
  const showStakes = !table.complete && table.matchday >= STAKES_FROM_MATCHDAY;
  const stakes = useMemo(() => new Map(showStakes ? table.rows.map((r) => { const next = remaining(r)[0]; return [r.team, stakeChips(table, r.team, next ? model.team(next.opp).name : undefined)]; }) : []), [table, showStakes, model]);
  const levelText = table.complete ? 'level on criteria 1–8: decided by cards or club coefficient (not in the data)' : 'level on criteria 1–5 (the rest apply once the league phase is over)';
  return (
    <div className="fk-ucl" data-testid="ucl-page">
      <div className="fk-ucl-head">
        <h2>Champions League <span className="fk-muted">· league phase</span></h2>
        <span className="fk-muted" data-testid="ucl-matchday">{table.complete ? 'final table' : `after matchday ${table.matchday} of 8`}</span>
        {onWhatIf && !table.complete && <button type="button" className="fk-btn" onClick={onWhatIf} title="Pick the results left to play and see the table and the knockout places change" data-testid="ucl-whatif">Simulator</button>}
        <span className="fk-ucl-key">
          {UCL_ZONES.map((z) => <span key={z.id} className={`fk-ucl-zone-key fk-zone-${z.id}`}>{z.from}–{z.to} {z.label}</span>)}
        </span>
      </div>
      <table className="fk-table fk-ucl-table" onMouseLeave={() => setHover(null)}>
        <thead>
          <tr>
            <th>#</th><th className="fk-tl">Team</th><th>P</th><th>W</th><th>D</th><th>L</th><th>GF</th><th>GA</th><th>GD</th><th>Pts</th>
            <th className="fk-tl">Last 5</th><th className="fk-tl" title="The 8 league-phase matches in date order; the small number is the opponent's pot">Matches</th><th className="fk-tl" title="Pots of the opponents still to play">Left</th>
            {showStakes && <th className="fk-tl" title="What is settled, and what the next match can settle (points only: a claim holds whatever else happens)">Stakes</th>}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((r, i) => {
            const pos = i + 1;
            const zone = zoneOf(pos);
            const path = positionPath(pos).text;
            const cls = `fk-zone-${zone.id}${zone.to === pos ? ' fk-zone-end' : ''}${hover === pos ? ' fk-ucl-hover' : ''}${related?.has(pos) ? ' fk-ucl-related' : ''}`;
            return (
              <tr key={r.team} className={cls} data-testid="ucl-row" data-team={model.team(r.team).abbr}>
                <td className="fk-rank" title={`${path}${r.level ? `\nShared place: ${levelText}` : ''}`} onMouseEnter={() => setHover(pos)} data-testid="ucl-rank">
                  {r.rank}{r.level && <span className="fk-ucl-eq">=</span>}
                </td>
                <td className="fk-tl fk-ucl-team">
                  <TeamLink id={r.team} day={today} label="short" />
                  <span className={`fk-pot fk-pot-${r.pot}`} title={`Pot ${r.pot}`}>{r.pot}</span>
                </td>
                <td>{r.p}</td><td>{r.w}</td><td>{r.d}</td><td>{r.l}</td><td>{r.gf}</td><td>{r.ga}</td>
                <td>{r.gd > 0 ? `+${r.gd}` : r.gd < 0 ? `−${-r.gd}` : 0}</td>
                <td className="fk-pts">{r.pts}</td>
                <td className="fk-tl"><span className="fk-form fk-form-plain" title="Last 5 league-phase results">{Array.from({ length: 5 }, (_, k) => { const x = r.last5[k - (5 - r.last5.length)]; return <span key={k} className={`fk-form-sq${x ? ` fk-form-${x}` : ''}`} />; })}</span></td>
                <td className="fk-tl"><span className="fk-ucl-squares">{r.slots.map((s) => <Square key={s.m.id} s={s} team={r.team} today={today} />)}</span></td>
                <td className="fk-tl"><Left row={r} ranks={ranks} /></td>
                {showStakes && <td className="fk-tl fk-ucl-stakes">{stakes.get(r.team)!.map((c) => <span key={c.text} className={`fk-stake fk-stake-${c.kind}`} title={c.tip} data-testid="ucl-stake">{c.text}</span>)}</td>}
              </tr>
            );
          })}
        </tbody>
      </table>
      <UclKnockout table={table} today={today} />
      <div className="fk-ucl-rules" data-testid="ucl-rules">
        <section>
          <h3>Where each place leads</h3>
          <p>Hover a place (#) to see its path; the places it can meet light up.</p>
          <ul>
            <li>1st–8th: round of 16, seeded. 9th–24th: knockout play-off, 9th–16th seeded (2nd leg at home). 25th–36th: out, no Europa League place.</li>
            <li>Play-offs: 9th/10th v 23rd/24th → meets 7th/8th · 11th/12th v 21st/22nd → 5th/6th · 13th/14th v 19th/20th → 3rd/4th · 15th/16th v 17th/18th → 1st/2nd. Which of the two is drawn.</li>
            <li>No country protection in the knockout phase. Ties: aggregate, then extra time, then penalties (no away goals).</li>
          </ul>
          <p className="fk-ucl-src">Sources: <a href={UCL_REGS} target="_blank" rel="noopener noreferrer">UEFA regulations 2026/27</a> (Art. 19) · <a href={UCL_KNOCKOUT_SOURCE[1]} target="_blank" rel="noopener noreferrer">Wikipedia</a></p>
        </section>
        <section>
          <h3>Equal on points</h3>
          <ol>{UCL_TIEBREAKERS.map((t) => <li key={t}>{t}</li>)}</ol>
          <p>During the league phase the table uses 1–5 and shows teams still level as sharing a place (=); after the last matchday it uses 1–8. Places decided by 9–10 are marked, not guessed.</p>
          <p className="fk-ucl-src">Source: <a href={UCL_TIEBREAKERS_SOURCE} target="_blank" rel="noopener noreferrer">UEFA regulations 2026/27, Art. 18</a></p>
        </section>
        <section>
          <h3>Pots</h3>
          {UCL_POTS.map((p) => (
            <p key={p.pot} className="fk-ucl-pot-line"><span className={`fk-pot fk-pot-${p.pot}`}>{p.pot}</span> {p.teams.map((t) => model.team(t).short).join(', ')}</p>
          ))}
          <p>Each team plays two teams of each pot, one at home and one away.</p>
          <p className="fk-ucl-src">Source: <a href={UCL_POTS_SOURCE} target="_blank" rel="noopener noreferrer">Wikipedia, 2026–27 league phase</a></p>
        </section>
      </div>
    </div>
  );
}
