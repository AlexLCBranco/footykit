# Feature backlog — footykit

Planned work only, nothing built. Shipped items move to `BUILT.md` (rules: CLAUDE.md, "Feature backlog, built list and ideas").
Specs are written here from Claude chat. Item IDs are FK-1, FK-2, ... (never reused; FK is this repo's prefix, unique across the owner's repos).

## Ready

### FK-57 — Position change arrows in league tables
**In short:** Every domestic league table shows how many places each team moved since the round before (▲1, ▼2, –), and the arrows follow the table when you step through rounds with ◀ ▶.
**What:**
- Domestic league tables only (not Champions League league phase, not cups).
- Movement = position after the round shown (N) minus position after round N-1, using the same "after N rounds" rule as FK-43 (a postponed match counts in its own round). Round 1: no arrows.
- Small column right next to the position number: green "▲1", red "▼2", grey "–" for no change. Hover: "Was 7th after round 11".
- Stepping with ◀ ▶ / ← → recomputes the arrows for that round, always against the round before it. "Final table" compares with the round before the last.
**Tests:** unit: movement from a fixture season (up, down, same, round 1, postponed match); e2e: step back two rounds and the arrows change to that round's movement.

### FK-58 — "Extra tools" menu; Trailing moves into it
**In short:** The Trailing tab leaves the main menu and moves into a new "Extra tools" button next to the copy / list / info icons at the top right.
**What:**
- Remove "Trailing" from the View tabs (List, Slate, Tables, Cups, League stay).
- New icon button "Extra tools" placed with the existing icon buttons (copy, list, info), same style; tooltip "Extra tools". Click opens a small dropdown; first entry "Trailing", which opens the Trailing page exactly as today (competition picker included).
- While the Trailing page is open the Extra tools button looks active, so it's clear where you are. Existing links to the Trailing page keep working; the tab title stays dynamic.
- Future small tools go in this menu, not in the main tabs.
**Tests:** e2e: Trailing is not in the tabs; Extra tools → Trailing opens it; an old Trailing link still opens it.

### FK-59 — World Cup: every edition's groups, brackets and history
**In short:** A World Cup section under Cups where you pick any edition (1930–2026) and see how every group ended and the full bracket, with hovers on matches and links to each team's squad.
**What:**
- Place: Cups view, "World Cup" entry with an edition picker (newest first, opens on 2026).
- Groups: final tables of every group (P, W, D, L, goals, GD, Pts with that edition's points rule: 2 per win before 1994), qualified teams marked, plus the squares of each team's group matches (opponent, result) like the UCL / NBA Cup tables. Editions with second group stages (1950, 1974, 1978, 1982) show those groups too.
- 2026 (48 teams): the third-placed teams table that decided who went through.
- Bracket: full knockout bracket of the edition, with extra time and penalties shown on the score.
- Hover on any match: date, venue/city, score at 90', ET and penalties, goal scorers if the data has them. Click a match: Google search for it (owner's rule: Google, not ESPN).
- Teams: every team links to its squad for that edition (Wikipedia "<year> FIFA World Cup squads" page, that team's section). Click a team name elsewhere in the section: that team's World Cup history (every edition, how far it went).
- Data: a free source only (e.g. openfootball's World Cup data on GitHub; verify coverage per edition). Check the data against a second source for a few editions. If a part (scorers, venues, an edition) is missing from free sources, show it as missing and say so in the report; never fill it by hand from memory.
**Tests:** unit: group tables from the data equal the real final tables for at least 1982, 1994, 2014, 2022, 2026 (checked against a second source); 2026 third-place ranking; e2e: pick 2014, open a group, hover a match, follow a squad link.

### FK-60 — World Cup what-if simulator (resimulate any edition)
**In short:** In any World Cup edition you can change match results and see the group tables and the bracket update side by side, starting from what really happened.
**What:**
- Same simulator as the league/UCL what-if, with fast mode (pick the winner/draw) and detailed mode (enter scores), tables and bracket visible at the same time (owner checks "side of death" across several simulations).
- Starts from the real results; any match can be changed; "Reset to real results" and "Clear all" buttons.
- Uses each edition's rules (points per win, tiebreakers, best thirds for 1986–1994 and 2026, who meets whom in the bracket).
- v1 covers the 32-team editions (1998–2022) and 2026. Older formats: history only (FK-59), with a short note that the simulator doesn't cover that edition yet.
**Tests:** unit: entering the real results reproduces the real tables and bracket for 2002, 2018, 2022, 2026; changing one 2022 group match changes the bracket as the rules say; e2e: change a result, see table and bracket update together, reset.

### FK-61 — Countdown to the Slate's first match (halftime-timer)
**In short:** The Slate gets a "⏱ Countdown" button that opens halftime-timer with a timer counting down to the day's first match.
**What:**
- Button in the Slate header. Opens halftime-timer in a new tab with an end-time timer set to the first match's kickoff, named e.g. "First match · Arsenal–Chelsea 16:30".
- If the first match has already started, it counts to the next match that hasn't, and the timer name says so ("Next match · …"). If none is left: button disabled, tooltip "No more matches today".
- Uses the link format from halftime-timer HT-1.
Blocked: waits for halftime-timer HT-1 (its link format and live URL); the owner unblocks it once HT-1 ships.
**Tests:** unit: picking the first / next not-started match, link built correctly; e2e: the button's link points to halftime-timer with the right time and name.

### FK-62 — Floating live scores window
**In short:** A "Pop out live scores" button opens a small always-on-top window (like halftime-timer's pop-out) with today's matches and live scores, so you can watch them over other apps.
**What:**
- Same technique as halftime-timer's pop-out (Document Picture-in-Picture, works in Chrome/Edge on desktop; in other browsers the button is hidden).
- Button in the Slate header. Window: one compact line per match of today (or of the Slate's day): time or live minute, teams, score; red LIVE label for matches in play; finished ones show the final. Updates with the same live data the Slate uses; no extra polling when nothing is live.
- Window is small and resizable; content fits without a scrollbar for a normal day, scrolls if very many matches.
**Tests:** unit: the window's list (order, live/final/upcoming); e2e: the pop-out content renders from mocked live data (the real window needs a click, so check the component the window shows).
