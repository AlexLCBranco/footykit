# Feature backlog — footykit

Planned work only, nothing built. Shipped items move to `BUILT.md` (rules: CLAUDE.md, "Feature backlog, built list and ideas").
Specs are written here from Claude chat. Item IDs are FK-1, FK-2, ... (never reused; FK is this repo's prefix, unique across the owner's repos).

## Ready

### FK-75 — Header: every control above the line, "All clubs" always on screen
**In short:** On every page the What / How / dates controls move up into the tabs row, in the empty space to the right of Today / Clubs / Leagues / Cups / Tools, an "All clubs" button is always on screen beside the club box, and nothing is left under the header line.
**Why:** Owner's rules (2026-11-21): nothing crosses the header line, the line never moves down, and footykit and calendarkit share one layout (CK-33).
**Pictures:** calendarkit's `docs/design/DESIGN_LOG.md`, mock C, is the target layout.
**What:**
- The header stays exactly 92px tall with its two rows. It may never get taller. Row 1 is unchanged.
- Row 2 on Clubs, left to right: the five tabs · "All clubs" button · club picker · Calendar / List · 1 week / 2 weeks / Month · month arrows with the month name, date picker and Today.
- "All clubs" button: replaces the small × beside the club box. Always on screen on Clubs. One click does what the × does today (back to every club). Lit when no club is open.
- The club picker itself is unchanged.
- The "WHAT" and "HOW" labels are dropped (no room, and the controls explain themselves).
- Same rule on Today, Leagues, Cups and Tools: that page's controls go in row 2 and nothing sits between the header line and the page content. If a page's controls can't fit row 2 on a 1912px-wide window without shrinking text or wrapping (Tools has a second line of choices), leave that page as it is and add a `Blocked:` note naming the page and what doesn't fit.
- The freed height goes to the page content (bigger calendar boxes on Clubs).
**Sibling:** CK-33 in calendarkit.
**Answered (2026-11-21):** What should Leagues, Cups and Tools do, and do Today's day strip and a club's title row stay? → Today and Clubs are done (v0.84.0); what is left to build is Leagues, Cups and Tools. On each of the three, the row of league / competition buttons becomes one dropdown box, looking and working like the club box on Clubs (same height, same style, the open league / competition shown in it with its logo, click to pick another, type to filter if the club box does). Leagues, row 2: the five tabs · league box · Table / Relegation / Calendar / Simulator / History · Day / Week and the dates (on Calendar only). Cups, row 2: the five tabs · competition box · the World Cup's year box (when the World Cup is open) · the views. Tools, row 2: the five tabs · competition box · "Trailing". The controls stay in row 2 on every view of a page (no jumping under the line when Calendar is picked). Today's strip of day boxes and a club's title row (crest, name, month) stay where they are: they are page content, not controls. Measured on 2026-11-21: row 2 has 1348px free right of the five tabs; the button rows took 564px (Leagues), 1264px (Cups) and 1640px (Tools). If a page still doesn't fit at 1912px with the box, leave that page and add a `Blocked:` note with the numbers.
**Tests:** e2e at 1912×913 on a club's month (Palmeiras): header is 92px tall; no control row under the header line; "All clubs" leaves the club and is lit then; the page doesn't scroll. For Leagues (on Calendar), Cups (World Cup open) and Tools, e2e at 1912×913: header is 92px tall; no control row under the header line; the box lists every league / competition that had a button and picking one opens it; unit: the box's list equals the old buttons' list.

### FK-76 — footykit serves its Slate kit live, for the whiteboard
**In short:** Nothing changes on screen in footykit: it starts serving its Slate as a kit that gauntlet loads live, so a new card design shows on the whiteboard without anybody updating gauntlet.
**Why:** Owner, 2026-11-21 (gauntlet GT-14): a pinned package means someone must remember to update gauntlet after every footykit card change. calendarkit already serves its kit live; footykit does the same.
**What:**
- Same way as calendarkit's Slate kit. Read it there first: `vite.slatekit.config.ts`, `src/slate/kit.ts`, the `build` script in `package.json`, and the `slatekit/manifest.json` rules in `vercel.json`.
- The build writes `dist/slatekit/` with the kit as one ES module, its stylesheet, and `manifest.json` (`{ api, version, js, css }`), never cached. Reachable at `/slatekit/manifest.json` here and at `/football/slatekit/manifest.json` through gauntlet.
- The kit exports what gauntlet needs to draw footykit's Slate for one day, with live scores: the whole-day Slate (SlateDay) as the site draws it today. Same card, same size (561 × 96), nothing redrawn.
- The kit has an API number (as calendarkit's `SLATEKIT_API`), raised whenever an export changes in a way that breaks older users.
- If something calendarkit's kit does has no clear match in footykit: stop, add a `Blocked:` note saying what, and report.
**Sibling:** gauntlet GT-14 waits for this.
**Tests:** unit: the manifest has api, version, js and css and the files exist after a build; e2e on the live site: `/slatekit/manifest.json` answers 200 with no-cache, and its js imports and draws a day's Slate in a blank page with the same cards as the site's Slate.

### FK-77 — The Slate kit gives one match card on its own
**In short:** Nothing changes on screen in footykit: its Slate kit can also hand over a single match card and the day's list of matches, so the whiteboard can mix football and NBA games in time order.
**Why:** gauntlet GT-21 (Combined Slate). Today the kit only draws a whole day, so cards can't be mixed with another sport's.
**What:** after FK-76.
- The kit exports: the list of a day's matches (each with its start time as an exact instant, and an id), and a way to draw one match's card alone, exactly the card the Slate shows (561 × 96, live score included).
- Which matches belong to a day: A game counts for the day it starts on in São Paulo time, and a game that starts before 05:00 São Paulo time counts for the day before (owner's rule, 2026-11-21: a late NBA game belongs to the night it is part of; football in South America and Europe never starts that late). If footykit's Slate uses another rule today, say so in the report and change nothing.
- The whole-day Slate keeps working and is built from the same single card (one card code, not two).
**Sibling:** calendarkit CK-34. gauntlet GT-21 waits for both.
**Tests:** unit: the day's list is in start-time order with exact instants; the 05:00 rule (a 04:30 start counts for the day before, a 05:00 start for that day); e2e: one card drawn alone is the same size and content as that match's card in the site's Slate.
