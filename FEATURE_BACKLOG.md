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

### FK-22 — Same shell as calendarkit: bar, buttons, switches, date block, accent colour

Goal of FK-22 to FK-25: footykit and calendarkit must feel like one website. Reference for all four: the calendarkit repo (public, github.com/AlexLCBranco/calendarkit, `main`). Read its files; copy values and structure, don't invent.

Build after FK-17 and FK-19 (same top bar).

- Accent colour: footykit's control accent becomes calendarkit's blue (`--ck-accent`, #4ea1ff): picked tab/switch, scope border, focus rings, active states. Green stays only where it means something (win, weekend band, live/positive marks). `--fk-win` keeps its green.
- Top bar metrics as calendarkit's packed bar (`src/components/styles/toolbar.css`, `menu.css`): same row height, gaps, padding and separators. Today footykit's bar is 44 px min-height with 12 px gaps; calendarkit's rows are 36 px with 8 px gaps.
- Switches: footykit's `Tabs` strip (`fk-tabs` / `fk-tab`) takes the look and states of calendarkit's `Segmented` (`src/components/Segmented.tsx` and its styles): same height, corners, picked / hover / disabled states, font size and weight.
- Buttons: `fk-btn`, `fk-icon-btn`, `fk-hist-btn` and the ‹ › steps (`fk-step`, round today) match calendarkit's equivalents in size, shape, border and hover.
- Date block: same order, spacing and text style as calendarkit's (`PeriodNav.tsx`, `period-nav.css`), Today button included.
- The league / cup / competition `<select>` pickers take the same box style as the other bar controls (height, border, corners, font); they stay native selects.
- No behaviour change: same tabs, same addresses, same test ids. Football-only controls (Tags switch and its menu) stay, restyled to match.
- Tests: existing e2e pass unchanged; add one e2e asserting the bar's computed row height and the picked switch's colour.

### FK-23 — Team header above the team views, like calendarkit

calendarkit shows a header above its Team Calendar and Team List (`src/components/TeamHeader.tsx`, `styles/team-header.css`): logo on a backing, team name, the period shown. footykit has none.

- Add the same header above footykit's team Calendar and team List: club logo (same backing treatment), full club name, the period shown (month, or the 1 / 2 week range), same sizes and spacing as calendarkit's.
- It is part of the page, not the fixed bar, and is included in whole-view copies exactly where calendarkit includes its header (follow calendarkit's rule).
- FK-18's "fill the viewport" height accounts for this header.
- Tests: e2e for the header's name and period on Calendar (each span) and List, updating on ‹ › and club change.

### FK-24 — Team Calendar grid and cells on calendarkit's design

footykit's team Calendar uses its own cell layout (`TeamCalendar.tsx`: `fk-cell-top`, `fk-cell-time`, `fk-cell-ha`, `fk-cell-score`, `fk-cell-bottom`, `fk-cell-tags`). Rebuild the grid and cell look on calendarkit's Team Calendar (`TeamMonthGrid.tsx`, `GameCard.tsx`, `styles/grid.css`, `styles/game-card.css`, `styles/team.css`) so the two calendars read as the same design.

Build after FK-18 and FK-20; keep what they shipped (cells fill the height; one line `NEW 1 @ 3 EVE` with logos, winner bright).

- Same as calendarkit: weekday header row, day-number position and size, cell border / padding / corner treatment, today marker, empty and out-of-month cells, where the kickoff time sits, logo size, the matchup line's font size and weight, where chips sit, hover state, and 1-week / 2-week cells scaled the way calendarkit scales its bigger spans.
- Football content stays, placed in calendarkit's slots: competition logo/name where calendarkit puts its game marker (Cup / playoffs); W/D/L marker and form squares; tags (window, 1C/2C/3C, Z4R, derby) where calendarkit puts its fatigue chips; free-window tint, midweek / weekend meaning and the FIFA dot unchanged; FK-21's run labels where calendarkit puts "Road trip · 2/4".
- Legend: follow calendarkit's Team Calendar. If calendarkit shows no legend under the grid, move footykit's legend into the bar's ⓘ; if it does, match its look.
- No data or behaviour change: same clicks (match → Google search link, club → its Calendar), same addresses, same test ids where the element still exists.
- Tests: existing team-calendar e2e adapted; copy-as-image and marquee selection still work on the new cells.

### FK-25 — Screenshot parity pass against calendarkit

After FK-22 to FK-24. Close the remaining look-and-feel gaps the owner hasn't listed, by comparing the two apps rendered side by side.

- Run both apps locally (footykit, and a fresh clone of calendarkit `main`) at 1920 × 911, the owner's full-window size.
- Screenshot each pair: footykit day List ↔ calendarkit League List; team Calendar ↔ Team Calendar (1 week, 2 weeks, month); team List ↔ Team List; Slate ↔ Slate (notes hidden and shown); Tables ↔ Standings; Quick standings popup ↔ Quick standings popup; one hover popup of each kind both apps have (series squares, streak / form).
- For each pair, bring footykit to calendarkit's: page margins and left alignment, column order and widths where the columns mean the same thing, row heights, font sizes and weights, heading styles, chip / badge shapes, popup frame (border, shadow, corners, padding), rest rows, "no matches" rows, scrollbar treatment, the site-version stamp.
- Don't touch: anything football-only with no calendarkit counterpart (window bands, tags, UCL / Cups / Trailing / Simulator pages) beyond giving it the shared fonts, buttons and popup frame; no behaviour, address or data changes; nothing in calendarkit.
- Where matching calendarkit would hide or shrink football information, keep footykit's version and list it in the report.
- Report: before / after screenshot pairs saved under `docs/parity/`, and a short list of differences left on purpose with the reason.
