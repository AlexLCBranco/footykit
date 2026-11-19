// Form, record and streak for a club at a match, by calendarkit's rule: a finished match shows the line *including*
// that match, a match to come shows the line *going in*. Form and streak count every competition; the record is the
// league record (W-D-L), the one a soccer table is built from.

import { compInfo } from '../../config/competitions.ts';
import { isPlayed, resultFor, type Model } from './model.ts';
import type { Match } from './snapshot.ts';

export type Result = 'W' | 'D' | 'L';

export interface FormLine {
  /** up to 5 results, oldest first */
  last5: Result[];
  /** league record W-D-L */
  record: [number, number, number];
  /** "W3", "D1", "L2"; undefined before the first played match */
  streak?: string;
  /** matches without a defeat / without a win, when 3 or more */
  unbeaten?: number;
  winless?: number;
}

const cache = new WeakMap<Model, Map<string, FormLine>>();

/** The played matches that count at `m` for `teamId`: up to and including `m` if it is played, else before it. */
export function playedUpTo(model: Model, teamId: string, m: Match): Match[] {
  const all = model.byTeam.get(teamId) ?? [];
  const i = all.findIndex((x) => x.id === m.id);
  const upTo = i < 0 ? all.filter((x) => x.t <= m.t) : all.slice(0, isPlayed(m) ? i + 1 : i);
  return upTo.filter(isPlayed);
}

export function formAt(model: Model, teamId: string, m: Match): FormLine {
  let c = cache.get(model);
  if (!c) cache.set(model, (c = new Map()));
  const key = `${teamId}|${m.id}|${isPlayed(m) ? 1 : 0}`;
  const hit = c.get(key);
  if (hit) return hit;
  const played = playedUpTo(model, teamId, m);
  const results = played.map((x) => resultFor(x, teamId)!);
  const league = model.clubById.get(teamId)?.league;
  const record: [number, number, number] = [0, 0, 0];
  for (const x of played) {
    if (x.c !== league || compInfo(x.c).kind !== 'league') continue;
    const r = resultFor(x, teamId)!;
    record[r === 'W' ? 0 : r === 'D' ? 1 : 2]++;
  }
  const line: FormLine = { last5: results.slice(-5), record };
  const last = results[results.length - 1];
  if (last) {
    let n = 0;
    for (let i = results.length - 1; i >= 0 && results[i] === last; i--) n++;
    line.streak = `${last}${n}`;
    let u = 0, w = 0;
    for (let i = results.length - 1; i >= 0 && results[i] !== 'L'; i--) u++;
    for (let i = results.length - 1; i >= 0 && results[i] !== 'W'; i--) w++;
    if (u >= 3) line.unbeaten = u;
    if (w >= 3) line.winless = w;
  }
  c.set(key, line);
  return line;
}

export const recordText = (r: [number, number, number]) => r.join('-');

