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

## Current state (2026-11-19, night)
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
- **Backlog FK-35 … FK-43 (2026-11-19)**: v0.48.0 FK-36 Slate strip 2 played + next 2 (`stripAround`). v0.49.0 FK-35 Slate cards
  in calendarkit's shape (`src/slate/layout.ts`, 509 × 78, header `slateHeaderLabel`). v0.50.0 FK-38 home team first on cards.
  v0.51.0 FK-40 game button (`GameLinks.tsx`, `config/injuryLinks.ts`). v0.52.0 FK-39 weather (Open-Meteo). v0.53.0 FK-42 Pts
  first. v0.54.0 FK-43 table after round N (`src/data/matchdays.ts`, rounds worked out from the schedule). FK-37, FK-41 blocked.
- **Backlog FK-44 … FK-48 (2026-11-19)**: v0.56.0 FK-44 no draw price on Slate cards. v0.57.0 FK-45 League view
  (`?view=league&comp=…[&mode=cal]`, lazy `LeagueView.tsx`, data `src/data/leagueView.ts`; reuses the table / UCL / cups pages).
  v0.58.0 FK-46 competition icon label (`src/data/compLabel.ts`; rounds algorithm moved to `src/data/leagueRounds.ts` so
  the main chunk can use it) and click → League view (`onLeague` in ctx). v0.59.0 FK-47 strip by window
  (`src/data/strip.ts`, replaces `stripAround`). v0.60.0 FK-48 strip ◀ ▶ (`shift` state in `FormGames`, not kept).
- **Backlog FK-49 … FK-56 (2026-11-19, night)**: v0.62.0 FK-51 no per-card copy. v0.62.1 copy fix (html-to-image `imagePlaceholder` for missing
  crests). v0.63.0 FK-52 Slate name box of one width, score column. v0.64.0 FK-53 strip squares 21 px. v0.65.0 FK-49 side month
  arrows (`SideArrows.tsx`, `monthStep` in page.ts). v0.66.0 FK-50 result streak (`src/data/streak.ts`, `Streak.tsx`; Slate card
  561 × 78 since FK-53 / FK-50). v0.67.0 FK-54 cup bracket zoomed to the first screen (`useFitBracket`). v0.68.0 FK-55 title picker.
  v0.69.0 FK-56 UCL simulator knockouts (`src/data/uclKoSim.ts`, `UclKoSim.tsx`, `Sim.ko`; draws swapped per section).
- **Backlog FK-57 … FK-64 (2026-11-19, late night)**: v0.71.0 FK-57 position arrows (`movesAfter` in matchdays.ts). v0.72.0 FK-58
  Extra tools menu (`ExtraTools` in TopBar.tsx; Trailing lives there). v0.73.0 FK-59 World Cup history (`?view=wc&year=…[&team=…]`, lazy
  `WorldCupPage.tsx`, logic `src/data/worldcup.ts`, data `public/worldcup/` from `npm run make-worldcup`: Fjelstul database CC-BY-SA 1930–2022,
  openfootball 2026, Annex C thirds table from Wikipedia; checked against Wikipedia tables in tests/worldcup.test.ts). v0.74.0 FK-60 World Cup
  simulator (`&sim=1`, `src/data/wcSim.ts`, `WorldCupSim.tsx`; pairings read from the real bracket; picks in `fk:wcsim:v1`). v0.75.0 FK-62 live
  scores pop-out (Document PiP, `LivePopout.tsx`, `src/data/popout.ts`; state in Footy so it survives navigation). v0.76.0 FK-64 competition history
  (`?view=history&comp=…&season=…`, lazy `HistoryPage.tsx`, `src/data/history.ts`, data `public/history/` from `npm run make-history`, ESPN
  `scoreboard?dates=YYYY` + `standings?season=`; leagues checked against football-data.co.uk). FK-61, FK-63 blocked.
- **FK-65 (2026-11-20)**: v0.78.0 shared layout (backlogkit's NAV_PATTERN.md): pinned header `Header.tsx` (back / forward, breadcrumb with
  sibling menus, Go anywhere on Ctrl+K, icon buttons, Where tabs Today · Clubs · Leagues · Cups · Tools), page rows `PageRows.tsx` (What chips /
  strips, How switch, date controls); the logic is pure in `nav.ts` (tests/nav.test.ts, e2e/nav.spec.ts). TopBar.tsx and every What `<select>` are
  gone; new address forms `?view=clubs`, `?view=cups&cup=…&sim=1`, `?view=wc&…&how=groups`; every old form still opens its page.
- **FK-66 (2026-11-20)**: v0.79.0 World Cup quality pass: editions read in the same render once arrived (`peekEdition`), two either side preloaded and their tables precomputed (`editionView`, WeakMap), the last edition kept dimmed while a new one loads, plain-word hovers (`Th`, `STAGE_TIP` in WorldCupPage.tsx), rows / scores / champion / simulator teams clickable (e2e/wc-quality.spec.ts).
- **FK-67 (2026-11-20)**: v0.80.0 ▶ full-match links on 2026 World Cup matches (`Play` in WorldCupPage.tsx; `public/worldcup/2026-videos.json`, match number → YouTube id, from `npm run make-wc-videos`: yt-dlp lists CazéTV's "Jogos Completos" playlist, `src/data/wcVideos.ts` pairs titles to matches with the Portuguese names in `config/wcNamesPt.ts`; an edition in `WC_VIDEO_YEARS` arrives together with its videos, so the ▶ never shifts the page).
- **FK-69 / FK-70 (2026-11-20)**: v0.81.0 the World Cup bracket as match cards joined by lines and its Poster mode (`WcBracket.tsx`, `wcBracket.css`; logic `src/data/wcBracket.ts` (which card feeds which, champion's path, poster tiles), `src/data/wcVenues.ts` (roof tag, weather only under the sky), `src/data/wcFlags.ts`). Lines are an SVG measured from the cards (`useLines`: `data-slot` / `data-feeds`). Data: `config/wcStadiums.ts` (researched, for Alex to confirm) → `npm run make-wc-venues` → `public/worldcup/2026-venues.json` (Wikidata coordinates, Open-Meteo archive weather; arrives with the edition like the videos); `npm run make-wc-flags` copies flag-icons (MIT) to `public/worldcup/flags/`. No zoom on this bracket (text ≥ 12px, sideways scroll when narrow). FK-68 blocked (cxm-api.fifa.com not readable from Claude Code).
- **FK-71 (2026-11-20)**: v0.82.0 the World Cup thirds race (`src/data/wcRace.ts`: matchdays, `race()` = tables at a point + certain statuses (points-only reasoning over every win / draw / loss left, never wrong, sometimes Open longer), `standing()`, `matchups()`, `picksFrom()`; UI `WcRace.tsx`, `wcRace.css`). Page state `wcAt` (`&at=1|2`); the simulator from a point keeps its picks under `"<year>@<matchday>"` in `fk:wcsim:v1` and runs `simulate(…, asStands)`. Only editions with `thirdsTable` (2026).
- **FK-72 / FK-73 / FK-74 (2026-11-21)**: v0.83.0 the relegation race (`?view=relegation&league=…`, Leagues' How "Relegation", lazy `RelegationPage.tsx`; logic `src/data/relegation.ts` (who is listed: the Z4R rule over the ranked table, play-off place always), rules box `src/data/relegationRules.ts` (`PLAIN_TIEBREAK`: a plain twin for every `tiebreakText` line, a test fails on a new line without one); the odds column's spot is marked in the table head, IDEAS I-15). The Slate card's stadium line (`VenueLine` in Slate.tsx, card 561 × 96; `src/data/homeGround.ts`: usual ground = more than half of the home matches and at least 3, same Wikidata item = same stadium; overrides in `config/homeGrounds.ts`). The edition dropdown (`EditionPicker.tsx`: the World Cup's What row and the History page's season; the champions list still opens a season). FK-61, FK-63, FK-68 blocked.
- **FK-75, first part (2026-11-21)**: v0.84.0 the page's controls inside the header's tabs row where they fit: `controlsInHeader(page, width)` in nav.ts (Today and Clubs, widget ≥ `HEADER_CONTROLS_MIN`); `PageRows` draws either `.fk-head-controls` (passed to `Header` as `controls`, one line, no What / How labels) or the old rows under the header (Leagues, Cups, Tools, narrow windows). "All clubs" button (`all-clubs`) replaces the club box's ×. FK-75 stays in the backlog, blocked on the three places that don't fit (e2e/fk75.spec.ts).
- **FK-61 / FK-68 (2026-11-21)**: v0.85.0 the Slate's Countdown button (`CountdownButton` in Slate.tsx; `src/data/countdownLink.ts`: the first match not yet kicked off → halftime-timer's `?end=…&name=…` link). Full-match ▶ on the 2022 World Cup: every `<year>-videos.json` is now match number → full address (2026's ids widened; `wcVideoUrl` still takes a bare id), the hover by source (`wcVideoTip`: FIFA+ / FIFA's YouTube / CazéTV); `npm run make-wc-fifa-videos` reads FIFA's video sitemap (cxm-api.fifa.com, 33 pages) for "Full Match Replay" pages and FIFA's YouTube (yt-dlp) for the rest, paired by title (`editionNames`, `isFullMatchOf`, `preferFirst` in wcVideos.ts); 12 of 64 matches have one. `npm run check-wc-videos` is the live check that every address answers.
- **FK-75, the rest (2026-11-21)**: v0.86.0 every place's controls in the header's tabs row (`HEADER_CONTROLS_MIN` per place in nav.ts; narrower windows keep rows under the header). The league / competition buttons are one box, `CompPicker.tsx` (the club box's look and keys; lists from `leagueOptions` / `cupOptions` / `toolCompOptions`; testids `what-league` / `what-cup` / `what-comp` on the box, `comp-picker` on its input, options carry `data-value`). Order: Leagues box · How · Day / Week · dates; Cups box · year box · How; Tools box · "Trailing". The `Chips` row is left only for the tool. Today's day strip and a club's title row stay (owner: page content).
- **FK-76 / FK-77 (2026-11-21)**: v0.87.0 the Slate kit, calendarkit's way: `src/slate/kit.ts` (the Slate part's exports + `SLATEKIT_API`) built by `vite.slatekit.config.ts` after the app into `dist/slatekit/` (one ES module, its stylesheet, `manifest.json` { api, version, js, css }, no-cache in vercel.json at `/slatekit/` and `/football/slatekit/`); React is the host page's (`globalThis.__footykitHost` = { react, jsxRuntime, reactDom }). FK-77: `SlateMatchCard` (one match's card alone: the Slate's own `SlateCard` in the same frame as `SlateDay`, `SlateFrame` in SlateDay.tsx) and `slateMatches(data, day)` / `slateDayOf(instant)` (src/slate/matches.ts: the combined Slate's day = São Paulo time from 05:00; footykit's own Slate still uses the viewer's day from midnight). Day requests on their way are shared (`fetchDay` in useLive.ts). `npm run e2e:live-kit` runs e2e/slatekit.spec.ts against the live site. Guide: docs/slate-in-gauntlet.md.
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
- `config/injuryLinks.ts` — each followed club's Transfermarkt injuries page (FK-40, Wikidata P7223, each page checked).
- Weather (FK-39): `src/data/weather.ts` (Open-Meteo request / answer, forecasts only), `src/slate/weather.ts` (the
  page's store: one request for a day's venues, a venue at most hourly); `npm run check-weather` is the live check.
- `config/venues.json` — every venue's place and elevation from Wikidata, each with its item (`npm run make-venues`:
  batched query-service lookups, keeps known venues; `config/venue-overrides.json` names the item for venues ESPN
  spells differently). Basemaps: `src/map/basemaps.ts` from `npm run make-basemaps` (Natural Earth via world-atlas).
- `src/data/espn.ts` — raw ESPN fields and ESPN → Match (`slimMatch`); only the job, `src/data/day.ts` and `ko.ts`
  import it (tests/build.test.ts checks). `src/data/snapshot.ts` — the snapshot shape the app reads.
- `src/data/` — model (days in the viewer's zone), form, series, windows, neutral, live (day-layer merge); Phase 3
  tags: `tags.ts` (one match's tags), `windows.ts` (windows around a match, streak, advantage), `alive.ts`,
  `z4r.ts`, `rivalry.ts`; drawn by `src/components/Tags.tsx`.
- `src/components/` — `Footy.tsx` (the widget: header + rows + view), `Header.tsx` / `PageRows.tsx` / `nav.ts` (FK-65 layout), one file per view (`DayList`,
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
- Rows read AWAY 2 @ 1 HOME (calendarkit's layout); "v" instead of "@" at a neutral venue. Slate cards are the exception
  (FK-38, owner): the home team on the first line, the away team on the second, no "@".
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
