// FK-50: calendarkit's streak chip and popup (src/slate/streakPopup.tsx there) with draws: "W3" green, "D2" grey,
// "L1" red; hovering (or focusing) it opens the games of the streak, newest first — date, "vs" / "@", the opponent's
// crest and name, the result and score, "(pens)" for a shootout (counted as a draw) — each game its Google search
// (new tab). The popup stays while the pointer is on the chip or in it, closes a moment after it leaves both and on
// Escape; never in a copy. Followed clubs only: the snapshot has every match of theirs, not of their opponents.
// A chip carries data-streak="<teamId>|<matchId of the line, or empty for the current streak>".

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type SyntheticEvent } from 'react';
import { createPortal } from 'react-dom';
import { shortDay } from '../data/model';
import { matchUrl, type Match } from '../data/snapshot';
import { streakAt, streakGames } from '../data/streak';
import { TeamLogo } from './Bits';
import { useFooty } from './ctx';

/** How long the popup stays after the pointer leaves the chip and the popup (calendarkit's grace). */
export const STREAK_CLOSE_MS = 100;

const WORD = { W: ['win', 'wins'], D: ['draw', 'draws'], L: ['defeat', 'defeats'] } as const;

/** The chip for `teamId` at `m` (a played match: through it; to come: going into it). Empty, its column kept, without one. */
export function StreakChip({ teamId, m, className = '' }: { teamId: string; m?: Match; className?: string }) {
  const { model } = useFooty();
  const s = model.followed.has(teamId) ? streakAt(model, teamId, m) : undefined;
  if (!s) return <span className={`fk-streak fk-streak-none ${className}`} />;
  return (
    <span className={`fk-streak fk-streak-${s.kind.toLowerCase()} ${className}`} data-testid="streak" data-streak={`${teamId}|${m?.id ?? ''}`} data-kind={s.kind} tabIndex={0}
      aria-label={`${model.team(teamId).name}: ${s.n} ${WORD[s.kind][s.n === 1 ? 0 : 1]} in a row, all competitions`}>
      {s.kind}{s.n}
    </span>
  );
}

function StreakList({ teamId, matchId }: { teamId: string; matchId?: string }) {
  const { model } = useFooty();
  const at = matchId ? model.snap.matches.find((x) => x.id === matchId) : undefined;
  const games = streakGames(model, teamId, at);
  if (!games.length) return null;
  const kind = games[0]!.r;
  return (
    <>
      <div className="fk-series-head">
        <span className="fk-series-title">{model.team(teamId).abbr} · {games.length} {WORD[kind][games.length === 1 ? 0 : 1]} in a row</span>
        <span className="fk-muted">all competitions</span>
      </div>
      <div className="fk-streak-rows" data-testid="streak-rows">
        {games.map((g) => (
          <a key={g.m.id} className="fk-streak-row" href={matchUrl(g.m, model)} target="_blank" rel="noopener noreferrer" data-testid="streak-row" data-match-id={g.m.id} title="Search the match on Google">
            <span className="fk-streak-date">{shortDay(model.dayOf(g.m))}</span>
            <span className="fk-streak-at">{g.home ? 'vs' : '@'}</span>
            <TeamLogo id={g.opp} size={18} />
            <span className="fk-streak-opp">{model.team(g.opp).short}</span>
            <span className={`fk-streak-res fk-streak-${g.r.toLowerCase()}`}>{g.r} {g.gf}–{g.ga}</span>
            <span className="fk-muted" data-testid={g.pens ? 'streak-pens' : undefined}>{g.pens ? '(pens)' : ''}</span>
          </a>
        ))}
      </div>
    </>
  );
}

/** The widget's one streak popup: put `onOver` (mouseover and focus) and `onLeave` on the wrapper, render `node` inside it. */
export function useStreakPopup(): { onOver: (e: SyntheticEvent) => void; onLeave: () => void; node: ReactNode } {
  const [open, setOpen] = useState<{ value: string; x: number; top: number; bottom: number }>();
  const ref = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const isOpen = useRef(false);
  const [close] = useState(() => () => { clearTimeout(timer.current); isOpen.current = false; setOpen(undefined); });
  const onOver = (e: SyntheticEvent) => {
    const t = e.target as Element;
    if (ref.current?.contains(t)) return clearTimeout(timer.current);
    const el = t.closest?.('[data-streak]');
    clearTimeout(timer.current);
    if (!el) {
      if (isOpen.current) timer.current = setTimeout(close, STREAK_CLOSE_MS);
      return;
    }
    isOpen.current = true;
    const r = el.getBoundingClientRect();
    const value = el.getAttribute('data-streak')!;
    setOpen((o) => (o && o.value === value && o.top === r.top ? o : { value, x: r.left + r.width / 2, top: r.top, bottom: r.bottom }));
  };
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !open) return;
    el.style.left = `${Math.max(8, Math.min(open.x - el.offsetWidth / 2, innerWidth - el.offsetWidth - 8))}px`;
    const below = open.bottom + 6;
    el.style.top = `${below + el.offsetHeight <= innerHeight - 4 ? below : Math.max(4, open.top - el.offsetHeight - 6)}px`;
  });
  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [open, close]);
  useEffect(() => () => clearTimeout(timer.current), []);
  const onLeave = () => { clearTimeout(timer.current); if (isOpen.current) timer.current = setTimeout(close, STREAK_CLOSE_MS); };
  const [team, matchId] = open?.value.split('|') ?? [];
  const node = open && createPortal(
    <div ref={ref} className="fk-pop fk-series-pop fk-streak-pop" role="dialog" aria-label="Streak" data-testid="streak-popup" data-capture-exclude="true"
      onMouseOver={onOver} onMouseLeave={onLeave}>
      <StreakList teamId={team!} matchId={matchId || undefined} />
    </div>,
    document.body,
  );
  return { onOver, onLeave, node };
}
