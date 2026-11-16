# Feature backlog — footykit

Planned work only, nothing built. Shipped items move to `BUILT.md` (rules: CLAUDE.md, "Feature backlog, built list and ideas").
Specs are written here from Claude chat. Item IDs are FK-1, FK-2, ... (never reused; FK is this repo's prefix, unique across the owner's repos).

## Ready

### FK-25 — Screenshot parity pass against calendarkit

After FK-22 to FK-24. Close the remaining look-and-feel gaps the owner hasn't listed, by comparing the two apps rendered side by side.

- Run both apps locally (footykit, and a fresh clone of calendarkit `main`) at 1920 × 911, the owner's full-window size.
- Screenshot each pair: footykit day List ↔ calendarkit League List; team Calendar ↔ Team Calendar (1 week, 2 weeks, month); team List ↔ Team List; Slate ↔ Slate (notes hidden and shown); Tables ↔ Standings; Quick standings popup ↔ Quick standings popup; one hover popup of each kind both apps have (series squares, streak / form).
- For each pair, bring footykit to calendarkit's: page margins and left alignment, column order and widths where the columns mean the same thing, row heights, font sizes and weights, heading styles, chip / badge shapes, popup frame (border, shadow, corners, padding), rest rows, "no matches" rows, scrollbar treatment, the site-version stamp.
- Don't touch: anything football-only with no calendarkit counterpart (window bands, tags, UCL / Cups / Trailing / Simulator pages) beyond giving it the shared fonts, buttons and popup frame; no behaviour, address or data changes; nothing in calendarkit.
- Where matching calendarkit would hide or shrink football information, keep footykit's version and list it in the report.
- Report: before / after screenshot pairs saved under `docs/parity/`, and a short list of differences left on purpose with the reason.
