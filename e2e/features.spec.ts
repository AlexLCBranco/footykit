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

test('FK-12: the club picker takes typing, accentless, and Enter picks the club', async ({ page }) => {
  const errors = await open(page);
  const picker = page.getByTestId('scope-picker');
  await expect(picker).toHaveAttribute('placeholder', /type a club/i);
  await picker.click();
  await picker.pressSequentially('sao paulo');
  const list = page.getByTestId('club-list');
  // "All clubs" stays first, the league heading stays over its club
  await expect(list.getByRole('option')).toHaveText(['All clubs', 'São Paulo']);
  await expect(list).toContainText('Brasileirão');
  await picker.press('Enter');
  await expect(page).toHaveTitle(/^SAO /);
  await expect(picker).toHaveValue('São Paulo');
  // ↓ ↑ and Esc: Esc closes and keeps the club
  await picker.click();
  await picker.pressSequentially('gremio');
  await picker.press('Escape');
  await expect(page.getByTestId('club-list')).toHaveCount(0);
  await expect(picker).toHaveValue('São Paulo');
  // arrows: from "All clubs", ↓ is the first club
  await picker.click();
  await picker.press('ArrowDown');
  await picker.press('ArrowUp');
  await picker.press('Enter');
  await expect(page).toHaveTitle(/^Sat, Nov 21/);
  expect(errors).toEqual([]);
});

test('FK-13: the team List shows each midweek / weekend window as one band, alternating', async ({ page }) => {
  const errors = await open(page, '?view=list&team=6273');
  const bands = page.getByTestId('window-band');
  await expect(bands.first()).toBeVisible();
  const info = await bands.evaluateAll((els) => els.map((b) => ({
    kind: b.getAttribute('data-window'),
    bg: getComputedStyle(b).backgroundColor,
    days: [...b.querySelectorAll('.fk-tl-date')].map((d) => d.textContent!.slice(0, 3)),
  })));
  // with rest days on, every day of the month is a line, so the bands alternate kind and tint
  for (let i = 1; i < info.length; i++) {
    expect(info[i]!.kind).not.toBe(info[i - 1]!.kind);
    expect(info[i]!.bg).not.toBe(info[i - 1]!.bg);
  }
  for (const b of info) {
    expect(b.days.length).toBeGreaterThan(0);
    for (const d of b.days) expect(b.kind === 'mid' ? ['Tue', 'Wed', 'Thu'] : ['Fri', 'Sat', 'Sun', 'Mon']).toContain(d);
  }
  // match rows sit inside the bands
  expect(await page.locator('[data-testid="window-band"] [data-testid="team-row"]').count()).toBe(await page.getByTestId('team-row').count());
  expect(errors).toEqual([]);
});

test('FK-14: the team List has the Calendar\'s free-window tint, FIFA marker and legend', async ({ page }) => {
  const errors = await open(page, '?view=list&team=6273');
  // Grêmio has no match in the midweek of Nov 10–12 (a FIFA window): the Calendar's free days, the List's too
  for (const d of ['2026-11-10', '2026-11-11', '2026-11-12']) {
    await expect(page.locator(`[data-rest="${d}"]`)).toHaveAttribute('data-free', 'true');
    await expect(page.locator(`.fk-cal-cell[data-day="${d}"]`)).toHaveCount(0);
  }
  await expect(page.locator('[data-rest="2026-11-10"]').getByTestId('fifa-mark')).toHaveText('FIFA');
  // a day with a match is never free
  expect(await page.locator('[data-testid="team-row"].fk-free').count()).toBe(0);
  const legend = page.getByTestId('window-legend');
  await expect(legend).toContainText('midweek Tue–Thu');
  await expect(legend).toContainText('free window');
  await expect(legend).toContainText('FIFA window');
  // the same days are free on the Calendar
  await page.getByTestId('views').getByText('Calendar').click();
  await page.getByTestId('span').getByRole('tab', { name: 'Month' }).click();
  await expect(page.locator('.fk-cal-cell[data-day="2026-11-10"]')).toHaveClass(/fk-free/);
  expect(errors).toEqual([]);
});

test('FK-15: Z4R and 1C/2C/3C are off by default; turned on they show and survive a reload', async ({ page }) => {
  const errors = await open(page);
  const z4 = page.locator('[data-tag="z4"]'), alive = page.locator('[data-tag="alive"]');
  await expect(page.getByTestId('team-tags').first()).toBeVisible();
  await expect(z4).toHaveCount(0);
  await expect(alive).toHaveCount(0);
  await expect(page.locator('[data-tag="prev"]').first()).toBeVisible(); // the other tags stay on
  await page.getByTestId('tag-menu').click();
  await expect(page.getByTestId('tag-menu-pop')).toContainText('relegation');
  await page.getByTestId('tag-on-z4').check();
  await page.getByTestId('tag-on-alive').check();
  await expect(z4.first()).toBeVisible();
  await expect(alive.first()).toBeVisible();
  await page.reload();
  await expect(z4.first()).toBeVisible();
  await expect(alive.first()).toBeVisible();
  // Rail drops a hidden tag's segment too
  await page.getByTestId('tag-variant').selectOption('rail');
  await expect(page.locator('.fk-rail-mark[data-tag="alive"]').first()).toBeVisible();
  await page.getByTestId('tag-menu').click();
  await page.getByTestId('tag-on-alive').uncheck();
  await expect(page.locator('.fk-rail-mark[data-tag="alive"]')).toHaveCount(0);
  await page.evaluate(() => { localStorage.removeItem('fk:tags:hidden:v1'); localStorage.removeItem('fk:tags:v1'); });
  expect(errors).toEqual([]);
});
