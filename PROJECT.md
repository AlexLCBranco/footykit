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
  tests/ucl-stakes.test.ts). v0.9.0: the knockout section (`src/data/uclBracket.ts`, `UclKnockout.tsx`): play-off
  sections, round-of-16 letters, quarter-finals, semis, final from ESPN's ties; projected from the table until the
  draws; halves only once the semi-finals show them. Tested on the recorded 2025-26 season
  (tests/fixtures/ucl-2025-26.json, `npm run make-ucl-fixture`). v0.10.0: league tables (bar: Tables + league picker,
  `?view=table&league=…`, lazy `LeagueTablePage.tsx`): rebuilt with each league's ties-on-points rules
  (`src/data/leagueTable.ts`, `config/leagues.ts`; equals ESPN's tables), last 5 + next 3 squares, zones (possible
  places hatched). v0.11.0: the Brasileirão's places from CBF's REC 2026 (`src/data/braPlaces.ts`: pass-down read
  literally, finals still to play worked out both ways, hatched places say which results give them). v0.12.0: the Cups tab
  (`?view=cups&cup=…`, lazy `CupsPage.tsx`): Libertadores / Sudamericana bracket ordered from the ties, group tables
  (`src/data/cups.ts`, `config/conmebol.ts`), qualifying ties. v0.13.0: the seven domestic cups on the same tab
  (`config/domesticCups.ts`; ESPN's "TBD" teams are open slots).
- **Phase 5 (what-if simulator), steps 1–2 built** — v0.14.0: the UCL simulator (`?view=whatif`, "What-if" on the UCL page,
  lazy `WhatIfPage.tsx`; logic `src/data/whatif.ts`): the matches left (Pending first, by matchday), a click cycles
  1-0 / 1-1 / 0-1 / empty, keys 1 X 2 then next, typed scores, bulk fill (home / favourites by pot / draws), re-roll,
  lock, clear, undo / redo, one-team filter; the table (uclTable over the picks, ▲▼ against the real one) and the
  knockout places with pair-mates in opposite halves. Picks in `fk:whatif:v1`; a real result replaces a pick. v0.15.0: saved named scenarios
  (`WhatIfScenarios.tsx`): one click or Alt+1–9 switches, "•" = changed since saved, Save / Save as / rename / delete
  (second click), a picked team's place in each scenario; kept in the same key. v0.16.0: the six leagues' simulator
  (`?view=whatif&league=…`, "What-if" on the Tables page, lazy `LeagueWhatIfPage.tsx`; shared parts
  `WhatIfParts.tsx`): the matches left by window (Weekend / Midweek), favourites = higher in today's real table, the
  full table with zones (rankTable over the picks); each competition's picks and scenarios kept apart in
  `fk:whatif:v1` (the UCL's at the top level, the others under `comps`). v0.17.0: the Brasileirão's Libertadores /
  Sudamericana places live over the picked table (`braRowZones`, shared with the Tables page), the Sudamericana,
  Libertadores and Copa do Brasil finals pickable by winner (`Sim.winners`; an open final counts both ways, a played one
  drops the pick).
- **Feature backlog (2026-11-15, 10 items, in order, one commit each)**: v0.25.0 item 10, every match link is a Google search
  (`matchUrl(m, model)`: "Home vs Away Mon D YYYY", full names, the local day), new tab; ESPN is the data source only.
  All 10 items done. v0.24.0 item 9, Team List rest days as calendarkit's: a quiet "Rest"
  row per day without a match between the club's first and last match (`restDays` in model.ts), "Rest days" on the bar
  (on at every load, unchecking lasts until a reload, not in the address); no break label. v0.23.0 item 8, a team-name click (and the Slate part's
  teamCalendarUrl) opens the Team Calendar in month span on the current month (`teamClickPage`); a span picked after
  sticks until the next click. In the simulators a team name still filters the matches (Alex: keep the filter). v0.22.0 item 7, pot badges gone from the UCL table, its squares and
  the simulator (the pot stays in the tooltips; the Left column lists the opponents' codes); a Pots tab on the UCL page
  (`?view=ucl&tab=pots`): 4 columns of 9 from `UCL_POTS`. v0.21.0 item 6, "Reset" beside the matchday (window) header empties
  that one's picks, locked results kept, one undo step; shown only while it has a pick to empty. v0.20.0 item 5, no scrollbars inside tables: every table goes
  through `SplitTable.tsx` (2–3 side-by-side tables, header repeated, rows split evenly; 1 column and the page grows when
  the width won't hold 2); the simulators' table column and the quick standings popup grow instead of scrolling (a popup
  taller than the window sits on the page). v0.19.1 item 4, simulator team codes in a fixed slot (four
  bold letters fit, longer ones end in "…"), so the badge after them never covers them at any window width. v0.19.0 item 3, the simulators show one matchday (a
  league: one window) at a time, opening on the next to play, ◀ ▶ beside its header or ← → to step (`useGroupNav` in
  `WhatIfParts.tsx`); fills, Clear and the counts still cover every match left. v0.18.1 item 2, "What-if" shown as "Simulator"
  everywhere (buttons, headings, tab titles; code names and `view=whatif` addresses unchanged, so old links still work).
  v0.18.0 item 1, goals while trailing
  (`?view=trailing&comp=…`, "Trailing" on the bar, lazy `TrailingPage.tsx`; logic `src/data/trailing.ts`): the goals
  each team scored while the other side was ahead, per competition, for the competitions whose goals ESPN gives in
  full (audit in docs/HISTORY.md). The snapshot now keeps each match's goals (`Match.g`).
- **Backlog FK-27 … FK-34 (2026-11-16)**: v0.41.0 FK-27 today highlighted in the Team List (`fk-is-today`, a "No match"
  line when today has none). v0.42.0 FK-29 the UCL tab is gone: the Champions League is the first entry of the Cups picker
  (`UCL_SLUG` in page.ts; `?view=ucl` and `?view=cups&cup=uefa.champions` open it). v0.43.0 FK-30 a simulator on every cup
  page (`src/data/cupSim.ts`, `CupSim.tsx`): picks only, unfixtured rounds list the clubs through without pairing them;
  picks per cup in `fk:whatif:v1` comps. v0.44.0 FK-31 / FK-32 the Slate card's score beside the name and its last games
  as crest squares (`FormGames`, `FormLine.games`). v0.45.0 FK-33 calendarkit's season series popup (`seriesStatus`).
  v0.47.0 FK-28 each team's domestic league place beside its name (`LeaguePos`, `src/data/position.ts`; owner: Slate + list rows, small muted "3rd").
  v0.46.0 FK-34 the Tags setting in plain words with descriptions (`TagVariantPicker`; values in `fk:tags:v1` unchanged:
  chips = All tags, rail = Window strip, alerts = Highlights only, off = Hide tags). FK-26: no bug (owner confirmed the count).
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
- `npm run update-snapshot` (writes test-output/snapshot.json; `--upload` to Blob, `--raw` for fixtures, `--from raw.json.gz`
  to rebuild from saved payloads without fetching) ·
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
- Match links: a Google search, never ESPN (Alex, backlog item 10).
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
- Goals while trailing (Alex): any goal scored while the other side leads at that moment, levelling or not; own goals
  for the side credited; extra time counts, shootouts don't. A match's goals are kept only when they add up to the
  score; competitions with gaps (Copa do Brasil, Copa del Rey, Coupe de France, state championships, super cups) are
  left out of the page (`TRAILING_COMPS`).
- No scrolling box around a table (Alex): tall tables split into 2–3 columns (`SplitTable`); list columns of matches
  (simulator Pending / matchday) may still scroll, they are not tables.
- Copies are transparent; a Slate copy lays its cards out by the largest-cards rule (page 1920 × 911).

## Testing policy
Automate every check that can be automated: unit, integration, and end-to-end with Playwright, using throwaway data
the test creates and deletes itself. Manual steps only for what truly can't be automated (browser permission prompts,
judging feel/usability), kept to the minimum, each with the reason it can't be automated, one short step at a time.
Test tiers: every view is settled or in flux; new views start in flux (one smoke test each, no layout assertions);
logic (tables, tiebreakers, windows, simulator) always gets full unit tests.
