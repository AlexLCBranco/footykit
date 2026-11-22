# Feature backlog — footykit

Planned work only, nothing built. Shipped items move to `BUILT.md` (rules: CLAUDE.md, "Feature backlog, built list and ideas").
Specs are written here from Claude chat. Item IDs are FK-1, FK-2, ... (never reused; FK is this repo's prefix, unique across the owner's repos).

## Ready

### FK-61 — Countdown to the Slate's first match (halftime-timer)
**In short:** The Slate gets a "⏱ Countdown" button that opens halftime-timer with a timer counting down to the day's first match.
**What:**
- Button in the Slate header. Opens halftime-timer in a new tab with an end-time timer set to the first match's kickoff, named e.g. "First match · Arsenal–Chelsea 16:30".
- If the first match has already started, it counts to the next match that hasn't, and the timer name says so ("Next match · …"). If none is left: button disabled, tooltip "No more matches today".
- Link format (halftime-timer HT-1, shipped; its README): `https://halftime-timer.vercel.app/?end=<ISO date-time with offset>&name=<text, URL-encoded>`, e.g. `https://halftime-timer.vercel.app/?end=2026-11-19T20:00:00-05:00&name=First%20game%20%C2%B7%20BOS%20%40%20DET`.
**Answered (2026-11-21):** Has halftime-timer HT-1 shipped (link format and live URL)? → Yes: it is in halftime-timer's BUILT.md, live at https://halftime-timer.vercel.app; the link format is in the bullet above.
**Tests:** unit: picking the first / next not-started match, link built correctly; e2e: the button's link points to halftime-timer with the right time and name.

### FK-68 — FIFA+ full-match links on 2022 World Cup matches
**In short:** Every 2022 World Cup match with a free full replay on FIFA's own site gets a ▶ link that opens it.
**What:**
- Same ▶ as FK-67, same places, on the 2022 edition. Title: "Full match on FIFA+". The Google link on the score stays.
- Target: the match's "Full Match Replay" page on FIFA+ (seen from chat on 2026-11-20: the final is at `https://www.fifa.com/en/watch/Ar2sZ_9GHkie8SDq2Mt4gg`, 2h38). The page IDs are random, so each match needs its real URL: never a built or guessed one.
- Fallback, only when a match has no FIFA+ replay page: FIFA's official YouTube "FULL MATCH" upload of it (the final is `https://www.youtube.com/watch?v=RgqKdplLIk4`), title "Full match on FIFA's YouTube". Neither exists: no ▶.
- Data: `public/worldcup/2022-videos.json`, match number → full URL, built by a script. Share one file shape and one ▶ component with FK-67 (if FK-67 stored YouTube IDs only, widen it to full URLs).
- Not known from chat: how to list the 64 replay pages (FIFA+ is script-rendered; look for a public listing, API or sitemap), whether all 64 exist, and whether playback needs a sign-in or is region-limited. The script prints which matches have no link.
- If the pages can't be listed automatically: stop, add a `Blocked:` note with what was tried, and report.
**Answered (2026-11-21):** Allow Claude Code to read cxm-api.fifa.com, or use FIFA's YouTube "FULL MATCH" uploads for all 64? → Allow cxm-api.fifa.com: allow rules added in `.claude/settings.json` (WebFetch and curl for that host). Found on 2026-11-20: fifa.com's robots.txt names a sitemap at `https://cxm-api.fifa.com/fifaplusweb/api/sitemaps`, and each replay page loads its data from that host (`…/api/pages/en/watch/<id>`, `…/api/sections/videoDetails/<id>`); the 2022 tournament page on fifa.com links to no replay; the final's page plays with no sign-in (from Brazil). If reads of that host are still refused, stop and add a `Blocked:` note quoting the exact refusal message and which tool gave it.
**Tests:** unit: a match with a FIFA+ URL uses it, one with only a YouTube URL uses that with the other title, one with neither renders no ▶; e2e: the 2022 final has a ▶ whose href is the FIFA+ replay page; data check: every URL in the file answers 200. By hand (can't be automated): open one ▶ and confirm the full match plays without paying.

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
Blocked: Today and Clubs are done (v0.84.0). Leagues, Cups and Tools are left as they were: their controls don't fit the tabs row on a 1912px-wide window without shrinking text or wrapping. The row has 1348px free to the right of the five tabs. Leagues needs 1622px on its Calendar view (the six league buttons 564 + Table / Relegation / Calendar / Simulator / History 372 + Day / Week 106 + the dates 532 + gaps); its other four views need 952px and would fit, but then the controls would jump under the line each time Calendar is picked, so the whole page was left. Cups needs 1667px (the eleven competition buttons 1264 + its views up to 387 + gap), and the World Cup's year box comes on top. Tools needs about 1730px (the fifteen competition buttons 1640 + "Trailing" 72 + gap). Two more things are still under the line and were not named in the spec: Today's strip of day boxes (1840px wide, it can't go in the tabs row) and a club's title row (crest, name, month). To unblock: say what Leagues, Cups and Tools should do (for example, one dropdown box for the league / competition, like the club box), and whether the day strip and the club's title row stay.
**Tests:** e2e at 1912×913 on a club's month (Palmeiras): header is 92px tall; no control row under the header line; "All clubs" leaves the club and is lit then; the page doesn't scroll.
