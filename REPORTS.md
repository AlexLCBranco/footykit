# Reports — footykit

Newest first. One report per backlog run (CLAUDE.md, "Feature backlog, built list and ideas").

## 2026-11-19 (late night) — FK-57 … FK-64

**Built** (each its own commit, pushed to main):
- v0.71.0 FK-57 — Position arrows in every domestic league table (green ▲, red ▼, grey –; hover "Was 7th after round 11"), following ◀ ▶; none after round 1.
- v0.72.0 FK-58 — Trailing left the main tabs; a new "Extra tools" icon button (beside copy / standings / info) opens a menu with Trailing; pressed while on it; old links work.
- v0.73.0 FK-59 — World Cup section (Cups → World Cup), every edition 1930–2026: group tables with match squares, second group stages (1950, 1974, 1978, 1982), 2026's thirds table, full bracket with extra time and penalties, hovers with date / venue / 90' score / scorers, Google links, Wikipedia squad links, a team's World Cup history on a name click. Data: Fjelstul World Cup Database (CC-BY-SA 4.0, credited on the page) for 1930–2022, openfootball for 2026, Annex C third-place table from Wikipedia. Checked: group tables equal Wikipedia's for 1982, 1994, 2014, 2022, 2026; all 964 results 1930–2022 agree between the two sources. Gaps shown, not filled: 2026 venues are host cities only (no stadium names in the source); 1938's Austria–Sweden walkover has no match (an empty bracket slot); 2026 thirds E and L are level on everything but fair play, shown as a shared 3rd.
- v0.74.0 FK-60 — World Cup simulator for 1998–2022 and 2026 (older editions say it doesn't cover them yet): groups and bracket side by side, fast (1 X 2) and detailed (scores, extra time, pens), Reset to real results, Clear all. Pairings are read from the real bracket (1A v 2B…, winners of matches), 2026's thirds through Annex C. Teams level on everything the data has keep their real order and show "=".
- v0.75.0 FK-62 — "Pop out live scores" on the Slate header (Chrome / Edge): countdown to the first match, then one line per match by itself at kick-off; stays open while you browse; keeps polling while the tab is hidden.
- v0.76.0 FK-64 — "History" on every league table, cup page and the Champions League page: past seasons (final table + last 5, or groups + bracket), champions by season, who goes far. First season covered (ESPN's free data): Premier League, LaLiga, Serie A, Bundesliga, Ligue 1 2002-03 (2000-02 present but without standings, marked incomplete); Brasileirão 2006; Champions League 2001-02; Libertadores 2002 (2002–03 only the final rounds); Sudamericana 2006; Copa do Brasil 2013; FA Cup and League Cup 2001-02; Copa del Rey, Coppa Italia, DFB-Pokal 2006-07; Coupe de France 2007-08. Leagues checked against football-data.co.uk for 2005-06, 2015-16, 2023-24: all equal except one wrong Empoli–Messina score on football-data.co.uk's side (ESPN agrees with Wikipedia). Seasons ESPN has only in part (e.g. Ligue 1 2019-20, stopped by COVID; one Ligue 1 2025-26 match missing) show no champion.

- v0.76.1 fix — The full e2e run caught that v0.75.0 put the pop-out button inside the Slate header's label element (its text read "…FootballPop out live scores"); the label now has its own element. FK-35's test failed on the old code and passes now.

**Blocked:**
- FK-61 — unchanged: waits for halftime-timer HT-1.
- FK-63 — no free odds source usable without you: Footiqo has World Cup 1X2 odds but forbids scripted extraction (manual exports allowed); OddsPapi's free tier needs an account key; FootyStats' samples need a sign-up. The Blocked note lists the three options.

**Ideas added:** none.

**For you to check by hand** (can't be automated):
- FK-62: click "Pop out live scores" in Chrome or Edge once — a real Picture-in-Picture window needs your click (tests check its content inside the page).
- Feel: the World Cup simulator's layout at your window size; the 2026 bracket (16 ties a column, natural size, scrolls).

## 2026-11-19 (late) — FK-56

**Built:** v0.69.0 FK-56 — your answer: a swap per section. In the UCL simulator, "Start knockouts from current standings" fills the play-offs (9th–24th) and the round of 16 from the real table as it stands (results left ignored), shown beside the table. A click on a side sends it through, again clears; it runs on to the quarter-finals (A v D and B v C in each half), semis and final. Each section has three swap buttons for what UEFA draws: ⇄ ties (9 v 24 / 10 v 23 ↔ 9 v 23 / 10 v 24), ⇄ R16 (which seed each play-off winner meets; default the 9/24 winner v 8th), ⇅ halves (each R16 tie labelled top / bottom). A pick a swap moves out of its tie drops. Undo, reload and saved scenarios keep it; "Knockout places" goes back to the old view.
**Blocked:** FK-41 (unchanged: needs a free The Odds API key).
**Ideas added:** none.
**For you to check by hand:** whether the bracket column reads well beside the table while you run simulations.

## 2026-11-19 (night) — FK-49 … FK-56

**Built** (each its own commit, pushed to main):
- v0.62.0 FK-51 — No copy button inside Slate cards; the bar's day copy and the marquee copy stay.
- v0.62.1 fix — A copy as image failed ("!") whenever it held a team with no crest file (e.g. a Copa del Rey opponent ESPN has no logo for): html-to-image dropped the whole copy on one missing picture. Missing pictures are now left blank.
- v0.63.0 FK-52 — Slate scores in one column on every card: the name and league place sit in a box of one width (long names end in "…", full name on hover), the score in its own column; same in the copy.
- v0.64.0 FK-53 — Strip squares 21 px (were 17), crests 15 px (were 12). The card is 20 px wider for it.
- v0.65.0 FK-49 — calendarkit's side arrows beside the Team Calendar and the League view's Calendar: a month back / forward (in a week view: the same weekday a month away), greyed out at the first / last month with data, never in a copy.
- v0.66.0 FK-50 — Result streak W3 / D2 / L1 (all competitions; a shootout counts as a draw) on Slate cards after the name, on List rows outside each team's form squares, and on a club's List rows; hover for the games (date, vs / @, crest, result, "(pens)", Google link). Followed clubs only (the snapshot has every match of theirs, not of their opponents). The window tag is now "Windows in a row" so "streak" means one thing.
- v0.67.0 FK-54 — On every cup page the bracket is zoomed to fill the first screen (checked at 1920×1080 and 1366×768); the groups start right under it. Not in the League view, where the bracket sits below the games.
- v0.68.0 FK-55 — A cup page's title (and the Champions League page's) is the competition dropdown, in the bar picker's style at the old title's size.

**Note on card width:** FK-53 (+20 px) and FK-50 (+32 px, calendarkit's streak track) take Slate cards from calendarkit's 509 to 561 px, so a combined gauntlet Slate no longer has equal card widths (docs/slate-in-gauntlet.md updated).

**Blocked:** FK-56 — UEFA draws which of 9th/10th meets which of 23rd/24th, and which R16 seed gets which play-off winner; the Blocked note in FEATURE_BACKLOG.md asks you to pick a rule (fixed pairing, a swap per section, or FK-30's unpaired style). FK-41 unchanged (needs a free The Odds API key).
**Ideas added:** none.
**For you to check by hand** (judging feel, can't be automated): the 561 px Slate cards and the streak's colours at your whiteboard size; the zoomed cup bracket's look.

## 2026-11-19 (evening) — FK-44 … FK-48

**Built** (each its own commit, pushed to main):
- v0.56.0 FK-44 — Slate cards no longer show the draw price; home and away prices stay.
- v0.57.0 FK-45 — League view (bar: League): a picker with the six leagues, the Champions League and the cups; every game of the picked competition (all its teams), List (one day, "No games" shown) or Calendar (the week's 7 days; a day's header opens it in the List), ‹ › / date picker / Today, its teams, and under them its standings (the league table with the ◀ ▶ round step-through, the UCL page, or the cup's bracket and groups). Step 1 check: the snapshot has every game of each of these competitions (leagues 380 / 306 matches, the UCL's 144 league-phase matches, full cup draws with every club), so nothing was blocked. Only followed clubs have a Team Calendar, so other clubs' names in the Teams list are plain text.
- v0.58.0 FK-46 — Competition icon hover: "Premier League · Round 12", "Brasileirão · ~Round 35" (~ for LaLiga and the Brasileirão), cups "Copa do Brasil · Semi-final, 1st leg". A click on the icon (or the competition name in list rows) opens the League view on that competition and day. Competitions the League view doesn't have (Europa League, state championships, super cups) stay plain.
- v0.59.0 FK-47 — The Slate strip is now 5 window slots per team (2 before, this match's in the middle in the accent colour with its competition icon, 2 after); empty windows are dashed "–" slots ("No match · weekend 13–16 Nov"; also "Nothing fixtured yet" / "Before the season"); two matches split a slot. Slots shrank (squares 18 px, was 20) to keep the 509 × 78 card.
- v0.60.0 FK-48 — ◀ ▶ on each strip, one window earlier / later; a click on this match's square re-centres (a reload too). There was no free width left in the card, so the arrows sit over the strip's two ends and show only while the pointer is on the strip (or while it is moved).

**Blocked:** FK-41 (unchanged: needs a free The Odds API key to check coverage).
**Ideas added:** none.
**For you to check by hand** (judging feel, can't be automated): whether the hover-only strip arrows and the 18 px squares read well at your whiteboard size, and the League view's first layout (games, then teams, then standings, one column).

## 2026-11-19 (later) — FK-37

**Built:** v0.55.0 FK-37 — your answer: the series popup, on hover. Hovering a k/n chip (List, Team views, Slate) opens the season series popup; it stays while the pointer is in it, closes about 100 ms after it leaves both; a click keeps it open until Escape or a click outside.
**Blocked:** FK-41 (unchanged: needs a free The Odds API key to check coverage).
**Ideas added:** none. **For you to check by hand:** nothing new.

## 2026-11-19 — FK-35 … FK-43

**Built** (each its own commit, pushed to main):
- v0.48.0 FK-36 — Slate strip: last 2 played + next 2. Also a fix: the strip squares had been all grey since v0.44.0 (a CSS rule order bug); the win/draw/loss colours show again.
- v0.49.0 FK-35 — Slate cards in calendarkit's shape: 509 × 78, same strip / rows / odds column, tight shared-border grid, "SLATE · 19-11 · Football" header (`slateHeaderLabel` exported for the gauntlet's combined Slate). To fit calendarkit's width, the tags on the card show their highlights only (all of them on hover) and the strip squares are 20 px (were 22).
- v0.50.0 FK-38 — Home team on the first line of every Slate card (no "@" any more).
- v0.51.0 FK-40 — "⋯" game button: both clubs' Transfermarkt injuries & suspensions pages (all 54 followed clubs found and opened, Brazilian ones included; no fallback was needed, a club without an id gets Transfermarkt's search) and FanDuel's soccer section (a per-match props link needs FanDuel's own event id, which ESPN doesn't give).
- v0.52.0 FK-39 — Weather at kick-off from Open-Meteo: sky sign on the card's second row, temperature / feels-like / rain chance / wind + credit in the game pop-up; one request per day's venues, each venue at most hourly, forecasts only (16 days).
- v0.53.0 FK-42 — Pts first after Team in every league table, the simulators' tables, the UCL table and the quick standings.
- v0.54.0 FK-43 — ◀ ▶ (and ← →) step a league table back to "after N rounds". ESPN gives no round numbers anywhere (snapshot, raw payloads, scoreboard, core API checked), so rounds are worked out from the schedule; a postponed match counts in its own round. Exact on the recorded Premier League, Serie A, Bundesliga and Ligue 1 seasons; LaLiga and the Brasileirão have many moved matches, so their past rounds are a best guess (the latest round always equals today's table).

**Blocked** (notes in FEATURE_BACKLOG.md):
- FK-37 — the spec names the "2/2" series chip but describes calendarkit's fatigue popup; which one did you mean?
- FK-41 — step 1 done: `team_totals` (Over 0.5) on The Odds API ≈ 200 credits/month of the free 500. It fits on paper, but whether a bookmaker covers it for these leagues can only be checked with a key you'd create.

**Ideas added:** none.

**For you to check by hand** (judging feel, can't be automated): how the 509 px Slate cards read at your whiteboard size, and whether "highlights only" tags on the card are enough.
