# footykit — HISTORY

Archive of earlier rounds and probes. PROJECT.md holds what is in force.

## 2026-11-14 — Phase 1, data check
Repo created; ESPN verified as the single source (docs/phase1-report.md, docs/phase1-data-check.md).

## 2026-11-15 — Feature backlog item 1: goals while trailing (v0.18.0)
Per-goal data audit on the full raw payloads of 2026-11-14 (test-output/raw.json.gz): the club schedule feeds carry
no goal events; the competition scoreboards do (`competitions[0].details`: `scoringPlay`, `ownGoal`, `shootout`, clock
"45'+2'", `team` = the side credited). Played matches with goals but no goal list, per scoreboard: all six leagues, UCL,
Europa, Conference, Sudamericana, FA Cup, EFL Cup, DFB-Pokal, Coppa Italia: none (each side's goals add up to its
score, 141 matches with own goals). Libertadores: 1 (401865517, 0-3 on 2026-05-08, also empty on ESPN's summary page:
an awarded result). Copa do Brasil 74, Copa del Rey 23, Coupe de France 5 (+1 listing only one of its two goals); state
championships, super cups, Copa do Nordeste and the Recopa have no scoreboard in the snapshot (ESPN's per-match summary
has their goals). Alex: build it for the complete competitions only (the Libertadores included, its awarded match
counted as no goals while trailing and named under the table).

## 2026-11-15 — Backlog item 2: "What-if" → "Simulator" (v0.18.1)
Visible labels only (UCL / Tables buttons, simulator headings, tab titles and the history tooltips built from them).
The view id stays `whatif`, so no redirect is needed: old links and saved history open the simulator as before.

## 2026-11-15 — Backlog item 3: matchday arrows in the simulators (v0.19.0)
The long list of matches left became one group at a time: the UCL by matchday ("Matchday 5 · Nov 24, Nov 25"), a
league by window (ESPN gives leagues no round numbers, so the window stays the unit). Pending stays above. Bulk fills
and Clear keep acting on every match left (item 6 adds a per-matchday Reset; Clear stays clear-everything).

## 2026-11-15 — Backlog item 4: pot badge over 4-letter codes (v0.19.1)
Cause: `.fk-wi-abbr` was a 32 px flex item; a 4-letter code in the row font is 36–40 px wide, so where the row had no
room to spare (1280 px windows and below) the text ran under the pot badge (BODO, COMO, ROMA). At 1920 px the flex
item grew to fit, which is why it showed only sometimes. Fix: a fixed 3.7em slot that never shrinks, longer codes
clipped with "…". Test: e2e at 1920 / 1280 / 1024 px over every matchday (failed on the old code at 1280 px).

## 2026-11-15 — Backlog item 5: no scrollbars inside tables (v0.20.0)
Tables that scrolled inside a box: the simulators' table column (fixed height, overflow auto) and the quick standings
popup body. Every table now renders through `SplitTable`: it measures the row and header height and the table width,
and picks the fewest columns (up to 3) that fit the window's bottom (the holder's own height can't be used: it grows
with the table), within the width. The simulator grid gives its spare width to the table column (the bracket column
was taking it) and grows with the table; the list and bracket columns keep the window height. A standings popup
taller than the window turns position: absolute so the page scrolls to its end.

## 2026-11-15 — Backlog item 6: Reset per matchday (v0.21.0)
`ResetGroup` in WhatIfParts.tsx, beside the GroupNav header: `clear()` over the matchday's matches shown (with a team
picked, that team's), so locks stay as with the toolbar's Clear, through the same undo history. Hidden when nothing
there could be emptied (no pick, or only locked ones).

## 2026-11-15 — Backlog item 7: pots hidden, Pots tab (v0.22.0)
Removed: the pot badge after each team in the UCL table and the simulator (table and match rows), the pot corner of the
UCL squares, and the rules' Pots section (now the Pots tab). The Left column was made only of pot badges, so it lists
the opponents still to play by code instead, pots and places in its tooltip. No settings panel.

## 2026-11-15 — Backlog item 8: team name → month Calendar (v0.23.0)
Every team-name link goes through ctx.onTeam, now `teamClickPage`: span month, month = today's (before: the span shown
was kept, around the clicked day). The Slate part's `?view=cal&team=…&on=…` links open the same unless they name a
span. Left as it was: in the simulators a team name filters the matches (Phase 5 behaviour), it isn't a calendar link.

## 2026-11-15 — Backlog item 9: rest days in the Team List (v0.24.0)
Ported from calendarkit (TeamListView.tsx withRest / model.ts teamRestDays, App.tsx showRest, team.css .ck-rest-row):
every day between the first and last match with no match of the club, from all its matches (never the months shown);
rest = the difference of match dates. The toggle lives on the bar beside the List view (footykit has no Options menu),
state in Footy.tsx only. The Phase 2 plan's "no rest-day counts" is superseded by this item.
