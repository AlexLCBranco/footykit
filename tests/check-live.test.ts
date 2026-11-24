// The live checks (scripts/check-live.ts) must stay a handful of Vercel requests per run (CLAUDE.md budget rule).
import { describe, expect, it } from 'vitest';
import { WAIT, waitForSnapshot } from '../scripts/check-live';

describe('check-live --expect wait', () => {
  const noSleep = async () => {};

  it('makes at most 10 live requests when the new snapshot never shows', async () => {
    let calls = 0;
    const ok = await waitForSnapshot(async () => { calls++; return 'old'; }, 'new', noSleep);
    expect(ok).toBe(false);
    expect(calls).toBeLessThanOrEqual(10);
  });

  it('looks at most every 30 s and still waits about 5 minutes in all', () => {
    expect(WAIT.intervalMs).toBeGreaterThanOrEqual(30_000);
    expect(WAIT.intervalMs * WAIT.tries).toBeGreaterThanOrEqual(5 * 60_000);
  });

  it('stops at the first look that shows the new snapshot', async () => {
    let calls = 0;
    const ok = await waitForSnapshot(async () => (++calls >= 2 ? 'new' : 'old'), 'new', noSleep);
    expect(ok).toBe(true);
    expect(calls).toBe(2);
  });

  it('waits before its first look, so the upload has time to show', async () => {
    const order: string[] = [];
    await waitForSnapshot(async () => { order.push('get'); return 'new'; }, 'new', async () => { order.push('sleep'); });
    expect(order).toEqual(['sleep', 'get']);
  });
});
