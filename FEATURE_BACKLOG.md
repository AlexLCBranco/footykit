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
