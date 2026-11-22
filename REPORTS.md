# Reports — footykit

Newest first. One report per backlog run (CLAUDE.md, "Feature backlog, built list and ideas").

## 2026-11-21 — FK-76, FK-77 (added on GitHub during the same run)

**Built:** v0.87.0. Nothing changes on screen in footykit.
- FK-76 — footykit now serves its Slate as a kit, the same way calendarkit does. The build writes three files under /football/slatekit/: one module, its stylesheet, and manifest.json (api 1, the version, and the two files' addresses), which is never cached. It answers at /slatekit/manifest.json on footykit's own address and at /football/slatekit/manifest.json through gauntlet. The kit holds the whole-day Slate (SlateDay) exactly as gauntlet uses it today, the data loader, the notes store and the card sizes. React is not inside: gauntlet hands over its own before loading the kit (as it does for calendarkit's, under the name `__footykitHost`).
- FK-77 — The kit also gives one match's card on its own (`SlateMatchCard`) and the day's list of matches (`slateMatches`: each match's id and its start as an exact instant, in start order). The single card is the very card the Slate is made of (one card code), 561 × 96, live score included when asked for. The whole-day Slate works as before.
**The day rule (you asked me to say):** footykit's own Slate uses another rule than the one in the spec. Today it shows the matches that start on the day in the viewer's own time zone, counted from midnight. I changed nothing there. The kit's new list uses your rule: São Paulo time, and a start before 05:00 counts for the day before (04:30 → the day before; 05:00 → that day). For football the two rules give the same matches whenever you are on São Paulo time, because no match starts between midnight and 05:00. `slateDayOf` is also in the kit so gauntlet can put NBA games on days by the same rule.
**How I read the gaps in the specs (say if any is wrong):**
- FK-76, everything calendarkit's kit does had a clear match here; nothing is blocked.
- FK-77, a match with no kick-off time yet has no exact instant, so it stays on the day footykit shows it and is marked `timeUnknown`.
- FK-77, several single cards with live scores on share one request per day instead of each sending its own.
- Not new, but you may not know: the Slate that gauntlet gets (whole day or single card) has never shown the small tags beside the teams ("UCL▸", "3rd"); the site's own Slate does. I left that as it was.
- The guide for gauntlet is updated: docs/slate-in-gauntlet.md (how to load the kit, the single card, the day list).
**Blocked:** nothing. **The backlog is empty.**
**Ideas added:** none.
**Checked automatically:** 4 unit tests that build the kit and read what it wrote (the manifest has api, version, js and css and the files exist; one module with every name a host uses; React not inside; no-cache on both addresses), 17 unit tests for the day list and the single card (start order, exact instants, the 05:00 rule, other time zones, a single card equals its card in the Slate for all 20 matches of the test day, no request at rest, shared live requests), and 3 browser tests (e2e/slatekit.spec.ts: the manifest and its files answer; the module imports in a blank page with its own React and draws the same cards as the site's Slate; one card alone is the same size and content as on the site). The same 3 browser tests were then run against the live site (`npm run e2e:live-kit`); the result is in the session's final message.
**Test by hand:** nothing in footykit. The whiteboard side is gauntlet's GT-14 and GT-21.

## 2026-11-21 — FK-75, the rest (answered on GitHub during the same run)

**Built:** v0.86.0. FK-75 is finished and out of the backlog.
- Leagues, Cups and Tools now have their controls in the tabs row too. The header is 92 px tall on every page and nothing sits under its line.
- The row of league / competition buttons is one box that looks and works like the club box: same height and style, the open league or competition in it with its logo. Click it to see them all; type to filter ("bundes" leaves Bundesliga); ↑ ↓ and Enter pick; Esc closes.
- Leagues, left to right: the five tabs · league box · Table / Relegation / Calendar / Simulator / History · Day / Week and the dates (on Calendar only).
- Cups: the five tabs · competition box · the World Cup's year box (only when the World Cup is open) · the views.
- Tools: the five tabs · competition box · "Trailing".
- The controls stay in the tabs row on every view of a page. Today's strip of day boxes and a club's title row stay where they are, as you said.
- Room left in the tabs row at 1912 px: Leagues' Calendar 44 px (the tightest), a cup's Calendar 119 px, a club's month 245 px, everything else 350 px or more.
**How I read the gaps in the spec (say if any is wrong):**
- Each box lists exactly what the buttons listed, in the same order: 6 leagues; 11 competitions on Cups (Champions League first, World Cup last); 15 on Tools.
- The World Cup has no logo file, so its box shows a small 🏆.
- A window narrower than the row needs (Leagues about 1880 px wide, Cups about 1800, Clubs about 1690) keeps that page's controls in a row under the header instead of cutting them off. One rule per page, so they never jump between views.
- The "WHAT" / "HOW" labels are gone on every page at full size.
**Blocked:** nothing. **The backlog is empty.**
**Ideas added:** none.
**Checked automatically:** 12 new unit tests (the box: list, filter, click, Enter, Esc, arrows; each box's list equals the old buttons' list; one answer per page at every width) and 3 new browser tests at 1912 × 913 (Leagues on Calendar, Cups with the World Cup open, Tools: header 92 px, no control row under the line, the box lists everything that had a button, picking one opens it), plus the every-page test now covering 20 pages of all five places. Older browser tests updated to pick from the box. 596 unit tests and 126 browser tests pass.
**Test by hand:** look at Leagues → Calendar: the tabs row is nearly full there (44 px spare). Say if it feels crowded (looks can't be automated).

## 2026-11-21 — FK-61, FK-68 (unblocked on GitHub while FK-75 was being built)

**Built:** v0.85.0.
- FK-61 — Countdown button. The Slate's header has "⏱ Countdown", to the left of "Pop out live scores". It opens halftime-timer in a new tab on a timer that ends at the first match's kick-off, named like "First match · Man City–Fulham 09:30" (the time is in your time zone). Once the first match has started it counts to the next match that hasn't, named "Next match · Nice–PSG 13:15". With no match left the button is greyed out and its hover says "No more matches today".
- FK-68 — Full matches of the 2022 World Cup. 12 of the 64 matches have a ▶ (same places as 2026's: group squares, bracket cards, simulator rows). 7 open FIFA's own site, hover "Full match on FIFA+": Argentina's seven matches (v Saudi Arabia, v Mexico, v Poland, v Australia, v Netherlands, v Croatia, and the final v France). 5 open FIFA's YouTube, hover "Full match on FIFA's YouTube": Japan v Spain, South Korea v Portugal, Brazil v South Korea, Morocco v Spain, Croatia v Brazil. The other 52 matches have no ▶: FIFA shows no free full replay of them on either site.
**What I found for FK-68:** cxm-api.fifa.com can be read now. FIFA's video sitemap lists all 32,197 of its videos with titles and lengths; only 7 are full matches of the 2022 World Cup. FIFA's YouTube channel (all 12,568 uploads, its 1,297 live videos and its "historic World Cup games" playlist were listed) has 8, of which 3 are matches FIFA+ also has. Every one of the 12 addresses answers (and all 104 of 2026's).
**How I read the gaps in the specs (say if any is wrong):**
- FK-61, the timer's end is sent as the kick-off in UTC ("2026-11-21T12:30:00Z"); halftime-timer's README accepts "Z" as an offset, and the same match always gives the same link, so the timer is reused, not added twice.
- FK-61, team names are the short ones the Slate shows ("Man City", not "Manchester City"). A postponed or cancelled match, or one with no kick-off time yet, is never the target.
- FK-61, a day with no match at all has no Slate header, so it has no button (the page already says "No matches today").
- FK-68, 2026's videos file now holds full addresses too (one file shape for both years), as the spec asked.
- FK-68, a "full match" must be at least 90 minutes long, so a clip with "full match" in its title is never linked.
**Seen on the way (not built, not added to the ideas list because you didn't ask for it):** FIFA+ has free full replays of all 64 matches of 2018, 2006 and 1998, 63 of 2014 and 2010, 59 of 2002, 52 of 1994 and 1990, and fewer for older World Cups. The same script could give those editions their ▶.
**Blocked:** nothing new. FK-75 still waits on your answer for Leagues, Cups and Tools (see the report below).
**Ideas added:** none.
**Checked automatically:** 6 new unit tests for the countdown (tests/countdown-link.test.ts), 10 new unit tests for the 2022 videos (titles, pairing, FIFA+ before YouTube, the file's shape, the ▶ with each title and with none), 3 new browser tests for the button (e2e/fk61.spec.ts) and 1 for the 2022 ▶ links (the final's link is the FIFA+ page). The data check `npm run check-wc-videos` asked every address: 12 of 12 (2022) and 104 of 104 (2026) answer. 585 unit tests pass; 122 of 123 browser tests pass (the same touchy World Cup speed test as below read 131 ms once, limit 100).
**Test by hand:**
1. On the 2022 World Cup's bracket, click the ▶ on the final. Does the full match play without paying or signing in? (A script can't watch a video.)
2. On today's Slate, click "⏱ Countdown". Does halftime-timer open with the right match and time? (halftime-timer's own page is outside this repo's tests.)

## 2026-11-21 — FK-75, first part (FK-61, FK-63, FK-68 still blocked)

**Built:** v0.84.0, FK-75 on Today and Clubs.
- The header is still 92 px tall with its two rows. On Today and Clubs the controls now sit in the tabs row, to the right of Today / Clubs / Leagues / Cups / Tools, and nothing is under the header line.
- Clubs, left to right: the five tabs · "All clubs" · the club box · Calendar / List · 1 week / 2 weeks / Month · the arrows with the month name and Today. On a club's List the "Rest days" tick box comes last.
- "All clubs" replaces the small ×. It is always on screen on Clubs. One click goes back to every club. It is lit when no club is open.
- Today: List / Slate · the arrows with the day, the date box and Today · "Hide notes" on the Slate.
- The "WHAT" and "HOW" labels are gone on these two pages.
- A club's month at 1912 × 913: the calendar now starts 46 px higher (116 px from the top, was 162), and that height went to the day boxes. The page doesn't scroll.
**How I read the gaps in the spec (say if any is wrong):**
- "Page" = one of the five tabs. Leagues fits on four of its five views and not on Calendar, so I left all of Leagues alone rather than have its controls jump under the line when Calendar is picked.
- A window too narrow to hold everything on one line (under about 1650 px wide) keeps the controls under the header, as before, instead of cutting them off.
- The spec doesn't mention them, so they stay: Today's strip of day boxes under the line, and a club's title row (crest, name, month). calendarkit's mock C has no title row.
- The header still starts 16 px below the window's top edge (calendarkit removed that gap in CK-33; the spec here doesn't ask for it).
**Blocked:** FK-75 stays in the backlog for Leagues, Cups and Tools. The tabs row has 1348 px free; Leagues needs 1622 (Calendar view), Cups 1667, Tools about 1730. It needs your answer: what should those three pages do (for example, one dropdown box for the league / competition, like the club box), and do the day strip and the club's title row stay? FK-61, FK-63 and FK-68 were skipped as blocked.
**Ideas added:** none.
**Checked automatically:** 2 new unit tests (which pages have their controls in the header; a narrow window doesn't) and 4 new browser tests (e2e/fk75.spec.ts: Palmeiras's month at 1912 × 913: header 92 px, no control row under the line, nothing cut or overlapping, "All clubs" leaves the club and is lit, no page scroll; every Today and Clubs page; the controls work from the header; the narrow window). Older browser tests updated for the button that replaced the ×. 569 unit tests pass; 118 of 119 browser tests pass. The one that fails now and then is the older World Cup speed test (limit 100 ms): it read 101 to 127 ms in 3 of 9 runs alone, and 106 ms in 1 of 6 runs on the code from before this change, so it is the test being touchy on this computer, not this change (the World Cup page was not touched).
**Test by hand:** look at Today and a club's month and say if the tabs row reads well (looks can't be automated).

## 2026-11-21 — FK-72, FK-73, FK-74 (FK-61, FK-63, FK-68 still blocked)

**Built:** v0.83.0.
- FK-72 — Relegation race. Leagues → pick a league → "Relegation" (also a "Relegation race" button on the league table, the breadcrumb, and "Go anywhere": type "brasileirao relegation"). On top, the rules in plain words: how many go down and which places, the play-off place (Bundesliga, Ligue 1), what decides between teams with the same points (in order), and "Right now" with the real teams on the line (Brasileirão: "Internacional is 16th with 38 points. It is the last safe team. Corinthians is 17th with 37 points… needs 1 more point to catch Internacional."). Then a table: place, team, where it stands (In the drop zone / Play-off place / Close to the drop zone), points, the gap in words ("1 point from safety", "3 points above the drop zone"), games left, last 5 and next 3 as squares. Under it, the games these teams still play against each other, with date and time.
- FK-73 — Stadium on Slate cards. Every card has a new line under the two teams: stadium and city. When the home team is not at its usual stadium: "⚠ Not their stadium · 55 km from home" (hover: "Santos usually play at home at Estádio Vila Belmiro, Santos. This match is at …, 55 km away."). A neutral-venue match says "Neutral ground". No reason is shown. The gauntlet's football Slate gets the same line by itself (it is the same card).
- FK-74 — Edition dropdown. The World Cup's 23 year chips are now one dropdown showing the open edition, listing all of them newest first, with ◀ (the edition before) and ▶ (the edition after). Switching is as fast as before (measured 56 ms). A competition's History has the same dropdown for its season.
**How I read the gaps in the specs (say if any is wrong):**
- FK-72, who is listed: teams in a place that goes down, plus teams close above by the Z4 tag's rule (1 point in a team's first 8 games, then 3). For the Bundesliga and Ligue 1 the team in the play-off place (16th) is always listed too, with its own label; the spec did not say, and a relegation page without it would be wrong. Its gap, like a drop-zone team's, is to the last fully safe team (15th).
- FK-72, places use the league table's tie-breakers (a team level on points with the zone is in or out by them), so the page always agrees with the table; the Z4 tag itself still counts points only.
- FK-72, the play-off: the page says the 16th "plays 2 more games against a team from the league below" and does not say which team, because that is not in the researched config.
- FK-72, odds: nothing on screen. The column's spot is marked in the code, between "Games left" and "Last 5 · next 3" (IDEAS I-15).
- FK-73, usual stadium: the one with more than half of the team's home matches this season, and at least 3 of them (neutral-venue and cancelled matches not counted). With fewer (cup opponents footykit only sees once or twice) there is no flag. The same stadium under two ESPN spellings counts as one. A hand override goes in `config/homeGrounds.ts` (empty today).
- FK-73, distance: straight line between the two stadiums; left off when footykit has no coordinates for one of them or they are under 1 km apart.
- FK-73, the card is 18 px taller (561 × 96, was 561 × 78): the stadium line had no room inside the old card. It no longer has calendarkit's height, which matters for the combined Slate (GT-14).
- FK-74, History: the season dropdown was added; the champions list under it stays, because it also shows who won each season, and a click on it still opens that season.
**Blocked:** nothing new. FK-61 (waits for halftime-timer HT-1), FK-63 (no publishable bookmaker odds) and FK-68 (FIFA+ pages can't be listed) were skipped as blocked.
**Ideas added:** none.
**Checked automatically:** 37 new unit tests (tests/relegation.test.ts: the closeness rule by round, gaps, games left, play-off place, the recorded Brasileirão and Bundesliga, every tie-break line has a plain twin, the rules box for all six leagues, the address and Go anywhere; tests/home-ground.test.ts: usual ground, too few matches, two spellings, override, distance, neutral ground, Santos v Grêmio on Nov 23 at 55 km; tests/edition-picker.test.tsx: newest first, neighbours, pick, Escape, ◀ ▶) and 3 new browser tests (e2e/backlog-72-74.spec.ts), plus the older browser tests updated for the dropdown and the taller card. 567 unit tests and 115 browser tests pass. One older browser test (World Cup speed, limit 100 ms) read 143 ms once while every test ran at the same time, and 56 ms alone and on the next full run.
**Test by hand:** read the relegation page's rules box once and say if any line needs a second read; look at the Slate's new stadium line and say if the taller card is fine (reading ease and looks can't be automated).

## 2026-11-20 — FK-71

**Built:** v0.82.0 FK-71 — World Cup thirds race (2026; any later edition with a pairing table for thirds gets it by itself).
- A switch beside the edition's title: "After matchday 1 / After matchday 2 / Final" (in the address as `&at=1` / `&at=2`). Final is the default and is today's view. Picked from the Bracket, it opens the Groups.
- Groups at a past point: every table as it stood (the later matches show as "–"), a "For sure?" column with Through / Out / Open, the two or four matches still to play under each group (teams, date, time, city), the third-placed teams ranked with a thick line under the 8th and a status each, and "Round of 32 as it stands" (16 pairings, each side labelled "1st of Group A", "3rd of Group C", marked as not real fixtures).
- "Who next?" on every row: for each place the team can still finish, who it would play (the slot, and who that is right now), which side of the bracket, and for 3rd place whether that 3rd is in the best eight right now and which group winners it could meet. Places it can't reach are not shown.
- Simulator from a point: opened at "After matchday 2" it has matchdays 1–2 as played and matchday 3 and the knockouts empty; picks re-rank the thirds, update the statuses, the first round "as it stands" and the matchups. Its picks are kept apart from the ordinary simulator's. "Start again from after matchday N" empties the later matches again; "Reset to real results" fills everything.
- "Rules" button beside the switch: who goes on, teams level on points, how thirds are ranked, who plays who (the 495-row table), what Through / Out / Open mean. One short sentence per line, with examples worked out from the edition's own results (2026: Senegal 8th best third and through, Iran 9th and out, on goal difference; Canada above Bosnia and Herzegovina after a 1–1 draw, on goal difference).
**How "certain" is worked out:** every win / draw / loss of a group's matches left is tried. A status counts only on what points alone settle, plus the match between two teams level on points (2026's first tie-breaker). Anything goal difference could still decide stays Open, because any score is possible. So Through and Out are never wrong (checked against 500 random sets of results), but a case only an exact goal count would settle shows Open a little longer than a full proof would. After matchday 2 of 2026: 7 teams Through, 5 Out, 36 Open; no third place was certain yet.
**Not done, and why:**
- "A running edition defaults to now": no edition in the data has unplayed matches, so there is nothing to default to; Final is always the default.
- Editions before 2026 are left alone (no switch, no Rules button): the spec made them optional, and their tables are shown in the official final order, which can't be rewound without ranking rules for each era.
- The per-team matchups open from the "Who next?" button, not from a click on the team's name: the name keeps opening the team's World Cup history, as before.
**Blocked:** nothing in FK-71. FK-61, FK-63 and FK-68 stay blocked.
**Ideas added:** none.
**Checked automatically:** 23 unit tests (tests/wc-race.test.tsx: matchdays per group, 2026's tables and thirds after matchday 1 and 2 against standings worked out by hand, Through / Out / Open cases, the random-results check, the pairing-table row behind "as it stands", matchups limited to reachable places and still-possible opponents, the simulator from matchday 2 filling to the real bracket, the rules box's sentences and examples) and 3 browser tests (e2e/wc-race.spec.ts: the whole flow on 2026, the simulator from matchday 2 with a pick that changes the best eight, reload, restart, reset; the switch from the Bracket; no switch on 2022).
**Test by hand:** read the Rules box and the "Who next?" sentences once and say if anything needs a second read (whether it reads easily can't be automated).

## 2026-11-20 — FK-69, FK-70 (FK-68 blocked)

**Built:** v0.81.0.
- FK-69 — World Cup bracket redesign. Two sides meeting at the final, cards joined by lines (the champion's path in the accent colour), full page width (9 columns at 1920 with no sideways scroll; a narrower window scrolls sideways, text never under 12px, no zoom). Every card: both teams with flag and full name, the score once (shootout in brackets, "a.e.t." / "pens" tags), the team that went out dimmed, date · kick-off time, stadium + roof tag, weather at kick-off only under the sky, a red "▶ Watch" button where there is a video. The final is the biggest card with 🏆 and the champion; third place is a small labelled card under it. Team names, the score's Google link and the squad ↗ work as before. Other cups' brackets untouched.
- FK-70 — Poster mode. A "Poster" switch above the bracket: flag tiles with team names joined by lines, growing toward the champion in the middle, losers dimmed, "?" tiles for undecided slots, the edition's title on top, and a copy-as-image button (transparent background, like the app's other copies). The switch is kept while stepping through editions; it is not in the address.
**Data added (FK-69):**
- Flags: flag-icons (MIT), 82 files copied to `public/worldcup/flags/` by `npm run make-wc-flags`. No flag (a tile with the code instead): Czechoslovakia, East Germany, Serbia and Montenegro, Soviet Union, Yugoslavia, Dutch East Indies, Zaire. Every other team shows today's flag of its country, also in old editions (e.g. Germany 1934, Iran 1978): say if those should be tiles too.
- 2026 stadiums: `config/wcStadiums.ts` (16 host cities → stadium, Wikidata item, roof type, each with its Wikipedia article as source), `npm run make-wc-venues` reads coordinates from Wikidata and writes `public/worldcup/2026-venues.json`. **For you to confirm:** open air: Gillette, Akron, Arrowhead, Azteca, Hard Rock, BBVA, MetLife, Lincoln Financial, Levi's, Lumen, BMO; fixed roof ("Roofed"): SoFi; retractable: Mercedes-Benz, AT&T, NRG, BC Place.
- Roof open or closed per match: no source found (searched; only a pre-tournament explainer). The 31 matches at the four retractable-roof stadiums (9 of them in the bracket) show "Retractable roof" alone and, as the spec says for an unknown state, the weather. Matches: 3, 10, 11, 18, 20, 25, 31, 33, 35, 40, 42, 43, 45, 47, 57, 60, 61, 63, 66, 67, 76, 78, 80, 85, 88, 90, 93, 95, 96, 101, 102. A state can be added per match in `WC_ROOF_STATE` (config/wcStadiums.ts).
- Past weather: Open-Meteo's historical archive, saved in the venues file (the page never asks for it): 104 of 104 matches. How I read "weather at kick-off": the temperature in the kick-off's hour and the rain that fell in the two hours from kick-off ("no rain" under 0.05 mm).
**Not done, and why:**
- Stadium coordinates, roof and weather exist for 2026 only (the spec's data list and data check are about 2026). Editions 1930–2022 show flags, names, score, date, time and the stadium name their data already has; roof, weather and Watch are left off. Researching the roofs of ~200 older stadiums with sources is a separate job: say if you want it.
- Forecasts for matches to come: the weather line and the card take a forecast (temperature + chance of rain, unit-tested), but nothing fetches one, because no edition in the data has an unplayed match (2026 is complete, 2030 isn't in the data). Same for the "not decided yet" placeholder card: built and tested, today only used by 1938's walkover slot.
- The bracket no longer fits the first screen in height (2026 is about 1,360 px tall at 1920 wide): at 12px text with everything on each card it can't. The old "whole on the first screen" test was replaced.
**Blocked:** FK-68 — the FIFA+ replay pages couldn't be listed: FIFA publishes them through cxm-api.fifa.com (the sitemap in its robots.txt and the pages' own data), and Claude Code's permission guard refused every read of that host. Note added to the item; nothing built. Seen on the way: the 2022 final's page plays without a sign-in. FK-61 and FK-63 stay blocked.
**Ideas added:** none.
**Checked automatically:** 26 new unit tests (tests/wc-bracket.test.tsx: roof tags, weather only under the sky, played / forecast / no weather, Watch only with a link, no-flag tile, the lines' wiring against the real 2026 bracket, the champion's path, poster tiles; data checks: every 2026 match has a stadium, coordinates, roof type and sources, every team of every edition has an existing flag file or is listed as having none) and 5 browser tests (e2e/wc-bracket.spec.ts: 2026's cards, 30 lines each ending on the right card, the final's trophy / stadium / weather / Watch link, full width at 1920 with no sideways scroll and no text under 12px, sideways scroll when narrow, 1974 / 1962 / 1938, the poster's 32 outer tiles and champion, a PNG on the clipboard). Two older browser tests updated for the new cards. 507 unit tests and 112 browser tests pass.
**Test by hand:** look at the bracket and the poster and say if it's still ugly (taste can't be automated).

## 2026-11-20 — FK-67

**Built:** v0.80.0 FK-67 — CazéTV full-match links on 2026 World Cup matches. A ▶ ("Full match on CazéTV (YouTube)", opens in a new tab) on the corner of every group square, beside every bracket tie's date, and on the simulator's group rows and bracket ties. The Google link on each match is unchanged. Editions before 2026 show no ▶ and load no videos file.
**Data:** `npm run make-wc-videos` lists CazéTV's playlist "Jogos Completos | Copa do Mundo FIFA™ 2026" with yt-dlp (no API key, nothing downloaded) and writes `public/worldcup/2026-videos.json`. Result on 2026-11-20: 104 videos in the playlist, 104 of 104 matches paired, none missing, none unpaired, no duplicates. Every video is at least 2 h 15 min long, so these are full broadcasts, not highlights.
**How the pairing reads the spec:** by the two teams in the title (Portuguese names in `config/wcNamesPt.ts`, either order, "x" / "vs" / "v", accents ignored). The date: a playlist listing only gives a rough date ("5 months ago"), so it is used as a guard (a video can't be older than its match) and to pick the match when two teams met twice (none did in 2026), not as an exact-day match.
**Not checked:** whether each video is the unedited broadcast (some were re-uploaded edited after June 2026); only that it is in the playlist, titled as that match and of full length. Links are as of the run: if CazéTV removes a video, its ▶ opens YouTube's "unavailable" page until the script is run again.
**Installed on this PC (owner said yes):** yt-dlp 2026.10.26 with winget, which also installed its FFmpeg package.
**Checked automatically:** 13 unit tests (tests/wc-videos.test.tsx: titles → teams, the pairing rules, the file's shape, ▶ only where there is a video) and 3 browser tests (e2e/wc-videos.spec.ts: groups, bracket, simulator, an older edition). 481 unit tests, 106/106 e2e; layout shift on 2026 still 0.000–0.002, edition switch 68 ms.
**Blocked:** nothing in FK-67. FK-61 and FK-63 stay blocked (not part of this run).
**Ideas added:** none.
**Test by hand:** only the look: is the ▶ on a group square's corner big enough to hit comfortably.

## 2026-11-20 — FK-66

**Built:** v0.79.0 FK-66 — World Cup quality pass (NAV_PATTERN.md §5 on history, brackets, simulator and team history). FK-61 and FK-63 skipped: both still blocked.
**Fixed:**
- Fast: an edition already seen or preloaded now shows in the same frame (it used to go through a "Loading…" frame every time, even cached); the two editions either side are fetched and their tables worked out ahead while idle. Measured on 2026: edition switch 49 ms (was 75 ms before the precompute), Groups 43 ms, Bracket 36 ms, a simulator pick 17 ms.
- No jumps: while an edition arrives the last one stays on screen dimmed instead of the page emptying; the first visit keeps the page's room; a new edition or view fades in over 120 ms. Stepping 2002 → 1930 → 2026 through the strip: the heading never moves, no loading frame. Layout shift on load 0.000–0.002 for 1930, 1950, 2002, 2026 in every view.
- Plain words: hovers on every short column header (#, Pts, P, W, D, L, GD, GF, Goals), on every stage title (Round of 32 … Final, Third place, Group stage, Second group stage, Final round), on the vs / @ squares, bracket scores and penalty numbers, the 1 X 2 / Detailed switch; "Grp" → "Group", simulator "M74" → "Match 74", "a.e.t." / "pens" inputs → "extra time" / "penalties"; the simulator's third-placed table got its missing header row.
- Clickable: team names now look like links (dotted underline); a click anywhere on a table row opens that team's World Cup history (groups, third-placed, simulator tables); the bracket scores open the match search; "won by …" opens the champion; every team name in the simulator (tables, matches, Detailed bracket, champion) opens its history; the simulator's match numbers open the real match search.
**Couldn't fully meet the bar:**
- 1938's walkover slot (Sweden through without playing) does nothing on click: there was no match to open; the hover says so.
- "Brackets of different sizes animate" is a 120 ms fade, not a size morph: each edition's bracket is zoomed to fit the screen and CSS zoom can't be animated smoothly.
- In the simulator's Fast mode a bracket team click picks the winner (that's the tool), so it doesn't open the team's history there; it does in Detailed mode and everywhere else.
**Checked automatically (e2e/wc-quality.spec.ts):** the timings above (<100 ms), neighbours preloaded, no loading frame and no heading move across all 23 editions, layout shift ≈ 0, every team name / match square / score / table row in 2002 and 2026 (Groups, Bracket, Simulator Fast and Detailed) clickable and every abbreviation explained, a row / score / champion / simulator team each open what they say. 103/103 e2e, 468 unit tests.
**Screenshots:** Groups, Bracket and Simulator for 1930, 2002 and 2026 in `test-output/fk66/` (local, made by the e2e run).
**Test by hand:** only the look and feel: do the dotted underlines and the fade feel right.

## 2026-11-20 — FK-65

**Built:** v0.78.0 FK-65 — the shared layout from backlogkit's NAV_PATTERN.md. A header pinned at the top of every page (same 92 px everywhere): ← →, a breadcrumb (e.g. Cups › World Cup › 2002 › Bracket; each part opens its neighbours), "Go anywhere" (Ctrl+K: clubs, competitions in each view, World Cup editions, "brazil 2002" → Brazil's 2002 World Cup), the Tags / copy / standings / info buttons, and the five places Today · Clubs · Leagues · Cups · Tools. Under it, scrolling away: What chips (leagues, cups, the World Cup's 1930 … 2026 strip with the chosen year scrolled into view, Trailing's competitions) and the How switch. No `<select>` is left for a What choice (the cup title, League, Cup, Competition, edition, history competition and season, and the quick standings popup's competition are all chips now). Every old address still opens its page; three new forms: `?view=clubs`, `?view=cups&cup=…&sim=1`, `?view=wc&year=…&how=groups`.
Checked automatically: header on every main page, same height, still on screen after scrolling; every Where tab, What chip, How option and breadcrumb part navigates, reload gives the same screen, back / forward work; click-to-screen 23–47 ms (World Cup 2026 Groups ↔ Bracket, a league chip, List → Slate); layout shift 0.000–0.001 on all 18 main pages; 390 px: header fits, all five places visible, no sideways scroll; World Cup 2026 bracket whole on a 1920×1080 screen under the header. 96/96 e2e, 468 unit tests.

**Where today's pages went (flagged where the mapping needed a choice):**
- Leagues: How = Table / Calendar (the old League view; its List / Calendar became Day / Week) / Simulator / History.
- Cups: Champions League = League phase / Pots / Calendar / Simulator / History; other cups = Bracket / Calendar / Simulator / History; World Cup = Groups / Bracket / Simulator. Groups and Bracket are now separate views (they were one long page); 1950 opens on Groups and its Bracket says it had none; 1934 / 1938 Groups say they had no groups; Simulator on 1930–1994 says in words it isn't ready for that year.
- Clubs: a new "Pick a club" page (every followed club by league) when no club is open; the club's × now goes back there (it used to go to Today's List).
- Tools: Trailing (its old Extra tools menu is gone).
- History: the season is picked from the champions list on the page (the season dropdown is gone).
- Kept as they were: the simulators' "one team's matches" filter is still a dropdown (a filter, not a What); the cup and UCL copies shown inside a Calendar page keep their own small Simulator / Pots toggles.
- Trade-off: on a 1366×768 window the World Cup 2026 bracket still fits but is drawn at 63% (it was 80%+), because the header and rows take height. At 1920×1080 it stays full size.

**Blocked:** FK-61 and FK-63 unchanged (waiting on you).

**Ideas added:** none.

**For you to check by hand** (looks and feel can't be automated): open a few places and the World Cup strip at your window size; screenshots of all 18 main pages are in test-output/fk65/ on this machine.

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
