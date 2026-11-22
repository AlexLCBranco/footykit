// FK-61: the Slate's "⏱ Countdown" button opens halftime-timer on a timer counting down to the day's first match, or
// to the next one that hasn't started; with none left it is switched off. The fixture's Nov 21 (São Paulo time): Man
// City–Fulham 09:30 is the first match, Nice–PSG 13:15 the first after 12:00, Chapecoense–Cruzeiro 21:00 the last.
import { mkdirSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

async function open(page: Page, now: string) {
  const errors: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.addInitScript((n) => { (window as { __FK_NOW__?: string }).__FK_NOW__ = n; }, now);
  await page.route(/api.open-meteo.com/, (r) => r.fulfill({ json: {} }));
  await page.goto('/football/?view=slate');
  await expect(page.getByTestId('slate-card').first()).toBeVisible();
  return errors;
}
const link = async (page: Page) => {
  const b = page.getByTestId('countdown-button');
  await expect(b).toHaveText('⏱ Countdown');
  const url = new URL((await b.getAttribute('href'))!);
  return { b, at: url.origin + url.pathname, end: url.searchParams.get('end'), name: url.searchParams.get('name'), raw: url.search };
};

test('before the first match: the button links to halftime-timer with the first kick-off and "First match · …"', async ({ page }) => {
  const errors = await open(page, '2026-11-21T08:00:00Z');
  await expect(page.getByTestId('slate-header')).toContainText('21-11');
  const l = await link(page);
  expect(l.at).toBe('https://halftime-timer.vercel.app/');
  expect(l.end).toBe('2026-11-21T12:30:00Z'); // 09:30 in São Paulo
  expect(l.name).toBe('First match · Man City–Fulham 09:30');
  // both parts URL-encoded, as halftime-timer's README asks
  expect(l.raw).toBe('?end=2026-11-21T12%3A30%3A00Z&name=First%20match%20%C2%B7%20Man%20City%E2%80%93Fulham%2009%3A30');
  await expect(l.b).toHaveAttribute('target', '_blank');
  await expect(l.b).toHaveAttribute('title', 'Open a timer that counts down to the first match: Man City–Fulham 09:30');
  // in the Slate's header, beside the label, never in a copied image
  await expect(page.locator('.fk-slate-header').getByTestId('countdown-button')).toBeVisible();
  await expect(l.b).toHaveAttribute('data-capture-exclude', 'true');
  mkdirSync('test-output/fk61', { recursive: true });
  await page.locator('.fk-slate-header').screenshot({ path: 'test-output/fk61/slate-header.png' });
  expect(errors).toEqual([]);
});

test('once the first match has started: it counts to the next match that has not, and says "Next match"', async ({ page }) => {
  const errors = await open(page, '2026-11-21T15:00:00Z'); // 12:00 in São Paulo: the 12:00 matches are kicking off
  const l = await link(page);
  expect(l.end).toBe('2026-11-21T16:15:00Z');
  expect(l.name).toBe('Next match · Nice–PSG 13:15');
  await expect(l.b).toHaveAttribute('title', 'The first match has started. Open a timer that counts down to the next match: Nice–PSG 13:15');
  expect(errors).toEqual([]);
});

test('no match left today: the button is switched off and says so', async ({ page }) => {
  const errors = await open(page, '2026-11-22T02:00:00Z'); // 23:00 in São Paulo, still Nov 21
  await expect(page.getByTestId('slate-header')).toContainText('21-11');
  const b = page.getByTestId('countdown-button');
  await expect(b).toHaveText('⏱ Countdown');
  await expect(b).toBeDisabled();
  await expect(b).toHaveAttribute('title', 'No more matches today');
  expect(await b.getAttribute('href')).toBeNull();
  expect(errors).toEqual([]);
});
