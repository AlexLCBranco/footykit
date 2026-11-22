// FK-75: every control above the header line, "All clubs" always on screen. Checked at the owner's window (1912 × 913)
// on a club's month (Palmeiras), then on every page of Today and Clubs; the places whose controls don't fit the tabs
// row (Leagues, Cups, Tools) keep their rows. Same setup as nav.spec.ts.
import { mkdirSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

const NOW = '2026-11-21T15:00:00Z';
const PALMEIRAS = '2029';

async function open(page: Page, search = '') {
  const errors: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.addInitScript((now) => { (window as { __FK_NOW__?: string }).__FK_NOW__ = now; }, NOW);
  await page.route(/api.open-meteo.com/, (r) => r.fulfill({ json: {} }));
  await page.setViewportSize({ width: 1912, height: 913 });
  await page.goto(`/football/${search}`);
  await expect(page.getByTestId('footy')).toBeVisible();
  return errors;
}

/** Where the header and its controls are, and what (if anything) sits between the header line and the page's content. */
const layout = (page: Page) => page.evaluate(() => {
  const r = (e: Element) => e.getBoundingClientRect();
  const header = document.querySelector('[data-testid="top-bar"]')!, h = r(header);
  const rows = document.querySelector('[data-testid="page-rows"]')!;
  const tabs = r(document.querySelector('[data-testid="where-tabs"]')!);
  const kids = [...rows.children].map(r);
  return {
    height: h.height,
    inHeader: header.contains(rows),
    labels: document.querySelectorAll('.fk-prow-label').length,
    // every control inside the header's box, on the tabs' line, left to right without touching, none squeezed
    inside: kids.every((k) => k.top >= tabs.top - 1 && k.bottom <= h.bottom && k.left >= tabs.right && k.right <= h.right - 16),
    inOrder: kids.every((k, i) => i === 0 || k.left >= kids[i - 1]!.right),
    cut: [...rows.querySelectorAll('button, .fk-date-text, label')].filter((e) => e.scrollWidth > e.clientWidth + 1).length,
    headerOverflows: header.scrollWidth > header.clientWidth,
    // the first thing under the header is the page's content
    next: (header.nextElementSibling as HTMLElement).className,
    scrolls: document.documentElement.scrollHeight > innerHeight,
  };
});

test("FK-75: a club's month at 1912 × 913: header 92 px, no control row under the line, \"All clubs\" leaves the club and is lit, no page scroll", async ({ page }) => {
  const errors = await open(page, `?view=cal&team=${PALMEIRAS}&span=month`);
  await expect(page.getByTestId('cal-match').first()).toBeVisible();
  const l = await layout(page);
  expect(l).toMatchObject({ height: 92, inHeader: true, labels: 0, inside: true, inOrder: true, cut: 0, headerOverflows: false, scrolls: false });
  expect(l.next).toContain('fk-capture');
  // the order in the tabs row: All clubs · club box · Calendar / List · 1 week / 2 weeks / Month · the dates
  const order = await page.getByTestId('page-rows').evaluate((el) => ['all-clubs', 'scope-picker', 'team-views', 'span', 'date-text', 'today'].map((t) => el.querySelector(`[data-testid="${t}"]`)!.getBoundingClientRect().left));
  expect(order).toEqual([...order].sort((a, b) => a - b));
  await expect(page.getByTestId('club-clear')).toHaveCount(0); // the old × is gone
  // the freed height went to the calendar: it starts right under the header's row of weekday names
  expect((await page.locator('.fk-capture').boundingBox())!.y).toBeLessThan(120);

  const all = page.getByTestId('all-clubs');
  await expect(all).toHaveText('All clubs');
  await expect(all).toHaveAttribute('aria-pressed', 'false');
  await expect(all).not.toHaveClass(/fk-chip-on/);
  await all.click();
  await expect(page).toHaveTitle('Clubs — footykit');
  await expect(page.getByTestId('clubs-page')).toBeVisible();
  await expect(all).toBeVisible(); // still on screen with no club open, now lit
  await expect(all).toHaveAttribute('aria-pressed', 'true');
  await expect(all).toHaveClass(/fk-chip-on/);
  expect((await layout(page)).inside).toBe(true);
  // a club picked from there: the button goes dark again
  await page.getByTestId('club-chip').filter({ hasText: /^Palmeiras$/ }).click();
  await expect(all).toHaveAttribute('aria-pressed', 'false');
  expect(errors).toEqual([]);
});

test('FK-75: on every page of Today and Clubs the controls sit in the tabs row; the header stays 92 px and nothing is cut', async ({ page }) => {
  const errors = await open(page);
  mkdirSync('test-output/fk75', { recursive: true });
  const pages: [string, string, boolean][] = [
    ['today-list', '', true], ['today-slate', '?view=slate', true], ['clubs', '?view=clubs', true],
    ['club-month', `?view=cal&team=${PALMEIRAS}&span=month`, true], ['club-2-weeks', `?view=cal&team=${PALMEIRAS}&span=2`, true], ['club-list', `?view=list&team=${PALMEIRAS}`, true],
    // their controls don't fit the tabs row (FEATURE_BACKLOG.md, FK-75's Blocked note): rows under the header, as before
    ['league-table', '?view=table&league=eng.1', false], ['league-calendar', '?view=league&comp=eng.1', false], ['cup', '?view=ucl', false], ['tools', '?view=trailing', false],
  ];
  for (const [name, search, inHeader] of pages) {
    await page.goto(`/football/${search}`);
    await expect(page.getByTestId('page-rows'), name).toBeVisible();
    const l = await layout(page);
    expect(l.height, name).toBe(92);
    expect(l.inHeader, name).toBe(inHeader);
    expect(l.headerOverflows, name).toBe(false);
    if (inHeader) expect(l, name).toMatchObject({ labels: 0, inside: true, inOrder: true, cut: 0 });
    await page.screenshot({ path: `test-output/fk75/${name}.png` });
  }
  expect(errors).toEqual([]);
});

test('FK-75: the controls work from the header (dates, span, List, Slate, Hide notes)', async ({ page }) => {
  const errors = await open(page, `?view=cal&team=${PALMEIRAS}&span=month`);
  const header = page.getByTestId('top-bar');
  await header.getByLabel('Next').click();
  await expect(header.getByTestId('date-text')).toHaveText('December 2026');
  await header.getByTestId('today').click();
  await expect(header.getByTestId('date-text')).toHaveText('November 2026');
  await header.getByTestId('span').getByRole('tab', { name: '1 week' }).click();
  await expect(page).toHaveTitle(/^PAL schedule · Nov 16 – 22/);
  await header.getByTestId('team-views').getByRole('tab', { name: 'List' }).click();
  await expect(page).toHaveTitle(/^PAL list/);
  await expect(header.getByTestId('show-rest')).toBeVisible();
  await page.getByTestId('where-today').click();
  await header.getByTestId('how').getByRole('tab', { name: 'Slate' }).click();
  await expect(page).toHaveTitle(/^Slate · /);
  await expect(header.getByTestId('hide-notes')).toBeVisible();
  expect(errors).toEqual([]);
});

test('FK-75: a window too narrow for the tabs row keeps the controls under the header instead of cutting them off', async ({ page }) => {
  const errors = await open(page, `?view=cal&team=${PALMEIRAS}&span=month`);
  await page.setViewportSize({ width: 1400, height: 913 });
  await expect.poll(async () => (await layout(page)).inHeader).toBe(false);
  const l = await layout(page);
  expect(l).toMatchObject({ height: 92, headerOverflows: false });
  await expect(page.getByTestId('all-clubs')).toBeVisible();
  expect(errors).toEqual([]);
});
