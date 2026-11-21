// FK-72: the relegation race — who is listed (the Z4R closeness rule by round), the gaps, the matches left, the games
// between the listed teams, the address, and the rules box in plain words.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { LEAGUES } from '../config/leagues';
import { RELEGATION } from '../config/relegation';
import type { LeagueSlug } from '../config/season';
import { leagueHowOf, leaguePage, searchEntries, searchFind, whereOf } from '../src/components/nav';
import { LEAGUE_SLUGS, pageFromSearch, pageSearch, pageTitle } from '../src/components/page';
import { buildModel, isPlayed } from '../src/data/model';
import { closeLimit, gapText, raceFromTable, relegationRace, statusText } from '../src/data/relegation';
import { PLAIN_TIEBREAK, relegationRules } from '../src/data/relegationRules';
import type { Snapshot } from '../src/data/snapshot';

const snap = JSON.parse(readFileSync(join(import.meta.dirname, 'fixtures/snapshot.json'), 'utf8')) as Snapshot;
const model = buildModel(snap, 'America/Sao_Paulo');

/** a 20-team table, top first: team "t1" … "t20", every team on `p` matches */
const table = (pts: number[], p: number | number[] = 20) => pts.map((x, i) => ({ team: `t${i + 1}`, pts: x, p: Array.isArray(p) ? p[i]! : p }));
const top = (n: number, from = 60) => Array.from({ length: n }, (_, i) => from - i);

describe('who is close to the drop zone, by round (the Z4R tag\'s rule)', () => {
  it('through round 8: 1 point; from round 9: 3 points', () => {
    expect([1, 8, 9, 38].map(closeLimit)).toEqual([1, 1, 3, 3]);
  });
  it('from round 9: every team in the zone, and those up to 3 points above its top team', () => {
    //                    13   14  15  16  17 | 18  19  20
    const t = table([...top(12), 25, 24, 23, 21, 20, 20, 15, 9]);
    const race = raceFromTable(t, { direct: 3, playoff: 0 }, () => 18);
    expect(race.rows.map((r) => [r.place, r.status, r.gap])).toEqual([
      [15, 'close', 3], [16, 'close', 1], [17, 'close', 0], [18, 'down', 0], [19, 'down', 5], [20, 'down', 11],
    ]);
    expect(race.lastSafe).toEqual({ team: 't17', place: 17, pts: 20 });
    expect(race.firstDown).toEqual({ team: 't18', place: 18, pts: 20 });
  });
  it('in the first 8 rounds: only 1 point above counts; a team with a game in hand is judged on its own round', () => {
    const pts = [...top(12, 20), 7, 6, 5, 5, 4, 3, 2, 1];
    // every team has played 7 (round 8 next): 16th is 2 above the zone's top team (3 pts): not close; 17th (1 above) is
    expect(raceFromTable(table(pts, 7), { direct: 3, playoff: 0 }, () => 31).rows.map((r) => r.place)).toEqual([17, 18, 19, 20]);
    // the 16th-placed team has played 8 (round 9 next): its limit is 3, so it is listed
    const played = pts.map((_, i) => (i === 15 ? 8 : 7));
    expect(raceFromTable(table(pts, played), { direct: 3, playoff: 0 }, () => 31).rows.map((r) => r.place)).toEqual([16, 17, 18, 19, 20]);
  });
  it('a play-off place: always listed, its gap is to the last team that is fully safe', () => {
    const t = table([...top(14), 20, 18, 12, 10].slice(0, 18));
    const race = raceFromTable(t, { direct: 2, playoff: 1 }, () => 10);
    expect(race.rows.map((r) => [r.place, r.status, r.gap])).toEqual([[16, 'playoff', 2], [17, 'down', 8], [18, 'down', 10]]);
    expect(race.lastSafe?.place).toBe(15);
    expect(race.firstDown?.place).toBe(17);
  });
  it('before any match is played nobody is listed', () => {
    expect(raceFromTable(table(Array.from({ length: 20 }, () => 0), 0), { direct: 3, playoff: 0 }, () => 38).rows).toEqual([]);
  });
  it('the gap and the status in plain words', () => {
    expect(gapText({ status: 'down', gap: 2 })).toBe('2 points from safety');
    expect(gapText({ status: 'down', gap: 1 })).toBe('1 point from safety');
    expect(gapText({ status: 'playoff', gap: 0 })).toBe('Same points as the last safe team');
    expect(gapText({ status: 'close', gap: 3 })).toBe('3 points above the drop zone');
    expect(gapText({ status: 'close', gap: 0 })).toBe('Same points as the drop zone');
    expect([statusText('down'), statusText('playoff'), statusText('close')]).toEqual(['In the drop zone', 'Play-off place', 'Close to the drop zone']);
  });
});

describe('the recorded season', () => {
  it('Brasileirão: the bottom four are down, gaps in points, matches left counted from the schedule', () => {
    const race = relegationRace(snap, 'bra.1');
    const down = race.rows.filter((r) => r.status === 'down');
    expect(down.map((r) => r.place)).toEqual([17, 18, 19, 20]);
    expect(race.rows.every((r) => r.status !== 'playoff')).toBe(true);
    for (const r of race.rows) {
      const mine = snap.matches.filter((m) => m.c === 'bra.1' && (m.h === r.team || m.a === r.team));
      expect(r.left, r.team).toBe(mine.filter((m) => !isPlayed(m) && m.st !== 'can').length);
      expect(r.played + r.left, r.team).toBe(38);
      expect(r.gap, r.team).toBe(r.status === 'close' ? r.pts - race.firstDown!.pts : race.lastSafe!.pts - r.pts);
      if (r.status === 'close') expect(r.gap).toBeLessThanOrEqual(3);
    }
    // the safe teams not listed are all more than 3 points clear
    const listed = new Set(race.rows.map((r) => r.team));
    for (const r of snap.tables['bra.1']![0]!.rows) if (!listed.has(r.team)) expect(r.pts - race.firstDown!.pts).toBeGreaterThan(3);
  });
  it('the games still to play between the listed teams: both sides listed, not played, by kickoff', () => {
    const race = relegationRace(snap, 'bra.1');
    const listed = new Set(race.rows.map((r) => r.team));
    expect(race.between.length).toBeGreaterThan(0);
    for (const m of race.between) expect(listed.has(m.h) && listed.has(m.a) && !isPlayed(m)).toBe(true);
    expect(race.between.map((m) => m.t)).toEqual(race.between.map((m) => m.t).sort());
    const all = snap.matches.filter((m) => m.c === 'bra.1' && listed.has(m.h) && listed.has(m.a) && !isPlayed(m) && m.st !== 'can');
    expect(race.between.length).toBe(all.length);
  });
  it('Bundesliga: 16th is the play-off place, 17th and 18th go down', () => {
    const race = relegationRace(snap, 'ger.1');
    expect(race.rows.filter((r) => r.status !== 'close').map((r) => [r.place, r.status])).toEqual([[16, 'playoff'], [17, 'down'], [18, 'down']]);
  });
});

describe('the rules box: plain words, facts from config', () => {
  it('every tie-break line of every league has a plain twin', () => {
    for (const l of LEAGUE_SLUGS) for (const t of LEAGUES[l].tiebreakText) expect(PLAIN_TIEBREAK[t], `${l}: "${t}"`).toBeDefined();
  });
  it.each(LEAGUE_SLUGS)('%s: how many go down, the places, and an example with the teams on the line', (l: LeagueSlug) => {
    const race = relegationRace(snap, l);
    const box = relegationRules(l, model.comp(l).name, race, (t) => model.team(t).name);
    const rule = RELEGATION[l];
    expect(box.basics[0]).toBe(`${model.comp(l).name} has ${race.size} teams.`);
    expect(box.basics.join(' ')).toContain(`the ${rule.direct} teams with the fewest points go down`);
    expect(box.basics.some((t) => t.includes('plays 2 more games'))).toBe(rule.playoff > 0);
    expect(box.level.length).toBeGreaterThan(1);
    expect(box.example[0]).toContain(model.team(race.lastSafe!.team).name);
    expect(box.example.join(' ')).toContain(`${model.team(race.firstDown!.team).name} is`);
    // short sentences, no table jargon left unexplained
    for (const t of [...box.basics, ...box.level, ...box.example, ...box.listed]) {
      expect(t, t).not.toMatch(/head-to-head|aggregate|tiebreak|\bGD\b|\bpts\b/i);
      for (const s of t.split(/(?<=[.?!])\s+/)) expect(s.split(' ').length, s).toBeLessThanOrEqual(30);
    }
  });
  it('Brasileirão today: Internacional last safe on 38, Corinthians first down on 37, 1 point to catch up', () => {
    const race = relegationRace(snap, 'bra.1');
    expect(relegationRules('bra.1', 'Brasileirão', race, (t) => model.team(t).name).example).toEqual([
      'Internacional is 16th with 38 points. It is the last safe team.',
      'Corinthians is 17th with 37 points. It is the first team in the drop zone.',
      'Corinthians needs 1 more point to catch Internacional.',
    ]);
  });
});

describe('the page\'s place in the app', () => {
  const today = '2026-11-21';
  it('its address round-trips; it sits under Leagues with the Relegation How', () => {
    const p = pageFromSearch('?view=relegation&league=bra.1', today, model);
    expect(p).toMatchObject({ view: 'relegation', league: 'bra.1' });
    expect(pageSearch(p)).toBe('?view=relegation&league=bra.1');
    expect(whereOf(p)).toBe('leagues');
    expect(leagueHowOf(p)).toBe('race');
    expect(pageTitle(p, model)).toBe('Brasileirão relegation race — footykit');
    expect(pageFromSearch('?view=relegation&league=nope', today, model).league).toBe('eng.1');
    // the How switch keeps the league; another league keeps the How
    expect(leaguePage(p, 'ger.1', 'race', today)).toMatchObject({ view: 'relegation', league: 'ger.1' });
    expect(leaguePage(p, 'bra.1', 'table', today)).toMatchObject({ view: 'table', league: 'bra.1' });
  });
  it('"Go anywhere" finds it', () => {
    const p = pageFromSearch('', today, model);
    const found = searchFind(searchEntries(p, model, today), 'brasileirao relegation');
    expect(found[0]?.page).toMatchObject({ view: 'relegation', league: 'bra.1' });
  });
});
