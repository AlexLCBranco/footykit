// node scripts/parity-shots.mjs <before|after> [pair] — footykit (5190) ↔ calendarkit (5180) screenshot pairs at 1920×911
// into docs/parity/<phase>/<pair>-footykit.jpg / -calendarkit.jpg (FK-25).
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
const phase = process.argv[2] ?? 'before';
const only = process.argv[3];
const dir = `docs/parity/${phase}`;
mkdirSync(dir, { recursive: true });
const FK = 'http://localhost:5190/football/', CK = 'http://localhost:5180/calendar/';
const hover = (sel, nth = 0) => async (p) => { await p.locator(sel).nth(nth).hover(); await p.waitForTimeout(500); };
const click = (sel) => async (p) => { await p.locator(sel).first().click(); await p.waitForTimeout(700); };
const PAIRS = [
  ['day-list', [FK], [CK + '?view=league&layout=list']],
  ['team-calendar-month', [FK + '?view=cal&team=359&span=month'], [CK + '?view=team&layout=calendar&team=BOS']],
  ['team-calendar-2w', [FK + '?view=cal&team=359&span=2'], [CK + '?view=team&layout=calendar&team=BOS&span=2w']],
  ['team-calendar-1w', [FK + '?view=cal&team=359&span=1'], [CK + '?view=team&layout=calendar&team=BOS&span=1w']],
  ['team-list', [FK + '?view=list&team=359'], [CK + '?view=team&layout=list&team=BOS']],
  ['slate-notes-hidden', [FK + '?view=slate'], [CK + '?view=league&layout=slate']],
  ['slate-notes-shown', [FK + '?view=slate', click('[data-testid="hide-notes"]')], [CK + '?view=league&layout=slate', click('[data-testid="notes-hide"]')]],
  ['tables', [FK + '?view=table&league=eng.1'], [CK + '?view=standings']],
  ['quick-standings', [FK, click('[data-testid="standings-button"]')], [CK + '?view=league&layout=list', click('[data-testid="standings-button"]')]],
  ['hover-form', [FK, hover('[data-testid="match-row"] [data-testid="form"]')], [CK + '?view=league&layout=list', hover('[data-testid="row-streak"]')]],
  ['hover-series', [FK, click('[data-testid="match-row"] .fk-series-chip')], [CK + '?view=league&layout=list', hover('[data-testid="series-chip"]')]],
];
const b = await chromium.launch();
try {
  for (const [name, fk, ck] of PAIRS) {
    if (only && name !== only) continue;
    for (const [app, [url, act]] of [['footykit', fk], ['calendarkit', ck]]) {
      const p = await b.newPage({ viewport: { width: 1920, height: 911 }, timezoneId: 'America/Sao_Paulo', locale: 'en-US' });
      await p.addInitScript(() => { window.__FK_NOW__ = '2026-11-21T15:00:00Z'; });
      await p.goto(url);
      await p.waitForLoadState('networkidle').catch(() => {});
      await p.waitForTimeout(1200);
      if (act) await act(p).catch((e) => console.log(name, app, 'action failed:', String(e).split('\n')[0]));
      await p.screenshot({ path: `${dir}/${name}-${app}.jpg`, type: 'jpeg', quality: 72 });
      await p.close();
    }
    console.log('ok', name);
  }
} finally { await b.close(); }
