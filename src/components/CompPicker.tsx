// FK-75: the league / competition box on Leagues, Cups and Tools: one box in place of the row of buttons, looking and
// working like the club box (ClubPicker.tsx, whose styles it shares). Closed, it shows the open league or competition
// with its logo; focused, it lists them all and typing filters the list, ignoring case and accents ("brasileirao").
// ↑ / ↓ move, Enter picks, Esc closes and drops the typing. Something is always picked, so there is no "all" row.

import { useId, useRef, useState } from 'react';
import { compLogoUrl } from '../address';
import { fold } from '../data/fold';

export interface CompOption { value: string; name: string }

/** The options a typed text leaves: every option for no text, else those whose name holds it (case and accents ignored). */
export const filterComps = (options: readonly CompOption[], typed: string): CompOption[] => {
  const q = fold(typed).trim();
  return q ? options.filter((o) => fold(o.name).includes(q)) : [...options];
};

/** A competition's logo; a competition without one (the World Cup) shows a small cup instead. */
function CompLogo({ slug, size }: { slug: string; size: number }) {
  const [failed, setFailed] = useState<string>();
  return (
    <span className="fk-logo fk-comp-pick-logo" style={{ width: size, height: size, fontSize: size - 6 }} aria-hidden="true">
      {failed === slug ? '🏆' : <img src={compLogoUrl(slug)} alt="" width={size - 2} height={size - 2} decoding="async" onError={() => setFailed(slug)} />}
    </span>
  );
}

export function CompPicker({ value, options, onPick, noun, testId }: {
  value: string;
  options: readonly CompOption[];
  onPick: (v: string) => void;
  /** what one entry is called: "league", "competition" */
  noun: string;
  testId: string;
}) {
  const [query, setQuery] = useState<string | undefined>(); // undefined: closed
  const [moved, setActive] = useState<number>(); // undefined: the default row
  const input = useRef<HTMLInputElement>(null);
  const listId = useId();
  const open = query !== undefined;
  const shown = options.find((o) => o.value === value)?.name ?? '';
  const list = filterComps(options, query ?? '');
  // nothing typed: the open one is the default row; once something is typed, Enter takes the first match
  const active = moved ?? (query ? 0 : Math.max(0, list.findIndex((o) => o.value === value)));
  const close = () => { setQuery(undefined); setActive(undefined); };
  const pick = (o: CompOption | undefined) => {
    if (!o) return;
    close();
    input.current?.blur();
    if (o.value !== value) onPick(o.value);
  };
  return (
    <span className="fk-scope fk-club-pick fk-scope-team fk-comp-pick" title={`Pick another ${noun}: click, or type its name`} data-testid={testId} data-value={value}>
      <CompLogo slug={value} size={24} />
      <input
        ref={input}
        type="text"
        role="combobox"
        aria-label={noun === 'league' ? 'League' : 'Competition'}
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && list[active] ? `${listId}-${active}` : undefined}
        data-testid="comp-picker"
        className="fk-club-input"
        placeholder={shown}
        value={open ? query : shown}
        spellCheck={false}
        autoComplete="off"
        onFocus={(e) => { setQuery(''); setActive(undefined); e.currentTarget.select(); }}
        onBlur={close}
        onChange={(e) => { setQuery(e.target.value); setActive(undefined); }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') { e.preventDefault(); if (!open) setQuery(''); setActive(Math.min(active + 1, list.length - 1)); }
          else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(Math.max(active - 1, 0)); }
          else if (e.key === 'Enter') { e.preventDefault(); if (open) pick(list[active]); }
          else if (e.key === 'Escape') { e.preventDefault(); close(); e.currentTarget.blur(); }
        }}
      />
      <span className="fk-comp-pick-caret" aria-hidden="true">▾</span>
      {open && (
        <div className="fk-club-list" id={listId} role="listbox" aria-label={noun === 'league' ? 'Leagues' : 'Competitions'} data-testid="comp-list" data-capture-exclude="true">
          {list.map((o, i) => (
            <div key={o.value} id={`${listId}-${i}`} role="option" aria-selected={o.value === value} data-value={o.value}
              className={`fk-club-option${i === active ? ' fk-club-active' : ''}`}
              ref={i === active ? (el) => el?.scrollIntoView?.({ block: 'nearest' }) : undefined}
              onMouseDown={(e) => e.preventDefault()} onMouseEnter={() => setActive(i)} onClick={() => pick(o)}>
              <CompLogo slug={o.value} size={18} />
              <span>{o.name}</span>
            </div>
          ))}
          {!list.length && <div className="fk-club-none">No {noun} matches "{query}"</div>}
        </div>
      )}
    </span>
  );
}
