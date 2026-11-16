# Feature backlog — footykit

Planned work only, nothing built. Shipped items move to `BUILT.md` (rules: CLAUDE.md, "Feature backlog, built list and ideas").
Specs are written here from Claude chat. Item IDs are FK-1, FK-2, ... (never reused; FK is this repo's prefix, unique across the owner's repos).

## Ready

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
