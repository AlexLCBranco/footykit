// FK-75: every control above the header line, "All clubs" always on screen. Checked at the owner's window (1912 × 913)
// on a club's month (Palmeiras), then on every page of every place. On Leagues, Cups and Tools the row of league /
// competition buttons is one box like the club box. Same setup as nav.spec.ts.
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
    cut: [...rows.querySelectorAll('button, .fk-date-text, label, input.fk-club-input')].filter((e) => e.scrollWidth > e.clientWidth + 1).length,
    spare: Math.round(h.right - 16 - Math.max(...kids.map((k) => k.right))),
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

test('FK-75: on every page of every place the controls sit in the tabs row; the header stays 92 px and nothing is cut', async ({ page }) => {
  const errors = await open(page);
  mkdirSync('test-output/fk75', { recursive: true });
  const pages: [string, string][] = [
    ['today-list', ''], ['today-slate', '?view=slate'], ['clubs', '?view=clubs'],
    ['club-month', `?view=cal&team=${PALMEIRAS}&span=month`], ['club-2-weeks', `?view=cal&team=${PALMEIRAS}&span=2`], ['club-list', `?view=list&team=${PALMEIRAS}`],
    ['league-table', '?view=table&league=eng.1'], ['league-relegation', '?view=relegation&league=bra.1'], ['league-calendar', '?view=league&comp=eng.1'], ['league-calendar-week', '?view=league&comp=bra.1&mode=cal'],
    ['league-simulator', '?view=whatif&league=eng.1'], ['league-history', '?view=history&comp=eng.1'],
    ['ucl', '?view=ucl'], ['ucl-simulator', '?view=whatif'], ['cup', '?view=cups&cup=conmebol.sudamericana'], ['cup-calendar', '?view=league&comp=eng.league_cup'], ['cup-history', '?view=history&comp=uefa.champions'],
    ['world-cup', '?view=wc&year=2026'], ['world-cup-simulator', '?view=wc&year=2022&sim=1'], ['tools', '?view=trailing&comp=conmebol.sudamericana'],
  ];
  const out: string[] = [];
  for (const [name, search] of pages) {
    await page.goto(`/football/${search}`);
    await expect(page.getByTestId('page-rows'), name).toBeVisible();
    const l = await layout(page);
    expect(l, name).toMatchObject({ height: 92, inHeader: true, headerOverflows: false, labels: 0, inside: true, inOrder: true, cut: 0 });
    expect(l.spare, name).toBeGreaterThanOrEqual(0);
    out.push(`${name} ${l.spare}`);
    await page.screenshot({ path: `test-output/fk75/${name}.png` });
  }
  console.log(`FK-75 px spare in the tabs row at 1912: ${out.join(' · ')}`);
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

/** The entries of an open league / competition box, as [value, name]. */
const listed = (page: Page, row: string) => page.getByTestId(row).getByRole('option').evaluateAll((els) => els.map((e) => [e.getAttribute('data-value'), e.textContent] as const));
const LEAGUES = [['eng.1', 'Premier League'], ['esp.1', 'LaLiga'], ['ita.1', 'Serie A'], ['ger.1', 'Bundesliga'], ['fra.1', 'Ligue 1'], ['bra.1', 'Brasileirão']];
const CUPS = ['uefa.champions', 'conmebol.libertadores', 'conmebol.sudamericana', 'bra.copa_do_brazil', 'eng.fa', 'eng.league_cup', 'esp.copa_del_rey', 'ita.coppa_italia', 'ger.dfb_pokal', 'fra.coupe_de_france', 'fifa.world'];

test('FK-75: Leagues on its Calendar: header 92 px, nothing under the line, the league box lists the six leagues and picking one opens it', async ({ page }) => {
  const errors = await open(page, '?view=league&comp=eng.1');
  await expect(page.getByTestId('league-view')).toBeVisible();
  const l = await layout(page);
  expect(l).toMatchObject({ height: 92, inHeader: true, labels: 0, inside: true, inOrder: true, cut: 0, headerOverflows: false });
  expect(l.next).toContain('fk-capture');
  // the order in the tabs row: league box · Table / Relegation / Calendar / Simulator / History · Day / Week · the dates
  const order = await page.getByTestId('page-rows').evaluate((el) => ['what-league', 'how', 'league-modes', 'date-text', 'today'].map((t) => el.querySelector(`[data-testid="${t}"]`)!.getBoundingClientRect().left));
  expect(order).toEqual([...order].sort((a, b) => a - b));
  await expect(page.getByTestId('how').getByRole('tab')).toHaveText(['Table', 'Relegation', 'Calendar', 'Simulator', 'History']);
  // the box looks like the club box: same height, the open league in it
  const box = page.getByTestId('what-league');
  await expect(box.getByTestId('comp-picker')).toHaveValue('Premier League');
  expect(Math.round((await box.boundingBox())!.height)).toBe(36);
  await expect(page.locator('.fk-chips')).toHaveCount(0); // no row of league buttons left
  await box.getByTestId('comp-picker').click();
  expect(await listed(page, 'what-league')).toEqual(LEAGUES);
  await box.locator('[data-value="bra.1"]').click();
  await expect(page).toHaveTitle(/^Brasileirão/);
  await expect(box.getByTestId('comp-picker')).toHaveValue('Brasileirão');
  await expect(page.getByTestId('how').locator('[aria-selected="true"]')).toHaveText('Calendar'); // the view is kept
  // the controls stay in the tabs row on every view (no jumping under the line)
  for (const h of ['Table', 'Relegation', 'Simulator', 'History', 'Calendar']) {
    await page.getByTestId('how').getByRole('tab', { name: h, exact: true }).click();
    await expect(page.getByTestId('how').locator('[aria-selected="true"]')).toHaveText(h);
    expect(await layout(page), h).toMatchObject({ height: 92, inHeader: true, inside: true, cut: 0 });
  }
  // typing filters the list; Enter picks
  await box.getByTestId('comp-picker').click();
  await page.keyboard.type('bundes');
  expect(await listed(page, 'what-league')).toEqual([['ger.1', 'Bundesliga']]);
  await page.keyboard.press('Enter');
  await expect(page).toHaveTitle(/^Bundesliga/);
  expect(errors).toEqual([]);
});

test('FK-75: Cups with the World Cup open: header 92 px, nothing under the line, the competition box lists every competition and picking one opens it', async ({ page }) => {
  const errors = await open(page, '?view=wc&year=2022');
  await expect(page.locator('[data-testid="wc-page"][data-year="2022"][data-ready]')).toBeVisible();
  const l = await layout(page);
  expect(l).toMatchObject({ height: 92, inHeader: true, labels: 0, inside: true, inOrder: true, cut: 0, headerOverflows: false });
  expect(l.next).toContain('fk-capture');
  // competition box · the World Cup's year box · the views
  const order = await page.getByTestId('page-rows').evaluate((el) => ['what-cup', 'what-edition', 'how'].map((t) => el.querySelector(`[data-testid="${t}"]`)!.getBoundingClientRect().left));
  expect(order).toEqual([...order].sort((a, b) => a - b));
  const box = page.getByTestId('what-cup');
  await expect(box.getByTestId('comp-picker')).toHaveValue('World Cup');
  await expect(page.getByTestId('what-edition').getByTestId('edition-now')).toHaveText('2022');
  await expect(page.locator('.fk-chips')).toHaveCount(0);
  await box.getByTestId('comp-picker').click();
  const entries = await listed(page, 'what-cup');
  expect(entries.map(([v]) => v)).toEqual(CUPS);
  expect(entries[0]![1]).toBe('Champions League');
  expect(entries.at(-1)![1]).toBe('World Cup');
  await box.locator('[data-value="eng.fa"]').click();
  await expect(page).toHaveTitle('FA Cup — footykit');
  await expect(page.getByTestId('what-edition')).toHaveCount(0); // the year box is the World Cup's only
  expect(await layout(page)).toMatchObject({ height: 92, inHeader: true, inside: true, cut: 0 });
  // every competition opens from the box
  for (const c of CUPS) {
    await box.getByTestId('comp-picker').click();
    await box.locator(`[data-value="${c}"]`).click();
    await expect(box, c).toHaveAttribute('data-value', c);
    expect((await layout(page)).inHeader, c).toBe(true);
  }
  expect(errors).toEqual([]);
});

test('FK-75: Tools: header 92 px, nothing under the line, the competition box lists every competition and picking one opens it', async ({ page }) => {
  const errors = await open(page, '?view=trailing');
  await expect(page.getByTestId('trailing-page')).toBeVisible();
  const l = await layout(page);
  expect(l).toMatchObject({ height: 92, inHeader: true, labels: 0, inside: true, inOrder: true, cut: 0, headerOverflows: false });
  expect(l.next).toContain('fk-capture');
  // competition box · "Trailing"
  const order = await page.getByTestId('page-rows').evaluate((el) => ['what-comp', 'what-tool'].map((t) => el.querySelector(`[data-testid="${t}"]`)!.getBoundingClientRect().left));
  expect(order).toEqual([...order].sort((a, b) => a - b));
  await expect(page.getByTestId('what-tool').getByRole('radio')).toHaveText(['Trailing']);
  const box = page.getByTestId('what-comp');
  await expect(box.getByTestId('comp-picker')).toHaveValue('Premier League');
  await box.getByTestId('comp-picker').click();
  expect((await listed(page, 'what-comp')).map(([, n]) => n)).toEqual(['Premier League', 'LaLiga', 'Serie A', 'Bundesliga', 'Ligue 1', 'Brasileirão', 'Champions League', 'Europa League', 'Conference League', 'Libertadores', 'Sudamericana', 'FA Cup', 'EFL Cup', 'DFB-Pokal', 'Coppa Italia']);
  await box.locator('[data-value="conmebol.libertadores"]').click();
  await expect(page.getByTestId('trailing-page')).toHaveAttribute('data-comp', 'conmebol.libertadores');
  await expect(box.getByTestId('comp-picker')).toHaveValue('Libertadores');
  expect(errors).toEqual([]);
});
