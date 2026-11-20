// FK-69: copies the flags the World Cup section uses (src/data/wcFlags.ts) from the flag-icons package (MIT,
// https://github.com/lipis/flag-icons) to public/worldcup/flags/, with its licence. Only the flags of teams that played
// a World Cup, so the site ships ~85 small files, not the whole set. Run: npm run make-wc-flags

import { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { WC_FLAGS } from '../src/data/wcFlags.ts';

const FROM = join(import.meta.dirname, '..', 'node_modules', 'flag-icons');
const TO = join(import.meta.dirname, '..', 'public', 'worldcup', 'flags');
mkdirSync(TO, { recursive: true });
for (const f of readdirSync(TO)) rmSync(join(TO, f));
const files = [...new Set(Object.values(WC_FLAGS))].sort();
const missing = files.filter((f) => !existsSync(join(FROM, 'flags', '4x3', `${f}.svg`)));
if (missing.length) throw new Error(`flag-icons has no flag for: ${missing.join(', ')}`);
for (const f of files) copyFileSync(join(FROM, 'flags', '4x3', `${f}.svg`), join(TO, `${f}.svg`));
copyFileSync(join(FROM, 'LICENSE'), join(TO, 'LICENSE-flag-icons.txt'));
console.log(`Copied ${files.length} flags to public/worldcup/flags/`);
