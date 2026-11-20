// FK-60: the World Cup what-if simulator. Starts from the real results; any match can be changed (a pick). The group
// tables are re-ranked with the edition's rules (worldcup.ts rankGroup), and the bracket is refilled by the edition's
// own pairings — read from the real bracket, so nothing is typed in: each first-round knockout match is "1A v 2B" (the
// real teams' group places), each later match "winner of match n v winner of match m" (where the real teams came from),
// third place "loser of n v loser of m". 2026's matches against third-placed teams follow Annex C (thirdsTable): which
// third meets which group winner depends on which eight groups' thirds go through.
// v1 covers the 32-team editions (1998–2022) and 2026; older formats are history only.

import { groupTables, thirdsRanking, THIRDS_THROUGH, winSide, type GroupTable, type Result, type WcEdition, type WcMatch } from './worldcup.ts';

export const SIM_YEARS = [1998, 2002, 2006, 2010, 2014, 2018, 2022, 2026];
export const simulable = (year: number) => SIM_YEARS.includes(year);

/** A pick: the result entered for match `n`; for a knockout match also the teams it was entered for (h, a). null = cleared. */
export type Pick = { r: Result; h?: string; a?: string } | null;
export type Picks = Record<number, Pick>;

/** Where a knockout side comes from: a group place ("1A", "2B"), a third via Annex C ("3:1A" = the third that meets 1A), a winner / loser of a match. */
export type Source = { kind: 'place'; pos: number; group: string } | { kind: 'third'; vs: string } | { kind: 'win' | 'lose'; n: number };
export interface Slot { n: number; stage: string; date: string; real: WcMatch; from: [Source, Source] }

const letter = (g: string) => g.replace(/^Group /, '');
const KO = ['Round of 32', 'Round of 16', 'Quarter-finals', 'Semi-finals', 'Third place', 'Final'];

/** The edition's knockout slots, read from the real bracket (see the top). */
export function koSlots(ed: WcEdition): Slot[] {
  const tables = groupTables(ed);
  const placeOf = new Map<string, { pos: number; group: string }>();
  for (const t of tables) t.rows.forEach((r, i) => placeOf.set(r.team, { pos: i + 1, group: letter(t.group.name) }));
  const ko = ed.matches.filter((m) => KO.includes(m.stage)).sort((a, b) => KO.indexOf(a.stage) - KO.indexOf(b.stage) || a.n - b.n);
  const first = ko[0]!.stage;
  const slots: Slot[] = [];
  for (const m of ko) {
    const src = (team: string, other: string): Source => {
      if (m.stage === first) {
        const p = placeOf.get(team)!;
        if (p.pos === 3) { const o = placeOf.get(other)!; return { kind: 'third', vs: `${o.pos}${o.group}` }; }
        return { kind: 'place', ...p };
      }
      // the earlier knockout match this team came from: won it (lost it, for the third-place match)
      const prev = [...slots].reverse().find((s) => s.real.h === team || s.real.a === team)!;
      return { kind: m.stage === 'Third place' ? 'lose' : 'win', n: prev.n };
    };
    slots.push({ n: m.n, stage: m.stage, date: m.date, real: m, from: [src(m.h, m.a), src(m.a, m.h)] });
  }
  return slots;
}

export const sourceText = (s: Source) => (s.kind === 'place' ? `${s.pos}${s.group}` : s.kind === 'third' ? `3rd (v ${s.vs})` : `${s.kind === 'win' ? 'Winner' : 'Loser'} M${s.n}`);

export interface SimTie { slot: Slot; h?: string; a?: string; r?: Result; winner?: string; changed: boolean }
export interface SimView {
  tables: GroupTable[];
  /** groups with every match decided (a group's places count only then) */
  done: Set<string>;
  thirds?: { rows: ReturnType<typeof thirdsRanking>; through: Set<string>; vs?: Record<string, string> };
  ties: SimTie[];
  champion?: string;
  /** the result each match has now (picked, real, or none) */
  res: (m: WcMatch) => Result | undefined;
  /** matches whose result differs from the real one */
  changed: Set<number>;
}

const same = (x: Result, y: Result) => JSON.stringify([x.s, x.et ?? null, x.p ?? null]) === JSON.stringify([y.s, y.et ?? null, y.p ?? null]);
const flip = (r: Result): Result => ({ s: [r.s[1], r.s[0]], ...(r.et ? { et: [r.et[1], r.et[0]] } : {}), ...(r.p ? { p: [r.p[1], r.p[0]] } : {}) });

/** The simulator's state from the picks: group tables, thirds, every knockout tie, the champion. */
export function simulate(ed: WcEdition, picks: Picks, slots = koSlots(ed)): SimView {
  const changed = new Set<number>();
  const groupRes = (m: WcMatch): Result | undefined => {
    if (!(m.n in picks)) return m;
    const p = picks[m.n];
    if (!p || !same(p.r, m)) changed.add(m.n);
    return p?.r;
  };
  const tables = groupTables(ed, groupRes);
  const done = new Set(tables.filter((t) => t.matches.every((m) => groupRes(m))).map((t) => letter(t.group.name)));
  const place = (pos: number, g: string) => (done.has(g) ? tables.find((t) => letter(t.group.name) === g)?.rows[pos - 1]?.team : undefined);
  let thirds: SimView['thirds'];
  if (ed.year >= 2026) {
    const realThirds = thirdsRanking(groupTables(ed)).map((r) => r.team);
    const rows = thirdsRanking(tables, realThirds);
    const allDone = done.size === tables.length;
    const top = rows.slice(0, THIRDS_THROUGH);
    const key = top.map((r) => letter(r.group)).sort().join('');
    thirds = { rows, through: allDone ? new Set(top.map((r) => r.team)) : new Set(), vs: allDone ? ed.thirdsTable?.find((x) => x.groups === key)?.vs : undefined };
  }
  const ties: SimTie[] = [];
  const byN = new Map<number, SimTie>();
  const resolve = (s: Source): string | undefined => {
    if (s.kind === 'place') return place(s.pos, s.group);
    if (s.kind === 'third') { const g = thirds?.vs?.[s.vs]; return g ? place(3, g.slice(1)) : undefined; }
    const t = byN.get(s.n);
    if (!t?.winner) return undefined;
    return s.kind === 'win' ? t.winner : t.winner === t.h ? t.a : t.h;
  };
  for (const slot of slots) {
    const h = resolve(slot.from[0]), a = resolve(slot.from[1]);
    const real = slot.real;
    const realHere = !!h && !!a && ((real.h === h && real.a === a) || (real.h === a && real.a === h));
    const realR = realHere ? (real.h === h ? real : flip(real)) : undefined;
    const p = picks[slot.n];
    // a pick counts only for the teams it was made for; cleared (null) = no result; else the real one if these are the real teams
    const pickHere = !!p && !!h && !!a && ((p.h === h && p.a === a) || (p.h === a && p.a === h));
    const r: Result | undefined = pickHere ? (p!.h === h ? p!.r : flip(p!.r)) : p === null ? undefined : realR;
    if (!(realR && r && same(realR, r))) changed.add(slot.n);
    const w = r ? winSide(r) : undefined;
    const tie: SimTie = { slot, h, a, r, winner: w === undefined ? undefined : w === 0 ? h : a, changed: changed.has(slot.n) };
    ties.push(tie);
    byN.set(slot.n, tie);
  }
  const final = ties.find((t) => t.slot.stage === 'Final');
  return { tables, done, thirds, ties, champion: final?.winner, res: groupRes, changed };
}

/** The result a fast-mode pick sets: home win 1–0, draw 1–1, away win 0–1 (a knockout side: 1–0 / 0–1). */
export const fastResult = (k: '1' | 'X' | '2'): Result => ({ s: k === '1' ? [1, 0] : k === '2' ? [0, 1] : [1, 1] });
export const fastOf = (r?: Result): '1' | 'X' | '2' | undefined => { if (!r) return undefined; const w = winSide(r); return w === 0 ? '1' : w === 1 ? '2' : r.et || r.p ? undefined : 'X'; };

/** Every match left with no result: the group matches and the knockout slots. */
export function clearAll(ed: WcEdition, slots = koSlots(ed)): Picks {
  const out: Picks = {};
  for (const m of ed.matches) if (m.group && !m.playoff) out[m.n] = null;
  for (const s of slots) out[s.n] = null;
  return out;
}

const KEY = 'fk:wcsim:v1';
/** The picks per edition, kept in this browser (`fk:wcsim:v1`). */
export function loadPicks(year: number): Picks {
  try { return (JSON.parse(localStorage.getItem(KEY) ?? '{}') as Record<string, Picks>)[year] ?? {}; } catch { return {}; }
}
export function savePicks(year: number, picks: Picks) {
  try {
    const all = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Record<string, Picks>;
    if (Object.keys(picks).length) all[year] = picks; else delete all[year];
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch { /* storage off: picks last until a reload */ }
}
