# Feature backlog — footykit

Planned work only, nothing built. Shipped items move to `BUILT.md` (rules: CLAUDE.md, "Feature backlog, built list and ideas").
Specs are written here from Claude chat. Item IDs are FK-1, FK-2, ... (never reused; FK is this repo's prefix, unique across the owner's repos).

## Ready

### FK-41 — "Team to score" odds in a Slate popup (feasibility first)
**What:** for each Slate team, the odds that it scores at least 1 goal, shown only in a popup (not always visible). Step 1, then stop and report: check whether a free odds source has this market for the followed leagues and what it costs per day (The Odds API's free plan is 500 credits a month and a call can cost several credits). Fetch at most once per day per slate and cache. If it doesn't fit for free, mark `Blocked:` with the numbers.
**Tests:** unit for reading the market from a fixture; a counter test that one Slate costs at most one fetch per day.
**Blocked:** (2026-11-19, step 1 done) The Odds API has no "team to score" key; the closest is `team_totals` (Over 0.5 goals = team scores), an additional market fetched one event at a time from `/events/{id}/odds`, costing 1 credit per event per region when it returns data. Followed clubs played 196 matches in Oct 2026 (max 18 in a day), so one region ≈ 200 credits a month of the free 500 (the event list call is free) — it fits on paper. Not verified: whether any EU/UK bookmaker prices `team_totals` for these leagues (The Odds API says additional markets are mostly US books; Brasileirão coverage unknown). Needs: you to create a free key at the-odds-api.com (an account I can't create for you), then one test call per league to confirm coverage before building.
