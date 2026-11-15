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
