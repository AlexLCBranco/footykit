// FK-67: CazéTV's full-match videos on the 2026 World Cup. The pairing (title + date → match) is pure
// (src/data/wcVideos.ts); the titles below are the playlist's real ones. The page shows ▶ only for a match in the
// videos file; the file itself (public/worldcup/2026-videos.json, npm run make-wc-videos) is checked for shape.
// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { GroupBox, Play } from '../src/components/WorldCupPage';
import { groupTables, isFifaPlus, loadEdition, peekEdition, wcVideoTip, wcVideoUrl, type WcEdition } from '../src/data/worldcup';
import { editionNames, isFullMatchOf, norm, pairVideos, preferFirst, titleTeams, type PairMatch } from '../src/data/wcVideos';

const file = (f: string) => JSON.parse(readFileSync(join(import.meta.dirname, '..', 'public', 'worldcup', f), 'utf8')) as unknown;
const ed2026 = file('2026.json') as WcEdition;
const videos = file('2026-videos.json') as Record<string, string>;
const ed2022 = file('2022.json') as WcEdition;
const videos22 = file('2022-videos.json') as Record<string, string>;
afterEach(cleanup);

describe("a title's two teams", () => {
  it('reads the playlist\'s titles: accents, upper case, the stage after "|"', () => {
    expect(norm('  França ™ ')).toBe('FRANCA');
    expect(titleTeams('JOGO COMPLETO: ESPANHA X ARGENTINA | FINAL DA COPA DO MUNDO FIFA™ 2026')).toEqual(['ESP', 'ARG']);
    expect(titleTeams('JOGO COMPLETO: ÁFRICA DO SUL X COREIA DO SUL | COPA DO MUNDO FIFA™ 2026 | 3ª RODADA | FASE DE GRUPOS')).toEqual(['ZAF', 'KOR']);
    expect(titleTeams('JOGO COMPLETO: RD CONGO X UZBEQUISTÃO | COPA DO MUNDO FIFA™ 2026 | 3ª RODADA | FASE DE GRUPOS')).toEqual(['COD', 'UZB']);
    // the playlist's own slip: two spaces after the colon
    expect(titleTeams('JOGO COMPLETO:  ALEMANHA X COSTA DO MARFIM | COPA DO MUNDO FIFA™ 2026 | 2ª RODADA')).toEqual(['DEU', 'CIV']);
  });
  it('takes "x", "vs", "vs." and "v", in any case, with or without accents', () => {
    for (const t of ['Suíça x Bósnia', 'SUICA VS BOSNIA', 'Suíça vs. Bósnia e Herzegovina', 'suíça v bósnia', 'Copa do Mundo | Jogo completo: Suíça X Bósnia'])
      expect(titleTeams(t), t).toEqual(['CHE', 'BIH']);
  });
  it('names nothing unless both sides are World Cup teams', () => {
    expect(titleTeams('JOGO COMPLETO: BRASIL X ITÁLIA | AMISTOSO')).toBeUndefined();
    expect(titleTeams('MELHORES MOMENTOS DA COPA DO MUNDO FIFA™ 2026')).toBeUndefined();
    expect(titleTeams('BRASIL X BRASIL')).toBeUndefined();
    // a team's name inside a longer name is not that team
    expect(titleTeams('NOVO MÉXICO X BRASIL')).toBeUndefined();
  });
  it('every 2026 team has a Portuguese name', () => {
    const pt = ['África do Sul', 'Alemanha', 'Arábia Saudita', 'Argélia', 'Argentina', 'Austrália', 'Áustria', 'Bélgica', 'Bósnia', 'Brasil', 'Cabo Verde', 'Canadá', 'Catar', 'Colômbia', 'Coreia do Sul', 'Costa do Marfim', 'Croácia', 'Curaçao', 'Egito', 'Equador', 'Escócia', 'Espanha', 'Estados Unidos', 'França', 'Gana', 'Haiti', 'Holanda', 'Inglaterra', 'Irã', 'Iraque', 'Japão', 'Jordânia', 'Marrocos', 'México', 'Noruega', 'Nova Zelândia', 'Panamá', 'Paraguai', 'Portugal', 'RD Congo', 'Senegal', 'Suécia', 'Suíça', 'Tchéquia', 'Tunísia', 'Turquia', 'Uruguai', 'Uzbequistão'];
    const named = new Set(pt.map((n) => titleTeams(`${n} x ${n === 'Brasil' ? 'Haiti' : 'Brasil'}`)?.[0]));
    expect(Object.keys(ed2026.teams).filter((c) => !named.has(c))).toEqual([]);
  });
});

describe('pairing videos to matches', () => {
  const ms: PairMatch[] = [
    { n: 1, h: 'MEX', a: 'ZAF', date: '2026-06-11' },
    { n: 2, h: 'KOR', a: 'CZE', date: '2026-06-11' },
    { n: 24, h: 'BRA', a: 'MAR', date: '2026-06-13' },
    // the same two teams again, in the final
    { n: 104, h: 'MAR', a: 'BRA', date: '2026-07-19' },
  ];
  it('pairs by the two teams in either order', () => {
    const p = pairVideos(ms.slice(0, 2), [{ id: 'aaa', title: 'JOGO COMPLETO: ÁFRICA DO SUL X MÉXICO' }, { id: 'bbb', title: 'JOGO COMPLETO: COREIA DO SUL X TCHÉQUIA | 1ª RODADA' }]);
    expect(p.videos).toEqual({ 1: 'aaa', 2: 'bbb' });
    expect(p.missing).toEqual([]);
  });
  it('teams that met twice: the date picks the match; without a date nothing is guessed', () => {
    const t = 'JOGO COMPLETO: BRASIL X MARROCOS';
    expect(pairVideos(ms, [{ id: 'grp', title: t, date: '2026-06-14' }, { id: 'fin', title: t, date: '2026-07-20' }]).videos).toEqual({ 24: 'grp', 104: 'fin' });
    const blind = pairVideos(ms, [{ id: 'x', title: t }]);
    expect(blind.videos).toEqual({});
    expect(blind.unpaired.map((v) => v.id)).toEqual(['x']);
  });
  it('a video older than the match is not its replay; the evening before (another time zone) is', () => {
    expect(pairVideos(ms, [{ id: 'old', title: 'MÉXICO X ÁFRICA DO SUL', date: '2026-03-01' }]).videos).toEqual({});
    expect(pairVideos(ms, [{ id: 'eve', title: 'MÉXICO X ÁFRICA DO SUL', date: '2026-06-10' }]).videos).toEqual({ 1: 'eve' });
  });
  it('a match with no video is listed as missing; an unknown title is left unpaired; a second video is not used', () => {
    const p = pairVideos(ms.slice(0, 2), [{ id: 'aaa', title: 'MÉXICO X ÁFRICA DO SUL' }, { id: 'dup', title: 'MÉXICO X ÁFRICA DO SUL' }, { id: 'zzz', title: 'BASTIDORES DA COPA' }]);
    expect(p.videos).toEqual({ 1: 'aaa' });
    expect(p.missing).toEqual([2]);
    expect(p.extra.map((v) => v.id)).toEqual(['dup']);
    expect(p.unpaired.map((v) => v.id)).toEqual(['zzz']);
  });
});

describe('the videos file (public/worldcup/2026-videos.json)', () => {
  it("holds only 2026 match numbers, each with a YouTube video's full address, no video twice, at least half the matches", () => {
    const ns = new Set(ed2026.matches.map((m) => String(m.n)));
    for (const [n, url] of Object.entries(videos)) {
      expect(ns.has(n), `match ${n}`).toBe(true);
      expect(url, `match ${n}`).toMatch(/^https:\/\/www\.youtube\.com\/watch\?v=[\w-]{11}$/);
    }
    expect(new Set(Object.values(videos)).size).toBe(Object.keys(videos).length);
    expect(Object.keys(videos).length * 2).toBeGreaterThanOrEqual(ed2026.matches.length);
  });
});

describe('the ▶ link on the page', () => {
  // the page reads the edition and its videos as fetched: here matches 1 and 2 have a video, no other match does
  const some = { 1: videos['1']!, 2: videos['2']! };
  // FK-68, 2022: the final on FIFA+, Brazil v Croatia only on FIFA's YouTube, no other match
  const some22 = { 64: 'https://www.fifa.com/en/watch/Ar2sZ_9GHkie8SDq2Mt4gg', 57: 'https://www.youtube.com/watch?v=HxBqMbI5kqQ' };
  const asked: string[] = [];
  beforeAll(async () => {
    vi.stubGlobal('fetch', (url: string) => {
      asked.push(url);
      return Promise.resolve({ ok: true, json: () => Promise.resolve(url.endsWith('2026-videos.json') ? some : url.endsWith('2022-videos.json') ? some22 : file(/\d{4}\.json$/.exec(url)![0])) });
    });
    await loadEdition(2026);
    await loadEdition(2022);
    await loadEdition(2018);
  });
  it('a match with a video gets ▶: the YouTube watch link, in a new tab, "Full match on CazéTV (YouTube)"', () => {
    const ed = peekEdition(2026)!;
    render(<Play ed={ed} m={ed.matches.find((m) => m.n === 1)!} />);
    const a = screen.getByTestId('wc-video');
    expect(a.getAttribute('href')).toBe(wcVideoUrl(some[1]));
    expect(a.getAttribute('href')).toMatch(/^https:\/\/www\.youtube\.com\/watch\?v=[\w-]{11}$/);
    expect(a.getAttribute('target')).toBe('_blank');
    expect(a.getAttribute('title')).toBe('Full match on CazéTV (YouTube)');
    expect(wcVideoTip(2026, some[1])).toBe('Full match on CazéTV (YouTube)');
    expect(a.textContent).toBe('▶');
  });
  it('a match with no video renders no ▶', () => {
    const ed = peekEdition(2026)!;
    const { container } = render(<Play ed={ed} m={ed.matches.find((m) => m.n === 3)!} />);
    expect(container.innerHTML).toBe('');
  });
  it("a group's squares: ▶ only on the matches with a video, and the Google link stays on every square", () => {
    const ed = peekEdition(2026)!;
    const t = groupTables(ed).find((g) => g.group.name === 'Group A')!;
    render(<GroupBox ed={ed} t={t} adv={new Set()} onTeam={() => undefined} />);
    const squares = screen.getAllByTestId('wc-square');
    expect(squares).toHaveLength(12);
    for (const s of squares) expect(s.getAttribute('href')).toMatch(/^https:\/\/www\.google\.com\/search\?q=/);
    // matches 1 and 2 are group A's first two; each shows on both of its teams' rows
    expect(screen.getAllByTestId('wc-video').map((a) => a.getAttribute('data-n')).sort()).toEqual(['1', '1', '2', '2']);
  });
  it('FK-68: a 2022 match with a FIFA+ page uses it, titled "Full match on FIFA+"', () => {
    const ed = peekEdition(2022)!;
    render(<Play ed={ed} m={ed.matches.find((m) => m.n === 64)!} />);
    const a = screen.getByTestId('wc-video');
    expect(a.getAttribute('href')).toBe('https://www.fifa.com/en/watch/Ar2sZ_9GHkie8SDq2Mt4gg');
    expect(a.getAttribute('title')).toBe('Full match on FIFA+');
    expect(a.getAttribute('aria-label')).toBe('Argentina v France: Full match on FIFA+');
    expect(a.getAttribute('target')).toBe('_blank');
    expect(a.textContent).toBe('▶');
  });
  it('FK-68: a 2022 match with only a YouTube address uses that, titled "Full match on FIFA\'s YouTube"', () => {
    const ed = peekEdition(2022)!;
    render(<Play ed={ed} m={ed.matches.find((m) => m.n === 57)!} />);
    const a = screen.getByTestId('wc-video');
    expect(a.getAttribute('href')).toBe('https://www.youtube.com/watch?v=HxBqMbI5kqQ');
    expect(a.getAttribute('title')).toBe("Full match on FIFA's YouTube");
  });
  it('FK-68: a 2022 match with neither renders no ▶', () => {
    const ed = peekEdition(2022)!;
    const { container } = render(<Play ed={ed} m={ed.matches.find((m) => m.n === 60)!} />);
    expect(container.innerHTML).toBe('');
  });
  it('an edition with no videos file (2018) has no ▶ and asks for none', () => {
    const ed = peekEdition(2018)!;
    render(<GroupBox ed={ed} t={groupTables(ed)[0]!} adv={new Set()} onTeam={() => undefined} />);
    expect(screen.getAllByTestId('wc-square').length).toBeGreaterThan(0);
    expect(screen.queryAllByTestId('wc-video')).toEqual([]);
    expect(asked.filter((u) => u.includes('videos'))).toEqual([expect.stringMatching(/2026-videos\.json$/), expect.stringMatching(/2022-videos\.json$/)]);
  });
});

// FK-68: FIFA's own full-match replays of the 2022 World Cup (FIFA+ pages from FIFA's video sitemap, FIFA's YouTube
// uploads). The titles below are the real ones.
describe("FK-68: FIFA's titles", () => {
  const names = editionNames(ed2022.teams);
  it('a full match of the 2022 World Cup, in FIFA+ and YouTube wording; other tournaments and clips are not', () => {
    for (const t of ['Argentina v France | Final | FIFA World Cup Qatar 2022™ | Full Match Replay', 'FULL MATCH: Brazil v Korea Republic | 2022 FIFA World Cup', 'FULL MATCH: Brazil v Croatia | Quarter-Finals | FIFA WORLD CUP QATAR 2022', 'FULL MATCH: Argentina v France | 2022 FIFA World Cup Final'])
      expect(isFullMatchOf(t, 2022, 'Qatar'), t).toBe(true);
    for (const t of [
      "Colombia v Spain | Final | FIFA U-17 Women's World Cup India 2022™ | Full Match Replay", "Spain v Japan | Final | FIFA U-20 Women's World Cup Costa Rica 2022™ | Full Match Replay",
      'Real Madrid CF v Al Hilal SFC | Final | FIFA Club World Cup Morocco 2022™ | Full Match Replay', 'Senegal v Egypt | FIFA World Cup Qatar 2022 Qualifier | Full Match',
      'France v Croatia | Final | 2018 FIFA World Cup Russia™ | Full Match Replay', 'All Goals | FIFA World Cup Qatar 2022™', 'Argentina v France | Final | FIFA World Cup Qatar 2022™ | Highlights',
    ]) expect(isFullMatchOf(t, 2022, 'Qatar'), t).toBe(false);
  });
  it("reads the two teams with FIFA's spellings (Korea Republic, IR Iran, USA)", () => {
    expect(titleTeams('Argentina v France | Final | FIFA World Cup Qatar 2022™ | Full Match Replay', names)).toEqual(['ARG', 'FRA']);
    expect(titleTeams('FULL MATCH: Korea Republic v Portugal | Group Stage | FIFA WORLD CUP QATAR 2022', names)).toEqual(['KOR', 'PRT']);
    expect(titleTeams('IR Iran v USA | Group B | FIFA World Cup Qatar 2022™ | Full Match Replay', names)).toEqual(['IRN', 'USA']);
    expect(titleTeams('Poland v Argentina | Group C | FIFA World Cup Qatar 2022™ | Full Match Replay', names)).toEqual(['POL', 'ARG']);
    // a team that was not at this World Cup names no match
    expect(titleTeams('Italy v Argentina | Finalissima 2022 | Full Match Replay', names)).toBeUndefined();
    expect(names['TURKIYE']).toBeUndefined();
  });
  it('pairs each replay to its match; teams that met twice (Croatia v Morocco) are never guessed', () => {
    const fifa = pairVideos(ed2022.matches, [
      { id: 'https://www.fifa.com/en/watch/Ar2sZ_9GHkie8SDq2Mt4gg', title: 'Argentina v France | Final | FIFA World Cup Qatar 2022™ | Full Match Replay' },
      { id: 'https://www.fifa.com/en/watch/AIndwGv4SkWkLkIM8hTULg', title: 'Netherlands v Argentina | Quarter-finals | FIFA World Cup Qatar 2022™ | Full Match Replay' },
      { id: 'https://www.fifa.com/en/watch/x', title: 'Croatia v Morocco | Play-off for third place | FIFA World Cup Qatar 2022™ | Full Match Replay' },
    ], names);
    expect(fifa.videos).toEqual({ 64: 'https://www.fifa.com/en/watch/Ar2sZ_9GHkie8SDq2Mt4gg', 58: 'https://www.fifa.com/en/watch/AIndwGv4SkWkLkIM8hTULg' });
    expect(fifa.unpaired.map((v) => v.id)).toEqual(['https://www.fifa.com/en/watch/x']);
  });
  it('FIFA+ wins over YouTube for the same match; YouTube fills only the matches FIFA+ lacks', () => {
    expect(preferFirst({ 64: 'plus-final' }, { 64: 'yt-final', 57: 'yt-qf' })).toEqual({ 64: 'plus-final', 57: 'yt-qf' });
  });
  it("a video's address and its hover: FIFA+, FIFA's YouTube (2022), CazéTV (2026); an old bare YouTube id still opens", () => {
    expect(isFifaPlus('https://www.fifa.com/en/watch/Ar2sZ_9GHkie8SDq2Mt4gg')).toBe(true);
    expect(wcVideoTip(2022, 'https://www.fifa.com/en/watch/Ar2sZ_9GHkie8SDq2Mt4gg')).toBe('Full match on FIFA+');
    expect(wcVideoTip(2022, 'https://www.youtube.com/watch?v=RgqKdplLIk4')).toBe("Full match on FIFA's YouTube");
    expect(wcVideoTip(2026, 'https://www.youtube.com/watch?v=YCNysrewn7k')).toBe('Full match on CazéTV (YouTube)');
    expect(wcVideoUrl('https://www.fifa.com/en/watch/Ar2sZ_9GHkie8SDq2Mt4gg')).toBe('https://www.fifa.com/en/watch/Ar2sZ_9GHkie8SDq2Mt4gg');
    expect(wcVideoUrl('YCNysrewn7k')).toBe('https://www.youtube.com/watch?v=YCNysrewn7k');
  });
});

describe('FK-68: the videos file (public/worldcup/2022-videos.json)', () => {
  it("holds only 2022 match numbers, each with a FIFA+ replay page or a YouTube video's address, none twice", () => {
    const ns = new Set(ed2022.matches.map((m) => String(m.n)));
    for (const [n, url] of Object.entries(videos22)) {
      expect(ns.has(n), `match ${n}`).toBe(true);
      expect(url, `match ${n}`).toMatch(/^https:\/\/www\.(fifa\.com\/en\/watch\/[\w-]+|youtube\.com\/watch\?v=[\w-]{11})$/);
    }
    expect(new Set(Object.values(videos22)).size).toBe(Object.keys(videos22).length);
  });
  it('the final is the FIFA+ page the owner saw; FIFA+ is used wherever it has the match', () => {
    expect(videos22['64']).toBe('https://www.fifa.com/en/watch/Ar2sZ_9GHkie8SDq2Mt4gg');
    expect(Object.values(videos22).filter(isFifaPlus).length).toBeGreaterThanOrEqual(7);
  });
});
