// FK-71: the World Cup's thirds race on the edition page (2026 on): the point-in-time switch (after matchday 1 / 2 /
// final), a status on every row (Through / Out / Open, only when certain), the matches still to play, the third-placed
// teams with the cut line, the round of 32 "as it stands", who a team would face from each place it can still finish,
// and the rules in plain words with real examples. Logic: src/data/wcRace.ts.

import type { ReactNode } from 'react';
import { CERTAIN_LABEL, CERTAIN_TIP, matchups, pairingRow, thirdsExample, tieExample, type Certain, type Matchup, type Race, type Standing } from '../data/wcRace';
import type { Slot, Source } from '../data/wcSim';
import { groupTables, THIRDS_THROUGH, thirdsRanking, type WcEdition, type WcMatch } from '../data/worldcup';
import { Flag } from './WcBracket';
import { rowClick, Team, Th } from './WorldCupPage';
import './wcRace.css';

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const dayText = (d: string) => { const [, m, day] = d.split('-'); return `${Number(day)} ${MON[Number(m) - 1]}`; };
const ORD = ['', '1st', '2nd', '3rd', '4th'];
/** "A", "A or B", "A, B or C" */
const orList = (xs: string[]) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} or ${xs[xs.length - 1]}`);
const andList = (xs: string[]) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
const signed = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${-n}` : '0');

/** "After matchday 1 / After matchday 2 / Final": the point of the group stage the page shows. */
export function PointSwitch({ last, at, onAt }: { last: number; at?: number; onAt: (at?: number) => void }) {
  const points: [number | undefined, string, string][] = [
    ...Array.from({ length: last - 1 }, (_, i): [number, string, string] => [i + 1, `After matchday ${i + 1}`, `Go back in time: the tables as they stood when every team had played ${i + 1} match${i ? 'es' : ''}`]),
    [undefined, 'Final', 'The tables after every group match'],
  ];
  return (
    <div className="fk-tabs" role="tablist" aria-label="Point of the group stage" data-testid="wc-point">
      {points.map(([p, label, tip]) => <button key={label} type="button" role="tab" aria-selected={at === p} className={`fk-tab${at === p ? ' fk-tab-on' : ''}`} title={tip} onClick={() => onAt(p)} data-point={p ?? 'final'}>{label}</button>)}
    </div>
  );
}

export function StatusChip({ s }: { s: Certain }) {
  return <span className={`fk-race-status fk-race-${s === 'top2' ? 'through' : s}`} title={CERTAIN_TIP[s]} data-testid="wc-status" data-status={s}>{CERTAIN_LABEL[s]}</span>;
}

/** A group's matches not played yet at this point: teams, date, time, city. */
export function StillToPlay({ ed, matches }: { ed: WcEdition; matches: WcMatch[] }) {
  if (!matches.length) return null;
  const n = (c: string) => ed.teams[c] ?? c;
  return (
    <div className="fk-race-left" data-testid="wc-left">
      <div className="fk-race-left-title">Still to play</div>
      {matches.map((m) => <div key={m.n} className="fk-race-left-row" data-testid="wc-left-match" data-n={m.n}><b>{n(m.h)}</b> v <b>{n(m.a)}</b><span className="fk-muted"> · {dayText(m.date)}{m.time ? ` · ${m.time}` : ''}{m.city ? ` · ${m.city}` : ''}</span></div>)}
    </div>
  );
}

/** The teams third in their group right now, best first, a line under the 8th, a status on each. */
export function RaceThirds({ ed, r, onTeam, onMatchups }: { ed: WcEdition; r: Race; onTeam: (c: string) => void; onMatchups?: (c: string) => void }) {
  return (
    <table className="fk-table fk-ucl-table fk-wc-group fk-wc-thirds fk-race-thirds" data-testid="wc-race-thirds">
      <caption>Teams in third place{r.complete ? '' : ' right now'} <span className="fk-muted">(the best {THIRDS_THROUGH} of the {r.thirds.length} go on; the line shows where the list is cut)</span></caption>
      <thead><tr><Th k="#" /><th>Group</th><th className="fk-tl">Team</th><Th k="Pts" /><Th k="P" /><Th k="GD" /><Th k="GF" /><th className="fk-tl" title="Through or Out is shown only when nothing in the matches left can change it">For sure?</th>{onMatchups && <th />}</tr></thead>
      <tbody>
        {r.thirds.map((row, i) => (
          <tr key={row.team} className={`fk-wc-rowlink${i < THIRDS_THROUGH ? ' fk-lz-uclq' : ''}${i === THIRDS_THROUGH - 1 ? ' fk-race-cut' : ''}`} onClick={rowClick(() => onTeam(row.team))} data-testid="wc-race-third" data-team={row.team} data-in={i < THIRDS_THROUGH || undefined} data-cut={i === THIRDS_THROUGH - 1 || undefined}>
            <td className="fk-rank" title={row.level ? 'Level on points, goal difference and goals scored. FIFA then looks at yellow and red cards: the app does not have them' : undefined}>{row.rank}{row.level && <span className="fk-ucl-eq">=</span>}</td>
            <td title={row.group}>{row.group.replace('Group ', '')}</td>
            <td className="fk-tl fk-ucl-team"><Team ed={ed} code={row.team} onTeam={onTeam} /></td>
            <td className="fk-pts">{row.pts}</td><td>{row.p}</td><td>{signed(row.gd)}</td><td>{row.gf}</td>
            <td className="fk-tl"><StatusChip s={r.status.get(row.team) ?? 'open'} /></td>
            {onMatchups && <td><WhoButton ed={ed} team={row.team} onMatchups={onMatchups} /></td>}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function WhoButton({ ed, team, onMatchups }: { ed: WcEdition; team: string; onMatchups: (c: string) => void }) {
  const name = ed.teams[team] ?? team;
  return <button type="button" className="fk-race-who" title={`Who would ${name} play next?`} aria-label={`Who would ${name} play next?`} onClick={() => onMatchups(team)} data-testid="wc-who" data-team={team}>Who next?</button>;
}

const sourcePlain = (s: Source, vs?: Record<string, string>) => (s.kind === 'place' ? `${ORD[s.pos]} of Group ${s.group}` : s.kind === 'third' ? (vs?.[s.vs] ? `3rd of Group ${vs[s.vs]!.slice(1)}` : 'a 3rd-placed team') : '');

/** The round of 32 if the group stage ended right now: not real fixtures. */
export function StandingBracket({ ed, r, st, onTeam }: { ed: WcEdition; r: Race; st: Standing[]; onTeam: (c: string) => void }) {
  const vs = pairingRow(ed, r.thirdsIn)?.vs;
  const side = (code: string | undefined, s: Source) => (
    <div className="fk-race-pair-side">
      {code ? <><Flag ed={ed} code={code} /><Team ed={ed} code={code} onTeam={onTeam} squad={false} /></> : <span className="fk-muted">not known yet</span>}
      <span className="fk-muted fk-race-pair-from">{sourcePlain(s, vs)}</span>
    </div>
  );
  return (
    <section className="fk-race-now" data-testid="wc-standing">
      <h3>{st[0]?.slot.stage ?? 'Round of 32'} as it stands <span className="fk-muted">{r.complete ? 'the group stage is over: these are the matches' : 'if the group stage ended right now, these would be the matches. They are not real fixtures.'}</span></h3>
      <div className="fk-race-pairs">
        {st.map((x) => <div key={x.slot.n} className="fk-race-pair" data-testid="wc-standing-tie" data-n={x.slot.n} data-h={x.h} data-a={x.a}>{side(x.h, x.slot.from[0])}{side(x.a, x.slot.from[1])}</div>)}
      </div>
    </section>
  );
}

/** Who a team would face, for each place it can still finish. */
export function MatchupsPanel({ ed, r, slots, team, onClose }: { ed: WcEdition; r: Race; slots: Slot[]; team: string; onClose: () => void }) {
  const n = (c?: string) => (c ? ed.teams[c] ?? c : undefined);
  const name = n(team)!;
  const t = r.tables.find((x) => x.rows.some((row) => row.team === team));
  const g = t?.group.name.replace('Group ', '') ?? '';
  const ms = matchups(ed, r, slots, team);
  const places = r.places.get(team) ?? [];
  const sideText = (m: Matchup) => (m.side ? ` That match is on the ${m.side} side of the bracket.` : '');
  const line = (m: Matchup): ReactNode => {
    if (m.versus.kind === 'place') return <>They play the team that finishes {ORD[m.versus.pos]} in Group {m.versus.group}.{m.now ? <> Right now that is <b>{n(m.now)}</b>.</> : null}{sideText(m)}</>;
    if (m.versus.kind === 'thirds') return <>They play a team that finished 3rd in its group: from Group {orList(m.versus.groups)}.{m.now ? <> Right now that would be <b>{n(m.now)}</b>.</> : null}{sideText(m)}</>;
    const w = m.versus.groups;
    return (
      <>A 3rd place goes on only if it is one of the best {THIRDS_THROUGH}. Right now Group {g}&apos;s 3rd place <b>{m.throughNow ? 'is' : 'is not'}</b> one of them.
        {w.length ? <> If it goes on, they play the winner of Group {orList(w)}.</> : <> It can no longer be one of them.</>}
        {m.now ? <> Right now that would be <b>{n(m.now)}</b>.</> : null}{sideText(m)}</>
    );
  };
  return (
    <section className="fk-wc-history fk-race-matchups" data-testid="wc-matchups" data-team={team}>
      <h3>Who would {name} play next? <span className="fk-muted">Group {g} · {r.complete ? 'the group stage is over' : `can still finish ${orList(places.map((p) => ORD[p]!))}`}</span>
        <button type="button" className="fk-club-clear" aria-label="Close" title="Close" onClick={onClose} data-testid="wc-matchups-close">×</button>
      </h3>
      {ms.map((m) => <p key={m.place} data-testid="wc-matchup" data-place={m.place} data-now={m.now} data-groups={m.versus.kind === 'place' ? m.versus.group : m.versus.groups.join('')}><b>If {name} finish {ORD[m.place]}:</b> {line(m)}</p>)}
      {places.includes(4) && <p data-testid="wc-matchup" data-place={4}><b>If {name} finish 4th:</b> they are out. The last team of a group never goes on.</p>}
    </section>
  );
}

/** The rules in plain words, with examples from the edition's real teams. */
export function RulesBox({ ed, onClose }: { ed: WcEdition; onClose: () => void }) {
  const n = (c: string) => ed.teams[c] ?? c;
  const tables = groupTables(ed).filter((t) => t.group.stage === 'Group stage');
  const groups = tables.length, per = tables[0]?.rows.length ?? 4, teams = tables.reduce((s, t) => s + t.rows.length, 0);
  const thirds = thirdsRanking(tables);
  const inn = thirds.slice(0, THIRDS_THROUGH).map((x) => x.group.replace('Group ', '')).sort();
  const row = pairingRow(ed, inn);
  const ex3 = thirdsExample(ed), exTie = tieExample(ed);
  const first = row && Object.entries(row.vs)[0];
  const winner = first && tables.find((t) => t.group.name === `Group ${first[0].slice(1)}`)?.rows[0]?.team;
  const third = first && tables.find((t) => t.group.name === `Group ${first[1].slice(1)}`)?.rows[2]?.team;
  const stat = (x: { pts: number; gd: number; gf: number }) => `${x.pts} points, goal difference ${signed(x.gd)}, ${x.gf} goals scored`;
  return (
    <section className="fk-wc-history fk-race-rules" data-testid="wc-rules-box">
      <h3>The rules, in plain words <span className="fk-muted">World Cup {ed.year}</span>
        <button type="button" className="fk-club-clear" aria-label="Close the rules" title="Close" onClick={onClose} data-testid="wc-rules-close">×</button>
      </h3>
      <div className="fk-race-rules-cols">
        <div>
          <h4>Who goes on</h4>
          <p>{teams} teams play in {groups} groups of {per}.</p>
          <p>Every team plays the other {per - 1} teams in its group once.</p>
          <p>A win gives {ed.win} points. A draw gives 1 point. A loss gives 0.</p>
          <p>The teams that finish 1st and 2nd in each group go on. That is {groups * 2} teams.</p>
          <p>The {groups} teams that finish 3rd are put in one list. The best {THIRDS_THROUGH} of them go on too.</p>
          <p>That makes {groups * 2 + THIRDS_THROUGH} teams in the knockout rounds. From there, lose once and you go home.</p>
          <h4>Two teams in a group have the same points</h4>
          <p>1. Look only at the matches between those teams. Who got more points there is higher.</p>
          <p>2. Still the same? Who has the better goal difference in those matches is higher. Goal difference is goals scored minus goals let in.</p>
          <p>3. Still the same? Who scored more goals in those matches is higher.</p>
          <p>4. Still the same? Now look at all three group matches: better goal difference, then more goals scored.</p>
          <p>5. Still the same? FIFA counts yellow and red cards (fewer is better), then uses its world ranking. The app does not have the cards or the ranking, so it shows those teams as level with an = sign.</p>
          {exTie && (
            <p className="fk-race-example" data-testid="wc-rules-tie-example"><b>Example:</b> in Group {exTie.group}, {n(exTie.high)} and {n(exTie.low)} both had {exTie.pts} points.{' '}
              {exTie.by === 'match' ? <>{n(exTie.high)} beat {n(exTie.low)} {exTie.score![0]}–{exTie.score![1]}, so {n(exTie.high)} finished higher.</>
                : <>Their match ended {exTie.score![0]}–{exTie.score![1]}, a draw. So all the group matches counted: {n(exTie.high)} had {exTie.by === 'goal difference' ? `goal difference ${signed(exTie.values![0])}` : `${exTie.values![0]} goals scored`}, {n(exTie.low)} had {exTie.by === 'goal difference' ? signed(exTie.values![1]) : exTie.values![1]}. {n(exTie.high)} finished higher.</>}
            </p>
          )}
        </div>
        <div>
          <h4>Which 3rd-placed teams go on</h4>
          <p>The {groups} teams in 3rd place are compared with each other, even though they never played each other.</p>
          <p>1. More points is better.</p>
          <p>2. Same points? The better goal difference is higher.</p>
          <p>3. Still the same? More goals scored is higher.</p>
          <p>4. Still the same? Fewer yellow and red cards, then FIFA&apos;s world ranking. The app does not have these.</p>
          {ex3 && (
            <p className="fk-race-example" data-testid="wc-rules-thirds-example"><b>Example:</b> {n(ex3.last.team)} finished 3rd in Group {ex3.last.group} with {stat(ex3.last)}. That was {THIRDS_THROUGH}th best, so {n(ex3.last.team)} went on.{' '}
              {n(ex3.first.team)} finished 3rd in Group {ex3.first.group} with {stat(ex3.first)}. That was {THIRDS_THROUGH + 1}th best, so {n(ex3.first.team)} went home.{' '}
              {ex3.by === 'level' ? 'They were level on all three: cards decided it.' : `The difference was ${ex3.by}.`}
            </p>
          )}
          <h4>Who plays who in the first knockout round</h4>
          <p>Each group winner plays a team that finished 2nd or 3rd in another group. Each 2nd place plays another 2nd place or a group winner.</p>
          <p>Which 3rd-placed team meets which group winner? It depends on which {THIRDS_THROUGH} groups the 3rd-placed teams come from.</p>
          <p>FIFA wrote a table before the World Cup with every case: {ed.thirdsTable?.length ?? 0} rows, one for each way to pick {THIRDS_THROUGH} groups out of {groups}.</p>
          <p>You find the row for the {THIRDS_THROUGH} groups, and it tells you every match.</p>
          {row && first && winner && third && (
            <p className="fk-race-example" data-testid="wc-rules-pairing-example"><b>Example:</b> the 3rd-placed teams that went on came from Groups {andList(inn)}. The row for those groups says the winner of Group {first[0].slice(1)} plays the 3rd of Group {first[1].slice(1)}. So {n(winner)} played {n(third)}.</p>
          )}
          <h4>Through, Out, Open</h4>
          <p><b>Through</b> means the team is sure to go on, whatever happens in the matches left.</p>
          <p><b>Out</b> means the team cannot go on any more.</p>
          <p><b>Open</b> means it still depends on the matches left. The app only says Through or Out when it is sure.</p>
        </div>
      </div>
    </section>
  );
}
