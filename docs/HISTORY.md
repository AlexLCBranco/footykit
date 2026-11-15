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
