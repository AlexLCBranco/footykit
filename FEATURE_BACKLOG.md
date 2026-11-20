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
