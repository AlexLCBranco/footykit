// FK-69: the World Cup bracket as match cards joined by lines (two sides, the final in the middle): flags and full
// names, the score once, date, time, stadium, roof, weather under the sky, a Watch button, the champion's path, full
// width with text never under 12px. FK-70: the Poster switch (flag tiles and names only) and its copy as an image.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';

const DIR = join(import.meta.dirname, '..', 'public', 'worldcup');
const videos = JSON.parse(readFileSync(join(DIR, '2026-videos.json'), 'utf8')) as Record<string, string>;
const venues = JSON.parse(readFileSync(join(DIR, '2026-venues.json'), 'utf8')) as { matches: Record<string, { w?: { t: number; mm: number } }> };

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

test('2026 bracket: cards joined by lines, a flag and full name on every card, the final with trophy, stadium, weather and Watch', async ({ page }) => {
  const errors = await open(page, '?view=wc&year=2026&how=bracket');
  await ready(page, 2026);
  const bracket = page.getByTestId('wc-bracket');
  await expect(bracket).toBeVisible();
  // two sides meeting at the final
  expect(await bracket.getByTestId('wc-ko-col').evaluateAll((cs) => cs.map((c) => `${(c as HTMLElement).dataset.side} ${(c as HTMLElement).dataset.stage} ${c.querySelectorAll('.fk-bk-slot [data-testid="wc-tie"]').length}`))).toEqual([
    'left Round of 32 8', 'left Round of 16 4', 'left Quarter-finals 2', 'left Semi-finals 1', 'final Final 1',
    'right Semi-finals 1', 'right Quarter-finals 2', 'right Round of 16 4', 'right Round of 32 8',
  ]);
  // lines: one from every card that feeds another (30), the champion's four in the accent colour
  await expect(bracket.getByTestId('wc-line')).toHaveCount(30);
  await expect(bracket.locator('[data-testid="wc-line"][data-champ]')).toHaveCount(4);
  const strokes = await bracket.getByTestId('wc-line').evaluateAll((ls) => [...new Set(ls.map((l) => `${l.getAttribute('data-champ') ?? 'plain'} ${getComputedStyle(l).stroke}`))]);
  expect(strokes).toHaveLength(2);
  // every line starts on its card's edge and ends on the card it feeds (measured, not assumed)
  const off = await bracket.evaluate((b) => {
    const base = b.getBoundingClientRect();
    const paths = [...b.querySelectorAll('[data-testid="wc-line"]')].map((p) => p.getAttribute('d')!);
    const bad: string[] = [];
    for (const from of b.querySelectorAll<HTMLElement>('[data-feeds]')) {
      const to = b.querySelector<HTMLElement>(`[data-slot="${from.dataset.feeds}"]`)!;
      const a = from.getBoundingClientRect(), t = to.getBoundingClientRect();
      const right = t.left >= a.left;
      const near = (x: number, y: number) => Math.abs(x) < 1.5 && Math.abs(y) < 1.5;
      const hit = paths.some((d) => {
        const m = /^M([\d.]+) ([\d.]+)H[\d.]+V([\d.]+)H([\d.]+)$/.exec(d);
        return !!m && near(Number(m[1]) - ((right ? a.right : a.left) - base.left), Number(m[2]) - (a.top + a.height / 2 - base.top)) && near(Number(m[4]) - ((right ? t.left : t.right) - base.left), Number(m[3]) - (t.top + t.height / 2 - base.top));
      });
      if (!hit) bad.push(from.dataset.slot!);
    }
    return bad;
  });
  expect(off).toEqual([]);
  // every card: two teams, each with a flag and its full name, and one score each
  const cards = await bracket.getByTestId('wc-tie').evaluateAll((cs) => cs.map((c) => ({
    flags: c.querySelectorAll('[data-testid="wc-flag"]').length, names: [...c.querySelectorAll('[data-testid="wc-team"]')].map((n) => n.textContent ?? ''),
    scores: c.querySelectorAll('[data-testid="wc-score"]').length, date: c.querySelector('[data-testid="wc-match"]')?.textContent ?? '', stadium: c.querySelector('[data-testid="wc-stadium"]')?.textContent ?? '',
    roof: c.querySelector('[data-testid="wc-roof"]')?.textContent ?? '', weather: !!c.querySelector('[data-testid="wc-weather"]'), out: c.querySelectorAll('[data-out]').length,
    clipped: [...c.querySelectorAll('[data-testid="wc-team"]')].some((n) => n.scrollWidth > n.clientWidth + 1),
  })));
  expect(cards).toHaveLength(32);
  for (const c of cards) {
    expect(c.flags, c.names.join(' v ')).toBe(2);
    expect(c.names.every((n) => n.length > 3)).toBe(true);
    expect(c.clipped, `${c.names.join(' v ')}: a name is cut`).toBe(false);
    expect(c.scores).toBe(2);
    expect(c.out).toBe(1);
    expect(c.date).toMatch(/^\d{1,2} (Jun|Jul) 2026 · \d\d:\d\d$/);
    expect(c.stadium.length).toBeGreaterThan(5);
    expect(['Open air', 'Roofed', 'Retractable roof']).toContain(c.roof);
    // the weather only under the sky: never under SoFi's fixed roof
    expect(c.weather, `${c.stadium}`).toBe(c.roof !== 'Roofed');
  }
  expect(cards.some((c) => c.roof === 'Roofed')).toBe(true);
  expect(cards.flatMap((c) => c.names)).toContain('Bosnia and Herzegovina');
  // the final: trophy and champion, stadium, weather, a Watch button to FK-67's video, the Google link on the score
  const final = page.locator('[data-testid="wc-ko-col"][data-side="final"] .fk-bk-slot [data-testid="wc-tie"]');
  await expect(final.getByTestId('wc-trophy')).toContainText('Spain');
  await expect(final.getByTestId('wc-stadium')).toContainText('MetLife Stadium');
  await expect(final.getByTestId('wc-roof')).toHaveText('Open air');
  const w = venues.matches['104']!.w!;
  await expect(final.getByTestId('wc-weather')).toHaveText(`${Math.round(w.t)} °C · ${w.mm < 0.05 ? 'no rain' : `${w.mm.toFixed(1)} mm rain`}`);
  const watch = final.getByTestId('wc-video');
  await expect(watch).toHaveText('▶ Watch');
  await expect(watch).toHaveAttribute('href', `https://www.youtube.com/watch?v=${videos['104']}`);
  await expect(watch).toHaveAttribute('target', '_blank');
  await expect(final.getByTestId('wc-score').first()).toHaveAttribute('href', /^https:\/\/www\.google\.com\/search\?q=Spain%20vs%20Argentina/);
  // the final is the biggest card; the third place is a small labelled card under it
  const sizes = await bracket.getByTestId('wc-tie').evaluateAll((cs) => cs.map((c) => ({ n: c.getAttribute('data-n'), w: c.getBoundingClientRect().width, top: c.getBoundingClientRect().top })));
  const fin = sizes.find((s) => s.n === '104')!, third = sizes.find((s) => s.n === '103')!;
  for (const s of sizes) if (s.n !== '104') expect(s.w).toBeLessThan(fin.w);
  expect(third.top).toBeGreaterThan(fin.top);
  await expect(page.getByTestId('wc-third-place')).toContainText('Third place');
  // a team still opens its World Cup history
  await final.getByTestId('wc-team').first().click();
  await expect(page.getByTestId('wc-history')).toHaveAttribute('data-team', 'ESP');
  expect(errors).toEqual([]);
});

test('2026 bracket at 1920 wide: fills the width, no sideways scroll, no text under 12px', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  const errors = await open(page, '?view=wc&year=2026&how=bracket');
  await ready(page, 2026);
  const geo = await page.getByTestId('wc-bracket').evaluate((b) => {
    const sc = b.parentElement!;
    const sizes = [...b.querySelectorAll<HTMLElement>('*')].filter((e) => [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent!.trim())).map((e) => parseFloat(getComputedStyle(e).fontSize));
    const first = b.querySelector('[data-testid="wc-ko-col"]')!.getBoundingClientRect(), cols = b.querySelectorAll('[data-testid="wc-ko-col"]');
    const last = cols[cols.length - 1]!.getBoundingClientRect();
    return { scrollW: sc.scrollWidth, clientW: sc.clientWidth, page: document.documentElement.scrollWidth, vw: innerWidth, minFont: Math.min(...sizes), left: first.left, right: last.right, colW: first.width };
  });
  expect(geo.scrollW).toBeLessThanOrEqual(geo.clientW);
  expect(geo.page).toBeLessThanOrEqual(geo.vw);
  expect(geo.minFont).toBeGreaterThanOrEqual(12);
  // edge to edge: the outer columns reach the page's margins (the old bracket capped its columns at 150px)
  expect(geo.right - geo.left).toBeGreaterThan(geo.vw * 0.93);
  expect(geo.colW).toBeGreaterThan(165);
  await page.screenshot({ path: 'test-output/fk69/bracket-2026.png', fullPage: true });
  expect(errors).toEqual([]);
});

test('a narrow window scrolls the bracket sideways instead of shrinking its text', async ({ page }) => {
  await page.setViewportSize({ width: 1100, height: 800 });
  await open(page, '?view=wc&year=2026&how=bracket');
  await ready(page, 2026);
  const geo = await page.getByTestId('wc-bracket').evaluate((b) => {
    const sc = b.parentElement!;
    const sizes = [...b.querySelectorAll<HTMLElement>('*')].filter((e) => [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent!.trim())).map((e) => parseFloat(getComputedStyle(e).fontSize));
    return { scrollW: sc.scrollWidth, clientW: sc.clientWidth, minFont: Math.min(...sizes), zoom: getComputedStyle(b).zoom };
  });
  expect(geo.scrollW).toBeGreaterThan(geo.clientW);
  expect(geo.minFont).toBeGreaterThanOrEqual(12);
  expect(geo.zoom).toBe('1');
});

test('older editions: what the data lacks is left off; a team with no flag gets its code; a replay and a walkover', async ({ page }) => {
  const errors = await open(page, '?view=wc&year=1974&how=bracket');
  await ready(page, 1974);
  const final = page.locator('[data-testid="wc-ko-col"][data-side="final"] .fk-bk-slot [data-testid="wc-tie"]');
  await expect(final.getByTestId('wc-stadium')).toHaveText('Olympiastadion');
  await expect(final.getByTestId('wc-trophy')).toContainText('West Germany');
  await expect(page.getByTestId('wc-roof')).toHaveCount(0);
  await expect(page.getByTestId('wc-weather')).toHaveCount(0);
  await expect(page.getByTestId('wc-video')).toHaveCount(0);
  await expect(final.getByTestId('wc-flag')).toHaveCount(2);
  // 1962: Czechoslovakia and Yugoslavia have no flag in the set: a tile with the code, never another country's flag
  await page.getByTestId('what-edition').getByRole('radio', { name: '1962', exact: true }).click();
  await ready(page, 1962);
  const csk = page.locator('[data-testid="wc-side"][data-team="CSK"]').first();
  await expect(csk.getByTestId('wc-noflag')).toBeVisible();
  await expect(csk.getByTestId('wc-flag')).toHaveCount(0);
  await expect(csk.getByTestId('wc-team')).toHaveText('Czechoslovakia');
  // 1938: a walkover slot (no match) and replays (the earlier match listed on the card)
  await page.getByTestId('what-edition').getByRole('radio', { name: '1938', exact: true }).click();
  await ready(page, 1938);
  await expect(page.getByTestId('wc-empty')).toHaveCount(1);
  await expect(page.locator('.fk-bk-earlier').first()).toContainText('Earlier match');
  const lines = await page.getByTestId('wc-line').count();
  expect(lines).toBe(8 + 4 + 2);
  expect(errors).toEqual([]);
});

test('FK-70 Poster: flag tiles and names only, 32 outer tiles, the champion in the middle, copied as an image', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  const errors = await open(page, '?view=wc&year=2026&how=bracket');
  await ready(page, 2026);
  await expect(page.getByTestId('wc-poster')).toHaveCount(0);
  const sw = page.getByTestId('wc-poster-switch');
  await expect(sw).toHaveAttribute('aria-pressed', 'false');
  await sw.click();
  await expect(sw).toHaveAttribute('aria-pressed', 'true');
  const poster = page.getByTestId('wc-poster');
  await expect(poster).toBeVisible();
  await expect(page.getByTestId('wc-bracket')).toHaveCount(0);
  await expect(poster.getByTestId('wc-poster-title')).toHaveText('World Cup 2026');
  const outer = poster.locator('[data-testid="wc-poster-tile"][data-outer]');
  await expect(outer).toHaveCount(32);
  const tiles = await outer.evaluateAll((ts) => ts.map((t) => ({ name: t.textContent ?? '', flag: !!t.querySelector('img'), h: t.getBoundingClientRect().height })));
  for (const t of tiles) { expect(t.name.length).toBeGreaterThan(3); expect(t.flag).toBe(true); }
  expect(new Set(tiles.map((t) => t.name)).size).toBe(32);
  const champ = poster.locator('.fk-poster-champion [data-testid="wc-poster-tile"]');
  await expect(champ).toHaveText('Spain');
  // tiles grow toward the middle; half of each round's teams are dimmed (out)
  expect((await champ.boundingBox())!.height).toBeGreaterThan(tiles[0]!.h * 2);
  await expect(outer.locator('xpath=self::*[@data-out]')).toHaveCount(16);
  // lines: every tile but the champion's feeds one
  await expect(poster.getByTestId('wc-line')).toHaveCount(62);
  // teams only: no scores, dates, weather or Watch
  await expect(poster).not.toContainText(/°C|Watch|Stadium|\d{1,2} (Jun|Jul) 2026/);
  await expect(poster.getByTestId('wc-score')).toHaveCount(0);
  const box = (await poster.boundingBox())!;
  await page.screenshot({ path: 'test-output/fk69/poster-2026.png', fullPage: true });
  // copy as image: a PNG of the poster on the clipboard, at its size (4× pixels)
  await page.getByTestId('wc-knockout').getByTestId('copy').click();
  await expect(page.getByTestId('wc-knockout').getByTestId('copy')).toBeEnabled();
  const img = await page.evaluate(async () => {
    const [item] = await navigator.clipboard.read();
    const bmp = await createImageBitmap(await item!.getType('image/png'));
    const c = new OffscreenCanvas(bmp.width, bmp.height); const g = c.getContext('2d')!; g.drawImage(bmp, 0, 0);
    const d = g.getImageData(0, 0, bmp.width, bmp.height).data;
    let inked = 0; for (let i = 3; i < d.length; i += 4 * 97) if (d[i]! > 0) inked++;
    return { w: bmp.width, h: bmp.height, inked };
  });
  expect(img.w / img.h).toBeCloseTo(box.width / box.height, 1);
  expect(img.w).toBeGreaterThan(box.width);
  expect(img.inked).toBeGreaterThan(1000);
  // back to the cards
  await sw.click();
  await expect(page.getByTestId('wc-bracket')).toBeVisible();
  await expect(page.getByTestId('wc-poster')).toHaveCount(0);
  expect(errors).toEqual([]);
});
