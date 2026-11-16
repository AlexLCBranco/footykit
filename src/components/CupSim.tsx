// FK-30: the Cups page's simulator. "Simulator" on a cup's page turns its open ties into picks: a click on a team sends
// it through (again: clears), the bracket follows, the next round lists who is in it, a picked final names the
// champion. Picks are kept per cup in fk:whatif:v1 (under `comps`, beside the league and UCL simulators' picks).

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { pickTie, prunePicks, simulateCup, tieKey, type CupSimView, type SimRound, type SimTie } from '../data/cupSim';
import type { CupTie } from '../data/cups';
import { EMPTY_STORE, readStore, WHATIF_KEY, writeStore, type Store } from '../data/whatif';
import { TeamLogo } from './Bits';
import { useFooty } from './ctx';

function load(): string | null {
  try { return localStorage.getItem(WHATIF_KEY); } catch { return null; }
}
function save(store: Store, cup: string) {
  try {
    const text = writeStore(store, cup, load());
    if (text === null) localStorage.removeItem(WHATIF_KEY); else localStorage.setItem(WHATIF_KEY, text);
  } catch { /* storage blocked: picks last for the visit */ }
}

export interface CupSimState {
  on: boolean;
  view: CupSimView;
  pick: (t: CupTie, team: string | undefined) => void;
}

export const CupSimCtx = createContext<CupSimState | null>(null);

/** The simulator of one cup: whether it is on, the picks (kept), the bracket they give. */
export function useCupSim(cup: string, rounds: SimRound[]) {
  const [on, setOn] = useState(false);
  const [store, setStore] = useState<Store>(() => readStore(load(), cup));
  const picks = useMemo(() => prunePicks(rounds, store.current.winners ?? {}), [rounds, store]);
  // a real result replaces a pick: drop the stale ones from what is kept
  useEffect(() => {
    if (picks !== (store.current.winners ?? {}) && Object.keys(store.current.winners ?? {}).length) {
      const next = { ...store, current: { ...store.current, winners: picks } };
      setStore(next); save(next, cup);
    }
  }, [picks, store, cup]);
  const set = (winners: Record<string, string>) => {
    const { winners: _, ...rest } = store.current;
    const next: Store = { ...store, current: Object.keys(winners).length ? { ...rest, winners } : rest };
    setStore(next); save(next, cup);
  };
  const view = useMemo(() => simulateCup(rounds, picks), [rounds, picks]);
  const state: CupSimState = { on, view, pick: (t, team) => set(pickTie(picks, t, team)) };
  return { state, setOn, clear: () => set({}), empty: store === EMPTY_STORE || !Object.keys(picks).length };
}

export const useCupSimState = () => useContext(CupSimCtx);

/** The picked or real tie of the simulator for `t` (undefined with the simulator off). */
export function simTieOf(sim: CupSimState | null, t: CupTie): SimTie | undefined {
  if (!sim?.on) return undefined;
  const k = tieKey(t);
  for (const r of sim.view.rounds) for (const x of r.ties) if (tieKey(x) === k) return x;
  return undefined;
}

/** The button on a cup's header, and with the simulator on: the count, Clear and the champion. */
export function CupSimBar({ on, onToggle, onClear, empty, view }: { on: boolean; onToggle: () => void; onClear: () => void; empty: boolean; view: CupSimView }) {
  const { model } = useFooty();
  return (
    <span className="fk-cupsim-bar" data-testid="cup-sim-bar">
      <button type="button" className={`fk-btn${on ? ' fk-btn-on' : ''}`} aria-pressed={on} onClick={onToggle} data-testid="cup-sim-toggle"
        title={on ? 'Back to the real bracket (picks are kept)' : 'Pick the winner of each tie still to play and see how the bracket ends up'}>Simulator</button>
      {on && (
        <>
          <span className="fk-muted" data-testid="cup-sim-count">{view.used} picked · {view.left} to pick</span>
          {!empty && <button type="button" className="fk-btn" onClick={onClear} data-testid="cup-sim-clear">Clear picks</button>}
          {view.champion && (
            <span className="fk-cupsim-champ" data-testid="cup-sim-champion" title={view.champion.picked ? 'From your picks' : 'The real winner'}>
              🏆 <TeamLogo id={view.champion.team} /> {model.team(view.champion.team).short}{view.champion.picked ? <span className="fk-muted"> (picked)</span> : null}
            </span>
          )}
        </>
      )}
    </span>
  );
}

/** Clubs through to a round whose ties aren't fixtured yet: listed, not paired (the draw or bracket isn't known). */
export function CupSimWaiting({ teams }: { teams: string[] }) {
  const { model } = useFooty();
  if (!teams.length) return null;
  return (
    <div className="fk-ko-tie fk-cupsim-waiting" data-testid="cup-sim-waiting" title="Through to this round (real results and your picks); the pairings aren't known yet">
      <div className="fk-muted">Through, not paired yet:</div>
      {teams.map((t) => <div key={t} className="fk-ko-side"><TeamLogo id={t} /> <span className="fk-team-name">{model.team(t).short}</span></div>)}
    </div>
  );
}
