// The date picker strip above the day list: two weeks of days around the one shown, each with its match count, plus a
// native date input for a jump. Every day is clickable, the ones without matches too.

import { addDays, mondayOf, shortDay, weekdayShort } from '../data/model';
import { fifaWindowOn } from '../data/windows';
import { useFooty } from './ctx';

export function DayStrip({ day, today, onDay }: { day: string; today: string; onDay: (d: string) => void }) {
  const { model } = useFooty();
  const start = addDays(mondayOf(day), -7);
  const days = Array.from({ length: 21 }, (_, i) => addDays(start, i));
  return (
    <nav className="fk-strip" data-testid="day-strip" aria-label="Pick a day" data-capture-exclude="true">
      {days.map((d) => {
        const n = model.byDay.get(d)?.length ?? 0;
        const fifa = fifaWindowOn(d);
        return (
          <button key={d} type="button" className={`fk-strip-day${d === day ? ' fk-on' : ''}${d === today ? ' fk-today' : ''}${n ? '' : ' fk-strip-none'}${fifa ? ' fk-strip-fifa' : ''}`} onClick={() => onDay(d)} title={`${shortDay(d)}: ${n || 'no'} match${n === 1 ? '' : 'es'}${fifa ? ` · ${fifa.label}` : ''}`}>
            <span className="fk-strip-wd">{weekdayShort(d)}</span>
            <span className="fk-strip-d">{Number(d.slice(8, 10))}</span>
            <span className="fk-strip-n">{n || '–'}</span>
          </button>
        );
      })}
    </nav>
  );
}
