# Parity pass against calendarkit (FK-25)

Screenshots at 1920 × 911 (the owner's full window), footykit on its recorded snapshot ("now" = Sat, Nov 21 2026)
and a fresh clone of calendarkit `main` (8a2041e) on its own data. `before/` is footykit after FK-22 to FK-24, `after/`
is footykit after this pass; the calendarkit shot of each pair is the same in both. Regenerate with
`node scripts/parity-shots.mjs before|after` (both dev servers running: footykit on 5190, calendarkit on 5180).

| Pair | footykit | calendarkit |
|---|---|---|
| day-list | Day List | League List |
| team-calendar-month / -2w / -1w | team Calendar | Team Calendar |
| team-list | team List | Team List |
| slate-notes-hidden / -shown | Slate | Slate |
| tables | Tables (Premier League) | Standings |
| quick-standings | Quick standings popup | Quick standings popup |
| hover-form / hover-series | form squares tooltip, season series popup | streak tooltip, series popup |

## Brought to calendarkit's in this pass

- List rows and Slate cards on calendarkit's card surface (`--surface-2`).
- Team List month headings as calendarkit's month dividers (11 px, uppercase, a line under); "Load earlier" centred like
  its "Load more games".
- Quick standings popup: calendarkit's frame (12 px corners, its shadow), an 18 px "Standings" title, 30 px boxed
  reset / close buttons, its padding.
- Tables (Tables page, Quick standings, UCL, cups, simulators): calendarkit's standings panel — on the surface, a
  border with 10 px corners, 11 px headers, a line between rows.
- Page margin of the UCL / Tables / Cups / Trailing / Simulator pages: the heading and tables start at the bar's left
  edge, as calendarkit's pages do; page titles at its 18 px / 700.
- Season-series popup heading in calendarkit's sentence case.

Done before this pass (FK-22 to FK-24): the bar, switches, buttons, date block, accent colour, team header, and the
Team Calendar grid and cells. The site-version stamp, scrollbar gutter and page width already matched.

## Left different on purpose

- **Day List row size.** calendarkit zooms its League List rows up to fill the window (9 games there); footykit's day
  often has 20+ matches, so its rows keep their size to keep the whole day (and the map) on one screen.
- **Day strip** under the bar on the Day List and Slate: footykit's (every day with its match count, FIFA windows
  underlined); calendarkit's 7-day strip has no counterpart for that.
- **Out-of-month days** in the month Calendar keep their matches (dimmed); calendarkit leaves them blank. Hiding them
  would hide matches.
- **Team List**: no travel map beside it (footykit has none for the List); its window bands, free-window tint, FIFA
  marks and competition column are football-only (FK-11, FK-13, FK-14).
- **Tooltips**: footykit's form squares, tags and rows use the browser's own tooltips (`title`); calendarkit has its own
  floating tooltip. Replacing every `title` is a behaviour change across the app, left for a backlog item if wanted.
- **Series popup** opens on click (calendarkit: on hover); behaviour, not look.
- **Tables' zone marks** stay footykit's coloured left bars and hatching (Champions League / Europa / relegation
  places, possible places hatched); calendarkit draws playoff / play-in lines.
- **"All clubs" picker** stays plain until a club is picked (FK-17); calendarkit's scope picker is outlined in both
  states.
- **Slate cards** keep footykit's size (the largest-cards rule for copies) and its extra lines (competition, odds draw
  price, notes).
