# Feature backlog — footykit

Planned work only, nothing built. Shipped items move to `BUILT.md` (rules: CLAUDE.md, "Feature backlog, built list and ideas").
Specs are written here from Claude chat. Item IDs are FK-1, FK-2, ... (never reused; FK is this repo's prefix, unique across the owner's repos).

## Ready

### FK-35 — Slate in the same shape as calendarkit's (for a combined Slate)
**What:** make footykit's Slate cards the same size and layout as calendarkit's Slate cards (columns, row height, card width, logos, score, odds), so the gauntlet can show a combined Slate (gauntlet GT-14). Add the same header line as calendarkit CK-10 ("SLATE · 18-11 · Football"). Design is open for this first version: match calendarkit's.
**Tests:** e2e: a footykit card and a calendarkit card measure the same size; header shows.

### FK-36 — Club form strip: 2 before, 2 after
**What:** the strip that shows a club's next 5 matches (`src/components/Bits.tsx`, the `fk-fg` squares) shows 2 played (with results) and the next 2 instead of 5 ahead.
**Tests:** unit for picking 2 + 2 (start and end of season: fewer when there aren't any); e2e count of squares.

### FK-37 — Hover popup on the k/n chip like calendarkit
**What:** the "2/2" chip (image `docs/backlog-img/FK-37-chip.png`) opens a popup on hover with the same layout and kind of content as calendarkit's chip popup (calendarkit `src/slate/Fatigue.tsx`: what the run is, previous/next match, rest days, day squares).
**Tests:** e2e: hover opens the popup, it closes on leaving (like calendarkit CK-6).

### FK-38 — Slate: home team on the first line
**What:** on footykit's Slate cards the home team is always the first line and the away team the second.
**Tests:** e2e on a known match.

### FK-39 — Weather on matches
**What:** full weather for each match at kick-off (temperature, feels-like, rain chance, wind) from Open-Meteo (free, no key, non-commercial; attribution "Weather data by Open-Meteo.com" required, CC BY 4.0), using the coordinates already in `config/venues.json`. Show it in the match's popup and a small icon on the Slate card, no extra card width. Only forecasts (Open-Meteo forecasts up to 16 days ahead); cache per venue per hour.
**Tests:** unit for building the request and reading the answer (fixture); one live check for one venue.

### FK-40 — Slate game button: links (player props, injuries)
**What:** same as calendarkit CK-15: a game button on each Slate card opens a pop-up with links, never betting in the app: each club's injury/suspension page (Transfermarkt team page is the first candidate: verify it exists for every followed club, including the Brazilian ones; if not, report which and use a fallback with a test) and a link to that match on a betting site's props page if one can be built reliably (else the site's football section).
**Tests:** unit: an injury URL for every followed club; e2e pop-up opens with the links.

### FK-41 — "Team to score" odds in a Slate popup (feasibility first)
**What:** for each Slate team, the odds that it scores at least 1 goal, shown only in a popup (not always visible). Step 1, then stop and report: check whether a free odds source has this market for the followed leagues and what it costs per day (The Odds API's free plan is 500 credits a month and a call can cost several credits). Fetch at most once per day per slate and cache. If it doesn't fit for free, mark `Blocked:` with the numbers.
**Tests:** unit for reading the market from a fixture; a counter test that one Slate costs at most one fetch per day.
