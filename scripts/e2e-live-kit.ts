// FK-76 / FK-77: runs the Slate kit's browser tests (e2e/slatekit.spec.ts) against the live site instead of the local
// build: the manifest answers 200 with no-cache at both addresses, its module imports in a blank page and draws the
// next day with matches like the site's own Slate, and one card alone matches its card there.
// Usage: npm run e2e:live-kit [-- --site https://gauntlet-home.vercel.app]   (default: footykit's own Vercel address)
import { spawnSync } from 'node:child_process';

const i = process.argv.indexOf('--site');
const site = (i > 0 && process.argv[i + 1]) || process.env.SLATEKIT_SITE || 'https://footykit.vercel.app';
console.log(`Slate kit, live: ${site}`);
const r = spawnSync('npx', ['playwright', 'test', 'e2e/slatekit.spec.ts'], { stdio: 'inherit', shell: true, env: { ...process.env, SLATEKIT_SITE: site } });
process.exit(r.status ?? 1);
