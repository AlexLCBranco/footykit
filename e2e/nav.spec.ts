// FK-65: the shared layout (backlogkit's NAV_PATTERN.md §6) — the pinned header on every main page, every Where tab /
// What chip / How option / breadcrumb part navigating with the address round-tripping, speed, no layout shift, no
// <select> for What, named icon buttons, the phone width, and "Go anywhere". Same setup as smoke.spec.ts.
import { mkdirSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

const NOW = '2026-11-21T15:00:00Z';

async function open(page: Page, search = '') {
  const errors: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.addInitScript((now) => { (window as { __FK_NOW__?: string }).__FK_NOW__ = now; }, NOW);
  await page.route(/api.open-meteo.com/, (r) => r.fulfill({ json: {} }));
  await page.goto(`/football/${search}`);
  await expect(page.getByTestId('footy')).toBeVisible();
  return errors;
}
/** FK-74: the edition is a dropdown: open it, then pick. */
const what = async (page: Page, row: string, v: string | number) => {
  if (row === 'what-edition') await page.getByTestId(row).getByTestId('edition-btn').click();
  else await page.getByTestId(row).getByTestId('comp-picker').click(); // FK-75: the league / competition box
  await page.getByTestId(row).locator(`[data-value="${v}"]`).click();
};
const how = (page: Page, name: string) => page.getByTestId('how').getByRole('tab', { name, exact: true }).click();

/** One page of each place and each How. */
const MAIN: [string, string][] = [
  ['Today · List', ''], ['Today · Slate', '?view=slate'], ['Clubs', '?view=clubs'], ['Club calendar', '?view=cal&team=359&span=month'],
  ['Club list', '?view=list&team=359'], ['League table', '?view=table&league=eng.1'], ['League relegation', '?view=relegation&league=eng.1'], ['League calendar', '?view=league&comp=eng.1'],
  ['League simulator', '?view=whatif&league=eng.1'], ['League history', '?view=history&comp=eng.1'], ['Champions League', '?view=ucl'],
  ['UCL pots', '?view=ucl&tab=pots'], ['UCL simulator', '?view=whatif'], ['Cup', '?view=cups&cup=conmebol.libertadores'],
  ['Cup simulator', '?view=cups&cup=eng.fa&sim=1'], ['World Cup bracket', '?view=wc&year=2026'], ['World Cup groups', '?view=wc&year=2002&how=groups'],
  ['World Cup simulator', '?view=wc&year=2022&sim=1'], ['Tools', '?view=trailing'],
];

test('every main page: the same pinned header (92 px), still on screen after scrolling; no <select> for What; icon buttons named', async ({ page }) => {
  const errors = await open(page);
  for (const [name, search] of MAIN) {
    await page.goto(`/football/${search}`);
    const header = page.getByTestId('top-bar');
    await expect(header, name).toBeVisible();
    await expect(page.getByTestId('where-tabs').getByRole('button'), name).toHaveCount(5);
    await expect(page.getByTestId('go-anywhere'), name).toBeVisible();
    expect(Math.round((await header.boundingBox())!.height), name).toBe(92);
    await page.mouse.wheel(0, 2000);
    // pinned: at the top of the window however far the page scrolled (16 px down only before the page's own padding has scrolled away)
    await expect.poll(async () => page.evaluate(() => Math.round(document.querySelector('[data-testid="top-bar"]')!.getBoundingClientRect().top) - Math.max(0, 16 - Math.round(scrollY))), { message: name }).toBe(0);
    // the only <select> left is the simulators' "one team's matches" filter (a filter, not a What)
    expect(await page.locator('select:not([data-testid="wi-team"])').count(), name).toBe(0);
    // every header control has a name a screen reader (and a hover) can give
    const unnamed = await header.locator('button, a, input').evaluateAll((els) => els.filter((e) => !(e.getAttribute('aria-label') || e.getAttribute('title') || e.textContent?.trim())).length);
    expect(unnamed, name).toBe(0);
  }
  expect(errors).toEqual([]);
});

test('every Where tab, What chip and How option navigates; the address round-trips on reload; back and forward work', async ({ page }) => {
  const errors = await open(page);
  const reloadSame = async () => {
    const url = page.url(), title = await page.title();
    await page.reload();
    await expect(page).toHaveTitle(title);
    expect(page.url()).toBe(url);
  };
  // the five places
  const titles: string[] = [];
  for (const w of ['today', 'clubs', 'leagues', 'cups', 'tools']) {
    await page.getByTestId(`where-${w}`).click();
    await expect(page.getByTestId(`where-${w}`)).toHaveAttribute('aria-current', 'page');
    titles.push(await page.title());
    await reloadSame();
  }
  expect(new Set(titles).size).toBe(5);
  // back and forward through them
  await page.goBack(); await expect(page).toHaveTitle(titles[3]!);
  await page.getByTestId('page-history').getByLabel('Back').click(); await expect(page).toHaveTitle(titles[2]!);
  await page.goForward(); await expect(page).toHaveTitle(titles[3]!);
  // every What chip and How option of Leagues and Cups
  await page.getByTestId('where-leagues').click();
  for (const l of ['esp.1', 'ita.1', 'ger.1', 'fra.1', 'bra.1', 'eng.1']) {
    await what(page, 'what-league', l);
    await expect(page.getByTestId('what-league')).toHaveAttribute('data-value', l);
  }
  for (const h of ['Calendar', 'Simulator', 'History', 'Table']) {
    await how(page, h);
    await expect(page.getByTestId('how').locator('[aria-selected="true"]')).toHaveText(h);
    await reloadSame();
  }
  await page.getByTestId('where-cups').click();
  for (const c of ['conmebol.libertadores', 'conmebol.sudamericana', 'bra.copa_do_brazil', 'eng.fa', 'eng.league_cup', 'esp.copa_del_rey', 'ita.coppa_italia', 'ger.dfb_pokal', 'fra.coupe_de_france', 'uefa.champions']) {
    await what(page, 'what-cup', c);
    await expect(page.getByTestId('what-cup')).toHaveAttribute('data-value', c);
  }
  for (const h of ['Pots', 'Calendar', 'Simulator', 'History', 'League phase']) {
    await how(page, h);
    await expect(page.getByTestId('how').locator('[aria-selected="true"]')).toHaveText(h);
    await reloadSame();
  }
  await what(page, 'what-cup', 'fifa.world');
  for (const h of ['Groups', 'Simulator', 'Bracket']) {
    await how(page, h);
    await reloadSame();
  }
  // Today's and a club's How
  await page.getByTestId('where-today').click();
  await how(page, 'Slate'); await expect(page).toHaveTitle(/^Slate/); await reloadSame();
  await how(page, 'List'); await expect(page).toHaveTitle(/^Day/);
  expect(errors).toEqual([]);
});

test('the World Cup: one edition dropdown showing the open year (FK-74); the breadcrumb jumps sideways at every part', async ({ page }) => {
  const errors = await open(page, '?view=wc&year=1930');
  const pick = page.getByTestId('what-edition');
  await expect(pick.getByTestId('edition-now')).toHaveText('1930');
  // closed: no list, no strip of chips
  await expect(pick.getByRole('option')).toHaveCount(0);
  await expect(pick.getByRole('radio')).toHaveCount(0);
  await page.goto('/football/?view=wc&year=2026');
  await expect(pick.getByTestId('edition-now')).toHaveText('2026');
  // the breadcrumb: Cups › World Cup › 2026 › Bracket
  const parts = page.getByTestId('crumb-btn');
  await expect(parts).toHaveText(['Cups', 'World Cup', '2026', 'Bracket']);
  // the year: its siblings are the other editions
  await parts.nth(2).click();
  const menu = page.getByTestId('crumb-menu');
  await expect(menu.getByRole('menuitem')).toHaveCount(23);
  await menu.getByRole('menuitem', { name: '2002' }).click();
  await expect(page).toHaveURL(/year=2002/);
  // the How: its siblings
  await parts.nth(3).click();
  await page.getByTestId('crumb-menu').getByRole('menuitem', { name: 'Groups' }).click();
  await expect(page).toHaveURL(/year=2002&how=groups/);
  // the competition: the other cups, the How kept where it exists
  await parts.nth(1).click();
  await page.getByTestId('crumb-menu').getByRole('menuitem', { name: 'FA Cup' }).click();
  await expect(page.getByTestId('cups-page')).toHaveAttribute('data-cup', 'eng.fa');
  // the place: the other places; Escape closes a menu
  await parts.nth(0).click();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('crumb-menu')).toHaveCount(0);
  await parts.nth(0).click();
  await page.getByTestId('crumb-menu').getByRole('menuitem', { name: 'Leagues' }).click();
  await expect(page).toHaveTitle('Premier League table — footykit');
  expect(errors).toEqual([]);
});

test('Go anywhere (Ctrl+K): "brazil 2002" opens Brazil\'s 2002 World Cup; a club; a competition; Escape closes', async ({ page }) => {
  const errors = await open(page);
  await page.keyboard.press('Control+k');
  const input = page.getByTestId('go-input');
  await expect(input).toBeFocused();
  await input.fill('brazil 2002');
  await expect(page.getByTestId('go-item').first()).toContainText('Brazil at the 2002 World Cup');
  await input.press('Enter');
  await expect(page).toHaveURL(/view=wc&year=2002&team=BRA/);
  await expect(page.getByTestId('wc-history')).toContainText('Brazil at the World Cup');
  // the button, a club (accents ignored), arrows and Enter
  await page.getByTestId('go-anywhere').click();
  await page.getByTestId('go-input').fill('sao paulo');
  await expect(page.getByTestId('go-item').first()).toContainText('São Paulo');
  await page.getByTestId('go-input').press('Enter');
  await expect(page).toHaveTitle(/^SAO schedule|^SPF schedule|schedule/);
  await page.keyboard.press('Control+k');
  await page.getByTestId('go-input').fill('bundesliga sim');
  await page.getByTestId('go-item').first().click();
  await expect(page).toHaveTitle('Bundesliga simulator — footykit');
  await page.keyboard.press('Control+k');
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('go-dialog')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('click to screen in under 100 ms on loaded data (Leagues, the World Cup 2026, Today)', async ({ page }) => {
  const errors = await open(page, '?view=wc&year=2026');
  /** ms from a click to the frame after the screen shows `done` (both states visited first, so their data is loaded). */
  const timed = (click: string, done: string) => page.evaluate(async ({ click, done }) => {
    const t0 = performance.now();
    (document.querySelector(click) as HTMLElement).click();
    while (!document.querySelector(done)) await new Promise((r) => requestAnimationFrame(r));
    await new Promise((r) => requestAnimationFrame(r));
    return performance.now() - t0;
  }, { click, done });
  const sel = (row: string, v: string) => `[data-testid="${row}"] [data-value="${v}"]`;
  // World Cup 2026, Bracket ↔ Groups (the biggest edition)
  await how(page, 'Groups'); await expect(page.getByTestId('wc-group')).toHaveCount(12);
  await how(page, 'Bracket'); await expect(page.getByTestId('wc-bracket')).toBeVisible();
  const wcGroups = await timed(sel('how', 'groups'), '[data-testid="wc-group"]');
  const wcBracket = await timed(sel('how', 'bracket'), '[data-testid="wc-bracket"]');
  // a league chip
  await page.goto('/football/?view=table&league=eng.1');
  await what(page, 'what-league', 'bra.1'); await expect(page.getByTestId('league-page')).toHaveAttribute('data-league', 'bra.1');
  await what(page, 'what-league', 'eng.1'); await expect(page.getByTestId('league-page')).toHaveAttribute('data-league', 'eng.1');
  await page.getByTestId('what-league').getByTestId('comp-picker').click(); // the box open: the click timed is the pick
  const league = await timed(sel('what-league', 'bra.1'), '[data-testid="league-page"][data-league="bra.1"]');
  // Today: List → Slate
  await page.goto('/football/');
  await how(page, 'Slate'); await expect(page.getByTestId('slate-card').first()).toBeVisible();
  await how(page, 'List');
  const slate = await timed(sel('how', 'slate'), '[data-testid="slate-card"]');
  console.log(`FK-65 timings (ms): WC groups ${wcGroups.toFixed(0)}, WC bracket ${wcBracket.toFixed(0)}, league chip ${league.toFixed(0)}, Slate ${slate.toFixed(0)}`);
  for (const t of [wcGroups, wcBracket, league, slate]) expect(t).toBeLessThan(100);
  expect(errors).toEqual([]);
});

test('no layout shift on load and after navigating (cumulative layout shift ≈ 0)', async ({ page }) => {
  await page.addInitScript(() => {
    const w = window as { __cls?: number };
    w.__cls = 0;
    new PerformanceObserver((l) => { for (const e of l.getEntries() as (PerformanceEntry & { value: number; hadRecentInput: boolean })[]) if (!e.hadRecentInput) w.__cls! += e.value; }).observe({ type: 'layout-shift', buffered: true });
  });
  const errors = await open(page);
  const cls = () => page.evaluate(() => (window as { __cls?: number }).__cls ?? 0);
  const out: string[] = [];
  for (const [name, search] of MAIN) {
    await page.goto(`/football/${search}`);
    await page.waitForTimeout(400);
    out.push(`${name} ${(await cls()).toFixed(3)}`);
    expect(await cls(), `load: ${name}`).toBeLessThan(0.02);
  }
  // after clicks: the header and its tabs never move (FK-75: a place's controls are in the tabs row or under the header)
  await page.goto('/football/');
  const top = async () => { const [h, t] = await Promise.all([page.getByTestId('top-bar').boundingBox(), page.getByTestId('where-tools').boundingBox()]); return [h!.y, h!.height, t!.x, t!.y].join(); };
  const y0 = await top();
  for (const w of ['clubs', 'leagues', 'cups', 'tools', 'today']) {
    await page.getByTestId(`where-${w}`).click();
    await page.waitForTimeout(200);
    expect(await top(), w).toBe(y0);
  }
  console.log(`FK-65 CLS on load: ${out.join(' · ')}`);
  expect(errors).toEqual([]);
});

test('at 390 px: the header fits, all five places visible (no hamburger), no sideways page scroll', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors = await open(page);
  for (const [name, search] of MAIN) {
    await page.goto(`/football/${search}`);
    await expect(page.getByTestId('top-bar'), name).toBeVisible();
    for (const w of ['today', 'clubs', 'leagues', 'cups', 'tools']) await expect(page.getByTestId(`where-${w}`), `${name}: ${w}`).toBeInViewport({ ratio: 1 });
    await expect(page.getByTestId('go-anywhere'), name).toBeInViewport({ ratio: 1 });
    const geo = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, hw: document.querySelector('[data-testid="top-bar"]')!.scrollWidth }));
    expect(geo.sw, name).toBeLessThanOrEqual(geo.cw);
    expect(geo.hw, name).toBeLessThanOrEqual(geo.cw);
    // the breadcrumb shows its last two parts
    const shown = await page.getByTestId('crumb').evaluateAll((cs) => cs.filter((c) => getComputedStyle(c).display !== 'none').length);
    expect(shown, name).toBeLessThanOrEqual(2);
  }
  expect(errors).toEqual([]);
});

test('build report: a screenshot of each main page', async ({ page }) => {
  const dir = 'test-output/fk65';
  mkdirSync(dir, { recursive: true });
  await page.setViewportSize({ width: 1920, height: 1080 });
  await open(page);
  for (const [name, search] of MAIN) {
    await page.goto(`/football/${search}`);
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${dir}/${name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.png` });
  }
});
