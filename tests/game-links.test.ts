// FK-40: the Slate game button's links — every followed club has its own Transfermarkt injuries page (checked by hand
// once for all 54 clubs, see config/injuryLinks.ts); a club without one gets Transfermarkt's search; never a betting
// action in the app, only links.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { BETTING_FOOTBALL_URL } from '../config/injuryLinks';
import { gameLinks, injuryLink } from '../src/components/GameLinks';
import { buildModel } from '../src/data/model';
import type { Snapshot } from '../src/data/snapshot';

const snap = JSON.parse(readFileSync(join(import.meta.dirname, 'fixtures/snapshot.json'), 'utf8')) as Snapshot;
const model = buildModel(snap, 'UTC');

describe('injury links (FK-40)', () => {
  it('an injury page for every followed club, Brazilian ones included', () => {
    expect(snap.clubs.length).toBeGreaterThan(50);
    for (const c of snap.clubs) {
      const l = injuryLink(model, c.id);
      expect(l.exact, c.name).toBe(true);
      expect(l.url).toMatch(/^https:\/\/www\.transfermarkt\.com\/-\/sperrenundverletzungen\/verein\/\d+$/);
    }
    expect(injuryLink(model, '819').url).toBe('https://www.transfermarkt.com/-/sperrenundverletzungen/verein/614'); // Flamengo
  });
  it('a club without an id: Transfermarkt\'s search for its name', () => {
    const other = Object.keys(snap.teams).find((id) => !snap.clubs.some((c) => c.id === id))!;
    const l = injuryLink(model, other);
    expect(l.exact).toBe(false);
    expect(l.url).toBe(`https://www.transfermarkt.com/schnellsuche/ergebnis/schnellsuche?query=${encodeURIComponent(snap.teams[other]!.name).replace(/%20/g, '+')}`);
  });
  it('a match: home club, away club, then the betting site\'s football page', () => {
    const m = snap.matches.find((x) => x.h === '382' && x.a === '370')!; // Man City v Fulham
    const links = gameLinks(model, m);
    expect(links.map((l) => l.label)).toEqual(['Man City: injuries & suspensions', 'Fulham: injuries & suspensions', 'Match odds & player props (FanDuel soccer)']);
    expect(links[2]!.url).toBe(BETTING_FOOTBALL_URL);
  });
});
