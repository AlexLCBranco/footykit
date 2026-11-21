// FK-71: the World Cup thirds race on 2026: go back to "After matchday 2", see the tables as they stood with a status
// on every row, the thirds with the cut line, the matches still to play, the round of 32 as it stands, a team's
// matchups, the rules in plain words, and the Simulator starting from that point.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';

interface M { n: number; group?: string; date: string; h: string; a: string }
const ed = JSON.parse(readFileSync(join(import.meta.dirname, '..', 'public', 'worldcup', '2026.json'), 'utf8')) as { matches: M[] };

async function open(page: Page, search: string) {
  const errors: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.addInitScript(() => { (window as { __FK_NOW__?: string }).__FK_NOW__ = '2026-11-21T15:00:00Z'; });
  await page.route(/api.open-meteo.com/, (r) => r.fulfill({ json: {} }));
  await page.goto(`/football/${search}`);
  return errors;
}
const ready = (page: Page, y: number) => expect(page.locator(`[data-testid="wc-page"][data-year="${y}"][data-ready]`)).toBeVisible();
const point = (page: Page, name: string) => page.getByTestId('wc-point').getByRole('tab', { name, exact: true });

test('2026 after matchday 2: tables as they stood, statuses, the cut line, matches left, the round of 32 as it stands, matchups, rules', async ({ page }) => {
  const errors = await open(page, '?view=wc&year=2026&how=groups');
  await ready(page, 2026);
  // Final is the default: today's view, no race block
  await expect(point(page, 'Final')).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByTestId('wc-race')).toHaveCount(0);
  await expect(page.getByTestId('wc-thirds')).toBeVisible();

  await point(page, 'After matchday 2').click();
  await expect(page).toHaveURL(/[?&]at=2/);
  await expect(page).toHaveTitle('World Cup 2026 groups after matchday 2 — footykit');
  const race = page.getByTestId('wc-race');
  await expect(race).toBeVisible();
  await expect(page.getByTestId('wc-race-note')).toContainText('after matchday 2');
  // Group A as it stood: Mexico 6, South Korea 3, Czech Republic 1, South Africa 1; one match each not played
  const groupA = page.locator('[data-testid="wc-group"][data-group="Group A"]');
  expect(await groupA.getByTestId('wc-row').evaluateAll((rs) => rs.map((r) => `${r.getAttribute('data-team')} ${r.querySelector('.fk-pts')!.textContent} ${r.querySelectorAll('[data-testid="wc-square"]').length} ${r.querySelector('[data-testid="wc-status"]')!.textContent}`)))
    .toEqual(['MEX 6 2 Through', 'KOR 3 2 Open', 'CZE 1 2 Open', 'ZAF 1 2 Open']);
  await expect(groupA.locator('.fk-usq-next').first()).toHaveAttribute('title', 'Not played yet at this point');
  // the status explains itself on hover
  await expect(groupA.getByTestId('wc-status').first()).toHaveAttribute('title', /Sure to go on.*whatever happens in the matches left/);
  // 12 groups, every row with a status; the matches still to play listed under each group (2 each)
  await expect(race.getByTestId('wc-group')).toHaveCount(12);
  await expect(race.locator('[data-testid="wc-group"] [data-testid="wc-status"]')).toHaveCount(48);
  await expect(race.getByTestId('wc-left-match')).toHaveCount(24);
  const left = race.getByTestId('wc-left').first();
  await expect(left).toContainText('Still to play');
  await expect(left.getByTestId('wc-left-match').first()).toContainText(/Czech Republic v Mexico · 24 Jun · 19:00 · \S/);
  // the thirds: 12 rows, eight above the cut line (drawn under the 8th), a status each
  const thirds = race.getByTestId('wc-race-third');
  await expect(thirds).toHaveCount(12);
  expect(await thirds.evaluateAll((rs) => rs.map((r) => r.getAttribute('data-team')))).toEqual(['SWE', 'SCO', 'HRV', 'DZA', 'PRY', 'CPV', 'BEL', 'CZE', 'COD', 'ECU', 'BIH', 'SEN']);
  await expect(race.locator('[data-testid="wc-race-third"][data-in]')).toHaveCount(8);
  const cut = race.locator('[data-testid="wc-race-third"][data-cut]');
  await expect(cut).toHaveAttribute('data-team', 'CZE');
  expect(await cut.locator('td').first().evaluate((td) => parseFloat(getComputedStyle(td).borderBottomWidth))).toBeGreaterThanOrEqual(3);
  await expect(race.locator('[data-testid="wc-race-thirds"] [data-testid="wc-status"]')).toHaveCount(12);
  // statuses overall: some sure Through, some sure Out, most Open
  const statuses = await race.locator('[data-testid="wc-group"] [data-testid="wc-status"]').evaluateAll((ss) => ss.map((s) => s.getAttribute('data-status')));
  expect(statuses.filter((s) => s === 'top2')).toHaveLength(7);
  expect(statuses.filter((s) => s === 'out')).toHaveLength(5);
  expect(statuses.filter((s) => s === 'open')).toHaveLength(36);
  // the round of 32 as it stands: 16 pairings, labelled, not real fixtures
  const standing = race.getByTestId('wc-standing');
  await expect(standing).toContainText('as it stands');
  await expect(standing).toContainText('They are not real fixtures');
  await expect(standing.getByTestId('wc-standing-tie')).toHaveCount(16);
  const mex = standing.locator('[data-testid="wc-standing-tie"][data-n="79"]');
  await expect(mex).toHaveAttribute('data-h', 'MEX');
  await expect(mex).toHaveAttribute('data-a', 'SCO');
  await expect(mex).toContainText('1st of Group A');
  await expect(mex).toContainText('3rd of Group C');

  // a team's matchups: only the places it can still reach
  await groupA.locator('[data-testid="wc-who"][data-team="KOR"]').click();
  const who = page.getByTestId('wc-matchups');
  await expect(who).toHaveAttribute('data-team', 'KOR');
  await expect(who).toContainText('Who would South Korea play next?');
  await expect(who).toContainText('can still finish 2nd, 3rd or 4th');
  await expect(who.getByTestId('wc-matchup')).toHaveCount(3);
  await expect(who.locator('[data-testid="wc-matchup"][data-place="2"]')).toContainText('They play the team that finishes 2nd in Group B. Right now that is Switzerland.');
  await expect(who.locator('[data-testid="wc-matchup"][data-place="2"]')).toContainText(/on the (left|right) side of the bracket/);
  await expect(who.locator('[data-testid="wc-matchup"][data-place="3"]')).toContainText('they play the winner of Group');
  await groupA.locator('[data-testid="wc-who"][data-team="MEX"]').click();
  await expect(who).toHaveAttribute('data-team', 'MEX');
  await expect(who.getByTestId('wc-matchup')).toHaveCount(1);
  await expect(who.getByTestId('wc-matchup')).toContainText('If Mexico finish 1st: They play a team that finished 3rd in its group');
  await expect(who.getByTestId('wc-matchup')).toContainText('Right now that would be Scotland.');
  await page.getByTestId('wc-matchups-close').click();
  await expect(who).toHaveCount(0);

  // the rules, one click away, in plain words with real teams
  await page.getByTestId('wc-rules-btn').click();
  const rules = page.getByTestId('wc-rules-box');
  await expect(rules).toContainText('48 teams play in 12 groups of 4.');
  await expect(rules).toContainText('The best 8 of them go on too.');
  await expect(rules.getByTestId('wc-rules-thirds-example')).toContainText('Senegal finished 3rd in Group I');
  await expect(rules.getByTestId('wc-rules-tie-example')).toContainText('Canada and Bosnia and Herzegovina both had 4 points');
  await expect(rules.getByTestId('wc-rules-pairing-example')).toContainText('The row for those groups says');
  await page.getByTestId('wc-rules-close').click();
  await expect(rules).toHaveCount(0);
  await page.screenshot({ path: 'test-output/fk71/groups-after-md2.png', fullPage: true });

  // matchday 1, and back to Final
  await point(page, 'After matchday 1').click();
  await expect(race.getByTestId('wc-left-match')).toHaveCount(48);
  expect(await race.locator('[data-testid="wc-group"] [data-testid="wc-status"]').evaluateAll((ss) => ss.every((s) => s.getAttribute('data-status') === 'open'))).toBe(true);
  await point(page, 'Final').click();
  await expect(page.getByTestId('wc-race')).toHaveCount(0);
  await expect(page).not.toHaveURL(/at=/);
  expect(errors).toEqual([]);
});

test('2026 Simulator from after matchday 2: matchday 3 empty, a pick changes which thirds are through, reset fills everything', async ({ page }) => {
  const errors = await open(page, '?view=wc&year=2026&how=groups&at=2');
  await ready(page, 2026);
  await page.getByTestId('how').getByRole('tab', { name: 'Simulator', exact: true }).click();
  const sim = page.getByTestId('wc-sim');
  await expect(sim).toBeVisible();
  await expect(page).toHaveURL(/at=2/);
  await expect(point(page, 'After matchday 2')).toHaveAttribute('aria-selected', 'true');
  // Group A: matches 1–4 as played, 5 and 6 empty
  for (const n of [1, 2, 3, 4]) await expect(sim.locator(`[data-testid="wc-sim-match"][data-n="${n}"] [data-testid="wc-sim-score"]`)).not.toHaveText('–');
  for (const n of [5, 6]) await expect(sim.locator(`[data-testid="wc-sim-match"][data-n="${n}"] [data-testid="wc-sim-score"]`)).toHaveText('–');
  expect(await sim.getByTestId('wc-sim-score').evaluateAll((ss) => ss.filter((s) => s.textContent === '–').length)).toBe(24);
  await expect(sim.getByTestId('wc-sim-champion')).toContainText('No champion yet');
  // the bracket's first round is filled as it stands (Mexico v Scotland), and says so
  await expect(sim.getByTestId('wc-sim-stands')).toContainText('As it stands');
  expect(await sim.locator('[data-testid="wc-sim-tie"][data-n="79"] [data-testid="wc-sim-side"]').evaluateAll((s) => s.map((x) => x.getAttribute('data-team')))).toEqual(['MEX', 'SCO']);
  // statuses in the tables and on the thirds
  await expect(sim.locator('[data-testid="wc-sim-row"][data-team="MEX"] [data-testid="wc-status"]')).toHaveText('Through');
  const inNow = () => sim.locator('[data-testid="wc-sim-third"][data-in]').evaluateAll((rs) => rs.map((r) => r.getAttribute('data-team')));
  const before = await inNow();
  expect(before).toEqual(['SWE', 'SCO', 'HRV', 'DZA', 'PRY', 'CPV', 'BEL', 'CZE']);
  // Senegal (bottom of the thirds, 0 points) win their last match: the best eight change
  const groupI = ed.matches.filter((m) => m.group === 'Group I').sort((a, b) => a.date.localeCompare(b.date) || a.n - b.n);
  const last = groupI.slice(-2).find((m) => m.h === 'SEN' || m.a === 'SEN')!;
  await sim.locator(`[data-testid="wc-sim-match"][data-n="${last.n}"]`).getByTestId(last.h === 'SEN' ? 'wc-fast-1' : 'wc-fast-2').click();
  const after = await inNow();
  expect(after).not.toEqual(before);
  expect(after).toHaveLength(8);
  expect(after).not.toContain('CZE');
  // matchups follow the picks
  await sim.locator('[data-testid="wc-who"][data-team="MEX"]').click();
  await expect(page.getByTestId('wc-matchups')).toContainText('If Mexico finish 1st');
  await page.getByTestId('wc-matchups-close').click();
  // kept on reload; "Start again" empties matchday 3 again; "Reset to real results" fills everything
  await page.reload();
  await ready(page, 2026);
  expect(await inNow()).toEqual(after);
  await sim.getByTestId('wc-sim-restart').click();
  expect(await inNow()).toEqual(before);
  await sim.getByTestId('wc-sim-reset').click();
  await expect(sim.getByTestId('wc-sim-changed')).toHaveText('The real results');
  await expect(sim.getByTestId('wc-sim-champion')).toContainText('Spain');
  expect(await sim.getByTestId('wc-sim-score').evaluateAll((ss) => ss.filter((s) => s.textContent === '–').length)).toBe(0);
  // the ordinary simulator (Final) is untouched by all this: still the real results
  await point(page, 'Final').click();
  await expect(sim.getByTestId('wc-sim-changed')).toHaveText('The real results');
  await expect(sim.getByTestId('wc-sim-restart')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('from the Bracket, picking a matchday opens the Groups; an edition without the thirds rule has no switch', async ({ page }) => {
  const errors = await open(page, '?view=wc&year=2026&how=bracket');
  await ready(page, 2026);
  await point(page, 'After matchday 2').click();
  await expect(page.getByTestId('wc-race')).toBeVisible();
  await expect(page.getByTestId('wc-bracket')).toHaveCount(0);
  await page.getByTestId('what-edition').getByTestId('edition-btn').click();
  await page.getByTestId('what-edition').getByRole('option', { name: '2022', exact: true }).click();
  await ready(page, 2022);
  await expect(page.getByTestId('wc-point')).toHaveCount(0);
  await expect(page.getByTestId('wc-rules-btn')).toHaveCount(0);
  await expect(page).not.toHaveURL(/at=/);
  expect(errors).toEqual([]);
});
