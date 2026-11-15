// Phase 3 logic: windows around a match, window streak, window advantage, competitions alive, Z4R and rivalries — on
// the recorded snapshot (tests/fixtures/snapshot.json, 2026-11-14) and on small hand-made seasons. Expected values on
// the snapshot are checked against ESPN's own data where it has them (its league tables), not against this code.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { RELEGATION } from '../config/relegation';
import { RIVALRIES } from '../config/rivalries';
import { competitionsAlive, tieWinner } from '../src/data/alive';
import { buildModel } from '../src/data/model';
import { rivalryOf } from '../src/data/rivalry';
import type { Match, Snapshot, Table } from '../src/data/snapshot';
import { aliveCount, firstLegScore, matchTags, ordinal, slotKind, slotMatch } from '../src/data/tags';
import { nextWindowStart, prevWindowStart, windowAdvantage, windowEnd, windowsAround, windowSlot, windowStreak } from '../src/data/windows';
import { pointsBefore, z4At, z4Text } from '../src/data/z4r';

const snap = JSON.parse(readFileSync(join(import.meta.dirname, 'fixtures/snapshot.json'), 'utf8')) as Snapshot;
const SP = 'America/Sao_Paulo';
const model = buildModel(snap, SP);
const byId = (id: string) => snap.matches.find((m) => m.id === id)!;
const on = (day: string, abbr: string) => model.byDay.get(day)!.find((m) => model.team(m.h).abbr === abbr || model.team(m.a).abbr === abbr)!;
const sideOf = (m: Match, id: string) => (m.h === id ? matchTags(model, m).h : matchTags(model, m).a);
const GRE = '6273', CAM = '7632', CHA = '9318', SUN = '366', PAL = '2029', MNC = '382';

// A tiny season: club 1 followed (eng.1), 2 and 3 not. Kickoffs at 15:00 UTC, days in UTC.
const mk = (id: string, day: string, h: string, a: string, extra: Partial<Match> = {}): Match => ({ id, t: `${day}T15:00Z`, c: 'eng.1', st: 'post', h, a, hs: 1, as: 0, ...extra });
function tiny(matches: Match[], tables: Record<string, Table[]> = {}, followed = ['1']): Snapshot {
  const teams = Object.fromEntries(['1', '2', '3', '4', '5'].map((id) => [id, { id, abbr: `T${id}`, name: `Team ${id}`, short: `T${id}` }]));
  return {
    v: 1, generatedAt: '2026-11-14T00:00:00Z', season: 'x', teams, comps: {}, tables,
    clubs: followed.map((id) => ({ ...teams[id]!, league: 'eng.1' as const, region: 'europe' as const })),
    matches: [...matches].sort((a, b) => a.t.localeCompare(b.t)),
  };
}

describe('window arithmetic', () => {
  it('steps between midweek (Tue) and weekend (Fri) windows', () => {
    expect(prevWindowStart('2026-11-17')).toBe('2026-11-13'); // Tue → the Friday before
    expect(prevWindowStart('2026-11-20')).toBe('2026-11-17'); // Fri → the Tuesday before
    expect(nextWindowStart('2026-11-17')).toBe('2026-11-20');
    expect(nextWindowStart('2026-11-20')).toBe('2026-11-24');
    expect(windowEnd('2026-11-17')).toBe('2026-11-19'); // Thu
    expect(windowEnd('2026-11-20')).toBe('2026-11-23'); // Mon
  });
  it('ordinals', () => {
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22].map(ordinal)).toEqual(['1st', '2nd', '3rd', '4th', '11th', '12th', '13th', '21st', '22nd']);
  });
});

describe('previous / next window', () => {
  // Thu Nov 5 is a midweek; the weekend before is Oct 30 – Nov 2, the next one Nov 6 – 9.
  const s = tiny([
    mk('a', '2026-10-24', '1', '2'), // Sat
    mk('b', '2026-11-01', '1', '3', { c: 'eng.league_cup', leg: 1, hs: 2, as: 0 }), // Sun: cup first leg
    mk('c', '2026-11-05', '2', '1'), // Thu
    mk('d', '2026-11-08', '3', '1', { c: 'eng.league_cup', leg: 2, st: 'pre', hs: undefined, as: undefined }), // Sun: second leg
    mk('x', '2026-11-12', '2', '1', { st: 'ppd', hs: undefined, as: undefined }), // postponed: not a match in its window
    mk('e', '2026-11-21', '1', '2', { st: 'pre', hs: undefined, as: undefined }),
  ]);
  const md = buildModel(s, 'UTC');
  const c = s.matches.find((m) => m.id === 'c')!;
  it('a window with a match, by kind; a second leg shows the first-leg score from the club\'s side', () => {
    const { prev, next } = windowsAround(md, '1', c);
    expect([prev.start, prev.state, slotKind(prev), slotMatch(prev)?.id]).toEqual(['2026-10-30', 'played', 'cup', 'b']);
    expect([next.start, next.state, slotKind(next), slotMatch(next)?.id]).toEqual(['2026-11-06', 'played', 'cup', 'd']);
    expect(firstLegScore(md, slotMatch(next)!, '1')).toBe('2-0');
    expect(firstLegScore(md, slotMatch(next)!, '3')).toBe('0-2');
    expect(firstLegScore(md, slotMatch(prev)!, '1')).toBeUndefined(); // a first leg has no first-leg score
  });
  it('free inside the season, before the first match, unscheduled after the last; postponed matches don\'t count', () => {
    expect(windowSlot(md, '1', '2026-11-10').state).toBe('free'); // only the postponed match
    expect(windowSlot(md, '1', '2026-10-27').state).toBe('free'); // the midweek after the first match
    expect(windowSlot(md, '1', '2026-10-20').state).toBe('before'); // the midweek before it
    expect(windowSlot(md, '1', '2026-10-16').state).toBe('before');
    expect(windowSlot(md, '1', '2026-11-24').state).toBe('unscheduled');
    expect(slotKind(windowSlot(md, '1', '2026-11-24'))).toBe('none');
  });
  it('a team that is not followed: a known match is real, a window without one is unknown, never free', () => {
    expect(windowSlot(md, '2', '2026-10-23').state).toBe('played');
    expect(windowSlot(md, '2', '2026-11-10').state).toBe('unknown');
    expect(slotKind(windowSlot(md, '2', '2026-11-10'))).toBe('unknown');
  });
});

describe('window streak', () => {
  const s = tiny([
    mk('a', '2026-11-01', '1', '2'), // wkd Oct 30
    mk('b', '2026-11-08', '1', '2'), // wkd Nov 6 (midweek Nov 3 free: the streak restarts)
    mk('c', '2026-11-11', '1', '2'), // mid Nov 10
    mk('d', '2026-11-14', '1', '2'), // wkd Nov 13
    mk('e', '2026-11-15', '1', '3'), // same window: still one window
    mk('f', '2026-11-18', '1', '2', { st: 'pre' }), // mid Nov 17
  ]);
  const md = buildModel(s, 'UTC');
  const at = (id: string) => windowStreak(md, '1', s.matches.find((m) => m.id === id)!);
  it('counts windows in a row up to this match\'s window, a match to come included', () => {
    expect(at('a')).toBe(1);
    expect(at('b')).toBe(1);
    expect(at('c')).toBe(2);
    expect(at('e')).toBe(3);
    expect(at('f')).toBe(4);
  });
  it('is unknown for a team whose schedule isn\'t complete', () => {
    expect(windowStreak(md, '2', s.matches[0]!)).toBeUndefined();
  });
  it('snapshot: Chapecoense plays Sat Nov 14, Wed Nov 18, Sat Nov 21 — 3rd straight window', () => {
    const m = on('2026-11-21', 'CHA');
    expect(windowStreak(model, CHA, m)).toBe(3);
    expect(sideOf(m, CHA).streak).toBe(3);
  });
});

describe('window advantage', () => {
  it('flags the side that had the previous window free while the other played', () => {
    const s = tiny([
      mk('a', '2026-11-08', '1', '2'), // both play wkd Nov 6
      mk('b', '2026-11-11', '2', '3'), // 2 plays mid Nov 10, 1 is free
      mk('c', '2026-11-14', '1', '2', { st: 'pre' }),
    ], {}, ['1', '2']);
    const md = buildModel(s, 'UTC');
    expect(windowAdvantage(md, s.matches[2]!)).toBe('1');
    expect(windowAdvantage(md, s.matches[1]!)).toBeUndefined(); // 3 isn't followed: its window is unknown
    expect(matchTags(md, s.matches[2]!).h.rested).toBe(true);
    expect(matchTags(md, s.matches[2]!).a.rested).toBe(false);
  });
  it('snapshot: Remo had the weekend of Nov 13–16 free, Chapecoense played Vasco on Nov 14 — Remo is rested on Nov 18', () => {
    const remo = on('2026-11-18', 'REMO');
    expect(windowAdvantage(model, remo)).toBe('4936');
  });
});

describe('competitions still alive', () => {
  const T = (rows: [string, string?][]): Table[] => [{ name: 'G', rows: rows.map(([team, zone], i) => ({ team, rank: i + 1, p: 6, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0, zone })) }];
  it('tie winners: score, aggregate on a second leg, then the shootout; a first leg decides nothing', () => {
    expect(tieWinner(mk('a', '2026-11-01', '1', '2', { hs: 2, as: 1 }))).toBe('1');
    expect(tieWinner(mk('a', '2026-11-01', '1', '2', { leg: 2, hs: 1, as: 0, ha: 1, aa: 2 }))).toBe('2');
    expect(tieWinner(mk('a', '2026-11-01', '1', '2', { leg: 2, hs: 1, as: 0, ha: 2, aa: 2, hp: 3, ap: 4 }))).toBe('2');
    expect(tieWinner(mk('a', '2026-11-01', '1', '2', { hs: 1, as: 1, hp: 5, ap: 4 }))).toBe('1');
    expect(tieWinner(mk('a', '2026-11-01', '1', '2', { leg: 1 }))).toBeUndefined();
    expect(tieWinner(mk('a', '2026-11-01', '1', '2', { leg: 2 }))).toBeUndefined(); // no aggregate given
  });
  it('alive with a match to come, awaiting a draw after a won tie, out after a lost one, over when finished', () => {
    const s = tiny([
      mk('l1', '2026-09-01', '1', '2'),
      mk('cupWon', '2026-09-20', '1', '3', { c: 'eng.fa', r: 'Third Round' }),
      mk('cupOther', '2026-12-20', '4', '5', { c: 'eng.fa', r: 'Fourth Round', st: 'pre' }), // the cup goes on
      mk('ecLost', '2026-09-25', '1', '3', { c: 'eng.league_cup', hs: 0, as: 1 }),
      mk('ecOther', '2026-12-01', '4', '5', { c: 'eng.league_cup', st: 'pre' }),
      mk('superOver', '2026-08-01', '1', '2', { c: 'eng.charity' }), // nothing after it: finished
      mk('ucl', '2026-10-01', '1', '2', { c: 'uefa.champions', r: 'League Phase' }),
      mk('uclOther', '2027-02-01', '4', '5', { c: 'uefa.champions', st: 'pre' }),
      mk('now', '2026-11-01', '1', '2', { st: 'pre' }),
      mk('l2', '2026-11-08', '1', '3', { st: 'pre' }),
    ], { 'uefa.champions': T([['1', 'Knockout phase playoffs - seeded'], ['2', 'Eliminated']]) });
    const md = buildModel(s, 'UTC');
    const got = Object.fromEntries(competitionsAlive(md, '1', s.matches.find((m) => m.id === 'now')!).map((x) => [x.comp, x.status]));
    expect(got).toEqual({ 'eng.charity': 'out', 'eng.1': 'alive', 'eng.fa': 'alive', 'eng.league_cup': 'out', 'uefa.champions': 'alive' });
  });
  it('a phase finish is read from ESPN\'s table note: eliminated, or sent to another competition, is out', () => {
    const s = tiny([
      mk('g', '2026-05-01', '1', '2', { c: 'conmebol.libertadores', r: 'Group Stage' }),
      mk('other', '2026-11-28', '4', '5', { c: 'conmebol.libertadores', r: 'Final', st: 'pre' }),
      mk('now', '2026-11-01', '1', '2', { st: 'pre' }),
    ], { 'conmebol.libertadores': T([['4', 'Qualifies for Round of 16'], ['1', 'Qualifies for Sudamericana KO Playoffs']]) });
    const md = buildModel(s, 'UTC');
    const lib = competitionsAlive(md, '1', s.matches.find((m) => m.id === 'now')!).find((x) => x.comp === 'conmebol.libertadores')!;
    expect(lib.status).toBe('out');
  });
  it('a tie not played yet (a match far ahead) is unknown, never guessed', () => {
    const s = tiny([
      mk('r16', '2027-01-12', '1', '2', { c: 'ita.coppa_italia', r: 'Round of 16', st: 'pre', hs: undefined, as: undefined }),
      mk('qf', '2027-02-04', '4', '5', { c: 'ita.coppa_italia', st: 'pre' }),
      mk('later', '2027-01-20', '1', '3', { st: 'pre' }),
    ]);
    const md = buildModel(s, 'UTC');
    const ci = competitionsAlive(md, '1', s.matches.find((m) => m.id === 'later')!).find((x) => x.comp === 'ita.coppa_italia')!;
    expect(ci.status).toBe('unknown');
  });
  it('snapshot: Palmeiras on Nov 18 — Brasileirão, the Libertadores final and the Copa do Brasil final: 3C', () => {
    const m = on('2026-11-18', 'PAL');
    const s = sideOf(m, PAL);
    expect(aliveCount(s)).toBe(3);
    expect(s.alive!.filter((x) => x.status === 'alive').map((x) => x.comp).sort()).toEqual(['bra.1', 'bra.copa_do_brazil', 'conmebol.libertadores']);
  });
  it('snapshot: the Copa do Brasil semifinal — Grêmio won 2-0, 1-1 (3-1 agg); after it Atlético-MG is out, Grêmio alive', () => {
    const after = on('2026-11-21', 'CAM'); // CAM's Sudamericana final
    expect(competitionsAlive(model, CAM, after).find((x) => x.comp === 'bra.copa_do_brazil')?.status).toBe('out');
    const gre = model.byTeam.get(GRE)!.find((m) => m.t > '2026-11-10T00:00Z')!;
    expect(competitionsAlive(model, GRE, gre).find((x) => x.comp === 'bra.copa_do_brazil')?.status).toBe('alive');
    // and its midweek match before the second leg shows "CDB 2-0" for the next window
    const mid = byId('401841307');
    const { prev, next } = windowsAround(model, GRE, mid);
    expect(slotMatch(prev)?.id).toBe('401913109');
    expect(slotMatch(next)?.id).toBe('401913108');
    expect(firstLegScore(model, slotMatch(next)!, GRE)).toBe('2-0');
    expect(firstLegScore(model, slotMatch(next)!, CAM)).toBe('0-2');
  });
  it('snapshot: Manchester City on Nov 21 — PL, UCL and the EFL Cup quarterfinal: 3C; not computed for a team not followed', () => {
    const m = on('2026-11-21', 'MNC');
    expect(aliveCount(sideOf(m, MNC))).toBe(3);
    expect(sideOf(m, m.h === MNC ? m.a : m.h).alive).toBeDefined(); // Fulham is followed too
    const cel = on('2026-11-21', 'CEL');
    expect(sideOf(cel, cel.a === '86' ? cel.h : cel.a).alive).toBeUndefined(); // Celta isn't followed
  });
});

describe('Z4R', () => {
  it('rebuilt standings equal ESPN\'s tables for all six leagues (points and matches played)', () => {
    for (const league of Object.keys(RELEGATION)) {
      const pts = pointsBefore(model, league, '9999');
      for (const r of snap.tables[league]![0]!.rows) expect([league, r.team, pts.get(r.team)]).toEqual([league, r.team, { pts: r.pts, p: r.p }]);
    }
  });
  it('the configured zone sizes match ESPN\'s zone notes wherever its table has them', () => {
    for (const [league, rule] of Object.entries(RELEGATION)) {
      const rows = snap.tables[league]![0]!.rows;
      const noted = rows.filter((r) => /releg/i.test(r.zone ?? ''));
      if (league === 'bra.1') { expect(noted).toHaveLength(0); continue; } // ESPN has no notes for it
      expect([league, noted.length]).toEqual([league, rule.direct + rule.playoff]);
      expect(rows.filter((r) => /playoff/i.test(r.zone ?? '')).length).toBe(rule.playoff);
    }
  });
  // ESPN's PL table going into Nov 21 (no PL match between the snapshot and then): … FUL 10, NFO 9, COV 9 | MAN 8,
  // SUN 8, CRY 7 — the zone line (18th) is 8 pts, the lowest safe place 9.
  it('snapshot, PL going into Nov 21 (round 11): in the zone, or within 3 points of the line', () => {
    const sun = on('2026-11-21', 'SUN');
    const z = z4At(model, SUN, sun)!;
    expect([z.round, z.pts, z.linePts, z.safePts, z.linePlace, z.status, z.gap, z.tagged]).toEqual([11, 8, 8, 9, 18, 'in', 1, true]);
    expect(z4Text(z)).toBe('in the drop zone, 1 pt from safety');
    const ful = z4At(model, '370', on('2026-11-21', 'FUL'))!;
    expect([ful.status, ful.gap, ful.tagged]).toEqual(['above', 2, true]);
    expect(z4Text(ful)).toBe('2 pts above the drop zone');
    const tot = z4At(model, '367', on('2026-11-21', 'TOT'))!; // 12 pts: 4 above
    expect([tot.status, tot.gap, tot.tagged]).toEqual(['above', 4, false]);
  });
  it('snapshot: a team outside the followed clubs is tagged from its own league table (Schalke, Bundesliga)', () => {
    const m = on('2026-11-21', 'S04');
    const z = z4At(model, '133', m)!;
    expect(z.league).toBe('ger.1');
    expect(z.linePlace).toBe(17); // direct places only: the 16th's play-off place is outside the zone
    expect(z.tagged).toBe(true);
  });
  it('snapshot: no Z4R for a team outside the six leagues (Boca)', () => {
    const m = on('2026-11-21', 'CAM');
    expect(z4At(model, m.h === CAM ? m.a : m.h, m)).toBeUndefined();
  });

  // Hand-made league of 20 (eng.1: 3 in the zone): points set by wins over a dummy opponent outside the table.
  function league(points: number[], rounds: number) {
    const ids = points.map((_, i) => `${i + 1}`);
    const matches: Match[] = [];
    let n = 0;
    points.forEach((p, i) => {
      for (let r = 0; r < rounds; r++) {
        const win = r < Math.floor(p / 3), draw = !win && r < Math.floor(p / 3) + (p % 3);
        matches.push(mk(`m${n++}`, `2026-0${1 + Math.floor(r / 28)}-${String(1 + (r % 28)).padStart(2, '0')}`, ids[i]!, 'X', { hs: win ? 1 : draw ? 0 : 0, as: win ? 0 : draw ? 0 : 1 }));
      }
    });
    const s: Snapshot = {
      v: 1, generatedAt: '', season: 'x', comps: {}, teams: {}, clubs: [{ id: '20', abbr: 'T', name: 'T', short: 'T', league: 'eng.1', region: 'europe' }],
      tables: { 'eng.1': [{ name: 'L', rows: ids.map((team, i) => ({ team, rank: i + 1, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 })) }] },
      matches: [...matches, mk('next', '2026-12-01', '17', '18', { st: 'pre' })].sort((a, b) => a.t.localeCompare(b.t)),
    };
    const md = buildModel(s, 'UTC');
    return (team: string) => z4At(md, team, s.matches.find((m) => m.id === 'next')!)!;
  }
  it('rounds 1–8: in the zone, or within 1 point of the last team in it', () => {
    // 17 teams on 5+, then 18th 4, 19th 3, 20th 3 after 4 rounds (round 5 going in)
    const at = league([12, 12, 10, 10, 9, 9, 9, 8, 8, 7, 7, 7, 6, 6, 6, 6, 5, 4, 3, 3], 4);
    expect([at('17').status, at('17').gap, at('17').round, at('17').tagged]).toEqual(['above', 1, 5, true]);
    expect([at('16').gap, at('16').tagged]).toEqual([2, false]);
    expect([at('18').status, at('18').tagged]).toEqual(['in', true]);
  });
  it('round 9 on: within 3 points of the line; level on points with the line is tagged whatever the tiebreakers', () => {
    // after 9 rounds (round 10 going in); 17th and 18th both on 7: level
    const at = league([27, 25, 22, 20, 19, 18, 16, 15, 14, 13, 13, 12, 11, 10, 10, 9, 7, 7, 4, 2], 9);
    expect([at('17').status, at('18').status]).toEqual(['level', 'level']);
    expect(at('17').tagged && at('18').tagged).toBe(true);
    expect(z4Text(at('17'))).toBe("level on points with the drop zone's line (18th) — tiebreakers decide");
    expect([at('16').gap, at('16').tagged]).toEqual([2, true]);
    expect([at('14').gap, at('14').tagged]).toEqual([3, true]);
    expect([at('13').gap, at('13').tagged]).toEqual([4, false]);
    expect([at('19').status, at('19').gap]).toEqual(['in', 3]);
  });
  it('no standings before a team\'s first league match', () => {
    const at = league(Array(20).fill(0), 0);
    expect(at('17')).toBeUndefined();
  });
});

describe('rivalries (config draft)', () => {
  it('every pair: two known teams, at least one followed club, listed once, with a Wikipedia source', () => {
    const seen = new Set<string>();
    for (const r of RIVALRIES) {
      const [a, b] = r.teams;
      expect(snap.teams[a], `${r.name}: ${a}`).toBeDefined();
      expect(snap.teams[b], `${r.name}: ${b}`).toBeDefined();
      expect(model.followed.has(a) || model.followed.has(b), r.name).toBe(true);
      const k = [a, b].sort().join('|');
      expect(seen.has(k), r.name).toBe(false);
      seen.add(k);
      expect(r.source).toMatch(/^https:\/\/(en|pt)\.wikipedia\.org\/wiki\/.+/);
    }
  });
  it('flags a derby in either order; snapshot: the Seville derby (Nov 21) and the North West derby (Nov 22)', () => {
    expect(rivalryOf({ h: '874', a: '2026' })?.name).toBe('Majestoso');
    expect(rivalryOf({ h: '2026', a: '874' })?.name).toBe('Majestoso');
    expect(rivalryOf({ h: '874', a: '2029' })?.name).toBe('Derby Paulista');
    expect(rivalryOf({ h: '874', a: '9318' })).toBeUndefined();
    expect(model.byDay.get('2026-11-21')!.map((m) => matchTags(model, m).derby?.name).filter(Boolean)).toEqual(['Seville derby']);
    expect(model.byDay.get('2026-11-22')!.map((m) => matchTags(model, m).derby?.name).filter(Boolean)).toEqual(['North West derby']);
  });
});
