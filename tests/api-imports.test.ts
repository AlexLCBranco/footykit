// Vercel compiles each function file to .js but keeps import paths as written, so a runtime import of "./x.ts" from
// a file api/ loads fails in production (ERR_MODULE_NOT_FOUND). Every runtime relative import reachable from api/
// must name ".js" (TypeScript resolves it to the .ts source). Type-only imports are erased and don't count.

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { expect, it } from 'vitest';

const root = join(import.meta.dirname, '..');
const runtimeImports = (code: string) =>
  [...code.matchAll(/^\s*(import|export)\s+(?!type\b)[^'"]*?from\s+'(\.[^']+)'/gm)].map((m) => m[2]!);

it('every runtime import reachable from api/ uses a .js path', () => {
  const seen = new Set<string>();
  const bad: string[] = [];
  const queue = readdirSync(join(root, 'api')).filter((f) => f.endsWith('.ts')).map((f) => join(root, 'api', f));
  while (queue.length) {
    const file = queue.pop()!;
    if (seen.has(file)) continue;
    seen.add(file);
    for (const spec of runtimeImports(readFileSync(file, 'utf8'))) {
      if (!spec.endsWith('.js')) bad.push(`${file.slice(root.length + 1)} imports '${spec}'`);
      const target = resolve(dirname(file), spec.replace(/\.js$/, '.ts'));
      if (existsSync(target)) queue.push(target);
    }
  }
  expect(seen.size).toBeGreaterThan(2);
  expect(bad).toEqual([]);
});
