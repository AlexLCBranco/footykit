// FK-67: on the 2026 World Cup every match with a full replay on CazéTV's YouTube channel has a ▶ beside it (group
// squares, bracket ties, the simulator's rows) that opens the video in a new tab; the Google link on the match stays;
// editions before 2026 have none.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';

const videos = JSON.parse(readFileSync(join(import.meta.dirname, '..', 'public', 'worldcup', '2026-videos.json'), 'utf8')) as Record<string, string>;
const WATCH = /^https:\/\/www\.youtube\.com\/watch\?v=[\w-]{11}$/;

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

test('2026 groups: a match with a video has a ▶ whose link is its YouTube video, beside the Google link', async ({ page }) => {
  const errors = await open(page, '?view=wc&year=2026&how=groups');
  await ready(page, 2026);
  const play = page.locator('[data-testid="wc-video"][data-n="1"]').first();
  await expect(play).toBeVisible();
  await expect(play).toHaveText('▶');
  await expect(play).toHaveAttribute('href', `https://www.youtube.com/watch?v=${videos['1']}`);
  expect(await play.getAttribute('href')).toMatch(WATCH);
  await expect(play).toHaveAttribute('target', '_blank');
  await expect(play).toHaveAttribute('title', 'Full match on CazéTV (YouTube)');
  // the ▶ is on top of its square's corner: a click there lands on it, not on the square under it
  expect(await play.evaluate((el) => { const r = el.getBoundingClientRect(); return document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2) === el; })).toBe(true);
  // the square keeps its Google link
  await expect(page.locator('[data-testid="wc-group"][data-group="Group A"] [data-testid="wc-square"]').first()).toHaveAttribute('href', /^https:\/\/www\.google\.com\/search\?q=/);
  // every ▶ on the page is a video of the file, on its own match; every group match with a video shows it on both teams' rows
  const all = await page.getByTestId('wc-video').evaluateAll((els) => els.map((e) => [e.getAttribute('data-n')!, e.getAttribute('href')!] as const));
  for (const [n, href] of all) expect(href, `match ${n}`).toBe(`https://www.youtube.com/watch?v=${videos[n]}`);
  const groupMatches = 72;
  expect(all.length).toBe(2 * Object.keys(videos).filter((n) => Number(n) <= groupMatches).length);
  expect(errors).toEqual([]);
});

test('2026 bracket and simulator: ▶ on the ties and on the match rows', async ({ page }) => {
  const errors = await open(page, '?view=wc&year=2026&how=bracket');
  await ready(page, 2026);
  await expect(page.getByTestId('wc-bracket')).toBeVisible();
  const final = page.locator('[data-testid="wc-ko-col"][data-side="final"] [data-testid="wc-tie"]').first();
  await expect(final.getByTestId('wc-video')).toHaveAttribute('href', `https://www.youtube.com/watch?v=${videos['104']}`);
  await expect(final.getByTestId('wc-match')).toHaveAttribute('href', /^https:\/\/www\.google\.com\/search\?q=/);
  // 32 knockout matches, each with its ▶
  const ko = await page.locator('[data-testid="wc-knockout"] [data-testid="wc-video"]').evaluateAll((els) => els.map((e) => e.getAttribute('href')));
  expect(ko.length).toBe(Object.keys(videos).filter((n) => Number(n) > 72).length);
  for (const h of ko) expect(h).toMatch(WATCH);

  await page.getByTestId('how').getByRole('tab', { name: 'Simulator', exact: true }).click();
  await expect(page.getByTestId('wc-sim')).toBeVisible();
  const row = page.locator('[data-testid="wc-sim-match"][data-n="1"]');
  await expect(row.getByTestId('wc-video')).toHaveAttribute('href', `https://www.youtube.com/watch?v=${videos['1']}`);
  await expect(page.locator('[data-testid="wc-sim-tie"][data-n="104"]').getByTestId('wc-video')).toHaveAttribute('href', `https://www.youtube.com/watch?v=${videos['104']}`);
  expect(errors).toEqual([]);
});

test('an edition before 2026 shows no ▶ and loads no videos file', async ({ page }) => {
  const asked: string[] = [];
  page.on('request', (r) => { if (/videos\.json/.test(r.url())) asked.push(r.url()); });
  const errors = await open(page, '?view=wc&year=2014&how=groups');
  await ready(page, 2014);
  await expect(page.getByTestId('wc-square').first()).toBeVisible();
  await expect(page.getByTestId('wc-video')).toHaveCount(0);
  await page.getByTestId('how').getByRole('tab', { name: 'Bracket', exact: true }).click();
  await expect(page.getByTestId('wc-bracket')).toBeVisible();
  await expect(page.getByTestId('wc-video')).toHaveCount(0);
  expect(asked).toEqual([]);
  expect(errors).toEqual([]);
});
