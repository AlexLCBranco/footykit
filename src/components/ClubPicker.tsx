// The bar's club picker: a combobox you type into (FK-12). Closed, it shows the picked club (logo + name) or "All
// clubs"; focused, typing filters the clubs live, ignoring case and accents ("gremio" finds Grêmio, "sao paulo" São
// Paulo), the league headings kept over their clubs. ↑ / ↓ move, Enter picks, Esc closes and drops the typing.

import { useId, useMemo, useRef, useState } from 'react';
import { useFooty } from './ctx';
import { TeamLogo } from './Bits';

/** Lower case without accents, for matching typed text against names. */
export const fold = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

interface Option { id: string | undefined; name: string; league?: string }

export function ClubPicker({ team, onPick }: { team?: string; onPick: (id: string | undefined) => void }) {
  const { model } = useFooty();
  const [query, setQuery] = useState<string | undefined>(); // undefined: closed
  const [moved, setActive] = useState<number>(); // undefined: the default row
  const input = useRef<HTMLInputElement>(null);
  const listId = useId();

  // every club under its league's name, leagues in the model's order, clubs by name
  const all = useMemo<Option[]>(() => {
    const groups = new Map<string, Option[]>();
    for (const c of model.clubs) {
      const k = model.comp(c.league).name;
      groups.set(k, [...(groups.get(k) ?? []), { id: c.id, name: c.name, league: k }]);
    }
    return [...groups.values()].flatMap((l) => l.sort((a, b) => a.name.localeCompare(b.name)));
  }, [model]);

  const open = query !== undefined;
  const q = fold(query ?? '').trim();
  const options: Option[] = [
    { id: undefined, name: 'All clubs' },
    ...all.filter((o) => !q || fold(o.name).includes(q) || fold(model.team(o.id!).abbr) === q || fold(model.team(o.id!).short).includes(q)),
  ];

  // "All clubs" is always first; once something is typed, Enter takes the first club that matches
  const active = moved ?? (q && options.length > 1 ? 1 : 0);
  const close = () => { setQuery(undefined); setActive(undefined); };
  const pick = (o: Option | undefined) => {
    if (!o) return;
    close();
    input.current?.blur();
    if (o.id !== team) onPick(o.id);
  };
  const shown = team ? model.team(team).name : '';

  return (
    <span className={`fk-scope fk-club-pick${team ? ' fk-scope-team' : ''}`} title="Show one club, or all followed clubs: type a club's name">
      {team ? <TeamLogo id={team} size={22} /> : (
        <svg className="fk-search-icon" viewBox="0 0 16 16" width="15" height="15" aria-hidden="true"><circle cx="6.8" cy="6.8" r="4.6" fill="none" stroke="currentColor" strokeWidth="1.8" /><path d="M10.3 10.3l3.9 3.9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
      )}
      <input
        ref={input}
        type="text"
        role="combobox"
        aria-label="Club"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && options[active] ? `${listId}-${active}` : undefined}
        data-testid="scope-picker"
        className="fk-club-input"
        placeholder={team ? shown : 'All clubs · type a club…'}
        value={open ? query : shown}
        spellCheck={false}
        autoComplete="off"
        onFocus={(e) => { setQuery(''); setActive(undefined); e.currentTarget.select(); }}
        onBlur={close}
        onChange={(e) => { setQuery(e.target.value); setActive(undefined); }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') { e.preventDefault(); if (!open) setQuery(''); setActive(Math.min(active + 1, options.length - 1)); }
          else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(Math.max(active - 1, 0)); }
          else if (e.key === 'Enter') { e.preventDefault(); if (open && !(q && options.length === 1)) pick(options[active]); }
          else if (e.key === 'Escape') { e.preventDefault(); close(); e.currentTarget.blur(); }
        }}
      />
      {open && (
        <div className="fk-club-list" id={listId} role="listbox" aria-label="Clubs" data-testid="club-list" data-capture-exclude="true">
          {options.map((o, i) => (
            <div key={o.id ?? 'all'}>
              {o.league && o.league !== options[i - 1]?.league && <div className="fk-club-head" role="presentation">{o.league}</div>}
              <div id={`${listId}-${i}`} role="option" aria-selected={o.id === team} data-team-id={o.id ?? ''}
                className={`fk-club-option${i === active ? ' fk-club-active' : ''}${o.id ? '' : ' fk-club-all'}`}
                ref={i === active ? (el) => el?.scrollIntoView({ block: 'nearest' }) : undefined}
                onMouseDown={(e) => e.preventDefault()} onMouseEnter={() => setActive(i)} onClick={() => pick(o)}>
                {o.id && <TeamLogo id={o.id} size={18} />}
                <span>{o.name}</span>
              </div>
            </div>
          ))}
          {options.length === 1 && <div className="fk-club-none">No club matches "{query}"</div>}
        </div>
      )}
    </span>
  );
}
