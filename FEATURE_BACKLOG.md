# Feature backlog — footykit

Planned work only, nothing built. Shipped items move to `BUILT.md` (rules: CLAUDE.md, "Feature backlog, built list and ideas").
Specs are written here from Claude chat. Item IDs are FK-1, FK-2, ... (never reused; FK is this repo's prefix, unique across the owner's repos).

## Ready

### FK-61 — Countdown to the Slate's first match (halftime-timer)
**In short:** The Slate gets a "⏱ Countdown" button that opens halftime-timer with a timer counting down to the day's first match.
**What:**
- Button in the Slate header. Opens halftime-timer in a new tab with an end-time timer set to the first match's kickoff, named e.g. "First match · Arsenal–Chelsea 16:30".
- If the first match has already started, it counts to the next match that hasn't, and the timer name says so ("Next match · …"). If none is left: button disabled, tooltip "No more matches today".
- Uses the link format from halftime-timer HT-1.
Blocked: waits for halftime-timer HT-1 (its link format and live URL); the owner unblocks it once HT-1 ships.
**Tests:** unit: picking the first / next not-started match, link built correctly; e2e: the button's link points to halftime-timer with the right time and name.

### FK-63 — Pregame odds on past World Cup matches, and random resimulation
**In short:** Past World Cup matches show the pregame odds (decimal), and the simulator gets a "Resimulate randomly" button that plays matches using those odds.
**What:**
- From I-13. Odds: 1X2 pregame (closing if that's what the source has), decimal, shown on the match square hover and in the match detail; never on the copy-as-image unless there already is an odds spot.
- Source: free only. Check what free sources really cover (e.g. FootyStats' World Cup downloads, OddsPapi's free tier, openly published odds datasets); The Odds API's history is paid, so not that. Odds likely exist only for recent editions (roughly 2002 on); editions without them show no odds, never made-up ones.
- Resimulate randomly: in FK-60's simulator, plays every match (or only the ones not fixed by hand) with win/draw/loss chances from the pregame odds (margin removed). Knockout draws go to a 50/50 shoot-out. Button stays hidden for editions without odds (equal odds would be meaningless). "Run again" re-rolls; "Reset to real results" as in FK-60.
- If no free source covers any edition: stop, add a `Blocked:` note with what was checked, and report.
**Answered (2026-11-20):** Which odds source (Footiqo manual export, an OddsPapi key, or FootyStats samples)? → The owner exports the World Cup odds CSV from Footiqo by hand.
**Answered (2026-11-20):** What are "qualifying odds"? → Each knockout tie shows both teams' odds to go through (full time, extra time or penalties), in decimals.
**Answered (2026-11-20):** How are pairings that never really happened played in the random resim? → The team with the better pre-tournament odds to win the World Cup goes through (those outright odds are also an important stat to show).
**Answered (2026-11-20):** Where do the odds show? → On screen at all times, more on hover; team names open a team page with its results at previous World Cups.
**Answered (2026-11-20):** Build on FiveThirtyEight's 2018 and 2022 model forecasts instead? → No: keep it blocked until bookmaker odds can be published.
Blocked: no publishable source of bookmaker odds found (checked 2026-11-20). Footiqo's export (kept locally in data/odds/, git-ignored) is personal, non-commercial use only. Hugging Face's World Cup odds set: licence "other", free sample 7 matches. SharpAPI (CC BY 4.0): one 2026 snapshot from semi-final week only. Usable instead: FiveThirtyEight's forecasts (CC BY 4.0, via the Wayback Machine) for 2018 and 2022: every match's win / draw / loss chances before kick-off and each team's pre-tournament chance to win the cup. These are model chances, not bookmaker odds; they'd show as decimal "fair odds" (1 ÷ chance), labelled as 538's. Nothing open found for 2026. Waits for a publishable source of bookmaker odds.
**Tests:** unit: odds → probabilities (margin removed, sum 1); random resim with a fixed seed gives a fixed bracket; editions without odds hide the button; e2e: hover a 2022 match shows odds; resimulate changes the bracket.

### FK-68 — FIFA+ full-match links on 2022 World Cup matches
**In short:** Every 2022 World Cup match with a free full replay on FIFA's own site gets a ▶ link that opens it.
**What:**
- Same ▶ as FK-67, same places, on the 2022 edition. Title: "Full match on FIFA+". The Google link on the score stays.
- Target: the match's "Full Match Replay" page on FIFA+ (seen from chat on 2026-11-20: the final is at `https://www.fifa.com/en/watch/Ar2sZ_9GHkie8SDq2Mt4gg`, 2h38). The page IDs are random, so each match needs its real URL: never a built or guessed one.
- Fallback, only when a match has no FIFA+ replay page: FIFA's official YouTube "FULL MATCH" upload of it (the final is `https://www.youtube.com/watch?v=RgqKdplLIk4`), title "Full match on FIFA's YouTube". Neither exists: no ▶.
- Data: `public/worldcup/2022-videos.json`, match number → full URL, built by a script. Share one file shape and one ▶ component with FK-67 (if FK-67 stored YouTube IDs only, widen it to full URLs).
- Not known from chat: how to list the 64 replay pages (FIFA+ is script-rendered; look for a public listing, API or sitemap), whether all 64 exist, and whether playback needs a sign-in or is region-limited. The script prints which matches have no link.
- If the pages can't be listed automatically: stop, add a `Blocked:` note with what was tried, and report.
**Tests:** unit: a match with a FIFA+ URL uses it, one with only a YouTube URL uses that with the other title, one with neither renders no ▶; e2e: the 2022 final has a ▶ whose href is the FIFA+ replay page; data check: every URL in the file answers 200. By hand (can't be automated): open one ▶ and confirm the full match plays without paying.

### FK-69 — World Cup bracket redesign: joined match cards with flags, stadium, roof, weather and a Watch button
**In short:** The World Cup bracket becomes a two-sided bracket of bigger match cards joined by lines, each always showing both teams with flags, the score, date, time, stadium (open air or roofed), temperature, rain and an obvious Watch button.
**What:**
- From chat, 2026-11-20. The owner finds today's bracket ugly: small floating boxes, no lines, no flags, a third of the page empty, the score written twice on every card. His references: a TV-style poster bracket (two sides meeting in the middle, flags, thick lines) for the layout, and a match-card bracket (flag, name, score, date per match) for the information. Take the layout of the first and the information of the second.
- Layout: stays two-sided (rounds from both edges to the final in the middle; third place as a small labelled card under the final). Lines join each pair of cards to the card they feed. The champion's path is drawn in an accent colour. The final is the biggest card, with a trophy and the champion's name.
- Size: the bracket uses the page's full width (today's columns are capped at 150px). Card text is never smaller than 12px; if the bracket can't fit the window at that size it scrolls sideways, it doesn't shrink further.
- Every card, always on screen (nothing of this only on hover):
  - each team: flag, full name, score (shootout score in brackets, "a.e.t." as a small tag). The team that went out is dimmed. The score is written once.
  - date and kick-off time (as the edition's data has them).
  - stadium name and a roof tag: "Open air", "Roofed" (fixed roof), or for a retractable roof "Roof closed" / "Roof open" for that match.
  - weather at kick-off: temperature and rain. Played matches: what really happened (temperature, and rain in mm or "no rain"). Matches to come: the forecast (temperature, chance of rain), as FK-39 does.
  - a Watch button (a labelled button, not today's small ▶) where the match has a video link (FK-67's data, later FK-68's). No link: no button.
- A slot not decided yet shows a neutral placeholder card.
- Clicking a team still opens what it opens today; the score keeps its Google link.
- No notes or free text on the bracket (the owner's decision: notes belong to the Slate and the gauntlet).
- Data found missing from chat (checked on main, 2026-11-20):
  - Flags: the bracket has none today. Use the free flag-icons set (https://github.com/lipis/flag-icons, MIT), which has England, Scotland and Wales. A team with no flag there (e.g. countries that no longer exist) gets a neutral tile with its code: never a wrong or approximate flag.
  - Stadiums: `public/worldcup/2026.json` has only the city per match (`venues: "city"`), and `config/venues.json` has no World Cup stadium. Add each match's stadium with its coordinates and roof type (open air / fixed / retractable), every entry with its source, built by a script like the other data.
  - Roof open or closed per match: no source is known from chat. Look for one. Where none is found, a retractable-roof stadium shows "Retractable roof" alone: never a guessed state. Report which matches lack it.
  - Past weather: FK-39 only does forecasts. Use Open-Meteo's historical archive (https://open-meteo.com/, free) for played matches, saved into the edition's data by a script (not fetched on every page view). Editions older than the archive reaches show no weather. A match with no stadium coordinates uses the city's.
- Applies to every edition that has a bracket; whatever a given edition lacks (time, stadium, weather, video) is simply left off its cards.
- Other cups' brackets (Champions League etc.) are not touched.
**Tests:** unit: roof tag for each roof type and for a missing state; weather line for a played match, a forecast match and a match with none; Watch button only with a link; team without a flag gets the neutral tile; e2e: the 2026 bracket shows lines, a flag and full name on every card, the final's trophy and champion, a stadium and weather on the final, and a Watch button whose href is FK-67's link; at 1920px wide the bracket fills the width with no sideways scroll; data check: every 2026 knockout match has a stadium, coordinates and roof type with a source. By hand (can't be automated): look at it and say if it's still ugly.

### FK-70 — World Cup bracket poster mode
**In short:** A "Poster" switch on the World Cup bracket shows it as flag tiles joined by lines, with team names and nothing else, ready to copy as an image.
**What:**
- From chat, 2026-11-20, low priority (the owner: "sure whatever"). Build after FK-69.
- Same two-sided shape as FK-69, but each slot is a team, not a match: a flag tile with the team's name, tiles growing toward the middle, the teams that went out dimmed, undecided slots as placeholder tiles. No scores, dates or weather.
- A "Copy as image" button (the app's existing copy-as-image) copies the poster with the edition's title on it, so the owner can paste it into his board instead of screenshotting a TV channel's post.
- Original design only: no channel logos or branding.
**Tests:** unit: tile per slot, dimmed when out, placeholder when undecided; e2e: switching to Poster on 2026 shows 32 outer tiles with names and the champion in the middle; Copy as image puts an image on the clipboard.
