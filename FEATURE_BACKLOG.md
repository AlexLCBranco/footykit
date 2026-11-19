# Feature backlog — footykit

Planned work only, nothing built. Shipped items move to `BUILT.md` (rules: CLAUDE.md, "Feature backlog, built list and ideas").
Specs are written here from Claude chat. Item IDs are FK-1, FK-2, ... (never reused; FK is this repo's prefix, unique across the owner's repos).

## Ready

### FK-41 — "Team to score" odds in a Slate popup (feasibility first)
**What:** for each Slate team, the odds that it scores at least 1 goal, shown only in a popup (not always visible). Step 1, then stop and report: check whether a free odds source has this market for the followed leagues and what it costs per day (The Odds API's free plan is 500 credits a month and a call can cost several credits). Fetch at most once per day per slate and cache. If it doesn't fit for free, mark `Blocked:` with the numbers.
**Tests:** unit for reading the market from a fixture; a counter test that one Slate costs at most one fetch per day.
**Blocked:** (2026-11-19, step 1 done) The Odds API has no "team to score" key; the closest is `team_totals` (Over 0.5 goals = team scores), an additional market fetched one event at a time from `/events/{id}/odds`, costing 1 credit per event per region when it returns data. Followed clubs played 196 matches in Oct 2026 (max 18 in a day), so one region ≈ 200 credits a month of the free 500 (the event list call is free) — it fits on paper. Not verified: whether any EU/UK bookmaker prices `team_totals` for these leagues (The Odds API says additional markets are mostly US books; Brasileirão coverage unknown). Needs: you to create a free key at the-odds-api.com (an account I can't create for you), then one test call per league to confirm coverage before building.

### FK-50 — Result streak (W / D / L) like calendarkit
**What:** each team's current result streak, laid out exactly like calendarkit's streak (same place on Slate cards and List rows, same chip style, same hover popup listing the games in the streak with opponent, home/away, score, date, each game clickable to its Google search like other match links). Football has draws, so a streak is W, D or L in a row: "W3", "D2", "L1". All competitions count. A match decided on penalties counts as a draw (the 90/120-minute result); show "(pens)" in the popup. Same no-lag rule as calendarkit: a played match shows the streak including that match; the next match shows the team's current streak.
Keep it clearly separate from the existing window streak tag (consecutive windows with a match): rename that tag's tooltip if needed so "streak" never means two things.
**Tests:** unit: W/D/L sequences, a draw breaking a win streak, penalties counted as D, played vs next match; e2e: chip and popup on a Slate card and a List row.

### FK-54 — Cups page: knockout bracket fills the first screen
**What:** on the cups pages (Libertadores, Sudamericana, every cup with a bracket) the knockout bracket cells are as big as possible so the bracket fills the default viewport (full-size desktop window) without scrolling; the group stage tables start right below it, visible as soon as the user scrolls down. Text and crests grow with the cells.
**Tests:** e2e at 1920×1080 and 1366×768: bracket fits within the first viewport with no inner scroll; groups start just below the fold.

### FK-55 — Competition switcher in the cup page title
**What:** the "Libertadores" title at the top of a cup page (next to "Final Nov 28, Estadio Centenario, Montevideo") becomes the switch-competition control: same size and position as the current title text, but styled like the bar's competition picker (outlined box with a ▾ chevron, same dropdown list and behaviour). Picking a competition opens its page, same as the bar picker.
**Tests:** e2e: the title is a dropdown, same font size as before; choosing another competition opens its page and the URL updates.

### FK-56 — UCL simulator: start the knockouts from the current table + knockout play-off round
**What:** in the Champions League simulator:
1. A button "Start knockouts from current standings": fills the knockout stage from the league-phase table as it stands now (results left to play ignored), so knockout ties can be simulated right away.
2. The knockout phase play-offs (the round before the round of 16, only teams 9th–24th, 9th–16th seeded with the 2nd leg at home; 1st–8th wait in the round of 16) appear in the simulator bracket, using `UCL_PLAYOFF_PAIRS` from `config/ucl`. Pick a winner per tie (click again to clear), winners move into the round of 16 slots they feed, then the R16 onwards as in the other cup simulators (FK-30).
Table and bracket visible together (the owner runs many simulations to check which side of the bracket is harder).
**Tests:** unit: positions 9–24 pair as `UCL_PLAYOFF_PAIRS`; winners land in the right R16 slots; "start from current standings" uses the current table order. e2e: button fills the bracket, picking play-off winners fills the R16.
