# Feature backlog — footykit

Planned work only, nothing built. Shipped items move to `BUILT.md` (rules: CLAUDE.md, "Feature backlog, built list and ideas").
Specs are written here from Claude chat. Item IDs are FK-1, FK-2, ... (never reused; FK is this repo's prefix, unique across the owner's repos).

## Ready

### FK-26 — Fix the window streak count
The match tooltip's "Window streak" overcounts. Example: on Flamengo v Vasco (Thu Oct 29, 2026) it says "7th straight window (7 windows in a row with a match)", which doesn't match Flamengo's fixture list. Recount from the real fixtures (windows: midweek Tue–Thu, weekend Fri–Mon; logic in `src/data/tags.ts`). Add an automated test that checks the streak against a known fixture list, including this Flamengo case.

### FK-27 — Highlight today in the List view
Today's row (e.g. Mon, Nov 16) looks the same as every other rest day. Make today's date clearly highlighted in the List view, whether or not there's a match that day.

### FK-28 — Show a team's position in its domestic league
Show each team's current position in its domestic league table on the match rows.
Open: where and how it's displayed is not decided yet. Ask the owner before building.

### FK-29 — Move the UCL into the Cups section
The UCL works more like a cup than a league. List it in the Cups section with the other cups (opening the existing UCL page, simulator included) instead of having its own top-level "UCL" tab.

### FK-30 — Simulator for every cup
The Simulator already covers the UCL and the six leagues. Add it to every cup on the Cups page: the owner picks the result of each tie still to play and sees how the bracket ends up. Picks only, never auto-generated results. (Libertadores / Sudamericana groups stay in IDEAS.md I-8.)

### FK-31 — Score closer to the team names on the Slate card
On the match card (e.g. Cruzeiro 1 × 0 Atlético-MG), the score sits at the far right past the form dots, far from the names. Move it right next to the team names.

### FK-32 — Bigger, more informative last-games squares
On the match card, make the form squares bigger. Each square shows the opponent's crest (or short name), colored green / grey / red for win / draw / loss, and is prefixed "vs" for a home game or "@" for an away game. The prefix sits in a fixed-width slot so the squares stay aligned either way. Football cards carry less information than NBA ones, so there's room.

### FK-33 — Season-series popup like calendarkit's
footykit already has the "k/n" series chip and a meetings popup. Make the popup look and work like calendarkit's (the "G2/4" badge popup): a header "A – B · N meetings" with "X leads n–m" on the right, and one card per meeting (home/away, crest, winner and score for played games, date; the current game outlined). Count meetings across all competitions.

### FK-34 — Make the Tags setting self-explanatory
The bar's "Tags" dropdown (Chips / Rail / Alerts / Off) doesn't say what anything does. Rename the options to plain words, e.g. "All tags" (every tag as a chip), "Window strip" (the three-cell previous/now/next strip), "Highlights only" (only what stands out), "Hide tags". Show a one-line description under each option. Keep the saved choice working (`fk:tags:v1`).
