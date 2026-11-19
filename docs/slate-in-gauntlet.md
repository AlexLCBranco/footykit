# Using footykit's Slate in the gauntlet

For a gauntlet widget that shows one day of football matches as Slate cards. Self-contained: an assistant in the
gauntlet repo can follow it without reading footykit's code. It mirrors calendarkit's Slate part
(calendarkit's docs/slate-in-gauntlet.md); the differences are listed at the end.

**Install** like calendarkit: a package pinned to a footykit commit,
`"footykit": "https://codeload.github.com/AlexLCBranco/footykit/tar.gz/<commit>"`. Import from
`footykit/src/slate/index.ts` only.

**One origin.** footykit is served at gauntlet-home.vercel.app/football/ through the gauntlet's rewrites, so the
whiteboard and footykit share localStorage. The snapshot (`/football/data/snapshot.json`), the day function
(`/football/api/day`), the logos (`/football/logos/…`) and the font all live under `/football/`: don't copy them.

**Inputs** (`SlateDay` props; nothing else is read — no URL, no app state):
- `data` — `await loadFootyData(timeZone)`: fetches the snapshot once per page (every widget shares the promise; a
  failed load retries on the next call) and indexes it in that zone.
- `day` — the local day, `YYYY-MM-DD` in `timeZone`. A day without matches says so.
- `timeZone?` — IANA zone (default: the browser's); the same one `data` was built with.
- `notes?` — `localNotesStore()` (one store per page, localStorage `fk:notes:v1`, follows other tabs). Leave it out for
  info-only cards.
- `width?` — the CSS width the cards fill (default 1840).
- `teamLink?` — `(teamId, day) => teamCalendarUrl(teamId, day)`: team names open that club's Team Calendar around the
  day in a new tab. Leave it out: team names are plain text.
- `live?` — `true` fetches the day's live scores and 3-way odds (`/football/api/day`, CDN-cached), again every minute
  only while a match is live or about to start. Default off: no request at all.

**Notes format** — `localStorage["fk:notes:v1"]`: `{ "<ESPN match id>": { "pre", "live", "post": string, "shown":
"pre" | "live" | "post" } }`, the same rules as calendarkit's `ck:notes:v1` (three slots, only the person switches
them; a note belongs to the match). The gauntlet's backup already saves and restores it: it exports every localStorage
key and saves on any change, footykit's tab included.

**Must know**
- At rest the part starts no timer and no animation frame (tested: tests/slate-part.test.tsx).
- The part imports nothing from footykit's app shell (tested).
- Copies: `copyColumns(n, cardSize)` is the largest-cards rule footykit's own Slate copy uses (page 1920 × 911;
  `COPY_GAP` −1, a shared border, and `COPY_MARGIN` 12 px around, as calendarkit's).
- Cards (FK-35) are calendarkit's size: `SLATE_CARD_WIDTH` × `SLATE_CARD_HEIGHT` (529 × 78 info-only: calendarkit's 509 plus 20 px for FK-53's bigger strip squares), the grid tight
  with shared 1 px borders, "SLATE · 19-11 · Football" across the top. `slateHeaderLabel(day, ['NBA', 'Football'])` gives
  a combined Slate's header.

**Differences from calendarkit's part**
- Team links are a prop (`teamLink`), not a context provider.
- Live scores and odds are one switch (`live`), not an odds store.
- Days are local days (football's days are not tied to US Eastern dates).
