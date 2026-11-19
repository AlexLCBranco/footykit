# Feature backlog — footykit

Planned work only, nothing built. Shipped items move to `BUILT.md` (rules: CLAUDE.md, "Feature backlog, built list and ideas").
Specs are written here from Claude chat. Item IDs are FK-1, FK-2, ... (never reused; FK is this repo's prefix, unique across the owner's repos).

## Ready

### FK-41 — "Team to score" odds in a Slate popup (feasibility first)
**What:** for each Slate team, the odds that it scores at least 1 goal, shown only in a popup (not always visible). Step 1, then stop and report: check whether a free odds source has this market for the followed leagues and what it costs per day (The Odds API's free plan is 500 credits a month and a call can cost several credits). Fetch at most once per day per slate and cache. If it doesn't fit for free, mark `Blocked:` with the numbers.
**Tests:** unit for reading the market from a fixture; a counter test that one Slate costs at most one fetch per day.
**Blocked:** (2026-11-19, step 1 done) The Odds API has no "team to score" key; the closest is `team_totals` (Over 0.5 goals = team scores), an additional market fetched one event at a time from `/events/{id}/odds`, costing 1 credit per event per region when it returns data. Followed clubs played 196 matches in Oct 2026 (max 18 in a day), so one region ≈ 200 credits a month of the free 500 (the event list call is free) — it fits on paper. Not verified: whether any EU/UK bookmaker prices `team_totals` for these leagues (The Odds API says additional markets are mostly US books; Brasileirão coverage unknown). Needs: you to create a free key at the-odds-api.com (an account I can't create for you), then one test call per league to confirm coverage before building.

### FK-56 — UCL simulator: start the knockouts from the current table + knockout play-off round
**What:** in the Champions League simulator:
1. A button "Start knockouts from current standings": fills the knockout stage from the league-phase table as it stands now (results left to play ignored), so knockout ties can be simulated right away.
2. The knockout phase play-offs (the round before the round of 16, only teams 9th–24th, 9th–16th seeded with the 2nd leg at home; 1st–8th wait in the round of 16) appear in the simulator bracket, using `UCL_PLAYOFF_PAIRS` from `config/ucl`. Pick a winner per tie (click again to clear), winners move into the round of 16 slots they feed, then the R16 onwards as in the other cup simulators (FK-30).
Table and bracket visible together (the owner runs many simulations to check which side of the bracket is harder).
**Tests:** unit: positions 9–24 pair as `UCL_PLAYOFF_PAIRS`; winners land in the right R16 slots; "start from current standings" uses the current table order. e2e: button fills the bracket, picking play-off winners fills the R16.
**Blocked:** (2026-11-19) the ties inside each play-off section are drawn, so "pick a winner per tie" needs a rule for them. `UCL_PLAYOFF_PAIRS` (UEFA Art. 19.02–19.03) only fixes the sections: e.g. 9th/10th v 23rd/24th, winners to meet 7th/8th, but which of 9th/10th plays which of 23rd/24th, and which R16 seed (7th or 8th) gets which play-off winner, is drawn. Pick one: (a) a fixed rule, e.g. 9 v 24 and 10 v 23, the 9/24 winner meets 8th, the 10/23 winner 7th (say which); (b) a ⇄ swap per section to set each draw yourself, default (a); (c) like the other cup simulators (FK-30): each section shows its 4 teams, you pick the 2 who go through, and the R16 lists them unpaired. The same question applies from the R16 on (the halves are drawn too).
