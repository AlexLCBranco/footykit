// FK-35: the Slate card's sizes, the same as calendarkit's (calendarkit src/slate/layout.ts), so the gauntlet can lay
// both kits' cards in one combined Slate (gauntlet GT-14): the same card width (509 px info-only), row height (28 px),
// padding, strip and team-row total. The tracks inside the rows differ where football shows other things, but they add
// up to calendarkit's 417 px. All CSS px; the CSS reads them as variables (slateVars), so this is the one source.
//
// calendarkit:  "@" 13 · logo 28 · name + score 149 · record 39 · streak 28 · fatigue 102 · odds 34   (7 tracks)
// footykit:     "@" 13 · logo 28 · name + place + score 149 · streak 28 · tags 33 · last / next games 160 · odds 34   (7 tracks)
// The strip (FK-47 / FK-48): ◀ 7 + 1 + 5 window slots × ("vs"/"@" 7 + square 21) + 4 × 1 apart + 1 + ▶ 7 = 160.
// FK-53 (owner): the squares grew 17 → 21 px so the crests read, and the card is 20 px wider than calendarkit's for
// it (529, was 509); nothing else in the row had 20 px to give without cutting the names more.
// FK-50: the result streak (W3 / D2 / L1) in calendarkit's streak track (28 px) right after the name, +32 px with its gap
// (561 in all); calendarkit's record track (39) has no football twin on the card (the league place is in the name cell).
// The tags (All tags would not fit): the highlights only on the card, every tag in the hover popup.

/** calendarkit's strip (tip-off time, then the chips wrapping in two lines) and the gap after it. */
export const SLATE_STRIP = 68;
export const SLATE_STRIP_GAP = 6;
export const SLATE_ROW_GAP = 4;
export const SLATE_ROW_HEIGHT = 28;
export const SLATE_ROW_TRACKS = { at: 13, logo: 28, name: 149, streak: 28, tags: 33, games: 160, odds: 34 } as const;
/** calendarkit's team-row total (its tracks and gaps); ours is it plus the FK-53 and FK-50 widenings. */
export const CK_ROW_TOTAL = 13 + 28 + 149 + 39 + 28 + 102 + 34 + 6 * SLATE_ROW_GAP;
/** FK-53: the bigger strip squares, 5 × 4 px. */
export const SLATE_FK53_WIDER = 20;
/** FK-50: the streak track and its gap. */
export const SLATE_FK50_WIDER = 28 + SLATE_ROW_GAP;
const trackSum = (t: Record<string, number>) => Object.values(t).reduce((a, b) => a + b, 0) + (Object.keys(t).length - 1) * SLATE_ROW_GAP;
export const SLATE_ROW_TOTAL = trackSum(SLATE_ROW_TRACKS);
/** The info block: strip, its gap, the team rows (calendarkit: 491; ours 543 since FK-53 / FK-50). */
export const SLATE_INFO_WIDTH = SLATE_STRIP + SLATE_STRIP_GAP + SLATE_ROW_TOTAL;
export const SLATE_CARD_PAD = 8;
export const SLATE_CARD_BORDER = 1;
/** An info-only card (notes hidden): 561 × 96 (calendarkit's 509 × 78 plus FK-53's 20 px and FK-50's 32 in width, and FK-73's stadium line, 18 px, in height). */
export const SLATE_CARD_WIDTH = SLATE_INFO_WIDTH + 2 * (SLATE_CARD_PAD + SLATE_CARD_BORDER);
export const SLATE_INFO_HEIGHT = 2 * SLATE_ROW_HEIGHT + SLATE_ROW_GAP;
/** FK-73: the stadium line under the team rows (stadium, city, and the "not their stadium" chip): one 14 px line and its gap. */
export const SLATE_VENUE_HEIGHT = 14;
export const SLATE_CARD_HEIGHT = SLATE_INFO_HEIGHT + SLATE_ROW_GAP + SLATE_VENUE_HEIGHT + 2 * (SLATE_CARD_PAD + SLATE_CARD_BORDER);
/** With notes: two columns while the room right of the info keeps this (calendarkit's SLATE_NOTE_MIN and gap). */
export const SLATE_NOTE_GAP = 14;
export const SLATE_NOTE_MIN = 300;

/** The layout as CSS variables on the Slate grid. */
export const slateVars = () => ({
  '--fk-slate-strip': `${SLATE_STRIP}px`,
  '--fk-slate-strip-gap': `${SLATE_STRIP_GAP}px`,
  '--fk-slate-row-gap': `${SLATE_ROW_GAP}px`,
  '--fk-slate-row-h': `${SLATE_ROW_HEIGHT}px`,
  '--fk-slate-venue-h': `${SLATE_VENUE_HEIGHT}px`,
  '--fk-slate-pad': `${SLATE_CARD_PAD}px`,
  '--fk-slate-info': `${SLATE_INFO_WIDTH}px`,
  '--fk-slate-card-w': `${SLATE_CARD_WIDTH}px`,
  '--fk-slate-note-col': `${SLATE_CARD_WIDTH + SLATE_NOTE_GAP + SLATE_NOTE_MIN}px`,
  '--fk-slate-tracks': Object.values(SLATE_ROW_TRACKS).map((v) => `${v}px`).join(' '),
});

/**
 * "SLATE · 18-11 · Football": the header line across the Slate's top, the same pattern as calendarkit's (CK-10), so a
 * combined Slate reads "SLATE · 18-11 · NBA + Football" — pass every sport shown, in the order shown.
 */
export function slateHeaderLabel(day: string, sports: readonly string[] = ['Football']): string {
  const [, m, d] = day.split('-');
  return `SLATE · ${d}-${m} · ${sports.join(' + ')}`;
}
