// Context tags next to each team (Phase 3), in three display variants to compare in real use (the bar's "Tags"
// switch): chips (every tag as a short text chip), rail (a three-cell window strip plus small marks) and alerts (only
// what stands out). Hovering a team's tags opens the detailed popup; the derby flag is one per match. The logic lives
// in src/data/tags.ts; this file only draws it.

import { useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { compInfo } from '../../config/competitions';
import { RELEGATION, Z4R_RULE } from '../../config/relegation';
import { isPlayed, resultFor, shortDay, type Model } from '../data/model';
import type { Match } from '../data/snapshot';
import { aliveCount, firstLegScore, matchTags, ordinal, slotKind, slotMatch, STREAK_TAG_MIN, type SideTags } from '../data/tags';
import { windowEnd, type WindowSlot } from '../data/windows';
import { z4Text } from '../data/z4r';
import { useFooty } from './ctx';

export type TagVariant = 'chips' | 'rail' | 'alerts' | 'off';
export const TAG_VARIANTS: [TagVariant, string][] = [['chips', 'Chips'], ['rail', 'Rail'], ['alerts', 'Alerts'], ['off', 'Off']];

const TAG_KEY = 'fk:tags:v1';
/** The variant last picked (saved only when picked: no default is ever written). */
export function savedTagVariant(): TagVariant {
  try {
    const v = localStorage.getItem(TAG_KEY);
    return TAG_VARIANTS.some(([k]) => k === v) ? (v as TagVariant) : 'chips';
  } catch {
    return 'chips';
  }
}
export function saveTagVariant(v: TagVariant) {
  try { localStorage.setItem(TAG_KEY, v); } catch { /* private mode: the pick lasts for this page only */ }
}

const windowName = (s: WindowSlot) => `${s.kind === 'mid' ? 'Midweek' : 'Weekend'} ${shortDay(s.start)}–${shortDay(windowEnd(s.start))}`;

/** Short code of a window: "free", "PL", "UCL", "CDB 2-0" (a second leg with the first-leg score). */
function slotCode(model: Model, s: WindowSlot, team: string): string | undefined {
  const k = slotKind(s);
  if (k === 'free') return 'free';
  const m = slotMatch(s);
  if (!m) return undefined;
  const leg1 = firstLegScore(model, m, team);
  return `${compInfo(m.c).code}${leg1 ? ` ${leg1}` : ''}`;
}

function slotLines(model: Model, s: WindowSlot, team: string): string {
  switch (s.state) {
    case 'free': return 'free';
    case 'before': return 'before its first match of the season';
    case 'unscheduled': return 'nothing scheduled yet';
    case 'unknown': return 'unknown (not a followed club: its full schedule isn\'t loaded)';
    default: return s.matches.map((m) => {
      const opp = model.team(m.h === team ? m.a : m.h).name;
      const r = resultFor(m, team);
      const mine = m.h === team ? m.hs : m.as, theirs = m.h === team ? m.as : m.hs;
      const leg1 = firstLegScore(model, m, team);
      return `${compInfo(m.c).code}${m.r ? ` ${m.r}` : ''} ${m.h === team ? 'v' : '@'} ${opp}${isPlayed(m) ? ` · ${r} ${mine}-${theirs}` : ''}${leg1 ? ` · 1st leg ${leg1}` : ''}`;
    }).join('; ');
  }
}

interface Token { key: string; text: string; cls: string }

function tokens(model: Model, s: SideTags): Token[] {
  const out: Token[] = [];
  const prev = slotCode(model, s.prev, s.team), next = slotCode(model, s.next, s.team);
  if (prev) out.push({ key: 'prev', text: `◂${prev}`, cls: `fk-tag-${slotKind(s.prev)}` });
  if (s.streak !== undefined && s.streak >= STREAK_TAG_MIN) out.push({ key: 'streak', text: ordinal(s.streak), cls: 'fk-tag-streak' });
  if (s.rested) out.push({ key: 'rest', text: 'REST', cls: 'fk-tag-rest' });
  const n = aliveCount(s);
  if (n !== undefined) out.push({ key: 'alive', text: `${n}C`, cls: `fk-tag-alive fk-tag-alive-${Math.min(n, 3)}` });
  if (s.z4?.tagged) out.push({ key: 'z4', text: 'Z4R', cls: 'fk-tag-z4' });
  if (next) out.push({ key: 'next', text: `${next}▸`, cls: `fk-tag-${slotKind(s.next)}` });
  return out;
}

/** Alerts keep only what stands out: a streak, rest, a cup match next window, 3+ competitions, Z4R. */
const ALERT = (t: Token) => t.key === 'streak' || t.key === 'rest' || t.key === 'z4' || (t.key === 'next' && t.cls === 'fk-tag-cup') || (t.key === 'alive' && /fk-tag-alive-3/.test(t.cls));

function Rail({ s }: { s: SideTags }) {
  const cell = (slot: WindowSlot, which: string) => <span className={`fk-rail-cell fk-rail-${slotKind(slot)}${which === 'prev' && s.rested ? ' fk-rail-rest' : ''}`} />;
  const n = aliveCount(s);
  return (
    <>
      <span className="fk-rail" aria-hidden="true">
        {cell(s.prev, 'prev')}
        <span className="fk-rail-cell fk-rail-now" />
        {cell(s.next, 'next')}
      </span>
      {s.streak !== undefined && s.streak >= STREAK_TAG_MIN && <span className="fk-rail-mark fk-tag-streak">{s.streak}</span>}
      {n !== undefined && <span className="fk-rail-mark">{n}C</span>}
      {s.z4?.tagged && <span className="fk-rail-mark fk-tag-z4">Z</span>}
      {s.rested && <span className="fk-rail-mark fk-tag-rest">R</span>}
    </>
  );
}

function Popup({ model, m, s, opp, at }: { model: Model; m: Match; s: SideTags; opp: SideTags; at: DOMRect }) {
  const t = model.team(s.team);
  const derby = matchTags(model, m).derby;
  const line = (head: string, body: ReactNode) => <div className="fk-tagpop-line"><span className="fk-pop-head">{head}</span><span>{body}</span></div>;
  const alive = s.alive?.filter((x) => x.status !== 'out') ?? [];
  const out = s.alive?.filter((x) => x.status === 'out') ?? [];
  const z = s.z4;
  const left = Math.min(at.left, window.innerWidth - 400);
  const below = at.bottom + 300 < window.innerHeight;
  const style = below ? { left, top: at.bottom + 6 } : { left, bottom: window.innerHeight - at.top + 6 };
  return createPortal(
    <div className="fk-pop fk-tagpop" style={style} data-capture-exclude="true" data-testid="tag-popup" role="tooltip">
      <strong>{t.name}</strong>
      {line(`Previous window · ${windowName(s.prev)}`, slotLines(model, s.prev, s.team))}
      {line(`Next window · ${windowName(s.next)}`, slotLines(model, s.next, s.team))}
      {line('Window streak', s.streak === undefined ? 'unknown (not a followed club)' : `${ordinal(s.streak)} straight window${s.streak >= 2 ? ` (${s.streak} windows in a row with a match)` : ''}`)}
      {line('Window advantage', s.rested ? `rested: had the previous window free, ${model.team(opp.team).name} played` : opp.rested ? `${model.team(opp.team).name} had the previous window free; this team played` : 'none')}
      {line('Competitions alive', s.alive === undefined ? 'unknown (not a followed club)' : (
        <>
          {alive.length} — {alive.map((x) => `${compInfo(x.comp).code}${x.status === 'unknown' ? ' ?' : ''} (${x.why})`).join(', ') || 'none'}
          {out.length > 0 && <span className="fk-muted"><br />out / over: {out.map((x) => `${compInfo(x.comp).code} (${x.why})`).join(', ')}</span>}
        </>
      ))}
      {line('Relegation race', z ? (
        <>
          {z4Text(z)} · {z.pts} pts, round {z.round}{z.tagged ? ' · Z4R' : ''}
          <span className="fk-muted"><br />Tag rule: in the zone, or within {z.round <= Z4R_RULE.earlyRounds ? `${Z4R_RULE.early} pt` : `${Z4R_RULE.late} pts`} of the line ({z.round <= Z4R_RULE.earlyRounds ? `rounds 1–${Z4R_RULE.earlyRounds}` : `round ${Z4R_RULE.earlyRounds + 1} on`}); {RELEGATION[z.league].direct} direct relegation places in the zone.</span>
        </>
      ) : 'no league table yet')}
      {derby && line('Derby', derby.name)}
      <span className="fk-muted fk-pop-foot">Windows: midweek Tue–Thu, weekend Fri–Mon. Standings going into the match.</span>
    </div>,
    document.body,
  );
}

/** One team's tags in the chosen variant, with the detailed popup on hover. */
export function TeamTags({ m, side, align = 'start' }: { m: Match; side: 'a' | 'h'; align?: 'start' | 'end' }) {
  const { model, tags: variant } = useFooty();
  const [at, setAt] = useState<DOMRect>();
  if (!variant || variant === 'off') return null;
  const all = matchTags(model, m);
  const s = side === 'a' ? all.a : all.h, opp = side === 'a' ? all.h : all.a;
  let body: ReactNode;
  if (variant === 'rail') body = <Rail s={s} />;
  else {
    const list = tokens(model, s).filter(variant === 'alerts' ? ALERT : () => true);
    if (!list.length) return null;
    body = list.map((t) => <span key={t.key} className={`fk-tag ${t.cls}`} data-tag={t.key}>{t.text}</span>);
  }
  return (
    <span className={`fk-tags fk-tags-${variant} fk-tags-${align}`} data-testid="team-tags" data-variant={variant}
      onMouseEnter={(e) => setAt(e.currentTarget.getBoundingClientRect())} onMouseLeave={() => setAt(undefined)}>
      {body}
      {at && <Popup model={model} m={m} s={s} opp={opp} at={at} />}
    </span>
  );
}

/** The derby flag of a match (any variant but Off). */
export function DerbyTag({ m }: { m: Match }) {
  const { model, tags: variant } = useFooty();
  if (!variant || variant === 'off') return null;
  const d = matchTags(model, m).derby;
  if (!d) return null;
  return <span className="fk-chip fk-derby" title={`Derby: ${d.name}`} data-testid="derby">{variant === 'rail' ? 'D' : 'DERBY'}</span>;
}
