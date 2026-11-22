// FK-76 / FK-77: the Slate kit (src/slate/kit.ts), loaded by the gauntlet's whiteboard at run time from
// /football/slatekit/. Removing or changing one of these names needs SLATEKIT_API bumped, so an older gauntlet keeps
// its own pinned copy instead of breaking. The kit is built here into a scratch folder to check what a build writes.
// @vitest-environment node
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { build } from 'vite';

// what a host needs to draw footykit's Slate: the whole day (FK-76), one card and the day's list (FK-77), the data,
// the notes store, the card sizes
const USED = [
  'SlateDay', 'SlateMatchCard', 'slateMatches', 'slateDayOf', 'SLATE_DAY_ZONE', 'SLATE_DAY_START_HOUR', 'loadFootyData', 'loadSnapshot', 'SNAPSHOT_URL', 'teamCalendarUrl', 'matchUrl',
  'createNotesStore', 'localNotesStore', 'mergeNotes', 'parseNotes', 'NOTES_KEY', 'EMPTY_NOTE', 'SLOTS', 'SAVE_DELAY_MS',
  'copyColumns', 'COPY_GAP', 'COPY_MARGIN', 'COPY_PAGE', 'slateHeaderLabel', 'SLATE_CARD_WIDTH', 'SLATE_CARD_HEIGHT', 'SLATE_INFO_WIDTH', 'SLATEKIT_API',
];

describe('the Slate kit', () => {
  it('is built with the app, with React from the page, and no cache on the manifest (both addresses)', () => {
    const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as { scripts: { build: string } };
    expect(pkg.scripts.build).toContain('vite build --config vite.slatekit.config.ts');
    // after the app's build: the kit is added to dist/, never the other way round (the app's build empties dist/)
    expect(pkg.scripts.build.indexOf('vite build --config vite.slatekit.config.ts')).toBeGreaterThan(pkg.scripts.build.indexOf('vite build'));
    const config = readFileSync('vite.slatekit.config.ts', 'utf8');
    expect(config).toContain('globalThis.__footykitHost');
    expect(config).toContain("'react/jsx-runtime'");
    expect(config).toContain('emptyOutDir: false');
    const vercel = JSON.parse(readFileSync('vercel.json', 'utf8')) as { headers: { source: string; headers: { key: string; value: string }[] }[] };
    for (const source of ['/slatekit/manifest.json', '/football/slatekit/manifest.json'])
      expect(vercel.headers.find((h) => h.source === source)?.headers, source).toEqual([{ key: 'Cache-Control', value: 'no-cache' }]);
  });

  it('has an API version, written as the manifest reads it', () => {
    expect(/export const SLATEKIT_API = (\d+);/.exec(readFileSync('src/slate/kit.ts', 'utf8'))?.[1]).toBe('1');
  });

  describe('after a build', () => {
    let dir = '';
    let manifest: { api: number; version: string; js: string; css: string | null };
    const file = (address: string) => join(dir, address.replace(/^\/football\//, ''));
    beforeAll(async () => {
      dir = mkdtempSync(join(tmpdir(), 'fk-slatekit-'));
      await build({ configFile: 'vite.slatekit.config.ts', logLevel: 'silent', build: { outDir: dir } });
      manifest = JSON.parse(readFileSync(join(dir, 'slatekit', 'manifest.json'), 'utf8')) as typeof manifest;
    }, 120_000);
    afterAll(() => { if (dir) rmSync(dir, { recursive: true, force: true }); });

    it('the manifest has api, version, js and css, and the files exist', () => {
      expect(Object.keys(manifest).sort()).toEqual(['api', 'css', 'js', 'version']);
      expect(manifest.api).toBe(1);
      expect(manifest.version).toBe((JSON.parse(readFileSync('package.json', 'utf8')) as { version: string }).version);
      expect(manifest.js).toMatch(/^\/football\/slatekit\/slatekit-[\w-]+\.js$/);
      expect(manifest.css).toMatch(/^\/football\/slatekit\/[\w-]+\.css$/);
      expect(existsSync(file(manifest.js))).toBe(true);
      expect(existsSync(file(manifest.css!))).toBe(true);
    });

    it('the kit is one module with every name a host uses; React is the page\'s, not a second copy', () => {
      const js = readFileSync(file(manifest.js), 'utf8');
      const exported = /export\s*\{([^}]*)\}\s*;?\s*$/.exec(js.trim())?.[1]?.split(',').map((s) => s.trim().split(/\s+as\s+/).pop()!) ?? [];
      for (const name of USED) expect(exported, name).toContain(name);
      expect(js).toContain('globalThis.__footykitHost');
      expect(js).not.toMatch(/\bfrom\s*["']react/); // nothing left to import: the page hands React over
      expect(js).not.toContain('react.production'); // React itself is not inside
      expect(js).not.toMatch(/\bimport\(/); // one file: no lazy chunk a host would have to find
      // the cards' styles came with it
      const css = readFileSync(file(manifest.css!), 'utf8');
      for (const cls of ['.fk-card', '.fk-slate', '.fk-slate-one', '.fk-slate-header']) expect(css, cls).toContain(cls);
    });
  });
});
