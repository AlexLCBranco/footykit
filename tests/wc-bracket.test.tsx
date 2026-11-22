// FK-69: the World Cup bracket's match cards (roof tag, weather only under the sky, Watch only with a link, a neutral
// tile for a team with no flag, the lines' wiring and the champion's path) and its data (2026's stadiums, flags).
// FK-70: the poster's tiles.
// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { WC_STADIUMS } from '../config/wcStadiums';
import { CardBracket, Flag, MatchCard, Poster } from '../src/components/WcBracket';
import { WC_YEARS } from '../src/components/page';
import { feeds, onChampionPath, posterColumns, posterFeeds } from '../src/data/wcBracket';
import { flagOf, WC_FLAGS, WC_NO_FLAG, WC_NO_FLAG_NAMES } from '../src/data/wcFlags';
import { archiveRequest, cardWeather, playedWeather, roofTag, underSky, weatherText, type WcStadium, type WcVenues } from '../src/data/wcVenues';
import { bracket, loadEdition, peekEdition, thirdPlace, twoSided, wcVideoUrl, type KoTie, type WcEdition } from '../src/data/worldcup';

const DIR = join(import.meta.dirname, '..', 'public', 'worldcup');
const file = (f: string) => JSON.parse(readFileSync(join(DIR, f), 'utf8')) as unknown;
const ed2026 = file('2026.json') as WcEdition;
const venues = file('2026-venues.json') as WcVenues;
afterEach(cleanup);

const st = (roof: WcStadium['roof']): WcStadium => ({ name: 'S', lat: 0, lon: 0, roof, src: 'x', roofSrc: 'y' });

describe('the roof tag', () => {
  it('names each roof type; a retractable roof says open or closed only when the match has it', () => {
    expect(roofTag('open')).toBe('Open air');
    expect(roofTag('fixed')).toBe('Roofed');
    expect(roofTag('retractable', false)).toBe('Roof closed');
    expect(roofTag('retractable', true)).toBe('Roof open');
    // a missing state is never guessed
    expect(roofTag('retractable')).toBe('Retractable roof');
    expect(roofTag(undefined)).toBeUndefined();
  });
});

describe('the weather on a card', () => {
  const w = { t: 26.8, mm: 0 };
  it('none under a fixed roof or a closed retractable roof', () => {
    expect(underSky('fixed')).toBe(false);
    expect(underSky('retractable', false)).toBe(false);
    expect(cardWeather(st('fixed'), { w })).toBeUndefined();
    expect(cardWeather(st('retractable'), { roofOpen: false, w })).toBeUndefined();
  });
  it('shown in the open air, under an open roof, and under a retractable roof whose state is unknown', () => {
    expect(cardWeather(st('open'), { w })).toEqual(w);
    expect(cardWeather(st('retractable'), { roofOpen: true, w })).toEqual(w);
    expect(cardWeather(st('retractable'), { w })).toEqual(w);
  });
  it('none without roof data, or without weather data', () => {
    expect(cardWeather(undefined, { w })).toBeUndefined();
    expect(cardWeather(st('open'), undefined)).toBeUndefined();
    expect(cardWeather(st('open'), {})).toBeUndefined();
  });
  it('a played match: the temperature and the rain in mm, or "no rain"', () => {
    expect(weatherText({ t: 26.8, mm: 0 })).toBe('27 °C · no rain');
    expect(weatherText({ t: 17.2, mm: 1.44 })).toBe('17 °C · 1.4 mm rain');
    expect(weatherText({ t: -3.4, mm: 0.3 })).toBe('−3 °C · 0.3 mm rain');
  });
  it('a match to come: the forecast, temperature and chance of rain', () => {
    expect(weatherText({ t: 21.4, pct: 40 })).toBe('21 °C · 40% rain');
    expect(cardWeather(st('open'), undefined, { t: 21.4, pct: 40 })).toEqual({ t: 21.4, pct: 40 });
    expect(cardWeather(st('fixed'), undefined, { t: 21.4, pct: 40 })).toBeUndefined();
  });
  it("the archive's hours → the kick-off's temperature and the rain of the two hours from it", () => {
    const answer = { hourly: { time: ['2026-07-19T14:00', '2026-07-19T15:00', '2026-07-19T16:00', '2026-07-19T17:00', '2026-07-19T18:00'], temperature_2m: [25, 26.84, 27, 27, 26], precipitation: [9, 9, 0.4, 1.1, 9] } };
    expect(playedWeather(answer, '2026-07-19', '15:00')).toEqual({ t: 26.8, mm: 1.5 });
    expect(playedWeather(answer, '2026-07-19', '15:30')).toEqual({ t: 26.8, mm: 1.5 });
    expect(playedWeather(answer, '2026-07-20', '15:00')).toBeUndefined();
    expect(playedWeather({}, '2026-07-19', '15:00')).toBeUndefined();
    expect(archiveRequest({ lat: 40.8136, lon: -74.0744 }, '2026-06-13', '2026-07-20')).toBe('https://archive-api.open-meteo.com/v1/archive?latitude=40.8136&longitude=-74.0744&start_date=2026-06-13&end_date=2026-07-20&hourly=temperature_2m%2Cprecipitation&timezone=auto');
  });
});

describe('flags', () => {
  it('a team gets its flag file; the home nations their own', () => {
    expect(flagOf('BRA', 'Brazil')).toBe('br');
    expect(flagOf('ENG', 'England')).toBe('gb-eng');
    expect(flagOf('SCO', 'Scotland')).toBe('gb-sct');
    expect(flagOf('WAL', 'Wales')).toBe('gb-wls');
    expect(flagOf('DEU', 'West Germany')).toBe('de');
  });
  it('a country that no longer exists, or a name with another flag, gets none', () => {
    for (const c of ['SUN', 'YUG', 'CSK', 'DDR', 'SCG', 'IDN']) expect(flagOf(c), c).toBeUndefined();
    expect(flagOf('COD', 'Zaire')).toBeUndefined();
    expect(flagOf('COD', 'DR Congo')).toBe('cd');
  });
  it('the neutral tile shows the code, never a flag', () => {
    render(<Flag ed={{ teams: { SUN: 'Soviet Union' } }} code="SUN" />);
    expect(screen.getByTestId('wc-noflag').textContent).toBe('SUN');
    expect(screen.queryByTestId('wc-flag')).toBeNull();
    cleanup();
    render(<Flag ed={{ teams: { BRA: 'Brazil' } }} code="BRA" />);
    expect(screen.getByTestId('wc-flag').getAttribute('src')).toMatch(/worldcup\/flags\/br\.svg$/);
    expect(screen.queryByTestId('wc-noflag')).toBeNull();
  });
  it('data: every team of every edition has a flag file that exists, or is listed as having none', () => {
    for (const y of WC_YEARS) {
      const ed = file(`${y}.json`) as WcEdition;
      for (const [code, name] of Object.entries(ed.teams)) {
        const f = flagOf(code, name);
        if (f) expect(existsSync(join(DIR, 'flags', `${f}.svg`)), `${y} ${name}: flags/${f}.svg`).toBe(true);
        else expect(WC_NO_FLAG.includes(code) || WC_NO_FLAG_NAMES.includes(name), `${y} ${code} ${name} has no flag and is not listed`).toBe(true);
      }
    }
    for (const c of WC_NO_FLAG) expect(WC_FLAGS[c], c).toBeUndefined();
    expect(existsSync(join(DIR, 'flags', 'LICENSE-flag-icons.txt'))).toBe(true);
  });
});

describe('data: 2026 stadiums', () => {
  it('every knockout match has a stadium with coordinates and a roof type, each with its source', () => {
    const ko = ed2026.matches.filter((m) => m.stage !== 'Group stage');
    expect(ko).toHaveLength(32);
    for (const m of ed2026.matches) {
      const s = venues.stadiums[m.city!];
      expect(s, `match ${m.n} (${m.city})`).toBeDefined();
      expect(s!.name.length).toBeGreaterThan(3);
      expect(Math.abs(s!.lat)).toBeGreaterThan(15); expect(Math.abs(s!.lat)).toBeLessThan(55);
      expect(s!.lon).toBeLessThan(-70); expect(s!.lon).toBeGreaterThan(-130);
      expect(['open', 'fixed', 'retractable']).toContain(s!.roof);
      expect(s!.src).toMatch(/^https:\/\/www\.wikidata\.org\/wiki\/Q\d+$/);
      expect(s!.roofSrc).toMatch(/^https:\/\/en\.wikipedia\.org\/wiki\//);
    }
  });
  it('the file is the config, stadium for stadium; every match has its weather', () => {
    expect(Object.keys(venues.stadiums).sort()).toEqual(WC_STADIUMS[2026]!.map((s) => s.city).sort());
    for (const s of WC_STADIUMS[2026]!) expect(venues.stadiums[s.city]).toMatchObject({ name: s.name, roof: s.roof, roofSrc: s.source, src: `https://www.wikidata.org/wiki/${s.wikidata}` });
    for (const m of ed2026.matches) {
      const w = venues.matches[m.n]?.w;
      expect(w, `match ${m.n}`).toBeDefined();
      expect(w!.t).toBeGreaterThan(-5); expect(w!.t).toBeLessThan(50);
      expect(w!.mm).toBeGreaterThanOrEqual(0);
    }
    expect(venues.weatherSource).toContain('Open-Meteo');
  });
});

describe('the lines', () => {
  const cols = twoSided(bracket(ed2026));
  it('a tie feeds the card of the next column toward the final, two to one; the final feeds nothing', () => {
    expect(cols.map((c) => c.side)).toEqual(['left', 'left', 'left', 'left', 'final', 'right', 'right', 'right', 'right']);
    expect(feeds(cols, { col: 0, row: 0 })).toEqual({ col: 1, row: 0 });
    expect(feeds(cols, { col: 0, row: 1 })).toEqual({ col: 1, row: 0 });
    expect(feeds(cols, { col: 0, row: 7 })).toEqual({ col: 1, row: 3 });
    expect(feeds(cols, { col: 3, row: 0 })).toEqual({ col: 4, row: 0 });
    expect(feeds(cols, { col: 8, row: 5 })).toEqual({ col: 7, row: 2 });
    expect(feeds(cols, { col: 5, row: 0 })).toEqual({ col: 4, row: 0 });
    expect(feeds(cols, { col: 4, row: 0 })).toBeUndefined();
  });
  it("the tie really feeds that card: its winner plays there", () => {
    cols.forEach((c, ci) => c.ties.forEach((t, ri) => {
      const to = feeds(cols, { col: ci, row: ri });
      if (!t || !to) return;
      const next = cols[to.col]!.ties[to.row]!;
      expect([next.a, next.b], `${c.stage} ${t.a}-${t.b}`).toContain(t.winner);
    }));
  });
  it("the champion's path: the ties the champion won", () => {
    const won = cols.flatMap((c) => c.ties).filter((t) => onChampionPath(t, ed2026.champion));
    expect(won.map((t) => t!.stage).sort()).toEqual(['Final', 'Quarter-finals', 'Round of 16', 'Round of 32', 'Semi-finals']);
    expect(onChampionPath(null, 'ESP')).toBe(false);
    expect(onChampionPath({ stage: 'Final', a: 'ESP', b: 'ARG', matches: [] }, 'ESP')).toBe(false);
  });
});

describe('the match card', () => {
  const some = { 104: 'https://www.youtube.com/watch?v=AAAAAAAAAAA' };
  beforeAll(async () => {
    vi.stubGlobal('fetch', (url: string) => Promise.resolve({ ok: true, json: () => Promise.resolve(url.endsWith('2026-videos.json') ? some : file(/\d{4}(-venues)?\.json$/.exec(url)![0])) }));
    await loadEdition(2026);
    await loadEdition(1974);
  });
  const tieOf = (ed: WcEdition, stage: string, i = 0) => twoSided(bracket(ed)).flatMap((c) => c.ties).filter((t): t is KoTie => !!t && t.stage === stage)[i]!;

  it('the final: both teams with a flag and the full name, the score once, the loser dimmed, date, time, stadium, roof, weather, trophy', () => {
    const ed = peekEdition(2026)!;
    render(<MatchCard ed={ed} t={tieOf(ed, 'Final')} onTeam={() => undefined} big />);
    const card = screen.getByTestId('wc-tie');
    const sides = within(card).getAllByTestId('wc-side');
    expect(sides.map((s) => within(s).getByTestId('wc-team').textContent)).toEqual(['Spain', 'Argentina']);
    expect(sides.map((s) => within(s).getByTestId('wc-flag').getAttribute('data-flag'))).toEqual(['es', 'ar']);
    expect(sides.map((s) => within(s).getByTestId('wc-score').textContent)).toEqual(['1', '0']);
    expect(sides.map((s) => s.getAttribute('data-out'))).toEqual([null, 'true']);
    // the score is written once: no second "1–0" anywhere on the card
    expect(card.textContent).not.toMatch(/\d\s*[–-]\s*\d/);
    expect(within(card).getByTestId('wc-aet').textContent).toBe('a.e.t.');
    expect(within(card).getAllByTestId('wc-match')[0]!.textContent).toBe('19 Jul 2026 · 15:00');
    expect(within(card).getByTestId('wc-stadium').textContent).toContain('MetLife Stadium');
    expect(within(card).getByTestId('wc-roof').textContent).toBe('Open air');
    expect(within(card).getByTestId('wc-weather').textContent).toBe(weatherText(venues.matches[104]!.w!));
    expect(within(card).getByTestId('wc-trophy').textContent).toContain('Spain');
    expect(within(card).getAllByTestId('wc-score')[0]!.getAttribute('href')).toMatch(/^https:\/\/www\.google\.com\/search\?q=/);
  });
  it('a Watch button only where the match has a video link', () => {
    const ed = peekEdition(2026)!;
    render(<MatchCard ed={ed} t={tieOf(ed, 'Final')} onTeam={() => undefined} />);
    const watch = screen.getByTestId('wc-video');
    expect(watch.textContent).toBe('▶ Watch');
    expect(watch.getAttribute('href')).toBe(some[104]);
    expect(wcVideoUrl(some[104])).toBe(some[104]);
    cleanup();
    render(<MatchCard ed={ed} t={tieOf(ed, 'Semi-finals')} onTeam={() => undefined} />);
    expect(screen.queryByTestId('wc-video')).toBeNull();
  });
  it('under a fixed roof: "Roofed" and no weather; a retractable roof with no state: "Retractable roof" and the weather', () => {
    const ed = peekEdition(2026)!;
    const all = twoSided(bracket(ed)).flatMap((c) => c.ties).filter((t): t is KoTie => !!t);
    const at = (city: string) => all.find((t) => t.matches[0]!.city === city)!;
    render(<MatchCard ed={ed} t={at('Los Angeles (Inglewood)')} onTeam={() => undefined} />);
    expect(screen.getByTestId('wc-stadium').textContent).toContain('SoFi Stadium');
    expect(screen.getByTestId('wc-roof').textContent).toBe('Roofed');
    expect(screen.queryByTestId('wc-weather')).toBeNull();
    cleanup();
    render(<MatchCard ed={ed} t={at('Houston')} onTeam={() => undefined} />);
    expect(screen.getByTestId('wc-roof').textContent).toBe('Retractable roof');
    expect(screen.getByTestId('wc-weather')).toBeTruthy();
  });
  it('an edition without venue data leaves the roof and the weather off, and keeps the stadium the data has', () => {
    const ed = peekEdition(1974)!;
    render(<MatchCard ed={ed} t={tieOf(ed, 'Final')} onTeam={() => undefined} />);
    expect(screen.getByTestId('wc-stadium').textContent).toBe('Olympiastadion');
    expect(screen.queryByTestId('wc-roof')).toBeNull();
    expect(screen.queryByTestId('wc-weather')).toBeNull();
    expect(screen.queryByTestId('wc-video')).toBeNull();
  });
  it('the whole bracket: a card per tie, the third place under the final, each card wired to the one it feeds', () => {
    const ed = peekEdition(2026)!;
    render(<CardBracket ed={ed} cols={twoSided(bracket(ed))} third={thirdPlace(ed)} onTeam={() => undefined} />);
    expect(screen.getAllByTestId('wc-tie')).toHaveLength(32);
    expect(within(screen.getByTestId('wc-third-place')).getAllByTestId('wc-tie')).toHaveLength(1);
    const wired = screen.getAllByTestId('wc-tie').filter((c) => c.getAttribute('data-feeds'));
    expect(wired).toHaveLength(30);
    for (const c of wired) expect(document.querySelector(`[data-slot="${c.getAttribute('data-feeds')}"]`), c.getAttribute('data-feeds')!).not.toBeNull();
    // the champion's path: the four ties Spain won before the final
    expect(wired.filter((c) => c.getAttribute('data-champ') === '1')).toHaveLength(4);
    expect(screen.getAllByTestId('wc-flag')).toHaveLength(64);
  });
});

describe('FK-70: the poster', () => {
  const cols = twoSided(bracket(ed2026));
  const pcs = posterColumns(cols);
  it('a tile per slot: 16 teams on each outer edge, halving to one finalist each side of the champion', () => {
    expect(pcs.map((c) => c.tiles.length)).toEqual([16, 8, 4, 2, 1, 1, 1, 2, 4, 8, 16]);
    expect(pcs[5]).toMatchObject({ champion: true, tiles: [{ team: 'ESP', out: false }] });
    expect(pcs[4]!.tiles).toEqual([{ team: 'ESP', out: false }]);
    expect(pcs[6]!.tiles).toEqual([{ team: 'ARG', out: true }]);
  });
  it('a team is dimmed in the round it went out, and not before', () => {
    for (const c of pcs.filter((x) => !x.champion && x.stage !== 'Final')) expect(c.tiles.filter((t) => t.out)).toHaveLength(c.tiles.length / 2);
    const arg = pcs.flatMap((c) => c.tiles).filter((t) => t.team === 'ARG');
    // Argentina came through the right side: its finalist tile (dimmed) is the first of its tiles, left to right
    expect(arg.map((t) => t.out)).toEqual([true, false, false, false, false]);
  });
  it('a tile feeds the tile of the team that went through, toward the middle', () => {
    pcs.forEach((c, ci) => c.tiles.forEach((t, ri) => {
      const to = posterFeeds(pcs, { col: ci, row: ri });
      if (c.champion) { expect(to).toBeUndefined(); return; }
      const next = pcs[to!.col]!.tiles[to!.row]!;
      if (!t.out) expect(next.team, `${c.stage} ${t.team}`).toBe(t.team);
    }));
  });
  it('a slot not decided yet is a placeholder tile', () => {
    const undecided = posterColumns([
      { stage: 'Semi-finals', side: 'left', ties: [{ stage: 'Semi-finals', a: 'ESP', b: 'FRA', matches: [] }] },
      { stage: 'Final', side: 'final', ties: [] },
      { stage: 'Semi-finals', side: 'right', ties: [null] },
    ]);
    expect(undecided.map((c) => c.tiles)).toEqual([
      [{ team: 'ESP', out: false }, { team: 'FRA', out: false }], [{ team: undefined, out: false }], [{ team: undefined, out: false }], [{ team: undefined, out: false }], [{ out: false }, { out: false }],
    ]);
    render(<Poster ed={{ ...ed2026, champion: '' }} cols={[{ stage: 'Final', side: 'final', ties: [] }]} />);
    expect(screen.getAllByTestId('wc-poster-tile').map((t) => t.textContent)).toEqual(['?', '?', '?']);
  });
  it('drawn: the title, flags and names only (no scores, dates or weather)', () => {
    render(<Poster ed={ed2026} cols={cols} />);
    expect(screen.getByTestId('wc-poster-title').textContent).toBe('World Cup 2026');
    const tiles = screen.getAllByTestId('wc-poster-tile');
    expect(tiles).toHaveLength(63);
    expect(tiles.filter((t) => t.getAttribute('data-outer'))).toHaveLength(32);
    for (const t of tiles) { expect(t.textContent).toBe(ed2026.teams[t.getAttribute('data-team')!]); expect(within(t).getByTestId('wc-flag')).toBeTruthy(); }
    expect(screen.getByTestId('wc-poster').textContent).not.toMatch(/\d{1,2} (Jun|Jul)|°C|Watch|Stadium/);
    expect(screen.queryByTestId('wc-score')).toBeNull();
  });
});
