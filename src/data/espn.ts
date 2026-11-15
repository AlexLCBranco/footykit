// The parts of ESPN's soccer JSON that footykit reads. ESPN's API is unofficial and undocumented, so these types list
// only fields seen in real responses; everything is optional because ESPN leaves fields out freely.

import type { Goal, Match, MatchStatus, Team } from './snapshot.ts';

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
  /** scoreboard only: goals, cards; a goal's `team` is the side credited (own goals included) */
  details?: { scoringPlay?: boolean; ownGoal?: boolean; shootout?: boolean; clock?: { displayValue?: string }; team?: { id?: string } }[];
  status?: { type?: { name?: string; state?: 'pre' | 'in' | 'post'; completed?: boolean; detail?: string } };
  /** scoreboard only; American odds as strings ("-250", "+400") */
  odds?: ({ moneyline?: Record<'home' | 'away' | 'draw', { open?: { odds?: string }; close?: { odds?: string } } | undefined>; provider?: { name?: string } } | null)[];
}

export interface EspnEvent {
  id: string;
  date: string;
  shortName?: string;
  timeValid?: boolean;
  /** `slug` names the stage ("group-stage", "round-of-16") on every event, unlike `seasonType` */
  season?: { year?: number; slug?: string };
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

/** "45'+2'" → [45, 2]; undefined when ESPN's clock isn't a minute. */
function minuteOf(display: string | undefined): [number, number] | undefined {
  const x = /^(\d+)'(?:\+(\d+)')?$/.exec(display ?? '');
  return x ? [Number(x[1]), Number(x[2] ?? 0)] : undefined;
}

/** A match's goals in order, shootout kicks left out, or undefined unless every goal is there: each side's goals must
 * add up to its score (a partial list would tag later goals wrongly). Ordered by the minute shown, so 45+2 comes
 * before 46 (ESPN's seconds count added time on from the half's own start, so 45+2 would sort after 46). */
export function goalsOf(c: EspnCompetition, homeId: string, hs: number | undefined, as: number | undefined): Goal[] | undefined {
  if (hs === undefined || as === undefined || !c.details) return undefined;
  const goals: { key: number; i: number; g: Goal }[] = [];
  for (const [i, d] of c.details.entries()) {
    if (!d.scoringPlay || d.shootout) continue;
    const mm = minuteOf(d.clock?.displayValue);
    if (!mm || !d.team?.id) return undefined;
    const g: Goal = [mm[1] ? `${mm[0]}+${mm[1]}` : String(mm[0]), d.team.id === homeId ? 'h' : 'a'];
    if (d.ownGoal) g.push(1);
    goals.push({ key: mm[0] * 100 + mm[1], i, g });
  }
  const h = goals.filter((x) => x.g[1] === 'h').length;
  if (h !== hs || goals.length - h !== as) return undefined;
  return goals.sort((a, b) => a.key - b.key || a.i - b.i).map((x) => x.g);
}

// ---------- ESPN event → footykit Match (the snapshot job and the day function) ----------

const STATUS: Record<string, MatchStatus> = {
  STATUS_POSTPONED: 'ppd', STATUS_CANCELED: 'can', STATUS_ABANDONED: 'abd', STATUS_SUSPENDED: 'susp', STATUS_FORFEIT: 'post',
};

export function statusOf(c: EspnCompetition): MatchStatus {
  const t = c.status?.type;
  const special = STATUS[t?.name ?? ''];
  if (special) return special;
  if (t?.completed || t?.state === 'post') return 'post';
  return t?.state === 'in' ? 'in' : 'pre';
}

/** "round-of-16" → "Round of 16", as ESPN's `seasonType` names it. */
export const stageName = (slug: string | undefined) =>
  slug?.split('-').map((w, i) => (i > 0 && ['of', 'the', 'and'].includes(w) ? w : w.charAt(0).toUpperCase() + w.slice(1))).join(' ') || undefined;

/** One ESPN event as a Match. `slug` is the competition (scoreboard events carry no `league`). Returns undefined for
 * an event without two sides. */
export function slimMatch(e: EspnEvent, slug: string, isLeague: boolean): Match | undefined {
  const c = e.competitions[0];
  const home = c?.competitors.find((x) => x.homeAway === 'home');
  const away = c?.competitors.find((x) => x.homeAway === 'away');
  if (!c || !home || !away) return undefined;
  const st = statusOf(c);
  const m: Match = { id: e.id, t: c.date ?? e.date, c: slug, st, h: home.team.id, a: away.team.id };
  if (e.timeValid === false || c.timeValid === false) m.tbd = 1;
  // League rounds are named after the season ("2026-27 English Premier League"), and so are one-off super cups
  // ("2026 UEFA Super Cup"): only a real stage name is kept.
  // scoreboard events often lack `seasonType` (the club feeds carry it); the season slug always names the stage
  const round = e.seasonType?.name ?? stageName(e.season?.slug);
  if (!isLeague && round && !/\b\d{4}\b/.test(round)) m.r = round;
  if (c.leg?.value) m.leg = c.leg.value;
  if (st === 'post' || st === 'in' || st === 'abd' || st === 'susp') {
    const hs = scoreOf(home), as = scoreOf(away);
    if (hs !== undefined && !Number.isNaN(hs)) m.hs = hs;
    if (as !== undefined && !Number.isNaN(as)) m.as = as;
    const ha = aggregateOf(home), aa = aggregateOf(away);
    if (ha !== undefined && aa !== undefined) { m.ha = ha; m.aa = aa; }
    const hp = shootoutOf(home), ap = shootoutOf(away);
    if (hp !== undefined && ap !== undefined && (hp > 0 || ap > 0)) { m.hp = hp; m.ap = ap; }
    // a 0-0 needs no list: "no goals" is already known from the score
    if ((m.hs ?? 0) + (m.as ?? 0) > 0) { const g = goalsOf(c, home.team.id, m.hs, m.as); if (g) m.g = g; }
  }
  if (st === 'in') {
    const s = c.status as { displayClock?: string; type?: { shortDetail?: string; name?: string } } | undefined;
    m.clk = s?.type?.name === 'STATUS_HALFTIME' ? 'HT' : (s?.displayClock ?? s?.type?.shortDetail);
  }
  if (c.venue?.fullName) m.v = c.venue.fullName;
  if (c.venue?.address?.city) m.city = c.venue.address.city;
  if (c.venue?.address?.country) m.ctry = c.venue.address.country;
  return m;
}

/** Both sides of an event as Teams. */
export function teamsOf(e: EspnEvent): Team[] {
  return (e.competitions[0]?.competitors ?? []).map((x) => {
    const t = x.team as EspnCompetitor['team'] & { shortDisplayName?: string };
    return { id: t.id, abbr: t.abbreviation ?? t.id, name: t.displayName ?? t.abbreviation ?? t.id, short: t.shortDisplayName ?? t.displayName ?? t.id };
  });
}

/** American moneyline ("+150", "-200", 400) → decimal odds, 2 decimals. */
export function decimalOdds(american: string | number | undefined): number | undefined {
  const n = typeof american === 'number' ? american : american === undefined || american === '' || american === 'EVEN' ? (american === 'EVEN' ? 100 : NaN) : Number(american);
  if (!Number.isFinite(n) || n === 0) return undefined;
  const d = n > 0 ? 1 + n / 100 : 1 + 100 / -n;
  return Math.round(d * 100) / 100;
}
