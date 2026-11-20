// FK-60: the World Cup what-if simulator, beside the history (WorldCupPage's "Simulator"): every group's matches and
// table on the left, the bracket on the right (it stays in view while the groups scroll), both updating together.
// Fast mode picks 1 / X / 2 (a knockout side: click it through); detailed mode takes scores, extra time and a shootout.
// Starts from the real results; "Reset to real results" and "Clear all". Picks per edition in `fk:wcsim:v1`.

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { peekVideos, scoreText, wcMatchUrl, type Result, type WcEdition, type WcMatch } from '../data/worldcup';
import { clearAll, fastOf, fastResult, hasPicks, koSlots, loadPicks, savePicks, simulate, sourceText, type Picks, type SimTie } from '../data/wcSim';
import { matchdays, picksFrom, race, raceEdition } from '../data/wcRace';
import { MatchupsPanel, StatusChip, WhoButton } from './WcRace';
import { matchTip, Play, rowClick, STAGE_TIP, Team, Th } from './WorldCupPage';

export type SimMode = 'fast' | 'detail';

function NumIn({ value, onChange, label }: { value?: number; onChange: (n: number | undefined) => void; label: string }) {
  return (
    <input className="fk-wc-num" type="number" min={0} max={30} inputMode="numeric" aria-label={label} value={value ?? ''}
      onChange={(e) => onChange(e.target.value === '' ? undefined : Math.max(0, Math.min(30, Math.floor(Number(e.target.value)))))} data-testid="wc-sim-num" />
  );
}

/** Score inputs: 90', then extra time and the shootout while level (knockout only). */
function ScoreInputs({ r, ko, onSet, names }: { r?: Result; ko: boolean; onSet: (r: Result | null) => void; names: [string, string] }) {
  const [draft, setDraft] = useState<[number | undefined, number | undefined]>(r ? r.s : [undefined, undefined]);
  useEffect(() => setDraft(r ? r.s : [undefined, undefined]), [r]);
  const set = (i: 0 | 1, n?: number) => {
    const d: [number | undefined, number | undefined] = i ? [draft[0], n] : [n, draft[1]];
    setDraft(d);
    if (d[0] === undefined || d[1] === undefined) { if (d[0] === undefined && d[1] === undefined) onSet(null); return; }
    onSet({ s: [d[0], d[1]], ...(ko && d[0] === d[1] && r?.et ? { et: r.et } : {}), ...(ko && d[0] === d[1] && r?.p ? { p: r.p } : {}) });
  };
  const level90 = ko && r && r.s[0] === r.s[1];
  const levelEt = level90 && r.et && r.et[0] === r.et[1];
  return (
    <span className="fk-wc-inputs">
      <NumIn value={draft[0]} onChange={(n) => set(0, n)} label={`${names[0]} goals`} />–<NumIn value={draft[1]} onChange={(n) => set(1, n)} label={`${names[1]} goals`} />
      {level90 && (
        <span className="fk-wc-et" title="The score after extra time (the whole match, 120 minutes)">extra time
          <NumIn value={r.et?.[0]} onChange={(n) => onSet({ ...r, et: [n ?? r.s[0], r.et?.[1] ?? r.s[1]], p: undefined })} label="Goals after extra time, first team" />–
          <NumIn value={r.et?.[1]} onChange={(n) => onSet({ ...r, et: [r.et?.[0] ?? r.s[0], n ?? r.s[1]], p: undefined })} label="Goals after extra time, second team" />
        </span>
      )}
      {levelEt && (
        <span className="fk-wc-et" title="The penalty shootout">penalties
          <NumIn value={r.p?.[0]} onChange={(n) => onSet({ ...r, p: [n ?? 0, r.p?.[1] ?? 0] })} label="Shootout, first team" />–
          <NumIn value={r.p?.[1]} onChange={(n) => onSet({ ...r, p: [r.p?.[0] ?? 0, n ?? 0] })} label="Shootout, second team" />
        </span>
      )}
    </span>
  );
}

function GroupMatch({ ed, m, r, mode, changed, onSet, onTeam }: { ed: WcEdition; m: WcMatch; r?: Result; mode: SimMode; changed: boolean; onSet: (r: Result | null) => void; onTeam: (c: string) => void }) {
  const k = fastOf(r);
  const n = (c: string) => ed.teams[c] ?? c;
  // FK-67: the real match's full replay; its column is there only for an edition with videos
  const hasVideos = !!Object.keys(peekVideos(ed.year) ?? {}).length;
  return (
    <div className={`fk-wc-sim-match${hasVideos ? ' fk-wc-sim-match-v' : ''}${changed ? ' fk-wc-changed' : ''}`} data-testid="wc-sim-match" data-n={m.n} data-changed={changed || undefined} title={`Really: ${matchTip(ed, m, m, false)}`}>
      <Team ed={ed} code={m.h} onTeam={onTeam} squad={false} className="fk-wc-sim-h" />
      {mode === 'fast' ? (
        <span className="fk-wc-fast" role="group" aria-label={`${n(m.h)} v ${n(m.a)}`}>
          {(['1', 'X', '2'] as const).map((x) => (
            <button key={x} type="button" className={`fk-wc-fast-btn${k === x ? ' fk-on' : ''}`} aria-pressed={k === x} title={x === '1' ? `${n(m.h)} win` : x === '2' ? `${n(m.a)} win` : 'Draw'}
              onClick={() => onSet(k === x ? null : fastResult(x))} data-testid={`wc-fast-${x}`}>{x}</button>
          ))}
          <span className="fk-wc-sim-score" data-testid="wc-sim-score" title={r ? 'The score this pick counts as' : 'No result picked'}>{r ? `${r.s[0]}–${r.s[1]}` : '–'}</span>
        </span>
      ) : (
        <ScoreInputs r={r} ko={false} onSet={onSet} names={[n(m.h), n(m.a)]} />
      )}
      <Team ed={ed} code={m.a} onTeam={onTeam} squad={false} className="fk-wc-sim-a" />
      {hasVideos && <span className="fk-wc-sim-play"><Play ed={ed} m={m} /></span>}
    </div>
  );
}

function SimTieCard({ ed, t, mode, onSet, onTeam }: { ed: WcEdition; t: SimTie; mode: SimMode; onSet: (r: Result | null) => void; onTeam: (c: string) => void }) {
  const n = (c?: string) => (c ? ed.teams[c] ?? c : undefined);
  const side = (i: 0 | 1) => {
    const code = i ? t.a : t.h;
    const won = t.winner && t.winner === code;
    const f = t.r ? (t.r.et ?? t.r.s) : undefined;
    const label = n(code) ?? <span className="fk-muted">{sourceText(t.slot.from[i])}</span>;
    const cls = `fk-ko-side${t.winner ? (won ? ' fk-ko-win' : ' fk-ko-lose') : ''}`;
    const score = <span className="fk-ko-agg" title={f ? `${f[i]} goals${t.r?.et ? ' after extra time' : ''}${t.r?.p ? `, ${t.r.p[i]} in the penalty shootout (in brackets)` : ''}` : undefined}>{f ? f[i] : ''}{t.r?.p ? <small> ({t.r.p[i]})</small> : null}</span>;
    if (mode === 'fast' && t.h && t.a) {
      return (
        <button type="button" className={`${cls} fk-cupsim-pick`} aria-pressed={!!won} title={won ? `${n(code)} through: click to clear` : `Send ${n(code)} through`}
          onClick={() => onSet(won ? null : fastResult(i ? '2' : '1'))} data-testid="wc-sim-side" data-team={code}>
          <span className="fk-wc-name">{label}</span>{score}
        </button>
      );
    }
    return <div className={cls} data-testid="wc-sim-side" data-team={code}>{code ? <Team ed={ed} code={code} onTeam={onTeam} squad={false} /> : <span className="fk-wc-name" title="Decided by the results before it">{label}</span>}{score}</div>;
  };
  return (
    <div className={`fk-ko-tie fk-wc-tie${t.changed ? ' fk-wc-changed' : ''}`} data-testid="wc-sim-tie" data-n={t.slot.n} data-stage={t.slot.stage} data-changed={t.changed || undefined}>
      {side(0)}
      {side(1)}
      <div className="fk-ko-legs">
        {mode === 'detail' && t.h && t.a ? <ScoreInputs r={t.r} ko onSet={onSet} names={[n(t.h)!, n(t.a)!]} />
          : <a className="fk-muted" href={wcMatchUrl(ed, t.slot.real)} target="_blank" rel="noopener noreferrer" title={`Match ${t.slot.n} of the tournament${t.r ? ` · this pick: ${scoreText(t.r)}` : ''}

Really: ${matchTip(ed, t.slot.real)}`} data-testid="wc-match">Match {t.slot.n}{t.r ? ` · ${scoreText(t.r)}` : ''}</a>}
        <Play ed={ed} m={t.slot.real} />
      </div>
    </div>
  );
}

export default function WorldCupSim({ ed, mode, extra, onTeam, at }: { ed: WcEdition; mode: SimMode; onTeam: (c: string) => void; /** FK-71: start from after this matchday (later matchdays and the knockouts empty) */ at?: number; extra?: (ctx: { picks: Picks; setPicks: (p: Picks) => void; slots: ReturnType<typeof koSlots> }) => ReactNode }) {
  const slots = useMemo(() => koSlots(ed), [ed]);
  // FK-71: a simulation from a matchday keeps its own picks ("2026@2"), first opened with the later matches empty
  const store = at ? `${ed.year}@${at}` : ed.year;
  const fromPoint = () => picksFrom(ed, matchdays(ed), at!, slots);
  const [picks, setPicksState] = useState<Picks>(() => (at && !hasPicks(store) ? fromPoint() : loadPicks(store)));
  const setPicks = (p: Picks) => { setPicksState(p); savePicks(store, p); };
  const v = useMemo(() => simulate(ed, picks, slots, !!at), [ed, picks, slots, at]);
  const rc = useMemo(() => (at && raceEdition(ed) ? race(ed, v.res) : undefined), [ed, at, v]);
  const [who, setWho] = useState<string>();
  const setGroup = (m: WcMatch) => (r: Result | null) => {
    const p = { ...picks };
    // back to the real result: no pick
    if (r && JSON.stringify(r) === JSON.stringify({ s: m.s, ...(m.et ? { et: m.et } : {}), ...(m.p ? { p: m.p } : {}) })) delete p[m.n];
    else p[m.n] = r ? { r } : null;
    setPicks(p);
  };
  const setKo = (t: SimTie) => (r: Result | null) => {
    // a knockout result needs a winner: a level score waits for extra time / the shootout before it counts
    setPicks({ ...picks, [t.slot.n]: r ? { r, h: t.h, a: t.a } : null });
  };
  const rounds = [...new Set(slots.map((s) => s.stage))].filter((s) => s !== 'Third place');
  const stages = [...new Set(v.tables.map((t) => t.group.stage))];
  const changedCount = v.changed.size;
  const thirdsIn = v.thirds?.through;
  return (
    <div className="fk-wc-sim" data-testid="wc-sim" data-mode={mode}>
      <div className="fk-wc-sim-bar">
        <button type="button" className="fk-btn" onClick={() => setPicks({})} disabled={!Object.keys(picks).length} title="Every match back to what really happened" data-testid="wc-sim-reset">Reset to real results</button>
        <button type="button" className="fk-btn" onClick={() => setPicks(clearAll(ed, slots))} title="Every match without a result" data-testid="wc-sim-clear">Clear all</button>
        {at && <button type="button" className="fk-btn" onClick={() => setPicks(fromPoint())} title={`Matchdays 1 to ${at} as they were played, every later match empty again`} data-testid="wc-sim-restart">Start again from after matchday {at}</button>}
        {extra?.({ picks, setPicks, slots })}
        <span className="fk-muted" data-testid="wc-sim-changed">{changedCount ? `${changedCount} match${changedCount > 1 ? 'es' : ''} differ from the real results` : 'The real results'}</span>
        <span className="fk-wc-champ" data-testid="wc-sim-champion">{v.champion ? <>Champion: <b><Team ed={ed} code={v.champion} onTeam={onTeam} squad={false} /></b>{v.champion !== ed.champion ? <span className="fk-muted"> (really <Team ed={ed} code={ed.champion} onTeam={onTeam} squad={false} />)</span> : null}</> : <span className="fk-muted">No champion yet</span>}</span>
      </div>
      {rc && who && <MatchupsPanel ed={ed} r={rc} slots={slots} team={who} onClose={() => setWho(undefined)} />}
      <div className="fk-wc-sim-grid">
        <div className="fk-wc-sim-groups">
          {stages.map((st) => v.tables.filter((t) => t.group.stage === st).map((t) => {
            const g = t.group.name.replace('Group ', '');
            const done = v.done.has(g);
            return (
              <section key={t.group.name} className="fk-wc-sim-group" data-testid="wc-sim-group" data-group={t.group.name}>
                <table className="fk-table fk-ucl-table fk-wc-sim-table">
                  <caption title={STAGE_TIP[t.group.stage]}>{t.group.name}{!done && <span className="fk-muted"> · places once every match has a result</span>}</caption>
                  <thead><tr><Th k="#" /><th className="fk-tl">Team</th><Th k="Pts" /><Th k="P" /><Th k="GD" /><Th k="GF" />{rc && <><th className="fk-tl" title="Through or Out is shown only when nothing in the matches left can change it">For sure?</th><th /></>}</tr></thead>
                  <tbody>
                    {t.rows.map((r, i) => {
                      const through = done && (i < 2 || (thirdsIn?.has(r.team) ?? false));
                      return (
                        <tr key={r.team} className={`fk-wc-rowlink${through ? (i < 2 ? ' fk-lz-ucl' : ' fk-lz-uclq') : ''}`} onClick={rowClick(() => onTeam(r.team))} data-testid="wc-sim-row" data-team={r.team}>
                          <td className="fk-rank" title={r.level ? 'Level on every rule the data has: fair play / lots decide (shown as it really ended)' : undefined}>{r.rank}{r.level && <span className="fk-ucl-eq">=</span>}</td>
                          <td className="fk-tl"><Team ed={ed} code={r.team} onTeam={onTeam} squad={false} /></td><td className="fk-pts">{r.pts}</td><td>{r.p}</td><td>{r.gd > 0 ? `+${r.gd}` : r.gd}</td><td>{r.gf}</td>
                          {rc && <><td className="fk-tl"><StatusChip s={rc.status.get(r.team) ?? 'open'} /></td><td><WhoButton ed={ed} team={r.team} onMatchups={setWho} /></td></>}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div className="fk-wc-sim-matches">
                  {t.matches.map((m) => <GroupMatch key={m.n} ed={ed} m={m} r={v.res(m)} mode={mode} changed={v.changed.has(m.n)} onSet={setGroup(m)} onTeam={onTeam} />)}
                </div>
              </section>
            );
          }))}
          {v.thirds && (
            <section className="fk-wc-sim-group" data-testid="wc-sim-thirds">
              <table className="fk-table fk-ucl-table fk-wc-sim-table">
                <caption>Third-placed teams <span className="fk-muted">(best 8 through)</span>{v.done.size < v.tables.length && <span className="fk-muted"> · decided once every group is</span>}</caption>
                <thead><tr><Th k="#" /><th>Group</th><th className="fk-tl">Team</th><Th k="Pts" /><Th k="GD" /><Th k="GF" /><th /></tr></thead>
                <tbody>{v.thirds.rows.map((r, i) => (
                  <tr key={r.team} className={`fk-wc-rowlink${v.thirds!.through.has(r.team) || (rc && i < 8) ? ' fk-lz-uclq' : ''}${rc && i === 7 ? ' fk-race-cut' : ''}`} onClick={rowClick(() => onTeam(r.team))} data-testid="wc-sim-third" data-team={r.team} data-in={(rc && i < 8) || undefined}>
                    <td className="fk-rank" title={r.level ? 'Level on points, goal difference and goals: fair play decides (not in the data)' : undefined}>{r.rank}{r.level && <span className="fk-ucl-eq">=</span>}</td><td title={r.group}>{r.group.replace('Group ', '')}</td><td className="fk-tl"><Team ed={ed} code={r.team} onTeam={onTeam} squad={false} /></td><td className="fk-pts">{r.pts}</td><td>{r.gd > 0 ? `+${r.gd}` : r.gd}</td><td>{r.gf}</td><td className="fk-muted">{rc ? <StatusChip s={rc.status.get(r.team) ?? 'open'} /> : i === 7 ? 'last through' : ''}</td>
                  </tr>
                ))}</tbody>
              </table>
            </section>
          )}
        </div>
        <div className="fk-wc-sim-bracket" data-testid="wc-sim-bracket">
          {rc && !rc.complete && <p className="fk-race-note" data-testid="wc-sim-stands">As it stands: the first round below is filled from the tables as they are right now. It changes as you pick results.</p>}
          <div className="fk-ko-grid fk-cups-like" style={{ gridTemplateColumns: `repeat(${rounds.length}, minmax(150px, 1fr))` }}>
            {rounds.map((st) => (
              <div key={st} className="fk-ko-col">
                <div className="fk-ko-col-title" title={STAGE_TIP[st]}>{st}</div>
                <div className="fk-ko-col-ties">
                  {v.ties.filter((t) => t.slot.stage === st).sort((a, b) => order(slots, a.slot.n) - order(slots, b.slot.n)).map((t) => <SimTieCard key={t.slot.n} ed={ed} t={t} mode={mode} onSet={setKo(t)} onTeam={onTeam} />)}
                  {st === 'Final' && v.ties.filter((t) => t.slot.stage === 'Third place').map((t) => (
                    <div key={t.slot.n} className="fk-wc-third"><div className="fk-ko-col-title" title={STAGE_TIP['Third place']}>Third place</div><SimTieCard ed={ed} t={t} mode={mode} onSet={setKo(t)} onTeam={onTeam} /></div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Bracket order: from the final back, each match beside the matches that feed it (as the history bracket). */
function order(slots: ReturnType<typeof koSlots>, n: number): number {
  const pos = new Map<number, number>();
  const final = slots.find((s) => s.stage === 'Final');
  if (!final) return n;
  let level = [final];
  pos.set(final.n, 0);
  while (level.length) {
    const next: typeof level = [];
    for (const s of level) s.from.forEach((f, i) => {
      if (f.kind !== 'win') return;
      const feed = slots.find((x) => x.n === f.n)!;
      pos.set(feed.n, pos.get(s.n)! * 2 + i);
      next.push(feed);
    });
    level = next;
  }
  return pos.get(n) ?? n;
}

