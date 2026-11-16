// FK-26: the window streak checked against a known fixture list. Flamengo v Vasco (Thu Oct 29, 2026) is the 7th
// window in a row with a Flamengo match (owner confirmed 2026-11-16): Thu Oct 8, Sun Oct 11, Wed Oct 15, Sun Oct 18,
// Wed Oct 22, Mon Oct 26, Thu Oct 29 (São Paulo time); nothing Sep 21 – Oct 5 (the FIFA window) breaks it before.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildModel } from '../src/data/model';
import type { Snapshot } from '../src/data/snapshot';
import { windowStreak } from '../src/data/windows';

const snap = JSON.parse(readFileSync(join(import.meta.dirname, 'fixtures/snapshot.json'), 'utf8')) as Snapshot;
const FLA = '819';

describe('window streak (FK-26)', () => {
  const model = buildModel(snap, 'America/Sao_Paulo');
  const flaOn = (day: string) => (model.byTeam.get(FLA) ?? []).find((m) => model.dayOf(m) === day)!;
  it('Flamengo at Vasco, Oct 29: 7th straight window', () => {
    expect(flaOn('2026-10-29').h).not.toBe(FLA);
    expect(windowStreak(model, FLA, flaOn('2026-10-29'))).toBe(7);
  });
  it('counts back window by window through the same run', () => {
    expect(['2026-10-08', '2026-10-11', '2026-10-15', '2026-10-18', '2026-10-22', '2026-10-26', '2026-10-29'].map((d) => windowStreak(model, FLA, flaOn(d)))).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });
  it('a gap of one free window resets it', () => {
    expect(windowStreak(model, FLA, flaOn('2026-09-20'))).toBeGreaterThan(1);
    expect(windowStreak(model, FLA, flaOn('2026-10-08'))).toBe(1); // after the FIFA break
  });
  it('a team whose schedule is not complete in the snapshot has no streak', () => {
    const other = snap.matches.find((m) => !model.followed.has(m.h))!;
    expect(windowStreak(model, other.h, other)).toBeUndefined();
  });
});
