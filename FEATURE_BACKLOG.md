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

