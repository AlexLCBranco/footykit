// Weekly windows and FIFA windows on the calendar views. A week has two windows: MIDWEEK (Tue–Wed–Thu) and WEEKEND
// (Fri–Sat–Sun–Mon). A window is "free" for a club when it has no match in it (marked on its calendars, on by
// default; no rest-day counts). Days are local day keys.

import { FIFA_WINDOWS, type FifaWindow } from '../../config/fifa-windows.ts';
import { addDays, weekday, type Model } from './model.ts';
import type { Match } from './snapshot.ts';

export type WindowKind = 'mid' | 'wkd';

/** The window holding `day`: its kind and first day (a Tuesday or a Friday). */
export function windowOf(day: string): { kind: WindowKind; start: string } {
  const wd = weekday(day); // 0 Sun … 6 Sat
  if (wd >= 2 && wd <= 4) return { kind: 'mid', start: addDays(day, 2 - wd) };
  const back = wd === 5 ? 0 : wd === 6 ? 1 : wd === 0 ? 2 : 3; // Fri 0, Sat 1, Sun 2, Mon 3
  return { kind: 'wkd', start: addDays(day, -back) };
}

/** Window starts in which a club plays, worked out once per model and club. */
const played = new WeakMap<Model, Map<string, Set<string>>>();
function playedWindows(model: Model, teamId: string): Set<string> {
  let byTeam = played.get(model);
  if (!byTeam) played.set(model, (byTeam = new Map()));
  let s = byTeam.get(teamId);
  if (!s) {
    s = new Set((model.byTeam.get(teamId) ?? []).filter((m) => m.st !== 'can' && m.st !== 'ppd').map((m) => windowOf(model.dayOf(m)).start));
    byTeam.set(teamId, s);
  }
  return s;
}

/** True when `day` lies in a window with no match for the club, inside its season (first to last match). */
export function isFreeWindowDay(model: Model, teamId: string, day: string): boolean {
  const list = model.byTeam.get(teamId) ?? [];
  if (!list.length) return false;
  const first = model.dayOf(list[0]!), last = model.dayOf(list[list.length - 1]!);
  if (day < windowOf(first).start || day > last) return false;
  return !playedWindows(model, teamId).has(windowOf(day).start);
}

export function fifaWindowOn(day: string, windows: FifaWindow[] = FIFA_WINDOWS): FifaWindow | undefined {
  return windows.find((w) => day >= w.from && day <= w.to);
}

// ---------- window context of a match (Phase 3 tags) ----------
// Tags next to each team: what it played in the window before this match's window and what it plays in the window
// after, how many windows in a row it has played, and whether one side comes in rested. Only followed clubs have their
// whole schedule in the snapshot; another team's matches are known only where they show up (its league, a meeting
// with a followed club), so a window without a known match is "unknown" for it, never "free".

/** The window before / after the one starting on `start`. */
export const prevWindowStart = (start: string) => addDays(start, weekday(start) === 2 ? -4 : -3);
export const nextWindowStart = (start: string) => addDays(start, weekday(start) === 2 ? 3 : 4);
export const windowEnd = (start: string) => addDays(start, weekday(start) === 2 ? 2 : 3);

export type WindowState =
  | 'played' // one or more matches in it (played or to come)
  | 'free' // a followed club with no match in it, inside its season
  | 'before' // before the club's first match of the season
  | 'unscheduled' // after the club's last scheduled match: nothing fixtured yet
  | 'unknown'; // not a followed club: its full schedule isn't in the snapshot

export interface WindowSlot {
  start: string;
  kind: WindowKind;
  state: WindowState;
  matches: Match[];
}

const counted = (m: Match) => m.st !== 'can' && m.st !== 'ppd';

/** Every team's matches by window start: followed clubs complete, others as far as the snapshot has them. */
const byWindow = new WeakMap<Model, Map<string, Map<string, Match[]>>>();
function windowsOfTeam(model: Model, teamId: string): Map<string, Match[]> {
  let all = byWindow.get(model);
  if (!all) {
    all = new Map();
    for (const m of model.snap.matches) {
      if (!counted(m)) continue;
      const w = windowOf(model.dayOf(m)).start;
      for (const t of [m.h, m.a]) {
        let tm = all.get(t);
        if (!tm) all.set(t, (tm = new Map()));
        const l = tm.get(w);
        if (l) l.push(m); else tm.set(w, [m]);
      }
    }
    byWindow.set(model, all);
  }
  return all.get(teamId) ?? new Map();
}

/** First and last window a followed club plays in this season. */
function seasonSpan(model: Model, teamId: string): [string, string] | undefined {
  const list = (model.byTeam.get(teamId) ?? []).filter(counted);
  if (!list.length) return undefined;
  return [windowOf(model.dayOf(list[0]!)).start, windowOf(model.dayOf(list[list.length - 1]!)).start];
}

export function windowSlot(model: Model, teamId: string, start: string): WindowSlot {
  const kind: WindowKind = weekday(start) === 2 ? 'mid' : 'wkd';
  const matches = windowsOfTeam(model, teamId).get(start) ?? [];
  if (matches.length) return { start, kind, state: 'played', matches };
  if (!model.followed.has(teamId)) return { start, kind, state: 'unknown', matches };
  const span = seasonSpan(model, teamId);
  if (!span || start < span[0]) return { start, kind, state: 'before', matches };
  if (start > span[1]) return { start, kind, state: 'unscheduled', matches };
  return { start, kind, state: 'free', matches };
}

/** The windows before and after the window of match `m`, for `teamId`. */
export function windowsAround(model: Model, teamId: string, m: Match): { prev: WindowSlot; next: WindowSlot } {
  const w = windowOf(model.dayOf(m)).start;
  return { prev: windowSlot(model, teamId, prevWindowStart(w)), next: windowSlot(model, teamId, nextWindowStart(w)) };
}

/** Windows in a row the club has played up to and including this match's window ("5th straight window"); undefined
 * for a team whose schedule isn't complete in the snapshot. */
export function windowStreak(model: Model, teamId: string, m: Match): number | undefined {
  if (!model.followed.has(teamId)) return undefined;
  const wins = windowsOfTeam(model, teamId);
  let n = 0;
  for (let w = windowOf(model.dayOf(m)).start; wins.has(w); w = prevWindowStart(w)) n++;
  return n;
}

/** The side that had the previous window free while the other played in it; both sides' windows must be known. */
export function windowAdvantage(model: Model, m: Match): string | undefined {
  const w = prevWindowStart(windowOf(model.dayOf(m)).start);
  const h = windowSlot(model, m.h, w).state, a = windowSlot(model, m.a, w).state;
  if (h === 'free' && a === 'played') return m.h;
  if (a === 'free' && h === 'played') return m.a;
  return undefined;
}

/** The first leg of the two-leg tie whose second leg is `m` (same competition, same two teams). */
export function firstLegOf(model: Model, m: Match): Match | undefined {
  if (m.leg !== 2) return undefined;
  return model.snap.matches.find((x) => x.leg === 1 && x.c === m.c && ((x.h === m.a && x.a === m.h) || (x.h === m.h && x.a === m.a)));
}
