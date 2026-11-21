// FK-72: a league's relegation rules in words a 5-year-old reads once (CLAUDE.md, "Rules a 5-year-old can read"): one
// short sentence per line, no jargon, and an example with the real teams on the line today. Every fact comes from
// config (config/relegation.ts: how many go down, play-off places; config/leagues.ts: the order that splits teams
// level on points, as its source states it). Each of the config's tie-break lines has a plain twin here;
// tests/relegation.test.ts fails when a new line has none.

import { LEAGUES } from '../../config/leagues.ts';
import { RELEGATION, Z4R_RULE } from '../../config/relegation.ts';
import type { LeagueSlug } from '../../config/season.ts';
import type { Race } from './relegation.ts';
import { ordinal } from './tags.ts';

const BETWEEN = 'Look only at the games between the level teams.';

/** config/leagues.ts `tiebreakText` line → the same rule in plain words ('' = said elsewhere on the page). */
export const PLAIN_TIEBREAK: Record<string, string> = {
  'Points': '',
  'Goal difference': 'Goal difference: goals scored minus goals let in. The bigger number is higher.',
  'Goals scored': 'The team that scored more goals is higher.',
  'Wins': 'The team with more wins is higher.',
  'Away wins': 'The team with more wins away from home is higher.',
  'Away goals': 'The team that scored more goals away from home is higher.',
  'Head-to-head points': `${BETWEEN} The team with more points in those games is higher.`,
  'Head-to-head goal difference': `${BETWEEN} The team with the better goal difference in those games is higher.`,
  'Head-to-head aggregate': `${BETWEEN} The team that scored more goals in those games is higher.`,
  'Head-to-head away goals': `${BETWEEN} The team that scored more goals away from home in those games is higher.`,
  'Head-to-head: points over both meetings, then their goal difference (two teams only)': 'Only when exactly two teams are level: look at their two games against each other. More points in them is higher. Then the better goal difference in them.',
  'Fair-play points': 'The team with fewer yellow and red cards is higher.',
  'Fair-play points (three or more teams)': 'When three or more teams are level: the team with fewer yellow and red cards is higher.',
  'Fewest red cards': 'The team with fewer red cards is higher.',
  'Fewest yellow cards': 'The team with fewer yellow cards is higher.',
  'Drawing of lots': 'Still level? A name is picked by luck.',
  'A play-off': 'Still level? The level teams play one more game.',
  'A play-off (after the season)': 'Still level after the last game? The level teams play one more game.',
  'If the title, a European place or relegation is still level after the season: head-to-head points, head-to-head away goals, a play-off':
    'Still level after the last game, and it decides who goes down? Look only at the games between the level teams: more points in them is higher, then more goals scored away from home in them. Still level? They play one more game.',
  'Head-to-head only once all the matches between the tied teams are played': 'The games between the level teams count only after they have all been played.',
  'Head-to-head and away goals only once both matches between the tied teams are played': 'The games between the level teams, and goals away from home, count only after those games have all been played.',
  'A tie on points for 1st or 17th at the end is settled by a play-off match': 'Two teams level on points for 17th place after the last game? They play one more game. The loser goes down.',
};

export interface RulesBox {
  /** how many go down, the play-off, points per result */
  basics: string[];
  /** what splits teams with the same points, in order */
  level: string[];
  /** the real teams on the line today */
  example: string[];
  /** which teams this page lists */
  listed: string[];
  source: string;
}

const places = (from: number, to: number) => (from === to ? ordinal(from) : `${ordinal(from)} to ${ordinal(to)}`);

export function relegationRules(league: LeagueSlug, leagueName: string, race: Pick<Race, 'size' | 'lastSafe' | 'firstDown' | 'rows'>, name: (team: string) => string): RulesBox {
  const rule = RELEGATION[league];
  const size = race.size;
  const downFrom = size - rule.direct + 1;
  const basics = [
    `${leagueName} has ${size} teams.`,
    `A win gives 3 points. A draw gives 1 point. A defeat gives 0.`,
    `After the last game, the ${rule.direct} teams with the fewest points go down to the league below. Those are places ${places(downFrom, size)}.`,
  ];
  if (rule.playoff) {
    const p = downFrom - rule.playoff;
    basics.push(
      `The team in ${places(p, downFrom - 1)} place does not go down right away. It plays 2 more games against a team from the league below.`,
      'If it wins those 2 games together, it stays. If it loses, it goes down.',
    );
  }
  const level = LEAGUES[league].tiebreakText.map((t) => PLAIN_TIEBREAK[t] ?? t).filter(Boolean);
  const example: string[] = [];
  const { lastSafe: s, firstDown: d } = race;
  if (s && d) {
    const gap = s.pts - d.pts;
    example.push(`${name(s.team)} is ${ordinal(s.place)} with ${s.pts} points. It is the last safe team.`);
    for (const r of race.rows) if (r.status === 'playoff') example.push(`${name(r.team)} is ${ordinal(r.place)} with ${r.pts} points. It is in the play-off place.`);
    example.push(`${name(d.team)} is ${ordinal(d.place)} with ${d.pts} points. It is the first team in the drop zone.`);
    example.push(gap > 0
      ? `${name(d.team)} needs ${gap} more point${gap === 1 ? '' : 's'} to catch ${name(s.team)}.`
      : `They have the same points. ${name(s.team)} is higher because of the list for teams with the same points.`);
  }
  const listed = [
    'Every team in the drop zone' + (rule.playoff ? ', the team in the play-off place,' : '') + ` and every team ${Z4R_RULE.late} points or fewer above the drop zone.`,
    `In a team's first ${Z4R_RULE.earlyRounds} games the season is young, so only teams ${Z4R_RULE.early} point or fewer above the drop zone are shown.`,
  ];
  return { basics, level, example, listed, source: rule.source };
}
