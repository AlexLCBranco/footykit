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
  await expect(page).toHaveTitle('Day · Nov 21 — footykit');
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
  await expect(page).toHaveTitle('Day · Nov 16 — footykit');
  await expect(page.getByTestId('no-matches')).toBeVisible();
  expect(errors).toEqual([]);
});

test('a team link opens its Team Calendar; ← comes back', async ({ page }) => {
  const errors = await open(page);
  await page.locator('[data-team="ARS"]').first().click();
  // month span, on the current month
  await expect(page).toHaveTitle(/^ARS schedule · Nov 2026/);
  await expect(page.getByTestId('span').getByRole('tab', { name: 'Month' })).toHaveAttribute('aria-selected', 'true');
  // a span picked now sticks…
  await page.getByTestId('span').getByRole('tab', { name: '2 weeks' }).click();
  await expect(page).toHaveTitle(/^ARS schedule · Nov/);
  await page.getByTestId('page-history').getByLabel('Back').click();
  await expect(page).toHaveTitle(/^ARS schedule · Nov 2026/);
  await page.getByTestId('page-history').getByLabel('Back').click();
  await expect(page).toHaveTitle('Day · Nov 21 — footykit');
  expect(errors).toEqual([]);
});

test('team calendar month and team list', async ({ page }) => {
  const errors = await open(page, '?view=cal&team=359&span=month');
  await expect(page).toHaveTitle('ARS schedule · Nov 2026 — footykit');
  await expect(page.getByTestId('cal-match').first()).toBeVisible();
  await page.getByTestId('team-views').getByText('List').click();
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
  // FK-33: calendarkit's popup — "A – B · N meetings", the state on the right, the match that opened it outlined
  await expect(page.getByTestId('series-popup').locator('.fk-series-title')).toHaveText(/^[A-Z0-9-]+ – [A-Z0-9-]+ · 2 meetings$/);
  await expect(page.getByTestId('series-status')).toHaveText(/leads|tied|split|won|played yet|Only meeting/);
  await expect(page.locator('[data-testid="series-square"][data-current]')).toHaveCount(1);
  await expect(page.getByTestId('series-match').first()).toHaveText(/^[A-Z0-9-]+ [@v] [A-Z0-9-]+$/);
  await page.keyboard.press('Escape');
  await page.getByTestId('standings-button').click();
  await expect(page.getByTestId('standings-popup').locator('tbody tr')).toHaveCount(20);
  expect(errors).toEqual([]);
});

test('a reload keeps the page; the version is shown', async ({ page }) => {
  await open(page);
  await page.getByLabel('Next').click();
  await expect(page).toHaveTitle('Day · Nov 22 — footykit');
  await page.reload();
  await expect(page).toHaveTitle('Day · Nov 22 — footykit');
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
    // (Z4R is off until turned on in the Tags menu: FK-15)
    const sunZ4 = page.getByTestId('match-row').filter({ hasText: 'SUN' }).locator('[data-tag="z4"]');
    await expect(sunZ4).toHaveCount(0);
    await page.getByTestId('tag-menu').click();
    await page.getByTestId('tag-on-z4').check();
    await expect(sunZ4).toHaveCount(1);
    await page.evaluate(() => localStorage.removeItem('fk:tags:hidden:v1'));
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

test('Champions League page: 36 rows, 8 squares each, zones and paths', async ({ page }) => {
  const errors = await open(page, '?view=ucl');
  await expect(page).toHaveTitle('Champions League — footykit');
  await expect(page.getByTestId('ucl-matchday')).toHaveText('after matchday 4 of 8');
  const rows = page.getByTestId('ucl-row');
  await expect(rows).toHaveCount(36);
  await expect(rows.first()).toHaveAttribute('data-team', 'PSG');
  await expect(rows.first().getByTestId('ucl-square')).toHaveCount(8);
  await expect(page.getByTestId('ucl-square')).toHaveCount(288);
  await expect(rows.nth(8).getByTestId('ucl-rank')).toHaveAttribute('title', /knockout play-off, seeded/);
  await expect(page.getByTestId('ucl-knockout')).toContainText('if the league phase ended now');
  // reached from the bar too, and back
  await page.getByTestId('views').getByText('List').click();
  await expect(page).toHaveTitle('Day · Nov 21 — footykit');
  await page.getByTestId('views').getByText('Cups').click(); await page.getByTestId('cup-picker').selectOption('uefa.champions');
  await expect(rows).toHaveCount(36);
  expect(errors).toEqual([]);
});

test('UCL what-if: picks move the table, keys move on, bulk fill, undo, filter, kept in fk:whatif:v1', async ({ page }) => {
  const errors = await open(page, '?view=ucl');
  await page.getByTestId('ucl-whatif').click();
  await expect(page).toHaveTitle('UCL simulator — footykit');
  const matches = page.getByTestId('wi-match');
  // one matchday on screen at a time; the counts and fills cover every match left
  await expect(page.getByTestId('wi-nav-title')).toContainText('Matchday');
  await expect(page.getByTestId('wi-count')).toHaveText('0 of 72 picked');
  await expect(page.getByTestId('wi-row')).toHaveCount(36);
  await expect(page.getByTestId('wi-block')).toHaveCount(4);
  // a click, then 2 on the same match (moves on), then X on the next
  await matches.first().click();
  await expect(matches.first()).toHaveAttribute('data-pick', '1-0');
  await page.keyboard.press('2');
  await page.keyboard.press('x');
  await expect(matches.nth(0)).toHaveAttribute('data-pick', '0-1');
  await expect(matches.nth(1)).toHaveAttribute('data-pick', '1-1');
  await expect(page.getByTestId('wi-count')).toHaveText('2 of 72 picked');
  // a typed score
  await matches.nth(2).getByLabel('Type a score').fill('4-0');
  await matches.nth(2).getByLabel('Type a score').press('Enter');
  await expect(matches.nth(2)).toHaveAttribute('data-pick', '4-0');
  // every match a home win: the table is final; undo goes back
  await page.getByTestId('wi-fill-home').click();
  await expect(page.getByTestId('wi-count')).toHaveText('72 of 72 picked');
  await expect(page.getByTestId('whatif-page')).toContainText('Final table');
  await page.keyboard.press('Control+z');
  await expect(page.getByTestId('wi-count')).toHaveText('3 of 72 picked');
  // one team's matches; its path in the bracket
  await page.getByTestId('wi-team').selectOption({ label: 'Arsenal' });
  await expect(matches).toHaveCount(1);
  await expect(page.getByTestId('wi-nav')).toContainText('1 of 4');
  await expect(page.getByTestId('wi-path')).toContainText('other half');
  // kept for the next visit
  expect(Object.keys(JSON.parse((await page.evaluate(() => localStorage.getItem('fk:whatif:v1')))!).current.picks)).toHaveLength(3);
  await page.reload();
  await expect(page.getByTestId('wi-count')).toHaveText('3 of 72 picked');
  expect(errors).toEqual([]);
});

test('UCL what-if scenarios: save, switch in one click, a team\'s place in each, kept, delete', async ({ page }) => {
  const errors = await open(page, '?view=whatif');
  const matches = page.getByTestId('wi-match');
  const scenarios = page.getByTestId('wi-scenario');
  await page.getByTestId('wi-fill-home').click();
  await page.getByTestId('wi-scenario-saveas').click();
  await page.getByTestId('wi-scenario-name').fill('Home wins');
  await page.getByTestId('wi-scenario-name').press('Enter');
  await page.getByTestId('wi-fill-draw').click();
  await expect(scenarios.first()).toContainText('•'); // changed since saved
  await page.getByTestId('wi-scenario-saveas').click();
  await page.getByTestId('wi-scenario-name').fill('Draws');
  await page.getByTestId('wi-scenario-name').press('Enter');
  await expect(scenarios).toHaveText(['Home wins', 'Draws']);
  await expect(matches.first()).toHaveAttribute('data-pick', '1-1');
  await scenarios.first().click();
  await expect(matches.first()).toHaveAttribute('data-pick', '1-0');
  await expect(scenarios.first()).toHaveAttribute('aria-pressed', 'true');
  // with a team picked, its place in each scenario
  await page.getByTestId('wi-team').selectOption({ label: 'Arsenal' });
  await expect(page.getByTestId('wi-scenario-place')).toHaveCount(2);
  await expect(page.getByTestId('wi-scenario-place').first()).toContainText('ARS');
  await page.reload();
  await expect(scenarios).toHaveText(['Home wins', 'Draws']);
  await expect(matches.first()).toHaveAttribute('data-pick', '1-0');
  // delete asks a second click; the picks on screen stay
  await page.getByTestId('wi-scenario-delete').click();
  await page.getByTestId('wi-scenario-delete').click();
  await expect(scenarios).toHaveText(['Draws']);
  await expect(matches.first()).toHaveAttribute('data-pick', '1-0');
  expect(errors).toEqual([]);
});

test('league tables: the picker switches leagues; rows, squares, zones, Brasileirão extras', async ({ page }) => {
  const errors = await open(page, '?view=table&league=eng.1');
  await expect(page).toHaveTitle('Premier League table — footykit');
  await expect(page.getByTestId('league-row')).toHaveCount(20);
  await expect(page.getByTestId('league-row').first().getByTestId('league-square')).toHaveCount(8);
  await page.getByTestId('league-picker').selectOption('bra.1');
  await expect(page.getByTestId('league-page')).toHaveAttribute('data-league', 'bra.1');
  await expect(page.getByTestId('league-row').first()).toHaveAttribute('data-team', 'FLA');
  await expect(page.getByTestId('bra-extras')).toContainText('Copa do Brasil final');
  // 7th (Atlético-MG): a place that depends on the finals, hatched
  await expect(page.getByTestId('league-row').nth(6)).toHaveClass(/fk-lz-maybe/);
  await page.getByTestId('league-picker').selectOption('ger.1');
  await expect(page.getByTestId('league-row')).toHaveCount(18);
  expect(errors).toEqual([]);
});

test('league what-if: from the Tables page, windows, picks move the table, kept apart from the UCL\'s', async ({ page }) => {
  const errors = await open(page, '?view=table&league=eng.1');
  await page.getByTestId('league-whatif').click();
  await expect(page).toHaveTitle('Premier League simulator — footykit');
  await expect(page.getByTestId('whatif-page')).toHaveAttribute('data-league', 'eng.1');
  const matches = page.getByTestId('wi-match');
  await expect(page.getByTestId('wi-count')).toHaveText('0 of 280 picked');
  await expect(page.getByTestId('wi-row')).toHaveCount(20);
  await expect(page.getByTestId('wi-window').first()).toContainText('Weekend');
  await matches.first().click();
  await page.keyboard.press('2');
  await expect(matches.first()).toHaveAttribute('data-pick', '0-1');
  await page.getByTestId('wi-fill-fav').click();
  await expect(page.getByTestId('wi-count')).toHaveText('280 of 280 picked');
  await expect(page.getByTestId('whatif-page')).toContainText('Final table');
  await page.getByTestId('wi-team').selectOption({ label: 'Arsenal' });
  await expect(matches).toHaveCount(1);
  await expect(page.getByTestId('wi-nav')).toContainText(/\d+ of 2\d/);
  // kept under the league, the UCL's top level left empty
  const kept = JSON.parse((await page.evaluate(() => localStorage.getItem('fk:whatif:v1')))!);
  expect(Object.keys(kept.current.picks)).toHaveLength(0);
  expect(Object.keys(kept.comps['eng.1'].current.picks)).toHaveLength(280);
  // the picker switches the simulated league
  await page.getByTestId('league-picker').selectOption('bra.1');
  await expect(page.getByTestId('whatif-page')).toHaveAttribute('data-league', 'bra.1');
  await expect(page.getByTestId('wi-count')).toHaveText('0 of 41 picked');
  expect(errors).toEqual([]);
});

test('Tables keeps its league across a trip to the UCL what-if', async ({ page }) => {
  const errors = await open(page, '?view=table&league=bra.1');
  await page.getByTestId('views').getByText('Cups').click(); await page.getByTestId('cup-picker').selectOption('uefa.champions');
  await page.getByTestId('ucl-whatif').click();
  await expect(page).toHaveTitle('UCL simulator — footykit');
  await page.getByRole('button', { name: '← UCL' }).click();
  await page.getByTestId('views').getByText('Tables').click();
  await expect(page.getByTestId('league-page')).toHaveAttribute('data-league', 'bra.1');
  // and the bar's ← back to the UCL what-if still opens the UCL's, not the league's
  await page.goBack();
  await page.goBack();
  await expect(page).toHaveTitle('UCL simulator — footykit');
  expect(errors).toEqual([]);
});

test('Brasileirão what-if: picking a final settles a hatched place; kept with the league', async ({ page }) => {
  const errors = await open(page, '?view=whatif&league=bra.1');
  await expect(page.getByTestId('wi-final')).toHaveCount(3);
  const seventh = page.getByTestId('wi-row').nth(6);
  await expect(seventh).toHaveAttribute('data-team', 'CAM');
  await expect(seventh).toHaveClass(/fk-lz-maybe/);
  // Atlético-MG win the Sudamericana: group stage, settled
  await page.locator('[data-final="sula"]').getByTestId('wi-final-team').filter({ hasText: 'CAM' }).click();
  await expect(seventh).not.toHaveClass(/fk-lz-maybe/);
  await expect(seventh).toHaveClass(/fk-lz-lib/);
  const kept = JSON.parse((await page.evaluate(() => localStorage.getItem('fk:whatif:v1')))!);
  expect(Object.keys(kept.comps['bra.1'].current.winners)).toEqual(['sula']);
  // undo leaves it open again
  await page.keyboard.press('Control+z');
  await expect(seventh).toHaveClass(/fk-lz-maybe/);
  expect(errors).toEqual([]);
});

test('cups: Libertadores and Sudamericana — bracket, 8 groups, qualifying', async ({ page }) => {
  const errors = await open(page, '?view=cups&cup=conmebol.libertadores');
  await expect(page).toHaveTitle(/^.*Libertadores — footykit$/);
  await expect(page.getByTestId('cup-group')).toHaveCount(8);
  await expect(page.getByTestId('cup-group').first().getByTestId('cup-square')).toHaveCount(4 * 6);
  // round of 16 to the final, then 3 + 8 + 4 qualifying ties
  await expect(page.getByTestId('cup-tie')).toHaveCount(8 + 4 + 2 + 1 + 3 + 8 + 4);
  await page.getByTestId('cup-picker').selectOption('conmebol.sudamericana');
  await expect(page.getByTestId('cups-page')).toHaveAttribute('data-cup', 'conmebol.sudamericana');
  await expect(page.getByTestId('cup-tie')).toHaveCount(8 + 8 + 4 + 2 + 1 + 16);
  expect(errors).toEqual([]);
});

test('domestic cups: Copa do Brasil bracket to the final, earlier rounds folded; Coppa Italia slots', async ({ page }) => {
  const errors = await open(page, '?view=cups&cup=bra.copa_do_brazil');
  await expect(page.getByTestId('cups-page')).toHaveAttribute('data-cup', 'bra.copa_do_brazil');
  // fifth round (16) to the final (1)
  await expect(page.getByTestId('cup-knockout').getByTestId('cup-tie')).toHaveCount(16 + 8 + 4 + 2 + 1);
  await page.getByTestId('cup-picker').selectOption('ita.coppa_italia');
  // quarter-finals, semi-finals and the final: drawn in advance, teams not known yet
  await expect(page.getByTestId('cup-open')).toHaveCount(3);
  expect(errors).toEqual([]);
});

test('goals while trailing: from the bar, per competition, sorted, the missing-goals note', async ({ page }) => {
  const errors = await open(page);
  await page.getByTestId('views').getByRole('tab', { name: 'Trailing' }).click();
  await expect(page).toHaveTitle('Premier League goals while trailing — footykit');
  await expect(page.getByTestId('trailing-row')).toHaveCount(20);
  await page.getByTestId('comp-picker').selectOption('uefa.champions');
  await expect(page.getByTestId('trailing-page')).toHaveAttribute('data-comp', 'uefa.champions');
  await expect(page.getByTestId('trailing-row')).toHaveCount(36);
  const goals = (await page.getByTestId('trailing-row').locator('td:nth-child(4)').allTextContents()).map(Number);
  expect(goals).toEqual([...goals].sort((a, b) => b - a));
  await expect(page.getByTestId('trailing-missing')).toHaveCount(0);
  await page.getByTestId('comp-picker').selectOption('conmebol.libertadores');
  await expect(page.getByTestId('trailing-missing')).toContainText('one played match');
  await page.reload();
  await expect(page.getByTestId('trailing-page')).toHaveAttribute('data-comp', 'conmebol.libertadores');
  expect(errors).toEqual([]);
});

test('the simulator is called "Simulator" everywhere it shows; old ?view=whatif links still open it', async ({ page }) => {
  const errors = await open(page, '?view=ucl');
  await expect(page.getByTestId('ucl-whatif')).toHaveText('Simulator');
  await page.getByTestId('ucl-whatif').click();
  await expect(page.getByRole('heading', { level: 2 })).toContainText('Simulator');
  await expect(page.locator('body')).not.toContainText(/what-if/i);
  await page.getByTestId('views').getByRole('tab', { name: 'Tables' }).click();
  await expect(page.getByTestId('league-whatif')).toHaveText('Simulator');
  await page.getByTestId('league-whatif').click();
  await expect(page.locator('body')).not.toContainText(/what-if/i);
  await expect(page.getByLabel('Back')).toHaveAttribute('title', 'Back to Premier League table');
  await open(page, '?view=whatif&league=bra.1');
  await expect(page).toHaveTitle('Brasileirão simulator — footykit');
  await expect(page.locator('[title]').filter({ hasText: /./ })).not.toHaveCount(0);
  const titles = await page.locator('[title]').evaluateAll((els) => els.map((e) => e.getAttribute('title') ?? ''));
  expect(titles.filter((t) => /what-if/i.test(t))).toEqual([]);
  expect(errors).toEqual([]);
});

test('simulator matchdays: one at a time, opens on the next to play, ◀ ▶ and ← → step, ↑↓ stay on the rows', async ({ page }) => {
  const errors = await open(page, '?view=whatif');
  const title = page.getByTestId('wi-nav-title');
  const matches = page.getByTestId('wi-match');
  // the fixture's next UCL matchday on Nov 21 is the 5th (Nov 24-25), matchdays 5-8 left
  await expect(title).toContainText('Matchday 5');
  await expect(title).toContainText('Nov 24, Nov 25');
  await expect(page.getByTestId('wi-nav')).toContainText('1 of 4');
  await expect(page.getByTestId('wi-prev')).toBeDisabled();
  await expect(matches).toHaveCount(18);
  await page.getByTestId('wi-next').click();
  await expect(title).toContainText('Matchday 6');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await expect(title).toContainText('Matchday 8');
  await expect(page.getByTestId('wi-next')).toBeDisabled();
  await page.keyboard.press('ArrowRight');
  await expect(title).toContainText('Matchday 8');
  await page.keyboard.press('ArrowLeft');
  await expect(title).toContainText('Matchday 7');
  // ↓ moves between rows, not matchdays; typing a score ignores ← →
  await matches.first().focus();
  await page.keyboard.press('ArrowDown');
  await expect(matches.nth(1)).toBeFocused();
  await expect(title).toContainText('Matchday 7');
  await matches.first().getByLabel('Type a score').fill('2-1');
  await matches.first().getByLabel('Type a score').press('ArrowLeft');
  await expect(title).toContainText('Matchday 7');
  // a league: windows
  await open(page, '?view=whatif&league=eng.1');
  await expect(page.getByTestId('wi-prev')).toBeDisabled();
  await expect(title).toContainText('Weekend');
  await page.getByTestId('wi-next').click();
  await expect(page.getByTestId('wi-prev')).toBeEnabled();
  expect(errors).toEqual([]);
});

test('simulator rows: a team code never runs into the badge after it, whatever its length', async ({ page }) => {
  const errors = await open(page, '?view=whatif');
  const overlaps = async () => page.getByTestId('wi-match').evaluateAll((rows) => rows.flatMap((r) => [...r.querySelectorAll('.fk-wi-side')].flatMap((side) => {
    const abbr = side.querySelector<HTMLElement>('.fk-wi-abbr')!;
    const badge = abbr.nextElementSibling as HTMLElement | null;
    const a = abbr.getBoundingClientRect();
    // the code's own text box: wider than its slot = drawn over what follows
    const range = document.createRange(); range.selectNodeContents(abbr);
    const text = range.getBoundingClientRect();
    const bad = (badge && text.right > badge.getBoundingClientRect().left + 0.5) || text.right > a.right + 0.5;
    return bad ? [abbr.textContent] : [];
  })));
  // the overlap showed in narrower windows, where the row has no room to spare
  for (const width of [1920, 1280, 1024]) {
    await page.setViewportSize({ width, height: 900 });
    for (let i = 0; i < 4; i++) {
      expect(await overlaps(), `${width}px, matchday ${i + 5}`).toEqual([]);
      await page.keyboard.press(i < 3 ? 'ArrowRight' : 'Home');
    }
    for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowLeft');
  }
  expect(errors).toEqual([]);
});

// App-wide rule: no scrolling box around a table; tall tables flow into 2–3 columns, each with its header.
const tableScrollers = (page: Page) => page.evaluate(() => [...document.querySelectorAll<HTMLElement>('*')]
  .filter((e) => /(auto|scroll)/.test(getComputedStyle(e).overflowY) && e.scrollHeight > e.clientHeight + 1 && (e.tagName === 'TABLE' || !!e.querySelector('table')))
  .map((e) => e.className || e.tagName));
const splits = (page: Page) => page.locator('.fk-split').evaluateAll((els) => els.map((s) => ({
  id: s.getAttribute('data-testid'), cols: Number(s.getAttribute('data-cols')),
  heads: s.querySelectorAll('thead').length, runs: [...s.querySelectorAll('tbody')].map((b) => b.rows.length),
})));

for (const [width, height] of [[1920, 911], [1280, 800], [1024, 768]] as const) {
  test(`no scrollbars inside tables at ${width}×${height}: tall tables split into columns with their headers`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    const errors: string[] = [];
    for (const search of ['?view=whatif', '?view=whatif&league=bra.1', '?view=trailing&comp=eng.fa', '?view=trailing&comp=uefa.champions', '?view=ucl', '?view=table&league=eng.1', '?view=cups&cup=conmebol.libertadores']) {
      errors.push(...await open(page, search));
      await expect(page.locator('table').first()).toBeVisible();
      await page.waitForTimeout(150); // the split settles after one measure
      expect(await tableScrollers(page), search).toEqual([]);
      for (const s of await splits(page)) {
        expect(s.heads, `${search} ${s.id}`).toBe(s.cols); // every column repeats the header
        expect(Math.max(...s.runs) - Math.min(...s.runs), `${search} ${s.id}`).toBeLessThanOrEqual(1); // split evenly
      }
    }
    // the quick standings popup
    await open(page, '?view=table&league=eng.1');
    await page.getByTestId('standings-button').click();
    await expect(page.getByTestId('standings-popup')).toBeVisible();
    await page.waitForTimeout(150);
    expect(await tableScrollers(page), 'standings popup').toEqual([]);
    // the 36-team table in the popup: no box scrolls, and its end can always be reached (page scroll if needed)
    await page.getByTestId('standings-popup').getByLabel('Competition').selectOption('uefa.champions');
    await page.waitForTimeout(150);
    expect(await tableScrollers(page), 'standings popup, UCL').toEqual([]);
    const reach = await page.getByTestId('standings-popup').evaluate((el) => {
      const r = el.getBoundingClientRect();
      const fixed = getComputedStyle(el).position === 'fixed';
      return fixed ? r.bottom <= innerHeight + 1 : r.bottom + scrollY <= document.documentElement.scrollHeight + 1;
    });
    expect(reach, 'standings popup end reachable').toBe(true);
    expect(errors).toEqual([]);
  });
}

test('the simulator table splits on a full-size window: 36 → 18 | 18, zone bars and ▲▼ stay on their rows', async ({ page }) => {
  const errors = await open(page, '?view=whatif');
  const split = page.getByTestId('wi-split');
  await expect(split).toHaveAttribute('data-cols', /^[23]$/);
  const runs = await split.locator('tbody').evaluateAll((bs) => bs.map((b) => b.querySelectorAll('tr').length));
  expect(runs.reduce((a, b) => a + b, 0)).toBe(36);
  // the 8th place keeps the round-of-16 zone and its end line, wherever it lands
  await expect(page.getByTestId('wi-row').nth(7)).toHaveClass(/fk-zone-r16.*fk-zone-end|fk-zone-end.*fk-zone-r16/);
  await page.getByTestId('wi-fill-home').click();
  await expect(page.getByTestId('wi-row').locator('.fk-wi-up, .fk-wi-down').first()).toBeVisible();
  // the long FA Cup list: 3 columns
  await open(page, '?view=trailing&comp=eng.fa');
  await expect(page.getByTestId('trailing-split')).toHaveAttribute('data-cols', '3');
  expect(errors).toEqual([]);
});

test('simulator Reset: empties only the matchday shown, keeps locked results, undoable; Clear still clears all', async ({ page }) => {
  const errors = await open(page, '?view=whatif');
  const matches = page.getByTestId('wi-match');
  const reset = page.getByTestId('wi-reset');
  await expect(reset).toHaveCount(0); // no pick yet
  await page.getByTestId('wi-fill-home').click();
  await expect(page.getByTestId('wi-count')).toHaveText('72 of 72 picked');
  // lock the first match of matchday 5, then Reset matchday 5
  await matches.first().focus();
  await page.keyboard.press('l');
  await expect(matches.first()).toHaveClass(/fk-wi-locked/);
  await reset.click();
  await expect(page.getByTestId('wi-count')).toHaveText('55 of 72 picked'); // 17 of 18 emptied, the locked one kept
  await expect(matches.first()).toHaveAttribute('data-pick', '1-0');
  await expect(matches.nth(1)).toHaveAttribute('data-pick', '');
  await expect(reset).toHaveCount(0); // only the locked pick left here
  // the other matchdays kept theirs
  await page.getByTestId('wi-next').click();
  await expect(matches.first()).toHaveAttribute('data-pick', '1-0');
  await expect(reset).toBeVisible();
  // undo brings matchday 5 back
  await page.keyboard.press('Control+z');
  await expect(page.getByTestId('wi-count')).toHaveText('72 of 72 picked');
  // the toolbar's Clear still empties every matchday (locked aside)
  await page.getByTestId('wi-clear').click();
  await expect(page.getByTestId('wi-count')).toHaveText('1 of 72 picked');
  // a league: Reset per window
  await open(page, '?view=whatif&league=eng.1');
  await matches.first().click();
  await page.getByTestId('wi-reset').click();
  await expect(page.getByTestId('wi-count')).toHaveText('0 of 280 picked');
  expect(errors).toEqual([]);
});

test('pots: no pot badges on the UCL page or the simulator (kept in tooltips); the Pots tab lists 4 × 9 teams', async ({ page }) => {
  const errors = await open(page, '?view=ucl');
  await expect(page.getByTestId('ucl-row')).toHaveCount(36);
  await expect(page.locator('.fk-pot, .fk-usq-pot')).toHaveCount(0);
  await expect(page.getByTestId('ucl-square').first()).toHaveAttribute('title', /pot \d/);
  await expect(page.getByTestId('ucl-row').first().locator('.fk-ucl-team')).toHaveAttribute('title', /pot \d/);
  // the Pots tab
  await page.getByTestId('ucl-tabs').getByRole('tab', { name: 'Pots' }).click();
  await expect(page).toHaveTitle('Champions League pots — footykit');
  await expect(page.getByTestId('ucl-pot')).toHaveCount(4);
  for (let i = 0; i < 4; i++) await expect(page.getByTestId('ucl-pot').nth(i).getByTestId('ucl-pot-team')).toHaveCount(9);
  await expect(page.getByTestId('ucl-pot').first()).toContainText('Paris Saint-Germain');
  await expect(page.getByTestId('ucl-pot').first().locator('img').first()).toBeVisible();
  await page.reload();
  await expect(page.getByTestId('ucl-pot')).toHaveCount(4);
  await page.getByTestId('ucl-tabs').getByRole('tab', { name: 'League phase' }).click();
  await expect(page.getByTestId('ucl-row')).toHaveCount(36);
  // the simulator
  await open(page, '?view=whatif');
  await expect(page.getByTestId('wi-match').first()).toBeVisible();
  await expect(page.locator('.fk-pot')).toHaveCount(0);
  await expect(page.getByTestId('wi-match').first().locator('.fk-wi-side').first()).toHaveAttribute('title', /pot \d/);
  expect(errors).toEqual([]);
});

test('team names open the month Calendar from the tables, UCL, Trailing and cups pages too', async ({ page }) => {
  const errors: string[] = [];
  for (const search of ['?view=table&league=eng.1', '?view=ucl', '?view=trailing&comp=eng.1', '?view=cups&cup=eng.league_cup']) {
    errors.push(...await open(page, search));
    await page.locator('a.fk-team, button.fk-team').filter({ hasText: 'Arsenal' }).first().click();
    await expect(page, search).toHaveTitle(/^ARS schedule · Nov 2026/);
  }
  expect(errors).toEqual([]);
});

test('Team List rest days: a Rest row for each day without a match, on by default, off until a reload', async ({ page }) => {
  const errors = await open(page, '?view=list&team=359');
  await expect(page).toHaveTitle(/^ARS list · Nov 2026/);
  await expect(page.getByTestId('show-rest')).toBeChecked();
  const matchDays = new Set(await page.getByTestId('team-row').locator('.fk-tl-date').allTextContents());
  const rest = page.getByTestId('rest-row');
  // Arsenal play before and after November: every November day without a match is a Rest row
  await expect(rest).toHaveCount(30 - matchDays.size);
  await expect(rest.first()).toContainText('Rest');
  for (const d of await rest.locator('.fk-tl-date').allTextContents()) expect(matchDays.has(d)).toBe(false);
  // rows in date order, matches and rest days mixed
  const order = await page.locator('[data-testid="team-list"] .fk-tl-month').last().locator('[data-testid="rest-row"], [data-testid="team-row"]').evaluateAll((els) => els.map((e) => Number(e.querySelector('.fk-tl-date')!.textContent!.replace(/\D/g, ''))));
  expect(order).toEqual([...order].sort((a, b) => a - b));
  // the November break (FIFA window) is just a run of Rest rows, no label
  await expect(page.getByTestId('team-list')).not.toContainText(/international break/i);
  // unchecked: gone, and not in the address; a reload brings them back
  await page.getByTestId('show-rest').uncheck();
  await expect(rest).toHaveCount(0);
  expect(page.url()).not.toContain('rest');
  await page.reload();
  await expect(page.getByTestId('show-rest')).toBeChecked();
  await expect(rest).toHaveCount(30 - matchDays.size);
  expect(errors).toEqual([]);
});

test('match links search Google ("Home vs Away Mon D YYYY", new tab), never ESPN, on every page', async ({ page, context }) => {
  // never actually load Google in a test
  await context.route(/google\.com/, (r) => r.fulfill({ status: 200, body: 'ok' }));
  const errors: string[] = [];
  for (const search of ['', '?view=cal&team=359&span=month', '?view=list&team=359', '?view=ucl', '?view=table&league=eng.1', '?view=cups&cup=eng.league_cup']) {
    errors.push(...await open(page, search));
    await expect(page.locator('a[href^="https://www.google.com/search"]').first(), search).toBeAttached(); // lazy pages
    const links = await page.locator('a[href]').evaluateAll((as) => as.map((a) => ({ href: (a as HTMLAnchorElement).href, target: (a as HTMLAnchorElement).target })));
    expect(links.filter((l) => /espn\.com/.test(l.href)), search).toEqual([]);
    const google = links.filter((l) => l.href.startsWith('https://www.google.com/search?q='));
    expect(google.length, search).toBeGreaterThan(0);
    for (const l of google) {
      expect(l.target).toBe('_blank');
      expect(new URL(l.href).searchParams.get('q')).toMatch(/^.+ vs .+ (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d{1,2} 20\d\d$/);
    }
  }
  // the "@" of a day-list row opens the search in a new tab
  await open(page);
  const popup = context.waitForEvent('page');
  await page.locator('.fk-at').first().click();
  const q = new URL((await popup).url()).searchParams.get('q');
  expect(q).toMatch(/ vs .+ Nov 21 2026$/);
  expect(errors).toEqual([]);
});
