// FK-59: the World Cup history. The data (public/worldcup/, scripts/make-worldcup.ts) comes from the Fjelstul World Cup
// Database (1930–2022) and openfootball (2026); the group tables built from it are checked against a second source:
// Wikipedia's final group tables (tests/fixtures/wc-wiki-tables.json, `npm run make-worldcup -- --wiki`).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { advancing, bracket, groupTables, rankGroup, reached, rulesFor, scoreText, squadUrl, thirdPlace, thirdsRanking, wcMatchUrl, type WcEdition } from '../src/data/worldcup';

const ed = (y: number) => JSON.parse(readFileSync(join(import.meta.dirname, '..', 'public', 'worldcup', `${y}.json`), 'utf8')) as WcEdition;
type WikiTable = { order: string[]; rows: Record<string, [number, number, number, number, number]> };
const wiki = JSON.parse(readFileSync(join(import.meta.dirname, 'fixtures', 'wc-wiki-tables.json'), 'utf8')) as Record<string, WikiTable[]>;

describe('group tables equal Wikipedia\'s final tables (second source)', () => {
  for (const year of [1982, 1994, 2014, 2022, 2026]) {
    it(`${year}`, () => {
      const e = ed(year);
      const tables = groupTables(e);
      // Wikipedia's per-group tables (not the tournament ranking or the thirds table)
      const groups = wiki[year]!.filter((t) => t.order.length === tables[0]!.rows.length || t.order.length === 3);
      const line = (r: { w: number; d: number; l: number; gf: number; ga: number }) => [r.w, r.d, r.l, r.gf, r.ga].join(',');
      expect(groups.length, 'every group has a Wikipedia table').toBe(tables.length);
      for (const t of tables) {
        const ours = t.rows.map(line);
        // the Wikipedia table with these teams' records (codes differ between the sources: FRG / DEU …)
        const w = groups.find((g) => [...g.order.map((c) => g.rows[c]!.join(','))].sort().join('|') === [...ours].sort().join('|'));
        expect(w, `${year} ${t.group.name}: a Wikipedia table with the same records`).toBeDefined();
        // and in the same order
        expect(ours, `${year} ${t.group.name}`).toEqual(w!.order.map((c) => w!.rows[c]!.join(',')));
        if (year === 2026) expect(t.rows.map((r) => e.fifa![r.team]), `${year} ${t.group.name} teams`).toEqual(w!.order);
      }
    });
  }
});

describe('2026: the third-placed teams', () => {
  const e = ed(2026);
  const tables = groupTables(e);
  const thirds = thirdsRanking(tables);
  it('ranked as Wikipedia\'s table, the best eight from B, D, E, F, I, J, K, L', () => {
    const w = wiki[2026]!.find((t) => t.order.length === 12)!;
    // Wikipedia's thirds table is keyed by group ("GrK"). E and L are level on everything but fair play (not in the
    // data): footykit shows them sharing 3rd, so within a shared place the order is Wikipedia's
    const key = (r: (typeof thirds)[number]) => `Gr${r.group.replace('Group ', '')}`;
    expect(thirds.filter((r) => r.level).map(key).sort()).toEqual(['GrE', 'GrL']);
    expect([...thirds].sort((x, y) => x.rank - y.rank || w.order.indexOf(key(x)) - w.order.indexOf(key(y))).map(key)).toEqual(w.order);
    expect(thirds.map((r) => r.rank)).toEqual([1, 2, 3, 3, 5, 6, 7, 8, 9, 10, 11, 12]);
    for (const r of thirds) expect([r.w, r.d, r.l, r.gf, r.ga].join(','), r.group).toBe(w.rows[`Gr${r.group.replace('Group ', '')}`]!.join(','));
    expect(thirds.slice(0, 8).map((r) => r.group.replace('Group ', '')).sort().join('')).toBe('BDEFIJKL');
  });
  it('32 teams through: the top two of each group and the eight best thirds', () => {
    const adv = advancing(e, tables);
    expect(adv.size).toBe(32);
    const r32 = new Set(e.matches.filter((m) => m.stage === 'Round of 32').flatMap((m) => [m.h, m.a]));
    expect([...adv].sort()).toEqual([...r32].sort());
  });
  it('Annex C option 67 gives the real round-of-32 matchups', () => {
    const row = e.thirdsTable!.find((r) => r.groups === 'BDEFIJKL')!;
    expect(row.vs).toEqual({ '1A': '3E', '1B': '3J', '1D': '3B', '1E': '3D', '1G': '3I', '1I': '3F', '1K': '3L', '1L': '3K' });
    expect(e.thirdsTable).toHaveLength(495);
  });
});

describe('the rules engine', () => {
  it('reproduces the official order of every 1998–2022 group (a shared place where only fair play / lots decided)', () => {
    for (const y of [1998, 2002, 2006, 2010, 2014, 2018, 2022]) {
      const e = ed(y);
      for (const t of groupTables(e)) {
        const order = t.group.order;
        const ranked = rankGroup(order, t.matches, 3, rulesFor(y)!.rule, order);
        expect(ranked.map((r) => r.team), `${y} ${t.group.name}`).toEqual(order);
      }
    }
    // 2018 Group H: Japan over Senegal on fair play only
    const h = groupTables(ed(2018)).find((t) => t.group.name === 'Group H')!;
    const r = rankGroup(h.group.order, h.matches, 3, 'overall', h.group.order);
    expect(r.filter((x) => x.level).map((x) => [ed(2018).teams[x.team], x.rank])).toEqual([['Japan', 2], ['Senegal', 2]]);
  });
  it('2026 uses head-to-head first: Group B, Canada over Bosnia (1–1 between them, then goal difference)', () => {
    const e = ed(2026);
    const b = groupTables(e).find((t) => t.group.name === 'Group B')!;
    expect(b.rows.map((r) => e.fifa![r.team])).toEqual(['SUI', 'CAN', 'BIH', 'QAT']);
  });
  it('two points a win before 1994', () => {
    const t = groupTables(ed(1990))[0]!;
    for (const r of t.rows) expect(r.pts).toBe(2 * r.w + r.d);
    const u = groupTables(ed(1994))[0]!;
    for (const r of u.rows) expect(r.pts).toBe(3 * r.w + r.d);
  });
});

describe('editions with second group stages show them', () => {
  it.each([[1950, 'Final round', 1], [1974, 'Second group stage', 2], [1978, 'Second group stage', 2], [1982, 'Second group stage', 4]] as const)('%i: %s (%i groups)', (y, stage, n) => {
    expect(groupTables(ed(y)).filter((t) => t.group.stage === stage)).toHaveLength(n);
  });
  it('1954 play-offs are not counted in the table', () => {
    const e = ed(1954);
    const g2 = groupTables(e).find((t) => t.group.name === 'Group 2')!;
    expect(g2.rows.every((r) => r.p === 2)).toBe(true);
    expect(e.matches.filter((m) => m.playoff)).toHaveLength(2);
  });
});

describe('the bracket', () => {
  it('2022: round of 16 to the final, each tie beside the ones that fed it', () => {
    const e = ed(2022);
    const b = bracket(e);
    expect(b.map((r) => [r.stage, r.ties.length])).toEqual([['Round of 16', 8], ['Quarter-finals', 4], ['Semi-finals', 2], ['Final', 1]]);
    for (let i = 0; i + 1 < b.length; i++) b[i + 1]!.ties.forEach((t, k) => {
      const feeds = [b[i]!.ties[2 * k]!, b[i]!.ties[2 * k + 1]!];
      expect(feeds.map((f) => f.winner).sort()).toEqual([t!.a, t!.b].sort());
    });
    const f = b[3]!.ties[0]!;
    expect([e.teams[f.winner!], scoreText(f.matches[0]!)]).toEqual(['Argentina', '2–2 (a.e.t. 3–3, 4–2 pens)']);
    expect(e.teams[thirdPlace(e)!.winner!]).toBe('Croatia');
  });
  it('2026: round of 32, 16 ties', () => expect(bracket(ed(2026)).map((r) => r.ties.length)).toEqual([16, 8, 4, 2, 1]));
  it('1934: a replay joins its tie; the replay decides', () => {
    const qf = bracket(ed(1934)).find((r) => r.stage === 'Quarter-finals')!;
    const replayed = qf.ties.find((t) => t!.matches.length === 2)!;
    expect(ed(1934).teams[replayed.winner!]).toBe('Italy');
  });
  it('1950 has no knockout bracket (a final round group)', () => expect(bracket(ed(1950))).toEqual([]));
  it('1938: the first round in the bracket, an empty slot where Sweden went through on a walkover (no match)', () => {
    const e = ed(1938);
    const b = bracket(e);
    expect(b.map((r) => r.stage)).toEqual(['Round of 16', 'Quarter-finals', 'Semi-finals', 'Final']);
    expect(b[0]!.ties.filter((t) => t === null)).toHaveLength(1);
    const k = b[1]!.ties.findIndex((t) => t && (e.teams[t.a] === 'Sweden' || e.teams[t.b] === 'Sweden'));
    expect([b[0]!.ties[2 * k], b[0]!.ties[2 * k + 1]]).toContain(null);
  });
});

describe('history and links', () => {
  it('furthest stage', () => {
    const r = reached(ed(1982));
    const e = ed(1982);
    const by = Object.fromEntries(Object.entries(r).map(([c, s]) => [e.teams[c], s]));
    expect(by).toMatchObject({ Italy: 'Winner', 'West Germany': 'Runner-up', Poland: 'Third place', France: 'Fourth place', Brazil: 'Second group stage', Scotland: 'Group stage' });
  });
  it('a match is a Google search "Home vs Away Mon D YYYY"; a team links to its squad section', () => {
    const e = ed(2014);
    const m = e.matches.find((x) => x.stage === 'Semi-finals' && e.teams[x.h] === 'Brazil')!;
    expect(decodeURIComponent(wcMatchUrl(e, m))).toBe('https://www.google.com/search?q=Brazil vs Germany Jul 8 2014');
    expect(squadUrl(2014, 'Ivory Coast')).toBe('https://en.wikipedia.org/wiki/2014_FIFA_World_Cup_squads#Ivory_Coast');
  });
  it('every edition from 1930 to 2026 is there, with scorers', () => {
    const idx = JSON.parse(readFileSync(join(import.meta.dirname, '..', 'public', 'worldcup', 'index.json'), 'utf8')) as { year: number }[];
    expect(idx.map((x) => x.year)).toEqual([1930, 1934, 1938, 1950, 1954, 1958, 1962, 1966, 1970, 1974, 1978, 1982, 1986, 1990, 1994, 1998, 2002, 2006, 2010, 2014, 2018, 2022, 2026]);
    for (const x of idx) expect(ed(x.year).scorers, String(x.year)).toBe('full');
  });
});
