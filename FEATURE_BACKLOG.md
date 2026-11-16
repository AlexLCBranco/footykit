# Feature backlog — footykit

Planned work only, nothing built. Shipped items move to `BUILT.md` (rules: CLAUDE.md, "Feature backlog, built list and ideas").
Specs are written here from Claude chat. Item IDs are FK-1, FK-2, ... (never reused; FK is this repo's prefix, unique across the owner's repos).

## Ready

### FK-26 — Fix the window streak count
The match tooltip's "Window streak" overcounts. Example: on Flamengo v Vasco (Thu Oct 29, 2026) it says "7th straight window (7 windows in a row with a match)", which doesn't match Flamengo's fixture list. Recount from the real fixtures (windows: midweek Tue–Thu, weekend Fri–Mon; logic in `src/data/tags.ts`). Add an automated test that checks the streak against a known fixture list, including this Flamengo case.
Blocked: no overcount found (2026-11-16). By the snapshot (ESPN), Flamengo has a match in each of the 7 windows up to Oct 29, in São Paulo time: Thu Oct 8 (Santos), Sun Oct 11 (Fluminense), Wed Oct 15 (Estudiantes), Sun Oct 18 (Bahia), Wed Oct 22 (Estudiantes), Mon Oct 26 (Atlético-MG), Thu Oct 29 (Vasco); before that, nothing Sep 21 – Oct 5 (FIFA window). So "7th straight window" is what the rule gives. Owner: which of these matches is wrong, or should the streak count differently (e.g. only windows before this match, which would be 6)?

### FK-28 — Show a team's position in its domestic league
Show each team's current position in its domestic league table on the match rows.
Open: where and how it's displayed is not decided yet. Ask the owner before building.
Blocked: needs the owner's choice of where (Day List / Slate / Team List rows, which side of the name) and how (e.g. "3rd", "#3", with the league code for cup matches) the position is shown.

### FK-34 — Make the Tags setting self-explanatory
The bar's "Tags" dropdown (Chips / Rail / Alerts / Off) doesn't say what anything does. Rename the options to plain words, e.g. "All tags" (every tag as a chip), "Window strip" (the three-cell previous/now/next strip), "Highlights only" (only what stands out), "Hide tags". Show a one-line description under each option. Keep the saved choice working (`fk:tags:v1`).
