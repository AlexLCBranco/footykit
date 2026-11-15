// Smoke tests, one per view (every view is "in flux": behaviour and data only, no layout assertions). "Now" is fixed
// at 2026-11-21 12:00 Brazil time through the app's test hook; the data is the recorded snapshot of 2026-11-14.
import { expect, test, type Page } from '@playwright/test';

const NOW = '2026-11-21T15:00:00Z';

async function open(page: Page, search = '') {
  const errors: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.addInitScript((now) => { (window as { __FK_NOW__?: string }).__FK_NOW__ = now; }, NOW);
  await page.goto(`/football/${search}`);
  await expect(page.getByTestId('footy')).toBeVisible();
  return errors;
}

test('day list: the day\'s matches of the followed clubs, by kickoff, in Brazil time', async ({ page }) => {
  const errors = await open(page);
  await expect(page).toHaveTitle('Sat, Nov 21 — footykit');
  const rows = page.getByTestId('match-row');
  await expect(rows).toHaveCount(20);
  await expect(rows.first()).toContainText('09:30');
  await expect(rows.first()).toContainText('FUL');
  await expect(rows.first()).toContainText('MNC');
  // the Sudamericana final is at a neutral venue
  await expect(page.locator('.fk-row:has(.fk-neutral)')).toHaveCount(1);
  expect(errors).toEqual([]);
});

test('days are never skipped: a day without matches says so', async ({ page }) => {
  const errors = await open(page);
  await page.locator('.fk-strip-day', { hasText: '16' }).first().click();
  await expect(page).toHaveTitle('Mon, Nov 16 — footykit');
  await expect(page.getByTestId('no-matches')).toBeVisible();
  expect(errors).toEqual([]);
});

test('a team link opens its Team Calendar; ← comes back', async ({ page }) => {
  const errors = await open(page);
  await page.locator('[data-team="ARS"]').first().click();
  await expect(page).toHaveTitle(/^ARS · Nov 16 – Nov 29/);
  await expect(page.getByTestId('cal-match')).toHaveCount(3);
  await page.getByTestId('page-history').getByLabel('Back').click();
  await expect(page).toHaveTitle('Sat, Nov 21 — footykit');
  expect(errors).toEqual([]);
});

test('team calendar month and team list', async ({ page }) => {
  const errors = await open(page, '?view=cal&team=359&span=month');
  await expect(page).toHaveTitle('ARS · Nov 2026 — footykit');
  await expect(page.getByTestId('cal-match').first()).toBeVisible();
  await page.getByTestId('views').getByText('List').click();
  await expect(page).toHaveTitle(/^ARS list · Nov 2026/);
  const n = await page.getByTestId('team-row').count();
  await page.getByText(/Load earlier/).click();
  await expect(page.getByTestId('team-row')).not.toHaveCount(n);
  expect(errors).toEqual([]);
});

test('slate: cards, notes hidden at first, a note is kept in fk:notes:v1', async ({ page }) => {
  const errors = await open(page, '?view=slate');
  await expect(page.getByTestId('slate-card')).toHaveCount(20);
  await expect(page.getByTestId('note-text')).toHaveCount(0);
  await page.getByTestId('hide-notes').uncheck();
  const card = page.getByTestId('slate-card').first();
  await card.getByTestId('note-text').fill('rotation likely');
  await card.getByTestId('note-switch').click();
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('fk:notes:v1') ?? '{}'));
  const id = await card.getAttribute('data-match-id');
  expect(stored[id!]).toMatchObject({ pre: 'rotation likely', shown: 'live' });
  await page.evaluate(() => localStorage.removeItem('fk:notes:v1'));
  expect(errors).toEqual([]);
});

test('season series popup and quick standings', async ({ page }) => {
  const errors = await open(page);
  await page.locator('.fk-series-chip').first().click();
  await expect(page.getByTestId('series-popup')).toBeVisible();
  await expect(page.getByTestId('series-square')).toHaveCount(2);
  await page.keyboard.press('Escape');
  await page.getByTestId('standings-button').click();
  await expect(page.getByTestId('standings-popup').locator('tbody tr')).toHaveCount(20);
  expect(errors).toEqual([]);
});

test('a reload keeps the page; the version is shown', async ({ page }) => {
  await open(page);
  await page.getByLabel('Next').click();
  await expect(page).toHaveTitle('Sun, Nov 22 — footykit');
  await page.reload();
  await expect(page).toHaveTitle('Sun, Nov 22 — footykit');
  const v = (await import('../package.json', { with: { type: 'json' } })).default.version;
  await expect(page.getByTestId('site-version')).toHaveText(`v${v}`);
});

test('travel map: dots for the day; hover focuses a match, click pins, Esc unpins; never in a copy', async ({ page }) => {
  const errors = await open(page);
  const map = page.getByTestId('travel-map');
  await expect(map).toHaveAttribute('data-capture-exclude', 'true');
  await expect(map.getByTestId('map-dot')).toHaveCount(20);
  const row = page.getByTestId('match-row').filter({ hasText: 'ARS' });
  await row.hover();
  await expect(page.getByTestId('map-panel')).toContainText('Arsenal');
  await expect(page.getByTestId('map-panel')).toContainText('Newcastle');
  await row.locator('.fk-time').click();
  await expect(row).toHaveAttribute('data-pinned', 'true');
  await page.mouse.move(5, 5);
  await expect(page.getByTestId('map-panel')).toContainText('Arsenal');
  await page.keyboard.press('Escape');
  await expect(row).not.toHaveAttribute('data-pinned', 'true');
  await expect(page.getByTestId('map-panel')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('marquee selection: drag over two rows, copy only them; a click clears it', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  const errors = await open(page);
  const imageSize = () => page.evaluate(async () => {
    const [item] = await navigator.clipboard.read();
    const bmp = await createImageBitmap(await item!.getType('image/png'));
    return { w: bmp.width, h: bmp.height };
  });
  // the whole day first
  await page.getByTestId('top-bar').getByTestId('copy').click();
  await expect(page.getByTestId('top-bar').getByTestId('copy')).toHaveText('✓');
  const whole = await imageSize();
  // the list's width (≤ 980 CSS px at pixel ratio 4), not the list plus the map column
  expect(whole.w).toBeLessThanOrEqual(980 * 4);

  const rows = page.getByTestId('match-row');
  const a = (await rows.nth(1).boundingBox())!, b = (await rows.nth(2).boundingBox())!;
  // from the empty space left of the teams in row 2 down into row 3
  await page.mouse.move(a.x + 120, a.y + a.height / 2);
  await page.mouse.down();
  await page.mouse.move(a.x + 140, b.y + b.height / 2, { steps: 8 });
  await page.mouse.up();
  const bar = page.getByTestId('selection-bar');
  await expect(bar).toContainText('2 matches selected');
  await bar.getByTestId('copy').click();
  await expect(bar.getByTestId('copy')).toHaveText('✓');
  const sel = await imageSize();
  // two rows: far shorter than the whole day, as wide as the list (the map and its column are never in a copy)
  expect(sel.h).toBeLessThan(whole.h / 4);
  expect(sel.w).toBe(whole.w);

  await page.locator('.fk-day-head').click();
  await expect(bar).toHaveCount(0);
  expect(errors).toEqual([]);
});

// Phase 3 context tags: one smoke test per display variant (in flux), and the hover popup.
for (const variant of ['chips', 'rail', 'alerts'] as const) {
  test(`context tags, ${variant} variant: drawn next to the teams, kept after a reload`, async ({ page }) => {
    const errors = await open(page);
    await page.getByTestId('tag-variant').selectOption(variant);
    const tags = page.locator(`[data-testid="team-tags"][data-variant="${variant}"]`);
    await expect(tags.first()).toBeVisible();
    // Sat Nov 21: the Seville derby is flagged; Sunderland (in the drop zone) carries Z4R in chips and alerts
    await expect(page.getByTestId('derby')).toHaveCount(1);
    if (variant !== 'rail') await expect(page.getByTestId('match-row').filter({ hasText: 'SUN' }).locator('[data-tag="z4"]')).toHaveCount(1);
    await page.reload();
    await expect(page.locator(`[data-testid="team-tags"][data-variant="${variant}"]`).first()).toBeVisible();
    await page.getByTestId('tag-variant').selectOption('off');
    await expect(page.getByTestId('team-tags')).toHaveCount(0);
    await page.evaluate(() => localStorage.removeItem('fk:tags:v1'));
    expect(errors).toEqual([]);
  });
}

test('context tags: hovering a team\'s tags opens the detailed popup; the Slate shows tags too', async ({ page }) => {
  const errors = await open(page);
  const row = page.getByTestId('match-row').filter({ hasText: 'SUN' });
  await row.getByTestId('team-tags').first().hover();
  const pop = page.getByTestId('tag-popup');
  await expect(pop).toContainText('Previous window');
  await expect(pop).toContainText('Competitions alive');
  await expect(pop).toContainText('Relegation race');
  await page.mouse.move(5, 5);
  await expect(pop).toHaveCount(0);
  await page.getByTestId('views').getByText('Slate').click();
  await expect(page.getByTestId('slate-card').first().getByTestId('team-tags').first()).toBeVisible();
  expect(errors).toEqual([]);
});
