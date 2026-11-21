// FK-74: one dropdown to pick a competition's edition (a World Cup, a past season), the owner's explicit exception to
// FK-65's "chips instead of dropdowns": the closed button shows the open edition, the list has every edition newest
// first, and ◀ ▶ beside it step to the edition before / after. The pure parts (order, neighbours) are tested alone.

import { useRef, useState } from 'react';
import { useDismiss } from './Header';

export interface Edition<T extends string | number> { value: T; label: string; tip?: string }

/** The list as the dropdown shows it: newest first (`editions` come oldest first). */
export const newestFirst = <T,>(editions: readonly T[]): T[] => [...editions].reverse();

/** The editions before and after `value` (`editions` oldest first); undefined at either end, or for an unknown value. */
export function editionNeighbours<T extends string | number>(editions: readonly Edition<T>[], value: T): { before?: Edition<T>; after?: Edition<T> } {
  const i = editions.findIndex((e) => e.value === value);
  return i < 0 ? {} : { before: editions[i - 1], after: editions[i + 1] };
}

export function EditionPicker<T extends string | number>({ value, editions, onChange, noun, testId }: {
  value: T | undefined;
  /** oldest first */
  editions: readonly Edition<T>[];
  onChange: (v: T) => void;
  /** what one entry is called: "edition", "season" */
  noun: string;
  testId: string;
}) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLSpanElement>(null);
  useDismiss(open, box, () => setOpen(false));
  const now = editions.find((e) => e.value === value);
  const { before, after } = value === undefined ? {} : editionNeighbours(editions, value);
  return (
    <span className="fk-edition" data-testid={testId} data-value={value}>
      <button type="button" className="fk-edition-step" disabled={!before} aria-label={`The ${noun} before`} title={before ? `The ${noun} before: ${before.label}` : `This is the first ${noun}`}
        onClick={() => before && onChange(before.value)} data-testid="edition-prev">◀</button>
      <span className="fk-edition-box" ref={box}>
        <button type="button" className="fk-edition-btn" aria-haspopup="listbox" aria-expanded={open} title={`Pick another ${noun}`} onClick={() => setOpen((o) => !o)} data-testid="edition-btn">
          <span data-testid="edition-now">{now?.label ?? '–'}</span><span className="fk-edition-caret" aria-hidden="true">▾</span>
        </button>
        {open && (
          <span className="fk-crumb-menu fk-edition-menu" role="listbox" aria-label={`Every ${noun}, newest first`} data-testid="edition-list">
            {newestFirst(editions).map((e) => (
              <button key={String(e.value)} type="button" role="option" aria-selected={e.value === value} className={`fk-crumb-item${e.value === value ? ' fk-crumb-item-on' : ''}`} title={e.tip} data-value={e.value}
                ref={e.value === value ? (el) => el?.scrollIntoView?.({ block: 'nearest' }) : undefined}
                onClick={() => { setOpen(false); if (e.value !== value) onChange(e.value); }}>{e.label}</button>
            ))}
          </span>
        )}
      </span>
      <button type="button" className="fk-edition-step" disabled={!after} aria-label={`The ${noun} after`} title={after ? `The ${noun} after: ${after.label}` : `This is the newest ${noun}`}
        onClick={() => after && onChange(after.value)} data-testid="edition-next">▶</button>
    </span>
  );
}
