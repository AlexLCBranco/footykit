// What every view's small parts need without passing it down each level: the model, the clock and zone, and the
// widget's events (team link, season series, standings).

import { createContext, useContext } from 'react';
import type { LiveLayer } from '../data/live';
import type { Model } from '../data/model';

export interface FootyCtx {
  model: Model;
  now: number;
  timeZone?: string;
  live: LiveLayer;
  /** a team's name or logo was clicked: open its Team Calendar around `day` */
  onTeam: (teamId: string, day: string) => void;
  /** open the season series popup of two teams */
  onSeries: (a: string, b: string, anchor: HTMLElement) => void;
  /** open the quick standings popup on a team's league */
  onStandings: (teamId: string) => void;
}

export const Ctx = createContext<FootyCtx | null>(null);

export function useFooty(): FootyCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error('footykit parts must be inside <Ctx.Provider>');
  return c;
}
