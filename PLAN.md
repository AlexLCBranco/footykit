# footykit — PLAN

## Status
- **Phase 1 (data check)**: done 2026-11-14 — ESPN covers every required check for all 54 clubs. Report:
  `docs/phase1-report.md`; per-club table: `docs/phase1-data-check.md`. Alex's answers recorded below.
- **Phase 2**: built (v0.4.0, 2026-11-14), waiting on Alex — PROJECT.md "Current state" lists what is built.
- **Phase 3**: built (v0.5.0, 2026-11-14), waiting on Alex — tags in three variants (Chips / Rail / Alerts); to
  confirmed: relegation zone (direct places only) and the rivalry list.
- **Phase 4**: plan agreed 2026-11-15 (Decisions log); step 1 (UCL page, v0.7.0) and step 2 (stakes chips, v0.8.0) and step 3
  (play-off + bracket, v0.9.0) built, waiting on Alex's look. League tables (v0.10.0) built; next: the Brasileirão
  pass-down engine once CBF's rules are found, then Libertadores / Sudamericana and the cups.
- Phase 5: not started.

## Decisions log
- 2026-11-14: Menu = calendarkit's **packed bar** (Alex). Copy that one in Phase 2; the rail is not ported.
- 2026-11-14: ESPN's free API is the only source (no fallback needed; football-data.org / API-Football not tested).
- 2026-11-14: neutral venues from researched config (ESPN's `neutralSite` is never true); tie winners from aggregate /
  shootout scores; rescheduled postponed events dropped.
- 2026-11-14: tests use recorded ESPN fixtures (ESPN refuses headless Chromium).
- 2026-11-14, Alex confirmed the Phase 1 questions:
  - Snapshot lives in **Vercel Blob** (one overwritten file). Alex said yes to creating the Blob store on the Vercel
    project and adding its token as a GitHub secret; that setup happens in Phase 2.
  - Refresh: snapshot every 3 h + same-origin live day function (CDN 60 s while matches are live/near, 10 min otherwise,
    1 day for past dates).
  - State championships: show the four ESPN has (Carioca, Paulista, Mineiro, Gaúcho); the others are skipped (warning).
  - 3-way odds from ESPN (DraftKings), decimal, in the Slate only.
  - Premier League kickoff times: taken as given from ESPN for now; revisit if they move a lot.
- 2026-11-14 (Phase 2): friendlies dropped, every other competition shown; the snapshot is footykit's own slim shape
  (~100 KB gzipped); the day function is keyed by ESPN (US Eastern) date; neutral venues and FIFA windows live in
  config with sources, for Alex to confirm.
- 2026-11-14 (Phase 3): tags describe the match going in (standings before kickoff); Z4R on points only; relegation
  zone = direct places; competitions alive only from fixtured matches; teams
  outside the followed clubs get "unknown" windows; streak tag from the 3rd straight window; derby list hand-made in
  config with Wikipedia sources.
- 2026-11-14, Alex: the Z4R zone is the direct relegation places only, for now (play-off places outside it).
- 2026-11-14, Alex: the rivalry list (config/rivalries.ts, 41 pairs) confirmed as drafted.
- 2026-11-14, Alex: the neutral-venue rules (config/neutral.ts) confirmed.
- 2026-11-14, Alex: the 2026 FIFA windows confirmed; 2027 stays provisional (re-check before March 2027). Brasileirão
  matches inside a window stay shown, flagged FIFA (South American clubs keep playing).
- 2026-11-14, Alex: altitude by levels instead of one 2,000 m mark — moderate 1,500 m, high 2,500 m, very high 3,000 m,
  insane 3,500 m (config/altitude.ts, sources there; 3,500 m is footykit's own line).
- 2026-11-14, Alex: the Brasileirão's code is BR (was BSA); friendlies and pre-season trophies stay hidden, super cups,
  Copa do Nordeste and state championships shown.
- 2026-11-14, Alex: the Bagé venue ESPN calls "Estadio Antonio Magalhães Rossel" is Guarany FC's Estádio Antônio
  Magalhães Rossel, Wikidata Q10276776 (config/venue-overrides.json); no stadium elevation, Bagé is 212 m. Every venue
  in the snapshot is now on the map; Phase 2 has no open confirmations left.
- 2026-11-15, Alex confirmed the UCL 2026-27 facts in config/ucl.ts (UEFA 2026/27 regulations Art. 18-19, Wikipedia):
  pots (checked against the drawn fixtures), zones 1-8 / 9-16 / 17-24 / 25-36 (no Europa drop), the ten tiebreakers,
  play-off and round-of-16 pairings by position, no country protection, no away goals.
- 2026-11-15, Alex: UCL ties are ranked by criteria 1-5 during the league phase (teams still level shown equal) and
  1-8 once it is over; ties left after 8 (cards, club coefficient) are flagged, not guessed.
- 2026-11-15, Alex: Phase 4 build order: (1) v0.7.0 UCL page (table, 8 squares per row with pots, zones, tiebreak
  rules, position -> path hover, remaining opponents); (2) v0.8.0 stakes chips, points-only, from matchday 7;
  (3) v0.9.0 play-off round + bracket with aggregates; then the league tables. Each step stops for Alex's look.
- 2026-11-15, Alex confirmed the UCL bracket (Art. 19, checked against the 2025-26 bracket): R16 ties A 1/2 v winners
  of IV, B 3/4 v III, C 5/6 v II, D 7/8 v I; each half has one of each; quarter-finals A v D and B v C; halves are
  drawn. The page projects from the table until the draws and shows halves only once the semi-finals show them.
- 2026-11-15, Alex confirmed the league facts in config/leagues.ts (Wikipedia season pages, 2027-28 UCL access list):
  places per league (EPS 5th and cup pass-downs hatched as possible; England's Conference League place unknown),
  relegation, and each league's ties-on-points order.
- 2026-11-15, Alex: league rows show the last 5 results + the next 3 matches as squares.
- 2026-11-15, Alex: Brasileirão "base now, engine later": base places (1-4 Libertadores group stage, 5th preliminary,
  6-11 Sudamericana per English Wikipedia, 17-20 down) plus a box of the finals that can open more places; the
  automatic pass-down waits for CBF's own rules (sources disagree on the stage a passed-down place enters).
- Not available free (stays on the Later list): injuries, suspensions, call-ups (ESPN fields empty / absent).

---

# footykit — soccer calendar & league understander (NEW PROJECT)

## Context
I already have calendarkit (NBA calendar), public repo github.com/AlexLCBranco/calendarkit, live at gauntlet-home.vercel.app/calendar. It's installed into the gauntlet-home app as a package pinned to a commit, like Boardkit and Linkkit, so everything shares browser storage with my gauntlet whiteboard.

footykit is the soccer equivalent: a SEPARATE repo/package, installed the same way into gauntlet-home at the route /football.
- Read calendarkit's PROJECT.md first. Its rules, behaviour decisions and engineering setup are the starting point for this project unless this plan says otherwise.
- Copy whatever is useful from calendarkit (views, copy-as-image, Slate, marquee, squares popups, floating popups, test setup, data job). Do NOT build a shared "core" package between them. Copy now; we'll extract shared pieces later only if real duplication hurts.
- Load footykit only on its route, so the NBA side never downloads soccer code.
- Desktop only, full-size window. Top priority, always: fluidity and speed. Nothing may make the site slow or janky.
- All times in the browser's time zone. I'm in Brazil.

## Hard rules
- Never invent facts: competition rules, berth counts, tiebreakers, pots, pairing rules, FIFA window dates, rivalries, neutral venues. Research them, write them into a per-season config file with a source link for each, and list them for me to confirm. If you can't find something, say so.
- Automate every test you can. I want to test by hand only what truly can't be automated.
- Work in phases. At the end of each phase, stop, summarize what was built and anything I need to confirm, and wait for me.
- First step: create the repo and save this whole plan as PLAN.md. Keep it updated with decisions and status.

## Engineering rules (from day 1, learned from calendarkit)
- PROJECT.md stays short: current state, rules, decisions in force. Old rounds and history go in docs/HISTORY.md.
- Comments explain why the code is the way it is. No history in comments ("round N", "since vX.Y").
- ESLint (typescript-eslint + react-hooks) in CI from the first commit.
- Every app change bumps the version in package.json; CI enforces it. Version shown bottom-right with commit and build time in its tooltip.
- Every fix gets a test that fails on the old code.
- One component per view/destination from the start. No giant shell file.
- Test tiers: every view is "settled" or "in flux". New views start in flux: one smoke test each (loads, shows the right matches for a fixed date, no console errors), no layout or position assertions. A view becomes settled only when I say so, then gets full e2e. Logic (tables, tiebreakers, windows, simulator) always gets full unit tests.
- Perf guard like calendarkit's `npm run perf`, in CI.
- Widget API like calendarkit's: components take `data` + `size` (+ optional `now` / `timeZone`), raise events, never touch the URL. At rest, the Slate part starts no timer and no animation frame.

## Shared origin with calendarkit
- All localStorage keys use their own prefix `fk:` (calendarkit uses `ck:`). Same origin, so collisions are real bugs.
- Slate notes must be included in the same backup the gauntlet uses (local storage + backup file in a folder on disk), not left only in localStorage. Check the gauntlet repo for the current state of that backup before building it.
- The Slate part follows calendarkit's current Slate API (gameLink, teamCalendarUrl, team-link context) so the gauntlet widget works without special cases. See calendarkit's docs/slate-in-gauntlet.md.

## Teams covered
- All Premier League teams
- La Liga, Serie A, Bundesliga teams that are in the current Champions League
- PSG (plus a way to add exceptions in config)
- All 20 Brasileirão Série A teams
- The followed-teams list lives in config (it changes every season), not hardcoded.

Each team gets its FULL schedule across every competition it plays: league, domestic cups, continental competitions (UCL/Europa/etc., Libertadores, Sul-Americana).
State championships (Carioca, Paulista, etc.): include if a free source has them. If not, skip without blocking anything.

## PHASE 1 — Data check (no UI). Stop after this phase.
Candidate source: ESPN's unofficial API (free, no key). Reported endpoint for a team's matches across ALL competitions:
  site.api.espn.com/apis/site/v2/sports/soccer/all/teams/{teamId}/schedule?fixture=true   (upcoming)
  same URL without ?fixture=true                                                          (played)
Verify this works; don't assume it.

Write an automated script that checks, for EVERY team on the list, and outputs a pass/fail table:
- returns data at all
- includes league matches
- includes domestic cup matches (FA Cup, Carabao Cup, Copa del Rey, Coppa Italia, DFB-Pokal, Coupe de France, Copa do Brasil)
- includes continental matches (UCL etc., Libertadores, Sul-Americana)
- state championship matches (reported as a WARNING, not a failure)
- kickoff times present; TBD/postponed matches handled
- whether eliminations from cups can be detected reliably (no further fixtures vs. next round still TBD before the draw)
- standings available for each league, the UCL league phase, and the Libertadores/Sul-Americana groups
- knockout data available for brackets (two-leg ties, aggregates)
- venue data per match (needed for the map and for neutral venues)
- whether 3-way odds (home/draw/away) are available for free
- REPORT ONLY (not in v1): national-team call-ups; suspensions (yellow-card accumulation, red cards); injuries/absences. Say whether a free source has each.

Also answer these, since they decide the architecture:
- Can ESPN be called from the browser (CORS), or only from a server job / API route?
- How often do scores and fixtures need refreshing? Soccer finishes matches at many times a day across ~20 competitions, unlike the NBA's mostly-night slate, so calendarkit's once-a-day snapshot is probably not enough. Propose a refresh schedule.

If ESPN fails anything required, test fallbacks:
- football-data.org free tier (I believe it lacks domestic cups)
- API-Football free plan (100 requests/day; check whether the current season is accessible)
Report results. Required = league + domestic cups + continental competitions for every team. If no free source covers the required set, stop and tell me; don't build.

Design the data pipeline, based on calendarkit's:
- Scheduled GitHub Action writes a static snapshot that keeps only the fields the app reads (calendarkit's went from 4.1 MB to 0.6 MB once trimmed), with a test that fails if code starts reading a dropped field.
- Verify-deploy step and a freshness alarm, like calendarkit's.
- Decide up front where snapshots live (data branch, Vercel Blob, or other). calendarkit's daily snapshot commits are already an open problem for repo growth, and footykit will have more data.
- Team and competition logos are local files in the repo, never loaded from ESPN's CDN at runtime.

## PHASE 2 — Calendar core
WAIT before the UI part of this phase: calendarkit is trialling two menus (rail vs packed bar). Ask me which one won and copy that one. Data and logic work isn't blocked.

Port from calendarkit, adapted to soccer:
- Team calendar (1 week / 2 weeks / month) and team list (one month at a time, with a "load earlier" button)
- Free windows marked on calendar views (see Windows below), on by default. No rest-day counts.
- Main view: all covered teams' matches for one day, one day at a time (arrows, date picker strip, Today button). This is a first version; I'll adjust after using it.
- "No games today" days shown, never skipped
- Final scores on finished matches, same layout as calendarkit: [logo] TEAM 2 @ 1 TEAM [logo]. Kickoff time only for upcoming matches, no empty space around the @.
- Competition marker on every match: small competition logo, code on hover (e.g. PL, LL, UCL, CDR, CDB, LIB)
- Neutral-venue matches clearly highlighted (which matches are neutral comes from data/research, not assumption)
- Records, streaks and last-5 form follow calendarkit's rule: a finished match shows the line including that match; an upcoming match shows the line going in.
- Clickable everything: a team (name or logo, anywhere, including cards) opens its Team Calendar (not the list); a match goes to the ESPN match page. Something must always happen on click.
- Season series popup: every meeting between the two teams this season across all competitions, as clickable squares. For two-leg knockout ties, show the aggregate.
- Quick standings popup available anywhere a team appears: movable by its header, resizable by edges/corners, position remembered, "↺" resets (like calendarkit's).
- Behaviour copied from calendarkit: a fresh visit opens on today; a reload keeps the page (day, view, scroll) from history.state; page history ← → with real browser history entries; the tab title follows the page; defaults are never saved until a settings page exists.
- Copy as image (per match, whole day, marquee selection), largest-cards rule, transparent background, fits one whiteboard page.
- Slate (day cards), ported from calendarkit's current version: notes under the team rows at full card width, capped at 5 lines with their own scrollbar, PRE / LIVE / POST switch in the card's top-right corner, opens with notes hidden, gauntlet widget compatible. Card as compact as possible.
- 3-way odds in decimal, in the Slate only, ONLY if free (from the Phase 1 check). Otherwise skip.
- Continent map next to the day list (South America for Brazilian teams, Europe for European ones). Base it on calendarkit's map design in docs/specs/map-travel-view.md (distance each team travelled since its previous match and to its next, drawn on the map, panel underneath with date and time of each match), not a new design. Add altitude venues marked (matters for Libertadores trips). Map is not included in image copies.
- FIFA international window marker on all calendar views (dates in config, researched). In Europe club football stops then; the Brasileirão usually keeps playing, so flag Brasileirão matches inside FIFA windows.
- Dropped from calendarkit: national TV badge, US map, B2B / 3-in-4, rest-day badges, road trips/homestands, NBA Cup view.

## PHASE 3 — Windows & context tags (replaces B2B and rest days)
Soccer fatigue is about windows, not days or hours. A team playing in both windows of a week is playing twice a week and rotating players.
Each week has two windows: MIDWEEK (Tue–Wed–Thu) and WEEKEND (Fri–Sat–Sun–Mon).

Next to each team in every match, show compact tags, with a detailed hover popup:
- Previous window and next window: free / league match / cup or continental match (with first-leg score for two-leg ties, e.g. CDB 2-0)
- Window streak: how many windows in a row the team has played (e.g. "5th straight window" = two matches a week for 2½ weeks)
- Window advantage: flag the match when one team played the previous window and the other had it free
- Competitions still alive (1C / 2C / 3C). Context: a league match before a big cup match is likely a "filler" with rotated players.
- Z4R (relegation race), same rule for every league's relegation zone:
  - rounds 1–8: tag only if the team is IN the zone or within 1 point of the last team in it
  - round 9 onward: tag if in the zone or within 3 points of the zone line
  - hover shows the exact gap ("2 pts above Z4")
- Derby / rivalry flag (e.g. São Paulo × Corinthians). Hand-maintained rivalry list in config; draft it for all covered leagues and I'll correct it.
- NOT included: "must win" and "G6 race / Libertadores race". Those are feelings, not data.
Build 2–3 different display variants of these tags with a toggle to switch between them, so I can compare them in real use.

## PHASE 4 — Standings & competition pages
This is the big one. It needs to become an insane league viewer/understander over time; this phase is a solid v1 to improve on.

### Champions League page FIRST (the flagship; build it best)
- League phase table, all 36 teams, with 8 squares per row (one per opponent), like calendarkit's NBA Cup standings squares:
  - played = result, upcoming = opponent + date
  - vs/@ before the team code (home/away visible without hover)
  - each square marks the opponent's pot (pots in config, researched)
  - clickable to the ESPN match page; hover shows full info
- Zones: 1–8 straight to the round of 16, 9–24 knockout playoff, 25–36 out. Verify this season's format; don't assume.
- Hover a position to see where it leads in the playoff/bracket (pairing rules researched, in config, for me to confirm)
- Remaining opponents per team (who and which pots)
- Stakes chips ("what it needs"), like calendarkit's Cup stakes chips: shown only when decisive, mainly in the last two rounds of the league phase. Same engine as the tables and simulator.
- Playoff round + bracket with aggregates on the same page

### Then all other competitions
- League tables: Premier League, La Liga, Serie A, Bundesliga, Ligue 1, Brasileirão
- Libertadores / Sul-Americana: groups, then knockout bracket
- Domestic cups: bracket with two-leg aggregates where applicable
- State championships: calendar only, no standings
- Every table row gets the same squares (results + upcoming matchups)
- Columns: played, W/D/L, goals for/against, goal difference, points, last-5 form
- Tiebreak rules for each competition shown on the page (researched)
- Zones colored by meaning: UCL / Europa / Conference / Libertadores group stage / pre-Libertadores (qualifying rounds, different color) / Sul-Americana / relegation. All from the per-season config.
- Brasileirão: Libertadores berths are NOT fixed. When cup winners (Copa do Brasil, Libertadores) already finish in the top spots, berths pass down the table. Show base spots plus possible extra spots, updating as those competitions are decided. Research the current season's exact rules; don't guess.
- Condensed standings popup anywhere a team appears (the movable one from Phase 2), plus the full standings page.

## PHASE 5 — What-if simulator
For the UCL league phase first, then groups (Libertadores/Sul-Americana), then leagues.
- Table AND bracket side by side, both updating live on every result. No "calculate" button, no scrolling between them.
- Speed is the whole point (existing simulators take 100x too long):
  - one click on a match cycles home win / draw / away win; typing a score is optional, for when goal difference matters
  - keyboard: 1 / X / 2 sets the result and jumps to the next match
  - bulk fill: all home wins / favorites / draws, then override individual matches
  - lock results, clear the rest, re-roll
  - undo / redo
- Organized by what's LEFT to play, not by round. Postponed matches from earlier rounds go in an always-visible "Pending" section at the top. Filter to one team's remaining matches.
- Correct tiebreakers (from config)
- Saved, named scenarios, switchable with one click, to compare "death side" outcomes. Bracket halves clearly highlighted.

## Later list — NOT in this build
- Called-up players per club (national-team call-ups and which club matches they miss); needs a data source
- Suspensions (card accumulation, red cards) and injuries/absences, if Phase 1 finds a free source
- Death-side strength score (needs an objective strength measure)
- Reverse solver ("what does team X need to avoid side Y")
- Probability simulation (Monte Carlo; needs a strength model)
- Stakes chips beyond the UCL page; what's at stake per match, what a team needs, table position over time, schedule difficulty, competition rules explainer
- UCL history section (past editions), like calendarkit's Cup history
