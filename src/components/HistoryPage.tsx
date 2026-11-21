// FK-64: a competition's history (the "History" button on the Tables and Cups pages): pick a past season and see its
// final table (leagues) or its group tables and knockout bracket (cups, two-legged ties added up), and a summary of the
// competition: champions by season and who usually goes far. Data: public/history/ (scripts/make-history.ts, ESPN).
// Matches open a Google search; followed clubs open their calendar. Its own chunk.

import { useEffect, useMemo, useState } from 'react';
import { LEAGUES } from '../../config/leagues';
import type { LeagueSlug } from '../../config/season';
import { rankTable } from '../data/leagueTable';
import { histBracket, loadHistIndex, loadHistSeason, records, type HistIndex, type HistSeason, type HistSummary } from '../data/history';
import type { CupTie } from '../data/cups';
import type { Match } from '../data/snapshot';
import { useFooty } from './ctx';
import { EditionPicker } from './EditionPicker';
import './ucl.css';
import './wc.css';

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function useLoad<T>(key: string, f: () => Promise<T>) {
  const [s, setS] = useState<{ key: string; v?: T; err?: string }>({ key });
  useEffect(() => { let live = true; f().then((v) => live && setS({ key, v }), (e: Error) => live && setS({ key, err: e.message })); return () => { live = false; }; }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  return s.key === key ? s : { key };
}

function useSeasonTools(s: HistSeason) {
  const { model, timeZone, onTeam } = useFooty();
  const name = (id: string) => s.teams[id]?.short ?? s.teams[id]?.name ?? id;
  const day = (m: Match) => new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(m.t));
  const url = (m: Match) => { const [y, mo, d] = day(m).split('-'); return `https://www.google.com/search?q=${encodeURIComponent(`${s.teams[m.h]?.name ?? name(m.h)} vs ${s.teams[m.a]?.name ?? name(m.a)} ${MON[Number(mo) - 1]} ${Number(d)} ${y}`)}`; };
  const team = (id: string) => (model.followed.has(id) && onTeam
    ? <button type="button" className="fk-wc-name" onClick={() => onTeam(id, day(s.matches[s.matches.length - 1]!))} title={`${s.teams[id]?.name}: open the club's calendar`} data-testid="hist-team">{name(id)}</button>
    : <span data-testid="hist-team">{name(id)}</span>);
  return { name, day, url, team };
}

function Squares({ s, team }: { s: HistSeason; team: string }) {
  const { name, url, day } = useSeasonTools(s);
  const last = s.matches.filter((m) => (m.h === team || m.a === team) && m.st === 'post' && !m.r).slice(-5);
  return (
    <span className="fk-lt-squares">
      {last.map((m) => {
        const home = m.h === team;
        const gf = home ? m.hs! : m.as!, ga = home ? m.as! : m.hs!;
        const k = gf > ga ? 'W' : gf < ga ? 'L' : 'D';
        return (
          <a key={m.id} className={`fk-usq fk-usq-${k}`} href={url(m)} target="_blank" rel="noopener noreferrer" title={`${k === 'W' ? 'Won' : k === 'L' ? 'Lost' : 'Drew'} ${gf}-${ga} ${home ? 'vs' : 'at'} ${name(home ? m.a : m.h)}\n${day(m)}\nSearch the match on Google`} data-testid="hist-square">
            <span className="fk-usq-opp"><span className="fk-usq-at">{home ? 'vs' : '@'}</span>{s.teams[home ? m.a : m.h]?.abbr}</span>
            <span className="fk-usq-res">{gf}-{ga}</span>
          </a>
        );
      })}
    </span>
  );
}

function LeagueSeason({ s }: { s: HistSeason }) {
  const { team } = useSeasonTools(s);
  // ESPN's final standings; a season ESPN has none for is worked out from the results with the league's rules
  const official = s.tables[0];
  const rows = useMemo(() => {
    if (official) return official.rows.map((r) => ({ ...r, gd: r.gf - r.ga }));
    const members = Object.keys(s.teams);
    const cfg = LEAGUES[s.comp as LeagueSlug];
    return cfg ? rankTable(members, s.matches.filter((m) => !m.r), cfg, (id) => s.teams[id]?.name ?? id).rows.map((r) => ({ ...r, zone: undefined, zc: undefined })) : [];
  }, [official, s]);
  return (
    <>
      {!official && <p className="fk-muted" data-testid="hist-computed">ESPN has no standings for {s.label}: the table is worked out from its results with today's tiebreak rules.</p>}
      <table className="fk-table fk-ucl-table" data-testid="hist-table">
        <thead><tr><th>#</th><th className="fk-tl">Team</th><th>Pts</th><th>P</th><th>W</th><th>D</th><th>L</th><th>GF</th><th>GA</th><th>GD</th><th className="fk-tl">Last 5</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.team} data-testid="hist-row" data-team={r.team} title={r.zone || undefined} style={r.zc ? { boxShadow: `inset 3px 0 0 #${r.zc.replace('#', '')}` } : undefined}>
              <td className="fk-rank">{r.rank}</td><td className="fk-tl fk-ucl-team">{team(r.team)}</td><td className="fk-pts">{r.pts}</td>
              <td>{r.p}</td><td>{r.w}</td><td>{r.d}</td><td>{r.l}</td><td>{r.gf}</td><td>{r.ga}</td><td>{r.gd > 0 ? `+${r.gd}` : r.gd < 0 ? `−${-r.gd}` : 0}</td>
              <td className="fk-tl"><Squares s={s} team={r.team} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

function Tie({ s, t }: { s: HistSeason; t: CupTie }) {
  const { url, day, team } = useSeasonTools(s);
  const side = (id: string, g: number, p?: number) => (
    <div className={`fk-ko-side${t.winner ? (t.winner === id ? ' fk-ko-win' : ' fk-ko-lose') : ''}`}>{team(id)}<span className="fk-ko-agg">{g}{p !== undefined ? <small> ({p})</small> : null}</span></div>
  );
  return (
    <div className="fk-ko-tie fk-wc-tie" data-testid="hist-tie">
      {side(t.a, t.goalsA, t.pensA)}
      {side(t.b, t.goalsB, t.pensB)}
      <div className="fk-ko-legs">{t.legs.map((m) => <a key={m.id} href={url(m)} target="_blank" rel="noopener noreferrer" title={`${day(m)} — search on Google`} data-testid="hist-match">{s.teams[m.h]?.abbr} {m.hs ?? ''}-{m.as ?? ''} {s.teams[m.a]?.abbr}</a>)}</div>
    </div>
  );
}

function CupSeason({ s }: { s: HistSeason }) {
  const { team } = useSeasonTools(s);
  const { bracket, earlier, cols } = useMemo(() => histBracket(s), [s]);
  return (
    <>
      {bracket.length > 0 ? (
        <section className="fk-ko" data-testid="hist-knockout">
          <div className="fk-ko-grid" data-testid="hist-bracket" style={{ gridTemplateColumns: `repeat(${bracket.length}, minmax(160px, 210px))` }}>
            {bracket.map((r, i) => (
              <div key={r.round} className="fk-ko-col">
                <div className="fk-ko-col-title">{r.round}{r.legs === 2 ? <span className="fk-muted"> two legs</span> : null}</div>
                <div className="fk-ko-col-ties">{cols[i]!.map((t) => <Tie key={`${t.a}-${t.b}`} s={s} t={t} />)}</div>
              </div>
            ))}
          </div>
        </section>
      ) : <p className="fk-muted">ESPN's data for {s.label} has no final: no bracket.</p>}
      {s.tables.length > 0 && (
        <section className="fk-cup-groups-wrap">
          <h3>{s.tables.length > 1 ? 'Groups' : 'League phase'}</h3>
          <div className="fk-cup-groups fk-wc-groups">
            {s.tables.map((t) => (
              <table key={t.name} className="fk-table fk-ucl-table fk-wc-group" data-testid="hist-group">
                <caption>{t.name.replace(/^.*?(Group [A-Z0-9]+)$/, '$1')}</caption>
                <thead><tr><th>#</th><th className="fk-tl">Team</th><th>Pts</th><th>P</th><th>W</th><th>D</th><th>L</th><th>Goals</th></tr></thead>
                <tbody>{t.rows.map((r) => <tr key={r.team} title={r.zone || undefined} style={r.zc ? { boxShadow: `inset 3px 0 0 #${r.zc.replace('#', '')}` } : undefined}><td className="fk-rank">{r.rank}</td><td className="fk-tl fk-ucl-team">{team(r.team)}</td><td className="fk-pts">{r.pts}</td><td>{r.p}</td><td>{r.w}</td><td>{r.d}</td><td>{r.l}</td><td>{r.gf}–{r.ga}</td></tr>)}</tbody>
              </table>
            ))}
          </div>
        </section>
      )}
      {earlier.length > 0 && (
        <section className="fk-ko">
          <h3>Earlier rounds</h3>
          {earlier.map((r) => (
            <details key={r.round} className="fk-cup-qual">
              <summary className="fk-ko-col-title">{r.round} <span className="fk-muted">{r.ties.length} ties{r.legs === 2 ? ', two legs' : ''}</span></summary>
              <div className="fk-cup-qual-ties">{r.ties.map((t) => <Tie key={`${t.a}-${t.b}`} s={s} t={t} />)}</div>
            </details>
          ))}
        </section>
      )}
    </>
  );
}

function Summary({ comp, idx, year, onSeason }: { comp: string; idx: HistIndex; year?: number; onSeason: (y: number) => void }) {
  const c = idx[comp]!;
  const done = c.seasons.filter((s) => s.complete);
  const played = useMemo(() => new Map<string, number>(), []);
  const recs = useMemo(() => records(done, played).slice(0, 10), [done, played]);
  const nm = (id?: string) => (id ? c.teams[id] ?? id : '–');
  const league = c.kind === 'league';
  return (
    <section className="fk-wc-history" data-testid="hist-summary">
      <h3>{c.name}: {done.length} seasons <span className="fk-muted">{done[0]?.label} to {done[done.length - 1]?.label}</span></h3>
      <div className="fk-histpage-sum">
        <div className="fk-wc-history-list" data-testid="hist-champions">
          {[...c.seasons].reverse().map((s: HistSummary) => (
            <button key={s.year} type="button" className={`fk-wc-hist-item ${s.complete ? 'fk-wc-reach-10' : ''}${s.year === year ? ' fk-wc-hist-on' : ''}`} aria-pressed={s.year === year} onClick={() => onSeason(s.year)} title={s.complete ? `${s.label}: ${nm(s.champion)} won${s.runnerUp ? `, ${nm(s.runnerUp)} ${league ? '2nd' : 'runner-up'}` : ''}` : `${s.label}: not complete in ESPN's data (matches missing, or the season was stopped early)`} data-testid="hist-season-chip" data-year={s.year}>
              <b>{s.label}</b> {s.complete ? nm(s.champion) : <span className="fk-muted">incomplete</span>}
            </button>
          ))}
        </div>
        <table className="fk-table fk-ucl-table fk-histpage-records" data-testid="hist-records">
          <caption>Who usually goes far</caption>
          <thead><tr><th className="fk-tl">Team</th><th title="Titles">Won</th><th title={league ? 'Second place' : 'Lost the final'}>{league ? '2nd' : 'Final'}</th><th title={league ? 'In the top 4' : 'In the semi-finals'}>{league ? 'Top 4' : 'Semis'}</th>{league && <th title="Relegated">Rel.</th>}</tr></thead>
          <tbody>{recs.map((r) => <tr key={r.team}><td className="fk-tl">{nm(r.team)}</td><td className="fk-pts">{r.titles}</td><td>{r.finals}</td><td>{r.far}</td>{league && <td>{r.relegated}</td>}</tr>)}</tbody>
        </table>
      </div>
    </section>
  );
}

/** FK-65: the competition is picked on the What row; FK-74: the season from the dropdown beside the title. */
export default function HistoryPage({ comp, season, onPage }: { comp: string; season?: number; onPage: (comp: string, season?: number) => void }) {
  const idx = useLoad('index', loadHistIndex);
  const c = idx.v?.[comp];
  const years = c?.seasons.map((s) => s.year) ?? [];
  const year = season && years.includes(season) ? season : years[years.length - 1];
  const s = useLoad(`${comp}/${year}`, () => (year ? loadHistSeason(comp, year) : Promise.reject(new Error('no seasons'))));
  return (
    <div className="fk-ucl fk-lt fk-cups fk-histpage" data-testid="hist-page" data-comp={comp} data-year={year}>
      <div className="fk-ucl-head">
        <h2>{c?.name ?? comp} <span className="fk-muted">· history</span></h2>
        {/* FK-74: the season from one dropdown (newest first) with ◀ ▶; the champions list below still opens a season too */}
        {c && <EditionPicker noun="season" testId="hist-season" value={year} editions={c.seasons.map((x) => ({ value: x.year, label: x.label }))} onChange={(y) => onPage(comp, y)} />}
      </div>
      {idx.err && <p className="fk-muted">The history couldn't be loaded ({idx.err}).</p>}
      {idx.v && !c && <p className="fk-muted">No history for this competition.</p>}
      {idx.v && c && <Summary comp={comp} idx={idx.v} year={year} onSeason={(y) => onPage(comp, y)} />}
      {s.err && <p className="fk-muted">The season couldn't be loaded ({s.err}).</p>}
      {s.v && (
        <>
          <h3 className="fk-histpage-season" data-testid="hist-season-title">{c?.name} {s.v.label}{c?.seasons.find((x) => x.year === year)?.complete === false ? <span className="fk-muted"> · not complete in ESPN's data (matches missing, or the season was stopped early)</span> : null}</h3>
          {c?.kind === 'league' ? <LeagueSeason s={s.v} /> : <CupSeason s={s.v} />}
          <p className="fk-ucl-src">Source: ESPN's past scoreboards and standings. Seasons go back as far as ESPN's free data does.</p>
        </>
      )}
    </div>
  );
}
