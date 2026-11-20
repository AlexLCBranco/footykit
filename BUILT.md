# Built — footykit

Shipped work only, newest first. Planned work is in `FEATURE_BACKLOG.md`, never here.
Entries dated before 2026-11-16 were backfilled from the git commit messages (data, docs, test-only, merge and
spec commits left out). New entries name their backlog ID (see CLAUDE.md, "Feature backlog, built list and ideas").

## 2026-11-19
- FK-62 — Floating live scores window (v0.75.0) — A "Pop out live scores" button in the Slate header (Chrome / Edge on desktop) opens a small always-on-top window: before the first game a countdown to it, then by itself at kick-off one line per match of that day (time or live minute, teams, score, red LIVE, finals as FT), fed by the same live data; it stays open while you browse the rest of footykit.
- FK-60 — World Cup what-if simulator (resimulate any edition) (v0.74.0) — On a World Cup edition from 1998 to 2026, "Simulator" puts every group's matches and table beside the bracket: change any result (fast 1 X 2, or detailed scores with extra time and penalties) and the tables, the third-placed teams and the bracket refill by that edition's rules, starting from what really happened, with "Reset to real results" and "Clear all"; older editions say the simulator doesn't cover them yet.
- FK-59 — World Cup: every edition's groups, brackets and history (v0.73.0) — Cups → World Cup: pick any edition 1930–2026 to see every group's final table with its match squares (second group stages and 1950's final round too, 2026's third-placed table), the full bracket with extra time and penalties, hovers with date, venue, 90' score and scorers, Google links on matches, a ↗ to each team's squad on Wikipedia, and a click on a team name for its World Cup history.
- FK-58 — "Extra tools" menu; Trailing moves into it (v0.72.0) — Trailing is no longer a main tab: a new "Extra tools" icon button beside the copy / standings / info buttons opens a small menu whose first entry, Trailing, opens the page as before; the button looks pressed while you're on it, and old Trailing links still work.
- FK-57 — Position change arrows in league tables (v0.71.0) — Every domestic league table has a small column beside the position showing places moved since the round before (green ▲1, red ▼2, grey –; hover: "Was 7th after round 11"), and it follows the round as you step with ◀ ▶ (none after round 1).
- UCL simulator knockouts as a full-size bracket (v0.70.0) — Once started, the Champions League simulator's knockouts are a full bracket like the Libertadores page (Play-offs → Round of 16 → Quarter-finals → Semi-finals → Final, each tie beside the ones it feeds), filling the screen beside the table; the section swaps sit above it.
- FK-56 — UCL simulator: start the knockouts from the current table + knockout play-off round (v0.69.0) — In the Champions League simulator, "Start knockouts from current standings" fills the play-offs (9th–24th) and the round of 16 from today's table beside it; click a side to send it through (again to clear) up to the final, and ⇄ buttons per section set what UEFA draws: the play-off pairings, which seed each winner meets, and which half.
- FK-55 — Competition switcher in the cup page title (v0.68.0) — The cup's name at the top of a cup page (and the Champions League page) is now a dropdown in the bar picker's style, same size as the old title; picking a competition opens its page.
- FK-54 — Cups page: knockout bracket fills the first screen (v0.67.0) — On every cup page the bracket grows (text and crests too) to fill the window without scrolling, and the group tables start right below it.
- FK-50 — Result streak (W / D / L) like calendarkit (v0.66.0) — Each followed club's current run of wins, draws or defeats ("W3", "D2", "L1", all competitions, a shootout counts as a draw) shows after the name on Slate cards (cards 32 px wider), beside the form squares on List rows and on a club's List rows; hover it for the games with scores, "(pens)" and Google links. The window tag is now "Windows in a row".
- FK-49 — Month arrows beside the calendar (like calendarkit) (v0.65.0) — Large ‹ › chevrons in the margin left and right of the Team Calendar and the League view's Calendar move a month back / forward ("Back a month" / "Forward a month"), greyed out at the first / last month with data, never in copies; the bar's arrows stay.
- FK-53 — Bigger last-games squares on Slate cards (v0.64.0) — The strip squares are 21 px (were 17) with crests 15 px (were 12), still lined up across cards; the card is 20 px wider (529) to fit them.
- FK-52 — Slate scores always aligned (v0.63.0) — On the Slate every card's scores sit in one column whatever the team name or league place; a long name ends in "…" with the full name on hover, on screen and in copies.
- Copy as image no longer fails when a team has no crest (fix) (v0.62.1) — A copy that included a team without a crest file (some cup opponents) showed "!" and copied nothing; the crest is now left blank and the copy works.
- FK-51 — No copy button inside Slate cards (v0.62.0) — Slate cards no longer have their own small copy button; copy the whole day from the bar or drag a box over cards to copy just those.
- Slate strip: click a window to see it on the club's calendar; arrows lined up (v0.61.0) — Clicking a window slot on a Slate strip opens that club's calendar on the window's month with the window's days highlighted in pink (today stays blue); the strip's ◀ ▶ are now drawn triangles centred on the slots, a square's height.
- Slate strip arrows only on hover, beside the window slots (fix) (v0.60.1) — The ◀ ▶ on each Slate strip now show only while the pointer is on it (also after moving it) and sit in their own room at the strip's ends instead of over the slots; the slots are a pixel smaller to make room.
- FK-48 — Arrows on the club form strip to move to earlier / later windows (v0.60.0) — Hovering a team's strip on a Slate card shows small ◀ ▶ at its ends that move it one window earlier / later; a click on this match's highlighted square (or a reload) centres it again; the card stays 509 × 78.
- FK-47 — Club form strip: window slots, empty windows shown, current match highlighted (v0.59.0) — Each team's strip on a Slate card is now five window slots (2 midweek / weekend windows before, this match's, 2 after): a window without a match is a dashed "–" slot (hover: "No match · midweek 11–13 Nov"), two matches share a slot, and this match sits in the middle in the accent colour with its competition's icon; the card stays 509 × 78.
- FK-46 — League icon hover: round + link to the League view (v0.58.0) — Hovering a match's competition icon now says the round ("Brasileirão · ~Round 35", ~ where rounds are a best guess) or a cup's stage ("Copa do Brasil · Semi-final, 1st leg"); clicking it (or the competition's name in list rows) opens the League view on that competition and day.
- FK-45 — League view: one page per competition (like calendarkit's League view) (v0.57.0) — A League tab on the bar: pick a league, the Champions League or a cup and see every game of it (all its teams) a day at a time (List) or a week at a time (Calendar), with ‹ ›, a date picker and Today, its teams (followed clubs open their calendar) and its table or bracket underneath.
- FK-44 — Slate: remove the draw odds (v0.56.0) — Slate cards no longer show the draw price ("X 3.40"); the home and away win prices stay.
- FK-37 — Hover popup on the k/n chip like calendarkit (v0.55.0) — Hovering a "2/2" season-series chip now opens its season series popup (it stays while the pointer is in it and closes as soon as it leaves, as in calendarkit); a click keeps it open until Escape or a click elsewhere.
- FK-43 — League tables: step back through matchdays (table after round N) (v0.54.0) — ◀ ▶ (or ← →) beside "after N rounds" show each league's table as it stood after any earlier round, last 5 and next 3 following the round; ESPN gives no round numbers, so rounds are worked out from the schedule (exact for the Premier League, Serie A, Bundesliga and Ligue 1; LaLiga and the Brasileirão, with many moved matches, are approximate).
- FK-42 — League tables: Pts as the first column on the left (v0.53.0) — Every league table (the six leagues, their simulators, the UCL table and its simulator, the quick standings) now reads # · Team · Pts · P · W · D · L · GF · GA · GD, Pts still bold.
- FK-39 — Weather on matches (v0.52.0) — Each Slate card shows the sky at kick-off (☀ ⛅ ☁ ☂ ❄ ⛈) in its second row, and the game pop-up gives temperature, feels-like, rain chance and wind from Open-Meteo (credited), for matches up to 16 days ahead.
- FK-40 — Slate game button: links (player props, injuries) (v0.51.0) — Each Slate card has a small "⋯" button in its first row opening links to both clubs' Transfermarkt injuries & suspensions pages (all 54 followed clubs checked, Brazilian ones included) and FanDuel's soccer odds / props section; no betting in the app.
- FK-38 — Slate: home team on the first line (v0.50.0) — Every Slate card now lists the home team first and the away team second.
- FK-35 — Slate in the same shape as calendarkit's (for a combined Slate) (v0.49.0) — Slate cards are now calendarkit's size and layout (509 × 78, kickoff strip, logo, name with place and score, tags, last / next games, odds) in a tight grid of shared borders under "SLATE · 19-11 · Football"; on the card the tags show their highlights (all of them on hover).
- FK-36 — Club form strip: 2 before, 2 after (v0.48.0) — A Slate card's squares now show each club's last 2 played matches (crest on green / grey / red) and its next 2 (crest outlined), with a thin mark where this match sits.
- Last-games squares show their win / draw / loss colours (fix) (v0.48.0) — The Slate squares were all grey since v0.44.0; the colours now show.
### Internal
- Report for FK-56 in REPORTS.md; PROJECT.md state (v0.69.0)
- Report for FK-49 … FK-56 in REPORTS.md; Blocked note on FK-56; PROJECT.md state (v0.68.0)
- Report for FK-44 … FK-48 in REPORTS.md; PROJECT.md state (v0.60.0)
- Report for FK-35 … FK-43 in REPORTS.md; Blocked notes on FK-37 and FK-41; PROJECT.md state (v0.54.0)
- Version check: REPORTS.md needs no version bump (CI fix) (v0.54.0)

## 2026-11-16
- FK-28 — Show a team's position in its domestic league (v0.47.0) — Each team's current league place shows small and muted beside its name ("Arsenal 1st 2 @ 1 12th Everton") on the List rows, a club's List rows and the Slate cards, in every competition; hover it for the league.
- FK-34 — Make the Tags setting self-explanatory (v0.46.0) — The bar's Tags setting reads "Tags: All tags ▾" and opens four choices in plain words (All tags, Window strip, Highlights only, Hide tags), each with a one-line description; your saved choice carries over.
- FK-33 — Season-series popup like calendarkit's (v0.45.0) — The k/n chip's popup now matches calendarkit's: "A – B · N meetings" with who leads on the right (draws counted after), and one card per meeting across all competitions with the home crest, "AWAY @ HOME", the winner and score, the date, and the match you opened it from outlined.
- FK-32 — Bigger, more informative last-games squares (v0.44.0) — A Slate card's last five games are bigger squares showing the opponent's crest on green / grey / red, each after "vs" (home) or "@" (away) in a fixed slot so they line up; cards are a little wider to fit them.
- FK-31 — Score closer to the team names on the Slate card (v0.44.0) — On a Slate card the score now sits right after each team's name instead of at the far right past the form squares.
- FK-30 — Simulator for every cup (v0.43.0) — Every cup page has a Simulator button: click a team in any tie still to play to send it through (again to clear), the next round lists who is in it (unpaired until it's drawn), a picked final shows the champion; picks are kept per cup.
- FK-29 — Move the UCL into the Cups section (v0.42.0) — The UCL tab is gone from the bar: the Champions League is the first entry in the Cups picker and opens its page (simulator included) with Cups selected; old ?view=ucl links still work.
- FK-27 — Highlight today in the List view (v0.41.0) — In a club's List view today's line has a blue outline, tint and a "Today" pill, on a match day or not (with rest days off it still gets a "No match" line).

### Internal
- FK-26 — Fix the window streak count — no bug: the count was right (Flamengo at Vasco, Oct 29 is the 7th straight window; owner confirmed); a test now pins it (tests/window-streak.test.ts).

## 2026-11-15
- FK-25 — Screenshot parity pass against calendarkit (v0.40.0) — A side-by-side pass against calendarkit: list rows and Slate cards on its card surface, its table panels and Quick standings frame, its month dividers and page margins; screenshots and the differences kept on purpose are in docs/parity/.
- FK-24 — Team Calendar grid and cells on calendarkit's design (v0.39.0) — The club Calendar uses calendarkit's grid and cards: small day numbers, today in blue, the kickoff on top of every match, the matchup line, chips below with the competition as a pill, content scaled to fill each cell, and the key moved into the ⓘ.
- FK-23 — Team header above the team views, like calendarkit (v0.38.0) — A club's Calendar and List open with calendarkit's header: the club logo on a light disc, the full name, and the period shown at the right.
- FK-22 — Same shell as calendarkit: bar, buttons, switches, date block, accent colour (v0.37.0) — The bar matches calendarkit: one 44 px row of 32 px controls, calendarkit's switches, buttons, square ‹ › and date block order, and its blue accent for picked and focused controls (green now only means a win or a positive mark).
- FK-21 — Road trip and homestand labels, like calendarkit (v0.36.0) — A club's Calendar and List label each match of 3+ in a row away "Road trip · 2/4" (red outline) or at home "Homestand · 1/3" (blue), counted over the whole season.
- FK-20 — Team calendar cells: both abbreviations with the score between them (v0.35.0) — Calendar cells read "NEW 1 @ 3 EVE" on one line with both logos, the club first, the winner's number bright and the loser's dimmed; matches to come read "NEW @ EVE" under the kickoff time.
- FK-19 — Browser tab title follows the page, like calendarkit (v0.34.0) — Browser tab titles read like calendarkit's: "ARS schedule · Nov 2026", "ARS list · Oct – Nov 2026", "Day · Nov 15", "Slate · Nov 15".
- FK-18 — Team Calendar month view: bigger day cells, no dead space at the bottom (v0.33.0) — The club Calendar's grid now reaches the bottom of the window in every span (bigger day cells, no empty space below); a short window scrolls instead of squashing the rows.
- FK-17 — Picked club highlighted in the top bar, like calendarkit (v0.32.0) — A picked club stands out in the bar like calendarkit: blue border and tint, logo and bold white name, with the × right beside it; "All clubs" is plain.
- FK-16 — Easy way back to the main menu from a team (v0.31.0) — With a club picked, the main tabs (List, Slate, UCL, Tables, Cups, Trailing) stay on the bar and one click leaves the club; a × beside the club goes back to today's List.
- FK-15 — Hide Z4R and the "1C/2C/3C" tags by default, user can turn them on (v0.30.0) — A menu beside the Tags switch turns each tag type on or off, with what it means; Z4R and 1C/2C/3C start off, and the choice is remembered.
- FK-14 — Calendar's free-window marking + legend in the team List view (v0.29.0) — The club's List view tints free-window days like the Calendar, marks FIFA-window days "FIFA" by the date, and has the Calendar's legend underneath with the midweek / weekend band colours added.
- FK-13 — Midweek / weekend window bands in the team List view (v0.28.0) — In a club's List view each midweek (Tue–Thu) and weekend (Fri–Mon) window is one tinted band with a thin left bar, violet for midweek and green for weekend, so the windows alternate visibly.
- FK-12 — Club picker must clearly accept typing (v0.27.0) — The club picker is a box you type into: it filters live ignoring case and accents ("gremio" finds Grêmio), ↑/↓ move, Enter picks, Esc closes.
- FK-11 — Competition name spelled out in match rows (v0.26.0) — Day List and Team List rows show the competition's name after its logo, in a fixed-width column (long names end in "…", the tooltip has it whole).
- FK-10 — match links search Google instead of opening ESPN (v0.25.0) — matchUrl(m, model) builds https://www.google.com/search?q= + "Home vs Away Mon D YYYY" (full tea…
- FK-9 — rest days in the Team List, as calendarkit's (v0.24.0) — one quiet "Rest" row per day without a match between the club's first and last match (from all its mat…
- FK-8 — a team-name click opens the month Calendar (v0.23.0) — anywhere a team name links (day list, Slate, tables, UCL, Trailing, cups, and the Slate part's teamCalen…
- FK-7 — pots hidden by default + a Pots tab (v0.22.0) — no pot badges on the UCL table, its squares or the simulator (the pot stays in each tooltip; the Left column no…
- FK-6 — Reset per matchday in the simulators (v0.21.0) — beside the matchday (a league: window) header, shown only while that matchday has a pick to empty; empties jus…
- FK-5 — no scrollbars inside tables (v0.20.0) — every table renders through SplitTable: taller than its room, its rows flow into 2–3 side-by-side tables (header repe…
- FK-4 — team codes no longer run under the pot badge in the simulator (v0.19.1) — the code had a 32 px slot that shrank below its text (36–40 px for BODO / COMO / RO…
- FK-3 — simulator matchday arrows (v0.19.0) — one matchday at a time (a league: one window), opening on the next to play, ◀ ▶ beside the header ("Matchday 5 · Nov…
- FK-2 — "What-if" shown as "Simulator" (v0.18.1) — the UCL and Tables buttons, both simulators' headings and the tab titles (and the page-history tooltips built from t…
- FK-1 — goals while trailing (v0.18.0) — the snapshot keeps each match's goals from ESPN's scoreboards (Match.g: minute, side credited, own goal; shootout kicks left o…
- v0.17.1: Tables keeps its league after the UCL what-if — opening the UCL simulator cleared page.league (it doubled as the "which simulator" switch), so Tables then reopened on…
- v0.17.0: Brasileirão what-if places (Phase 5 step 4) — the Libertadores / Sudamericana places worked out live over the picked table by CBF's REC 2026 (braRowZones, now shared…
- v0.16.0: league what-if simulator (Phase 5 step 3) — all six leagues at ?view=whatif&league=… from a What-if button on the Tables page: the matches left by window (Weekend F…
- v0.15.0: UCL what-if saved scenarios (Phase 5 step 2) — named scenarios kept in fk:whatif:v1, switched in one click or Alt+1-9, "•" when the picks on screen differ from the …
- v0.14.0: UCL what-if simulator, step 1 (Phase 5) — ?view=whatif from a What-if button on the UCL page: the league-phase matches left (Pending first, by matchday), a click cycl…
- v0.13.0: the domestic cups on the Cups tab — FA Cup, EFL Cup, Copa del Rey, Coppa Italia, DFB-Pokal, Coupe de France, Copa do Brasil: rounds from ESPN as drawn, a bracket from…
- v0.12.0: Libertadores / Sudamericana pages (Cups tab) — knockout bracket ordered from ESPN's ties (aggregates, penalties, winners), the 8 group tables ranked by CONMEBOL's rul…
- v0.11.0: Brasileirão places from CBF's REC 2026 (Art. 6-8, 15) — pass-down read literally (a freed place keeps its stage, to the best-placed club not yet qualified), the Copa…
- v0.10.0: league tables (Phase 4) — Tables tab with a league picker; the six tables rebuilt with each league's ties-on-points rules (head-to-head where it applies; equals ESPN'…
- v0.9.0: UCL knockout section (Phase 4 step 3) — play-off sections I-IV, round-of-16 ties A-D, quarter-finals, semis and final from ESPN's ties with both legs, goals and winner…
- v0.8.0: UCL stakes chips (Phase 4 step 2) — Top 8 / Top 24 settled, Out, and what the next match settles (Win/Draw = top 8 / top 24, Draw/Loss = no top 8 / out), points-only s…
- v0.7.0: the Champions League page (Phase 4 step 1) — league-phase table of all 36 teams rebuilt from results (criteria 1-5 mid-phase, 1-8 at the end, shared places marked), 8 …

## 2026-11-14
- v0.6.2: the Bagé venue (Estádio Antônio Magalhães Rossel, Guarany FC, Wikidata Q10276776) placed on the map via venue-overrides; a test that every venue in the recorded snap…
- v0.6.1: the Brasileirão's code is BR (was BSA), as Alex asked; friendlies stay hidden (confirmed)
- v0.6.0: altitude by levels on the travel map (moderate 1,500 m, high 2,500 m, very high 3,000 m, insane 3,500 m; config/altitude.ts with sources), on the map mark and in the mat…
- v0.5.1: the Z4R zone is the direct relegation places only (Alex: "direct for now") — the Bundesliga's and Ligue 1's 16th, a play-off place, is outside it
- v0.5.0: Phase 3 context tags — previous / next window (first-leg scores), window streak, window advantage, competitions alive (1C/2C/3C), Z4R and derby flag next to each team,…
- v0.4.0: marquee selection (drag over matches, copy only them, no gaps), the Slate as a self-contained part for the gauntlet (src/slate/index.ts: SlateDay, loadFootyData, notes, …
- v0.3.0: travel map beside the Day List — Europe / South America, a dot per match with non-overlapping labels; hover or click-pin a match for both teams' last → this → next…
- ci: snapshot verify and freshness check the site in the FOOTYKIT_SITE repo variable (footykit.vercel.app until the gauntlet routes /football)
- v0.2.1: the day function runs on Vercel (.js import paths: Vercel keeps .ts paths in compiled functions, ERR_MODULE_NOT_FOUND); the snapshot path is rewritten to the Blob store
- v0.2.0: Phase 2 calendar core, first part — snapshot job (ESPN → slim snapshot, Blob upload), day function (live scores, 3-way odds), app with the packed bar: Day List, Slat…
- PLAN: Phase 1 answers — Vercel Blob, 3 h snapshot + live day layer, four state championships, odds in the Slate, PL times as given
- PLAN: menu decision — packed bar
- Phase 1: repo, plan and ESPN data check
