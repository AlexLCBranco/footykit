# Feature backlog — footykit

Planned work only, nothing built. Shipped items move to `BUILT.md` (rules: CLAUDE.md, "Feature backlog, built list and ideas").
Specs are written here from Claude chat. Item IDs are FK-1, FK-2, ... (never reused; FK is this repo's prefix, unique across the owner's repos).

## Ready

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
