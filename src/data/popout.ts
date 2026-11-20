// FK-62: what the floating live-scores window shows for a day's matches: before the first kick-off, a countdown to it;
// from then on one compact line per match in kick-off order (time or live minute, teams, score; live / final /
// upcoming), the same matches the Slate shows.

import { isPlayed, kickoffTime } from './model.ts';
import type { Match } from './snapshot.ts';

export type PopKind = 'live' | 'final' | 'upcoming' | 'off';
export interface PopLine { id: string; kind: PopKind; time: string; h: string; a: string; hs?: number; as?: number }

const OFF: Record<string, string> = { ppd: 'PPD', can: 'CANC', abd: 'ABD', susp: 'SUSP' };

/** One line per match, in kick-off order. */
export function popLines(list: Match[], timeZone?: string): PopLine[] {
  return [...list].sort((x, y) => x.t.localeCompare(y.t)).map((m) => {
    const kind: PopKind = m.st === 'in' ? 'live' : isPlayed(m) ? 'final' : OFF[m.st] ? 'off' : 'upcoming';
    const time = kind === 'live' ? m.clk ?? 'LIVE' : kind === 'final' ? 'FT' : kind === 'off' ? OFF[m.st]! : m.tbd ? 'TBD' : kickoffTime(m.t, timeZone);
    const scored = (kind === 'live' || kind === 'final') && m.hs !== undefined && m.as !== undefined;
    return { id: m.id, kind, time, h: m.h, a: m.a, ...(scored ? { hs: m.hs, as: m.as } : {}) };
  });
}

/**
 * The match to count down to, while nothing has started yet: the day's first kick-off still ahead (a TBD, postponed or
 * cancelled match doesn't count). Undefined once a match is live or over, or the first kick-off has passed.
 */
export function countdownTo(list: Match[], now: number): Match | undefined {
  if (list.some((m) => m.st === 'in' || isPlayed(m))) return undefined;
  const ahead = list.filter((m) => m.st === 'pre' && !m.tbd).sort((x, y) => x.t.localeCompare(y.t));
  const first = ahead[0];
  return first && Date.parse(first.t) > now ? first : undefined;
}

/** "1:05:09" / "4:07": the time left to `t`. */
export function countdownText(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
  const two = (n: number) => String(n).padStart(2, '0');
  return h ? `${h}:${two(m)}:${two(x)}` : `${m}:${two(x)}`;
}
