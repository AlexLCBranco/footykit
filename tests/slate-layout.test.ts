// FK-35: footykit's Slate card is calendarkit's size (calendarkit src/slate/layout.ts: info 491, card 509 × 78) plus FK-53's 20 px, so a
// combined Slate in the gauntlet lines both kits' cards up; the header line follows calendarkit's pattern.
import { describe, expect, it } from 'vitest';
import { CK_ROW_TOTAL, SLATE_FK50_WIDER, SLATE_FK53_WIDER, SLATE_CARD_HEIGHT, SLATE_CARD_WIDTH, SLATE_INFO_WIDTH, SLATE_ROW_TOTAL, slateHeaderLabel } from '../src/slate/layout';
import { copyColumns } from '../src/components/Copy';

describe('Slate card layout (FK-35)', () => {
  it('the team rows add up to calendarkit\'s plus FK-53\'s bigger squares', () => expect(SLATE_ROW_TOTAL).toBe(CK_ROW_TOTAL + SLATE_FK53_WIDER + SLATE_FK50_WIDER));
  it('calendarkit\'s card plus 52 px (FK-53, FK-50): 543 px info, 561 × 96 info-only (FK-73: the stadium line, 18 px)', () => {
    expect(SLATE_INFO_WIDTH).toBe(543);
    expect([SLATE_CARD_WIDTH, SLATE_CARD_HEIGHT]).toEqual([561, 96]);
  });
  it('header line: "SLATE · 19-11 · Football", several sports joined', () => {
    expect(slateHeaderLabel('2026-11-19')).toBe('SLATE · 19-11 · Football');
    expect(slateHeaderLabel('2026-11-18', ['NBA', 'Football'])).toBe('SLATE · 18-11 · NBA + Football');
  });
  it('copies: calendarkit\'s rule on its own example (12 cards of 474 × 117 → 3 columns)', () => {
    expect(copyColumns(12, { width: 474, height: 117 })).toBe(3);
  });
});
