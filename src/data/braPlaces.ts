// The Brasileirão's Libertadores and Sudamericana places (CBF's REC 2026, Art. 6–7; config/leagues.ts), read
// literally (Alex, 2026-11-15): a freed place keeps its stage and passes to the best-placed club not yet qualified.
//  - national places: 1st–4th group stage, 5th preliminary stage; Copa do Brasil champions group stage, runners-up
//    preliminary stage (§1);
//  - a club also qualified as Libertadores / Sudamericana champions keeps that CONMEBOL place, its national one passes
//    down (§2); a club qualified through both the cup and the table keeps the better place (the table's when equal),
//    the other passes down (§3–4); when the cup champions qualified elsewhere, the cup's group-stage place goes to the
//    runners-up and their preliminary place passes down (§5);
//  - a relegated cup finalist's place passes down (pt.wikipedia's note; not in the REC);
//  - Sudamericana: the 6 best-placed clubs not in the Libertadores (Art. 7).
// When several places are freed at once, group-stage places are handed out before preliminary ones (the REC doesn't
// order them; this gives the better place to the better-placed club). Finals still to play are worked out both ways.

import type { LeagueZone, ZoneKind } from '../../config/leagues.ts';
import { isPlayed } from './model.ts';
import type { Match } from './snapshot.ts';

export type Stage = 'group' | 'prelim';
export type Route = 'table' | 'cup' | 'cupVice' | 'cupMovedUp' | 'lib' | 'sula' | 'passed';
export interface Place { stage: Stage; route: Route }
export interface Allocation { lib: Map<string, Place>; sula: string[] }

export interface Inputs {
  /** the Série A table, best first */
  order: string[];
  relegated: Set<string>;
  cupChamp?: string;
  cupVice?: string;
  libChamp?: string;
  sulaChamp?: string;
}

export function allocate({ order, relegated, cupChamp, cupVice, libChamp, sulaChamp }: Inputs): Allocation {
  const members = new Set(order);
  const lib = new Map<string, Place>();
  // CONMEBOL places first: they win over any national one (§2)
  if (libChamp && members.has(libChamp)) lib.set(libChamp, { stage: 'group', route: 'lib' });
  if (sulaChamp && members.has(sulaChamp) && !lib.has(sulaChamp)) lib.set(sulaChamp, { stage: 'group', route: 'sula' });
  const tableStage = (t: string): Stage | undefined => { const i = order.indexOf(t); return i < 0 ? undefined : i < 4 ? 'group' : i === 4 ? 'prelim' : undefined; };
  const eligible = (t: string | undefined): t is string => !!t && members.has(t) && !relegated.has(t);
  const freed: Stage[] = [];

  // the cup's group-stage place (§1a, §3, §5); no final in the data → the cup's places are left out
  let cupGroupTo: string | undefined;
  let cupPrelimTo: string | undefined;
  let viceMovedUp = false;
  if (cupChamp) {
    const champOther = lib.has(cupChamp) || tableStage(cupChamp) === 'group';
    if (eligible(cupChamp) && !champOther) cupGroupTo = cupChamp;
    // §5 is about champions qualified elsewhere; relegated champions' place passes down the table instead
    else if (eligible(cupChamp) && eligible(cupVice) && !lib.has(cupVice) && tableStage(cupVice) !== 'group') { cupGroupTo = cupVice; viceMovedUp = true; }
    else freed.push('group');
    // the cup's preliminary place (§1b, §2–4)
    if (viceMovedUp) freed.push('prelim');
    else if (eligible(cupVice) && !lib.has(cupVice) && !tableStage(cupVice)) cupPrelimTo = cupVice;
    else freed.push('prelim');
  }

  if (cupGroupTo) lib.set(cupGroupTo, { stage: 'group', route: viceMovedUp ? 'cupMovedUp' : 'cup' });
  // the table's places (§2–4): a club already placed (CONMEBOL, or the cup's group stage won over 5th) frees its own
  for (let i = 0; i < 5; i++) {
    const t = order[i];
    const stage: Stage = i < 4 ? 'group' : 'prelim';
    if (!t) continue;
    if (lib.has(t)) { freed.push(stage); continue; }
    lib.set(t, { stage, route: 'table' });
  }
  if (cupPrelimTo && !lib.has(cupPrelimTo)) lib.set(cupPrelimTo, { stage: 'prelim', route: 'cupVice' });
  else if (cupPrelimTo) freed.push('prelim');

  freed.sort((a, b) => (a === b ? 0 : a === 'group' ? -1 : 1));
  for (const stage of freed) {
    const t = order.find((x) => !lib.has(x) && !relegated.has(x));
    if (t) lib.set(t, { stage, route: 'passed' });
  }
  const sula = order.filter((t) => !lib.has(t)).slice(0, 6);
  return { lib, sula };
}

/** A final's finalists and, once decided, its winner (legs summed, then the shootout). */
export function finalOf(matches: Match[], comp: string): { finalists: [string, string]; winner?: string; legs: Match[] } | undefined {
  const legs = matches.filter((m) => m.c === comp && /^final$/i.test((m.r ?? '').trim()) && m.st !== 'can');
  if (!legs.length) return undefined;
  const [a, b] = [legs[0]!.h, legs[0]!.a];
  if (!legs.every(isPlayed)) return { finalists: [a, b], legs };
  let ga = 0, gb = 0, pa: number | undefined, pb: number | undefined;
  for (const m of legs) {
    ga += m.h === a ? m.hs! : m.as!;
    gb += m.h === a ? m.as! : m.hs!;
    if (m.hp !== undefined && m.ap !== undefined) { pa = m.h === a ? m.hp : m.ap; pb = m.h === a ? m.ap : m.hp; }
  }
  const winner = ga > gb ? a : gb > ga ? b : pa !== undefined && pb !== undefined && pa !== pb ? (pa > pb ? a : b) : undefined;
  return { finalists: [a, b], winner, legs };
}

export interface Scenario { cup?: string; lib?: string; sula?: string; alloc: Allocation }

/** Every outcome of the finals still to play (a decided final has one), each allocated with the table as it stands. */
export function scenarios(order: string[], relegated: Set<string>, finals: Partial<Record<'cup' | 'lib' | 'sula', ReturnType<typeof finalOf>>>): Scenario[] {
  const ways = (f: ReturnType<typeof finalOf>) => (!f ? [undefined] : f.winner ? [f.winner] : [...f.finalists]);
  const out: Scenario[] = [];
  for (const cup of ways(finals.cup)) {
    for (const lib of ways(finals.lib)) {
      for (const sula of ways(finals.sula)) {
        const vice = cup && finals.cup ? finals.cup.finalists.find((x) => x !== cup) : undefined;
        out.push({ cup, lib, sula, alloc: allocate({ order, relegated, cupChamp: cup, cupVice: vice, libChamp: lib, sulaChamp: sula }) });
      }
    }
  }
  return out;
}

export type Fate = 'group' | 'prelim' | 'sula' | 'none';
export const fateIn = (s: Scenario, team: string): Fate => s.alloc.lib.get(team)?.stage ?? (s.alloc.sula.includes(team) ? 'sula' : 'none');

const FATE_LABEL: Record<Fate, string> = { group: 'Libertadores group stage', prelim: 'Libertadores preliminary stage', sula: 'Sudamericana', none: 'no continental place' };
const ROUTE_TEXT: Partial<Record<Route, string>> = { cup: 'as Copa do Brasil champions', cupVice: 'as Copa do Brasil runners-up', cupMovedUp: 'as Copa do Brasil runners-up (moved up, §5)', lib: 'as Libertadores champions', sula: 'as Sudamericana champions', passed: 'a place passed down the table' };
const FINAL_NAME = { cup: 'the Copa do Brasil', lib: 'the Libertadores', sula: 'the Sudamericana' } as const;

export interface RowPlace {
  /** the place when every outcome agrees, else the best one possible */
  fate: Fate;
  /** some outcomes give another place */
  open: boolean;
  /** tooltip: the place(s) and the outcomes that give each */
  text: string;
}

/** Each team's place across the outcomes of the finals still to play, in words. */
export function rowPlaces(all: Scenario[], teams: string[], name: (id: string) => string): Map<string, RowPlace> {
  const rank: Fate[] = ['group', 'prelim', 'sula', 'none'];
  const keys = (['cup', 'lib', 'sula'] as const).filter((k) => new Set(all.map((s) => s[k])).size > 1);
  const out = new Map<string, RowPlace>();
  for (const t of teams) {
    const by = new Map<Fate, Scenario[]>();
    for (const s of all) { const f = fateIn(s, t); by.set(f, [...(by.get(f) ?? []), s]); }
    const fates = [...by.keys()].sort((a, b) => rank.indexOf(a) - rank.indexOf(b));
    const route = (s: Scenario) => ROUTE_TEXT[s.alloc.lib.get(t)?.route as Route];
    if (fates.length === 1) {
      // the route only when it's the same in every outcome (Palmeiras are in either way, but not yet as champions)
      const routes = new Set(all.map(route));
      const r = routes.size === 1 ? [...routes][0] : undefined;
      out.set(t, { fate: fates[0]!, open: false, text: `${FATE_LABEL[fates[0]!]}${r ? `, ${r}` : ''}` });
      continue;
    }
    // describe each place by the fewest results that always give it: "if Palmeiras win the Libertadores", "if Palmeiras
    // win the Libertadores and Atlético-MG win the Sudamericana"; the conditions together cover every outcome giving it
    const lines = fates.map((f) => {
      const set = new Set(by.get(f));
      const conds: { picks: [typeof keys[number], string][]; text: string }[] = [];
      const combos = (ks: typeof keys, i = 0): (typeof keys[number])[][] => (i === ks.length ? [[]] : combos(ks, i + 1).flatMap((c) => [c, [ks[i]!, ...c]]));
      for (const ks of combos(keys).filter((c) => c.length).sort((a, b) => a.length - b.length)) {
        const ways = ks.reduce<string[][]>((acc, k) => acc.flatMap((p) => [...new Set(all.map((s) => s[k]!))].map((w) => [...p, w])), [[]]);
        for (const ws of ways) {
          const picks = ks.map((k, j) => [k, ws[j]!] as [typeof k, string]);
          const sub = all.filter((s) => picks.every(([k, w]) => s[k] === w));
          // skip a condition implied by a shorter one already taken
          if (!sub.length || !sub.every((s) => set.has(s)) || conds.some((c) => c.picks.every(([k, w]) => picks.some(([k2, w2]) => k === k2 && w === w2)))) continue;
          conds.push({ picks, text: picks.map(([k, w]) => `${name(w)} win ${FINAL_NAME[k]}`).join(' and ') });
        }
      }
      return `${FATE_LABEL[f]} if ${conds.map((c) => c.text).join(', or ')}`;
    });
    out.set(t, { fate: fates[0]!, open: true, text: `As things stand:\n${lines.join('\n')}` });
  }
  return out;
}

// ---- finals picked, and each row's zone ----

export type FinalKey = 'cup' | 'lib' | 'sula';
export type Final = ReturnType<typeof finalOf>;
export type Finals = Partial<Record<FinalKey, Final>>;

/** The finals with a picked winner where the real one is still to play (a real winner stands; a pick that isn't a
 * finalist is ignored). */
export function pickFinals(finals: Finals, winners: Partial<Record<FinalKey, string>>): Finals {
  const out: Finals = { ...finals };
  for (const k of ['cup', 'lib', 'sula'] as const) {
    const f = finals[k], w = winners[k];
    if (f && !f.winner && w && f.finalists.includes(w)) out[k] = { ...f, winner: w };
  }
  return out;
}

const FATE_KIND: Record<Fate, ZoneKind | undefined> = { group: 'lib', prelim: 'libq', sula: 'sula', none: undefined };
export interface RowZone { kind: ZoneKind; open: boolean; tip: string }

/** Each row's zone, best first: by position from the config, except the continental places, which come from CBF's
 * rules and the finals (relegation stays by position, and the relegated clubs are the ones in its zone). */
export function braRowZones(order: string[], zones: LeagueZone[], finals: Finals, name: (id: string) => string): (RowZone | undefined)[] {
  const zoneAt = (pos: number) => zones.find((z) => pos >= z.from && pos <= z.to);
  const rel = new Set(order.filter((_, i) => zoneAt(i + 1)?.kind === 'rel'));
  const places = rowPlaces(scenarios(order, rel, finals), order, name);
  return order.map((team, i) => {
    const cfg = zoneAt(i + 1);
    const place = places.get(team);
    if (!place || cfg?.kind === 'rel') return cfg && { kind: cfg.kind, open: !!cfg.maybe, tip: `${cfg.label}${cfg.maybe ? `\nOnly ${cfg.maybe}` : ''}` };
    const kind = FATE_KIND[place.fate];
    return kind && { kind, open: place.open, tip: place.text };
  });
}
