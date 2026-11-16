# Feature backlog — footykit

Planned work only, nothing built. Shipped items move to `BUILT.md` (rules: CLAUDE.md, "Feature backlog, built list and ideas").
Specs are written here from Claude chat. Item IDs are FK-1, FK-2, ... (never reused; FK is this repo's prefix, unique across the owner's repos).

## Ready

### FK-17 — Picked club highlighted in the top bar, like calendarkit

Reference: calendarkit (repo AlexLCBranco/calendarkit, team mode). When a team is picked, its picker button is clearly highlighted: blue border/outline, team logo, team name in bold white, plus an × button right next to it. footykit's `TeamPicker` (`TopBar.tsx`, class `fk-scope-team`) doesn't stand out the same way.

- Match calendarkit's look for the picked state: accent-blue border, logo + bold full club name, same height as the other bar buttons (36 px, 8 px corners per calendarkit's toolbar.css).
- The × from FK-16 sits right beside it, like calendarkit.
- Unpicked ("All clubs") stays plain.
- Applies to the FK-12 typeable picker once it lands (build FK-12 first if both are in the batch).

### FK-18 — Team Calendar month view: bigger day cells, no dead space at the bottom

In the team Calendar with span = Month, the grid ends well above the bottom of the window, leaving empty space. Make the grid fill the available height:

- Week rows grow so the month (5 or 6 weeks) fills the viewport below the bar/header, with a sensible minimum row height (today's size) so short windows scroll instead of squashing.
- Content inside a cell stays top-aligned; bigger cells just get more room.
- 1-week and 2-week spans unchanged unless they also leave dead space (then same rule).

### FK-19 — Browser tab title follows the page, like calendarkit

`pageTitle()` in `src/components/page.ts` already sets titles (e.g. "NEW · Nov 2026 — footykit"), but the owner says it doesn't follow where he is. Reference: calendarkit's `src/pageTitle.ts` ("BOS schedule · Nov 2026 — calendarkit", "Slate · Nov 13 — calendarkit", most specific part first).

- Make sure the title updates on every navigation: view tabs, club pick/unpick, ‹ › steps, Today, date input, span change, league/cup/comp pickers, back/forward, and direct URL load.
- Align the wording with calendarkit: team pages read "<ABBR> schedule · <period>" (calendar) / "<ABBR> list · <period>" (list); Day List "Day · Nov 15", Slate "Slate · Nov 15"; others keep their current names.
- Tests: e2e walks through each view and asserts `document.title` after each step.

### FK-20 — Team calendar cells: both abbreviations with the score between them

In the team Calendar cells, a played match shows "[logo] @ [logo] EVE" and the score only lower down ("L 1-3"). Like calendarkit ("BOS 108 @ 97 ORL"):

- Played: `<own logo> NEW 1 @ 3 EVE <opp logo>` on one line, the picked club always first, `@` / `vs` as today, the winner's number in bold/bright and the loser's dimmed, like calendarkit.
- Not played: `NEW @ EVE` (both abbreviations) with the kickoff time above, as now.
- Keep the W/L/D marker and form squares; drop the duplicated score from the lower line.

### FK-21 — Road trip and homestand labels, like calendarkit

Port calendarkit's runs (`src/data/runs.ts`, styles in `src/components/styles/runs.css`) to footykit's team views (Calendar and List):

- A run = RUN_MIN_GAMES or more of the club's matches in a row all away (road trip) or all at home (homestand), counted over the whole season across all competitions, never just the shown range. A neutral-venue match breaks a run, and so does a gap of RUN_BREAK_DAYS or more between matches.
- Label on each match of a run, same look as calendarkit: red-outlined "Road trip · 2/4", homestand in its own colour "Homestand · 1/3".
- Start with calendarkit's values (RUN_MIN_GAMES = 3, RUN_BREAK_DAYS = 6) as named constants in one place so the owner can tune them.
