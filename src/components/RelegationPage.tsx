// FK-72: a league's relegation race (Leagues › a league › Relegation): the rules in plain words at the top (how many
// go down, the play-off, what splits teams with the same points, an example with today's teams), then the teams in
// the drop zone and close to it (src/data/relegation.ts) with points, the gap, games left, last 5 and next 3 as
// squares, and the games these teams still play against each other. Its own chunk, like the table page.

import { useMemo } from 'react';
import type { LeagueSlug } from '../../config/season';
import { dayLabel, kickoffTime } from '../data/model';
import { gapText, relegationRace, statusText } from '../data/relegation';
import { relegationRules } from '../data/relegationRules';
import { matchUrl } from '../data/snapshot';
import { ordinal } from '../data/tags';
import { TeamLink } from './Bits';
import { useFooty } from './ctx';
import { Square } from './LeagueTablePage';
import './ucl.css';

const ZONE_CLASS = { down: 'fk-lz-rel', playoff: 'fk-lz-relpo', close: '' } as const;

export default function RelegationPage({ league, today, onTable }: { league: LeagueSlug; today: string; onTable: () => void }) {
  const { model, timeZone } = useFooty();
  const comp = model.comp(league);
  const race = useMemo(() => relegationRace(model.snap, league), [model, league]);
  const rules = useMemo(() => relegationRules(league, comp.name, race, (t) => model.team(t).name), [league, comp.name, race, model]);
  return (
    <div className="fk-ucl fk-lt fk-rel" data-testid="rel-page" data-league={league}>
      <div className="fk-ucl-head">
        <h2>{comp.name} <span className="fk-muted">· relegation race</span></h2>
        <button type="button" className="fk-btn" onClick={onTable} title={`The whole ${comp.name} table`} data-testid="rel-to-table">See the whole table</button>
      </div>

      <div className="fk-rel-rules" data-testid="rel-rules">
        <section>
          <h3>Who goes down</h3>
          {rules.basics.map((t) => <p key={t}>{t}</p>)}
        </section>
        <section>
          <h3>Two teams with the same points? This decides, from top to bottom</h3>
          <ol>{rules.level.map((t) => <li key={t}>{t}</li>)}</ol>
        </section>
        <section>
          {rules.example.length > 0 && (
            <>
              <h3>Right now</h3>
              <div data-testid="rel-example">{rules.example.map((t) => <p key={t}>{t}</p>)}</div>
            </>
          )}
          <h3>Who is on this page</h3>
          {rules.listed.map((t) => <p key={t}>{t}</p>)}
          <p className="fk-ucl-src">Source: <a href={rules.source} target="_blank" rel="noopener noreferrer">Wikipedia, {comp.name}</a></p>
        </section>
      </div>

      {race.rows.length === 0 ? (
        <p className="fk-empty" data-testid="rel-empty">No games played yet. The race starts after the first round.</p>
      ) : (
        <>
          {race.complete && <p className="fk-muted" data-testid="rel-over">The season is over. This is how it ended.</p>}
          <table className="fk-table fk-ucl-table fk-rel-table" data-testid="rel-table">
            <thead>
              <tr>
                <th title="Place in the league table">#</th>
                <th className="fk-tl">Team</th>
                <th className="fk-tl" title="In the drop zone, in the play-off place, or close above the drop zone">Where it stands</th>
                <th title="Points">Points</th>
                <th className="fk-tl" title="In the drop zone: how many points behind the last safe team. Above it: how many points ahead of the drop zone.">Gap</th>
                <th title="League games this team still has to play">Games left</th>
                {/* FK-72 / IDEAS I-15: the odds column goes here (each team's odds of going down), once the odds API exists */}
                <th className="fk-tl" title="The last 5 league results and the next 3 league games">Last 5 · next 3</th>
              </tr>
            </thead>
            <tbody>
              {race.rows.map((r, i) => (
                <tr key={r.team} className={`${ZONE_CLASS[r.status]}${race.rows[i + 1] && race.rows[i + 1]!.status !== r.status ? ' fk-zone-end' : ''}`} data-testid="rel-row" data-team={model.team(r.team).abbr} data-status={r.status}>
                  <td className="fk-rank" title={`${ordinal(r.place)} of ${race.size}`}>{r.place}</td>
                  <td className="fk-tl fk-ucl-team"><TeamLink id={r.team} day={today} label="short" /></td>
                  <td className={`fk-tl fk-rel-status fk-rel-${r.status}`} data-testid="rel-status">{statusText(r.status, race.complete)}</td>
                  <td className="fk-pts" data-testid="rel-pts">{r.pts}</td>
                  <td className="fk-tl" data-testid="rel-gap" data-gap={r.gap}>{gapText(r)}</td>
                  <td data-testid="rel-left">{r.left}</td>
                  <td className="fk-tl">
                    <span className="fk-lt-squares">
                      {Array.from({ length: 5 - r.row.last.length }, (_, k) => <span key={`e${k}`} />)}
                      {r.row.last.map((m) => <Square key={m.id} m={m} team={r.team} today={today} />)}
                      <span className="fk-lt-gap" />
                      {r.row.next.map((m) => <Square key={m.id} m={m} team={r.team} today={today} />)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <section className="fk-lt-extra fk-rel-between" data-testid="rel-between">
            <h3>Games between these teams still to play</h3>
            <p className="fk-muted">These count double: the winner gains 3 points and a rival gets none.</p>
            {race.between.length === 0 ? <p data-testid="rel-between-none">None left.</p> : (
              <ul>
                {race.between.map((m) => (
                  <li key={m.id} data-testid="rel-between-match">
                    <span className="fk-rel-when">{dayLabel(model.dayOf(m))}{m.tbd ? '' : `, ${kickoffTime(m.t, timeZone)}`}</span>
                    <TeamLink id={m.h} day={today} label="short" /> <span className="fk-muted">at home to</span> <TeamLink id={m.a} day={today} label="short" />
                    {m.st === 'ppd' && <span className="fk-muted"> · postponed, no new date yet</span>}
                    <a className="fk-rel-search" href={matchUrl(m, model)} target="_blank" rel="noopener noreferrer" title="Search the match on Google">↗</a>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
