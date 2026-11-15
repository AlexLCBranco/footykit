# Feature backlog — footykit

Planned work only, nothing built. Shipped items move to `BUILT.md` (rules: CLAUDE.md, "Feature backlog, built list and ideas").
Specs are written here from Claude chat. Item IDs are FK-1, FK-2, ... (never reused; FK is this repo's prefix, unique across the owner's repos).

## Ready

### FK-11 — Competition name spelled out in match rows

Today the competition cell in the Day List rows (`DayList.tsx` → `CompMark` in `Bits.tsx`) is only the logo; the name is hidden in the tooltip. The user can't tell competitions apart at a glance.

- Show the competition `name` from `config/competitions.ts` as text right after the logo (e.g. logo + "Brasileirão").
- Fixed-width column so the team columns stay aligned across rows. Names go up to 28 chars ("Conference League qualifying"): truncate with an ellipsis if they don't fit; the full name + round stay in the tooltip.
- Logo fallback (code text when the image fails) still works; the name shows in both cases.
- Scope: Day List rows (the view in the user's screenshot). Also Team List rows if they have room. Slate and team calendar stay logo-only (too tight); add an optional prop on `CompMark` (e.g. `showName`) rather than changing every caller.
- Tests: e2e checks a Day List row shows the competition name text.

### FK-12 — Club picker must clearly accept typing

The club picker (`TeamPicker` in `TopBar.tsx`) is a native `<select>`. Native selects do jump on typed letters, but nothing tells the user that, so in practice it reads as scroll-only.

- Replace it with a searchable combobox: a text input with placeholder like "Type a club…" and a search icon, so it's obvious you can type.
- Typing filters the list live (case- and accent-insensitive, so "gremio" finds Grêmio, "sao paulo" finds São Paulo); keep the league group headings in the filtered list.
- Keyboard: ↑/↓ to move, Enter to pick, Esc to close/clear. "All clubs" stays as the first option.
- When a club is chosen, keep showing its logo + name like today.
- Keep `data-testid="scope-picker"` (or update the e2e tests accordingly) and the same `onPick` behaviour.
- Tests: e2e types a partial accentless name, sees the filtered list, presses Enter, lands on that club.

### FK-13 — Midweek / weekend window bands in the team List view

In the team List view (`TeamList.tsx`, one line per day incl. rest days), the user can't see the fixture windows. Use `windowOf()` from `src/data/windows.ts` (midweek Tue–Thu, weekend Fri–Mon) to tint the day lines:

- Each window is one continuous band: a soft background tint over all its day lines (rest lines and match rows), with a different tint for midweek and weekend so they alternate visibly. Subtle: text, result colours and tags must stay readable. A thin left-edge colour bar per band is fine if a full tint is too loud.
- Match rows inside a band keep their card look; the tint sits behind/around them so the band reads as unbroken.
- Bands are by date, not by match, so a window with no match still shows (see FK-14).
- Both tints must work in the dark theme (current) and stay readable in any captures/exports.

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

