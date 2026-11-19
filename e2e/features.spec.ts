// Backlog features FK-11 … FK-21, one test (or a few) each. Same setup as smoke.spec.ts: "now" fixed at 2026-11-21
// 12:00 Brazil time, the recorded snapshot of 2026-11-14, nothing from ESPN.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';

/** FK-39: tests never call Open-Meteo: every weather request gets the recorded answer (the Etihad's hours, per venue). */
const OPEN_METEO = JSON.parse(readFileSync(join(import.meta.dirname, '../tests/fixtures/open-meteo.json'), 'utf8')) as unknown[];
async function stubWeather(page: Page) {
  await page.route(/api.open-meteo.com/, (route) => {
    const n = new URL(route.request().url()).searchParams.get('latitude')!.split(',').length;
    return route.fulfill({ json: n === 1 ? OPEN_METEO[0] : Array.from({ length: n }, () => OPEN_METEO[0]) });
  });
}

const NOW = '2026-11-21T15:00:00Z';

async function open(page: Page, search = '') {
  const errors: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.addInitScript((now) => { (window as { __FK_NOW__?: string }).__FK_NOW__ = now; }, NOW);
  await stubWeather(page);
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
  await expect(page).toHaveTitle(/^Day · Nov 21/);
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
  await page.getByTestId('team-views').getByText('Calendar').click();
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
  await page.getByTestId('tag-variant').click(); await page.getByTestId('tag-variant-rail').click();
  await expect(page.locator('.fk-rail-mark[data-tag="alive"]').first()).toBeVisible();
  await page.getByTestId('tag-menu').click();
  await page.getByTestId('tag-on-alive').uncheck();
  await expect(page.locator('.fk-rail-mark[data-tag="alive"]')).toHaveCount(0);
  await page.evaluate(() => { localStorage.removeItem('fk:tags:hidden:v1'); localStorage.removeItem('fk:tags:v1'); });
  expect(errors).toEqual([]);
});

test('FK-16: from a team page, one click on a main tab or the × lands on that main view', async ({ page }) => {
  const errors = await open(page, '?view=cal&team=359&span=month');
  await expect(page).toHaveTitle(/^ARS /);
  // the main tabs stay, none selected; the club's own tabs sit in its group
  const main = page.getByTestId('views');
  await expect(main.getByRole('tab')).toHaveText(['List', 'Slate', 'Tables', 'Cups', 'Trailing']);
  await expect(main.locator('[aria-selected="true"]')).toHaveCount(0);
  await expect(page.getByTestId('club-group').getByTestId('team-views')).toBeVisible();
  await main.getByRole('tab', { name: 'Slate' }).click();
  await expect(page).toHaveTitle(/^Slate · /);
  await expect(page.getByTestId('scope-picker')).toHaveValue('');
  await expect(page.getByTestId('club-clear')).toHaveCount(0);
  // the × goes to the main List on today
  await page.goto('/football/?view=list&team=359');
  await page.getByTestId('club-clear').click();
  await expect(page).toHaveTitle('Day · Nov 21 — footykit');
  await expect(page.getByTestId('day-list')).toBeVisible();
  expect(errors).toEqual([]);
});

test('FK-17: the picked club is highlighted like calendarkit (blue border, bold name, 36 px, × beside); All clubs stays plain', async ({ page }) => {
  const errors = await open(page);
  const box = page.locator('.fk-club-pick');
  const look = () => box.evaluate((el) => {
    const s = getComputedStyle(el), i = getComputedStyle(el.querySelector('input')!);
    return { border: s.borderTopColor, width: s.borderTopWidth, height: el.getBoundingClientRect().height, radius: s.borderTopLeftRadius, weight: i.fontWeight, color: i.color, logo: !!el.querySelector('.fk-logo') };
  });
  const plain = await look();
  expect(plain.border).not.toBe('rgb(78, 161, 255)');
  expect(plain.logo).toBe(false);
  await page.goto('/football/?view=cal&team=359');
  const picked = await look();
  expect(picked).toMatchObject({ border: 'rgb(78, 161, 255)', width: '2px', height: 36, radius: '8px', weight: '700', color: 'rgb(255, 255, 255)', logo: true });
  await expect(page.getByTestId('scope-picker')).toHaveValue('Arsenal');
  // the × right beside it
  const [p, x] = await Promise.all([box.boundingBox(), page.getByTestId('club-clear').boundingBox()]);
  expect(x!.x - (p!.x + p!.width)).toBeLessThan(8);
  expect(errors).toEqual([]);
});

test('FK-18: the team Calendar fills the window down to the bottom; a short window scrolls instead of squashing', async ({ page }) => {
  const errors = await open(page, '?view=cal&team=359&span=month');
  await expect(page.getByTestId('cal-match').first()).toBeVisible();
  const fit = () => page.evaluate(() => ({
    gap: innerHeight - document.querySelector('.fk-cal-grid')!.getBoundingClientRect().bottom,
    scrolls: document.documentElement.scrollHeight > innerHeight,
    rows: [...document.querySelectorAll('.fk-cal-cell')].map((c) => c.getBoundingClientRect().height),
  }));
  for (const span of ['Month', '2 weeks'] as const) {
    await page.getByTestId('span').getByRole('tab', { name: span }).click();
    const f = await fit();
    expect(f.gap).toBeGreaterThanOrEqual(0);
    expect(f.gap).toBeLessThan(40); // no dead space under the grid
    expect(f.scrolls).toBe(false);
  }
  await page.getByTestId('span').getByRole('tab', { name: 'Month' }).click();
  await page.setViewportSize({ width: 1920, height: 500 });
  await expect.poll(async () => Math.min(...(await fit()).rows)).toBeGreaterThanOrEqual(92);
  expect((await fit()).scrolls).toBe(true);
  expect(errors).toEqual([]);
});

test('FK-19: the tab title follows every navigation, worded like calendarkit', async ({ page }) => {
  const errors = await open(page);
  const title = (t: string) => expect(page).toHaveTitle(`${t} — footykit`);
  await title('Day · Nov 21');
  await page.getByLabel('Next').click(); await title('Day · Nov 22');
  await page.getByTestId('today').click(); await title('Day · Nov 21');
  await page.getByLabel('Pick a date').fill('2026-11-25'); await title('Day · Nov 25');
  await page.getByTestId('views').getByRole('tab', { name: 'Slate' }).click(); await title('Slate · Nov 25');
  await page.getByLabel('Previous').click(); await title('Slate · Nov 24');
  // club pick → its calendar, span changes, steps, its list, unpick
  const picker = page.getByTestId('scope-picker');
  await picker.click(); await picker.pressSequentially('arsenal'); await picker.press('Enter');
  await expect(page).toHaveTitle(/^ARS schedule · Nov 16 – 29 /);
  await page.getByTestId('span').getByRole('tab', { name: 'Month' }).click(); await title('ARS schedule · Nov 2026');
  await page.getByLabel('Next').click(); await title('ARS schedule · Dec 2026');
  await page.getByTestId('today').click(); await title('ARS schedule · Nov 2026');
  await page.getByTestId('span').getByRole('tab', { name: '1 week' }).click(); await title('ARS schedule · Nov 16 – 22');
  await page.getByLabel('Next').click(); await title('ARS schedule · Nov 23 – 29');
  await page.getByLabel('Next').click(); await title('ARS schedule · Nov 30 – Dec 6');
  await page.getByTestId('team-views').getByRole('tab', { name: 'List' }).click(); await expect(page).toHaveTitle(/^ARS list · /);
  await page.getByText(/Load earlier/).click(); await expect(page).toHaveTitle(/^ARS list · \w{3} – \w{3} 2026 — footykit$/);
  await page.getByTestId('club-clear').click(); await title('Day · Nov 21');
  // other views and their pickers
  await page.getByTestId('views').getByRole('tab', { name: 'Cups' }).click(); await page.getByTestId('cup-picker').selectOption('uefa.champions'); await title('Champions League');
  await page.getByTestId('views').getByRole('tab', { name: 'Tables' }).click(); await title('Premier League table');
  await page.getByTestId('league-picker').selectOption('bra.1'); await title('Brasileirão table');
  await page.getByTestId('views').getByRole('tab', { name: 'Cups' }).click(); await title('Libertadores');
  await page.getByTestId('cup-picker').selectOption('eng.fa'); await title('FA Cup');
  await page.getByTestId('views').getByRole('tab', { name: 'Trailing' }).click(); await expect(page).toHaveTitle(/goals while trailing — footykit$/);
  // back / forward and a direct load
  await page.goBack(); await title('FA Cup');
  await page.goForward(); await expect(page).toHaveTitle(/goals while trailing/);
  await page.getByTestId('page-history').getByLabel('Back').click(); await title('FA Cup');
  await page.goto('/football/?view=list&team=359'); await title('ARS list · Nov 2026');
  await page.goto('/football/?view=slate'); await title('Slate · Nov 21');
  expect(errors).toEqual([]);
});

test('FK-20: a Calendar cell reads "NEW 1 @ 3 EVE", the winner\'s number bright; to come: "NEW vs ARS" under the kickoff', async ({ page }) => {
  const errors = await open(page, '?view=cal&team=361&span=month');
  const played = page.locator('.fk-cal-cell[data-day="2026-10-29"]').getByTestId('cal-match');
  const line = played.getByTestId('cal-line');
  await expect(line).toHaveText(/^\s*NEW\s*1\s*@\s*3\s*EVE\s*$/);
  await expect(line.locator('.fk-num-win')).toHaveText('3');
  await expect(line.locator('.fk-num-lose')).toHaveText('1');
  // the result marker stays; the score isn't repeated lower down
  await expect(played.locator('.fk-cell-tags .fk-res')).toHaveText('L');
  await expect(played).not.toContainText('1-3');
  const next = page.locator('.fk-cal-cell[data-day="2026-11-21"]').getByTestId('cal-match');
  await expect(next.getByTestId('cal-line')).toHaveText(/^\s*NEW\s*vs\s*ARS\s*$/);
  await expect(next.locator('.fk-cell-time')).toHaveText('14:30');
  expect(errors).toEqual([]);
});

test('FK-21: road trip and homestand labels on the team Calendar and List, counted over the whole season', async ({ page }) => {
  const errors = await open(page, '?view=cal&team=86&span=month');
  const label = (d: string) => page.locator(`.fk-cal-cell[data-day="${d}"]`).getByTestId('run-label');
  await expect(label('2026-11-01')).toHaveText('Road trip · 1/3');
  await expect(label('2026-11-04')).toHaveText('Road trip · 2/3');
  await expect(label('2026-11-07')).toHaveText('Road trip · 3/3');
  await expect(label('2026-11-21')).toHaveText('Homestand · 1/3');
  await expect(label('2026-11-01')).toHaveCSS('border-top-color', 'rgb(239, 127, 150)');
  await expect(label('2026-11-21')).toHaveCSS('border-top-color', 'rgb(143, 157, 255)');
  await expect(label('2026-11-01')).toHaveAttribute('title', /Road trip · match 1 of 3\n.+ – .+\n.+ → /);
  // a run crossing the month keeps its full length: Como's 4-match homestand from Nov 21 ends "4/4" in December
  await page.goto('/football/?view=cal&team=2572&span=month');
  await page.getByLabel('Next').click();
  await expect(page.locator('.fk-cal-cell[data-day="2026-12-02"]').getByTestId('run-label')).toHaveText('Homestand · 4/4');
  // the List
  await page.goto('/football/?view=list&team=86');
  await expect(page.getByTestId('run-label').filter({ hasText: 'Road trip · 2/3' })).toHaveCount(1);
  expect(errors).toEqual([]);
});

test('FK-22: the bar has calendarkit\'s metrics and blue accent', async ({ page }) => {
  const errors = await open(page);
  const bar = await page.getByTestId('top-bar').evaluate((el) => {
    const h = (s: string) => Math.round(el.querySelector(s)!.getBoundingClientRect().height);
    const on = getComputedStyle(el.querySelector('.fk-tab-on')!);
    return { row: Math.round(el.getBoundingClientRect().height), gap: getComputedStyle(el).columnGap, tabs: h('.fk-tabs'), hist: h('.fk-hist'), step: h('.fk-step'), today: h('[data-testid="today"]'), icon: h('.fk-icon-btn'), onBg: on.backgroundColor, onFont: `${on.fontSize} ${on.fontWeight}` };
  });
  expect(bar).toEqual({ row: 44, gap: '14px', tabs: 32, hist: 32, step: 32, today: 32, icon: 32, onBg: 'rgb(78, 161, 255)', onFont: '13px 600' });
  // green stays for meaning: a win square
  await expect(page.locator('.fk-form-W').first()).toHaveCSS('background-color', 'rgb(55, 196, 122)');
  expect(errors).toEqual([]);
});

test('FK-23: a team header (logo, full name, period) above the Calendar and List, following ‹ › and the club', async ({ page }) => {
  const errors = await open(page, '?view=cal&team=359&span=month');
  const name = page.getByTestId('team-header-name'), period = page.getByTestId('team-period');
  await expect(name).toHaveText('Arsenal');
  await expect(period).toHaveText('November 2026');
  await expect(page.getByTestId('team-header').locator('.fk-logo-backing img')).toBeVisible();
  await page.getByLabel('Next').click();
  await expect(period).toHaveText('December 2026');
  await page.getByTestId('span').getByRole('tab', { name: '2 weeks' }).click();
  await expect(period).toHaveText(/^\w{3} \d+ – (\w{3} )?\d+, 202[67]$/);
  await page.getByTestId('span').getByRole('tab', { name: '1 week' }).click();
  await page.getByTestId('today').click();
  await expect(period).toHaveText('Nov 16 – 22, 2026');
  await page.getByLabel('Next').click();
  await expect(period).toHaveText('Nov 23 – 29, 2026');
  // the header sits above the grid, inside the page, not in the bar
  expect(await page.getByTestId('team-calendar').getByTestId('team-header').count()).toBe(1);
  await page.getByTestId('team-views').getByRole('tab', { name: 'List' }).click();
  await expect(period).toHaveText('November 2026');
  await page.getByText(/Load earlier/).click();
  await expect(period).toHaveText('October – November 2026');
  // another club
  const picker = page.getByTestId('scope-picker');
  await picker.click(); await picker.pressSequentially('gremio'); await picker.press('Enter');
  await expect(name).toHaveText('Grêmio');
  expect(errors).toEqual([]);
});

test('FK-24: Team Calendar cells on calendarkit design: scaled content, pills, today, key in ⓘ; copy and marquee still work', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  const errors = await open(page, '?view=cal&team=359&span=month');
  const grid = page.locator('.fk-cal-grid');
  // calendarkit's content scale, 0.8–2 in a month (3 in week views)
  const scale = Number(await grid.getAttribute('data-scale'));
  expect(scale).toBeGreaterThanOrEqual(0.8);
  expect(scale).toBeLessThanOrEqual(2);
  // every cell's content fits its cell
  const over = await page.locator('.fk-cal-cell').evaluateAll((cells) => cells.filter((c) => c.scrollHeight > c.clientHeight + 1 || c.scrollWidth > c.clientWidth + 1).length);
  expect(over).toBe(0);
  // today: the accent border and number
  const today = page.locator('.fk-cal-cell[data-day="2026-11-21"]');
  await expect(today).toHaveCSS('border-top-color', 'rgb(78, 161, 255)');
  await expect(today.locator('.fk-daynum')).toHaveCSS('color', 'rgb(78, 161, 255)');
  // kickoff on top, played or not; the competition as a marker pill
  const played = page.locator('.fk-cal-cell[data-day="2026-11-04"]').getByTestId('cal-match');
  await expect(played.locator('.fk-cell-time')).toHaveText(/^\d\d:\d\d$/);
  await expect(played.getByTestId('cal-comp')).toHaveText('UCL');
  // no legend under the grid: it's in the ⓘ
  await expect(page.getByTestId('window-legend')).toHaveCount(0);
  await page.getByTestId('bar-info').click();
  await expect(page.getByTestId('calendar-key')).toContainText('free window');
  await page.getByTestId('bar-info').click();
  // week views scale up to 3
  await page.getByTestId('span').getByRole('tab', { name: '1 week' }).click();
  await expect.poll(async () => Number(await grid.getAttribute('data-scale'))).toBeGreaterThan(scale);
  // marquee over two match cells, then copy them
  await page.getByTestId('span').getByRole('tab', { name: 'Month' }).click();
  const a = (await page.locator('.fk-cal-cell[data-day="2026-11-04"]').boundingBox())!, b = (await page.locator('.fk-cal-cell[data-day="2026-11-07"]').boundingBox())!;
  await page.mouse.move(a.x + 4, a.y + a.height - 4);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width - 4, b.y + 30, { steps: 10 });
  await page.mouse.up();
  const bar = page.getByTestId('selection-bar');
  await expect(bar).toContainText('2 matches selected');
  await bar.getByTestId('copy').click();
  await expect(bar.getByTestId('copy')).toHaveText('✓');
  // and the whole view
  await page.locator('.fk-team-header').click();
  await page.getByTestId('top-bar').getByTestId('copy').click();
  await expect(page.getByTestId('top-bar').getByTestId('copy')).toHaveText('✓');
  expect(errors).toEqual([]);
});

test('FK-25: calendarkit\'s surfaces: card rows, table panels, the Quick standings frame, month dividers', async ({ page }) => {
  const errors = await open(page);
  await expect(page.getByTestId('match-row').first()).toHaveCSS('background-color', 'rgb(31, 35, 44)');
  await page.getByTestId('standings-button').click();
  const pop = page.getByTestId('standings-popup');
  await expect(pop).toHaveCSS('border-top-left-radius', '12px');
  await expect(pop.locator('.fk-float-title')).toHaveText('Standings');
  await expect(pop.locator('.fk-float-title')).toHaveCSS('font-size', '18px');
  await expect(pop.locator('table.fk-table').first()).toHaveCSS('border-top-left-radius', '10px');
  await expect(pop.locator('table.fk-table th').first()).toHaveCSS('font-size', '11px');
  await page.goto('/football/?view=table&league=eng.1');
  const head = await page.locator('.fk-ucl-head h2').boundingBox(), bar = await page.getByTestId('top-bar').boundingBox();
  expect(Math.abs(head!.x - bar!.x)).toBeLessThan(2); // the page starts at the bar's left edge
  await page.goto('/football/?view=list&team=359');
  await expect(page.locator('.fk-tl-month h3').first()).toHaveCSS('text-transform', 'uppercase');
  expect(errors).toEqual([]);
});

test('FK-29: the UCL is in the Cups section, not a tab of its own', async ({ page }) => {
  const errors = await open(page, '?view=cups');
  const title = (t: string) => expect(page).toHaveTitle(`${t} — footykit`);
  const views = page.getByTestId('views');
  await expect(views.getByRole('tab', { name: 'UCL' })).toHaveCount(0);
  const picker = page.getByTestId('cup-picker');
  await expect(picker.locator('option').first()).toHaveText('Champions League');
  await picker.selectOption('uefa.champions');
  await title('Champions League');
  await expect(page.getByTestId('ucl-knockout')).toBeVisible();
  await expect(views.locator('[aria-selected="true"]')).toHaveText('Cups');
  await expect(picker).toHaveValue('uefa.champions');
  // its simulator stays in the section; another cup leads back to the cups page
  await page.getByTestId('ucl-whatif').click();
  await expect(page).toHaveTitle('UCL simulator — footykit');
  await expect(views.locator('[aria-selected="true"]')).toHaveText('Cups');
  await page.getByTestId('cup-picker').selectOption('eng.fa');
  await expect(page.getByTestId('cups-page')).toHaveAttribute('data-cup', 'eng.fa');
  // old addresses still work
  await page.goto('/football/?view=ucl'); await title('Champions League');
  await page.goto('/football/?view=cups&cup=uefa.champions'); await title('Champions League');
  expect(errors).toEqual([]);
});

test('FK-30: every cup has a simulator — pick ties, the bracket follows, kept, cleared', async ({ page }) => {
  const errors = await open(page, '?view=cups&cup=conmebol.libertadores');
  await expect(page.getByTestId('cup-sim-pick')).toHaveCount(0); // off until asked
  await page.getByTestId('cup-sim-toggle').click();
  const picks = page.getByTestId('cup-sim-pick');
  await expect(picks).toHaveCount(2); // the final, the only tie left
  await picks.first().click();
  const champ = page.getByTestId('cup-sim-champion');
  await expect(champ).toContainText('(picked)');
  await expect(page.getByTestId('cup-sim-count')).toHaveText('1 picked · 0 to pick');
  // kept across a reload, and per cup
  await page.reload();
  await page.getByTestId('cup-sim-toggle').click();
  await expect(page.getByTestId('cup-sim-champion')).toContainText('(picked)');
  await page.getByTestId('cup-picker').selectOption('ger.dfb_pokal');
  await page.getByTestId('cup-sim-toggle').click();
  await expect(page.getByTestId('cup-sim-champion')).toHaveCount(0);
  await expect(page.getByTestId('cup-sim-count')).toHaveText('0 picked · 8 to pick');
  // a round not drawn yet: the clubs through are listed, not paired
  await page.getByTestId('cup-sim-pick').first().click();
  await expect(page.getByTestId('cup-sim-waiting').first()).toContainText('not paired yet');
  // a second click clears that pick
  await page.getByTestId('cup-sim-pick').first().click();
  await expect(page.getByTestId('cup-sim-count')).toHaveText('0 picked · 8 to pick');
  // another domestic cup starts off, with its own picks
  await page.getByTestId('cup-sim-pick').first().click();
  await page.getByTestId('cup-picker').selectOption('eng.league_cup');
  await expect(page.getByTestId('cup-sim-pick')).toHaveCount(0);
  await page.getByTestId('cup-sim-toggle').click();
  await expect(page.getByTestId('cup-sim-count')).toHaveText('0 picked · 4 to pick');
  await page.getByTestId('cup-picker').selectOption('ger.dfb_pokal');
  await page.getByTestId('cup-sim-toggle').click();
  await page.getByTestId('cup-sim-clear').click();
  // every cup on the Cups page has it
  for (const c of ['conmebol.sudamericana', 'bra.copa_do_brazil', 'eng.fa', 'eng.league_cup', 'esp.copa_del_rey', 'ita.coppa_italia', 'fra.coupe_de_france']) {
    await page.getByTestId('cup-picker').selectOption(c);
    await expect(page.getByTestId('cup-sim-toggle')).toBeVisible();
  }
  await page.getByTestId('cup-picker').selectOption('conmebol.libertadores');
  await page.getByTestId('cup-sim-toggle').click();
  await page.getByTestId('cup-sim-clear').click();
  await expect(page.getByTestId('cup-sim-champion')).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem('fk:whatif:v1'))).toBeNull();
  expect(errors).toEqual([]);
});

test('FK-31 / FK-32: Slate card score beside the name; bigger last-games squares with crests and vs / @', async ({ page }) => {
  const errors = await open(page, '?view=slate');
  // a day of played matches in the recorded snapshot
  await page.getByLabel('Pick a date').fill('2026-11-08');
  const card = page.getByTestId('slate-card').first();
  await expect(card).toBeVisible();
  const rows = await page.locator('[data-testid="slate-card"] .fk-card-row').evaluateAll((els) => els.map((r) => {
    // the name, or its league place right after it (FK-28: "Arsenal 1st 2")
    const name = (r.querySelector('.fk-pos') ?? r.querySelector('.fk-team-name'))!.getBoundingClientRect();
    const score = r.querySelector('[data-testid="card-score"]')?.getBoundingClientRect();
    const sq = [...r.querySelectorAll('.fk-fg-sq')].map((s) => s.getBoundingClientRect());
    return { gap: score ? score.left - name.right : undefined, sqLefts: sq.map((s) => Math.round(s.left - r.getBoundingClientRect().left)), sqW: sq[0]?.width, prefixes: [...r.querySelectorAll('[data-testid="form-game"] .fk-fg-at')].map((p) => p.textContent) };
  }));
  // FK-31: every played card's score sits right after the name
  for (const r of rows) { expect(r.gap).toBeGreaterThanOrEqual(0); expect(r.gap).toBeLessThan(12); }
  // FK-32: squares (20 px since FK-35 fitted them into calendarkit's card), "vs" / "@" before each, at the same x on every row
  const withForm = rows.filter((r) => r.sqLefts.length);
  expect(withForm.length).toBeGreaterThan(5);
  for (const r of withForm) {
    expect(r.sqW).toBe(20);
    expect(r.sqLefts).toEqual(withForm[0]!.sqLefts);
    for (const p of r.prefixes) expect(['vs', '@']).toContain(p);
  }
  const game = card.getByTestId('form-game').first();
  await expect(game.locator('img')).toHaveCount(1); // the opponent's crest
  expect(['W', 'D', 'L']).toContain(await game.getAttribute('data-result'));
  expect(errors).toEqual([]);
});

test('FK-34: the Tags setting says what each choice does; the saved choice still works', async ({ page }) => {
  await page.addInitScript(() => { if (!sessionStorage.getItem('fk34')) { localStorage.setItem('fk:tags:v1', 'rail'); sessionStorage.setItem('fk34', '1'); } });
  const errors = await open(page);
  const pick = page.getByTestId('tag-variant');
  await expect(pick).toHaveText('Tags: Window strip ▾'); // an old saved "rail" reads as its new name
  await pick.click();
  const opts = page.getByTestId('tag-variant-pop').getByRole('option');
  await expect(opts.locator('strong')).toHaveText(['All tags', 'Window strip', 'Highlights only', 'Hide tags']);
  for (const o of await opts.all()) await expect(o.locator('.fk-muted')).toHaveText(/^\S+( \S+){3,}$/); // a sentence, not a bare word
  await expect(page.getByTestId('tag-variant-rail')).toHaveAttribute('aria-selected', 'true');
  await page.getByTestId('tag-variant-alerts').click();
  await expect(page.getByTestId('tag-variant-pop')).toHaveCount(0);
  await expect(pick).toHaveText('Tags: Highlights only ▾');
  expect(await page.evaluate(() => localStorage.getItem('fk:tags:v1'))).toBe('alerts');
  await page.reload();
  await expect(page.getByTestId('tag-variant')).toHaveText('Tags: Highlights only ▾');
  await page.evaluate(() => localStorage.removeItem('fk:tags:v1'));
  expect(errors).toEqual([]);
});

test('FK-28: each team\'s domestic league place beside its name on list rows and Slate cards', async ({ page }) => {
  const errors = await open(page); // Sat Nov 21: Premier League, LaLiga, ... rows
  const row = page.getByTestId('match-row').first();
  await expect(row.getByTestId('league-pos')).toHaveCount(2);
  for (const p of await row.getByTestId('league-pos').all()) {
    await expect(p).toHaveText(/^\d+(st|nd|rd|th)$/);
    await expect(p).toHaveAttribute('title', /of \d+ in the /);
  }
  // the away place sits after its name, the home place before its name (both beside the score)
  const xs = await row.evaluate((r) => {
    const x = (sel: string) => r.querySelector(sel)!.getBoundingClientRect().left;
    return { awayName: x('.fk-away .fk-team'), awayPos: x('.fk-away .fk-pos'), homePos: x('.fk-home .fk-pos'), homeName: x('.fk-home .fk-team') };
  });
  expect(xs.awayPos).toBeGreaterThan(xs.awayName);
  expect(xs.homePos).toBeLessThan(xs.homeName);
  // Arsenal (1st on the recorded day) in its Team List
  await page.goto('/football/?view=list&team=359');
  await expect(page.getByTestId('team-row').first().locator('[data-testid="league-pos"]').first()).toBeVisible();
  // Slate cards: both teams
  await page.getByTestId('views').getByRole('tab', { name: 'Slate' }).click();
  await expect(page.getByTestId('slate-card').first().getByTestId('league-pos')).toHaveCount(2);
  expect(errors).toEqual([]);
});

test('FK-36: the Slate strip shows the 2 played before and the next 2 after the match', async ({ page }) => {
  const errors = await open(page, '?view=slate');
  await page.getByLabel('Pick a date').fill('2026-11-08');
  const strips = page.locator('[data-testid="slate-card"] [data-testid="form"]');
  await expect(strips.first()).toBeVisible();
  const counts = await strips.evaluateAll((els) => els.map((e) => ({
    slots: e.querySelectorAll('.fk-fg').length,
    before: e.querySelectorAll('[data-testid="form-game"][data-side="before"]').length,
    after: e.querySelectorAll('[data-testid="form-game"][data-side="after"]').length,
    beforeResults: [...e.querySelectorAll('[data-testid="form-game"][data-side="before"]')].every((g) => !!g.getAttribute('data-result')),
  })));
  expect(counts.length).toBeGreaterThan(5);
  for (const c of counts) {
    expect(c.slots).toBe(4); // always 4 slots, so the squares line up
    expect(c.beforeResults).toBe(true);
  }
  // mid-season: most clubs have 2 played before and 2 to come
  expect(counts.filter((c) => c.before === 2 && c.after === 2).length).toBeGreaterThan(counts.length / 2);
  // played squares carry their result's colour (was grey on every square: .fk-fg-sq's background won over .fk-form-*)
  const bg = await page.locator('[data-testid="form-game"][data-result] .fk-fg-sq').evaluateAll((els) => els.map((e) => [e.parentElement!.getAttribute('data-result'), getComputedStyle(e).backgroundColor]));
  const byResult = new Map<string, Set<string>>();
  for (const [r, c] of bg) byResult.set(r!, (byResult.get(r!) ?? new Set()).add(c!));
  expect(byResult.get('W')?.size).toBe(1);
  expect(byResult.get('L')?.size).toBe(1);
  expect([...byResult.get('W')!][0]).not.toBe([...byResult.get('L')!][0]);
  expect(errors).toEqual([]);
});

test('FK-35: Slate cards are calendarkit\'s size, in a tight grid, under "SLATE · dd-mm · Football"', async ({ page }) => {
  const errors = await open(page, '?view=slate');
  await expect(page.getByTestId('slate-header')).toHaveText('SLATE · 21-11 · Football');
  // calendarkit's info-only card, measured on its live Slate (src/slate/layout.ts there): 509 × 78
  const sizes = await page.getByTestId('slate-card').evaluateAll((els) => els.map((e) => { const r = e.getBoundingClientRect(); return `${r.width}x${r.height}`; }));
  expect(sizes.length).toBeGreaterThan(3);
  expect(new Set(sizes)).toEqual(new Set(['509x78']));
  // nothing spills out of a row; neighbours share their 1 px border
  const spill = await page.locator('.fk-card-row').evaluateAll((els) => els.filter((r) => r.scrollWidth > r.clientWidth).length);
  expect(spill).toBe(0);
  const [a, b] = await page.getByTestId('slate-card').evaluateAll((els) => els.slice(0, 2).map((e) => e.getBoundingClientRect()));
  expect(b!.left - a!.right).toBe(-1);
  // the row's tracks: "@", logo, name, tags, games, odds — the same x on every card
  const odds = await page.getByTestId('card-odds').evaluateAll((els) => new Set(els.map((e) => Math.round(e.getBoundingClientRect().right - e.closest('.fk-card')!.getBoundingClientRect().left))).size);
  expect(odds).toBe(1);
  expect(errors).toEqual([]);
});

test('FK-38: a Slate card has the home team on the first line, the away team on the second', async ({ page }) => {
  const errors = await open(page, '?view=slate');
  // Man City (home) v Fulham (away), Sat Nov 21 in the recorded snapshot
  const card = page.locator('[data-testid="slate-card"][data-match-id="401879233"]');
  const rows = card.locator('.fk-card-row');
  await expect(rows).toHaveCount(2);
  await expect(rows.nth(0)).toHaveAttribute('data-side', 'home');
  await expect(rows.nth(0).locator('.fk-card-team')).toHaveText('Man City');
  await expect(rows.nth(1)).toHaveAttribute('data-side', 'away');
  await expect(rows.nth(1).locator('.fk-card-team')).toHaveText('Fulham');
  await expect(card).toHaveAttribute('aria-label', 'Manchester City vs Fulham');
  // every card: home first
  const sides = await page.locator('[data-testid="slate-card"]').evaluateAll((els) => els.map((e) => [...e.querySelectorAll('.fk-card-row')].map((r) => r.getAttribute('data-side')).join(',')));
  expect(new Set(sides)).toEqual(new Set(['home,away']));
  expect(errors).toEqual([]);
});

test('FK-40: the Slate game button opens a pop-up of links (injuries, odds and props), closes on leaving', async ({ page }) => {
  const errors = await open(page, '?view=slate');
  const card = page.locator('[data-testid="slate-card"][data-match-id="401879233"]'); // Man City v Fulham
  const btn = card.getByTestId('game-menu');
  await expect(btn).toHaveCount(1); // one per card, in the first row's "@" cell
  await expect(card.locator('.fk-card-row').first().getByTestId('game-menu')).toHaveCount(1);
  await btn.hover();
  const pop = page.getByTestId('game-links-popup');
  await expect(pop).toBeVisible();
  await expect(pop.getByTestId('injury-link')).toHaveCount(2);
  await expect(pop.getByTestId('injury-link').first()).toHaveAttribute('href', 'https://www.transfermarkt.com/-/sperrenundverletzungen/verein/281');
  await expect(pop.getByTestId('injury-link').first()).toHaveAttribute('target', '_blank');
  await expect(pop.getByTestId('props-link')).toHaveAttribute('href', 'https://sportsbook.fanduel.com/soccer');
  // the pointer can travel into the pop-up; leaving both closes it
  await pop.hover();
  await expect(pop).toBeVisible();
  await page.mouse.move(5, 5);
  await expect(pop).toHaveCount(0);
  // the card keeps calendarkit's size with the button in it
  expect(await card.evaluate((e) => { const r = e.getBoundingClientRect(); return `${r.width}x${r.height}`; })).toBe('509x78');
  expect(errors).toEqual([]);
});

test('FK-39: the weather at kick-off — a sign on the Slate card, the forecast with Open-Meteo\'s credit in the game pop-up', async ({ page }) => {
  const asked: string[] = [];
  page.on('request', (r) => { if (r.url().includes('open-meteo')) asked.push(r.url()); });
  const errors = await open(page, '?view=slate');
  const card = page.locator('[data-testid="slate-card"][data-match-id="401879233"]'); // Man City v Fulham at the Etihad
  const mark = card.locator('.fk-card-row').nth(1).getByTestId('weather-mark');
  await expect(mark).toBeVisible();
  await expect(mark).toHaveAttribute('title', /^At kick-off: .+, -?\d+ °C, feels .+ · rain \d+% · wind \d+ km\/h\nWeather data by Open-Meteo\.com$/);
  // one request for the whole day's venues
  expect(asked).toHaveLength(1);
  expect(new URL(asked[0]!).searchParams.get('hourly')).toContain('apparent_temperature');
  await card.getByTestId('game-menu').hover();
  const lines = page.getByTestId('game-links-popup').getByTestId('weather-lines');
  await expect(lines).toContainText('At kick-off in Etihad Stadium, Manchester');
  await expect(lines).toContainText(/feels .+ · rain \d+% · wind \d+ km\/h/);
  await expect(lines.getByRole('link', { name: 'Weather data by Open-Meteo.com' })).toHaveAttribute('href', 'https://open-meteo.com/');
  // no extra width
  expect(await card.evaluate((e) => e.getBoundingClientRect().width)).toBe(509);
  expect(errors).toEqual([]);
});

test('FK-42: league tables have Pts as the first column after Team, bold, values unchanged', async ({ page }) => {
  const errors = await open(page);
  for (const league of ['eng.1', 'esp.1', 'ita.1', 'ger.1', 'fra.1', 'bra.1']) {
    await page.goto(`/football/?view=table&league=${league}`);
    const split = page.getByTestId('league-split');
    await expect(split.locator('thead th').first()).toHaveText('#');
    const heads = await split.locator('table').first().locator('thead th').allTextContents();
    expect(heads.slice(0, 10), league).toEqual(['#', 'Team', 'Pts', 'P', 'W', 'D', 'L', 'GF', 'GA', 'GD']);
    // the values are the points: 3 a win, 1 a draw, in table order (non-increasing)
    const rows = await page.getByTestId('league-row').evaluateAll((trs) => trs.map((tr) => [...tr.querySelectorAll('td')].slice(2, 6).map((td) => Number(td.textContent))));
    expect(rows.length).toBeGreaterThan(15);
    for (const [pts, , w, d] of rows) expect(pts, league).toBe(3 * w! + d!);
    for (let i = 1; i < rows.length; i++) expect(rows[i]![0]!).toBeLessThanOrEqual(rows[i - 1]![0]!);
    await expect(page.getByTestId('league-row').first().getByTestId('pts')).toHaveCSS('font-weight', '800');
  }
  // the simulator's table and the quick standings too
  await page.goto('/football/?view=whatif&league=eng.1');
  await expect(page.getByTestId('wi-split').locator('thead th').first()).toBeVisible();
  const wi = await page.getByTestId('wi-split').locator('table').first().locator('thead th').allTextContents();
  expect(wi.slice(0, 5)).toEqual(['#', '', 'Team', 'Pts', 'P']);
  expect(errors).toEqual([]);
});

test('FK-43: ◀ ▶ step a league table back through the rounds and return to the latest', async ({ page }) => {
  const errors = await open(page, '?view=table&league=eng.1');
  const label = page.getByTestId('lt-round');
  await expect(label).toHaveText('after 10 rounds');
  await expect(page.getByTestId('lt-next')).toBeDisabled();
  const pts = async () => page.getByTestId('league-row').evaluateAll((trs) => trs.map((tr) => [tr.getAttribute('data-team'), Number(tr.querySelectorAll('td')[3]!.textContent)]));
  const now = await pts();
  expect(new Set(now.map(([, p]) => p))).toEqual(new Set([10]));
  await page.getByTestId('lt-prev').click();
  await expect(label).toHaveText('after 9 rounds');
  // every Premier League team played all of rounds 1–9 (no postponement in the recorded season)
  expect(new Set((await pts()).map(([, p]) => p))).toEqual(new Set([9]));
  // ← → work too, down to round 1
  await page.keyboard.press('ArrowLeft');
  await expect(label).toHaveText('after 8 rounds');
  for (let i = 0; i < 10; i++) await page.keyboard.press('ArrowLeft');
  await expect(label).toHaveText('after 1 round');
  await expect(page.getByTestId('lt-prev')).toBeDisabled();
  // the squares follow the round: one match up to round 1, then rounds 2-4 (already played, so with their results)
  const squares = await page.getByTestId('league-row').first().evaluate((tr) => {
    const kids = [...tr.querySelector('.fk-lt-squares')!.children];
    const gap = kids.findIndex((k) => k.classList.contains('fk-lt-gap'));
    return { last: kids.slice(0, gap).filter((k) => k.tagName === 'A').length, next: kids.slice(gap + 1).length };
  });
  expect(squares).toEqual({ last: 1, next: 3 });
  for (let i = 0; i < 9; i++) await page.getByTestId('lt-next').click();
  await expect(label).toHaveText('after 10 rounds');
  expect(await pts()).toEqual(now);
  expect(errors).toEqual([]);
});

test('FK-37: hovering the k/n chip opens the season series popup, it stays while the pointer is in it and closes on leaving; a click keeps it open', async ({ page }) => {
  const errors = await open(page);
  const chip = page.getByTestId('series-chip').first();
  await expect(chip).toHaveText(/^\d+\/\d+$/);
  const pop = page.getByTestId('series-popup');
  await chip.hover();
  await expect(pop).toBeVisible();
  await expect(pop).toHaveAttribute('data-hover', 'true');
  await expect(pop.getByTestId('series-square').first()).toBeVisible();
  // the pointer can travel into the popup (its cards are links)
  await pop.hover();
  await page.waitForTimeout(250);
  await expect(pop).toBeVisible();
  // leaving both closes it within ~100 ms (calendarkit CK-6)
  await page.mouse.move(2, 2);
  await expect(pop).toHaveCount(0, { timeout: 1000 });
  // a click keeps it open after the pointer leaves; Escape closes it
  await chip.hover();
  await chip.click();
  await page.mouse.move(2, 2);
  await page.waitForTimeout(300);
  await expect(pop).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(pop).toHaveCount(0);
  // the Slate cards' chips too
  await page.goto('/football/?view=slate');
  const slateChip = page.locator('[data-testid="slate-card"] [data-testid="series-chip"]').first();
  if (await slateChip.count()) { await slateChip.hover(); await expect(pop).toBeVisible(); }
  expect(errors).toEqual([]);
});

test('FK-44: a Slate card with odds shows the home and away prices and no draw price', async ({ page }) => {
  // the day layer answers with odds for Man City v Fulham (preview's own day function answers an empty day)
  await page.route(/\/api\/day\?/, (route) => route.fulfill({ json: { date: new URL(route.request().url()).searchParams.get('date'), fetchedAt: '2026-11-21T15:00:00Z', matches: [], odds: { '401879233': { h: 1.45, d: 4.6, a: 6.25, p: 'DraftKings' } } } }));
  const errors = await open(page, '?view=slate');
  const card = page.locator('[data-testid="slate-card"][data-match-id="401879233"]');
  await expect(card.getByTestId('card-odds')).toHaveText(['1.45', '6.25']);
  await expect(card).not.toContainText('4.60');
  await expect(card.locator('.fk-card-draw')).toHaveCount(0);
  expect(errors).toEqual([]);
});
