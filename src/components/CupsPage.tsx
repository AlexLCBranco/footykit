// The cups page (PLAN.md Phase 4): the Libertadores or the Sudamericana — the knockout bracket (ordered from its ties),
// the 8 group tables with each team's 6 group matches as squares, the qualifying ties, and the rules with sources
// (config/conmebol.ts). Its own chunk, like the other competition pages.

import { useMemo } from 'react';
import { CUPS, type CupConfig } from '../../config/conmebol';
import { dayLabel, isPlayed, kickoffTime, shortDay } from '../data/model';
import { matchUrl, type Match } from '../data/snapshot';
import { bracketColumns, cupGroups, stageTies, type CupGroup, type CupTie } from '../data/cups';
import { TeamLink } from './Bits';
import { useFooty } from './ctx';
import './ucl.css';

const ROUND_TEXT: Record<string, string> = { 'Knockout Round Playoffs': 'Play-offs', Quarterfinals: 'Quarter-finals', Semifinals: 'Semi-finals' };
const roundText = (r: string) => ROUND_TEXT[r] ?? r;
const legsOf = (cfg: CupConfig, round: string) => (round === cfg.knockout[cfg.knockout.length - 1] || cfg.singleLeg.includes(round) ? 1 : 2);

function TieCard({ t, today }: { t: CupTie; today: string }) {
  const { model } = useFooty();
  const started = t.legs.some(isPlayed);
  const side = (team: string, goals: number, pens?: number) => (
    <div className={`fk-ko-side${t.winner === team ? ' fk-ko-win' : t.winner ? ' fk-ko-lose' : ''}`}>
      <TeamLink id={team} day={today} label="short" />
      <span className="fk-ko-agg">{started ? goals : ''}{pens !== undefined ? <small> ({pens})</small> : null}</span>
    </div>
  );
  return (
    <div className="fk-ko-tie" data-testid="cup-tie">
      {side(t.a, t.goalsA, t.pensA)}
      {side(t.b, t.goalsB, t.pensB)}
      <div className="fk-ko-legs">
        {t.legs.map((m) => {
          const day = model.dayOf(m);
          const text = isPlayed(m) ? `${model.team(m.h).abbr} ${m.hs}-${m.as} ${model.team(m.a).abbr}` : `${model.team(m.a).abbr} @ ${model.team(m.h).abbr} · ${shortDay(day)}`;
          return <a key={m.id} href={matchUrl(m.id)} target="_blank" rel="noopener noreferrer" title={`${dayLabel(day)} — open on ESPN`}>{text}</a>;
        })}
      </div>
    </div>
  );
}

function Square({ m, team, today }: { m: Match; team: string; today: string }) {
  const { model, timeZone } = useFooty();
  const home = m.h === team;
  const opp = model.team(home ? m.a : m.h);
  const day = model.dayOf(m);
  const played = isPlayed(m);
  const gf = home ? m.hs! : m.as!, ga = home ? m.as! : m.hs!;
  const res = played ? (gf > ga ? 'W' : gf < ga ? 'L' : 'D') : undefined;
  const tip = `${played ? `${res === 'W' ? 'Won' : res === 'L' ? 'Lost' : 'Drew'} ${gf}-${ga} ` : ''}${home ? 'vs' : 'at'} ${opp.name}\n${dayLabel(day)}${m.tbd ? '' : `, ${kickoffTime(m.t, timeZone)}`}\nOpen the match on ESPN`;
  return (
    <a className={`fk-usq fk-usq-${res ?? 'next'}${!played && day === today ? ' fk-usq-now' : ''}`} href={matchUrl(m.id)} target="_blank" rel="noopener noreferrer" draggable={false} title={tip} data-testid="cup-square">
      <span className="fk-usq-opp"><span className="fk-usq-at">{home ? 'vs' : '@'}</span>{opp.abbr}</span>
      <span className="fk-usq-res">{played ? `${gf}-${ga}` : shortDay(day)}</span>
    </a>
  );
}

function GroupTable({ g, cfg, today }: { g: CupGroup; cfg: CupConfig; today: string }) {
  return (
    <table className="fk-table fk-ucl-table fk-cup-group" data-testid="cup-group">
      <caption>{g.name}</caption>
      <tbody>
        {g.rows.map((r, i) => {
          const z = cfg.groupZones.find((x) => x.place === i + 1);
          const mine = g.matches.filter((m) => m.h === r.team || m.a === r.team);
          return (
            <tr key={r.team} className={z ? `fk-lz-${z.kind}` : ''}>
              <td className="fk-rank" title={[z?.label, r.level ? 'Level on every rule the data allows (shared place)' : ''].filter(Boolean).join('\n') || undefined}>{r.rank}{r.level && <span className="fk-ucl-eq">=</span>}</td>
              <td className="fk-tl fk-ucl-team"><TeamLink id={r.team} day={today} label="short" /></td>
              <td>{r.p}</td><td>{r.w}</td><td>{r.d}</td><td>{r.l}</td>
              <td>{r.gf}-{r.ga}</td>
              <td className="fk-pts">{r.pts}</td>
              <td className="fk-tl"><span className="fk-cup-squares">{mine.map((m) => <Square key={m.id} m={m} team={r.team} today={today} />)}</span></td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export default function CupsPage({ cup, today }: { cup: string; today: string }) {
  const { model } = useFooty();
  const cfg = CUPS.find((c) => c.slug === cup) ?? CUPS[0]!;
  const { groups, qualifying, knockout } = useMemo(() => {
    const ms = model.snap.matches.filter((m) => m.c === cfg.slug);
    return {
      groups: cupGroups(model.snap, cfg),
      qualifying: cfg.qualifying.map((r) => ({ round: r, ties: stageTies(ms, r, legsOf(cfg, r)) })),
      knockout: bracketColumns(cfg.knockout.map((r) => stageTies(ms, r, legsOf(cfg, r)))),
    };
  }, [model, cfg]);
  const legend = cfg.groupZones.filter((z, i, a) => a.findIndex((x) => x.kind === z.kind) === i);
  return (
    <div className="fk-ucl fk-lt fk-cups" data-testid="cups-page" data-cup={cfg.slug}>
      <div className="fk-ucl-head">
        <h2>{model.comp(cfg.slug).name}</h2>
        <span className="fk-muted">Final {shortDay(cfg.final.day)}, {cfg.final.venue}</span>
      </div>
      <section className="fk-ko" data-testid="cup-knockout">
        <h3>Knockout stages</h3>
        <div className="fk-ko-grid" style={{ gridTemplateColumns: `repeat(${cfg.knockout.length}, minmax(160px, 210px))` }}>
          {cfg.knockout.map((r, i) => (
            <div key={r} className="fk-ko-col">
              <div className="fk-ko-col-title">{roundText(r)}</div>
              <div className="fk-ko-col-ties">
                {knockout[i]!.length ? knockout[i]!.map((t) => <TieCard key={`${t.a}-${t.b}`} t={t} today={today} />) : <div className="fk-ko-tie fk-ko-projected fk-muted">not fixtured yet</div>}
              </div>
            </div>
          ))}
        </div>
      </section>
      <section className="fk-cup-groups-wrap">
        <h3>Groups <span className="fk-ucl-key">{legend.map((z) => <span key={z.kind} className={`fk-ucl-zone-key fk-lz-${z.kind}`}>{cfg.groupZones.filter((x) => x.kind === z.kind).map((x) => x.place).join('–')}: {z.label.split(' (')[0]}</span>)}</span></h3>
        <div className="fk-cup-groups">{groups.map((g) => <GroupTable key={g.name} g={g} cfg={cfg} today={today} />)}</div>
      </section>
      {qualifying.some((q) => q.ties.length) && (
        <section className="fk-ko">
          <h3>Qualifying</h3>
          {qualifying.map((q) => (
            <div key={q.round} className="fk-cup-qual">
              <div className="fk-ko-col-title">{roundText(q.round)}{legsOf(cfg, q.round) === 1 ? <span className="fk-muted"> one match</span> : null}</div>
              <div className="fk-cup-qual-ties">{q.ties.map((t) => <TieCard key={`${t.a}-${t.b}`} t={t} today={today} />)}</div>
            </div>
          ))}
        </section>
      )}
      <div className="fk-ucl-rules" data-testid="cup-rules">
        <section>
          <h3>Groups: equal on points</h3>
          <ol>{cfg.groupRulesText.map((t) => <li key={t}>{t}</li>)}</ol>
          <p>Places: {cfg.groupZones.map((z) => `${z.place}: ${z.label}`).join(' · ')}.</p>
        </section>
        <section>
          <h3>Knockout</h3>
          <p>{cfg.bracketText}</p>
          <p>{cfg.tieText}</p>
          <p>ESPN has the ties but not the bracket's letters: footykit orders the bracket from them, each tie beside the one it feeds.</p>
          <p className="fk-ucl-src">Sources: {cfg.sources.map((s, i) => <a key={s} href={s} target="_blank" rel="noopener noreferrer" style={{ marginRight: 8 }}>{i ? 'final stages' : 'group stage'} (Wikipedia)</a>)}</p>
        </section>
      </div>
    </div>
  );
}
