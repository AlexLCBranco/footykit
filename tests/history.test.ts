// FK-64: competition history. ESPN's past final tables (public/history/, scripts/make-history.ts) are checked against a
// second, independent source: the tables worked out from football-data.co.uk's results for the same seasons
// (tests/fixtures/history-check.json, `npm run make-history -- --check`).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { histBracket, HISTORY_COMPS, records, summarize, type HistIndex, type HistSeason } from '../src/data/history';

const dir = join(import.meta.dirname, '..', 'public', 'history');
const season = (c: string, y: number) => JSON.parse(readFileSync(join(dir, c, `${y}.json`), 'utf8')) as HistSeason;
const index = JSON.parse(readFileSync(join(dir, 'index.json'), 'utf8')) as HistIndex;
const check = JSON.parse(readFileSync(join(import.meta.dirname, 'fixtures', 'history-check.json'), 'utf8')) as Record<string, Record<string, number[][]>>;

describe('league final tables equal the ones from football-data.co.uk\'s results (second source)', () => {
  for (const comp of ['eng.1', 'esp.1', 'ita.1', 'ger.1', 'fra.1']) {
    for (const year of [2005, 2015, 2023]) {
      it(`${comp} ${year}`, () => {
        const other = check[comp]?.[year];
        expect(other, 'second source has the season').toBeDefined();
        const ours = season(comp, year).tables[0]!.rows.map((r) => [r.w, r.d, r.l, r.gf, r.ga].join(','));
        // team names differ between the sources: the multiset of records must match (points can carry deductions)
        const theirs = other!.map((r) => r.slice(0, 5).join(','));
        // Serie A 2005-06: football-data.co.uk has one Empoli–Messina score wrong; ESPN agrees with Wikipedia's table
        // (Empoli 13-6-19 47-61, Messina 6-13-19 33-59), checked 2026-11-19
        const fix: Record<string, string> = comp === 'ita.1' && year === 2005 ? { '13,6,19,46,62': '13,6,19,47,61', '6,13,19,34,58': '6,13,19,33,59' } : {};
        expect([...ours].sort()).toEqual(theirs.map((x) => fix[x] ?? x).sort());
      });
    }
  }
});

describe('summaries', () => {
  const champ = (c: string, y: number) => { const s = index[c]!.seasons.find((x) => x.year === y)!; return index[c]!.teams[s.champion!]; };
  it('champions', () => {
    expect(champ('eng.1', 2010)).toMatch(/Man(chester)? Utd|Man United|Manchester United/);
    expect(champ('esp.1', 2015)).toMatch(/Barcelona/);
    expect(champ('uefa.champions', 2018)).toMatch(/Liverpool/);
    expect(champ('uefa.champions', 2010)).toMatch(/Barcelona/);
    expect(champ('conmebol.libertadores', 2019)).toMatch(/Flamengo/);
  });
  it('every competition has seasons and a first complete one', () => {
    for (const c of HISTORY_COMPS) {
      expect(index[c], c).toBeDefined();
      expect(index[c]!.seasons.filter((s) => s.complete).length, c).toBeGreaterThan(5);
    }
  });
  it('who goes far: sorted by titles', () => {
    const r = records(index['uefa.champions']!.seasons.filter((s) => s.complete), new Map());
    expect(index['uefa.champions']!.teams[r[0]!.team]).toMatch(/Real Madrid/);
  });
});

describe('a cup season\'s bracket', () => {
  it('UCL 2018-19: round of 16 to the final, two legs added up, Liverpool beat Spurs', () => {
    const s = season('uefa.champions', 2018);
    const b = histBracket(s);
    expect(b.bracket.map((r) => r.ties.length)).toEqual([8, 4, 2, 1]);
    expect(b.bracket.slice(0, 3).every((r) => r.legs === 2)).toBe(true);
    const f = b.cols[3]![0]!;
    expect([s.teams[f.a]!.name, s.teams[f.b]!.name].sort()).toEqual(['Liverpool', 'Tottenham Hotspur']);
    // Liverpool v Barcelona: 0-3, 4-0 → 4-3 on aggregate
    const lb = b.cols[2]!.find((t) => [s.teams[t.a]!.name, s.teams[t.b]!.name].includes('Barcelona'))!;
    expect(s.teams[lb.winner!]!.name).toBe('Liverpool');
    expect([lb.goalsA, lb.goalsB].sort()).toEqual([3, 4]);
    expect(summarize(s, 'cup').far).toHaveLength(4);
  });
});
