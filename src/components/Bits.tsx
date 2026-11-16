// The small parts every view shares: team logo and link, competition mark, form squares, score, and the one-line
// match ("time [comp] [form] logo AWAY 2 @ 1 HOME logo [form]"). Click rule: a team (name or logo) opens its Team
// Calendar; the match (score, "@", time) opens a Google search for it in a new tab. Nothing with a pointer cursor is dead.

import { useState, type MouseEvent, type ReactNode } from 'react';
import { compLogoUrl, teamLogoUrl } from '../address';
import { formAt, recordText, type FormLine } from '../data/form';
import { kickoffTime, isPlayed, shortDay } from '../data/model';
import { neutralVenue } from '../data/neutral';
import { leaguePosition } from '../data/position';
import { ordinal } from '../data/tags';
import { seasonSeries } from '../data/series';
import { matchUrl, type Match } from '../data/snapshot';
import { useFooty } from './ctx';
import { DerbyTag, TeamTags } from './Tags';

/** A team's logo on a light disc (dark logos stay readable on the dark theme); a plain disc when there is no file. */
export function TeamLogo({ id, size = 20 }: { id: string; size?: number }) {
  const [failed, setFailed] = useState(false);
  return (
    <span className="fk-logo" style={{ width: size, height: size }} aria-hidden="true">
      {!failed && <img src={teamLogoUrl(id)} alt="" width={size - 2} height={size - 2} loading="lazy" decoding="async" onError={() => setFailed(true)} />}
    </span>
  );
}

/** Name and/or logo of a team, a link to its Team Calendar. `label`: abbr (default), short or full name. */
export function TeamLink({ id, day, label = 'abbr', logo = 'before', logoSize, className = '' }: { id: string; day: string; label?: 'abbr' | 'short' | 'name' | 'none'; logo?: 'before' | 'after' | 'none'; logoSize?: number; className?: string }) {
  const { model, onTeam, teamHref } = useFooty();
  const t = model.team(id);
  const followed = model.followed.has(id);
  const text = label === 'abbr' ? t.abbr : label === 'short' ? t.short : label === 'name' ? t.name : '';
  const img = logo !== 'none' && <TeamLogo id={id} size={logoSize} />;
  const content = (
    <>
      {logo === 'before' && img}
      {text && <span className="fk-team-name">{text}</span>}
      {logo === 'after' && img}
    </>
  );
  // Only followed clubs have a Team Calendar; another team's name is plain text with its full name on hover.
  if (!followed || (!onTeam && !teamHref)) return <span className={`fk-team fk-team-plain ${className}`} title={t.name}>{content}</span>;
  if (!onTeam && teamHref) {
    return (
      <a className={`fk-team fk-team-link ${className}`} href={teamHref(id, day)} target="_blank" rel="noopener noreferrer" title={`${t.name} — open its calendar`} data-team={t.abbr} draggable={false} onClick={(e) => e.stopPropagation()}>
        {content}
      </a>
    );
  }
  return (
    <button type="button" className={`fk-team fk-team-link ${className}`} title={`${t.name} — open its calendar`} data-team={t.abbr} onClick={(e) => { e.stopPropagation(); onTeam!(id, day); }}>
      {content}
    </button>
  );
}

/** The competition's small logo; its code and full name on hover. A code badge when there is no logo file.
 * `showName`: the name spelled out after the logo, in a fixed-width cell (list rows, so the team columns line up;
 * a long name ends in "…", the tooltip keeps it whole). */
export function CompMark({ slug, round, showName = false }: { slug: string; round?: string; showName?: boolean }) {
  const { model } = useFooty();
  const c = model.comp(slug);
  const [failed, setFailed] = useState(false);
  const title = `${c.code} · ${c.name}${round ? ` · ${round}` : ''}`;
  const mark = (
    <span className={`fk-comp fk-comp-${c.kind}`} title={showName ? undefined : title} data-comp={showName ? undefined : c.code}>
      {failed ? <span className="fk-comp-code">{c.code}</span> : <img src={compLogoUrl(slug)} alt={c.code} width={16} height={16} loading="lazy" decoding="async" onError={() => setFailed(true)} />}
    </span>
  );
  if (!showName) return mark;
  return (
    <span className="fk-comp-named" title={title} data-comp={c.code}>
      {mark}
      <span className="fk-comp-name" data-testid="comp-name">{c.name}</span>
    </span>
  );
}

const RESULT_TEXT = { W: 'win', D: 'draw', L: 'defeat' } as const;

/** Last 5 results as squares (oldest first); record, streak and runs in the tooltip; a click opens the standings. */
export function FormSquares({ line, teamId }: { line: FormLine; teamId: string }) {
  const { model, onStandings } = useFooty();
  const t = model.team(teamId);
  const tip = [
    `${t.name}: last ${line.last5.length} — ${line.last5.map((r) => RESULT_TEXT[r]).join(', ') || 'no match played'}`,
    `League record ${recordText(line.record)} (W-D-L)`,
    line.streak && `Streak ${line.streak}${line.unbeaten ? ` · unbeaten in ${line.unbeaten}` : ''}${line.winless ? ` · winless in ${line.winless}` : ''}`,
    onStandings && 'Click: standings',
  ].filter(Boolean).join('\n');
  const squares = Array.from({ length: 5 }, (_, i) => {
    const r = line.last5[i - (5 - line.last5.length)];
    return <span key={i} className={`fk-form-sq${r ? ` fk-form-${r}` : ''}`} />;
  });
  // a host without the standings popup (the Slate part): plain squares, nothing clickable that does nothing
  if (!onStandings) return <span className="fk-form fk-form-plain" title={tip} data-testid="form">{squares}</span>;
  return (
    <button type="button" className="fk-form" title={tip} data-testid="form" onClick={(e) => { e.stopPropagation(); onStandings(teamId); }}>
      {squares}
    </button>
  );
}

/** FK-32: the Slate card's last games: one square per match (oldest first), the opponent's crest (its short name if the
 * crest fails) on the result's colour, after "vs" (home) or "@" (away) in a slot of one width so the squares line up. */
export function FormGames({ line, teamId }: { line: FormLine; teamId: string }) {
  const { model, onStandings } = useFooty();
  const t = model.team(teamId);
  const tip = [
    `${t.name}: last ${line.games.length}`,
    ...line.games.map((g) => `${g.r} ${g.gf}-${g.ga} ${g.home ? 'vs' : '@'} ${model.team(g.opp).name} (${shortDay(g.day)})`),
    `League record ${recordText(line.record)} (W-D-L)`,
    line.streak && `Streak ${line.streak}`,
    onStandings && 'Click: standings',
  ].filter(Boolean).join('\n');
  const empty = Array.from({ length: 5 - line.games.length }, (_, i) => <span key={`e${i}`} className="fk-fg"><span className="fk-fg-at" /><span className="fk-fg-sq" /></span>);
  const squares = [...empty, ...line.games.map((g) => (
    <span key={g.id} className="fk-fg" data-testid="form-game" data-result={g.r} data-home={g.home || undefined}>
      <span className="fk-fg-at">{g.home ? 'vs' : '@'}</span>
      <span className={`fk-fg-sq fk-form-${g.r}`}><GameCrest id={g.opp} /></span>
    </span>
  ))];
  if (!onStandings) return <span className="fk-form fk-form-games fk-form-plain" title={tip} data-testid="form">{squares}</span>;
  return (
    <button type="button" className="fk-form fk-form-games" title={tip} data-testid="form" onClick={(e) => { e.stopPropagation(); onStandings(teamId); }}>
      {squares}
    </button>
  );
}

function GameCrest({ id }: { id: string }) {
  const { model } = useFooty();
  const [failed, setFailed] = useState(false);
  if (failed) return <span className="fk-fg-name">{model.team(id).abbr}</span>;
  return <img src={teamLogoUrl(id)} alt={model.team(id).abbr} width={16} height={16} loading="lazy" decoding="async" onError={() => setFailed(true)} />;
}

/** FK-28: a team's current place in its domestic league, small and muted beside its name ("3rd"); nothing for a team
 * in no followed league's table. */
export function LeaguePos({ id }: { id: string }) {
  const { model } = useFooty();
  const p = leaguePosition(model, id);
  if (!p) return null;
  return <span className="fk-pos" data-testid="league-pos" title={`${model.team(id).name}: ${ordinal(p.rank)} of ${p.teams} in the ${model.comp(p.league).name} now`}>{ordinal(p.rank)}</span>;
}

/** "2-1 agg", "pens 4-5" — a second leg's or a shootout's line, from the home side. */
export function tieNote(m: Match): string | undefined {
  const parts: string[] = [];
  if (m.ha !== undefined && m.aa !== undefined) parts.push(`agg ${m.aa}-${m.ha}`);
  if (m.hp !== undefined && m.ap !== undefined) parts.push(`pens ${m.ap}-${m.hp}`);
  return parts.length ? parts.join(' · ') : undefined;
}

export const statusText = (m: Match): string | undefined =>
  m.st === 'ppd' ? 'Postponed' : m.st === 'can' ? 'Cancelled' : m.st === 'abd' ? 'Abandoned' : m.st === 'susp' ? 'Suspended' : undefined;

/** Kickoff ("21:30", "TBD"), "LIVE 67'" or nothing for a played match (its score says it). */
export function MatchTime({ m }: { m: Match }) {
  const { timeZone } = useFooty();
  if (m.st === 'in') return <span className="fk-time fk-live">{m.clk ?? 'LIVE'}</span>;
  const s = statusText(m);
  if (s) return <span className="fk-time fk-off">{s}</span>;
  if (isPlayed(m)) return <span className="fk-time fk-ft">FT</span>;
  return <span className="fk-time">{m.tbd ? 'TBD' : kickoffTime(m.t, timeZone)}</span>;
}

const openMatch = (url: string) => (e: MouseEvent) => {
  e.stopPropagation();
  window.open(url, '_blank', 'noopener');
};

/** AWAY 2 @ 1 HOME, the scores against the "@" (none before kickoff: no empty space around the "@"). */
export function Scoreline({ m, day, label = 'abbr', form = true, logoSize = 20, tags = true }: { m: Match; day: string; label?: 'abbr' | 'short'; form?: boolean; logoSize?: number; tags?: boolean }) {
  const { model } = useFooty();
  const scored = m.hs !== undefined && m.as !== undefined && (isPlayed(m) || m.st === 'in' || m.st === 'abd' || m.st === 'susp');
  const neutral = neutralVenue(m);
  const tie = tieNote(m);
  const venue = [m.v, m.city].filter(Boolean).join(', ');
  const fa = form && model.followed.has(m.a) ? formAt(model, m.a, m) : undefined;
  const fh = form && model.followed.has(m.h) ? formAt(model, m.h, m) : undefined;
  return (
    <span className={`fk-line${neutral ? ' fk-neutral' : ''}${m.st === 'in' ? ' fk-line-live' : ''}`} data-match={m.id}>
      <span className="fk-side fk-away">
        {tags && <TeamTags m={m} side="a" align="end" />}
        {fa && <FormSquares line={fa} teamId={m.a} />}
        <TeamLink id={m.a} day={day} label={label} logoSize={logoSize} />
        <LeaguePos id={m.a} />
      </span>
      <button type="button" className="fk-at" title={`${model.team(m.a).name} at ${model.team(m.h).name}${venue ? ` — ${venue}` : ''}${neutral ? ` (neutral venue: ${neutral.why})` : ''}${tie ? `\n${tie}` : ''}\nSearch the match on Google`} onClick={openMatch(matchUrl(m, model))}>
        {scored && <span className="fk-score">{m.as}</span>}
        <span className="fk-at-sign">{neutral ? 'v' : '@'}</span>
        {scored && <span className="fk-score">{m.hs}</span>}
      </button>
      <span className="fk-side fk-home">
        <LeaguePos id={m.h} />
        <TeamLink id={m.h} day={day} label={label} logo="after" logoSize={logoSize} />
        {fh && <FormSquares line={fh} teamId={m.h} />}
        {tags && <TeamTags m={m} side="h" />}
      </span>
      {tie && <span className="fk-tie" title={tie}>{tie}</span>}
      {tags && <DerbyTag m={m} />}
      {neutral && <span className="fk-neutral-tag" title={`Neutral venue: ${venue || 'venue unknown'} (${neutral.why})`}>N</span>}
    </span>
  );
}

/** "2nd meeting" style chip when the two teams meet more than once this season; opens the season series. */
export function SeriesChip({ m }: { m: Match }) {
  const { model, onSeries } = useFooty();
  const a = model.followed.has(m.a) ? m.a : m.h;
  const b = a === m.a ? m.h : m.a;
  const meetings = seasonSeries(model, a, b);
  if (meetings.length < 2) return null;
  const k = meetings.findIndex((x) => x.m.id === m.id) + 1;
  return (
    <button type="button" className="fk-chip fk-series-chip" title={`Meeting ${k} of ${meetings.length} this season — click for all of them`} onClick={(e) => { e.stopPropagation(); onSeries(a, b, e.currentTarget, m.id); }}>
      {k}/{meetings.length}
    </button>
  );
}

export function Chip({ children, title, className = '' }: { children: ReactNode; title?: string; className?: string }) {
  return <span className={`fk-chip ${className}`} title={title}>{children}</span>;
}

/** The "↗" that searches a match on Google (list rows). */
export function MatchLink({ m }: { m: Match }) {
  const { model } = useFooty();
  return (
    <a className="fk-ext" href={matchUrl(m, model)} target="_blank" rel="noopener noreferrer" title="Search the match on Google" onClick={(e) => e.stopPropagation()}>
      ↗
    </a>
  );
}
