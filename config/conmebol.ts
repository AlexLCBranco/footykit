// Libertadores and Sudamericana 2026 (PLAN.md Phase 4): groups, ties on points, stages and the bracket. Researched
// 2026-11-15 from Wikipedia's 2026 pages (CONMEBOL regulations Art. 2.4.2–2.4.3); confirmed by Alex the same day.

import type { RankRules } from '../src/data/leagueTable.ts';
import type { ZoneKind } from './leagues.ts';

export interface CupConfig {
  slug: string;
  /** stages before the groups, in order (ESPN's stage names); single-leg ones are named in `singleLeg` */
  qualifying: string[];
  singleLeg: string[];
  /** the knockout stages after the groups, in order; the last is the final */
  knockout: string[];
  /** group places: 1st, 2nd, 3rd … */
  groupZones: { place: number; kind: ZoneKind; label: string }[];
  groupRules: RankRules;
  groupRulesText: string[];
  /** quarter-finals and semi-finals from the round-of-16 letters A–H */
  bracketText: string;
  tieText: string;
  final: { day: string; venue: string };
  sources: string[];
}

const GROUP_RULES: RankRules = { tiebreak: ['h2hPts', 'h2hGd', 'h2hGf', 'gd', 'gf'], h2hWhenPlayed: true };
const GROUP_TEXT = ['Points', 'Head-to-head points', 'Head-to-head goal difference', 'Head-to-head goals', 'Goal difference', 'Goals scored', 'Fewest red cards', 'Fewest yellow cards', 'Drawing of lots', 'No away goals'];
const BRACKET = 'Round of 16 drawn as ties A–H (group winners host the 2nd leg); quarter-finals A v H, B v G, C v F, D v E; semi-finals QF1 v QF4, QF2 v QF3; the better seed hosts the 2nd leg.';
const TIES = 'Level on aggregate: straight to penalties, no extra time. The final is one match: extra time, then penalties.';

export const CUPS: CupConfig[] = [
  {
    slug: 'conmebol.libertadores',
    qualifying: ['First Stage', 'Second Stage', 'Third Stage'],
    singleLeg: [],
    knockout: ['Round of 16', 'Quarterfinals', 'Semifinals', 'Final'],
    groupZones: [
      { place: 1, kind: 'lib', label: 'Round of 16' },
      { place: 2, kind: 'lib', label: 'Round of 16' },
      { place: 3, kind: 'sula', label: 'Sudamericana play-offs' },
    ],
    groupRules: GROUP_RULES,
    groupRulesText: GROUP_TEXT,
    bracketText: BRACKET,
    tieText: TIES,
    final: { day: '2026-11-28', venue: 'Estadio Centenario, Montevideo' },
    sources: ['https://en.wikipedia.org/wiki/2026_Copa_Libertadores_group_stage', 'https://en.wikipedia.org/wiki/2026_Copa_Libertadores_final_stages'],
  },
  {
    slug: 'conmebol.sudamericana',
    qualifying: ['First Stage'],
    singleLeg: ['First Stage'],
    knockout: ['Knockout Round Playoffs', 'Round of 16', 'Quarterfinals', 'Semifinals', 'Final'],
    groupZones: [
      { place: 1, kind: 'lib', label: 'Round of 16' },
      { place: 2, kind: 'sula', label: 'Play-offs v a Libertadores 3rd (seeds 9–16 v 24–17; the runner-up hosts the 2nd leg)' },
    ],
    groupRules: GROUP_RULES,
    groupRulesText: GROUP_TEXT,
    bracketText: BRACKET,
    tieText: TIES,
    final: { day: '2026-11-21', venue: 'Estadio Metropolitano Roberto Meléndez, Barranquilla' },
    sources: ['https://en.wikipedia.org/wiki/2026_Copa_Sudamericana_group_stage', 'https://en.wikipedia.org/wiki/2026_Copa_Sudamericana_final_stages'],
  },
];
