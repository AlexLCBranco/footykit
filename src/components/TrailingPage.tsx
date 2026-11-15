// Goals while trailing, one competition at a time (src/data/trailing.ts): every goal a team scored while the other
// side was ahead at that moment. Its own chunk, like the other competition pages.

import { useMemo } from 'react';
import { dayLabel } from '../data/model';
import { trailingTable } from '../data/trailing';
import { TeamLink } from './Bits';
import { useFooty } from './ctx';
import './ucl.css';

export default function TrailingPage({ comp, today }: { comp: string; today: string }) {
  const { model } = useFooty();
  const table = useMemo(() => trailingTable(model.snap, comp, (id) => model.team(id).short), [model, comp]);
  const nm = (id: string) => model.team(id).short.trim();
  return (
    <div className="fk-ucl fk-trail" data-testid="trailing-page" data-comp={comp}>
      <div className="fk-ucl-head">
        <h2>{model.comp(comp).name}</h2>
        <span className="fk-muted">goals while trailing: scored while the other side was ahead at that moment (0-1 → 1-1, 2-4 → 3-4); own goals count for the side credited, extra time counts, shootouts don't</span>
      </div>
      <table className="fk-table fk-ucl-table fk-trail-table">
        <thead>
          <tr>
            <th>#</th><th className="fk-tl">Team</th>
            <th title="Matches played in this competition">P</th>
            <th title="Goals scored while the other side was ahead">Goals while trailing</th>
            <th title="Goals while trailing per match played">Per game</th>
          </tr>
        </thead>
        <tbody>
          {table.rows.map((r) => (
            <tr key={r.team} data-testid="trailing-row" data-team={model.team(r.team).abbr}>
              <td className="fk-rank">{r.rank}</td>
              <td className="fk-tl fk-ucl-team"><TeamLink id={r.team} day={today} label="short" /></td>
              <td>{r.p}</td>
              <td className="fk-pts" title={`Goals scored: ${r.trailing} while trailing, ${r.level} while level, ${r.leading} while leading`}>{r.trailing}</td>
              <td>{r.perGame.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {table.missing.length > 0 && (
        <p className="fk-muted fk-trail-note" data-testid="trailing-missing">
          ESPN has no goal details for {table.missing.length === 1 ? 'one played match' : `${table.missing.length} played matches`}, counted as no goals while trailing:{' '}
          {table.missing.map((m) => `${nm(m.h)} ${m.hs}-${m.as} ${nm(m.a)} (${dayLabel(model.dayOf(m))})`).join('; ')}.
        </p>
      )}
    </div>
  );
}
