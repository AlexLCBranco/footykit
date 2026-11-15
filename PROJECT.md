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

## Current state (2026-11-15)
- Phase 1 (data check) done (docs/phase1-report.md).
- **Phase 2 (calendar core) in progress** — v0.2.0: snapshot job, day function, app shell with the packed bar, Day
  List, Slate (cards, notes, 3-way odds), Team Calendar (1 / 2 weeks / month, free windows, FIFA windows), Team List,
  season series popup, quick standings popup, copy as image (card / whole view), neutral venues and FIFA windows from
  researched config. v0.3.0: the travel map beside the Day List (`src/map/TravelMap.tsx`, lazy chunk). v0.4.0: marquee
  selection copy (`selection.ts`, `SelectionBar.tsx`), the Slate as a self-contained part for the gauntlet
  (`src/slate/index.ts`, docs/slate-in-gauntlet.md). Slate notes (`fk:notes:v1`) are already in the gauntlet's
  backup (it saves every localStorage key, on any change). **Phase 2 is built; waiting on Alex.**
- **Phase 3 (windows & context tags) built** — v0.5.0: tags next to each team in every match (previous / next window
  with first-leg scores, window streak, window advantage "REST", competitions alive 1C/2C/3C, Z4R, derby flag), a
  hover popup with the details, three display variants (Chips / Rail / Alerts, or Off) on the bar's "Tags" switch
  (`fk:tags:v1`, written only when picked). Relegation zone (direct places only) and the rivalry list confirmed by Alex.
- **Phase 4 (standings & competition pages), step 1 built** — v0.7.0: the Champions League page (bar: All clubs →
  UCL; `?view=ucl`, lazy chunk `UclPage.tsx`): the league-phase table rebuilt from results (`src/data/ucl.ts`; equals
  ESPN's table), 8 squares per row with the opponent's pot, zones, hover a place → its path and the places it meets,
  remaining opponents' pots, the rules with sources (`config/ucl.ts`, confirmed by Alex). v0.8.0: stakes chips from the
  eve of matchday 7 (`src/data/uclStakes.ts`: sure points bounds, every claim checked against random completions in
  tests/ucl-stakes.test.ts). Next: play-off + bracket (v0.9.0).
- **Live** at https://gauntlet-home.vercel.app/football/ (gauntlet rewrite → Vercel project `footykit`,
  footykit.vercel.app). Snapshot in Vercel Blob store `footykit-data` (gru1), rewritten to `/football/data/snapshot.json`
  in vercel.json; GitHub secret BLOB_READ_WRITE_TOKEN; repo variables SNAPSHOT_ENABLED=true and FOOTYKIT_SITE (the site
  the verify and freshness steps check).
- Every view is **in flux** (one smoke test each in e2e/smoke.spec.ts, no layout assertions).

## Where things live
- `config/season.ts` — followed-club rules, competitions per league, ESPN season years.
- `config/competitions.ts` — competitions shown and their codes; friendlies dropped.
- `config/neutral.ts`, `config/fifa-windows.ts`, `config/relegation.ts` (zone sizes, Z4R rule),
  `config/ucl.ts` (UCL pots, zones, tiebreakers, knockout pairings), `config/rivalries.ts` (derby list; `npm run check-rivalries` checks its sources answer) — researched facts with
  sources (for Alex to confirm).
- `config/venues.json` — every venue's place and elevation from Wikidata, each with its item (`npm run make-venues`:
  batched query-service lookups, keeps known venues; `config/venue-overrides.json` names the item for venues ESPN
  spells differently). Basemaps: `src/map/basemaps.ts` from `npm run make-basemaps` (Natural Earth via world-atlas).
- `src/data/espn.ts` — raw ESPN fields and ESPN → Match (`slimMatch`); only the job, `src/data/day.ts` and `ko.ts`
  import it (tests/build.test.ts checks). `src/data/snapshot.ts` — the snapshot shape the app reads.
- `src/data/` — model (days in the viewer's zone), form, series, windows, neutral, live (day-layer merge); Phase 3
  tags: `tags.ts` (one match's tags), `windows.ts` (windows around a match, streak, advantage), `alive.ts`,
  `z4r.ts`, `rivalry.ts`; drawn by `src/components/Tags.tsx`.
- `src/components/` — `Footy.tsx` (the widget: bar + view), `TopBar.tsx` (packed bar), one file per view (`DayList`,
  `Slate`, `TeamCalendar`, `TeamList`), `Bits.tsx` (shared parts), `Popups.tsx`, `Copy.tsx`, `page.ts` (page state,
  title, address). `src/App.tsx` — URL, history, title, today. `src/slate/` — notes store and note box.
- `api/day.ts` — Vercel function: one ESPN date's scores and odds (CDN 60 s hot / 10 min / 1 day).
- `scripts/update-snapshot.ts` (+ `scripts/snapshot/`) — the job; `fetch-logos.ts`; `make-fixture.ts`; `check-live.ts`;
  `data-check.ts` (Phase 1).

## Run, test
- `npm run dev` (port 5190 via .claude/launch.json; serves test-output/snapshot.json if present, else the fixture; real
  day function) · `npm run build` · `npm run preview` (4190: fixture snapshot, empty day layer).
- `npm test` (Vitest) · `npm run lint` · `npm run typecheck` · `npm run e2e` (Playwright smoke on fixture data; "now"
  fixed through `window.__FK_NOW__`).
- `npm run update-snapshot` (writes test-output/snapshot.json; `--upload` to Blob, `--raw` for fixtures) ·
  `npm run make-fixture` · `npm run fetch-logos`.
- CI (`.github/workflows/ci.yml`): version check, lint, typecheck, unit, build, e2e. `snapshot.yml` (every 3 h) and
  `freshness.yml` (every 4 h) run only once the repo variable SNAPSHOT_ENABLED is "true".

## Decisions in force
- Data source: ESPN's unofficial API (`site.api.espn.com`), no key. Club feed `soccer/all/teams/{id}/schedule`
  (+ `?fixture=true`), competition scoreboards, `apis/v2/.../standings`.
- A tie's winner comes from the aggregate / shootout scores, never from ESPN's per-match `winner` flag.
- Neutral venues come from researched config: ESPN's `neutralSite` is always false.
- A postponed event that was rescheduled under a new id is dropped.
- Friendlies and pre-season trophies are not shown; super cups, Copa do Nordeste and state championships are.
- Rows read AWAY 2 @ 1 HOME (calendarkit's layout); "v" instead of "@" at a neutral venue.
- Form (last 5) and streaks count every competition; the record is the league W-D-L.
- Free windows: MIDWEEK Tue–Thu, WEEKEND Fri–Mon; a window without a match is tinted on the Team Calendar.
- Travel map (calendarkit's travel view): Europe / South America by the venue; nothing focused = a dot per match with
  non-overlapping labels; hover or pin a row = both teams' last → this (solid) → next (dashed), straight-line km, the
  view fitted, a panel per team (no time-zone change: within a continent it says little). Venues at 2,000 m or more
  are marked by level (`config/altitude.ts`: moderate 1,500 m, high 2,500 m, very high 3,000 m, insane 3,500 m;
  confirmed by Alex), on the map and in the panel. Shown when the window leaves ≥ 420 px beside the list.
- Context tags (Phase 3) describe the match going in: standings from results before kickoff, competitions alive from
  the snapshot's fixtures (a cup counts once its tie is fixtured), windows of teams that aren't followed are "unknown",
  never "free". Z4R uses points only (a team level with the zone line is tagged; no tiebreaker invented); the zone is
  the direct relegation places only (Alex: "direct for now"; the Bundesliga's and Ligue 1's 16th, a play-off place, is
  outside it). Streak tag from 3 windows in a row.
- Copies are transparent; a Slate copy lays its cards out by the largest-cards rule (page 1920 × 911).

## Testing policy
Automate every check that can be automated: unit, integration, and end-to-end with Playwright, using throwaway data
the test creates and deletes itself. Manual steps only for what truly can't be automated (browser permission prompts,
judging feel/usability), kept to the minimum, each with the reason it can't be automated, one short step at a time.
Test tiers: every view is settled or in flux; new views start in flux (one smoke test each, no layout assertions);
logic (tables, tiebreakers, windows, simulator) always gets full unit tests.
