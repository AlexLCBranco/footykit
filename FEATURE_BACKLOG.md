# Feature backlog — footykit

Planned work only, nothing built. Shipped items move to `BUILT.md` (rules: CLAUDE.md, "Feature backlog, built list and ideas").
Specs are written here from Claude chat. Item IDs are FK-1, FK-2, ... (never reused; FK is this repo's prefix, unique across the owner's repos).

## Ready

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
