// Match links (backlog item 10): a Google search for "Home vs Away Mon D YYYY", full names, properly encoded.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildModel } from '../src/data/model';
import { matchUrl, type Match, type Snapshot } from '../src/data/snapshot';

const snap = JSON.parse(readFileSync(join(import.meta.dirname, 'fixtures/snapshot.json'), 'utf8')) as Snapshot;
const model = buildModel(snap, 'America/Sao_Paulo');

describe('matchUrl', () => {
  it('searches Google for home vs away and the date, full team names', () => {
    const m: Match = { id: '1', t: '2026-11-24T20:00:00Z', c: 'uefa.champions', st: 'pre', h: '359', a: '124' };
    const url = matchUrl(m, model);
    expect(url.startsWith('https://www.google.com/search?q=')).toBe(true);
    expect(decodeURIComponent(url.split('q=')[1]!)).toBe('Arsenal vs Borussia Dortmund Nov 24 2026');
    expect(url).not.toContain('espn');
    expect(url).not.toMatch(/ /);
  });
  it('encodes names with accents, ampersands and slashes; the date is the local day', () => {
    const at = { team: (id: string) => ({ id, abbr: id, short: id, name: id === 'h' ? 'Brighton & Hove Albion' : 'Bodø/Glimt' }), dayOf: () => '2027-01-05' };
    const url = matchUrl({ id: '2', t: '2027-01-06T01:00:00Z', c: 'x', st: 'pre', h: 'h', a: 'a' }, at);
    expect(url).toBe(`https://www.google.com/search?q=${encodeURIComponent('Brighton & Hove Albion vs Bodø/Glimt Jan 5 2027')}`);
    expect(new URL(url).searchParams.get('q')).toBe('Brighton & Hove Albion vs Bodø/Glimt Jan 5 2027');
  });
});
