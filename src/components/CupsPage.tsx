// The cups page (PLAN.md Phase 4): the Libertadores or the Sudamericana — the knockout bracket (ordered from its ties),
// the 8 group tables with each team's 6 group matches as squares, the qualifying ties, and the rules with sources
// (config/conmebol.ts). Its own chunk, like the other competition pages.

import { useMemo } from 'react';
import { useFitBracket } from './fitBracket';
import { CUPS, type CupConfig } from '../../config/conmebol';
import { DOMESTIC_CUPS, type DomesticCup } from '../../config/domesticCups';
import { dayLabel, isPlayed, kickoffTime, shortDay } from '../data/model';
import { matchUrl, type Match } from '../data/snapshot';
import { bracketColumns, cupGroups, cupRounds, stageTies, type CupGroup, type CupTie } from '../data/cups';
import { TeamLink } from './Bits';
import { CupSimBar, CupSimCtx, CupSimWaiting, simTieOf, useCupSim, useCupSimState } from './CupSim';
import type { SimRound } from '../data/cupSim';
import { useFooty } from './ctx';
import './ucl.css';

const ROUND_TEXT: Record<string, string> = { 'Knockout Round Playoffs': 'Play-offs', Quarterfinals: 'Quarter-finals', Semifinals: 'Semi-finals', 'Qualifying Round': 'Preliminary round' };
const roundText = (r: string) => ROUND_TEXT[r] ?? r;
const legsOf = (cfg: CupConfig, round: string) => (round === cfg.knockout[cfg.knockout.length - 1] || cfg.singleLeg.includes(round) ? 1 : 2);

function TieCard({ t, today }: { t: CupTie; today: string }) {
  const { model } = useFooty();
  const sim = useCupSimState();
  const st = simTieOf(sim, t);
  const started = t.legs.some(isPlayed);
  // FK-30: with the simulator on, an open tie's sides are picks (a click sends the team through, again clears)
  const pickable = !!st && !t.winner;
  const through = st ? st.through : t.winner;
  const side = (team: string, goals: number, pens?: number) => {
    const cls = `fk-ko-side${through === team ? ' fk-ko-win' : through ? ' fk-ko-lose' : ''}${st?.picked === team ? ' fk-ko-picked' : ''}`;
    const score = <span className="fk-ko-agg">{started ? goals : ''}{pens !== undefined ? <small> ({pens})</small> : null}</span>;
    if (pickable) {
      const on = st!.picked === team;
      return (
        <button type="button" className={`${cls} fk-cupsim-pick`} data-testid="cup-sim-pick" data-team={model.team(team).abbr} aria-pressed={on}
          title={on ? `${model.team(team).name} picked through: click to clear` : `Pick ${model.team(team).name} to go through`}
          onClick={() => sim!.pick(t, on ? undefined : team)}>
          <TeamLink id={team} day={today} label="short" className="fk-team-nolink" />
          {score}
        </button>
      );
    }
    return <div className={cls}><TeamLink id={team} day={today} label="short" />{score}</div>;
  };
  return (
    <div className={`fk-ko-tie${pickable ? ' fk-cupsim-open' : ''}`} data-testid="cup-tie" data-picked={st?.picked ? model.team(st.picked).abbr : undefined}>
      {side(t.a, t.goalsA, t.pensA)}
      {side(t.b, t.goalsB, t.pensB)}
      <div className="fk-ko-legs">
        {t.legs.map((m) => {
          const day = model.dayOf(m);
          const text = isPlayed(m) ? `${model.team(m.h).abbr} ${m.hs}-${m.as} ${model.team(m.a).abbr}` : `${model.team(m.a).abbr} @ ${model.team(m.h).abbr} · ${shortDay(day)}`;
          return <a key={m.id} href={matchUrl(m, model)} target="_blank" rel="noopener noreferrer" title={`${dayLabel(day)} — search on Google`}>{text}</a>;
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
  const tip = `${played ? `${res === 'W' ? 'Won' : res === 'L' ? 'Lost' : 'Drew'} ${gf}-${ga} ` : ''}${home ? 'vs' : 'at'} ${opp.name}\n${dayLabel(day)}${m.tbd ? '' : `, ${kickoffTime(m.t, timeZone)}`}\nSearch the match on Google`;
  return (
    <a className={`fk-usq fk-usq-${res ?? 'next'}${!played && day === today ? ' fk-usq-now' : ''}`} href={matchUrl(m, model)} target="_blank" rel="noopener noreferrer" draggable={false} title={tip} data-testid="cup-square">
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

/** A domestic cup: the last rounds (16 ties or fewer) as a bracket, the earlier ones folded, the rules and source. */
function DomesticCupPage({ cfg, today, fit, simOn }: { cfg: DomesticCup; today: string; fit: boolean; simOn?: boolean }) {
  const { model } = useFooty();
  const rounds = useMemo(() => {
    const rs = cupRounds(model.snap.matches.filter((m) => m.c === cfg.slug), cfg.twoLeg, (id) => model.snap.teams[id]?.name);
    if (!rs.some((r) => r.round === 'Final')) rs.push({ round: 'Final', legs: 1, ties: [], open: 1 });
    return rs;
  }, [model, cfg]);
  // the bracket: back from the final while each round has twice the next one's ties (no new entrants) and fits a
  // column (16 ties at most); a bigger round still being played is shown open above the folded earlier rounds
  const size = (r: (typeof rounds)[number]) => r.ties.length + r.open;
  let from = rounds.length - 1;
  while (from > 0 && size(rounds[from - 1]!) <= 16 && (size(rounds[from - 1]!) === 2 * size(rounds[from]!) || (rounds[from]!.round === 'Final' && !rounds[from]!.ties.length && from === rounds.length - 1))) from--;
  const bracket = rounds.slice(from);
  const cols = bracketColumns(bracket.map((r) => r.ties));
  const earlier = rounds.slice(0, from);
  const current = earlier.length && earlier[earlier.length - 1]!.ties.some((t) => !t.winner) ? earlier[earlier.length - 1] : undefined;
  const simRounds = useMemo<SimRound[]>(() => rounds.map((r, i) => ({ round: r.round, ties: i >= from ? cols[i - from]! : r.ties, open: r.open })), [rounds, from, cols]);
  const { state: sim, setOn, clear, empty } = useCupSim(cfg.slug, simRounds, simOn);
  const waiting = (round: string) => (sim.on ? sim.view.rounds.find((x) => x.round === round)?.waiting ?? [] : []);
  const fitRef = useFitBracket(fit, sim.view);
  return (
    <CupSimCtx.Provider value={sim}>
    <div className="fk-ucl fk-lt fk-cups" data-testid="cups-page" data-cup={cfg.slug} data-sim={sim.on || undefined}>
      <div className="fk-ucl-head">
        <h2>{model.comp(cfg.slug).name}</h2>
        <span className="fk-muted">Final {shortDay(cfg.final.day)} {cfg.final.day.slice(0, 4)}{cfg.final.venue ? `, ${cfg.final.venue}` : ''}</span>
        <CupSimBar on={sim.on} onToggle={simOn === undefined ? () => setOn(!sim.on) : undefined} onClear={clear} empty={empty} view={sim.view} />
              </div>
      <section className="fk-ko" data-testid="cup-knockout">
        <div className="fk-ko-grid fk-ko-fit" ref={fitRef} data-testid="cup-bracket" style={{ gridTemplateColumns: `repeat(${bracket.length}, minmax(160px, 210px))` }}>
          {bracket.map((r, i) => (
            <div key={r.round} className="fk-ko-col">
              <div className="fk-ko-col-title">{roundText(r.round)}{r.legs === 2 ? <span className="fk-muted"> two legs</span> : null}</div>
              <div className="fk-ko-col-ties">
                {cols[i]!.map((t) => <TieCard key={`${t.a}-${t.b}`} t={t} today={today} />)}
                <CupSimWaiting teams={waiting(r.round)} />
                {r.open > 0 && <div className="fk-ko-tie fk-ko-projected fk-muted" data-testid="cup-open">{r.open === 1 ? 'to be decided' : `${r.open} ties to be decided`}{r.round === 'Final' ? ` · ${shortDay(cfg.final.day)}` : ''}</div>}
              </div>
            </div>
          ))}
        </div>
      </section>
      {earlier.length > 0 && (
        <section className="fk-ko">
          <h3>Earlier rounds</h3>
          {earlier.map((r) => (
            <details key={r.round} className="fk-cup-qual" open={r === current || (sim.on && r.ties.some((t) => !t.winner))}>
              <summary className="fk-ko-col-title">{roundText(r.round)} <span className="fk-muted">{r.ties.length} ties{r.legs === 2 ? ', two legs' : ''}</span></summary>
              <div className="fk-cup-qual-ties">{r.ties.map((t) => <TieCard key={`${t.a}-${t.b}`} t={t} today={today} />)}</div>
            </details>
          ))}
        </section>
      )}
      <div className="fk-ucl-rules" data-testid="cup-rules">
        <section>
          <h3>Format</h3>
          <ul>{cfg.rules.map((x) => <li key={x}>{x}</li>)}</ul>
          <p>Rounds come from ESPN as they are drawn; the bracket orders each round's ties beside the tie they feed.</p>
          <p className="fk-ucl-src">Source: <a href={cfg.source} target="_blank" rel="noopener noreferrer">Wikipedia, {model.comp(cfg.slug).name}</a></p>
        </section>
      </div>
    </div>
    </CupSimCtx.Provider>
  );
}

/** `fit`: the bracket fills the first screen (FK-54) — the Cups page itself, not where the League view shows it. */
/** FK-65: `simOn` given = the page's How says whether the simulator shows (no toggle on the page); left out (the League
 * view's copy), the page keeps its own toggle. */
export default function CupsPage({ cup, today, fit = false, simOn }: { cup: string; today: string; fit?: boolean; simOn?: boolean }) {
  const domestic = DOMESTIC_CUPS.find((c) => c.slug === cup);
  // keyed by cup: each cup has its own simulator state and picks
  if (domestic) return <DomesticCupPage key={cup} cfg={domestic} today={today} fit={fit} simOn={simOn} />;
  return <ContinentalCupPage key={cup} cup={cup} today={today} fit={fit} simOn={simOn} />;
}

function ContinentalCupPage({ cup, today, fit, simOn }: { cup: string; today: string; fit: boolean; simOn?: boolean }) {
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
  const simRounds = useMemo<SimRound[]>(() => cfg.knockout.map((r, i) => ({ round: r, ties: knockout[i]!, open: 0 })), [cfg, knockout]);
  const { state: sim, setOn, clear, empty } = useCupSim(cfg.slug, simRounds, simOn);
  const fitRef = useFitBracket(fit, sim.view);
  return (
    <CupSimCtx.Provider value={sim}>
    <div className="fk-ucl fk-lt fk-cups" data-testid="cups-page" data-cup={cfg.slug} data-sim={sim.on || undefined}>
      <div className="fk-ucl-head">
        <h2>{model.comp(cfg.slug).name}</h2>
        <span className="fk-muted">Final {shortDay(cfg.final.day)}, {cfg.final.venue}</span>
        <CupSimBar on={sim.on} onToggle={simOn === undefined ? () => setOn(!sim.on) : undefined} onClear={clear} empty={empty} view={sim.view} />
              </div>
      <section className="fk-ko" data-testid="cup-knockout">
        <h3>Knockout stages</h3>
        <div className="fk-ko-grid fk-ko-fit" ref={fitRef} data-testid="cup-bracket" style={{ gridTemplateColumns: `repeat(${cfg.knockout.length}, minmax(160px, 210px))` }}>
          {cfg.knockout.map((r, i) => (
            <div key={r} className="fk-ko-col">
              <div className="fk-ko-col-title">{roundText(r)}</div>
              <div className="fk-ko-col-ties">
                {knockout[i]!.map((t) => <TieCard key={`${t.a}-${t.b}`} t={t} today={today} />)}
                {sim.on && <CupSimWaiting teams={sim.view.rounds[i]?.waiting ?? []} />}
                {!knockout[i]!.length && <div className="fk-ko-tie fk-ko-projected fk-muted">not fixtured yet</div>}
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
    </CupSimCtx.Provider>
  );
}
