// The simulator's saved scenarios (PLAN.md Phase 5, step 2): named sets of picks, switched in one click (or Alt+1–9) to
// compare outcomes. With a team picked, each scenario shows where that team finishes in it, so the "death side" of
// several scenarios reads at a glance. The logic is src/data/whatif.ts (saveAs, rename, remove, edited).

import { useEffect, useMemo, useState } from 'react';
import { edited, remove, rename, saveAs, type Sim, type Store } from '../data/whatif';
import { useFooty } from './ctx';
import { ord } from './WhatIfParts';

function NameBox({ initial, placeholder, onDone }: { initial: string; placeholder: string; onDone: (name?: string) => void }) {
  return (
    <input className="fk-wi-name" autoFocus defaultValue={initial} placeholder={placeholder} maxLength={40} aria-label="Scenario name" data-testid="wi-scenario-name"
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === 'Enter') onDone(e.currentTarget.value);
        if (e.key === 'Escape') onDone(undefined);
      }}
      onBlur={() => onDone(undefined)} />
  );
}

export function Scenarios({ store, team, placeOf, onStore, onLoad }: {
  store: Store; team?: string;
  /** the team's place in the table a scenario's picks give */
  placeOf: (sim: Sim, team: string) => number;
  onStore: (s: Store) => void; onLoad: (name: string, sim: Sim) => void;
}) {
  const { model } = useFooty();
  const [naming, setNaming] = useState<'new' | 'rename'>();
  const [confirm, setConfirm] = useState(false);
  const isEdited = edited(store);

  // where the picked team finishes in each scenario (one table per scenario, only while a team is picked)
  const places = useMemo(() => {
    if (!team) return undefined;
    return new Map(store.saved.map((s) => [s.name, placeOf(s.sim, team)]));
  }, [team, store.saved, placeOf]);

  // Alt+1–9: the nth scenario
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!e.altKey || e.ctrlKey || e.metaKey || e.target instanceof HTMLInputElement) return;
      const n = Number(e.code.replace('Digit', ''));
      const s = Number.isInteger(n) && n >= 1 ? store.saved[n - 1] : undefined;
      if (s) { e.preventDefault(); onLoad(s.name, s.sim); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [store.saved, onLoad]);

  return (
    <div className="fk-wi-scen" data-testid="wi-scenarios">
      <span className="fk-wi-scen-label">Scenarios</span>
      {!store.saved.length && !naming && <span className="fk-muted">none saved yet</span>}
      {store.saved.map((s, i) => {
        const active = s.name === store.active;
        if (active && naming === 'rename') {
          return <NameBox key={s.name} initial={s.name} placeholder="Name" onDone={(n) => { setNaming(undefined); if (n !== undefined) onStore(rename(store, s.name, n)); }} />;
        }
        const place = places?.get(s.name);
        return (
          <span key={s.name} className={`fk-wi-scen-item${active ? ' fk-wi-scen-active' : ''}`}>
            <button type="button" className="fk-wi-scen-chip" data-testid="wi-scenario" aria-pressed={active}
              title={`${active ? (isEdited ? 'Changed since saved — click to go back to the saved picks' : 'On screen') : 'Show these picks'}${i < 9 ? ` (Alt+${i + 1})` : ''}`}
              onClick={() => { setConfirm(false); onLoad(s.name, s.sim); }}>
              {s.name}{active && isEdited && <span className="fk-wi-scen-edited" title="Changed since saved"> •</span>}
              {team && place !== undefined && <span className="fk-wi-scen-place" data-testid="wi-scenario-place"> · {model.team(team).abbr} {ord(place)}</span>}
            </button>
            {active && <>
              <button type="button" className="fk-wi-scen-x" title="Rename" aria-label="Rename" onClick={() => { setConfirm(false); setNaming('rename'); }}>✎</button>
              <button type="button" className={`fk-wi-scen-x${confirm ? ' fk-wi-scen-confirm' : ''}`} title={confirm ? 'Click again to delete (the picks on screen stay)' : 'Delete this scenario'} aria-label="Delete" data-testid="wi-scenario-delete"
                onClick={() => { if (confirm) { setConfirm(false); onStore(remove(store, s.name)); } else setConfirm(true); }}>{confirm ? 'Delete?' : '×'}</button>
            </>}
          </span>
        );
      })}
      {store.active && (
        <button type="button" className="fk-btn fk-wi-scen-btn" disabled={!isEdited} title={`Save the picks on screen as "${store.active}"`} data-testid="wi-scenario-save"
          onClick={() => onStore(saveAs(store, store.active!))}>Save</button>
      )}
      {naming === 'new'
        ? <NameBox initial="" placeholder="Name, then Enter" onDone={(n) => { setNaming(undefined); if (n !== undefined) onStore(saveAs(store, n)); }} />
        : <button type="button" className="fk-btn fk-wi-scen-btn" title="Save the picks on screen under a new name (a name already used is replaced)" data-testid="wi-scenario-saveas" onClick={() => { setConfirm(false); setNaming('new'); }}>Save as…</button>}
    </div>
  );
}
