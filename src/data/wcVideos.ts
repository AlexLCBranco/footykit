// FK-67: pairs CazéTV's full-match videos (the "Jogos Completos" playlist, listed by scripts/make-wc-videos.ts) to the
// 2026 World Cup's matches: by the two teams the title names (either order) and the date. Only what pairs for sure gets
// a link; nothing is guessed. Pure, so the tests cover it without YouTube.

import { WC_NAMES_PT } from '../../config/wcNamesPt';

// FK-68: the same pairing for FIFA's own full-match replays of the 2022 World Cup (FIFA+ pages listed by FIFA's video
// sitemap, and FIFA's YouTube uploads; scripts/make-wc-fifa-videos.ts). Their titles are in English with FIFA's
// spellings of the teams: "Argentina v France | Final | FIFA World Cup Qatar 2022™ | Full Match Replay",
// "FULL MATCH: Brazil v Korea Republic | 2022 FIFA World Cup".

/** FIFA's spellings that differ from the edition's team names. */
export const FIFA_NAMES: Record<string, string> = { 'KOREA REPUBLIC': 'KOR', 'IR IRAN': 'IRN', USA: 'USA', TURKIYE: 'TUR', 'CHINA PR': 'CHN', 'COTE D IVOIRE': 'CIV' };
/** An edition's teams by (normalised) English name, with FIFA's spellings: the `names` for `titleTeams` / `pairVideos`. */
export const editionNames = (teams: Record<string, string>): Record<string, string> => {
  const out: Record<string, string> = Object.fromEntries(Object.entries(teams).map(([code, name]) => [norm(name), code]));
  for (const [name, code] of Object.entries(FIFA_NAMES)) if (teams[code]) out[name] = code;
  return out;
};

/**
 * Is this title a full match of the men's World Cup of `year` hosted by `host` ("Qatar")? It must say "full match" and
 * name that tournament ("FIFA World Cup Qatar 2022" or "2022 FIFA World Cup"); other tournaments of the same year
 * (women's, youth, club, qualifiers) are not it.
 */
export function isFullMatchOf(title: string, year: number, host: string): boolean {
  const t = norm(title);
  if (!t.includes('FULL MATCH')) return false;
  if (/WOMEN|U-\d\d|QUALIF|CLUB|FUTSAL|BEACH|OLYMPIC|YOUTH|PLAY-OFF TOURNAMENT/.test(t)) return false;
  return t.includes(`FIFA WORLD CUP ${norm(host)} ${year}`) || t.includes(`${year} FIFA WORLD CUP`);
}

/** FIFA+ first, then YouTube: each match's one address (FK-68: the YouTube upload only when FIFA+ has no replay page). */
export const preferFirst = (first: Record<number, string>, second: Record<number, string>): Record<number, string> => ({ ...second, ...first });

/** A playlist entry. `date` (YYYY-MM-DD) is when it was posted; a flat playlist listing only gives it roughly, never early. */
export interface Video { id: string; title: string; date?: string }
export interface PairMatch { n: number; h: string; a: string; date: string }

/** Upper case, accents and marks (™) dropped, spaces squeezed: "  França " → "FRANCA". */
export const norm = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toUpperCase().replace(/[^A-Z0-9 -]/g, ' ').replace(/\s+/g, ' ').trim();

/**
 * The two teams a title names, as codes, in the title's order: "JOGO COMPLETO: ESPANHA X ARGENTINA | FINAL …" →
 * ['ESP', 'ARG']. The teams sit in one "|" part, after any "label:", split by "x", "vs" or "v". Undefined unless both
 * names are known teams.
 */
export function titleTeams(title: string, names: Record<string, string> = WC_NAMES_PT): [string, string] | undefined {
  for (const part of title.split('|')) {
    const sides = norm(part.slice(part.lastIndexOf(':') + 1)).split(/ (?:X|VS|V) /);
    if (sides.length !== 2) continue;
    const [a, b] = sides.map((s) => names[s]);
    if (a && b && a !== b) return [a, b];
  }
  return undefined;
}

const dayBefore = (d: string) => new Date(Date.parse(`${d}T00:00:00Z`) - 86_400_000).toISOString().slice(0, 10);

export interface Paired {
  /** match number → video id */
  videos: Record<number, string>;
  /** matches with no video */
  missing: number[];
  /** videos that name no known pair of teams, or no match of theirs on or before the video's date */
  unpaired: Video[];
  /** further videos of a match that already has one (the first listed is kept) */
  extra: Video[];
}

/**
 * Each video's match: the one between the title's two teams. A dated video can't be older than its match (a day's
 * slack for time zones), and where the teams met more than once it is the latest match up to that date; without a
 * date it pairs only when the teams met once.
 */
export function pairVideos(matches: PairMatch[], list: Video[], names: Record<string, string> = WC_NAMES_PT): Paired {
  const out: Paired = { videos: {}, missing: [], unpaired: [], extra: [] };
  for (const v of list) {
    const teams = titleTeams(v.title, names);
    let met = teams ? matches.filter((m) => (m.h === teams[0] && m.a === teams[1]) || (m.h === teams[1] && m.a === teams[0])) : [];
    if (v.date) met = met.filter((m) => dayBefore(m.date) <= v.date!).sort((x, y) => y.date.localeCompare(x.date)).slice(0, 1);
    const m = met.length === 1 ? met[0] : undefined;
    if (!m) out.unpaired.push(v);
    else if (out.videos[m.n]) out.extra.push(v);
    else out.videos[m.n] = v.id;
  }
  out.missing = matches.filter((m) => !out.videos[m.n]).map((m) => m.n);
  return out;
}
