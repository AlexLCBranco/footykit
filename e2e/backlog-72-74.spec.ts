// FK-72 (relegation race), FK-73 (stadium on Slate cards, "not their stadium") and FK-74 (edition dropdown). Same
// setup as features.spec.ts: "now" fixed at 2026-11-21 12:00 Brazil time, the recorded snapshot, nothing from ESPN.
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

test('FK-72: the Brasileirão relegation race lists the bottom teams with their gaps, games left and the games between them', async ({ page }) => {
  const errors = await open(page, '?view=table&league=bra.1');
  // from the league's page
  await page.getByTestId('lt-race').click();
  await expect(page).toHaveURL(/view=relegation&league=bra\.1/);
  await expect(page).toHaveTitle('Brasileirão relegation race — footykit');
  await expect(page.getByTestId('crumb-btn')).toHaveText(['Leagues', 'Brasileirão', 'Relegation']);
  await expect(page.getByTestId('how').getByRole('tab', { name: 'Relegation' })).toHaveAttribute('aria-selected', 'true');
  // the rules on top, in plain words, with today's teams
  const rules = page.getByTestId('rel-rules');
  await expect(rules).toContainText('Brasileirão has 20 teams.');
  await expect(rules).toContainText('the 4 teams with the fewest points go down to the league below. Those are places 17th to 20th.');
  await expect(rules).toContainText('The team with more wins is higher.');
  await expect(page.getByTestId('rel-example')).toContainText('Internacional is 16th with 38 points. It is the last safe team.');
  await expect(page.getByTestId('rel-example')).toContainText('Corinthians needs 1 more point to catch Internacional.');
  // the rules sit above the table
  const [rulesBox, tableBox] = [(await rules.boundingBox())!, (await page.getByTestId('rel-table').boundingBox())!];
  expect(rulesBox.y + rulesBox.height).toBeLessThanOrEqual(tableBox.y);
  // the bottom four are in the drop zone, each with its gap to safety; the teams just above are close
  const rows = page.getByTestId('rel-row');
  const down = page.locator('[data-testid="rel-row"][data-status="down"]');
  await expect(down).toHaveCount(4);
  await expect(down.getByTestId('rel-status')).toHaveText(['In the drop zone', 'In the drop zone', 'In the drop zone', 'In the drop zone']);
  await expect(down.getByTestId('rel-gap')).toHaveText(['1 point from safety', '1 point from safety', '9 points from safety', '17 points from safety']);
  await expect(down.first().locator('.fk-rank')).toHaveText('17');
  const close = page.locator('[data-testid="rel-row"][data-status="close"]');
  await expect(close).toHaveCount(3);
  await expect(close.last().getByTestId('rel-gap')).toHaveText('1 point above the drop zone');
  await expect(close.last().getByTestId('rel-pts')).toHaveText('38');
  // games left, last results and next games on every row
  for (const left of await rows.getByTestId('rel-left').allTextContents()) expect(Number(left)).toBeGreaterThan(0);
  expect(await rows.first().getByTestId('league-square').count()).toBeGreaterThan(5);
  // the games these teams still play against each other
  await expect(page.getByTestId('rel-between-match')).toHaveCount(5);
  // another league keeps the page; the Bundesliga has a play-off place and says so
  await page.getByTestId('what-league').getByTestId('comp-picker').click();
  await page.getByTestId('what-league').locator('[data-value="ger.1"]').click();
  await expect(page).toHaveURL(/view=relegation&league=ger\.1/);
  await expect(page.locator('[data-testid="rel-row"][data-status="playoff"]').getByTestId('rel-status')).toHaveText('Play-off place');
  await expect(page.getByTestId('rel-rules')).toContainText('It plays 2 more games against a team from the league below.');
  // from the header menu: Go anywhere
  await page.getByTestId('go-anywhere').click();
  await page.getByTestId('go-input').fill('premier league relegation');
  await page.getByTestId('go-input').press('Enter');
  await expect(page.getByTestId('rel-page')).toHaveAttribute('data-league', 'eng.1');
  // back to the whole table
  await page.getByTestId('rel-to-table').click();
  await expect(page.getByTestId('league-page')).toHaveAttribute('data-league', 'eng.1');
  expect(errors).toEqual([]);
});

test('FK-73: every Slate card shows its stadium; a moved home match says "Not their stadium" with the distance', async ({ page }) => {
  const errors = await open(page, '?view=slate');
  const cards = page.getByTestId('slate-card');
  // every card has the stadium line
  const n = await cards.count();
  expect(n).toBeGreaterThan(3);
  await expect(page.getByTestId('card-stadium')).toHaveCount(n);
  for (const t of await page.getByTestId('card-stadium').allTextContents()) expect(t.trim()).not.toBe('');
  // a normal home match: only the stadium (Man City v Fulham at the Etihad)
  const normal = page.locator('[data-testid="slate-card"][data-match-id="401879233"]');
  await expect(normal.getByTestId('card-stadium')).toHaveText('Etihad Stadium, Manchester');
  await expect(normal.getByTestId('ground-chip')).toHaveCount(0);
  // the Sudamericana final the same day: neutral ground
  const final = page.locator('[data-testid="slate-card"][data-match-id="401913961"]');
  await expect(final.getByTestId('ground-chip')).toHaveText('Neutral ground');
  // Nov 23: Santos v Grêmio is played at the Morumbi in São Paulo, not at Vila Belmiro
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page.getByTestId('slate-header')).toHaveText('SLATE · 23-11 · Football');
  const moved = page.locator('[data-testid="slate-card"][data-match-id="401841320"]');
  await expect(moved.getByTestId('card-stadium')).toHaveText('Estádio Cícero Pompeu de Toledo, Sao Paulo');
  const chip = moved.getByTestId('ground-chip');
  await expect(chip).toHaveText('⚠ Not their stadium · 55 km from home');
  await expect(chip).toHaveAttribute('title', /Santos usually play at home at Estádio Vila Belmiro \(Urbano Caldeira\), Santos\./);
  // the line stays inside the card, text at 12 px, and every card is the same size
  const box = (await moved.boundingBox())!, line = (await moved.getByTestId('card-venue').boundingBox())!;
  expect(line.x + line.width).toBeLessThanOrEqual(box.x + box.width);
  expect(line.y + line.height).toBeLessThanOrEqual(box.y + box.height);
  await expect(chip).toHaveCSS('font-size', '12px');
  const sizes = await cards.evaluateAll((els) => els.map((e) => { const r = e.getBoundingClientRect(); return `${r.width}x${r.height}`; }));
  expect(new Set(sizes)).toEqual(new Set(['561x96']));
  expect(errors).toEqual([]);
});

test('FK-74: the World Cup edition dropdown lists every edition, choosing 1970 opens it, ◀ ▶ move one edition', async ({ page }) => {
  const errors = await open(page, '?view=wc&year=2026');
  const pick = page.getByTestId('what-edition');
  await expect(pick.getByTestId('edition-now')).toHaveText('2026');
  await expect(pick.getByTestId('edition-next')).toBeDisabled();
  await pick.getByTestId('edition-btn').click();
  const years = await pick.getByRole('option').allTextContents();
  expect(years).toHaveLength(23);
  expect(years.slice(0, 3)).toEqual(['2026', '2022', '2018']);
  expect(years.at(-1)).toBe('1930');
  await pick.getByRole('option', { name: '1970', exact: true }).click();
  await expect(page.locator('[data-testid="wc-page"][data-year="1970"][data-ready]')).toBeVisible();
  await expect(page).toHaveURL(/year=1970/);
  await expect(pick.getByTestId('edition-now')).toHaveText('1970');
  await expect(pick.getByRole('option')).toHaveCount(0);
  // ◀ ▶: one edition at a time
  await pick.getByTestId('edition-prev').click();
  await expect(page.locator('[data-testid="wc-page"][data-year="1966"][data-ready]')).toBeVisible();
  await pick.getByTestId('edition-next').click();
  await pick.getByTestId('edition-next').click();
  await expect(page.locator('[data-testid="wc-page"][data-year="1974"][data-ready]')).toBeVisible();
  await expect(pick.getByTestId('edition-now')).toHaveText('1974');
  // a click outside closes the list without changing the edition
  await pick.getByTestId('edition-btn').click();
  await page.getByTestId('wc-page').locator('h2').click();
  await expect(pick.getByRole('option')).toHaveCount(0);
  await expect(page).toHaveURL(/year=1974/);
  // the first edition: nothing before it
  await pick.getByTestId('edition-btn').click();
  await pick.getByRole('option', { name: '1930', exact: true }).click();
  await expect(pick.getByTestId('edition-prev')).toBeDisabled();
  // past seasons: the same dropdown on a competition's History
  await page.goto('/football/?view=history&comp=eng.1');
  const season = page.getByTestId('hist-season');
  await expect(season.getByTestId('edition-next')).toBeDisabled();
  await season.getByTestId('edition-btn').click();
  await season.getByRole('option', { name: '2004-05', exact: true }).click();
  await expect(page.getByTestId('hist-season-title')).toContainText('2004-05');
  await season.getByTestId('edition-prev').click();
  await expect(page.getByTestId('hist-season-title')).toContainText('2003-04');
  await expect(page).toHaveURL(/season=2003/);
  expect(errors).toEqual([]);
});
