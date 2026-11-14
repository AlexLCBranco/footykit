// The parts of ESPN's soccer JSON that footykit reads. ESPN's API is unofficial and undocumented, so these types list
// only fields seen in real responses; everything is optional because ESPN leaves fields out freely.

export interface EspnScore {
  value?: number;
  displayValue?: string;
  aggregateScore?: number;
  shootoutScore?: number;
}

export interface EspnCompetitor {
  id: string;
  homeAway: 'home' | 'away';
  winner?: boolean;
  /** schedule endpoint: an object; scoreboard endpoint: a string */
  score?: EspnScore | string;
  shootoutScore?: number;
  team: { id: string; abbreviation?: string; displayName?: string };
}

export interface EspnCompetition {
  id: string;
  date: string;
  timeValid?: boolean;
  neutralSite?: boolean;
  leg?: { value: number; displayValue?: string };
  venue?: { id?: string; fullName?: string; address?: { city?: string; country?: string } };
  competitors: EspnCompetitor[];
  notes?: { type?: string; headline?: string; text?: string }[];
  status?: { type?: { name?: string; state?: 'pre' | 'in' | 'post'; completed?: boolean; detail?: string } };
  /** scoreboard only; American odds as strings ("-250", "+400") */
  odds?: ({ moneyline?: Record<'home' | 'away' | 'draw', { open?: { odds?: string }; close?: { odds?: string } } | undefined>; provider?: { name?: string } } | null)[];
}

export interface EspnEvent {
  id: string;
  date: string;
  shortName?: string;
  timeValid?: boolean;
  season?: { year?: number };
  seasonType?: { name?: string };
  league?: { slug?: string; name?: string; abbreviation?: string };
  competitions: EspnCompetition[];
}

export const SITE = 'https://site.api.espn.com/apis/site/v2/sports/soccer';
export const STANDINGS = 'https://site.api.espn.com/apis/v2/sports/soccer';

/** Numeric score of a competitor whichever endpoint it came from. */
export function scoreOf(c: EspnCompetitor): number | undefined {
  if (typeof c.score === 'string') return c.score === '' ? undefined : Number(c.score);
  return c.score?.value;
}

export function aggregateOf(c: EspnCompetitor): number | undefined {
  return typeof c.score === 'object' ? c.score.aggregateScore : undefined;
}

export function shootoutOf(c: EspnCompetitor): number | undefined {
  return (typeof c.score === 'object' ? c.score.shootoutScore : undefined) ?? c.shootoutScore;
}
