// Team List: one club's matches as rows, one calendar month at a time ("Load earlier" adds the month before). A row:
// date, time, competition, AWAY 2 @ 1 HOME with form, the result and league record at that point, series, ↗.

import { addMonths, dayLabel, monthLabel, monthOf, resultFor } from '../data/model';
import { formAt, recordText } from '../data/form';
import { withLive } from '../data/live';
import { CompMark, MatchLink, MatchTime, Scoreline, SeriesChip } from './Bits';
import { useFooty } from './ctx';

export function TeamList({ team, from, to, onEarlier }: { team: string; from: string; to: string; onEarlier: () => void }) {
  const { model, live } = useFooty();
  const all = withLive(model.byTeam.get(team) ?? [], live);
  const rows = all.filter((m) => { const mo = monthOf(model.dayOf(m)); return mo >= from && mo <= to; });
  const earliest = all.length ? monthOf(model.dayOf(all[0]!)) : from;
  const months: string[] = [];
  for (let mo = from; mo <= to; mo = addMonths(mo, 1)) months.push(mo);
  return (
    <section className="fk-teamlist" data-testid="team-list">
      {from > earliest && (
        <button type="button" className="fk-btn fk-earlier" data-capture-exclude="true" onClick={onEarlier}>Load earlier ({monthLabel(addMonths(from, -1))})</button>
      )}
      {months.map((mo) => {
        const list = rows.filter((m) => monthOf(model.dayOf(m)) === mo);
        return (
          <div key={mo} className="fk-tl-month">
            <h3>{monthLabel(mo)}</h3>
            {list.length === 0 && <p className="fk-empty">No matches.</p>}
            {list.map((m) => {
              const day = model.dayOf(m);
              const r = resultFor(m, team);
              const f = formAt(model, team, m);
              return (
                <div key={m.id} className={`fk-row fk-tl-row${r ? ` fk-res-${r}` : ''}`} data-testid="team-row" data-game-id={m.id}>
                  <span className="fk-tl-date">{dayLabel(day)}</span>
                  <MatchTime m={m} />
                  <CompMark slug={m.c} round={m.r} />
                  <Scoreline m={m} day={day} label="short" form={false} />
                  <span className="fk-row-end">
                    {r && <span className={`fk-res fk-res-${r}`}>{r}</span>}
                    <span className="fk-muted fk-tl-rec" title="League record W-D-L (after a played match, going into one to come)">{recordText(f.record)}</span>
                    {f.streak && <span className="fk-muted" title="Streak, all competitions">{f.streak}</span>}
                    <SeriesChip m={m} />
                    <MatchLink m={m} />
                  </span>
                </div>
              );
            })}
          </div>
        );
      })}
    </section>
  );
}
