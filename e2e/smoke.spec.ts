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
