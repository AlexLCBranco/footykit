// The marquee selection's visible parts: the selected matches' highlight (one generated rule per selection, so a
// change re-renders nothing else), and the floating bar ("3 matches selected · Copy · ×"). The copy shows only the
// selected matches, without the gaps of the ones left out (isolate()).

import { CopyButton } from './Copy';
import { useSelection, type SelectionStore } from './selection';

const cssId = (id: string) => id.replace(/[^\w-]/g, '');

export function SelectionStyle({ store }: { store: SelectionStore }) {
  const ids = useSelection(store);
  if (!ids.size) return null;
  const sel = [...ids].map((id) => `.fk-capture [data-game-id="${cssId(id)}"]`).join(',');
  return <style>{`${sel}{outline:2px solid var(--fk-link);outline-offset:-1px;background-color:rgb(124 184 255 / 0.1)}`}</style>;
}

export function SelectionBar({ store, target }: { store: SelectionStore; target: () => HTMLElement | null }) {
  const ids = useSelection(store);
  if (!ids.size) return null;
  const n = ids.size;
  return (
    <div className="fk-selbar" role="toolbar" aria-label="Selected matches" data-testid="selection-bar" data-capture-exclude="true" data-no-marquee="true">
      <span className="fk-selbar-count">{n} match{n === 1 ? '' : 'es'} selected</span>
      <CopyButton target={target} only={ids} label={`Copy the ${n} selected match${n === 1 ? '' : 'es'} as an image`} />
      <button type="button" className="fk-icon-btn" aria-label="Clear the selection" title="Clear the selection (or click anywhere)" onClick={() => store.clear()}>×</button>
    </div>
  );
}
