# Feature backlog — footykit

Planned work only, nothing built. Shipped items move to `BUILT.md` (rules: CLAUDE.md, "Feature backlog, built list and ideas").
Specs are written here from Claude chat. Item IDs are FK-1, FK-2, ... (never reused; FK is this repo's prefix, unique across the owner's repos).

## Ready

### FK-14 — Calendar's free-window marking + legend in the team List view

The team Calendar (`TeamCalendar.tsx`) already tints free windows (`isFreeWindowDay`) and marks FIFA windows (`fifaWindowOn`), with a legend under it. The List view has none of that. Bring the same thing to the List view:

- Free-window days (no match that midweek/weekend window) get the same free tint as the calendar, on top of the FK-13 bands.
- FIFA window days get the same FIFA marker as the calendar.
- Same legend line under the list (extended with the FK-13 midweek/weekend colours). Reuse the calendar's code/classes; don't duplicate the logic.
- Respect the same "show free" toggle the calendar uses, if there is one.

### FK-15 — Hide Z4R and the "1C/2C/3C" tags by default, user can turn them on

Today tags are all-or-nothing per display mode (the "Tag display" select in `Footy.tsx`: Chips / Rail / Alerts / Off, saved under `fk:tags:v1`). The user wants the Z4R tag (`key: 'z4'`) and the alive-in-competitions tag (`key: 'alive'`, "1C/2C/3C") hidden unless they turn them on.

- Add per-tag on/off settings next to the Tag display select (e.g. small checkboxes or a "Tags ▾" menu listing each tag type with a short explanation of what it means).
- Defaults: Z4R off, 1C/2C/3C off; all other tags on as today. Saved in localStorage (new key, e.g. `fk:tags:hidden:v1`).
- Applies everywhere tags render (`TeamTags` in Day List, Slate, Team List, popups), in Chips and Alerts mode; Rail mode drops those segments too.
- Tests: default load shows no Z4R / nC tags; turning them on shows them and survives reload.

### FK-16 — Easy way back to the main menu from a team

When a club is picked, `TopBar.tsx` swaps the main tabs (List, Slate, UCL, Tables, Cups, Trailing) for Calendar/List, so the only ways out are the ← history arrow or picking "All clubs" in the dropdown. Fix:

- Keep the main tabs visible while a club is picked; clicking one leaves team mode and opens that view. The team's Calendar/List tabs sit beside them, visually grouped with the club.
- Add a clear × on the selected club (next to its logo/name) that leaves team mode and returns to the main List (today).
- Clicking the footykit name/logo (if there is one in the bar) also goes to the main List.
- Works with FK-12 (the new typeable club picker).
- Tests: from a team page, one click on a main tab or the × lands on that main view.

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
