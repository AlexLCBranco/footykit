// FK-76 / FK-77: the Slate kit as a host outside footykit loads it: the manifest answers, its module imports in a
// blank page that hands over its own React, draws a day's Slate with the same cards as the site's Slate, and draws one
// match's card alone, the same size and content as that card on the site.
//
// Against the local build by default (the recorded fixture, a fixed clock). On the live site:
//   npm run e2e:live-kit            (SLATEKIT_SITE=https://footykit.vercel.app; there the manifest's no-cache header is
//   checked too, and the day is the next one with matches).
import { build } from 'esbuild';
import { expect, test, type Page } from '@playwright/test';

const SITE = (process.env.SLATEKIT_SITE ?? 'http://localhost:4190').replace(/\/$/, '');
const LIVE = !!process.env.SLATEKIT_SITE;
const NOW = '2026-11-21T15:00:00Z';
const TZ = 'America/Sao_Paulo';

/** The host page's own React, as the gauntlet hands it to the kit (globalThis.__footykitHost), bundled once. */
let hostScript: Promise<string> | undefined;
const host = () => (hostScript ??= build({
  stdin: {
    contents: `import * as react from 'react'; import * as jsxRuntime from 'react/jsx-runtime'; import * as reactDom from 'react-dom'; import { createRoot } from 'react-dom/client';
      globalThis.__footykitHost = { react, jsxRuntime, reactDom }; globalThis.__createRoot = createRoot;`,
    resolveDir: process.cwd(),
  },
  bundle: true, format: 'iife', write: false, minify: true, define: { 'process.env.NODE_ENV': '"production"' },
}).then((r) => r.outputFiles[0]!.text));

interface Card { id: string; label: string; w: number; h: number; text: string }
const cards = (page: Page, scope: string) => page.locator(`${scope} [data-testid="slate-card"]`).evaluateAll((els) => els.map((e) => {
  const r = e.getBoundingClientRect();
  // the time, the two team rows and the stadium line: what the card says
  const text = [...e.querySelectorAll('.fk-card-time, .fk-card-rows, .fk-card-venue')].map((x) => x.textContent!.trim()).join(' | ');
  return { id: e.getAttribute('data-match-id')!, label: e.getAttribute('aria-label')!, w: Math.round(r.width), h: Math.round(r.height), text };
}));

/** A blank page on the site's origin with React handed over, the kit imported, and the data loaded. Returns the day to draw. */
async function blankHost(page: Page): Promise<{ day: string; api: number }> {
  await page.route('**/football/__blank.html', (r) => r.fulfill({ contentType: 'text/html', body: '<!doctype html><html><body style="margin:0;background:#0f1115"><div id="root"></div></body></html>' }));
  await page.goto(`${SITE}/football/__blank.html`);
  await page.addScriptTag({ content: await host() });
  return page.evaluate(async ({ tz, now, live }) => {
    const manifest = await (await fetch('/football/slatekit/manifest.json', { cache: 'no-store' })).json() as { api: number; js: string; css: string };
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = manifest.css;
    document.head.append(link);
    await new Promise((ok, bad) => { link.onload = ok; link.onerror = bad; });
    const kit = await import(manifest.js);
    const data = await kit.loadFootyData(tz);
    // local build: the fixture's day; live: the first day from today on with a match
    let day = kit.slateDayOf(live ? Date.now() : now) as string;
    for (let i = 0; live && i < 60 && !kit.slateMatches(data, day).length; i++) day = new Date(Date.parse(`${day}T12:00:00Z`) + 86_400_000).toISOString().slice(0, 10);
    Object.assign(window, { __kit: kit, __data: data });
    return { day, api: manifest.api };
  }, { tz: TZ, now: NOW, live: LIVE });
}
const draw = (page: Page, what: 'SlateDay' | 'SlateMatchCard', props: Record<string, unknown>) => page.evaluate(({ what, props, tz, now }) => {
  const w = window as unknown as { __kit: Record<string, unknown>; __data: unknown; __footykitHost: { react: { createElement: (...a: unknown[]) => unknown } }; __createRoot: (el: Element) => { render: (n: unknown) => void }; __root?: { render: (n: unknown) => void } };
  w.__root ??= w.__createRoot(document.getElementById('root')!);
  w.__root.render(w.__footykitHost.react.createElement(w.__kit[what], { data: w.__data, timeZone: tz, ...(now ? { now: Date.parse(now) } : {}), ...props }));
}, { what, props, tz: TZ, now: LIVE ? '' : NOW });

/** The site's own Slate on `day` (the address never reads a date, so the day is picked on the page). */
async function siteSlate(page: Page, day: string): Promise<Card[]> {
  if (!LIVE) await page.addInitScript((n) => { (window as { __FK_NOW__?: string }).__FK_NOW__ = n; }, NOW);
  // the Slate part has never drawn the small tags beside the teams (ctx.ts: a host gets none), so the site's cards are
  // read with its Tags setting on "Hide tags": everything else on the card must be the same
  await page.addInitScript(() => localStorage.setItem('fk:tags:v1', 'off'));
  await page.route(/api.open-meteo.com/, (r) => r.fulfill({ json: {} }));
  await page.goto(`${SITE}/football/?view=slate`);
  await expect(page.getByTestId('footy')).toBeVisible();
  await page.getByLabel('Pick a date').fill(day);
  await expect(page.getByTestId('slate-header')).toContainText(`${day.slice(8, 10)}-${day.slice(5, 7)}`);
  await expect(page.getByTestId('slate-card').first()).toBeVisible();
  return cards(page, '[data-testid="slate"]');
}

test.use({ timezoneId: TZ });

test('the manifest answers with api, version, js and css; the files it names answer too', async ({ request }) => {
  for (const path of ['/football/slatekit/manifest.json', ...(LIVE ? ['/slatekit/manifest.json'] : [])]) {
    const r = await request.get(`${SITE}${path}`);
    expect(r.status(), path).toBe(200);
    if (LIVE) expect(r.headers()['cache-control'], path).toBe('no-cache');
    const m = await r.json() as { api: number; version: string; js: string; css: string };
    expect(m.api, path).toBe(1);
    expect(m.version, path).toMatch(/^\d+\.\d+\.\d+$/);
    expect(m.js, path).toMatch(/^\/football\/slatekit\/slatekit-[\w-]+\.js$/);
    expect(m.css, path).toMatch(/^\/football\/slatekit\/[\w-]+\.css$/);
    for (const f of [m.js, m.css]) expect((await request.get(`${SITE}${f}`)).status(), f).toBe(200);
    // the kit's version is the site's
    const v = await (await request.get(`${SITE}/football/version.json`)).json() as { version: string };
    expect(m.version, path).toBe(v.version);
  }
});

test("FK-76: the kit's module imports in a blank page and draws a day's Slate with the same cards as the site's Slate", async ({ page, context }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  const { day, api } = await blankHost(page);
  expect(api).toBe(1);
  await draw(page, 'SlateDay', { day, gameMenu: true });
  await expect(page.getByTestId('slate-day')).toBeVisible();
  await expect(page.getByTestId('slate-card').first()).toBeVisible();
  const fromKit = await cards(page, '[data-testid="slate-day"]');
  const onSite = await siteSlate(await context.newPage(), day);
  expect(fromKit.length).toBeGreaterThan(0);
  expect(fromKit.map((c) => c.id)).toEqual(onSite.map((c) => c.id));
  expect(fromKit.map((c) => c.label)).toEqual(onSite.map((c) => c.label));
  // the same card, the same size (561 × 96 without notes), nothing redrawn
  for (const c of fromKit) expect([c.w, c.h], c.label).toEqual([561, 96]);
  expect(fromKit.map((c) => [c.w, c.h])).toEqual(onSite.map((c) => [c.w, c.h]));
  if (!LIVE) expect(fromKit.map((c) => c.text)).toEqual(onSite.map((c) => c.text)); // live: a score may arrive between the two reads
  expect(errors).toEqual([]);
});

test("FK-77: the day's list is in start order, and one card drawn alone is the same size and content as that match's card in the site's Slate", async ({ page, context }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  const { day } = await blankHost(page);
  const list = await page.evaluate((d) => {
    const w = window as unknown as { __kit: { slateMatches: (data: unknown, day: string) => { id: string; start: string; startMs: number }[] }; __data: unknown };
    return w.__kit.slateMatches(w.__data, d);
  }, day);
  expect(list.length).toBeGreaterThan(0);
  expect(list.map((m) => m.startMs)).toEqual([...list.map((m) => m.startMs)].sort((a, b) => a - b));
  for (const m of list) expect(Date.parse(m.start)).toBe(m.startMs);
  const onSite = await siteSlate(await context.newPage(), day);
  // the list is the site's Slate of that day (São Paulo time; no football starts before 05:00)
  expect([...list.map((m) => m.id)].sort()).toEqual([...onSite.map((c) => c.id)].sort());
  // the first, a middle and the last match, each drawn alone
  for (const m of [list[0]!, list[Math.floor(list.length / 2)]!, list.at(-1)!]) {
    await draw(page, 'SlateMatchCard', { matchId: m.id, gameMenu: true });
    await expect(page.locator(`[data-testid="slate-match"] [data-match-id="${m.id}"]`)).toBeVisible();
    await expect(page.getByTestId('slate-card')).toHaveCount(1);
    const [alone] = await cards(page, '[data-testid="slate-match"]');
    const there = onSite.find((c) => c.id === m.id)!;
    expect([alone!.w, alone!.h], there.label).toEqual([there.w, there.h]);
    expect([alone!.w, alone!.h], there.label).toEqual([561, 96]);
    expect(alone!.label).toBe(there.label);
    if (!LIVE) expect(alone!.text).toBe(there.text);
  }
  expect(errors).toEqual([]);
});
