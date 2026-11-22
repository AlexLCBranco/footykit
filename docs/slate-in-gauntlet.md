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

**Live kit (FK-76, the way calendarkit's works): no pin.** footykit's build also writes the Slate part as a kit:
`/football/slatekit/manifest.json` (never cached) is `{ api, version, js, css }`. Load `css` as a stylesheet and
`import(js)`: one ES module with every name below plus `SLATEKIT_API`. Before importing, hand over the page's own
React (the kit bundles none, so the cards are part of the page's React tree):
`globalThis.__footykitHost = { react, jsxRuntime, reactDom }` (the `react`, `react/jsx-runtime` and `react-dom`
modules, React 19). If `api` is higher than the one the gauntlet was written for, keep the pinned copy until the
gauntlet is updated; names are only ever added without a bump.

**One card and the day's list (FK-77, for the combined Slate).**
- `slateMatches(data, day)` — the day's matches in start order: `{ id, start, startMs, timeUnknown }`, `start` an exact
  instant (ISO, UTC). The day is the combined Slate's: São Paulo time, and a start before 05:00 counts for the day
  before (`slateDayOf(instant)` gives the day of any instant, for the other sport's games too). footykit's own Slate
  (and `SlateDay`) still shows the viewer's local day from midnight; for football the two agree on São Paulo time.
- `SlateMatchCard` — one match's card alone, exactly the Slate's card (561 × 96 without notes). Props: `data`,
  `matchId` (an id from the list), and `SlateDay`'s `timeZone`, `notes`, `teamLink`, `live`, `gameMenu`, `weather`,
  `now`; `width?` (default the card's width; with notes, the room it is given). Cards with `live` on share one
  request per day.
- Neither the kit's cards nor `SlateDay` draw the small tags beside the teams (the site's own Slate does).

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
- Cards (FK-35) are calendarkit's size: `SLATE_CARD_WIDTH` × `SLATE_CARD_HEIGHT` (561 × 96 info-only since FK-73's stadium line, 18 px; before that 561 × 78: calendarkit's 509 plus 20 px for FK-53's bigger strip squares and 32 px for FK-50's streak track), the grid tight
  with shared 1 px borders, "SLATE · 19-11 · Football" across the top. `slateHeaderLabel(day, ['NBA', 'Football'])` gives
  a combined Slate's header.

**Differences from calendarkit's part**
- Team links are a prop (`teamLink`), not a context provider.
- Live scores and odds are one switch (`live`), not an odds store.
- Days are local days (football's days are not tied to US Eastern dates).
