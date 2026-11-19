# Feature backlog — footykit

Planned work only, nothing built. Shipped items move to `BUILT.md` (rules: CLAUDE.md, "Feature backlog, built list and ideas").
Specs are written here from Claude chat. Item IDs are FK-1, FK-2, ... (never reused; FK is this repo's prefix, unique across the owner's repos).

## Ready

### FK-41 — "Team to score" odds in a Slate popup (feasibility first)
**What:** for each Slate team, the odds that it scores at least 1 goal, shown only in a popup (not always visible). Step 1, then stop and report: check whether a free odds source has this market for the followed leagues and what it costs per day (The Odds API's free plan is 500 credits a month and a call can cost several credits). Fetch at most once per day per slate and cache. If it doesn't fit for free, mark `Blocked:` with the numbers.
**Tests:** unit for reading the market from a fixture; a counter test that one Slate costs at most one fetch per day.
**Blocked:** (2026-11-19, step 1 done) The Odds API has no "team to score" key; the closest is `team_totals` (Over 0.5 goals = team scores), an additional market fetched one event at a time from `/events/{id}/odds`, costing 1 credit per event per region when it returns data. Followed clubs played 196 matches in Oct 2026 (max 18 in a day), so one region ≈ 200 credits a month of the free 500 (the event list call is free) — it fits on paper. Not verified: whether any EU/UK bookmaker prices `team_totals` for these leagues (The Odds API says additional markets are mostly US books; Brasileirão coverage unknown). Needs: you to create a free key at the-odds-api.com (an account I can't create for you), then one test call per league to confirm coverage before building.


### FK-45 — League view: one page per competition (like calendarkit's League view)
**What:** a League view, like calendarkit's League schedule view but for many competitions: a picker with the six leagues, the UCL, Libertadores / Sudamericana and the domestic cups. For the picked competition it shows every game of that competition (all its teams, not only the followed clubs), with calendarkit's List and Calendar modes (one day at a time, ← → arrows, date picker, Today, "No games" days shown), its teams (each linking to the club's Team Calendar), and its standings as part of the view (leagues: the table, with FK-43's step-through; cups: the bracket / groups the Cups tab already has). The owner has no fixed design yet: build a usable first version that fits the current bar and pages, and he will redesign it by using it live.
**Step 1, then stop and report:** check that the data has every match of each competition (not only the followed clubs' matches). For any competition where it doesn't, say what's missing and whether a free source covers it; build the view for the complete ones and leave this item with a `Blocked:` note for the rest.
**Tests:** e2e: picking a league shows its games for a day and its table; picking a cup shows its games and its bracket; a team name opens that club's Team Calendar.

### FK-46 — League icon hover: round + link to the League view
**What:** hovering a match's competition icon (today it says "BR · Brasileirão", image docs/backlog-img/FK-46-league-icon.png) also says the round: "Brasileirão · Round 35". Where FK-43's rounds are approximate (LaLiga, Brasileirão), write "~Round 35" rather than show a number that may be wrong. Cups give the stage instead ("Copa do Brasil · Semi-final, 1st leg"). Clicking the icon opens FK-45's League view on that competition and that match's day. Needs FK-45.
**Tests:** unit: the label for a league match, an approximate-round league and a cup tie; e2e: clicking the icon opens the League view on that competition and day.

### FK-47 — Club form strip: window slots, empty windows shown, current match highlighted
**What:** the strip next to each team on a Slate card (image docs/backlog-img/FK-47-strip.png) changes from "the last 2 / next 2 matches" to windows: each slot is one window, the same midweek (Tue–Thu) and weekend (Fri–Mon) windows as the Window strip tags. Five slots: 2 windows before, this match's window in the middle, 2 after.
- A window with no match is an empty slot: dashed outline, a small "–", hover "No match · midweek 11–13 Nov". So rest is visible at a glance and slots line up across cards.
- A window with two matches (rare) splits its slot in two.
- The middle slot replaces FK-36's thin mark: this match, filled with the accent colour and showing the competition icon, so the current game stands out.
- Played and upcoming slots keep FK-32 / FK-36's look (crest on green / grey / red, crest outlined, "vs" / "@").
- The card stays 509 × 78 (same shape as calendarkit's for the combined Slate, gauntlet GT-14): shrink the slots to fit; don't widen the card.
**Tests:** unit: windows built from a club's matches (empty window, two-match window); e2e: a card shows 5 slots per team with the middle one highlighted.

### FK-48 — Arrows on the club form strip to move to earlier / later windows
From I-10
**What:** small ◀ ▶ arrows at the ends of the strip (image docs/backlog-img/I-10-strip.png) move that strip one window earlier / later (FK-47's windows), so you can look further back or ahead without leaving the Slate. The highlighted current match scrolls out of view when you move away; a click on it (or reloading) brings the strip back to centred. Arrows fit inside the 509 × 78 card. Needs FK-47.
**Tests:** e2e: ▶ shifts the strip one window later, ◀ back, and the centre resets.
