# Reports — footykit

Newest first. One report per backlog run (CLAUDE.md, "Feature backlog, built list and ideas").

## 2026-11-19 (evening) — FK-44 … FK-48

**Built** (each its own commit, pushed to main):
- v0.56.0 FK-44 — Slate cards no longer show the draw price; home and away prices stay.
- v0.57.0 FK-45 — League view (bar: League): a picker with the six leagues, the Champions League and the cups; every game of the picked competition (all its teams), List (one day, "No games" shown) or Calendar (the week's 7 days; a day's header opens it in the List), ‹ › / date picker / Today, its teams, and under them its standings (the league table with the ◀ ▶ round step-through, the UCL page, or the cup's bracket and groups). Step 1 check: the snapshot has every game of each of these competitions (leagues 380 / 306 matches, the UCL's 144 league-phase matches, full cup draws with every club), so nothing was blocked. Only followed clubs have a Team Calendar, so other clubs' names in the Teams list are plain text.
- v0.58.0 FK-46 — Competition icon hover: "Premier League · Round 12", "Brasileirão · ~Round 35" (~ for LaLiga and the Brasileirão), cups "Copa do Brasil · Semi-final, 1st leg". A click on the icon (or the competition name in list rows) opens the League view on that competition and day. Competitions the League view doesn't have (Europa League, state championships, super cups) stay plain.
- v0.59.0 FK-47 — The Slate strip is now 5 window slots per team (2 before, this match's in the middle in the accent colour with its competition icon, 2 after); empty windows are dashed "–" slots ("No match · weekend 13–16 Nov"; also "Nothing fixtured yet" / "Before the season"); two matches split a slot. Slots shrank (squares 18 px, was 20) to keep the 509 × 78 card.
- v0.60.0 FK-48 — ◀ ▶ on each strip, one window earlier / later; a click on this match's square re-centres (a reload too). There was no free width left in the card, so the arrows sit over the strip's two ends and show only while the pointer is on the strip (or while it is moved).

**Blocked:** FK-41 (unchanged: needs a free The Odds API key to check coverage).
**Ideas added:** none.
**For you to check by hand** (judging feel, can't be automated): whether the hover-only strip arrows and the 18 px squares read well at your whiteboard size, and the League view's first layout (games, then teams, then standings, one column).

## 2026-11-19 (later) — FK-37

**Built:** v0.55.0 FK-37 — your answer: the series popup, on hover. Hovering a k/n chip (List, Team views, Slate) opens the season series popup; it stays while the pointer is in it, closes about 100 ms after it leaves both; a click keeps it open until Escape or a click outside.
**Blocked:** FK-41 (unchanged: needs a free The Odds API key to check coverage).
**Ideas added:** none. **For you to check by hand:** nothing new.

## 2026-11-19 — FK-35 … FK-43

**Built** (each its own commit, pushed to main):
- v0.48.0 FK-36 — Slate strip: last 2 played + next 2. Also a fix: the strip squares had been all grey since v0.44.0 (a CSS rule order bug); the win/draw/loss colours show again.
- v0.49.0 FK-35 — Slate cards in calendarkit's shape: 509 × 78, same strip / rows / odds column, tight shared-border grid, "SLATE · 19-11 · Football" header (`slateHeaderLabel` exported for the gauntlet's combined Slate). To fit calendarkit's width, the tags on the card show their highlights only (all of them on hover) and the strip squares are 20 px (were 22).
- v0.50.0 FK-38 — Home team on the first line of every Slate card (no "@" any more).
- v0.51.0 FK-40 — "⋯" game button: both clubs' Transfermarkt injuries & suspensions pages (all 54 followed clubs found and opened, Brazilian ones included; no fallback was needed, a club without an id gets Transfermarkt's search) and FanDuel's soccer section (a per-match props link needs FanDuel's own event id, which ESPN doesn't give).
- v0.52.0 FK-39 — Weather at kick-off from Open-Meteo: sky sign on the card's second row, temperature / feels-like / rain chance / wind + credit in the game pop-up; one request per day's venues, each venue at most hourly, forecasts only (16 days).
- v0.53.0 FK-42 — Pts first after Team in every league table, the simulators' tables, the UCL table and the quick standings.
- v0.54.0 FK-43 — ◀ ▶ (and ← →) step a league table back to "after N rounds". ESPN gives no round numbers anywhere (snapshot, raw payloads, scoreboard, core API checked), so rounds are worked out from the schedule; a postponed match counts in its own round. Exact on the recorded Premier League, Serie A, Bundesliga and Ligue 1 seasons; LaLiga and the Brasileirão have many moved matches, so their past rounds are a best guess (the latest round always equals today's table).

**Blocked** (notes in FEATURE_BACKLOG.md):
- FK-37 — the spec names the "2/2" series chip but describes calendarkit's fatigue popup; which one did you mean?
- FK-41 — step 1 done: `team_totals` (Over 0.5) on The Odds API ≈ 200 credits/month of the free 500. It fits on paper, but whether a bookmaker covers it for these leagues can only be checked with a key you'd create.

**Ideas added:** none.

**For you to check by hand** (judging feel, can't be automated): how the 509 px Slate cards read at your whiteboard size, and whether "highlights only" tags on the card are enough.
