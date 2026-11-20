// FK-66: the World Cup section against the quality bar (backlogkit's NAV_PATTERN.md §5): fast (edition, view and a
// simulator change under 100 ms on 2026, the biggest edition), no layout jumps between editions (neighbours preloaded,
// never a "Loading…" frame), plain words (every abbreviation explained), everything clickable (every team name, match
// square, score and table row in 2002 and 2026), and screenshots of Groups / Bracket / Simulator for 1930, 2002, 2026.
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
const edition = (page: Page, y: number) => page.getByTestId('what-edition').locator(`[data-value="${y}"]`).click();
const how = (page: Page, name: string) => page.getByTestId('how').getByRole('tab', { name, exact: true }).click();
const ready = (page: Page, y: number) => expect(page.locator(`[data-testid="wc-page"][data-year="${y}"][data-ready]`)).toBeVisible();

/** ms from a click on `click` to the frame after `done` is on screen. */
const timed = (page: Page, click: string, done: string) => page.evaluate(async ({ click, done }) => {
  const t0 = performance.now();
  (document.querySelector(click) as HTMLElement).click();
  while (!document.querySelector(done)) await new Promise((r) => requestAnimationFrame(r));
  await new Promise((r) => requestAnimationFrame(r));
  return performance.now() - t0;
}, { click, done });

test('fast: on 2026, an edition switch, a view switch and a simulator change each reach the screen in under 100 ms', async ({ page }) => {
  const errors = await open(page, '?view=wc&year=2022&how=groups');
  await ready(page, 2022);
  await edition(page, 2026); await ready(page, 2026);
  await edition(page, 2022); await ready(page, 2022);
  const ed = await timed(page, '[data-testid="what-edition"] [data-value="2026"]', '[data-testid="wc-page"][data-year="2026"][data-ready] [data-testid="wc-group"]');
  await how(page, 'Bracket'); await expect(page.getByTestId('wc-bracket')).toBeVisible();
  const view = await timed(page, '[data-testid="how"] [data-value="groups"]', '[data-testid="wc-group"]');
  await how(page, 'Simulator'); await expect(page.getByTestId('wc-sim')).toBeVisible();
  const simView = await timed(page, '[data-testid="how"] [data-value="bracket"]', '[data-testid="wc-bracket"]');
  await how(page, 'Simulator'); await expect(page.getByTestId('wc-sim')).toBeVisible();
  // a simulator change: the first group match's away win, until the change count says so
  const sim = await timed(page, '[data-testid="wc-sim-match"] [data-testid="wc-fast-2"]:not([aria-pressed="true"])', '[data-testid="wc-sim-match"][data-changed]');
  console.log(`FK-66 timings on 2026 (ms): edition ${ed.toFixed(0)}, groups ${view.toFixed(0)}, bracket from simulator ${simView.toFixed(0)}, simulator change ${sim.toFixed(0)}`);
  for (const t of [ed, view, simView, sim]) expect(t).toBeLessThan(100);
  expect(errors).toEqual([]);
});

test('no jumps: stepping through the editions never shows "Loading…", the neighbours are preloaded, the page never moves', async ({ page }) => {
  const fetched: string[] = [];
  page.on('request', (r) => { const m = /worldcup\/(\d{4})\.json/.exec(r.url()); if (m) fetched.push(m[1]!); });
  const errors = await open(page, '?view=wc&year=2002');
  await ready(page, 2002);
  // two editions each way fetched without being asked for
  await expect.poll(() => [...new Set(fetched)].sort()).toEqual(['1994', '1998', '2002', '2006', '2010']);
  // a loading frame anywhere in the page while stepping 2002 → 1930 and back up to 2026
  await page.evaluate(() => {
    const w = window as { __loading?: number };
    w.__loading = 0;
    new MutationObserver(() => { if (document.querySelector('[data-testid="wc-loading"]') || /Loading…/.test(document.querySelector('[data-testid="wc-page"]')?.textContent ?? '')) w.__loading!++; })
      .observe(document.body, { subtree: true, childList: true, characterData: true });
  });
  const head = async () => (await page.getByTestId('wc-page').locator('h2').boundingBox())!.y;
  const y0 = await head();
  const years = [1998, 1994, 1990, 1986, 1982, 1978, 1974, 1970, 1966, 1962, 1958, 1954, 1950, 1938, 1934, 1930];
  for (const y of years) {
    await edition(page, y);
    await ready(page, y);
    expect(await head(), `heading moved at ${y}`).toBe(y0);
  }
  for (const y of [1934, 1938, 1950, 1954, 1958, 1962, 1966, 1970, 1974, 1978, 1982, 1986, 1990, 1994, 1998, 2002, 2006, 2010, 2014, 2018, 2022, 2026]) {
    await edition(page, y);
    await ready(page, y);
    expect(await head(), `heading moved at ${y}`).toBe(y0);
  }
  expect(await page.evaluate(() => (window as { __loading?: number }).__loading)).toBe(0);
  expect(errors).toEqual([]);
});

test('no jumps: layout shift ≈ 0 on load for 1930, 1950, 2002 and 2026 in each view', async ({ page }) => {
  await page.addInitScript(() => {
    const w = window as { __cls?: number };
    w.__cls = 0;
    new PerformanceObserver((l) => { for (const e of l.getEntries() as (PerformanceEntry & { value: number; hadRecentInput: boolean })[]) if (!e.hadRecentInput) w.__cls! += e.value; }).observe({ type: 'layout-shift', buffered: true });
  });
  const errors = await open(page);
  const out: string[] = [];
  for (const y of [1930, 1950, 2002, 2026]) for (const h of ['', '&how=groups', '&how=bracket', '&sim=1']) {
    await page.goto(`/football/?view=wc&year=${y}${h}`);
    await ready(page, y);
    await page.waitForTimeout(300);
    const cls = await page.evaluate(() => (window as { __cls?: number }).__cls ?? 0);
    out.push(`${y}${h} ${cls.toFixed(3)}`);
    expect(cls, `${y}${h}`).toBeLessThan(0.02);
  }
  console.log(`FK-66 CLS on load: ${out.join(' · ')}`);
  expect(errors).toEqual([]);
});

/**
 * Every visible text in the World Cup page that names a team or abbreviates something: a team name sits in a link or
 * button that looks clickable; an abbreviation has a hover explanation (a title on it or around it).
 */
async function audit(page: Page) {
  return page.evaluate(async () => {
    const root = document.querySelector('[data-testid="wc-page"]')!;
    const year = (root as HTMLElement).dataset.year;
    const ed = await (await fetch(`/football/worldcup/${year}.json`)).json() as { teams: Record<string, string>; fifa?: Record<string, string> };
    const names = new Set([...Object.values(ed.teams), ...Object.values(ed.fifa ?? {})]);
    const ABBR = /^(#|P|W|D|L|GD|GF|GA|Pts|Grp|R16|R32|QF|SF|AET|a\.e\.t\.|pens|vs|@|=|M\d+|X)$/;
    const bad: string[] = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const el = n.parentElement!;
      if (!el.checkVisibility() || el.closest('input, [data-testid="wc-rules"]')) continue;
      const text = (n.textContent ?? '').trim();
      if (names.has(text)) {
        const c = el.closest('a, button');
        const cs = c && getComputedStyle(c);
        if (!c || cs!.cursor !== 'pointer') bad.push(`team not clickable: ${text}`);
        else if (c.matches('.fk-wc-name') && !cs!.textDecorationLine.includes('underline')) bad.push(`team looks like plain text: ${text}`);
      }
      for (const t of text.split(/[\s·()]+/).filter(Boolean)) {
        if (ABBR.test(t) && !el.closest('[title], abbr[title]')) bad.push(`unexplained "${t}" in <${el.tagName.toLowerCase()} class="${el.className}">`);
      }
    }
    // match squares and scores: links to the match with its details on hover
    for (const a of root.querySelectorAll('[data-testid="wc-square"], [data-testid="wc-match"], [data-testid="wc-score"]')) {
      if (a.tagName !== 'A' || !(a as HTMLAnchorElement).href || !a.getAttribute('title')) bad.push(`match not a link with a hover: ${a.textContent}`);
    }
    // every table row does something
    for (const tr of root.querySelectorAll('tbody tr')) if (getComputedStyle(tr).cursor !== 'pointer') bad.push(`row does nothing: ${tr.textContent?.slice(0, 40)}`);
    return [...new Set(bad)];
  });
}

for (const y of [2002, 2026]) {
  test(`clickable and plain words: ${y}'s groups, bracket and simulator`, async ({ page }) => {
    const errors = await open(page, `?view=wc&year=${y}&how=groups`);
    await ready(page, y);
    expect(await audit(page), 'groups').toEqual([]);
    await how(page, 'Bracket'); await ready(page, y);
    expect(await audit(page), 'bracket').toEqual([]);
    await how(page, 'Simulator'); await expect(page.getByTestId('wc-sim')).toBeVisible();
    expect(await audit(page), 'simulator (fast)').toEqual([]);
    await page.getByTestId('wc-sim-mode').getByRole('tab', { name: /Detailed/ }).click();
    expect(await audit(page), 'simulator (detailed)').toEqual([]);
    expect(errors).toEqual([]);
  });
}

test(`clickable: a group row, a bracket score, the champion and a simulator team each open what they say`, async ({ page }) => {
  const errors = await open(page, '?view=wc&year=2002&how=groups');
  await ready(page, 2002);
  // a row's points cell → the team's history
  const row = page.locator('[data-testid="wc-group"][data-group="Group A"]').getByTestId('wc-row').first();
  const team = await row.getAttribute('data-team');
  await row.locator('.fk-pts').click();
  await expect(page.getByTestId('wc-history')).toHaveAttribute('data-team', team!);
  await expect(page).toHaveURL(new RegExp(`team=${team}`));
  // the champion in the summary → its history
  await page.getByTestId('wc-champion').click();
  await expect(page.getByTestId('wc-history')).toHaveAttribute('data-team', 'BRA');
  // a bracket score → the match search
  await how(page, 'Bracket');
  const score = page.locator('[data-testid="wc-ko-col"][data-side="final"]').getByTestId('wc-score').first();
  expect(await score.getAttribute('href')).toContain('google.com/search');
  // the simulator: a team name opens its history
  await how(page, 'Simulator');
  await page.locator('[data-testid="wc-sim-group"][data-group="Group F"]').getByTestId('wc-team').first().click();
  await expect(page.getByTestId('wc-history')).toBeVisible();
  await expect(page.getByTestId('wc-sim')).toBeVisible();
  expect(errors).toEqual([]);
});

test('report: screenshots of Groups, Bracket and Simulator for 1930, 2002 and 2026', async ({ page }) => {
  const dir = 'test-output/fk66';
  mkdirSync(dir, { recursive: true });
  await page.setViewportSize({ width: 1920, height: 1080 });
  await open(page);
  for (const y of [1930, 2002, 2026]) for (const [name, h] of [['groups', '&how=groups'], ['bracket', '&how=bracket'], ['simulator', '&sim=1']]) {
    await page.goto(`/football/?view=wc&year=${y}${h}`);
    await ready(page, y);
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${dir}/${y}-${name}.png` });
  }
});
