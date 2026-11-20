// FK-71: the World Cup thirds race. Matchdays from the group's matches, the tables as they stood, a status only when
// certain (checked against random results of the matches left), the round of 32 as it stands, matchups, the simulator
// from a matchday, and the rules box's examples. 2026's expected standings below were worked out by hand from the
// results in public/worldcup/2026.json.
// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { MatchupsPanel, PointSwitch, RaceThirds, RulesBox } from '../src/components/WcRace';
import { lastMatchday, matchdays, matchups, picksFrom, possibleRows, race, raceEdition, resAt, sideOf, standing, thirdsExample, tieExample } from '../src/data/wcRace';
import { koSlots, simulate, type Picks } from '../src/data/wcSim';
import { groupTables, thirdsRanking, type Result, type WcEdition, type WcMatch } from '../src/data/worldcup';

const file = (f: string) => JSON.parse(readFileSync(join(import.meta.dirname, '..', 'public', 'worldcup', f), 'utf8')) as WcEdition;
const ed = file('2026.json');
const md = matchdays(ed);
const slots = koSlots(ed);
afterEach(cleanup);

describe('matchdays', () => {
  it("each group match is its teams' 1st, 2nd or 3rd: two matches per matchday in every group", () => {
    expect(lastMatchday(md)).toBe(3);
    for (const g of ed.groups) {
      const ms = ed.matches.filter((m) => m.group === g.name);
      for (const d of [1, 2, 3]) {
        const day = ms.filter((m) => md.get(m.n) === d);
        expect(day, `${g.name} matchday ${d}`).toHaveLength(2);
        expect(new Set(day.flatMap((m) => [m.h, m.a])).size).toBe(4);
      }
    }
    // Group A: 1 and 2, then 3 and 4, then 5 and 6
    expect([1, 2, 3, 4, 5, 6].map((n) => md.get(n))).toEqual([1, 1, 2, 2, 3, 3]);
    expect(md.get(73)).toBeUndefined();
  });
  it('the race is for editions with a pairing table for thirds', () => {
    expect(raceEdition(ed)).toBe(true);
    expect(raceEdition(file('2022.json'))).toBe(false);
  });
});

describe('the tables as they stood', () => {
  const row = (r: { team: string; pts: number; gd: number; gf: number }) => `${r.team} ${r.pts} ${r.gd} ${r.gf}`;
  it('after matchday 1: Group A (Mexico 2–0 South Africa, South Korea 2–1 Czech Republic)', () => {
    const r = race(ed, resAt(md, 1));
    expect(r.tables[0]!.rows.map(row)).toEqual(['MEX 3 2 2', 'KOR 3 1 2', 'CZE 0 -1 1', 'ZAF 0 -2 0']);
    expect(r.tables.every((t) => t.rows.every((x) => x.p === 1))).toBe(true);
    expect(r.thirds).toHaveLength(12);
    expect(row(r.thirds[0]!)).toBe('JPN 1 0 2');
    expect(r.complete).toBe(false);
  });
  it('after matchday 2: Group A (+ Czech Republic 1–1 South Africa, Mexico 1–0 South Korea) and the thirds in order', () => {
    const r = race(ed, resAt(md, 2));
    expect(r.tables[0]!.rows.map(row)).toEqual(['MEX 6 3 3', 'KOR 3 0 2', 'CZE 1 -1 2', 'ZAF 1 -2 1']);
    expect(r.tables.every((t) => t.rows.every((x) => x.p === 2))).toBe(true);
    expect(r.thirds.map((x) => `${x.group.slice(6)} ${row(x)}`)).toEqual([
      'F SWE 3 0 6', 'C SCO 3 0 1', 'L HRV 3 -1 3', 'J DZA 3 -2 2', 'D PRY 3 -2 2', 'H CPV 2 0 2', 'G BEL 2 0 1', 'A CZE 1 -1 2',
      'K COD 1 -1 1', 'E ECU 1 -1 0', 'B BIH 1 -3 2', 'I SEN 0 -3 3',
    ]);
    expect([...r.thirdsIn].sort().join('')).toBe('ACDFGHJL');
    // level on points, goal difference and goals: a shared place
    expect(r.thirds.filter((x) => x.level).map((x) => x.team)).toEqual(['DZA', 'PRY']);
  });
  it('the final point is the real tables', () => {
    const r = race(ed, resAt(md, 3));
    expect(r.complete).toBe(true);
    expect(r.tables.map((t) => t.rows.map((x) => x.team))).toEqual(groupTables(ed).map((t) => t.rows.map((x) => x.team)));
    expect(r.thirds.map((x) => x.team)).toEqual(thirdsRanking(groupTables(ed)).map((x) => x.team));
    expect([...r.status.values()].filter((s) => s === 'top2')).toHaveLength(24);
    expect([...r.status.values()].filter((s) => s === 'through')).toHaveLength(8);
    expect([...r.status.values()].filter((s) => s === 'out')).toHaveLength(16);
  });
});

describe('a status only when certain', () => {
  it('after matchday 2: Mexico (6 points, the others at most 3 and 1) are sure of the top two; Haiti (0 points, two teams on 4) are out; South Korea are open', () => {
    const r = race(ed, resAt(md, 2));
    expect(r.status.get('MEX')).toBe('top2');
    expect(r.places.get('MEX')).toEqual([1]);
    expect(r.status.get('HTI')).toBe('out');
    expect(r.places.get('HTI')).toEqual([4]);
    expect(r.status.get('KOR')).toBe('open');
    expect(r.places.get('KOR')).toEqual([2, 3, 4]);
    expect([...r.status].filter(([, s]) => s !== 'open').map(([t, s]) => `${t}:${s}`).sort()).toEqual(['ARG:top2', 'COL:top2', 'DEU:top2', 'FRA:top2', 'HTI:out', 'JOR:out', 'MEX:top2', 'NOR:top2', 'PAN:out', 'TUN:out', 'TUR:out', 'USA:top2']);
  });
  it('after matchday 1 nothing is certain yet', () => {
    expect([...race(ed, resAt(md, 1)).status.values()].every((s) => s === 'open')).toBe(true);
  });
  it('never wrong: with any results of the matches left, a team marked Through goes through and one marked Out goes out', () => {
    let seed = 20261120;
    const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 2 ** 32; };
    const goals = () => Math.floor(rnd() * rnd() * 6);
    for (const point of [1, 2]) {
      const at = race(ed, resAt(md, point));
      const rows = possibleRows(ed, at.thirdOf);
      for (let k = 0; k < 250; k++) {
        const made = new Map<number, Result>();
        const res = (m: WcMatch): Result => { if ((md.get(m.n) ?? 0) <= point) return m; if (!made.has(m.n)) made.set(m.n, { s: [goals(), goals()] }); return made.get(m.n)!; };
        const end = race(ed, res);
        expect(end.complete).toBe(true);
        for (const [team, s] of at.status) {
          const fin = end.status.get(team)!;
          const place = end.places.get(team)![0]!;
          expect(at.places.get(team), `${team} finished ${place}`).toContain(place);
          if (s === 'top2') expect(place, team).toBeLessThanOrEqual(2);
          if (s === 'through') expect(fin, team).not.toBe('out');
          if (s === 'out') expect(fin, team).toBe('out');
        }
        for (const [g, s] of at.thirdOf) if (s !== 'open') expect(end.thirdOf.get(g), `group ${g}'s third`).toBe(s);
        expect(rows.some((x) => x.groups === [...end.thirdsIn].sort().join(''))).toBe(true);
      }
    }
  });
  it('a third is Through when at most seven other thirds can reach its points, Out when eight are sure to have more', () => {
    // every group finished but A: A's third will have 3 points (South Korea or South Africa); really eight thirds ended on 4 or 3 with…
    const res = (m: WcMatch) => (m.group === 'Group A' && md.get(m.n) === 3 ? undefined : m);
    const r = race(ed, res);
    // seven thirds have 4 points (more than 3), the eighth and ninth have 3: A's third on 1–4 points is neither sure in nor sure out
    expect(r.thirdOf.get('A')).toBe('open');
    // the seven thirds on 4 points are sure: only A's third (at most 4) and the others on 3 could tie them, never eight
    for (const g of ['K', 'F', 'E', 'L', 'B', 'J', 'D']) expect(r.thirdOf.get(g), g).toBe('through');
    // Uruguay (2 points) are out: eight thirds are sure to have more (seven on 4, Senegal and Iran on 3)
    expect(r.thirdOf.get('H')).toBe('out');
    expect(r.status.get('URY')).toBe('out');
    expect(r.status.get('COD')).toBe('through');
  });
});

describe('the round of 32 as it stands', () => {
  it('after matchday 2: places from the tables then, thirds by the pairing-table row for the eight groups through then', () => {
    const r = race(ed, resAt(md, 2));
    const row = ed.thirdsTable!.find((x) => x.groups === 'ACDFGHJL')!;
    const st = standing(ed, r, slots);
    expect(st).toHaveLength(16);
    const by = new Map(st.map((x) => [x.slot.n, x]));
    // 1A v the third the row gives 1A
    expect(row.vs['1A']).toBe('3C');
    expect([by.get(79)!.h, by.get(79)!.a]).toEqual(['MEX', 'SCO']);
    // 2A v 2B
    expect([by.get(73)!.h, by.get(73)!.a]).toEqual(['KOR', 'CHE']);
    // every third through right then is in exactly one tie, the others in none
    const inTies = st.flatMap((x) => [x.h, x.a]);
    for (const t of r.thirds.slice(0, 8)) expect(inTies.filter((x) => x === t.team), t.team).toHaveLength(1);
    for (const t of r.thirds.slice(8)) expect(inTies).not.toContain(t.team);
    expect(new Set(inTies).size).toBe(32);
  });
  it('at the final point it is the real round of 32', () => {
    const st = standing(ed, race(ed, resAt(md, 3)), slots);
    for (const x of st) expect([x.h, x.a], `match ${x.slot.n}`).toEqual([x.slot.real.h, x.slot.real.a]);
  });
  it('the side of the bracket: the final is left side v right side', () => {
    const sides = slots.filter((s) => s.stage === 'Round of 32').map((s) => sideOf(slots, s.n));
    expect(sides.filter((s) => s === 'left')).toHaveLength(8);
    expect(sides.filter((s) => s === 'right')).toHaveLength(8);
    // Spain (left) beat Argentina (right) in the real final
    expect(sideOf(slots, slots.find((s) => s.real.h === 'ESP' && s.stage === 'Round of 32')!.n)).toBe('left');
    expect(sideOf(slots, slots.find((s) => s.real.h === 'ARG' && s.stage === 'Round of 32')!.n)).toBe('right');
  });
});

describe('matchups', () => {
  const r = race(ed, resAt(md, 2));
  it('only the places a team can still reach', () => {
    expect(matchups(ed, r, slots, 'MEX').map((m) => m.place)).toEqual([1]);
    expect(matchups(ed, r, slots, 'KOR').map((m) => m.place)).toEqual([2, 3]);
    expect(matchups(ed, r, slots, 'HTI')).toEqual([]);
  });
  it('1st of Group A: a third from the groups the pairing table still allows, and who that is as it stands', () => {
    const [m] = matchups(ed, r, slots, 'MEX');
    const all = [...new Set(ed.thirdsTable!.map((x) => x.vs['1A']!.slice(1)))].sort();
    expect(m!.versus).toEqual({ kind: 'thirds', groups: all });
    expect(m!.now).toBe('SCO');
    expect(m!.slot!.n).toBe(79);
    expect(m!.side).toBe(sideOf(slots, 79));
  });
  it('2nd of Group A plays 2nd of Group B; 3rd of Group A: through as it stands, against a group winner the table allows', () => {
    const [second, third] = matchups(ed, r, slots, 'KOR');
    expect(second!.versus).toEqual({ kind: 'place', pos: 2, group: 'B' });
    expect(second!.now).toBe('CHE');
    expect(third!.throughNow).toBe(true);
    const winners = [...new Set(ed.thirdsTable!.flatMap((x) => Object.entries(x.vs).filter(([, v]) => v === '3A').map(([w]) => w.slice(1))))].sort();
    expect(third!.versus).toEqual({ kind: 'winners', groups: winners });
    // as it stands: the winner the row for ACDFGHJL gives Group A's third
    const row = ed.thirdsTable!.find((x) => x.groups === 'ACDFGHJL')!;
    const w = Object.entries(row.vs).find(([, v]) => v === '3A')![0].slice(1);
    expect(third!.now).toBe(r.tables.find((t) => t.group.name === `Group ${w}`)!.rows[0]!.team);
  });
  it('opponents narrow to the pairing rows still possible', () => {
    // every group finished but A: seven thirds sure in, Uruguay's group (H) sure out
    const late = race(ed, (m) => (m.group === 'Group A' && md.get(m.n) === 3 ? undefined : m));
    const rows = possibleRows(ed, late.thirdOf);
    expect(rows.length).toBeLessThan(10);
    expect(rows.length).toBeGreaterThan(0);
    for (const x of rows) { for (const g of 'KFELBJD') expect(x.groups).toContain(g); expect(x.groups).not.toContain('H'); }
    const first = matchups(ed, late, slots, 'MEX').find((m) => m.place === 1)!;
    expect(first.versus.kind).toBe('thirds');
    expect((first.versus as { groups: string[] }).groups).toEqual([...new Set(rows.map((x) => x.vs['1A']!.slice(1)))].sort());
    expect((first.versus as { groups: string[] }).groups.length).toBeLessThan(5);
  });
});

describe('the simulator from a matchday', () => {
  it('opened after matchday 2: matchdays 1–2 as played, matchday 3 and the knockouts empty, the first round as it stands', () => {
    const picks = picksFrom(ed, md, 2, slots);
    const v = simulate(ed, picks, slots, true);
    for (const m of ed.matches.filter((x) => x.group)) expect(v.res(m), `match ${m.n}`).toEqual(md.get(m.n)! <= 2 ? m : undefined);
    expect(v.tables[0]!.rows.map((x) => `${x.team} ${x.pts}`)).toEqual(['MEX 6', 'KOR 3', 'CZE 1', 'ZAF 1']);
    expect(v.champion).toBeUndefined();
    const st = standing(ed, race(ed, v.res), slots);
    for (const x of st) { const t = v.ties.find((y) => y.slot.n === x.slot.n)!; expect([t.h, t.a]).toEqual([x.h, x.a]); expect(t.r).toBeUndefined(); }
  });
  it('fills to the real bracket when the real results are entered', () => {
    const picks: Picks = { ...picksFrom(ed, md, 2, slots) };
    for (const m of ed.matches.filter((x) => x.group && md.get(x.n) === 3)) picks[m.n] = { r: { s: m.s } };
    for (const s of slots) picks[s.n] = { r: { s: s.real.s, ...(s.real.et ? { et: s.real.et } : {}), ...(s.real.p ? { p: s.real.p } : {}) }, h: s.real.h, a: s.real.a };
    const v = simulate(ed, picks, slots, true);
    for (const t of v.ties) expect([t.h, t.a], `match ${t.slot.n}`).toEqual([t.slot.real.h, t.slot.real.a]);
    expect(v.champion).toBe(ed.champion);
    expect(v.changed.size).toBe(0);
  });
  it('a different matchday-3 result changes which thirds are through', () => {
    const before = race(ed, simulate(ed, picksFrom(ed, md, 2, slots), slots, true).res);
    // Group I's third (Senegal, 0 points after two matches) win big: they jump into the best eight
    const m = ed.matches.find((x) => x.group === 'Group I' && md.get(x.n) === 3 && [x.h, x.a].includes('SEN'))!;
    const win: Result = { s: m.h === 'SEN' ? [5, 0] : [0, 5] };
    const after = race(ed, simulate(ed, { ...picksFrom(ed, md, 2, slots), [m.n]: { r: win } }, slots, true).res);
    expect(before.thirdsIn).not.toContain('I');
    expect(after.thirdsIn.join('')).not.toBe(before.thirdsIn.join(''));
  });
});

describe('on the page', () => {
  const r = race(ed, resAt(md, 2));
  it('the point switch: after matchday 1, after matchday 2, Final', () => {
    const picked: (number | undefined)[] = [];
    render(<PointSwitch last={3} at={2} onAt={(p) => picked.push(p)} />);
    const tabs = within(screen.getByTestId('wc-point')).getAllByRole('tab');
    expect(tabs.map((t) => t.textContent)).toEqual(['After matchday 1', 'After matchday 2', 'Final']);
    expect(tabs.map((t) => t.getAttribute('aria-selected'))).toEqual(['false', 'true', 'false']);
    tabs[0]!.click(); tabs[2]!.click();
    expect(picked).toEqual([1, undefined]);
  });
  it('the thirds: eight above the cut line, a status on each row', () => {
    render(<RaceThirds ed={ed} r={r} onTeam={() => undefined} />);
    const rows = screen.getAllByTestId('wc-race-third');
    expect(rows).toHaveLength(12);
    expect(rows.map((x) => x.getAttribute('data-in'))).toEqual([...Array<string>(8).fill('true'), ...Array<null>(4).fill(null)]);
    expect(rows.map((x) => x.getAttribute('data-cut')).indexOf('true')).toBe(7);
    expect(screen.getAllByTestId('wc-status')).toHaveLength(12);
  });
  it('a team\'s matchups in plain words', () => {
    render(<MatchupsPanel ed={ed} r={r} slots={slots} team="KOR" onClose={() => undefined} />);
    const ps = screen.getAllByTestId('wc-matchup');
    expect(ps.map((p) => p.getAttribute('data-place'))).toEqual(['2', '3', '4']);
    expect(ps[0]!.textContent).toContain('If South Korea finish 2nd: They play the team that finishes 2nd in Group B. Right now that is Switzerland.');
    expect(ps[1]!.textContent).toContain('one of the best 8');
    expect(ps[2]!.textContent).toContain('they are out');
    expect(screen.getByTestId('wc-matchups').textContent).toContain('can still finish 2nd, 3rd or 4th');
  });
  it('the rules box: plain sentences and examples with real teams of the edition', () => {
    render(<RulesBox ed={ed} onClose={() => undefined} />);
    const box = screen.getByTestId('wc-rules-box').textContent!;
    expect(box).toContain('48 teams play in 12 groups of 4.');
    expect(box).toContain('That is 24 teams.');
    expect(box).toContain('The best 8 of them go on too.');
    expect(box).toContain('That makes 32 teams');
    expect(box).toContain('495 rows');
    // the examples are worked out from the data
    expect(thirdsExample(ed)).toMatchObject({ last: { team: 'SEN', group: 'I', pts: 3, gd: 2 }, first: { team: 'IRN', group: 'G', pts: 3, gd: 0 }, by: 'goal difference' });
    expect(screen.getByTestId('wc-rules-thirds-example').textContent).toContain('Senegal finished 3rd in Group I with 3 points, goal difference +2, 8 goals scored. That was 8th best, so Senegal went on.');
    expect(screen.getByTestId('wc-rules-thirds-example').textContent).toContain('Iran finished 3rd in Group G');
    expect(tieExample(ed)).toMatchObject({ group: 'B', high: 'CAN', low: 'BIH', pts: 4, score: [1, 1], by: 'goal difference', values: [5, -1] });
    expect(screen.getByTestId('wc-rules-tie-example').textContent).toContain('Canada and Bosnia and Herzegovina both had 4 points. Their match ended 1–1, a draw.');
    expect(screen.getByTestId('wc-rules-pairing-example').textContent).toMatch(/So \S.* played \S.*\./);
    // no unexplained short forms
    expect(box).not.toMatch(/\b(GD|GF|Pts|H2H|R32|a\.e\.t\.)\b/);
  });
});
