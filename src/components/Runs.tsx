// The road trip / homestand label on each match of a run (FK-21, calendarkit's .ck-run-label): an outlined pill naming
// the run and the match's place in it, "Road trip · 2/4"; the dates and (road) the cities on hover.

import { dayLabel } from '../data/model';
import { runLabel, runTip, teamRuns } from '../data/runs';
import type { Match } from '../data/snapshot';
import { useFooty } from './ctx';

export function RunLabel({ m, team }: { m: Match; team: string }) {
  const { model } = useFooty();
  const hit = teamRuns(model, team).byMatch.get(m.id);
  if (!hit) return null;
  return (
    <span className="fk-run-label" data-run={hit.run.kind} data-testid="run-label" title={runTip(model, hit.run, hit.index, dayLabel)}>
      {runLabel(hit.run, hit.index)}
    </span>
  );
}
