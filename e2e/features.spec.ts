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
  await expect(main.getByRole('tab')).toHaveText(['List', 'Slate', 'Tables', 'Cups', 'League']);
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
  await page.getByTestId('extra-tools').click(); await page.getByTestId('extra-trailing').click(); await expect(page).toHaveTitle(/goals while trailing — footykit$/);
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
    const sq = [...r.querySelectorAll('[data-testid="strip-slot"]')].map((s) => s.getBoundingClientRect());
    return { gap: score ? score.left - name.right : undefined, sqLefts: sq.map((s) => Math.round(s.left - r.getBoundingClientRect().left)), sqW: r.querySelector('[data-testid="form-game"]:not(.fk-fg-half)')?.getBoundingClientRect().width, prefixes: [...r.querySelectorAll('[data-testid="strip-slot"]:not(.fk-fg-empty) .fk-fg-at')].map((p) => p.textContent) };
  }));
  // FK-31: every played card's score comes after the name (FK-52: in a column of its own, so the gap varies)
  for (const r of rows) if (r.gap !== undefined) { expect(r.gap).toBeGreaterThanOrEqual(0); expect(r.gap).toBeLessThan(160); }
  // FK-32: squares (21 px since FK-53, 20–25 % bigger than FK-47 / FK-48's 17), "vs" / "@" before each, slots at the same x on every row
  const withForm = rows.filter((r) => r.sqLefts.length);
  expect(withForm.length).toBeGreaterThan(5);
  for (const r of withForm) {
    expect(r.sqW).toBe(21);
    expect(r.sqLefts).toEqual(withForm[0]!.sqLefts);
    for (const p of r.prefixes) expect(['vs', '@']).toContain(p);
  }
  const game = card.locator('[data-testid="form-game"][data-result]').first();
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

test('FK-47: the Slate strip shows 5 window slots per team, the middle one (this match) highlighted', async ({ page }) => {
  const errors = await open(page, '?view=slate');
  await page.getByLabel('Pick a date').fill('2026-11-08');
  const strips = page.locator('[data-testid="slate-card"] [data-testid="form"]');
  await expect(strips.first()).toBeVisible();
  const rows = await strips.evaluateAll((els) => els.map((e) => ({
    slots: [...e.querySelectorAll('[data-testid="strip-slot"]')].map((s) => s.getAttribute('data-side')),
    now: [...e.querySelectorAll('[data-testid="strip-slot"]')].findIndex((s) => !!s.querySelector('[data-now]')),
    nowBg: getComputedStyle(e.querySelector('[data-now]')!).backgroundColor,
    nowIcon: e.querySelector('[data-now] img')?.getAttribute('src'),
    empty: [...e.querySelectorAll('.fk-fg-empty')].map((s) => [s.textContent, s.getAttribute('title')]),
    beforeResults: [...e.querySelectorAll('[data-testid="strip-slot"][data-side="before"] [data-testid="form-game"]')].every((g) => !!g.getAttribute('data-result')),
    width: e.getBoundingClientRect().width,
  })));
  expect(rows.length).toBeGreaterThan(5);
  const accent = await page.evaluate(() => getComputedStyle(document.querySelector('.fk-root')!).getPropertyValue('--fk-accent').trim());
  for (const r of rows) {
    expect(r.slots).toEqual(['before', 'before', 'now', 'after', 'after']); // always 5 slots, so they line up
    expect(r.now).toBe(2);
    expect(r.nowIcon).toContain('logos/c-'); // the competition's icon
    expect(r.beforeResults).toBe(true);
    expect(r.width).toBeLessThanOrEqual(160); // FK-53: 21 px squares
    for (const [text, title] of r.empty) { expect(text).toBe('–'); expect(title).toMatch(/^(No match|Nothing fixtured yet|Before the season) · (midweek|weekend) [0-9]/); }
  }
  expect(new Set(rows.map((r) => r.nowBg)).size).toBe(1);
  expect(accent).toBe('#4ea1ff');
  expect(rows[0]!.nowBg).toBe('rgb(78, 161, 255)');
  // rest is visible: some club has an empty window around this date
  expect(rows.some((r) => r.empty.length > 0)).toBe(true);
  // played squares carry their result's colour (was grey on every square: .fk-fg-sq's background won over .fk-form-*)
  const bg = await page.locator('[data-testid="form-game"][data-result]:not([data-now])').evaluateAll((els) => els.map((e) => [e.getAttribute('data-result'), getComputedStyle(e).backgroundColor]));
  const byResult = new Map<string, Set<string>>();
  for (const [r, c] of bg) byResult.set(r!, (byResult.get(r!) ?? new Set()).add(c!));
  expect(byResult.get('W')?.size).toBe(1);
  expect(byResult.get('L')?.size).toBe(1);
  expect([...byResult.get('W')!][0]).not.toBe([...byResult.get('L')!][0]);
  // the card keeps calendarkit's size
  const sizes = await page.getByTestId('slate-card').evaluateAll((els) => els.map((e) => { const r = e.getBoundingClientRect(); return `${r.width}x${r.height}`; }));
  expect(new Set(sizes)).toEqual(new Set(['561x78']));
  expect(errors).toEqual([]);
});

test('FK-35: Slate cards are calendarkit\'s size, in a tight grid, under "SLATE · dd-mm · Football"', async ({ page }) => {
  const errors = await open(page, '?view=slate');
  await expect(page.getByTestId('slate-header')).toHaveText('SLATE · 21-11 · Football');
  // calendarkit's info-only card, measured on its live Slate (src/slate/layout.ts there): 509 × 78; ours 20 px wider since FK-53
  const sizes = await page.getByTestId('slate-card').evaluateAll((els) => els.map((e) => { const r = e.getBoundingClientRect(); return `${r.width}x${r.height}`; }));
  expect(sizes.length).toBeGreaterThan(3);
  expect(new Set(sizes)).toEqual(new Set(['561x78']));
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
  expect(await card.evaluate((e) => { const r = e.getBoundingClientRect(); return `${r.width}x${r.height}`; })).toBe('561x78');
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
  expect(await card.evaluate((e) => e.getBoundingClientRect().width)).toBe(561);
  expect(errors).toEqual([]);
});

test('FK-42: league tables have Pts as the first column after Team, bold, values unchanged', async ({ page }) => {
  const errors = await open(page);
  for (const league of ['eng.1', 'esp.1', 'ita.1', 'ger.1', 'fra.1', 'bra.1']) {
    await page.goto(`/football/?view=table&league=${league}`);
    const split = page.getByTestId('league-split');
    await expect(split.locator('thead th').first()).toHaveText('#');
    const heads = await split.locator('table').first().locator('thead th').allTextContents();
    expect(heads.slice(0, 11), league).toEqual(['#', '', 'Team', 'Pts', 'P', 'W', 'D', 'L', 'GF', 'GA', 'GD']);
    // the values are the points: 3 a win, 1 a draw, in table order (non-increasing)
    const rows = await page.getByTestId('league-row').evaluateAll((trs) => trs.map((tr) => [...tr.querySelectorAll('td')].slice(3, 7).map((td) => Number(td.textContent))));
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
  const pts = async () => page.getByTestId('league-row').evaluateAll((trs) => trs.map((tr) => [tr.getAttribute('data-team'), Number(tr.querySelectorAll('td')[4]!.textContent)]));
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

test('FK-45: the League view — a league\'s games for a day and its table; a cup\'s games and bracket; a team opens its calendar', async ({ page }) => {
  const errors = await open(page);
  await page.getByTestId('views').getByRole('tab', { name: 'League' }).click();
  await expect(page).toHaveURL(/view=league&comp=eng\.1/);
  const view = page.getByTestId('league-view');
  // Sat Nov 21: every Premier League game of the day (all its teams, not only the followed clubs' feeds)
  await expect(view.getByTestId('league-day')).toHaveAttribute('data-day', '2026-11-21');
  await expect(view.getByTestId('match-row')).toHaveCount(7);
  await expect(view.getByTestId('league-row')).toHaveCount(20);
  await expect(view.getByTestId('league-team')).toHaveCount(20);
  // ‹ a day back: a day without games says so
  await page.getByRole('button', { name: 'Previous' }).click();
  await expect(view.getByTestId('league-day')).toHaveAttribute('data-day', '2026-11-20');
  await expect(view.getByTestId('league-no-games')).toHaveText('No games');
  await page.getByTestId('today').click();
  await expect(view.getByTestId('league-day')).toHaveAttribute('data-day', '2026-11-21');
  // Calendar: the week's 7 days; a day's header opens it in the List
  await page.getByTestId('league-modes').getByRole('tab', { name: 'Calendar' }).click();
  await expect(view.getByTestId('league-cal-day')).toHaveCount(7);
  await expect(view.locator('[data-testid="league-cal-day"][data-day="2026-11-21"] [data-testid="league-cal-game"]')).toHaveCount(7);
  await view.locator('[data-testid="league-cal-day"][data-day="2026-11-22"] button').click();
  await expect(view.getByTestId('league-day')).toHaveAttribute('data-day', '2026-11-22');
  // a cup: its games (non-followed clubs too) and its bracket
  await page.getByTestId('league-view-picker').selectOption('eng.league_cup');
  await page.getByLabel('Pick a date').fill('2026-12-16');
  await expect(view.getByTestId('match-row')).toHaveCount(2);
  await expect(view.getByTestId('cup-tie').first()).toBeVisible();
  await expect(view.getByTestId('league-team')).toHaveCount(92);
  await expect(view.getByTestId('league-team').filter({ hasText: 'Tranmere' })).toHaveCount(1);
  // a followed club's name opens its Team Calendar
  await page.getByTestId('league-view-picker').selectOption('eng.1');
  await view.locator('[data-testid="league-team"][data-team="ARS"] button').click();
  await expect(page).toHaveURL(/view=cal&team=359/);
  expect(errors).toEqual([]);
});

test('FK-46: a competition icon says the round on hover and opens the League view on its competition and day', async ({ page }) => {
  const errors = await open(page, '?view=slate');
  const icon = page.locator('[data-testid="slate-card"][data-match-id="401879233"]').getByTestId('comp-link'); // Man City v Fulham
  await expect(icon).toHaveAttribute('title', /^Premier League · Round \d+\n/);
  await icon.click();
  await expect(page).toHaveURL(/view=league&comp=eng\.1/);
  await expect(page.getByTestId('league-day')).toHaveAttribute('data-day', '2026-11-21');
  await expect(page.getByTestId('league-view-picker')).toHaveValue('eng.1');
  // a List row's competition (icon and name) does the same, without pinning the row
  await page.goto('/football/');
  const row = page.getByTestId('match-row').first();
  const comp = await row.getAttribute('data-comp');
  await row.getByTestId('comp-link').click();
  await expect(page).toHaveURL(/view=league/);
  await expect(page.getByTestId('league-view')).toBeVisible();
  expect(comp).toBeTruthy();
  expect(errors).toEqual([]);
});

test('FK-48: ◀ ▶ on the Slate strip move it one window earlier / later; a click on this match centres it', async ({ page }) => {
  const errors = await open(page, '?view=slate');
  const card = page.locator('[data-testid="slate-card"][data-match-id="401879233"]'); // Man City v Fulham, Sat Nov 21
  const strip = card.locator('.fk-card-row').first().getByTestId('strip');
  const windows = () => strip.getByTestId('strip-slot').evaluateAll((els) => els.map((e) => e.getAttribute('data-window')));
  const before = await windows();
  expect(before).toHaveLength(5);
  expect(before[2]).toBe('2026-11-20'); // this match's weekend window in the middle
  await strip.hover();
  await expect(strip.getByTestId('strip-next')).toBeVisible();
  await strip.getByTestId('strip-next').click();
  const later = await windows();
  expect(later.slice(0, 4)).toEqual(before.slice(1)); // one window later
  expect(later).toHaveLength(5);
  await expect(strip.locator('[data-testid="strip-slot"]').nth(1).locator('[data-now]')).toHaveCount(1);
  await strip.getByTestId('strip-prev').click();
  expect(await windows()).toEqual(before);
  await strip.getByTestId('strip-prev').click();
  await strip.getByTestId('strip-prev').click();
  await strip.getByTestId('strip-prev').click();
  await expect(strip.locator('[data-now]')).toHaveCount(0); // this match moved out of view
  await strip.getByTestId('strip-next').click();
  // a click on this match brings the strip back to centred (and doesn't open the standings)
  await strip.locator('[data-now]').click();
  expect(await windows()).toEqual(before);
  await expect(strip.getByTestId('form')).toHaveAttribute('data-shift', '0');
  await expect(page.getByTestId('standings-popup')).toHaveCount(0);
  // the other team's strip didn't move; the card keeps calendarkit's size
  expect(await card.locator('.fk-card-row').nth(1).getByTestId('strip-slot').nth(2).getAttribute('data-window')).toBe('2026-11-20');
  const box = (await card.boundingBox())!;
  expect([box.width, box.height]).toEqual([561, 78]);
  expect(errors).toEqual([]);
});

test('FK-48 fix: the strip arrows show only on hover (moved or not) and sit beside the window slots, never over them', async ({ page }) => {
  const errors = await open(page, '?view=slate');
  const cards = page.getByTestId('slate-card');
  const strip = cards.first().getByTestId('strip').first();
  const opacity = () => strip.evaluate((s) => ['strip-prev', 'strip-next'].map((id) => getComputedStyle(s.querySelector(`[data-testid="${id}"]`)!).opacity));
  await page.mouse.move(2, 2);
  await expect.poll(opacity).toEqual(['0', '0']);
  await strip.hover();
  await expect.poll(opacity).toEqual(['1', '1']);
  // on every strip: neither arrow's box meets a slot's box
  const overlaps = await page.locator('[data-testid="slate-card"] [data-testid="strip"]').evaluateAll((els) => els.flatMap((s) => {
    const slots = [...s.querySelectorAll('[data-testid="strip-slot"]')].map((x) => x.getBoundingClientRect());
    return [...s.querySelectorAll('.fk-fgstrip-arrow')].map((a) => a.getBoundingClientRect()).filter((a) => slots.some((b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom)).length;
  }));
  expect(overlaps.length).toBeGreaterThan(5);
  expect(overlaps.every((n) => n === 0)).toBe(true);
  // moved: still hidden once the pointer leaves
  await strip.getByTestId('strip-next').click();
  await expect(strip.getByTestId('form')).toHaveAttribute('data-shift', '1');
  await page.mouse.move(2, 2);
  await expect.poll(opacity).toEqual(['0', '0']);
  // the cards keep calendarkit's size, nothing spills out of a row
  const sizes = await cards.evaluateAll((els) => els.map((e) => { const r = e.getBoundingClientRect(); return `${r.width}x${r.height}`; }));
  expect(new Set(sizes)).toEqual(new Set(['561x78']));
  expect(await page.locator('.fk-card-row').evaluateAll((els) => els.filter((r) => r.scrollWidth > r.clientWidth).length)).toBe(0);
  expect(errors).toEqual([]);
});

test('Slate strip: a window opens the club\'s Team Calendar with that window highlighted, in a colour unlike today\'s; the arrows line up with the slots', async ({ page }) => {
  const errors = await open(page, '?view=slate');
  const strip = page.locator('[data-testid="slate-card"][data-match-id="401879233"] .fk-card-row').first().getByTestId('strip'); // Man City
  // the arrows (and their triangles): a square's height, centred on the slots' line
  await strip.hover();
  const geo = await strip.evaluate((s) => {
    const mid = (r: DOMRect) => r.top + r.height / 2;
    const sq = s.querySelector('.fk-fg-sq')!.getBoundingClientRect();
    return ['strip-prev', 'strip-next'].map((id) => { const b = s.querySelector(`[data-testid="${id}"]`)!; const a = b.getBoundingClientRect(); const tri = b.querySelector('svg')!.getBoundingClientRect(); return [Math.round(a.height), Math.round(mid(a) - mid(sq)) + Math.round(mid(tri) - mid(sq))]; }).concat([[Math.round(sq.height), 0]]);
  });
  expect(geo).toEqual([[21, 0], [21, 0], [21, 0]]);
  // the first slot: the weekend of Nov 13–16
  const slot = strip.getByTestId('strip-slot').first();
  await expect(slot).toHaveAttribute('data-window', '2026-11-13');
  await slot.click();
  await expect(page).toHaveURL(/view=cal&team=382&span=month/);
  const cal = page.getByTestId('team-calendar');
  const hl = await cal.locator('[data-hl]').evaluateAll((els) => els.map((e) => e.getAttribute('data-day')));
  expect(hl).toEqual(['2026-11-13', '2026-11-14', '2026-11-15', '2026-11-16']);
  await expect(page.getByTestId('standings-popup')).toHaveCount(0);
  const colour = (sel: string) => cal.locator(sel).first().evaluate((e) => getComputedStyle(e).boxShadow);
  const [picked, today] = [await colour('[data-hl]'), await colour('.fk-today')];
  expect(picked).toContain('232, 121, 249');
  expect(today).toContain('78, 161, 255');
  expect(today).not.toContain('232, 121, 249');
  // a team-name click opens the calendar without a highlight
  await page.goto('/football/?view=slate');
  await page.locator('[data-testid="slate-card"][data-match-id="401879233"] .fk-card-team').first().click();
  await expect(page.getByTestId('team-calendar')).toBeVisible();
  await expect(page.getByTestId('team-calendar').locator('[data-hl]')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('FK-51: no copy button inside Slate cards; the day copy and the marquee copy still work', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  const errors = await open(page, '?view=slate');
  const cards = page.getByTestId('slate-card');
  await expect(cards.first()).toBeVisible();
  await expect(cards.getByTestId('copy')).toHaveCount(0);
  await expect(page.locator('.fk-card button[aria-label^="Copy"]')).toHaveCount(0);
  // the day copy
  await page.getByTestId('top-bar').getByTestId('copy').click();
  await expect(page.getByTestId('top-bar').getByTestId('copy')).toHaveText('✓');
  // the marquee copy: drag over two cards from the empty space below the grid's left side
  const a = (await cards.nth(0).boundingBox())!, b = (await cards.nth(2).boundingBox())!;
  await page.mouse.move(a.x + 60, a.y + a.height - 4);
  await page.mouse.down();
  await page.mouse.move(b.x + 80, b.y + 20, { steps: 8 });
  await page.mouse.up();
  const bar = page.getByTestId('selection-bar');
  await expect(bar).toContainText('selected');
  await bar.getByTestId('copy').click();
  await expect(bar.getByTestId('copy')).toHaveText('✓');
  expect(errors).toEqual([]);
});

test('FK-52: Slate scores sit in one column on every card of the day, on screen and in the copy', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  // Sun Nov 8, a played day: long and short names, places and scores on every card
  const errors = await open(page, '?view=slate');
  await page.getByTestId('slate-card').first().waitFor();
  await page.getByLabel('Pick a date').fill('2026-11-08');
  await expect(page.getByTestId('date-text')).toContainText('Nov 8');
  const cards = page.getByTestId('slate-card');
  await expect(cards.first()).toBeVisible();
  // each score's x from its card's left edge, and the names' lengths (some long, some short)
  const offsets = () => cards.evaluateAll((els) => els.flatMap((c) => [...c.querySelectorAll('[data-testid="card-score"]')].map((s) => s.getBoundingClientRect().left - c.getBoundingClientRect().left)));
  const onScreen = await offsets();
  expect(onScreen.length).toBeGreaterThan(6);
  expect(Math.max(...onScreen) - Math.min(...onScreen)).toBeLessThanOrEqual(1);
  const names = await page.locator('.fk-card-team .fk-team-name').evaluateAll((els) => els.map((e) => e.textContent!.length));
  expect(Math.max(...names) - Math.min(...names)).toBeGreaterThan(4);
  // a long name is cut with "…" and its full name is on hover
  const cut = await page.locator('.fk-card-team .fk-team-name').evaluateAll((els) => els.filter((e) => e.scrollWidth > e.clientWidth).length);
  expect(await page.locator('.fk-card-team').first().getAttribute('title')).toBeTruthy();
  expect(cut).toBeGreaterThanOrEqual(0);
  // in the copy: the same check while the capture is drawn (the clone takes these computed boxes)
  await page.evaluate(() => {
    const w = window as unknown as { __fkCapture?: number[] };
    new MutationObserver(() => {
      const root = document.querySelector('.fk-capturing');
      if (!root || w.__fkCapture) return;
      w.__fkCapture = [...root.querySelectorAll('[data-testid="slate-card"]')].flatMap((c) => [...c.querySelectorAll('[data-testid="card-score"]')].map((s) => s.getBoundingClientRect().left - c.getBoundingClientRect().left));
    }).observe(document.body, { attributes: true, subtree: true, attributeFilter: ['class'] });
  });
  await page.getByTestId('top-bar').getByTestId('copy').click();
  await expect(page.getByTestId('top-bar').getByTestId('copy')).toHaveText('✓');
  const inCopy = await page.evaluate(() => (window as unknown as { __fkCapture?: number[] }).__fkCapture!);
  expect(inCopy.length).toBe(onScreen.length);
  expect(Math.max(...inCopy) - Math.min(...inCopy)).toBeLessThanOrEqual(1);
  expect(errors).toEqual([]);
});

test('fix: a copy with a team that has no logo file still copies, the crest left blank', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  const errors = await open(page, '?view=slate');
  await page.getByTestId('slate-card').first().waitFor();
  // Sun Nov 8: a strip shows CD Artistico Navalcarnero (19288), a Copa del Rey opponent ESPN has no logo for
  await page.getByLabel('Pick a date').fill('2026-11-08');
  await expect(page.getByTestId('date-text')).toContainText('Nov 8');
  // (the site answers a 404; vite preview answers index.html: neither is a picture, and either failed the whole copy)
  expect(await page.request.get('/football/logos/19288.png').then((r) => r.headers()['content-type'])).not.toMatch(/^image/);
  await page.getByTestId('top-bar').getByTestId('copy').click();
  await expect(page.getByTestId('top-bar').getByTestId('copy')).toHaveText('✓');
  expect(errors).toEqual([]);
});

test('FK-53: bigger last-games squares (21 px, crest scaled), lined up across cards, nothing overflows', async ({ page }) => {
  const errors = await open(page, '?view=slate');
  const cards = page.getByTestId('slate-card');
  await expect(cards.first()).toBeVisible();
  const rows = await page.locator('[data-testid="slate-card"] .fk-card-row').evaluateAll((els) => els.map((r) => {
    const sq = r.querySelector('[data-testid="form-game"]:not(.fk-fg-half)');
    const img = r.querySelector('[data-testid="form-game"]:not(.fk-fg-half) img');
    const left = r.getBoundingClientRect().left;
    return { w: sq?.getBoundingClientRect().width, h: sq?.getBoundingClientRect().height, img: img?.getBoundingClientRect().width, slots: [...r.querySelectorAll('[data-testid="strip-slot"]')].map((s) => Math.round(s.getBoundingClientRect().left - left)), spill: r.scrollWidth > r.clientWidth };
  }));
  const withStrip = rows.filter((r) => r.slots.length);
  expect(withStrip.length).toBeGreaterThan(5);
  for (const r of withStrip) {
    expect(r.w).toBeGreaterThanOrEqual(21); // FK-47's 17 px + 20–25 %
    expect(r.h).toBeGreaterThanOrEqual(21);
    if (r.img) expect(r.img).toBeGreaterThanOrEqual(15); // the crest grew with it (was 12)
    expect(r.slots).toEqual(withStrip[0]!.slots);
  }
  expect(rows.some((r) => r.spill)).toBe(false);
  // the card widened by the squares' growth (509 + 5 × 4) and FK-50's streak track (+32)
  const box = (await cards.first().boundingBox())!;
  expect([box.width, box.height]).toEqual([561, 78]);
  expect(errors).toEqual([]);
});

test('FK-49: month arrows beside the calendar: a month each, as the bar\'s arrows; disabled at the ends; never in a copy', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  const errors = await open(page, '?view=cal&team=382&span=month'); // Man City, Nov 2026
  const prev = page.getByTestId('side-prev'), next = page.getByTestId('side-next');
  await expect(prev).toHaveAttribute('title', 'Back a month');
  await expect(next).toHaveAttribute('title', 'Forward a month');
  // in the page margin beside the grid, covering no day cell
  const grid = (await page.locator('.fk-cal-grid').boundingBox())!;
  const [p, n] = [(await prev.boundingBox())!, (await next.boundingBox())!];
  expect(p.x + p.width).toBeLessThanOrEqual(grid.x + 0.5);
  expect(n.x).toBeGreaterThanOrEqual(grid.x + grid.width - 0.5);
  expect(p.width).toBeGreaterThanOrEqual(14);
  const shown = () => page.getByTestId('date-text').textContent();
  const start = await shown();
  await next.click();
  const viaSide = await shown();
  expect(viaSide).not.toBe(start);
  await prev.click();
  expect(await shown()).toBe(start);
  // the bar's › goes to the same month
  await page.getByTestId('top-bar').getByLabel('Next').click();
  expect(await shown()).toBe(viaSide);
  // back to the data's first month (Jan 2026): ‹ disabled there
  for (let i = 0; i < 11 && await prev.isEnabled(); i++) await prev.click();
  await expect(prev).toBeDisabled();
  await expect(page.locator('.fk-cal-cell[data-day="2026-01-15"]')).toHaveCount(1);
  await expect(next).toBeEnabled();
  // never in a copy
  await expect(prev).toHaveAttribute('data-capture-exclude', 'true');
  await expect(next).toHaveAttribute('data-capture-exclude', 'true');
  await page.getByTestId('top-bar').getByTestId('copy').click();
  await expect(page.getByTestId('top-bar').getByTestId('copy')).toHaveText('✓');
  // the League view's Calendar has them too
  await page.goto('/football/?view=league&comp=eng.1&mode=cal');
  const week = () => page.getByTestId('league-week').getAttribute('data-week');
  await expect(page.getByTestId('league-week')).toHaveAttribute('data-week', '2026-11-16');
  await page.getByTestId('side-next').click();
  expect(await week()).toBe('2026-12-21');
  await page.getByTestId('side-prev').click();
  expect(await week()).toBe('2026-11-16');
  expect(errors).toEqual([]);
});

test('FK-50: result streak chip (W / D / L) and its popup on a Slate card and a List row; the window tag says "in a row"', async ({ page }) => {
  const errors = await open(page, '?view=slate');
  const card = page.locator('[data-testid="slate-card"][data-match-id="401879233"]'); // Man City v Fulham, to come
  const chip = card.locator('.fk-card-row').first().getByTestId('streak');
  await expect(chip).toHaveText(/^[WDL]\d+$/);
  // right after the name cell, as calendarkit's Slate
  const [cell, c] = [(await card.locator('.fk-card-teamcell').first().boundingBox())!, (await chip.boundingBox())!];
  expect(c.x).toBeGreaterThanOrEqual(cell.x + cell.width - 1);
  const text = (await chip.textContent())!;
  await chip.hover();
  const pop = page.getByTestId('streak-popup');
  await expect(pop).toBeVisible();
  await expect(pop.getByTestId('streak-row')).toHaveCount(Number(text.slice(1)));
  const first = pop.getByTestId('streak-row').first();
  expect(await first.getAttribute('href')).toMatch(/^https:\/\/www\.google\.com\/search\?q=/);
  expect(await first.locator('.fk-streak-res').textContent()).toMatch(/^[WDL] \d+–\d+$/);
  expect((await first.locator('.fk-streak-res').textContent())![0]).toBe(text[0]);
  // it stays while the pointer is in it, closes once it leaves
  await first.hover();
  await expect(pop).toBeVisible();
  await page.mouse.move(2, 400);
  await expect(pop).toHaveCount(0);
  // a Day List row: each followed team's chip outside its form squares
  await page.goto('/football/');
  const row = page.getByTestId('match-row').first();
  const chips = row.getByTestId('streak');
  await expect(chips.first()).toHaveText(/^[WDL]\d+$/);
  await chips.first().hover();
  await expect(page.getByTestId('streak-popup')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('streak-popup')).toHaveCount(0);
  // a played day's row shows the streak through that match
  await page.getByLabel('Pick a date').fill('2026-11-08');
  await expect(page.getByTestId('match-row').first().getByTestId('streak').first()).toHaveText(/^[WDL]\d+$/);
  // a club's List rows have it too
  await page.goto('/football/?view=list&team=382');
  await expect(page.getByTestId('team-row').first().getByTestId('streak')).toHaveText(/^[WDL]\d+$/);
  // the window tag's menu entry no longer says "Streak"
  await page.goto('/football/');
  await expect(page.getByText('Streak (5th)')).toHaveCount(0);
  expect(errors).toEqual([]);
});

for (const [w, h] of [[1920, 1080], [1366, 768]] as const) {
  test(`FK-54: the cup bracket fills the first screen at ${w}×${h}, no inner scroll; the groups start just below`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h });
    const errors = await open(page, '?view=cups&cup=conmebol.libertadores');
    const bracket = page.getByTestId('cup-bracket');
    await expect(bracket).toHaveAttribute('data-zoom', /\d/);
    const geo = await page.evaluate(() => {
      const b = document.querySelector('[data-testid="cup-bracket"]')!;
      const r = b.getBoundingClientRect();
      const groups = document.querySelector('.fk-cup-groups-wrap')!.getBoundingClientRect();
      const tie = b.querySelector('[data-testid="cup-tie"]')!.getBoundingClientRect();
      const inner = [b, ...b.querySelectorAll('*')].some((e) => e.scrollHeight > e.clientHeight + 1 && /(auto|scroll)/.test(getComputedStyle(e).overflowY));
      return { bottom: r.bottom, top: r.top, groups: groups.top, tieW: tie.width, inner, zoom: Number((b as HTMLElement).dataset.zoom), vh: innerHeight, page: r.right, vw: innerWidth };
    });
    expect(geo.bottom).toBeLessThanOrEqual(geo.vh); // whole in the first screen
    expect(geo.inner).toBe(false);
    expect(geo.page).toBeLessThanOrEqual(geo.vw); // the bracket's right edge on screen too
    // as big as it gets: within the last few % of the window's height
    expect(geo.bottom).toBeGreaterThan(geo.vh * 0.9);
    // the groups start right below it (their heading just under the fold or on screen)
    expect(geo.groups).toBeGreaterThanOrEqual(geo.bottom - 1);
    expect(geo.groups - geo.bottom).toBeLessThan(40);
    expect(errors).toEqual([]);
  });
}

test('FK-55: the cup page title is the competition switcher (the bar picker\'s look, the heading\'s size)', async ({ page }) => {
  const errors = await open(page, '?view=cups&cup=conmebol.libertadores');
  const title = page.getByTestId('cups-page').getByTestId('cup-title-picker');
  await expect(title).toHaveValue('conmebol.libertadores');
  // the heading's size (18 px, as the plain title was), in the bar picker's outlined box
  expect(await title.evaluate((e) => getComputedStyle(e).fontSize)).toBe('18px');
  const box = await title.evaluate((e) => getComputedStyle(e.parentElement!).borderTopStyle);
  expect(box).toBe('solid');
  // beside the final's line, as before
  await expect(page.getByTestId('cups-page').locator('.fk-ucl-head')).toContainText('Final Nov 28');
  await title.selectOption('conmebol.sudamericana');
  await expect(page).toHaveURL(/view=cups&cup=conmebol\.sudamericana/);
  await expect(page.getByTestId('cups-page')).toHaveAttribute('data-cup', 'conmebol.sudamericana');
  await expect(page.getByTestId('cup-picker')).toHaveValue('conmebol.sudamericana'); // the bar follows
  // a domestic cup, then the Champions League (its page has the switcher too)
  await page.getByTestId('cup-title-picker').selectOption('eng.fa');
  await expect(page).toHaveURL(/cup=eng\.fa/);
  await page.getByTestId('cup-title-picker').selectOption('uefa.champions');
  await expect(page.getByTestId('ucl-page')).toBeVisible();
  await expect(page.getByTestId('cup-title-picker')).toHaveValue('uefa.champions');
  await page.getByTestId('cup-title-picker').selectOption('conmebol.libertadores');
  await expect(page.getByTestId('cups-page')).toHaveAttribute('data-cup', 'conmebol.libertadores');
  expect(errors).toEqual([]);
});

test('FK-56: UCL simulator — start the knockouts from the current table, a full-size bracket beside it, pick play-off winners into the R16, swap a section\'s draw', async ({ page }) => {
  const errors = await open(page, '?view=whatif');
  await page.evaluate(() => localStorage.removeItem('fk:whatif:v1'));
  await page.reload();
  await page.getByTestId('wi-ko-start').click();
  await expect(page.getByTestId('ko-sim')).toBeVisible();
  // a full bracket like the cups pages: Play-offs, Round of 16, Quarter-finals, Semi-finals, Final, each beside the
  // ties it feeds; the table beside it, both on the first screen
  const cols = page.getByTestId('ko-col');
  await expect(cols).toHaveCount(5);
  expect(await cols.evaluateAll((cs) => cs.map((c) => c.querySelectorAll('[data-testid="ko-tie"]').length))).toEqual([8, 8, 4, 2, 1]);
  const lefts = await cols.evaluateAll((cs) => cs.map((c) => Math.round(c.getBoundingClientRect().left)));
  expect([...lefts].sort((a, b) => a - b)).toEqual(lefts); // left to right
  const box = await page.evaluate(() => {
    const b = document.querySelector('[data-testid="ko-bracket"]')!.getBoundingClientRect();
    const t = document.querySelector('[data-testid="wi-split"]')!.getBoundingClientRect();
    return { bracketBottom: b.bottom, tableRight: t.right, bracketLeft: b.left, vh: innerHeight };
  });
  expect(box.bracketBottom).toBeLessThanOrEqual(box.vh);
  expect(box.tableRight).toBeLessThanOrEqual(box.bracketLeft);
  await expect(page.getByTestId('wi-row').first()).toBeVisible();
  // a play-off tie sits level with the R16 tie it fills
  const mid = (k: string) => page.locator(`[data-key="${k}"]`).evaluate((e) => { const r = e.getBoundingClientRect(); return r.top + r.height / 2; });
  expect(Math.abs((await mid('po-D2')) - (await mid('r16-D1')))).toBeLessThan(30);
  // the real table's order: section D is 9th / 10th v 24th / 23rd, then 7th / 8th
  const real = await page.getByTestId('wi-row').evaluateAll((rows) => rows.map((r) => r.getAttribute('data-team')));
  const sides = (k: string) => page.locator(`[data-key="${k}"]`).getByTestId('ko-pick').evaluateAll((b) => b.map((x) => x.getAttribute('data-team')));
  expect(await sides('po-D1')).toEqual([real[23], real[8]]); // 24th v 9th (the seeded side second)
  expect(await sides('po-D2')).toEqual([real[22], real[9]]); // 23rd v 10th
  expect(await sides('r16-D1')).toEqual([real[6]]); // 7th waits for a play-off winner
  // pick the winners: 24th beats 9th → meets 8th; 10th beats 23rd → meets 7th
  await page.locator('[data-key="po-D1"]').getByTestId('ko-pick').first().click();
  await page.locator('[data-key="po-D2"]').getByTestId('ko-pick').nth(1).click();
  await expect(page.locator('[data-key="po-D1"]')).toHaveAttribute('data-winner', real[23]!);
  expect(await sides('r16-D1')).toEqual([real[9], real[6]]);
  expect(await sides('r16-D2')).toEqual([real[23], real[7]]);
  // a click on the picked side again clears it (its R16 slot waits again)
  await page.locator('[data-key="po-D1"]').getByTestId('ko-pick').first().click();
  expect(await sides('r16-D2')).toEqual([real[7]]);
  await page.locator('[data-key="po-D1"]').getByTestId('ko-pick').first().click();
  const d = page.locator('[data-testid="ko-section"][data-letter="D"]');
  // swap the R16 draw: the winners trade seeds
  await d.getByTestId('ko-swap-r16').click();
  expect(await sides('r16-D1')).toEqual([real[23], real[6]]);
  expect(await sides('r16-D2')).toEqual([real[9], real[7]]);
  // swap the pairing: 9 v 23 and 10 v 24 — the picks no longer in their ties drop
  await d.getByTestId('ko-swap-pairing').click();
  expect(await sides('po-D1')).toEqual([real[22], real[8]]);
  expect(await sides('po-D2')).toEqual([real[23], real[9]]);
  // the half swap moves the section's R16 ties between the halves
  const half = (k: string) => page.locator(`[data-key="${k}"]`).getByTestId('ko-half').getAttribute('data-half');
  expect([await half('r16-D1'), await half('r16-D2')]).toEqual(['top', 'bottom']);
  await d.getByTestId('ko-swap-half').click();
  expect([await half('r16-D1'), await half('r16-D2')]).toEqual(['bottom', 'top']);
  // undo steps back through the knockout changes; the state survives a reload
  await page.keyboard.press('Control+z');
  expect([await half('r16-D1'), await half('r16-D2')]).toEqual(['top', 'bottom']);
  await page.reload();
  await expect(page.getByTestId('ko-sim')).toBeVisible();
  expect(await page.locator('[data-testid="ko-section"][data-letter="D"]').getByTestId('ko-swap-pairing').getAttribute('aria-pressed')).toBe('true');
  // back to the league phase: the matches and the knockout places
  await page.getByTestId('wi-ko-stop').click();
  await expect(page.getByTestId('ko-sim')).toHaveCount(0);
  await expect(page.getByTestId('wi-block').first()).toBeVisible();
  await expect(page.getByTestId('wi-pending')).toBeVisible();
  expect(errors).toEqual([]);
});

test('FK-57: position arrows show each team\'s move since the round before and follow ◀ ▶', async ({ page }) => {
  const errors = await open(page, '?view=table&league=eng.1');
  const label = page.getByTestId('lt-round');
  await expect(label).toHaveText('after 10 rounds');
  const read = () => page.getByTestId('league-row').evaluateAll((trs) => Object.fromEntries(trs.map((tr) => {
    const mv = tr.querySelector('[data-testid="lt-move"]');
    return [tr.getAttribute('data-team')!, { rank: parseInt(tr.querySelector('td')!.textContent!, 10), delta: mv ? Number(mv.getAttribute('data-delta')) : null, text: mv?.textContent ?? '', tip: mv?.getAttribute('title') ?? '' }];
  })));
  const atTen = await read();
  expect(Object.values(atTen).every((r) => r.delta !== null)).toBe(true);
  // two rounds back: the arrows are round 8's movement against round 7
  await page.getByTestId('lt-prev').click();
  await page.getByTestId('lt-prev').click();
  await expect(label).toHaveText('after 8 rounds');
  const at8 = await read();
  expect(at8).not.toEqual(atTen);
  await page.getByTestId('lt-prev').click();
  await expect(label).toHaveText('after 7 rounds');
  const at7 = await read();
  for (const [team, r] of Object.entries(at8)) {
    expect(r.delta, team).toBe(at7[team]!.rank - r.rank);
    expect(r.text, team).toBe(r.delta! > 0 ? `▲${r.delta}` : r.delta! < 0 ? `▼${-r.delta!}` : '–');
    expect(r.tip, team).toMatch(new RegExp(`^Was ${at7[team]!.rank}(st|nd|rd|th) after round 7$`));
  }
  // round 1: no arrows
  for (let i = 0; i < 6; i++) await page.keyboard.press('ArrowLeft');
  await expect(label).toHaveText('after 1 round');
  await expect(page.getByTestId('lt-move')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('FK-58: Trailing moves from the tabs into the Extra tools menu; old links still open it', async ({ page }) => {
  const errors = await open(page);
  await expect(page.getByTestId('views').getByRole('tab')).toHaveText(['List', 'Slate', 'Tables', 'Cups', 'League']);
  const btn = page.getByTestId('extra-tools');
  await expect(btn).toHaveAttribute('title', 'Extra tools');
  await expect(btn).toHaveAttribute('aria-pressed', 'false');
  await btn.click();
  await expect(page.getByTestId('extra-tools-menu').getByRole('menuitem')).toHaveText(['Trailing']);
  await page.getByTestId('extra-trailing').click();
  await expect(page.getByTestId('extra-tools-menu')).toHaveCount(0);
  await expect(page.getByTestId('trailing-page')).toBeVisible();
  await expect(page).toHaveTitle('Premier League goals while trailing — footykit');
  await expect(page.getByTestId('comp-picker')).toBeVisible();
  await expect(btn).toHaveAttribute('aria-pressed', 'true');
  // Escape and an outside click close the menu
  await btn.click(); await page.keyboard.press('Escape'); await expect(page.getByTestId('extra-tools-menu')).toHaveCount(0);
  await btn.click(); await page.getByTestId('trailing-page').click({ position: { x: 5, y: 5 } }); await expect(page.getByTestId('extra-tools-menu')).toHaveCount(0);
  // an old Trailing link
  await page.goto('/football/?view=trailing&comp=uefa.champions');
  await expect(page.getByTestId('trailing-page')).toHaveAttribute('data-comp', 'uefa.champions');
  await expect(page).toHaveTitle('Champions League goals while trailing — footykit');
  await expect(btn).toHaveAttribute('aria-pressed', 'true');
  expect(errors).toEqual([]);
});

test('FK-59: World Cup history: pick 2014 from the Cups picker, group tables, a match hover, a squad link, a team history', async ({ page }) => {
  const errors = await open(page);
  await page.getByTestId('views').getByRole('tab', { name: 'Cups' }).click();
  await page.getByTestId('cup-picker').selectOption('fifa.world');
  await expect(page.getByTestId('wc-page')).toHaveAttribute('data-year', '2026');
  await expect(page).toHaveTitle('World Cup 2026 — footykit');
  // 2026: 12 groups, the thirds table with 8 through, a round of 32
  await expect(page.getByTestId('wc-group')).toHaveCount(12);
  await expect(page.getByTestId('wc-third')).toHaveCount(12);
  await expect(page.getByTestId('wc-bracket').locator('.fk-ko-col-title').first()).toHaveText('Round of 32');
  // the edition picker: newest first
  const years = await page.getByTestId('wc-edition').locator('option').allTextContents();
  expect(years[0]).toBe('2026');
  expect(years[years.length - 1]).toBe('1930');
  await page.getByTestId('wc-edition').selectOption('2014');
  await expect(page).toHaveTitle('World Cup 2014 — footykit');
  await expect(page).toHaveURL(/view=wc&year=2014/);
  const groupA = page.locator('[data-testid="wc-group"][data-group="Group A"]');
  await expect(groupA.getByTestId('wc-row')).toHaveCount(4);
  await expect(groupA.getByTestId('wc-row').first().getByTestId('wc-team')).toHaveText('Brazil');
  await expect(groupA.getByTestId('wc-row').first().locator('.fk-pts')).toHaveText('7');
  await expect(groupA.locator('[data-through]')).toHaveCount(2);
  // a match square: hover shows date, venue, 90' score, scorers; it links to a Google search
  const sq = groupA.getByTestId('wc-row').first().getByTestId('wc-square').first();
  await sq.hover();
  const tip = (await sq.getAttribute('title'))!;
  expect(tip).toContain('Brazil 3–1 Croatia');
  expect(tip).toContain('12 Jun 2014');
  expect(tip).toContain('São Paulo');
  expect(tip).toContain('90 minutes: 3–1');
  expect(tip).toContain('Neymar');
  expect(await sq.getAttribute('href')).toBe('https://www.google.com/search?q=Brazil%20vs%20Croatia%20Jun%2012%202014');
  // the final: 1-0 after extra time
  const final = page.getByTestId('wc-bracket').locator('.fk-ko-col').last().getByTestId('wc-match').first();
  await expect(final).toContainText('0–0 (a.e.t. 1–0)');
  expect(await final.getAttribute('title')).toContain('Mario Götze');
  // a squad link, opened
  const squad = groupA.getByTestId('wc-row').first().getByTestId('wc-squad');
  expect(await squad.getAttribute('href')).toBe('https://en.wikipedia.org/wiki/2014_FIFA_World_Cup_squads#Brazil');
  await page.route('https://en.wikipedia.org/**', (r) => r.fulfill({ status: 200, contentType: 'text/html', body: '<title>squads</title>' }));
  const [popup] = await Promise.all([page.waitForEvent('popup'), squad.click()]);
  expect(popup.url()).toBe('https://en.wikipedia.org/wiki/2014_FIFA_World_Cup_squads#Brazil');
  await popup.close();
  // a team name: its World Cup history; a year in it opens that edition
  await groupA.getByTestId('wc-row').first().getByTestId('wc-team').click();
  const hist = page.getByTestId('wc-history');
  await expect(hist).toContainText('Brazil at the World Cup');
  await expect(hist.locator('[data-year="2002"]')).toContainText('Winner');
  await expect(hist.locator('[data-year="1950"]')).toContainText('Runner-up');
  await hist.locator('[data-year="1970"]').click();
  await expect(page.getByTestId('wc-page')).toHaveAttribute('data-year', '1970');
  await expect(page).toHaveURL(/year=1970&team=BRA/);
  await page.getByTestId('wc-history-close').click();
  await expect(hist).toHaveCount(0);
  // a second group stage (1982) and a final round (1950)
  await page.getByTestId('wc-edition').selectOption('1982');
  await expect(page.locator('[data-testid="wc-stage"][data-stage="Second group stage"]').getByTestId('wc-group')).toHaveCount(4);
  await page.getByTestId('wc-edition').selectOption('1950');
  await expect(page.locator('[data-testid="wc-stage"][data-stage="Final round"]')).toBeVisible();
  await expect(page.getByTestId('wc-bracket')).toHaveCount(0);
  // an old-style address works too
  await page.goto('/football/?view=cups&cup=fifa.world');
  await expect(page.getByTestId('wc-page')).toBeVisible();
  expect(errors).toEqual([]);
});

test('FK-60: World Cup simulator — change a result, the table and the bracket update together, reset', async ({ page }) => {
  const errors = await open(page, '?view=wc&year=2022');
  await page.getByTestId('wc-sim-toggle').click();
  await expect(page).toHaveURL(/year=2022&sim=1/);
  await expect(page).toHaveTitle('World Cup 2022 simulator — footykit');
  const sim = page.getByTestId('wc-sim');
  await expect(page.getByTestId('wc-sim-champion')).toContainText('Champion: Argentina');
  await expect(page.getByTestId('wc-sim-changed')).toHaveText('The real results');
  // both visible at once: the groups and the bracket side by side
  const groupsBox = (await sim.locator('.fk-wc-sim-groups').boundingBox())!;
  const bracketBox = (await page.getByTestId('wc-sim-bracket').boundingBox())!;
  expect(bracketBox.x).toBeGreaterThan(groupsBox.x + groupsBox.width - 1);
  const groupC = page.locator('[data-testid="wc-sim-group"][data-group="Group C"]');
  const tableC = async () => groupC.getByTestId('wc-sim-row').evaluateAll((rs) => rs.map((r) => r.children[1]!.textContent));
  expect(await tableC()).toEqual(['Argentina', 'Poland', 'Mexico', 'Saudi Arabia']);
  // Poland beat Argentina
  const match = groupC.getByTestId('wc-sim-match').filter({ hasText: 'Poland' }).filter({ hasText: 'Argentina' });
  const polandHome = (await match.locator('.fk-wc-sim-h').textContent()) === 'Poland';
  await match.getByTestId(polandHome ? 'wc-fast-1' : 'wc-fast-2').click();
  await expect(match).toHaveAttribute('data-changed', 'true');
  expect(await tableC()).toEqual(['Poland', 'Mexico', 'Argentina', 'Saudi Arabia']);
  const r16 = page.locator('[data-testid="wc-sim-tie"][data-stage="Round of 16"]');
  await expect(r16.filter({ hasText: 'Poland' })).toContainText('Australia');
  await expect(r16.filter({ hasText: 'Mexico' })).toContainText('France');
  await expect(r16.filter({ hasText: 'Argentina' })).toHaveCount(0);
  await expect(page.getByTestId('wc-sim-champion')).toContainText('No champion yet');
  // send Poland through: they appear in the quarter-final
  await r16.filter({ hasText: 'Poland' }).locator('[data-testid="wc-sim-side"][data-team="POL"]').click();
  await expect(page.locator('[data-testid="wc-sim-tie"][data-stage="Quarter-finals"]').filter({ hasText: 'Poland' })).toHaveCount(1);
  // detailed mode: a typed score
  await page.getByTestId('wc-sim-mode').getByRole('tab', { name: /Detailed/ }).click();
  const groupA = page.locator('[data-testid="wc-sim-group"][data-group="Group A"]');
  const first = groupA.getByTestId('wc-sim-match').first();
  const inputs = first.getByTestId('wc-sim-num');
  await inputs.nth(0).fill('5');
  await inputs.nth(1).fill('0');
  await expect(first).toHaveAttribute('data-changed', 'true');
  // reset: everything back to what happened
  await page.getByTestId('wc-sim-reset').click();
  expect(await tableC()).toEqual(['Argentina', 'Poland', 'Mexico', 'Saudi Arabia']);
  await expect(page.getByTestId('wc-sim-champion')).toContainText('Champion: Argentina');
  await expect(page.getByTestId('wc-sim-changed')).toHaveText('The real results');
  // clear all: no results
  await page.getByTestId('wc-sim-clear').click();
  await expect(groupC.getByTestId('wc-sim-row').first().locator('td').nth(3)).toHaveText('0');
  await expect(page.getByTestId('wc-sim-champion')).toContainText('No champion yet');
  // an edition the simulator doesn't cover
  await page.getByTestId('wc-edition').selectOption('1994');
  await expect(page.getByTestId('wc-sim-none')).toContainText("doesn't cover 1994");
  await expect(page.getByTestId('wc-sim')).toHaveCount(0);
  // 2026: 48 teams, the thirds table in the simulator
  await page.getByTestId('wc-edition').selectOption('2026');
  await expect(page.getByTestId('wc-sim-third')).toHaveCount(12);
  await expect(page.locator('[data-testid="wc-sim-tie"][data-stage="Round of 32"]')).toHaveCount(16);
  expect(errors).toEqual([]);
});

test('FK-62: the live scores pop-out: one line per match from the live data, LIVE / final / upcoming; stays open off the Slate', async ({ page }) => {
  // a real Picture-in-Picture window needs a user's click in a real browser: the test renders its content in the page
  await page.addInitScript(() => { (window as { __FK_POPOUT_INLINE__?: boolean }).__FK_POPOUT_INLINE__ = true; });
  await page.route(/\/api\/day\?/, (route) => route.fulfill({ json: { date: new URL(route.request().url()).searchParams.get('date'), fetchedAt: '2026-11-21T15:00:00Z', odds: {}, matches: [
    { id: '401879233', t: '2026-11-21T12:30Z', c: 'eng.1', st: 'post', h: '382', a: '370', hs: 2, as: 1 },
    { id: '401878754', t: '2026-11-21T15:00Z', c: 'eng.1', st: 'in', h: '367', a: '373', hs: 1, as: 0, clk: "12'" },
  ] } }));
  const errors = await open(page, '?view=slate');
  await page.getByTestId('popout-button').click();
  const pop = page.getByTestId('popout-inline');
  await expect(pop.getByTestId('popout')).toHaveAttribute('data-mode', 'list');
  const lines = pop.getByTestId('popout-line');
  const slateCards = await page.getByTestId('slate-card').count();
  await expect(lines).toHaveCount(slateCards);
  const first = lines.first();
  await expect(first).toHaveAttribute('data-kind', 'final');
  await expect(first).toContainText('FT');
  await expect(first).toContainText('2–1');
  const live = pop.locator('[data-kind="live"]');
  await expect(live).toHaveCount(1);
  await expect(live).toContainText("LIVE 12'");
  await expect(live).toContainText('1–0');
  await expect(pop.locator('[data-kind="upcoming"]').first()).toContainText('–');
  // the window stays open while you browse elsewhere
  await page.getByTestId('views').getByRole('tab', { name: 'Tables' }).click();
  await expect(pop.getByTestId('popout-line')).toHaveCount(slateCards);
  await page.getByTestId('views').getByRole('tab', { name: 'Slate' }).click();
  await expect(page.getByTestId('popout-button')).toHaveText('Close live scores');
  await page.getByTestId('popout-button').click();
  await expect(pop).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('FK-62: before the first kick-off the pop-out counts down to it, then turns into the scores at kick-off', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-11-21T12:29:50Z') });
  await page.addInitScript(() => {
    (window as { __FK_POPOUT_INLINE__?: boolean }).__FK_POPOUT_INLINE__ = true;
    (window as { __FK_NOW__?: string }).__FK_NOW__ = '2026-11-21T12:29:50Z';
  });
  await page.route(/\/api\/day\?/, (route) => route.fulfill({ json: { date: new URL(route.request().url()).searchParams.get('date'), fetchedAt: '2026-11-21T12:29:00Z', odds: {}, matches: [] } }));
  await stubWeather(page);
  await page.goto('/football/?view=slate');
  await page.getByTestId('popout-button').click();
  const pop = page.getByTestId('popout-inline').getByTestId('popout');
  await expect(pop).toHaveAttribute('data-mode', 'countdown');
  await expect(pop).toContainText('First match · Man City–Fulham');
  await expect(pop.getByTestId('popout-countdown')).toHaveText('0:10');
  await page.clock.runFor(12_000);
  await expect(pop).toHaveAttribute('data-mode', 'list');
  await expect(pop.getByTestId('popout-line').first()).toContainText('Man City');
});
