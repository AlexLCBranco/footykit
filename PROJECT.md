# footykit — PROJECT

Soccer calendar and league understander for the followed clubs (all Premier League and Brasileirão clubs, La Liga /
Serie A / Bundesliga clubs in this season's Champions League, PSG). Separate repo and package; it will be installed
into gauntlet-home at `/football`, like calendarkit at `/calendar`. The full plan and phase status: PLAN.md.

**Read this file, not docs/HISTORY.md.** HISTORY.md is the archive; open it only when a question needs the backstory.

## Rules for working here
- Comments explain why the code is the way it is. History goes in commit messages and docs/HISTORY.md.
- Desktop, full-size window only. Fluidity and speed come first.
- Never invent facts (rules, berths, tiebreakers, pots, windows, rivalries, neutral venues): research them, put them in
  `config/` with a source link, list them for Alex to confirm.
- Every app change bumps the version in package.json; CI enforces it (`scripts/check-version.ts`).
- Every fix gets a test that fails on the old code.
- localStorage keys start with `fk:` (same origin as calendarkit's `ck:` keys).
- Tests never call live ESPN (it refuses headless Chromium); they use recorded fixtures.

## Current state (2026-11-14)
- **Phase 1 (data check) done**, waiting on Alex's answers: docs/phase1-report.md. No UI yet.

## Where things live
- `config/season.ts` — followed-club rules, competitions per league, ESPN season years.
- `src/data/espn.ts` — the ESPN fields footykit reads; `src/data/ko.ts` — tie winners and competition state.
- `scripts/data-check.ts` — Phase 1 check (`npm run data-check`, network; writes docs/phase1-data-check.md).

## Run, test
- `npm test` (Vitest) · `npm run lint` · `npm run typecheck` · `npm run data-check`.
- CI (`.github/workflows/ci.yml`): version check, lint, typecheck, unit tests.

## Decisions in force
- Data source: ESPN's unofficial API (`site.api.espn.com`), no key. Club feed `soccer/all/teams/{id}/schedule`
  (+ `?fixture=true`), competition scoreboards, `apis/v2/.../standings`.
- A tie's winner comes from the aggregate / shootout scores, never from ESPN's per-match `winner` flag.
- Neutral venues come from researched config: ESPN's `neutralSite` is always false.
- A postponed event that was rescheduled under a new id is dropped.

## Testing policy
Automate every check that can be automated: unit, integration, and end-to-end with Playwright, using throwaway data
the test creates and deletes itself. Manual steps only for what truly can't be automated (browser permission prompts,
judging feel/usability), kept to the minimum, each with the reason it can't be automated, one short step at a time.
Test tiers: every view is settled or in flux; new views start in flux (one smoke test each, no layout assertions);
logic (tables, tiebreakers, windows, simulator) always gets full unit tests.
