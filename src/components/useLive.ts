// Fetches the day layer for the local day on screen and keeps it fresh while a match is live or about to start
// (one request a minute per ESPN date; the CDN shares it). Quiet otherwise: no timer runs when nothing is live, and
// none while the tab is hidden. A failed request keeps the snapshot's data.

import { useEffect, useState } from 'react';
import { dayUrl } from '../address';
import type { DayData } from '../data/day';
import { EMPTY_LIVE, espnDatesFor, isHot, type LiveLayer } from '../data/live';
import type { Match } from '../data/snapshot';

async function fetchDay(date: string): Promise<DayData | undefined> {
  try {
    const r = await fetch(dayUrl(date));
    return r.ok ? ((await r.json()) as DayData) : undefined;
  } catch {
    return undefined;
  }
}

/** `enabled` false (team views, tests without a day layer) fetches nothing. */
export function useLive(day: string, timeZone: string | undefined, enabled: boolean): LiveLayer {
  const [live, setLive] = useState<{ day: string; layer: LiveLayer }>({ day: '', layer: EMPTY_LIVE });
  useEffect(() => {
    if (!enabled) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const load = async () => {
      timer = undefined;
      const days = await Promise.all(espnDatesFor(day, timeZone).map(fetchDay));
      if (stopped) return;
      const matches = new Map<string, Match>();
      const odds = new Map<string, DayData['odds'][string]>();
      for (const d of days) {
        for (const m of d?.matches ?? []) matches.set(m.id, m);
        for (const [id, o] of Object.entries(d?.odds ?? {})) odds.set(id, o);
      }
      setLive({ day, layer: { matches, odds } });
      if (isHot([...matches.values()], Date.now()) && !document.hidden) timer = setTimeout(load, 60_000);
    };
    void load();
    const wake = () => { if (!document.hidden && !timer) void load(); };
    document.addEventListener('visibilitychange', wake);
    return () => { stopped = true; clearTimeout(timer); document.removeEventListener('visibilitychange', wake); };
  }, [day, timeZone, enabled]);
  return live.day === day ? live.layer : EMPTY_LIVE;
}
