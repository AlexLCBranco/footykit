// FK-59: the World Cup section (Cups picker → World Cup): pick an edition (1930–2026) and see the knockout bracket,
// every group's final table with its match squares (second group stages too), 2026's third-placed teams, hovers with
// each match's details, Google links on matches, squad links on teams, and a team's World Cup history on a name click.
// Data: public/worldcup/ (scripts/make-worldcup.ts), loaded per edition. Its own chunk.

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { advancing, bracket, groupTables, loadEdition, loadIndex, reachedRank, rulesFor, scoreText, squadUrl, thirdPlace, thirdsRanking, THIRDS_THROUGH, wcMatchUrl, winSide, type GroupTable, type KoTie, type Result, type WcEdition, type WcIndexEntry, type WcMatch } from '../data/worldcup';
import { WC_SLUG, WC_YEARS } from './page';
import { CupPicker } from './TopBar';
import { useFitBracket } from './fitBracket';
import './ucl.css';
import './wc.css';

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const dateText = (d: string) => { const [y, m, day] = d.split('-'); return `${Number(day)} ${MON[Number(m) - 1]} ${y}`; };

/** The hover of a match: date, place, 90' score, extra time and shootout, scorers (or that the data has none). */
export function matchTip(ed: WcEdition, m: WcMatch, r: Result = m): string {
  const n = (c: string) => ed.teams[c] ?? c;
  const place = [m.venue, m.city].filter(Boolean).join(', ');
  const lines = [
    `${n(m.h)} ${r.s[0]}–${r.s[1]} ${n(m.a)}${m.replay ? ' (replay)' : m.playoff ? ' (play-off)' : ''}`,
    `${dateText(m.date)}${m.time ? `, ${m.time} local` : ''}`,
    place ? `${place}${ed.venues === 'city' ? ' (stadium not in the data)' : ''}` : 'Venue not in the data',
    `90 minutes: ${r.s[0]}–${r.s[1]}`,
  ];
  if (r.et) lines.push(`After extra time: ${r.et[0]}–${r.et[1]}`);
  if (r.p) lines.push(`Penalties: ${r.p[0]}–${r.p[1]}`);
  if (r === m) {
    if (m.goals?.length) lines.push('', ...m.goals.map(([side, who, min, kind]) => `${min} ${who}${kind === 'og' ? ' (og)' : kind === 'pen' ? ' (pen)' : ''} — ${n(side ? m.a : m.h)}`));
    else if (r.s[0] + r.s[1] + (r.et ? r.et[0] + r.et[1] : 0) > 0) lines.push('', 'Scorers not in the data');
  }
  lines.push('', 'Click: search the match on Google');
  return lines.join('\n');
}

/** A team's name: a click opens its World Cup history; the ↗ beside it its squad for the edition (Wikipedia). */
function Team({ ed, code, onTeam, squad = true, className }: { ed: WcEdition; code: string; onTeam: (c: string) => void; squad?: boolean; className?: string }) {
  const name = ed.teams[code] ?? code;
  return (
    <span className={`fk-wc-team ${className ?? ''}`}>
      <button type="button" className="fk-wc-name" title={`${name}: World Cup history`} onClick={() => onTeam(code)} data-testid="wc-team" data-team={code}>{name}</button>
      {squad && <a className="fk-wc-squad" href={squadUrl(ed.year, name)} target="_blank" rel="noopener noreferrer" title={`${name}'s ${ed.year} squad (Wikipedia)`} data-testid="wc-squad">↗</a>}
    </span>
  );
}

/** One knockout tie: both sides, the score (90' · a.e.t. · pens), the match(es) as Google links with the details on hover. */
function Tie({ ed, t, onTeam, res, pick }: { ed: WcEdition; t: KoTie; onTeam: (c: string) => void; res?: (m: WcMatch) => Result | undefined; pick?: ReactNode }) {
  const last = t.matches[t.matches.length - 1]!;
  const r = res ? res(last) : last;
  const side = (code: string) => {
    const home = last.h === code;
    const won = t.winner === code;
    const f = r ? (r.et ?? r.s) : undefined;
    return (
      <div className={`fk-ko-side${t.winner ? (won ? ' fk-ko-win' : ' fk-ko-lose') : ''}`}>
        <Team ed={ed} code={code} onTeam={onTeam} />
        <span className="fk-ko-agg">{f ? f[home ? 0 : 1] : ''}{r?.p ? <small> ({r.p[home ? 0 : 1]})</small> : null}</span>
      </div>
    );
  };
  return (
    <div className="fk-ko-tie fk-wc-tie" data-testid="wc-tie">
      {side(t.a)}
      {side(t.b)}
      <div className="fk-ko-legs">
        {t.matches.map((m) => {
          const mr = res ? res(m) : m;
          return mr ? <a key={m.n} href={wcMatchUrl(ed, m)} target="_blank" rel="noopener noreferrer" title={matchTip(ed, m, mr)} data-testid="wc-match">{m.replay ? 'Replay ' : ''}{dateText(m.date)} · {scoreText(mr)}</a> : null;
        })}
        {pick}
      </div>
    </div>
  );
}

/** A team's group match as a square: opponent, result; hover for details, click to search it. */
function Square({ ed, m, team, res }: { ed: WcEdition; m: WcMatch; team: string; res?: Result }) {
  const r = res ?? m;
  const home = m.h === team;
  const gf = r.s[home ? 0 : 1], ga = r.s[home ? 1 : 0];
  const k = gf > ga ? 'W' : gf < ga ? 'L' : 'D';
  const opp = home ? m.a : m.h;
  return (
    <a className={`fk-usq fk-usq-${k}`} href={wcMatchUrl(ed, m)} target="_blank" rel="noopener noreferrer" draggable={false} title={matchTip(ed, m, r)} data-testid="wc-square">
      <span className="fk-usq-opp"><span className="fk-usq-at">{home ? 'vs' : '@'}</span>{ed.fifa?.[opp] ?? opp}</span>
      <span className="fk-usq-res">{gf}-{ga}</span>
    </a>
  );
}

export function GroupBox({ ed, t, adv, onTeam, res, thirdsIn }: { ed: WcEdition; t: GroupTable; adv: Set<string>; onTeam: (c: string) => void; res?: (m: WcMatch) => Result | undefined; thirdsIn?: Set<string> }) {
  const n = Math.max(...t.rows.map((r) => t.matches.filter((m) => m.h === r.team || m.a === r.team).length));
  return (
    <table className="fk-table fk-ucl-table fk-wc-group" data-testid="wc-group" data-group={t.group.name}>
      <caption>{t.group.name}</caption>
      <thead><tr><th>#</th><th className="fk-tl">Team</th><th>Pts</th><th>P</th><th>W</th><th>D</th><th>L</th><th title="Goals for – against">Goals</th><th className="fk-tl">Matches</th></tr></thead>
      <tbody>
        {t.rows.map((r) => {
          const through = adv.has(r.team);
          const third = thirdsIn?.has(r.team);
          const mine = t.matches.filter((m) => m.h === r.team || m.a === r.team);
          return (
            <tr key={r.team} className={through ? (third ? 'fk-lz-uclq' : 'fk-lz-ucl') : ''} data-testid="wc-row" data-team={r.team} data-through={through || undefined}>
              <td className="fk-rank" title={[through ? (third ? 'Through as one of the best third-placed teams' : 'Through') : '', r.level ? 'Level on every rule the data has (fair play / lots decided)' : ''].filter(Boolean).join('\n') || undefined}>{r.rank}{r.level && <span className="fk-ucl-eq">=</span>}</td>
              <td className="fk-tl fk-ucl-team"><Team ed={ed} code={r.team} onTeam={onTeam} /></td>
              <td className="fk-pts">{r.pts}</td><td>{r.p}</td><td>{r.w}</td><td>{r.d}</td><td>{r.l}</td><td>{r.gf}–{r.ga}</td>
              <td className="fk-tl"><span className="fk-wc-squares" style={{ gridTemplateColumns: `repeat(${n}, 56px)` }}>{mine.map((m) => { const x = res ? res(m) : m; return x ? <Square key={m.n} ed={ed} m={m} team={r.team} res={x} /> : <span key={m.n} className="fk-usq fk-usq-next" title="No result picked">–</span>; })}</span></td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

/** 2026: the third-placed teams, the best eight through. */
export function ThirdsTable({ ed, tables, onTeam }: { ed: WcEdition; tables: GroupTable[]; onTeam: (c: string) => void }) {
  const rows = thirdsRanking(tables);
  return (
    <table className="fk-table fk-ucl-table fk-wc-group fk-wc-thirds" data-testid="wc-thirds">
      <caption>Third-placed teams <span className="fk-muted">(best {THIRDS_THROUGH} through: points, goal difference, goals; then fair play and the FIFA ranking, not in the data)</span></caption>
      <thead><tr><th>#</th><th>Grp</th><th className="fk-tl">Team</th><th>Pts</th><th>P</th><th>GD</th><th>GF</th></tr></thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={r.team} className={i < THIRDS_THROUGH ? 'fk-lz-uclq' : ''} data-testid="wc-third" data-team={r.team}>
            <td className="fk-rank" title={r.level ? 'Level on points, goal difference and goals: fair play decided (not in the data)' : undefined}>{r.rank}{r.level && <span className="fk-ucl-eq">=</span>}</td>
            <td>{r.group.replace('Group ', '')}</td>
            <td className="fk-tl fk-ucl-team"><Team ed={ed} code={r.team} onTeam={onTeam} /></td>
            <td className="fk-pts">{r.pts}</td><td>{r.p}</td><td>{r.gd > 0 ? `+${r.gd}` : r.gd}</td><td>{r.gf}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** A team's World Cup history: every edition, how far it went (from the index; names as that edition had them). */
function TeamHistory({ code, index, year, onYear, onClose }: { code: string; index: WcIndexEntry[]; year: number; onYear: (y: number) => void; onClose: () => void }) {
  const eds = index.filter((e) => e.reached[code]).sort((a, b) => b.year - a.year);
  const name = eds[0]?.reached[code]?.[0] ?? code;
  const titles = eds.filter((e) => e.reached[code]![1] === 'Winner').length;
  return (
    <section className="fk-wc-history" data-testid="wc-history" data-team={code}>
      <h3>{name} at the World Cup <span className="fk-muted">{eds.length} of {index.length} editions{titles ? ` · ${titles} title${titles > 1 ? 's' : ''}` : ''}</span>
        <button type="button" className="fk-club-clear" aria-label="Close the team's history" title="Close" onClick={onClose} data-testid="wc-history-close">×</button>
      </h3>
      <div className="fk-wc-history-list">
        {eds.map((e) => {
          const [nm, r] = e.reached[code]!;
          return (
            <button key={e.year} type="button" className={`fk-wc-hist-item fk-wc-reach-${reachedRank(r)}${e.year === year ? ' fk-wc-hist-on' : ''}`} onClick={() => onYear(e.year)} title={`Open the ${e.year} World Cup`} data-testid="wc-history-year" data-year={e.year}>
              <b>{e.year}</b> {r}{nm !== name ? <span className="fk-muted"> as {nm}</span> : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}

export function useEdition(year: number) {
  const [state, setState] = useState<{ year: number; ed?: WcEdition; error?: string }>({ year });
  useEffect(() => {
    let live = true;
    loadEdition(year).then((ed) => live && setState({ year, ed }), (e: Error) => live && setState({ year, error: e.message }));
    return () => { live = false; };
  }, [year]);
  return state.year === year ? state : { year };
}

export function useIndex() {
  const [index, setIndex] = useState<WcIndexEntry[]>();
  useEffect(() => { let live = true; loadIndex().then((x) => live && setIndex(x), () => undefined); return () => { live = false; }; }, []);
  return index;
}

export function EditionPicker({ year, onYear, years = WC_YEARS }: { year: number; onYear: (y: number) => void; years?: number[] }) {
  return (
    <label className="fk-scope" title="The edition shown">
      <select value={year} onChange={(e) => onYear(Number(e.target.value))} aria-label="Edition" data-testid="wc-edition">
        {[...years].reverse().map((y) => <option key={y} value={y}>{y}</option>)}
      </select>
    </label>
  );
}

export default function WorldCupPage({ year, team, onPage, onPick, extra }: { year: number; team?: string; onPage: (year: number, team?: string) => void; onPick?: (c: string) => void; extra?: ReactNode }) {
  const { ed, error } = useEdition(year);
  const index = useIndex();
  const onTeam = (c: string) => onPage(year, c === team ? undefined : c);
  const view = useMemo(() => {
    if (!ed) return undefined;
    const tables = groupTables(ed);
    return { tables, adv: advancing(ed, tables), ko: bracket(ed), third: thirdPlace(ed) };
  }, [ed]);
  // fills the first screen (FK-54); 2026's 16-tie first round would shrink too far, so it keeps its natural size
  const fitRef = useFitBracket(!!view?.ko.length && view.ko[0]!.ties.length <= 8, view);
  const info = index?.find((x) => x.year === year);
  const stages = view ? [...new Set(view.tables.map((t) => t.group.stage))] : [];
  const thirdsIn = useMemo(() => (ed && view && ed.year >= 2026 ? new Set(thirdsRanking(view.tables).slice(0, THIRDS_THROUGH).map((r) => r.team)) : undefined), [ed, view]);
  return (
    <div className="fk-ucl fk-lt fk-cups fk-wc" data-testid="wc-page" data-year={year}>
      <div className="fk-ucl-head">
        <h2>{onPick ? <CupPicker cup={WC_SLUG} onPick={onPick} title /> : 'World Cup'}</h2>
        <EditionPicker year={year} onYear={(y) => onPage(y, team)} />
        {info && <span className="fk-muted" data-testid="wc-summary">{info.host} · {info.teams} teams · won by {info.championName}</span>}
        {extra}
      </div>
      {team && index && <TeamHistory code={team} index={index} year={year} onYear={(y) => onPage(y, team)} onClose={() => onPage(year)} />}
      {error && <p className="fk-muted">The {year} data couldn't be loaded ({error}).</p>}
      {!ed && !error && <p className="fk-muted">Loading…</p>}
      {ed && view && (
        <>
          {view.ko.length > 0 && (
            <section className="fk-ko" data-testid="wc-knockout">
              <div className="fk-ko-grid fk-ko-fit" ref={fitRef} data-testid="wc-bracket" style={{ gridTemplateColumns: `repeat(${view.ko.length}, minmax(170px, 220px))` }}>
                {view.ko.map((r) => (
                  <div key={r.stage} className="fk-ko-col">
                    <div className="fk-ko-col-title">{r.stage}</div>
                    <div className="fk-ko-col-ties">
                      {r.ties.map((t, i) => (t ? <Tie key={`${t.a}-${t.b}`} ed={ed} t={t} onTeam={onTeam} /> : <div key={`none${i}`} className="fk-ko-tie fk-ko-projected fk-muted" title="The data has no match here: the team went through without playing (walkover)">no match (walkover)</div>))}
                      {r.stage === 'Final' && view.third && (
                        <div className="fk-wc-third"><div className="fk-ko-col-title">Third place</div><Tie ed={ed} t={view.third} onTeam={onTeam} /></div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
          {stages.map((st) => (
            <section key={st} className="fk-cup-groups-wrap" data-testid="wc-stage" data-stage={st}>
              <h3>{st}{st === 'Final round' ? <span className="fk-muted"> (no final: the group decided the title)</span> : null}</h3>
              <div className="fk-cup-groups fk-wc-groups">
                {view.tables.filter((t) => t.group.stage === st).map((t) => <GroupBox key={t.group.name} ed={ed} t={t} adv={view.adv} onTeam={onTeam} thirdsIn={thirdsIn} />)}
                {st === 'Group stage' && ed.year >= 2026 && <ThirdsTable ed={ed} tables={view.tables} onTeam={onTeam} />}
              </div>
            </section>
          ))}
          <KoOutsideBracket ed={ed} shown={new Set(view.ko.map((r) => r.stage))} onTeam={onTeam} />
          <div className="fk-ucl-rules" data-testid="wc-rules">
            <section>
              <h3>This edition</h3>
              <p>{ed.win === 2 ? 'Two points for a win, one for a draw.' : 'Three points for a win, one for a draw.'} Group tables are in the official final order{rulesFor(ed.year) && ed.year >= 2026 ? `, ranked by the ${ed.year} rules` : ''}; "=" marks teams level on every rule the data has (fair play or lots decided).</p>
              {rulesFor(ed.year) && <><p>Equal on points:</p><ol>{rulesFor(ed.year)!.text.slice(1).map((x) => <li key={x}>{x}</li>)}</ol></>}
              {ed.venues === 'city' && <p>Venues: the source gives each match's host city, not the stadium.</p>}
              {ed.scorers !== 'full' && <p>Scorers: {ed.scorers === 'none' ? 'not in the data' : 'missing for some matches'}.</p>}
            </section>
            <section>
              <h3>Sources</h3>
              <ul>{ed.source.map((s) => { const url = /https?:\/\/\S+/.exec(s)?.[0]; return <li key={s}>{url ? <a href={url} target="_blank" rel="noopener noreferrer">{s.replace(url, '').trim()}</a> : s}</li>; })}</ul>
              <p className="fk-ucl-src">Squads link to Wikipedia's "{ed.year} FIFA World Cup squads". Match links search Google.</p>
            </section>
          </div>
        </>
      )}
    </div>
  );
}

/** Knockout rounds the bracket doesn't hold (1930's semi-finals are in it; this is for rounds before a clean bracket). */
function KoOutsideBracket({ ed, shown, onTeam }: { ed: WcEdition; shown: Set<string>; onTeam: (c: string) => void }) {
  const rounds = ['Round of 32', 'Round of 16', 'Quarter-finals', 'Semi-finals', 'Final'].filter((s) => !shown.has(s) && ed.matches.some((m) => m.stage === s));
  if (!rounds.length) return null;
  return (
    <section className="fk-ko">
      {rounds.map((s) => {
        const ties = ed.matches.filter((m) => m.stage === s && !m.replay).map((m) => {
          const ms = ed.matches.filter((x) => x.stage === s && [x.h, x.a].sort().join() === [m.h, m.a].sort().join());
          const w = winSide(ms[ms.length - 1]!);
          const lastM = ms[ms.length - 1]!;
          return { stage: s, a: m.h, b: m.a, matches: ms, winner: w === undefined ? undefined : w === 0 ? lastM.h : lastM.a } as KoTie;
        });
        return (
          <div key={s} className="fk-cup-qual">
            <div className="fk-ko-col-title">{s}</div>
            <div className="fk-cup-qual-ties">{ties.map((t) => <Tie key={`${t.a}-${t.b}`} ed={ed} t={t} onTeam={onTeam} />)}</div>
          </div>
        );
      })}
    </section>
  );
}
