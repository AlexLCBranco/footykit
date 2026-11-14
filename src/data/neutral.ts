// Is a match at a neutral venue? From the researched rules in config/neutral.ts (ESPN's own flag is never set).

import { NEUTRAL_RULES, type NeutralRule } from '../../config/neutral.ts';
import type { Match } from './snapshot.ts';

export function neutralVenue(m: Match, rules: NeutralRule[] = NEUTRAL_RULES): NeutralRule | undefined {
  return rules.find((r) => r.comp === m.c && (!r.rounds || r.rounds.test(m.r ?? '')));
}
