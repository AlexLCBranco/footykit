// The UCL page's knockout section: play-off sections I–IV, round-of-16 ties A–D, quarter-finals, semi-finals and the
// final (src/data/uclBracket.ts). Until the ties exist it shows who holds each place now ("if the league phase ended
// now"); the halves are drawn as such only once the semi-finals show them, never guessed.

import { UCL_KO_DATES } from '../../config/ucl';
import { shortDay } from '../data/model';
import { matchUrl } from '../data/snapshot';
import type { UclTable } from '../data/ucl';
import { uclBracket, type Tie } from '../data/uclBracket';
import { TeamLink } from './Bits';
import { useFooty } from './ctx';

const ord = (n: number) => `${n}${n % 10 === 1 && n !== 11 ? 'st' : n % 10 === 2 && n !== 12 ? 'nd' : n % 10 === 3 && n !== 13 ? 'rd' : 'th'}`;
const DATE = (d: string) => `${shortDay(d)} ${d.slice(0, 4)}`;

function TieCard({ t, pos, today }: { t: Tie; pos: (team: string) => number; today: string }) {
  const { model } = useFooty();
  const side = (team: string, goals: number, pens?: number) => (
    <div className={`fk-ko-side${t.winner === team ? ' fk-ko-win' : t.winner ? ' fk-ko-lose' : ''}`}>
      <span className="fk-ko-pos">{pos(team) < 99 ? pos(team) : ''}</span>
      <TeamLink id={team} day={today} label="short" />
      <span className="fk-ko-agg">{t.legs.some((m) => m.st === 'post') ? goals : ''}{pens !== undefined ? <small> ({pens})</small> : null}</span>
    </div>
  );
  return (
    <div className="fk-ko-tie" data-testid="ko-tie">
      {side(t.a, t.goalsA, t.pensA)}
      {side(t.b, t.goalsB, t.pensB)}
      <div className="fk-ko-legs">
        {t.legs.map((m) => {
          const day = model.dayOf(m);
          const played = m.st === 'post' && m.hs !== undefined;
          const text = played ? `${model.team(m.h).abbr} ${m.hs}-${m.as} ${model.team(m.a).abbr}` : `${model.team(m.a).abbr} @ ${model.team(m.h).abbr} · ${shortDay(day)}`;
          return <a key={m.id} href={matchUrl(m.id)} target="_blank" rel="noopener noreferrer" title={`${m.leg ? `Leg ${m.leg}` : 'Final'}, ${shortDay(day)} — open on ESPN`}>{text}</a>;
        })}
      </div>
    </div>
  );
}

/** A place-holder slot: who would be there if the league phase ended now. */
function Projected({ title, holders, note }: { title: string; holders?: string; note?: string }) {
  return (
    <div className="fk-ko-tie fk-ko-projected" data-testid="ko-projected">
      <div className="fk-ko-slot-title">{title}</div>
      {holders && <div className="fk-ko-holders">{holders}</div>}
      {note && <div className="fk-muted">{note}</div>}
    </div>
  );
}

export function UclKnockout({ table, today }: { table: UclTable; today: string }) {
  const { model } = useFooty();
  const place = new Map(table.rows.map((r, i) => [r.team, i + 1]));
  const pos = (team: string) => place.get(team) ?? 99;
  const b = uclBracket(model.snap.matches.filter((m) => m.c === 'uefa.champions'), pos);
  const at = (n: number) => model.team(table.rows[n - 1]!.team).abbr;
  const pair = (p: [number, number]) => `${at(p[0])} / ${at(p[1])}`;
  const pairText = (p: [number, number]) => `${ord(p[0])}/${ord(p[1])}`;
  const projecting = !table.complete;
  const halves = b.halves;
  const t = (x: Tie) => <TieCard key={`${x.a}-${x.b}`} t={x} pos={pos} today={today} />;
  return (
    <section className="fk-ko" data-testid="ucl-knockout">
      <h3>Knockout phase {projecting && <span className="fk-muted">· if the league phase ended now</span>}</h3>
      <div className="fk-ko-grid">
        <div className="fk-ko-col">
          <div className="fk-ko-col-title">Play-offs <span className="fk-muted">draw {DATE(UCL_KO_DATES.playoffDraw)}</span></div>
          {b.sections.map((s) => (
            <div key={s.id} className="fk-ko-group">
              <div className="fk-ko-group-title">{s.id} · {pairText(s.seeded)} v {pairText(s.unseeded)} → {s.r16}</div>
              {s.ties.length ? s.ties.map(t) : <Projected title="2 ties, drawn" holders={`${pair(s.seeded)} v ${pair(s.unseeded)}`} />}
            </div>
          ))}
        </div>
        <div className="fk-ko-col">
          <div className="fk-ko-col-title">Round of 16 <span className="fk-muted">draw {DATE(UCL_KO_DATES.r16Draw)}</span></div>
          {halves
            ? halves.map((h, i) => <div key={i} className="fk-ko-group"><div className="fk-ko-group-title">Half {i + 1}</div>{h.r16.map(t)}</div>)
            : b.r16.map((g) => (
              <div key={g.letter} className="fk-ko-group">
                <div className="fk-ko-group-title">{g.letter} · {pairText(g.seeded)} v winners of {g.from}</div>
                {g.ties.length ? g.ties.map(t) : <Projected title="one in each half" holders={`${pair(g.seeded)} v winners of ${g.from}`} />}
              </div>
            ))}
        </div>
        <div className="fk-ko-col">
          <div className="fk-ko-col-title">Quarter-finals</div>
          {halves
            ? halves.map((h, i) => <div key={i} className="fk-ko-group"><div className="fk-ko-group-title">Half {i + 1}</div>{h.qf.map(t)}</div>)
            : b.qf.length ? b.qf.map((q) => <div key={`${q.tie.a}`} className="fk-ko-group"><div className="fk-ko-group-title">{q.kind ? `${q.kind[0]} v ${q.kind[1]}` : ''}</div>{t(q.tie)}</div>)
              : <Projected title="A v D and B v C, in each half" note="1st and 2nd are in different halves" />}
        </div>
        <div className="fk-ko-col">
          <div className="fk-ko-col-title">Semi-finals</div>
          {b.sf.length ? b.sf.map(t) : <Projected title="The winners of each half's quarter-finals" />}
        </div>
        <div className="fk-ko-col">
          <div className="fk-ko-col-title">Final</div>
          {b.final ? t(b.final) : <Projected title={DATE(UCL_KO_DATES.final.day)} note={UCL_KO_DATES.final.venue} />}
        </div>
      </div>
    </section>
  );
}
