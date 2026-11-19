# Reports — footykit

Newest first. One report per backlog run (CLAUDE.md, "Feature backlog, built list and ideas").

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
