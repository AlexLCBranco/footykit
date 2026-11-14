import { defineConfig } from 'vitest/config';
import type { Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { FOOTYKIT_BASE } from './src/address';

// Site version: package.json's "version" (bumped with every app change; scripts/check-version.ts enforces it in CI),
// shown bottom-right, plus the commit it was built from (Vercel and GitHub Actions pass it; locally git, "+" when the
// working tree has uncommitted changes). Both are in /version.json (no-cache, vercel.json).
const git = (cmd: string) => {
  try {
    return execSync(`git ${cmd}`, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  } catch {
    return '';
  }
};
const sha = (process.env.VERCEL_GIT_COMMIT_SHA || process.env.GITHUB_SHA || git('rev-parse HEAD')).slice(0, 7);
const dirty = !process.env.VERCEL_GIT_COMMIT_SHA && !process.env.GITHUB_SHA && git('status --porcelain') !== '';
const BUILD = { version: (JSON.parse(readFileSync('package.json', 'utf8')) as { version: string }).version, commit: sha ? `${sha}${dirty ? '+' : ''}` : 'dev', builtAt: new Date().toISOString() };

// The snapshot lives in Vercel Blob in production. Locally: `vite` (dev) serves the last `update-snapshot` run
// (test-output/snapshot.json) if there is one, `vite preview` — what e2e runs against — always the recorded fixture,
// so tests never depend on ESPN. The day function: dev runs the real one (live ESPN), preview answers an empty day
// (the tests that need one route the request to a fixture).
const SNAPSHOT_PATH = `${FOOTYKIT_BASE}data/snapshot.json`;
const DAY_PATH = `${FOOTYKIT_BASE}api/day`;
const FIXTURE = 'tests/fixtures/snapshot.json';
const localData: Plugin = {
  name: 'footykit-local-data',
  configureServer(server) {
    server.middlewares.use(SNAPSHOT_PATH, (_req, res) => {
      res.setHeader('content-type', 'application/json');
      res.end(readFileSync(existsSync('test-output/snapshot.json') ? 'test-output/snapshot.json' : FIXTURE));
    });
    server.middlewares.use(DAY_PATH, async (req, res) => {
      const { GET } = await server.ssrLoadModule('/api/day.ts');
      const r: Response = await GET(new Request(new URL(req.url ?? '', 'http://localhost' + DAY_PATH)));
      res.statusCode = r.status;
      res.setHeader('content-type', 'application/json');
      res.end(await r.text());
    });
  },
  configurePreviewServer(server) {
    server.middlewares.use(SNAPSHOT_PATH, (_req, res) => {
      res.setHeader('content-type', 'application/json');
      res.end(readFileSync(FIXTURE));
    });
    server.middlewares.use(DAY_PATH, (req, res) => {
      res.setHeader('content-type', 'application/json');
      const date = new URL(req.url ?? '', 'http://localhost').searchParams.get('date');
      res.end(JSON.stringify({ date, fetchedAt: new Date(0).toISOString(), matches: [], odds: {} }));
    });
  },
};

const TIME_ZONES = ['America/Sao_Paulo', 'Europe/London'];
const TZ_TESTS = ['tests/**/*.tz.test.ts', 'tests/**/*.tz.test.tsx'];

export default defineConfig({
  base: FOOTYKIT_BASE,
  plugins: [react(), localData, { name: 'version-json', generateBundle() { this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify(BUILD) }); } }],
  define: { __APP_VERSION__: JSON.stringify(BUILD.version), __APP_COMMIT__: JSON.stringify(BUILD.commit), __BUILT_AT__: JSON.stringify(BUILD.builtAt) },
  test: {
    projects: [
      { extends: true, test: { name: 'unit', include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'], exclude: TZ_TESTS, env: { TZ: 'UTC' }, environment: 'jsdom' } },
      ...TIME_ZONES.map((tz) => ({ extends: true, test: { name: `tz:${tz}`, include: TZ_TESTS, env: { TZ: tz }, environment: 'jsdom' } })),
    ],
  },
});
