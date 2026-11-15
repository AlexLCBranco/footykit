// Derby / rivalry flag: a match between two teams listed in config/rivalries.ts.

import { RIVALRIES, type Rivalry } from '../../config/rivalries.ts';
import type { Match } from './snapshot.ts';

const pairKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);
const byPair = new Map(RIVALRIES.map((r) => [pairKey(r.teams[0], r.teams[1]), r]));

export const rivalryOf = (m: Pick<Match, 'h' | 'a'>): Rivalry | undefined => byPair.get(pairKey(m.h, m.a));
