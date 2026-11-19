// FK-47: the Slate card's strip by window. Each slot is one window — the same midweek (Tue–Thu) and weekend (Fri–Mon)
// windows as the Window strip tags (windows.ts) — five of them: 2 windows before, this match's window in the middle,
// 2 after. A window without a match is an empty slot (rest shows at a glance and the slots line up across cards); a
// window with two matches splits its slot. FK-48: `shift` moves the five windows earlier / later.
// Cancelled and postponed matches are left out (they aren't on the calendar any more), as on the window tags.

import type { Result } from './form.ts';
import { isPlayed, resultFor, type Model } from './model.ts';
import type { Match } from './snapshot.ts';
import { nextWindowStart, prevWindowStart, windowEnd, windowOf, windowSlot, type WindowKind, type WindowState } from './windows.ts';

/** One match in a slot: the opponent, home or away, the result once played; `now` = the card's own match. */
export interface StripGame { id: string; opp: string; home: boolean; day: string; c: string; r?: Result; gf?: number; ga?: number; now?: boolean }

export interface StripWindow {
  start: string;
  end: string;
  kind: WindowKind;
  state: WindowState;
  /** windows from the card's match's window (0); -2 … 2 unshifted */
  offset: number;
  games: StripGame[];
}

/** Windows shown on each side of the middle one. */
export const STRIP_SIDE = 2;

export function stripGame(model: Model, teamId: string, x: Match, now = false): StripGame {
  const home = x.h === teamId;
  const g: StripGame = { id: x.id, opp: home ? x.a : x.h, home, day: model.dayOf(x), c: x.c };
  if (isPlayed(x)) Object.assign(g, { r: resultFor(x, teamId)!, gf: home ? x.hs! : x.as!, ga: home ? x.as! : x.hs! });
  if (now) g.now = true;
  return g;
}

/** The 2·STRIP_SIDE + 1 windows around match `m`'s window (moved `shift` windows), for `teamId`. */
export function stripWindows(model: Model, teamId: string, m: Match, shift = 0): StripWindow[] {
  const home = windowOf(model.dayOf(m)).start;
  let first = home;
  for (let i = 0; i < STRIP_SIDE - shift; i++) first = prevWindowStart(first);
  for (let i = 0; i < shift - STRIP_SIDE; i++) first = nextWindowStart(first);
  const out: StripWindow[] = [];
  for (let i = 0, start = first; i < 2 * STRIP_SIDE + 1; i++, start = nextWindowStart(start)) {
    const slot = windowSlot(model, teamId, start);
    const games = [...slot.matches].sort((a, b) => a.t.localeCompare(b.t)).map((x) => stripGame(model, teamId, x, x.id === m.id));
    out.push({ start, end: windowEnd(start), kind: slot.kind, state: slot.state, offset: i - STRIP_SIDE + shift, games });
  }
  return out;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const dm = (day: string) => [Number(day.slice(8, 10)), MONTHS[Number(day.slice(5, 7)) - 1]!] as const;

/** "midweek 11–13 Nov", "weekend 30 Oct–2 Nov" */
export function windowLabel(w: Pick<StripWindow, 'kind' | 'start' | 'end'>): string {
  const [d1, m1] = dm(w.start), [d2, m2] = dm(w.end);
  return `${w.kind === 'mid' ? 'midweek' : 'weekend'} ${m1 === m2 ? `${d1}–${d2} ${m2}` : `${d1} ${m1}–${d2} ${m2}`}`;
}

/** An empty slot's hover: "No match · midweek 11–13 Nov" (or why there's none to show). */
export function emptyWindowText(w: StripWindow): string {
  const why = w.state === 'unscheduled' ? 'Nothing fixtured yet' : w.state === 'before' ? 'Before the season' : 'No match';
  return `${why} · ${windowLabel(w)}`;
}
