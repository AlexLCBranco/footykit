// FK-59: the World Cup section (Cups picker → World Cup): pick an edition (1930–2026) and see the knockout bracket,
// every group's final table with its match squares (second group stages too), 2026's third-placed teams, hovers with
// each match's details, Google links on matches, squad links on teams, and a team's World Cup history on a name click.
// Data: public/worldcup/ (scripts/make-worldcup.ts), loaded per edition. Its own chunk.

import { useEffect, useMemo, useState, type MouseEvent, type ReactNode } from 'react';
import { advancing, bracket, groupTables, loadEdition, loadIndex, neighbours, peekEdition, peekIndex, peekVenues, peekVideos, reachedRank, rulesFor, scoreText, squadUrl, thirdPlace, thirdsRanking, THIRDS_THROUGH, twoSided, wcMatchUrl, wcVideoTip, wcVideoUrl, winSide, type GroupTable, type KoTie, type Result, type WcEdition, type WcIndexEntry, type WcMatch } from '../data/worldcup';
import { WC_NO_BRACKET, WC_YEARS, type WcHow } from './page';
import { BracketTools, CardBracket, Poster } from './WcBracket';
import { koSlots, simulable } from '../data/wcSim';
import { lastMatchday, matchdays, race, raceEdition, resAt, standing, type Certain } from '../data/wcRace';
import { MatchupsPanel, PointSwitch, RaceThirds, RulesBox, StandingBracket, StatusChip, StillToPlay, WhoButton } from './WcRace';
import WorldCupSim, { type SimMode } from './WorldCupSim';
import './ucl.css';
import './wc.css';

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const dateText = (d: string) => { const [y, m, day] = d.split('-'); return `${Number(day)} ${MON[Number(m) - 1]} ${y}`; };

/** FK-66: plain words for the short column headers (shown on hover). */
const TH: Record<string, string> = {
  '#': 'Place in the table', Pts: 'Points', P: 'Matches played', W: 'Won', D: 'Drawn', L: 'Lost',
  GD: 'Goal difference: goals scored minus goals let in', GF: 'Goals scored', Goals: 'Goals scored – goals let in',
};
export const Th = ({ k, className }: { k: string; className?: string }) => <th className={className} title={TH[k]}>{k}</th>;

/** FK-66: what each stage is, in plain words (hover on its title). */
export const STAGE_TIP: Record<string, string> = {
  'Group stage': 'Each team plays every other team in its group; the best go on',
  'Second group stage': 'The teams that went through played a second round of groups',
  'Final round': 'No final: the last four played one more group, and it decided the title',
  'Round of 32': 'The last 32 teams; each winner goes on to the round of 16',
  'Round of 16': 'The last 16 teams; each winner goes on to the quarter-finals',
  'Quarter-finals': 'The last 8 teams; each winner goes on to the semi-finals',
  'Semi-finals': 'The last 4 teams; the winners play the final, the losers play for third place',
  Final: 'The winner is world champion',
  'Third place': 'The two semi-final losers play for third place',
};

/** The hover of a match: date, place, 90' score, extra time and shootout, scorers (or that the data has none). `link`: it opens the Google search. */
export function matchTip(ed: WcEdition, m: WcMatch, r: Result = m, link = true): string {
  const n = (c: string) => ed.teams[c] ?? c;
  const place = [m.venue, m.city].filter(Boolean).join(', ');
  // FK-69: an edition whose source has only the city gets the stadium from its venues file
  const stadium = m.venue ? undefined : peekVenues(ed.year)?.stadiums[m.city ?? '']?.name;
  const lines = [
    `${n(m.h)} ${r.s[0]}–${r.s[1]} ${n(m.a)}${m.replay ? ' (replay)' : m.playoff ? ' (play-off)' : ''}`,
    `${dateText(m.date)}${m.time ? `, ${m.time} local` : ''}`,
    place ? `${[stadium, place].filter(Boolean).join(', ')}${ed.venues === 'city' && !stadium ? ' (stadium not in the data)' : ''}` : 'Venue not in the data',
    `90 minutes: ${r.s[0]}–${r.s[1]}`,
  ];
  if (r.et) lines.push(`After extra time: ${r.et[0]}–${r.et[1]}`);
  if (r.p) lines.push(`Penalties: ${r.p[0]}–${r.p[1]}`);
  if (r === m) {
    if (m.goals?.length) lines.push('', ...m.goals.map(([side, who, min, kind]) => `${min} ${who}${kind === 'og' ? ' (og)' : kind === 'pen' ? ' (pen)' : ''} — ${n(side ? m.a : m.h)}`));
    else if (r.s[0] + r.s[1] + (r.et ? r.et[0] + r.et[1] : 0) > 0) lines.push('', 'Scorers not in the data');
  }
  if (link) lines.push('', 'Click: search the match on Google');
  const video = link ? peekVideos(ed.year)?.[m.n] : undefined;
  if (video) lines.push(`▶ beside it: ${wcVideoTip(ed.year, video).replace('Full', 'the full')}`);
  return lines.join('\n');
}

/**
 * FK-67 / FK-68: ▶ beside a match that has a full replay (from the edition's videos file: 2026 on CazéTV's YouTube
 * channel, 2022 on FIFA+ or FIFA's YouTube); nothing for a match without one. Its hover says where the video is. An
 * extra link: the match's Google link stays as it is.
 */
export function Play({ ed, m, className }: { ed: WcEdition; m: WcMatch; className?: string }) {
  const video = peekVideos(ed.year)?.[m.n];
  if (!video) return null;
  const n = (c: string) => ed.teams[c] ?? c;
  const tip = wcVideoTip(ed.year, video);
  return <a className={`fk-wc-play${className ? ` ${className}` : ''}`} href={wcVideoUrl(video)} target="_blank" rel="noopener noreferrer" draggable={false} title={tip} aria-label={`${n(m.h)} v ${n(m.a)}: ${tip}`} data-testid="wc-video" data-n={m.n}>▶</a>;
}

/** A team's name: a click opens its World Cup history; the ↗ beside it its squad for the edition (Wikipedia). */
export function Team({ ed, code, onTeam, squad = true, className }: { ed: WcEdition; code: string; onTeam: (c: string) => void; squad?: boolean; className?: string }) {
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
        {/* FK-66: the score opens the match too */}
        {f && r ? (
          <a className="fk-ko-agg fk-wc-score" href={wcMatchUrl(ed, last)} target="_blank" rel="noopener noreferrer" title={`${r.p ? `${f[home ? 0 : 1]} goals, ${r.p[home ? 0 : 1]} in the penalty shootout (in brackets)` : `${f[home ? 0 : 1]} goals`}${r.et ? ' after extra time' : ''}\n\n${matchTip(ed, last, r)}`} data-testid="wc-score">
            {f[home ? 0 : 1]}{r.p ? <small> ({r.p[home ? 0 : 1]})</small> : null}
          </a>
        ) : <span className="fk-ko-agg" />}
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
          return mr ? <span key={m.n} className="fk-wc-leg"><a href={wcMatchUrl(ed, m)} target="_blank" rel="noopener noreferrer" title={matchTip(ed, m, mr)} data-testid="wc-match"><span>{m.replay ? 'Replay ' : ''}{dateText(m.date)}</span><span className="fk-wc-leg-sep"> · </span><span className="fk-wc-leg-score">{scoreText(mr)}</span></a><Play ed={ed} m={m} /></span> : null;
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
  // the square is a link itself, so its ▶ sits over its corner (a link can't hold another link)
  return (
    <span className="fk-wc-sq">
    <a className={`fk-usq fk-usq-${k}`} href={wcMatchUrl(ed, m)} target="_blank" rel="noopener noreferrer" draggable={false} title={`${{ W: 'Won', D: 'Drawn', L: 'Lost' }[k]} ${gf}–${ga} against ${ed.teams[opp] ?? opp} ("vs": named first, "@": named second; most World Cup matches are on neutral ground)\n\n${matchTip(ed, m, r)}`} data-testid="wc-square">
      <span className="fk-usq-opp"><span className="fk-usq-at">{home ? 'vs' : '@'}</span>{ed.fifa?.[opp] ?? opp}</span>
      <span className="fk-usq-res">{gf}-{ga}</span>
    </a>
    <Play ed={ed} m={m} className="fk-wc-play-sq" />
    </span>
  );
}

/** FK-66: a click anywhere on a table row (not on a link or button in it) opens the row's team. */
export const rowClick = (go: () => void) => (e: MouseEvent) => { if (!(e.target as Element).closest('a, button, input')) go(); };

export function GroupBox({ ed, t, adv, onTeam, res, thirdsIn, status, onMatchups }: { ed: WcEdition; t: GroupTable; adv: Set<string>; onTeam: (c: string) => void; res?: (m: WcMatch) => Result | undefined; thirdsIn?: Set<string>; /** FK-71: at a past point, each team's certain status and a "Who next?" button */ status?: Map<string, Certain>; onMatchups?: (c: string) => void }) {
  const n = Math.max(...t.rows.map((r) => t.matches.filter((m) => m.h === r.team || m.a === r.team).length));
  return (
    <table className="fk-table fk-ucl-table fk-wc-group" data-testid="wc-group" data-group={t.group.name}>
      <caption title={STAGE_TIP[t.group.stage]}>{t.group.name}</caption>
      <thead><tr><Th k="#" /><th className="fk-tl">Team</th><Th k="Pts" /><Th k="P" /><Th k="W" /><Th k="D" /><Th k="L" /><Th k="Goals" /><th className="fk-tl" title="Each match: the opponent and the score; hover one for its details, click it to search it">Matches</th>{status && <th className="fk-tl" title="Through or Out is shown only when nothing in the matches left can change it">For sure?</th>}{onMatchups && <th />}</tr></thead>
      <tbody>
        {t.rows.map((r) => {
          const through = adv.has(r.team);
          const third = thirdsIn?.has(r.team);
          const mine = t.matches.filter((m) => m.h === r.team || m.a === r.team);
          return (
            <tr key={r.team} className={`fk-wc-rowlink${through ? (third ? ' fk-lz-uclq' : ' fk-lz-ucl') : ''}`} onClick={rowClick(() => onTeam(r.team))} data-testid="wc-row" data-team={r.team} data-through={through || undefined}>
              <td className="fk-rank" title={[through ? (third ? 'Through as one of the best third-placed teams' : 'Through') : '', r.level ? 'Level on every rule the data has (fair play / lots decided)' : ''].filter(Boolean).join('\n') || undefined}>{r.rank}{r.level && <span className="fk-ucl-eq">=</span>}</td>
              <td className="fk-tl fk-ucl-team"><Team ed={ed} code={r.team} onTeam={onTeam} /></td>
              <td className="fk-pts">{r.pts}</td><td>{r.p}</td><td>{r.w}</td><td>{r.d}</td><td>{r.l}</td><td>{r.gf}–{r.ga}</td>
              <td className="fk-tl"><span className="fk-wc-squares" style={{ gridTemplateColumns: `repeat(${n}, 56px)` }}>{mine.map((m) => { const x = res ? res(m) : m; return x ? <Square key={m.n} ed={ed} m={m} team={r.team} res={x} /> : <span key={m.n} className="fk-usq fk-usq-next" title={status ? 'Not played yet at this point' : 'No result picked'}>–</span>; })}</span></td>
              {status && <td className="fk-tl"><StatusChip s={status.get(r.team) ?? 'open'} /></td>}
              {onMatchups && <td><WhoButton ed={ed} team={r.team} onMatchups={onMatchups} /></td>}
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
      <thead><tr><Th k="#" /><th>Group</th><th className="fk-tl">Team</th><Th k="Pts" /><Th k="P" /><Th k="GD" /><Th k="GF" /></tr></thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={r.team} className={`fk-wc-rowlink${i < THIRDS_THROUGH ? ' fk-lz-uclq' : ''}`} onClick={rowClick(() => onTeam(r.team))} data-testid="wc-third" data-team={r.team}>
            <td className="fk-rank" title={r.level ? 'Level on points, goal difference and goals: fair play decided (not in the data)' : undefined}>{r.rank}{r.level && <span className="fk-ucl-eq">=</span>}</td>
            <td title={r.group}>{r.group.replace('Group ', '')}</td>
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

/** Work for when the browser is idle (soon anyway where requestIdleCallback is missing). */
const idle = (f: () => void) => (typeof requestIdleCallback === 'function' ? requestIdleCallback(() => f(), { timeout: 2000 }) : setTimeout(f, 50));

/**
 * The edition `year`: read in the same render when it has already arrived (FK-66: no "loading" frame for an edition
 * seen or preloaded), else fetched. `stale`: the edition shown last, kept on screen while a new one arrives so the page
 * never empties. Once an edition is in, the two either side are fetched ahead.
 */
export function useEdition(year: number) {
  const [, arrived] = useState(0);
  const [error, setError] = useState<{ year: number; message: string }>();
  const ed = peekEdition(year);
  const [stale, setStale] = useState<WcEdition>();
  useEffect(() => {
    if (ed) { setStale(ed); for (const y of neighbours(WC_YEARS, year)) loadEdition(y).then((x) => idle(() => editionView(x)), () => undefined); return; }
    let live = true;
    loadEdition(year).then(() => live && arrived((n) => n + 1), (e: Error) => live && setError({ year, message: e.message }));
    return () => { live = false; };
  }, [year, ed]);
  return { ed, stale: ed ? undefined : stale, error: error?.year === year ? error.message : undefined };
}

/** FK-66: an edition's tables, bracket and who went through, worked out once per edition (and ahead of time for the preloaded ones). */
const views = new WeakMap<WcEdition, ReturnType<typeof makeView>>();
function makeView(ed: WcEdition) {
  const tables = groupTables(ed);
  return {
    tables, adv: advancing(ed, tables), ko: bracket(ed), third: thirdPlace(ed),
    thirdsIn: ed.year >= 2026 ? new Set(thirdsRanking(tables).slice(0, THIRDS_THROUGH).map((r) => r.team)) : undefined,
  };
}
export function editionView(ed: WcEdition) {
  let v = views.get(ed);
  if (!v) { v = makeView(ed); views.set(ed, v); }
  return v;
}

export function useIndex() {
  const [index, setIndex] = useState<WcIndexEntry[] | undefined>(peekIndex);
  useEffect(() => { let live = true; if (!index) loadIndex().then((x) => live && setIndex(x), () => undefined); return () => { live = false; }; }, [index]);
  return index;
}

/** FK-65: the edition is picked on the What strip and Groups / Bracket / Simulator on the How switch (page rows). */
export default function WorldCupPage({ year, team, sim = false, how, at, onAt, onPage }: { year: number; team?: string; sim?: boolean; how?: WcHow; /** FK-71: the matchday the page is rewound to */ at?: number; onAt?: (at?: number, how?: WcHow) => void; onPage: (year: number, team?: string) => void }) {
  const [mode, setMode] = useState<SimMode>('fast');
  // FK-70: the bracket as a poster of flags; kept while stepping through editions, not in the address
  const [poster, setPoster] = useState(false);
  const canSim = simulable(year);
  const simOn = sim && canSim;
  const shown: WcHow = how ?? (WC_NO_BRACKET.includes(year) ? 'groups' : 'bracket');
  const { ed: real, stale, error } = useEdition(year);
  const index = useIndex();
  // FK-66: until the edition arrives the last one stays on screen (dimmed), so nothing empties or jumps
  const ed = real ?? stale;
  const ready = !!real && (!team || !!index);
  const onTeam = (c: string) => onPage(year, c === team ? undefined : c);
  const view = ed && editionView(ed);
  const info = index?.find((x) => x.year === year);
  const stages = view ? [...new Set(view.tables.map((t) => t.group.stage))] : [];
  const thirdsIn = view?.thirdsIn;
  // FK-71: the thirds race (editions with a pairing table for third-placed teams): the page rewound to a matchday
  const raceOn = !!ed && raceEdition(ed);
  const md = useMemo(() => (ed && raceOn ? matchdays(ed) : undefined), [ed, raceOn]);
  const point = md && at && at < lastMatchday(md) ? at : undefined;
  const rc = useMemo(() => (ed && md && point ? race(ed, resAt(md, point)) : undefined), [ed, md, point]);
  const slots = useMemo(() => (ed && rc ? koSlots(ed) : undefined), [ed, rc]);
  const [rules, setRules] = useState(false);
  const [who, setWho] = useState<string>();
  const venues = ed && Object.keys(peekVenues(ed.year)?.stadiums ?? {}).length ? peekVenues(ed.year) : undefined;
  return (
    <div className={`fk-ucl fk-lt fk-cups fk-wc${ready ? '' : ' fk-wc-waiting'}`} data-testid="wc-page" data-year={year} data-ready={ready || undefined} aria-busy={!ready}>
      <div className="fk-ucl-head">
        <h2>World Cup {year}</h2>
        {info ? (
          <span className="fk-muted" data-testid="wc-summary">{info.host} · {info.teams} teams · won by{' '}
            <button type="button" className="fk-wc-name" title={`${info.championName}: World Cup history`} onClick={() => onTeam(info.champion)} data-testid="wc-champion">{info.championName}</button>
          </span>
        ) : <span className="fk-muted">&nbsp;</span>}
        {raceOn && md && onAt && <PointSwitch last={lastMatchday(md)} at={point} onAt={(p) => { setWho(undefined); onAt(p, p && !sim && shown === 'bracket' ? 'groups' : undefined); }} />}
        {raceOn && <button type="button" className={`fk-tab${rules ? ' fk-tab-on' : ''}`} aria-pressed={rules} onClick={() => setRules(!rules)} title="How teams go on, how ties are broken and who plays who, in plain words" data-testid="wc-rules-btn">Rules</button>}
        {simOn && (
          <div className="fk-tabs" role="tablist" aria-label="Simulator mode" data-testid="wc-sim-mode">
            {(['fast', 'detail'] as const).map((m) => <button key={m} type="button" role="tab" aria-selected={mode === m} className={`fk-tab${mode === m ? ' fk-tab-on' : ''}`} onClick={() => setMode(m)}
              title={m === 'fast' ? 'Pick each match with one click: 1 = the first team wins, X = a draw, 2 = the second team wins' : 'Type each score, with extra time and penalties for a level knockout match'}>{m === 'fast' ? 'Fast (1 X 2)' : 'Detailed (scores)'}</button>)}
          </div>
        )}
      </div>
      {sim && !canSim && <p className="fk-wc-none" data-testid="wc-sim-none">The simulator is not ready for the {year} World Cup yet. It covers the World Cups with 32 teams (1998 to 2022) and 2026. Pick one of those years above, or look at the Groups or the Bracket.</p>}
      {ed && raceOn && rules && <RulesBox ed={ed} onClose={() => setRules(false)} />}
      {team && index && <TeamHistory code={team} index={index} year={year} onYear={(y) => onPage(y, team)} onClose={() => onPage(year)} />}
      {error && <p className="fk-muted">The {year} data couldn't be loaded ({error}).</p>}
      {/* the first visit only (nothing to keep on screen yet): an empty block of the page's height, no text flashing */}
      {!ed && !error && <div className="fk-wc-first" data-testid="wc-loading" />}
      <div key={`${ed?.year}-${simOn ? 'sim' : shown}`} className="fk-wc-body">
      {ed && simOn && <WorldCupSim key={`${ed.year}-${point ?? 'final'}`} ed={ed} mode={mode} onTeam={onTeam} at={point} />}
      {ed && view && !sim && shown === 'bracket' && !view.ko.length && <p className="fk-wc-none" data-testid="wc-no-bracket">The {year} World Cup had no knockout bracket: a final group of four decided the title. See it under Groups.</p>}
      {ed && view && !sim && (
        <>
          {shown === 'bracket' && view.ko.length > 0 && (
            <section className="fk-ko" data-testid="wc-knockout">
              <BracketTools poster={poster} onPoster={setPoster}>
                {poster ? <Poster ed={ed} cols={twoSided(view.ko)} /> : <CardBracket ed={ed} cols={twoSided(view.ko)} third={view.third} onTeam={onTeam} />}
              </BracketTools>
            </section>
          )}
          {shown === 'groups' && !stages.length && <p className="fk-wc-none" data-testid="wc-no-groups">The {year} World Cup had no groups: every round was a knockout. See it under Bracket.</p>}
          {shown === 'groups' && rc && md && slots && (
            <div data-testid="wc-race" data-point={point}>
              <p className="fk-race-note" data-testid="wc-race-note">You went back in time: this is how things stood after matchday {point}. Later matches are not counted. Through or Out is shown only when nothing in the matches left can change it.</p>
              {who && <MatchupsPanel ed={ed} r={rc} slots={slots} team={who} onClose={() => setWho(undefined)} />}
              <section className="fk-cup-groups-wrap" data-testid="wc-stage" data-stage="Group stage">
                <div className="fk-cup-groups fk-wc-groups fk-race-groups">
                  {rc.tables.map((t) => (
                    <div key={t.group.name} className="fk-race-group">
                      <GroupBox ed={ed} t={t} adv={new Set([...t.rows.slice(0, 2).map((r) => r.team), ...(rc.thirdsIn.includes(t.group.name.replace('Group ', '')) ? [t.rows[2]!.team] : [])])} thirdsIn={new Set(rc.thirds.slice(0, 8).map((r) => r.team))} onTeam={onTeam} res={resAt(md, point!)} status={rc.status} onMatchups={setWho} />
                      <StillToPlay ed={ed} matches={t.matches.filter((m) => (md.get(m.n) ?? 0) > point!)} />
                    </div>
                  ))}
                  <RaceThirds ed={ed} r={rc} onTeam={onTeam} onMatchups={setWho} />
                </div>
              </section>
              <StandingBracket ed={ed} r={rc} st={standing(ed, rc, slots)} onTeam={onTeam} />
            </div>
          )}
          {shown === 'groups' && !rc && stages.map((st) => (
            <section key={st} className="fk-cup-groups-wrap" data-testid="wc-stage" data-stage={st}>
              <h3 title={STAGE_TIP[st]}>{st}{st === 'Final round' ? <span className="fk-muted"> (no final: the group decided the title)</span> : null}</h3>
              <div className="fk-cup-groups fk-wc-groups">
                {view.tables.filter((t) => t.group.stage === st).map((t) => <GroupBox key={t.group.name} ed={ed} t={t} adv={view.adv} onTeam={onTeam} thirdsIn={thirdsIn} />)}
                {st === 'Group stage' && ed.year >= 2026 && <ThirdsTable ed={ed} tables={view.tables} onTeam={onTeam} />}
              </div>
            </section>
          ))}
          {shown === 'bracket' && <KoOutsideBracket ed={ed} shown={new Set(view.ko.map((r) => r.stage))} onTeam={onTeam} />}
          <div className="fk-ucl-rules" data-testid="wc-rules">
            <section>
              <h3>This edition</h3>
              <p>{ed.win === 2 ? 'Two points for a win, one for a draw.' : 'Three points for a win, one for a draw.'} Group tables are in the official final order{rulesFor(ed.year) && ed.year >= 2026 ? `, ranked by the ${ed.year} rules` : ''}; "=" marks teams level on every rule the data has (fair play or lots decided).</p>
              {rulesFor(ed.year) && <><p>Equal on points:</p><ol>{rulesFor(ed.year)!.text.slice(1).map((x) => <li key={x}>{x}</li>)}</ol></>}
              {ed.venues === 'city' && !venues && <p>Venues: the source gives each match's host city, not the stadium.</p>}
              {ed.scorers !== 'full' && <p>Scorers: {ed.scorers === 'none' ? 'not in the data' : 'missing for some matches'}.</p>}
            </section>
            <section>
              <h3>Sources</h3>
              <ul>{ed.source.map((s) => { const url = /https?:\/\/\S+/.exec(s)?.[0]; return <li key={s}>{url ? <a href={url} target="_blank" rel="noopener noreferrer">{s.replace(url, '').trim()}</a> : s}</li>; })}</ul>
              <p className="fk-ucl-src">Squads link to Wikipedia's "{ed.year} FIFA World Cup squads". Match links search Google.{Object.keys(peekVideos(ed.year) ?? {}).length ? (ed.year === 2022 ? " ▶ opens the full match on FIFA's own site (FIFA+), or on FIFA's YouTube channel when FIFA+ doesn't have it; a match with no full replay on either has no ▶." : ' ▶ opens the full match on CazéTV\'s YouTube channel (its "Jogos Completos" playlist); a match with no full replay there has no ▶.') : ''} Flags: flag-icons (MIT); a team whose country no longer exists shows its code instead.</p>
              {venues && <p className="fk-ucl-src" data-testid="wc-venue-src">Stadiums: coordinates from Wikidata, roof type from each stadium's Wikipedia article. {venues.weatherSource}: the temperature at kick-off and the rain in the two hours from it, shown only for matches played under the sky. Whether a retractable roof was open is not recorded per match.</p>}
            </section>
          </div>
        </>
      )}
      </div>
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
            <div className="fk-ko-col-title" title={STAGE_TIP[s]}>{s}</div>
            <div className="fk-cup-qual-ties">{ties.map((t) => <Tie key={`${t.a}-${t.b}`} ed={ed} t={t} onTeam={onTeam} />)}</div>
          </div>
        );
      })}
    </section>
  );
}
