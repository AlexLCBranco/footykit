// What every view's small parts need without passing it down each level: the model, the clock and zone, and the
// widget's events (team link, season series, standings).

import { createContext, useContext } from 'react';
import type { LiveLayer } from '../data/live';
import type { Model } from '../data/model';
import type { TagKey, TagVariant } from './Tags';

export interface FootyCtx {
  model: Model;
  now: number;
  timeZone?: string;
  live: LiveLayer;
  /** a team's name or logo was clicked: open its Team Calendar around `day` (the app) */
  onTeam?: (teamId: string, day: string) => void;
  /** …or, for a host outside the app (the gauntlet's Slate widget), the address a team link opens in a new tab.
   *  Neither: team names are plain text. */
  teamHref?: (teamId: string, day: string) => string;
  /** open the season series popup of two teams */
  onSeries: (a: string, b: string, anchor: HTMLElement, current?: string) => void;
  /** open the quick standings popup on a team's league */
  onStandings?: (teamId: string) => void;
  /** how the context tags are drawn; none (a host like the gauntlet's Slate part) = no tags */
  tags?: TagVariant;
  /** tag types turned off (the bar's Tags menu); unset = the defaults (Z4R and 1C/2C/3C off) */
  hiddenTags?: ReadonlySet<TagKey>;
}

export const Ctx = createContext<FootyCtx | null>(null);

export function useFooty(): FootyCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error('footykit parts must be inside <Ctx.Provider>');
  return c;
}
