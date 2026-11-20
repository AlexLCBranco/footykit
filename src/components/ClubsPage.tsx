// FK-65: the Clubs place before a club is picked: every followed club, by league, one click to its calendar.

import { useMemo } from 'react';
import { TeamLogo } from './Bits';
import { useFooty } from './ctx';

export function ClubsPage({ onClub }: { onClub: (id: string) => void }) {
  const { model } = useFooty();
  const groups = useMemo(() => {
    const m = new Map<string, typeof model.clubs>();
    for (const c of model.clubs) m.set(c.league, [...(m.get(c.league) ?? []), c]);
    return [...m.entries()].map(([league, cs]) => ({ league, clubs: [...cs].sort((a, b) => a.name.localeCompare(b.name)) }));
  }, [model]);
  return (
    <div className="fk-clubs" data-testid="clubs-page">
      <h2>Pick a club <span className="fk-muted">· or type its name in the box above</span></h2>
      {groups.map((g) => (
        <section key={g.league} className="fk-clubs-league">
          <h3>{model.comp(g.league).name}</h3>
          <div className="fk-clubs-grid">
            {g.clubs.map((c) => (
              <button key={c.id} type="button" className="fk-clubs-club" onClick={() => onClub(c.id)} title={`${c.name}: calendar`} data-testid="club-chip" data-team={c.id}>
                <TeamLogo id={c.id} size={20} /><span>{c.name}</span>
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
