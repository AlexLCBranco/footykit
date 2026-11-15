// Backlog features FK-11 … FK-21, one test (or a few) each. Same setup as smoke.spec.ts: "now" fixed at 2026-11-21
// 12:00 Brazil time, the recorded snapshot of 2026-11-14, nothing from ESPN.
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

test('FK-11: a Day List row spells out its competition, in a column of one width', async ({ page }) => {
  const errors = await open(page);
  const first = page.getByTestId('match-row').first();
  await expect(first.getByTestId('comp-name')).toHaveText('Premier League');
  // the name sits in a fixed-width cell: every row's teams start at the same x
  const xs = await page.locator('[data-testid="match-row"] .fk-line').evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().left)));
  expect(new Set(xs).size).toBe(1);
  // the Team List rows have it too
  await page.goto('/football/?view=list&team=359');
  await expect(page.getByTestId('team-row').first().getByTestId('comp-name')).not.toHaveText('');
  expect(errors).toEqual([]);
});
