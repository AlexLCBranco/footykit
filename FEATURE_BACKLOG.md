# Feature backlog — footykit

Planned work only, nothing built. Shipped items move to `BUILT.md` (rules: CLAUDE.md, "Feature backlog, built list and ideas").
Specs are written here from Claude chat. Item IDs are FK-1, FK-2, ... (never reused; FK is this repo's prefix, unique across the owner's repos).

## Ready

### FK-37 — Hover popup on the k/n chip like calendarkit
**What:** the "2/2" chip (image `docs/backlog-img/FK-37-chip.png`) opens a popup on hover with the same layout and kind of content as calendarkit's chip popup (calendarkit `src/slate/Fatigue.tsx`: what the run is, previous/next match, rest days, day squares).
**Tests:** e2e: hover opens the popup, it closes on leaving (like calendarkit CK-6).

### FK-41 — "Team to score" odds in a Slate popup (feasibility first)
**What:** for each Slate team, the odds that it scores at least 1 goal, shown only in a popup (not always visible). Step 1, then stop and report: check whether a free odds source has this market for the followed leagues and what it costs per day (The Odds API's free plan is 500 credits a month and a call can cost several credits). Fetch at most once per day per slate and cache. If it doesn't fit for free, mark `Blocked:` with the numbers.
**Tests:** unit for reading the market from a fixture; a counter test that one Slate costs at most one fetch per day.

### FK-42 — League tables: Pts as the first column on the left
**What:** in every league table (`LeagueTablePage.tsx`, and the what-if/simulator tables that show the same columns), Pts moves from the last column to the first stat column on the left, right after the team name: `# · Team · Pts · P · W · D · L · GF · GA · GD`. Keep it bold. Sorting/tie rules don't change. (Owner's screenshot: the current Premier League table with Pts on the far right.)
**Tests:** e2e: on each league's table page the first header cell after Team is Pts and its values match the old Pts column.

### FK-43 — League tables: step back through matchdays (table after round N)
**What:** ◀ ▶ arrows on each side of the "after 10 rounds" label in every league table header (owner's screenshot `docs/backlog-img/FK-43-table.png`; same pattern as the simulator's matchday arrows, FK-3) to see the table as it stood after each round: opens on the latest played round ("after 10 rounds"), ◀ goes to after 9, 8, 7 ... down to 1, ▶ back up. Rebuilt from the played results with the league's own tie rules (same engine as the current table). Matches postponed from an earlier round count in the matchday they belong to, not the date played; if a league's feed doesn't give the round, say so in the report and use what's available. The "Last 5 · next 3" columns follow the chosen round (last 5 up to it, the next 3 after it).
**Tests:** unit: table after matchday N from fixture results (incl. a postponed match); e2e: ◀ from latest shows "after 9 rounds" with P = 9 for teams without postponements, ▶ returns to the latest.
