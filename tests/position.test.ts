// FK-28: a team's current place in its domestic league table.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildModel } from '../src/data/model';
import { leaguePosition } from '../src/data/position';
import type { Snapshot } from '../src/data/snapshot';

const snap = JSON.parse(readFileSync(join(import.meta.dirname, 'fixtures/snapshot.json'), 'utf8')) as Snapshot;
const model = buildModel(snap, 'UTC');

describe('leaguePosition', () => {
  it("a league club: its rank in its league's table", () => {
    expect(leaguePosition(model, '359')).toEqual({ rank: 1, league: 'eng.1', teams: 20 }); // Arsenal top on the recorded day
    const bra = snap.tables['bra.1']![0]!.rows[4]!;
    expect(leaguePosition(model, bra.team)).toMatchObject({ rank: bra.rank, league: 'bra.1' });
  });
  it('the UCL or Libertadores table never counts as a domestic league', () => {
    const uclOnly = snap.tables['uefa.champions']![0]!.rows.map((r) => r.team).find((t) => !Object.keys(snap.tables).filter((s) => !s.includes('.champions') && !s.includes('europa') && !s.includes('conmebol')).some((l) => snap.tables[l]!.some((tb) => tb.rows.some((r) => r.team === t))));
    expect(uclOnly).toBeDefined();
    expect(leaguePosition(model, uclOnly!)).toBeUndefined();
  });
});
