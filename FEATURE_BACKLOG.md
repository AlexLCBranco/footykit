# Feature backlog — footykit

Planned work only, nothing built. Shipped items move to `BUILT.md` (rules: CLAUDE.md, "Feature backlog, built list and ideas").
Specs are written here from Claude chat. Item IDs are FK-1, FK-2, ... (never reused; FK is this repo's prefix, unique across the owner's repos).

## Ready

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
