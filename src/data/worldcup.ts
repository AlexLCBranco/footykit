// FK-59 / FK-60: the World Cup's editions (public/worldcup/<year>.json, built by scripts/make-worldcup.ts from free
// sources): group tables from the results, the knockout bracket from its ties, each team's World Cup history, and the
// group rules the simulator applies. History shows the official final order (the Fjelstul database's standings, which
// include lots, play-offs and fair play the results alone can't settle); 2026 and the simulator rank with the
// edition's rules (config: WC_RULES, each with its source).

import type { WcVenues } from './wcVenues.ts';

export type Pair = [number, number];
export type Goal = [side: 0 | 1, name: string, minute: string, kind?: 'og' | 'pen'];
export interface WcMatch {
  n: number; stage: string; group?: string; date: string; time?: string; venue?: string; city?: string;
  h: string; a: string;
  /** the score after 90 minutes */
  s: Pair;
  /** after extra time */
  et?: Pair;
  /** the shootout */
  p?: Pair;
  replay?: boolean; playoff?: boolean; goals?: Goal[];
}
export interface WcGroup { name: string; stage: string; order: string[]; adv: string[] }
export interface WcEdition {
  year: number; host: string; champion: string; win: 2 | 3;
  teams: Record<string, string>; matches: WcMatch[]; groups: WcGroup[];
  scorers: 'full' | 'partial' | 'none'; venues: 'stadium' | 'city';
  thirdsTable?: { groups: string; vs: Record<string, string> }[];
  fifa?: Record<string, string>;
  source: string[];
}
export interface WcIndexEntry { year: number; host: string; champion: string; championName: string; teams: number; reached: Record<string, [name: string, reached: string]> }


/** A match's result as entered or played: 90' score, extra time, shootout. */
export interface Result { s: Pair; et?: Pair; p?: Pair }

export const finalScore = (r: Result): Pair => r.et ?? r.s;
/** The side that went through (0 home, 1 away), or undefined for a draw with no shootout. */
export function winSide(r: Result): 0 | 1 | undefined {
  const f = finalScore(r);
  if (f[0] !== f[1]) return f[0] > f[1] ? 0 : 1;
  if (r.p && r.p[0] !== r.p[1]) return r.p[0] > r.p[1] ? 0 : 1;
  return undefined;
}

export interface Row { team: string; p: number; w: number; d: number; l: number; gf: number; ga: number; gd: number; pts: number; rank: number; level?: boolean }

/** The group's matches counted in its table (a 1954 / 1958 play-off is not). */
export const groupMatches = (ed: Pick<WcEdition, 'matches'>, g: Pick<WcGroup, 'name' | 'stage'>) =>
  ed.matches.filter((m) => m.group === g.name && m.stage === g.stage && !m.playoff);

/** Each team's record over `matches` (only the ones `res` gives a result for). */
export function records(teams: string[], matches: WcMatch[], win: number, res: (m: WcMatch) => Result | undefined = (m) => m): Map<string, Row> {
  const rows = new Map<string, Row>(teams.map((t) => [t, { team: t, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0, rank: 0 }]));
  for (const m of matches) {
    const r = res(m);
    if (!r) continue;
    const [hs, as] = finalScore(r);
    const h = rows.get(m.h), a = rows.get(m.a);
    if (!h || !a) continue;
    for (const [x, f, g] of [[h, hs, as], [a, as, hs]] as const) {
      x.p++; x.gf += f; x.ga += g; x.gd = x.gf - x.ga;
      if (f > g) { x.w++; x.pts += win; } else if (f === g) { x.d++; x.pts += 1; } else x.l++;
    }
  }
  return rows;
}

/**
 * The group rules the simulator and 2026 rank with. `overall`: points, then goal difference and goals in all group
 * matches, then the matches between the teams level (1998–2022). `h2h`: points, then the matches between the teams
 * level, re-applied to the ones still level, then goal difference and goals in all matches (2026). What's left (fair
 * play, lots, rankings) isn't in the data: those teams share a place, ordered as the fallback says.
 */
export type GroupRule = 'overall' | 'h2h';
export const WC_RULES: Record<string, { rule: GroupRule; source: string; text: string[] }> = {
  '1998-2022': {
    rule: 'overall',
    source: 'https://en.wikipedia.org/wiki/2022_FIFA_World_Cup#Tiebreakers',
    text: ['Points (3 a win, 1 a draw)', 'Goal difference in all group matches', 'Goals scored in all group matches', 'Points in the matches between the teams level', 'Goal difference in those matches', 'Goals scored in those matches', 'Fair play, then drawing of lots (not in the data: a shared place)'],
  },
  '2026': {
    rule: 'h2h',
    source: 'https://en.wikipedia.org/wiki/2026_FIFA_World_Cup#Tiebreakers',
    text: ['Points (3 a win, 1 a draw)', 'Points in the matches between the teams level', 'Goal difference in those matches', 'Goals scored in those matches (a–c again for teams still level)', 'Goal difference in all group matches', 'Goals scored in all group matches', 'Fair play, then the FIFA ranking (not in the data: a shared place)'],
  },
};
export const rulesFor = (year: number) => (year >= 2026 ? WC_RULES['2026']! : year >= 1998 ? WC_RULES['1998-2022']! : undefined);

type Key = (r: Row) => number[];
/** Sort `rows` by `key` (higher first), then break remaining ties with `next`; marks rows still level. */
function rankBy(rows: Row[], key: Key, next: (tied: Row[]) => Row[]): Row[] {
  const sorted = [...rows].sort((x, y) => cmp(key(y), key(x)));
  const out: Row[] = [];
  for (let i = 0; i < sorted.length;) {
    let j = i + 1;
    while (j < sorted.length && cmp(key(sorted[j]!), key(sorted[i]!)) === 0) j++;
    out.push(...(j - i > 1 ? next(sorted.slice(i, j)) : sorted.slice(i, j)));
    i = j;
  }
  return out;
}
const cmp = (a: number[], b: number[]) => { for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i]! - b[i]!; return 0; };

/**
 * A group's order by `rule` over `matches` (results from `res`). `fallback`: the order for teams level on every rule
 * the data has (the real final order in history and the simulator), marked `level`.
 */
export function rankGroup(teams: string[], matches: WcMatch[], win: number, rule: GroupRule, fallback: string[], res: (m: WcMatch) => Result | undefined = (m) => m): Row[] {
  const all = records(teams, matches, win, res);
  const fb = (rs: Row[]) => [...rs].sort((x, y) => fallback.indexOf(x.team) - fallback.indexOf(y.team)).map((r) => ({ ...r, level: true }));
  const h2hKey = (tied: Row[]) => {
    const set = new Set(tied.map((r) => r.team));
    const sub = records([...set], matches.filter((m) => set.has(m.h) && set.has(m.a)), win, res);
    return (r: Row) => { const s = sub.get(r.team)!; return [s.pts, s.gd, s.gf]; };
  };
  const overall: Key = (r) => [r.pts, r.gd, r.gf];
  let out: Row[];
  if (rule === 'overall') {
    out = rankBy([...all.values()], overall, (tied) => rankBy(tied, h2hKey(tied), fb));
  } else {
    // h2h first; teams still level after a–c start a–c again among themselves, then overall GD and goals
    const h2h = (tied: Row[]): Row[] => rankBy(tied, h2hKey(tied), (still) => (still.length < tied.length ? h2h(still) : rankBy(still, (r) => [r.gd, r.gf], fb)));
    out = rankBy([...all.values()], (r) => [r.pts], h2h);
  }
  // ranks: a shared place for rows still level
  const ranked: Row[] = [];
  out.forEach((r, i) => {
    const prev = ranked[i - 1];
    ranked.push({ ...r, rank: prev && r.level && prev.level && cmp(overall(r), overall(prev)) === 0 ? prev.rank : i + 1 });
  });
  return ranked;
}

export interface GroupTable { group: WcGroup; rows: Row[]; matches: WcMatch[] }

/**
 * The edition's group tables. Up to 2022 in the official order (results alone can't settle lots / play-offs / fair
 * play); 2026 ranked by its rules. `res` swaps results (the simulator); with it, every edition is ranked by its rules.
 */
export function groupTables(ed: WcEdition, res?: (m: WcMatch) => Result | undefined): GroupTable[] {
  const rule = rulesFor(ed.year);
  return ed.groups.map((g) => {
    const ms = groupMatches(ed, g);
    const teams = g.order.length ? g.order : [...new Set(ms.flatMap((m) => [m.h, m.a]))];
    let rows: Row[];
    if (rule && (res || !ed.groups.some((x) => x.adv.length))) rows = rankGroup(teams, ms, ed.win, rule.rule, teams, res);
    else {
      const rec = records(teams, ms, ed.win);
      rows = teams.map((t, i) => ({ ...rec.get(t)!, rank: i + 1 }));
    }
    return { group: g, rows, matches: ms };
  });
}

/** 2026: the third-placed teams ranked (points, goal difference, goals; fair play and rankings aren't in the data). */
export function thirdsRanking(tables: GroupTable[], fallback: string[] = []): (Row & { group: string })[] {
  const thirds = tables.map((t) => ({ ...t.rows[2]!, group: t.group.name })).filter((r) => r.team);
  const key = (r: Row) => [r.pts, r.gd, r.gf];
  const sorted = [...thirds].sort((x, y) => cmp(key(y), key(x)) || fallback.indexOf(x.team) - fallback.indexOf(y.team));
  // teams level on every rule the data has share a place
  return sorted.map((r) => ({ ...r, rank: sorted.findIndex((o) => cmp(key(o), key(r)) === 0) + 1, level: sorted.some((o) => o !== r && cmp(key(o), key(r)) === 0) }));
}
/** 2026: how many third-placed teams go through. */
export const THIRDS_THROUGH = 8;

/** Who went through from each group in history: the data's flags; 2026: top two and the eight best thirds. */
export function advancing(ed: WcEdition, tables: GroupTable[]): Set<string> {
  if (ed.groups.some((g) => g.adv.length)) return new Set(ed.groups.flatMap((g) => g.adv));
  const out = new Set(tables.flatMap((t) => t.rows.slice(0, 2).map((r) => r.team)));
  if (ed.year >= 2026) for (const r of thirdsRanking(tables).slice(0, THIRDS_THROUGH)) out.add(r.team);
  return out;
}

// ---- the knockout bracket ----
export const KO_ORDER = ['Round of 32', 'Round of 16', 'Quarter-finals', 'Semi-finals', 'Final'];
export interface KoTie { stage: string; a: string; b: string; matches: WcMatch[]; winner?: string }
/** A round's ties in bracket order; null = a slot with no match (1938: Sweden through on a walkover). */
export interface KoRound { stage: string; ties: (KoTie | null)[] }

/** One tie per pairing in a knockout stage (a replay joins its first match); the winner is the last match's. */
export function koTies(ed: Pick<WcEdition, 'matches'>, stage: string): KoTie[] {
  const by = new Map<string, WcMatch[]>();
  for (const m of ed.matches) if (m.stage === stage) { const k = [m.h, m.a].sort().join('-'); by.set(k, [...(by.get(k) ?? []), m]); }
  return [...by.values()].map((ms) => {
    const last = ms[ms.length - 1]!;
    const w = winSide(last);
    return { stage, a: ms[0]!.h, b: ms[0]!.a, matches: ms, winner: w === undefined ? undefined : w === 0 ? last.h : last.a };
  });
}

/**
 * The bracket: the knockout rounds that lead to the final, each tie placed beside the ties that fed it (from the final
 * back: a tie's two teams each come from one tie of the round before). Rounds that aren't a clean halving (1934–38's
 * replays still are) stop the bracket there; earlier stages stay in the group tables.
 */
export function bracket(ed: Pick<WcEdition, 'matches'>): KoRound[] {
  const stages = KO_ORDER.filter((s) => ed.matches.some((m) => m.stage === s));
  if (!stages.includes('Final')) return [];
  const rounds: KoRound[] = stages.map((s) => ({ stage: s, ties: koTies(ed, s) }));
  // keep the rounds that feed the next one (twice its ties; one fewer where a walkover left no match)
  let from = rounds.length - 1;
  while (from > 0 && rounds[from - 1]!.ties.length <= 2 * rounds[from]!.ties.length && rounds[from - 1]!.ties.length > rounds[from]!.ties.length) from--;
  const kept: KoRound[] = rounds.slice(from);
  // order from the final back
  for (let i = kept.length - 2; i >= 0; i--) {
    const next = kept[i + 1]!.ties;
    const pool = kept[i]!.ties as KoTie[];
    const ordered: (KoTie | null)[] = [];
    for (const t of next) for (const team of t ? [t.a, t.b] : [undefined, undefined]) {
      ordered.push(pool.find((p) => (p.a === team || p.b === team) && !ordered.includes(p)) ?? null);
    }
    kept[i] = { ...kept[i]!, ties: ordered };
  }
  return kept;
}

/** A bracket column: one round's ties on one side of the final (the final itself is the middle column). */
export interface KoColumn { stage: string; side: 'left' | 'final' | 'right'; ties: (KoTie | null)[] }

/**
 * The bracket drawn from both sides: each round before the final is split in half (top half on the left, bottom half
 * on the right, mirrored), the final in the middle. Half as many ties per column, so the bracket is half as tall.
 */
export function twoSided(ko: KoRound[]): KoColumn[] {
  const final = ko[ko.length - 1];
  if (!final) return [];
  const before = ko.slice(0, -1);
  const half = (r: KoRound) => Math.ceil(r.ties.length / 2);
  return [
    ...before.map((r): KoColumn => ({ stage: r.stage, side: 'left', ties: r.ties.slice(0, half(r)) })),
    { stage: final.stage, side: 'final', ties: final.ties },
    ...before.reverse().map((r): KoColumn => ({ stage: r.stage, side: 'right', ties: r.ties.slice(half(r)) })),
  ];
}

export const thirdPlace = (ed: Pick<WcEdition, 'matches'>) => koTies(ed, 'Third place')[0];

// ---- each team's furthest stage ----
const MEDAL = ['Winner', 'Runner-up', 'Third place', 'Fourth place'];
/** Each team's furthest stage in an edition: Winner / Runner-up / Third / Fourth place, else the last stage it played. */
export function reached(ed: WcEdition): Record<string, string> {
  const order = [...new Set([...ed.matches].sort((a, b) => a.date.localeCompare(b.date)).map((m) => m.stage))].filter((s) => s !== 'Third place');
  const out: Record<string, string> = {};
  const rank = (s: string) => order.indexOf(s);
  for (const m of ed.matches) for (const t of [m.h, m.a]) if (m.stage !== 'Third place' && (!out[t] || rank(m.stage) > rank(out[t]!))) out[t] = m.stage;
  const final = koTies(ed, 'Final')[0];
  if (final?.winner) { out[final.winner] = MEDAL[0]!; out[final.winner === final.a ? final.b : final.a] = MEDAL[1]!; }
  const third = thirdPlace(ed);
  if (third?.winner) { out[third.winner] = MEDAL[2]!; out[third.winner === third.a ? third.b : third.a] = MEDAL[3]!; }
  // 1950: the final round was a group; its order gives the places
  if (!final) {
    const fr = ed.groups.find((g) => g.stage === 'Final round');
    fr?.order.forEach((t, i) => { if (MEDAL[i]) out[t] = MEDAL[i]!; });
  }
  return out;
}
/** How far a "reached" label went (higher is further), for sorting and colours. */
export const reachedRank = (r: string) => {
  const i = MEDAL.indexOf(r);
  if (i >= 0) return 10 - i;
  return ({ 'Semi-finals': 6, 'Quarter-finals': 5, 'Second group stage': 5, 'Final round': 6, 'Round of 16': 4, 'Round of 32': 3, 'Group stage': 1 } as Record<string, number>)[r] ?? 2;
};

// ---- links ----
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/** The owner's rule: every match link is a Google search "Home vs Away Mon D YYYY". */
export function wcMatchUrl(ed: Pick<WcEdition, 'teams'>, m: WcMatch): string {
  const [y, mo, d] = m.date.split('-');
  return `https://www.google.com/search?q=${encodeURIComponent(`${ed.teams[m.h]} vs ${ed.teams[m.a]} ${MON[Number(mo) - 1]} ${Number(d)} ${y}`)}`;
}
/** The team's section on Wikipedia's "<year> FIFA World Cup squads" page. */
export const squadUrl = (year: number, name: string) => `https://en.wikipedia.org/wiki/${year}_FIFA_World_Cup_squads#${encodeURIComponent(name.replace(/ /g, '_'))}`;

/** "3–1", "1–1 (a.e.t. 2–1)", "1–1 (a.e.t. 1–1, 4–2 pens)": 90' first, then extra time and the shootout. */
export function scoreText(r: Result, sep = '–'): string {
  const s = `${r.s[0]}${sep}${r.s[1]}`;
  const extra = [r.et ? `a.e.t. ${r.et[0]}${sep}${r.et[1]}` : '', r.p ? `${r.p[0]}${sep}${r.p[1]} pens` : ''].filter(Boolean).join(', ');
  return extra ? `${s} (${extra})` : s;
}

const BASE = `${import.meta.env?.BASE_URL ?? '/'}worldcup/`;
const cache = new Map<string, Promise<unknown>>();
/** FK-66: what has arrived, readable in the same render (a loaded edition never goes through a "loading" frame). */
const arrived = new Map<string, unknown>();
const load = <T,>(file: string): Promise<T> => {
  let p = cache.get(file);
  if (!p) {
    p = fetch(BASE + file).then((r) => { if (!r.ok) throw new Error(`${r.status} ${file}`); return r.json(); }).then((x: unknown) => { arrived.set(file, x); return x; });
    cache.set(file, p);
    p.catch(() => cache.delete(file));
  }
  return p as Promise<T>;
};
/** FK-67: the editions with full-match videos (public/worldcup/<year>-videos.json, scripts/make-wc-videos.ts). */
export const WC_VIDEO_YEARS = [2026];
/** Match number → YouTube video id. */
export type WcVideos = Record<number, string>;
/** The edition's videos; never fails (a missing or broken file is no videos: the page works without the ▶ links). */
export function loadVideos(year: number): Promise<WcVideos> {
  const file = `${year}-videos.json`;
  let p = cache.get(file) as Promise<WcVideos> | undefined;
  if (!p) {
    p = fetch(BASE + file).then((r) => (r.ok ? r.json() : {})).catch(() => ({})).then((x: WcVideos) => { arrived.set(file, x); return x; });
    cache.set(file, p);
  }
  return p;
}
export const peekVideos = (year: number) => arrived.get(`${year}-videos.json`) as WcVideos | undefined;
export const wcVideoUrl = (id: string) => `https://www.youtube.com/watch?v=${id}`;
/** FK-69: the editions with a venues file (stadium, roof, weather per match: public/worldcup/<year>-venues.json, scripts/make-wc-venues.ts). */
export const WC_VENUE_YEARS = [2026];
const NO_VENUES: WcVenues = { stadiums: {}, matches: {}, weatherSource: '' };
/** The edition's venues; never fails (a missing or broken file is no venues: the cards just leave them off). */
export function loadVenues(year: number): Promise<WcVenues> {
  const file = `${year}-venues.json`;
  let p = cache.get(file) as Promise<WcVenues> | undefined;
  if (!p) {
    p = fetch(BASE + file).then((r) => (r.ok ? r.json() : NO_VENUES)).catch(() => NO_VENUES).then((x: WcVenues) => { arrived.set(file, x); return x; });
    cache.set(file, p);
  }
  return p;
}
export const peekVenues = (year: number) => arrived.get(`${year}-venues.json`) as WcVenues | undefined;
/** An edition's extra files (videos, venues) arrive together with it, so its cards are whole from the first frame (no late shift). */
const extras = (year: number): Promise<unknown>[] => [...(WC_VIDEO_YEARS.includes(year) ? [loadVideos(year)] : []), ...(WC_VENUE_YEARS.includes(year) ? [loadVenues(year)] : [])];
export const loadEdition = (year: number): Promise<WcEdition> => Promise.all([load<WcEdition>(`${year}.json`), ...extras(year)]).then(([ed]) => ed);
export const loadIndex = () => load<WcIndexEntry[]>('index.json');
/** FK-66: the edition if it has already arrived, else undefined (no fetch). */
export const peekEdition = (year: number) => ((WC_VIDEO_YEARS.includes(year) && !peekVideos(year)) || (WC_VENUE_YEARS.includes(year) && !peekVenues(year)) ? undefined : arrived.get(`${year}.json`) as WcEdition | undefined);
export const peekIndex = () => arrived.get('index.json') as WcIndexEntry[] | undefined;
/** FK-66: the editions either side of `year` (two each way), fetched ahead so stepping through the strip never waits. */
export function neighbours(years: number[], year: number, reach = 2): number[] {
  const i = years.indexOf(year);
  if (i < 0) return [];
  const out: number[] = [];
  for (let d = 1; d <= reach; d++) for (const j of [i - d, i + d]) if (j >= 0 && j < years.length) out.push(years[j]!);
  return out;
}
