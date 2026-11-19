// The version check's list of files that don't need a version bump: the owner's lists and the run reports (CLAUDE.md
// asks for REPORTS.md in the same commit as a backlog run's report; it is not on the site).
import { describe, expect, it } from 'vitest';
import { changesNeedBump } from '../scripts/check-version';

describe('changesNeedBump', () => {
  it('the lists, the reports and docs need no bump', () => {
    expect(changesNeedBump(['REPORTS.md', 'BUILT.md', 'FEATURE_BACKLOG.md', 'IDEAS.md', 'PROJECT.md', 'docs/x.md'])).toBe(false);
  });
  it('app code does', () => expect(changesNeedBump(['REPORTS.md', 'src/App.tsx'])).toBe(true));
});
