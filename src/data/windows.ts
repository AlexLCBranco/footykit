// Weekly windows and FIFA windows on the calendar views. A week has two windows: MIDWEEK (Tue–Wed–Thu) and WEEKEND
// (Fri–Sat–Sun–Mon). A window is "free" for a club when it has no match in it (marked on its calendars, on by
// default; no rest-day counts). Days are local day keys.

import { FIFA_WINDOWS, type FifaWindow } from '../../config/fifa-windows.ts';
import { addDays, weekday, type Model } from './model.ts';

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
