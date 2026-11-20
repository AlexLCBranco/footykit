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
/** FK-34: the Tags setting in plain words, with what each choice shows (the saved values in fk:tags:v1 are unchanged). */
export const TAG_VARIANTS: [TagVariant, string, string][] = [
  ['chips', 'All tags', 'Every tag as a chip next to each team'],
  ['rail', 'Window strip', 'A three-cell strip per team: previous / this / next window, with short marks'],
  ['alerts', 'Highlights only', 'Only what stands out: windows in a row, rest, a cup match next, 3+ competitions, Z4R'],
  ['off', 'Hide tags', 'No tags next to the teams'],
];

/** The bar's Tags setting: a button with the choice's name, opening the four choices, each with its one-line description. */
export function TagVariantPicker({ value, onChange }: { value: TagVariant; onChange: (v: TagVariant) => void }) {
  const [open, setOpen] = useState(false);
  const current = TAG_VARIANTS.find(([v]) => v === value) ?? TAG_VARIANTS[0]!;
  return (
    <span className="fk-pop-wrap" onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOpen(false); }}
      onKeyDown={(e) => { if (e.key === 'Escape') setOpen(false); }}>
      <button type="button" className="fk-btn fk-tag-variant-btn" aria-haspopup="listbox" aria-expanded={open} data-testid="tag-variant" data-value={value}
        aria-label={`Tags: ${current[1]}`} title={`Tags: ${current[2]}`} onClick={() => setOpen(!open)}>
        <span className="fk-tag-variant-icon" aria-hidden="true" /><span className="fk-tag-variant-text">Tags: {current[1]}</span> ▾
      </button>
      {open && (
        <div className="fk-pop fk-tag-variant-pop" role="listbox" aria-label="How tags show" data-testid="tag-variant-pop">
          {TAG_VARIANTS.map(([v, name, about]) => (
            <button key={v} type="button" role="option" aria-selected={v === value} className={`fk-tag-variant-opt${v === value ? ' fk-tag-variant-on' : ''}`}
              data-testid={`tag-variant-${v}`} onClick={() => { onChange(v); setOpen(false); }}>
              <strong>{name}</strong>
              <span className="fk-muted">{about}</span>
            </button>
          ))}
        </div>
      )}
    </span>
  );
}

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

/** The tag types, each on or off on its own (FK-15), with what it means for the bar's Tags menu. */
export type TagKey = 'prev' | 'streak' | 'rest' | 'alive' | 'z4' | 'next' | 'derby';
export const TAG_TYPES: { key: TagKey; label: string; about: string }[] = [
  { key: 'prev', label: '◂ Previous window', about: 'what the team played in the window before (free, league, cup / continental)' },
  { key: 'next', label: 'Next window ▸', about: 'what it plays in the window after; a second leg shows the first-leg score' },
  { key: 'streak', label: 'Windows in a row (5th)', about: 'straight windows with a match, from 3 (not the result streak W3 / D2 / L1)' },
  { key: 'rest', label: 'REST', about: 'had the previous window free while the opponent played' },
  { key: 'alive', label: '1C / 2C / 3C', about: 'competitions the team is still alive in' },
  { key: 'z4', label: 'Z4R', about: 'in the relegation race (in the zone or close to its line)' },
  { key: 'derby', label: 'DERBY', about: 'the two teams are rivals' },
];
/** Off unless turned on (Alex): Z4R and the competitions-alive count. */
export const DEFAULT_HIDDEN: ReadonlySet<TagKey> = new Set<TagKey>(['z4', 'alive']);
const HIDDEN_KEY = 'fk:tags:hidden:v1';
/** The tag types turned off: saved once the menu is used, else the defaults. */
export function savedHiddenTags(): ReadonlySet<TagKey> {
  try {
    const v: unknown = JSON.parse(localStorage.getItem(HIDDEN_KEY) ?? 'null');
    if (Array.isArray(v)) return new Set(v.filter((k): k is TagKey => TAG_TYPES.some((t) => t.key === k)));
  } catch { /* unreadable or private mode: the defaults */ }
  return DEFAULT_HIDDEN;
}
export function saveHiddenTags(s: ReadonlySet<TagKey>) {
  try { localStorage.setItem(HIDDEN_KEY, JSON.stringify([...s])); } catch { /* private mode: lasts for this page only */ }
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

interface Token { key: TagKey; text: string; cls: string }

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

/** Alerts keep only what stands out: windows in a row, rest, a cup match next window, 3+ competitions, Z4R. */
const ALERT = (t: Token) => t.key === 'streak' || t.key === 'rest' || t.key === 'z4' || (t.key === 'next' && t.cls === 'fk-tag-cup') || (t.key === 'alive' && /fk-tag-alive-3/.test(t.cls));

function Rail({ s, hidden }: { s: SideTags; hidden: ReadonlySet<TagKey> }) {
  // a hidden window keeps its place in the strip, blank
  const cell = (slot: WindowSlot, which: 'prev' | 'next') => hidden.has(which)
    ? <span className="fk-rail-cell fk-rail-off" />
    : <span className={`fk-rail-cell fk-rail-${slotKind(slot)}${which === 'prev' && s.rested && !hidden.has('rest') ? ' fk-rail-rest' : ''}`} />;
  const n = aliveCount(s);
  return (
    <>
      <span className="fk-rail" aria-hidden="true">
        {cell(s.prev, 'prev')}
        <span className="fk-rail-cell fk-rail-now" />
        {cell(s.next, 'next')}
      </span>
      {!hidden.has('streak') && s.streak !== undefined && s.streak >= STREAK_TAG_MIN && <span className="fk-rail-mark fk-tag-streak" data-tag="streak">{s.streak}</span>}
      {!hidden.has('alive') && n !== undefined && <span className="fk-rail-mark" data-tag="alive">{n}C</span>}
      {!hidden.has('z4') && s.z4?.tagged && <span className="fk-rail-mark fk-tag-z4" data-tag="z4">Z</span>}
      {!hidden.has('rest') && s.rested && <span className="fk-rail-mark fk-tag-rest" data-tag="rest">R</span>}
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
      {line('Windows in a row', s.streak === undefined ? 'unknown (not a followed club)' : `${ordinal(s.streak)} straight window${s.streak >= 2 ? ` (${s.streak} windows in a row with a match)` : ''}`)}
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

/** One team's tags in the chosen variant, with the detailed popup on hover. `compact` (the Slate card's narrow track,
 * FK-35): All tags shows the highlights only; the popup still has everything. */
export function TeamTags({ m, side, align = 'start', compact = false }: { m: Match; side: 'a' | 'h'; align?: 'start' | 'end'; compact?: boolean }) {
  const { model, tags: variant, hiddenTags: hidden = DEFAULT_HIDDEN } = useFooty();
  const [at, setAt] = useState<DOMRect>();
  if (!variant || variant === 'off') return null;
  const all = matchTags(model, m);
  const s = side === 'a' ? all.a : all.h, opp = side === 'a' ? all.h : all.a;
  let body: ReactNode;
  if (variant === 'rail') body = <Rail s={s} hidden={hidden} />;
  else {
    const list = tokens(model, s).filter((t) => !hidden.has(t.key) && (variant === 'alerts' || compact ? ALERT(t) : true));
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
  const { model, tags: variant, hiddenTags: hidden = DEFAULT_HIDDEN } = useFooty();
  if (!variant || variant === 'off' || hidden.has('derby')) return null;
  const d = matchTags(model, m).derby;
  if (!d) return null;
  return <span className="fk-chip fk-derby" title={`Derby: ${d.name}`} data-testid="derby">{variant === 'rail' ? 'D' : 'DERBY'}</span>;
}

/** The bar's "Tags ▾" menu: each tag type on or off, with what it means. */
export function TagMenu({ hidden, onChange }: { hidden: ReadonlySet<TagKey>; onChange: (s: ReadonlySet<TagKey>) => void }) {
  const [open, setOpen] = useState(false);
  const shown = TAG_TYPES.length - TAG_TYPES.filter((t) => hidden.has(t.key)).length;
  return (
    <span className="fk-pop-wrap" onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOpen(false); }}>
      <button type="button" className="fk-btn fk-tag-menu-btn" aria-expanded={open} aria-haspopup="true" title="Which tags show" data-testid="tag-menu" onClick={() => setOpen(!open)}>
        {shown}/{TAG_TYPES.length} ▾
      </button>
      {open && (
        <div className="fk-pop fk-tag-menu" role="group" aria-label="Tags shown" data-testid="tag-menu-pop">
          {TAG_TYPES.map((t) => (
            <label key={t.key} className="fk-check fk-tag-menu-row">
              <input type="checkbox" checked={!hidden.has(t.key)} data-testid={`tag-on-${t.key}`}
                onChange={(e) => { const s = new Set(hidden); if (e.target.checked) s.delete(t.key); else s.add(t.key); onChange(s); }} />
              <span><strong>{t.label}</strong> <span className="fk-muted">{t.about}</span></span>
            </label>
          ))}
        </div>
      )}
    </span>
  );
}
