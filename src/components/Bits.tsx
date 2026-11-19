// The small parts every view shares: team logo and link, competition mark, form squares, score, and the one-line
// match ("time [comp] [form] logo AWAY 2 @ 1 HOME logo [form]"). Click rule: a team (name or logo) opens its Team
// Calendar; the match (score, "@", time) opens a Google search for it in a new tab. Nothing with a pointer cursor is dead.

import { useState, type MouseEvent, type ReactNode } from 'react';
import { compLogoUrl, teamLogoUrl } from '../address';
import { formAt, recordText, type FormLine } from '../data/form';
import { emptyWindowText, stripWindows, windowLabel, type StripGame, type StripWindow } from '../data/strip';
import { kickoffTime, isPlayed, shortDay } from '../data/model';
import { neutralVenue } from '../data/neutral';
import { leaguePosition } from '../data/position';
import { ordinal } from '../data/tags';
import { seasonSeries } from '../data/series';
import { matchUrl, type Match } from '../data/snapshot';
import { compLabel } from '../data/compLabel';
import { isLeagueViewComp } from './page';
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
export function CompMark({ m, showName = false }: { m: Match; showName?: boolean }) {
  const { model, onLeague } = useFooty();
  const slug = m.c;
  const c = model.comp(slug);
  const [failed, setFailed] = useState(false);
  // FK-46: the competition and the match's round or stage ("Brasileirão · ~Round 35", "Copa do Brasil · Semi-final, 1st leg")
  const label = compLabel(model.snap, m, c.name);
  // FK-46: a click opens the League view on this competition and the match's day (competitions it has)
  const open = onLeague && isLeagueViewComp(slug) ? (e: MouseEvent) => { e.stopPropagation(); onLeague(slug, model.dayOf(m)); } : undefined;
  const title = open ? `${label}
Click: ${c.name} in the League view` : label;
  const mark = (
    <span className={`fk-comp fk-comp-${c.kind}`} title={showName ? undefined : title} data-comp={showName ? undefined : c.code} data-testid={showName ? undefined : 'comp-mark'}>
      {failed ? <span className="fk-comp-code">{c.code}</span> : <img src={compLogoUrl(slug)} alt={c.code} width={16} height={16} loading="lazy" decoding="async" onError={() => setFailed(true)} />}
    </span>
  );
  const inner = showName ? <>{mark}<span className="fk-comp-name" data-testid="comp-name">{c.name}</span></> : mark;
  if (open) {
    return (
      <button type="button" className={`fk-comp-btn${showName ? ' fk-comp-named' : ''}`} title={title} aria-label={title} data-comp={c.code} data-testid="comp-link" onClick={open}>
        {inner}
      </button>
    );
  }
  if (!showName) return mark;
  return <span className="fk-comp-named" title={title} data-comp={c.code}>{inner}</span>;
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

/**
 * FK-47: the Slate card's strip by window — five slots, one window each (midweek Tue–Thu, weekend Fri–Mon): 2 windows
 * before, this match's window in the middle (accent colour, the competition's icon), 2 after. Played: the opponent's
 * crest on green / grey / red; to come: outlined; "vs" / "@" before it. A window without a match: a dashed "–" slot.
 * A window with two matches splits its slot. Hover a slot for its window; a click opens the standings.
 */
export function FormGames({ m, teamId }: { m: Match; teamId: string }) {
  const { model, onStandings } = useFooty();
  const t = model.team(teamId);
  const line = formAt(model, teamId, m);
  const windows = stripWindows(model, teamId, m);
  const text = (g: StripGame) => `${g.now ? 'this match' : g.r ? `${g.r} ${g.gf}-${g.ga}` : 'next'} ${g.home ? 'vs' : '@'} ${model.team(g.opp).name} (${shortDay(g.day)})`;
  const windowText = (w: StripWindow) => (w.games.length ? `${windowLabel(w)}: ${w.games.map(text).join(', ')}` : emptyWindowText(w));
  const tip = [
    `${t.name}: the 2 windows before this match's, its own, the 2 after`,
    ...windows.map(windowText),
    `League record ${recordText(line.record)} (W-D-L)`,
    line.streak && `Streak ${line.streak}`,
    onStandings && 'Click: standings',
  ].filter(Boolean).join('\n');
  const square = (g: StripGame, half: boolean) => (
    <span key={g.id} className={`fk-fg-sq${half ? ' fk-fg-half' : ''}${g.now ? ' fk-fg-this' : g.r ? ` fk-form-${g.r}` : ' fk-fg-next'}`} data-testid="form-game" data-result={g.r} data-home={g.home || undefined} data-now={g.now || undefined}>
      {g.now ? <StripCompIcon slug={g.c} /> : <GameCrest id={g.opp} />}
    </span>
  );
  const slots = windows.map((w) => {
    const now = w.games.some((g) => g.now);
    const side = w.offset < 0 ? 'before' : w.offset > 0 ? 'after' : 'now';
    if (!w.games.length) {
      return (
        <span key={w.start} className="fk-fg fk-fg-empty" data-testid="strip-slot" data-side={side} data-state={w.state} title={emptyWindowText(w)}>
          <span className="fk-fg-at" /><span className="fk-fg-sq fk-fg-free">–</span>
        </span>
      );
    }
    const games = w.games.slice(0, 2);
    return (
      <span key={w.start} className={`fk-fg${now ? ' fk-fg-now' : ''}`} data-testid="strip-slot" data-side={side} data-count={w.games.length} title={windowText(w)}>
        <span className="fk-fg-at">{games[0]!.home ? 'vs' : '@'}</span>
        {games.length === 1 ? square(games[0]!, false) : <span className="fk-fg-split">{games.map((g) => square(g, true))}</span>}
      </span>
    );
  });
  if (!onStandings) return <span className="fk-form fk-form-games fk-form-plain" title={tip} data-testid="form">{slots}</span>;
  return (
    <button type="button" className="fk-form fk-form-games" title={tip} data-testid="form" onClick={(e) => { e.stopPropagation(); onStandings(teamId); }}>
      {slots}
    </button>
  );
}

/** FK-47: the competition's icon in the middle slot (its code when there is no logo file). */
function StripCompIcon({ slug }: { slug: string }) {
  const { model } = useFooty();
  const [failed, setFailed] = useState(false);
  if (failed) return <span className="fk-fg-name">{model.comp(slug).code}</span>;
  return <img src={compLogoUrl(slug)} alt={model.comp(slug).code} width={14} height={14} loading="lazy" decoding="async" onError={() => setFailed(true)} />;
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
  const { model, onSeries, onSeriesLeave } = useFooty();
  const a = model.followed.has(m.a) ? m.a : m.h;
  const b = a === m.a ? m.h : m.a;
  const meetings = seasonSeries(model, a, b);
  if (meetings.length < 2) return null;
  const k = meetings.findIndex((x) => x.m.id === m.id) + 1;
  // FK-37: hovering (or focusing) the chip opens the season series, like calendarkit's chip; a click pins it
  const open = (el: HTMLElement, hover: boolean) => onSeries(a, b, el, m.id, hover);
  return (
    <button type="button" className="fk-chip fk-series-chip" data-testid="series-chip" title={`Meeting ${k} of ${meetings.length} this season — hover for all of them, click to keep it open`}
      onMouseEnter={(e) => open(e.currentTarget, true)} onMouseLeave={() => onSeriesLeave?.()} onFocus={(e) => open(e.currentTarget, true)} onBlur={() => onSeriesLeave?.()}
      onClick={(e) => { e.stopPropagation(); open(e.currentTarget, false); }}>
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
