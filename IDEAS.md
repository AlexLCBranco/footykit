# Ideas — footykit

Ideas the owner mentioned that are not planned (maybe later, maybe never). Never built from directly:
"promote I-n" moves one to `FEATURE_BACKLOG.md`. IDs are I-1, I-2, ... (never reused). Rules: CLAUDE.md,
"Feature backlog, built list and ideas".

- I-1 — Called-up players per club (national-team call-ups and which club matches they miss); needs a data source (PLAN.md "Later list") [why: waiting]
- I-2 — Suspensions (card accumulation, red cards) and injuries/absences, if Phase 1 finds a free source (PLAN.md "Later list") [why: waiting]
- I-3 — Death-side strength score (needs an objective strength measure) (PLAN.md "Later list") [why: waiting]
- I-4 — Reverse solver ("what does team X need to avoid side Y") (PLAN.md "Later list")
- I-5 — Probability simulation (Monte Carlo; needs a strength model) (PLAN.md "Later list") [why: waiting]
- I-6 — Stakes chips beyond the UCL page; what's at stake per match, what a team needs, table position over time, schedule difficulty, competition rules explainer (PLAN.md "Later list")
- I-7 — UCL history section (past editions), like calendarkit's Cup history (PLAN.md "Later list")
- I-8 — Libertadores / Sudamericana groups what-if simulator, once the 2027 groups are drawn (every 2026 group match is played) (PLAN.md "Later list") [why: waiting]
- I-9 — Trailing page: a column counting separate trailing situations per team (behind → level or ahead ends one; a second one in the same match counts only if it starts with at least 20 minutes left); not now (2026-11-18, chat) [why: later]
- I-11 — The Slate "⋯" FanDuel link opens that match's own FanDuel page instead of FanDuel's soccer section (needs FanDuel's match id, e.g. from The Odds API's links with the FK-41 key, ~180 credits/month); not now (2026-11-19, chat) [why: waiting]
- I-12 — "Team to score" odds in a Slate popup: the odds that each team scores at least 1 goal, from The Odds API's `team_totals` (Over 0.5) market, ~200 credits/month of the free 500; coverage for these leagues unchecked, needs a free key (was FK-41, moved from the backlog 2026-11-19, chat)
- I-14 — World Cup 2030 qualifiers and the 2030 tournament live in the World Cup section once qualifying starts (2026-11-19, chat) [why: waiting]
- I-15 — Relegation odds: each team's odds of going down (decimal) as a column in the relegation race section (FK-72); waits for the owner's paid odds API (2026-11-20, chat) [why: waiting]
- I-16 — Paywall: pregame bookmaker odds (decimal) on past World Cup matches, each knockout tie's odds to go through, pre-tournament odds to win the cup, and a "Resimulate randomly" button in the simulator that plays matches from those odds. No bookmaker odds that may be published were found for free (checked 2026-11-20: Footiqo's export is personal use only, Hugging Face's set has licence "other" and a 7-match sample, SharpAPI has one 2026 snapshot); FiveThirtyEight's 2018 and 2022 model forecasts were turned down by the owner. Waits for a paid or publishable source of bookmaker odds (was FK-63, from I-13; moved from the backlog 2026-11-21, chat; the full spec is in git history) [why: waiting]
