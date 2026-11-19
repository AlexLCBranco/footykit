// FK-56: the UCL simulator's knockout bracket (logic: src/data/uclKoSim.ts) in the third column, beside the table: each
// section A–D with its two play-off ties (9th–24th) and the two round-of-16 ties they feed, then the quarter-finals by
// half, the semi-finals, the final. A click on a side sends it through (again clears); ⇄ buttons set each section's
// three drawn choices (the play-off pairing, which seed each winner meets, which half). Every change is one undo step.

import { koBracket, koBlocks, pickKo, swapDraw, type Draw, type KoSim, type KoTie, type Letter } from '../data/uclKoSim';
import { TeamLogo } from './Bits';
import { useFooty } from './ctx';

const ROUND = { po: 'Play-off', r16: 'Round of 16', qf: 'Quarter-final', sf: 'Semi-final', final: 'Final' } as const;

function Tie({ t, onPick, note }: { t: KoTie; onPick: (key: string, team: string) => void; /** the half a round-of-16 tie goes to */ note?: string }) {
  const { model } = useFooty();
  const side = (team: string | undefined, pos: number | undefined, i: number) => {
    if (!team) return <span key={i} className="fk-ko-sim-side fk-ko-sim-wait">winner of the tie before</span>;
    const won = t.winner === team, lost = !!t.winner && !won;
    return (
      <button key={i} type="button" className={`fk-ko-sim-side${won ? ' fk-ko-sim-won' : ''}${lost ? ' fk-ko-sim-lost' : ''}`} data-testid="ko-pick" data-team={model.team(team).abbr} aria-pressed={won}
        disabled={!t.a || !t.b} title={won ? `${model.team(team).name} through: click to clear` : `Send ${model.team(team).name} through`} onClick={() => onPick(t.key, team)}>
        {pos !== undefined && <span className="fk-wi-chip-pos">{pos}</span>}
        <TeamLogo id={team} size={16} />
        <span>{model.team(team).short}</span>
      </button>
    );
  };
  return (
    <div className="fk-ko-sim-tie" data-testid="ko-tie" data-key={t.key} data-winner={t.winner ? model.team(t.winner).abbr : undefined} title={t.round === 'po' ? 'Play-off: the seeded side (9th–16th, second) hosts the second leg' : ROUND[t.round]}>
      {side(t.a, t.posA, 0)}
      <span className="fk-muted fk-ko-sim-v">v</span>
      {side(t.b, t.posB, 1)}
      <span className="fk-muted fk-ko-sim-note" data-testid={note ? 'ko-half' : undefined}>{note ?? ''}</span>
    </div>
  );
}

const SWAPS: [keyof Draw, string, string][] = [
  ['pairing', '⇄ ties', 'Swap the play-off pairings (drawn): 9 v 24 and 10 v 23 ↔ 9 v 23 and 10 v 24'],
  ['r16', '⇄ R16', 'Swap which round-of-16 seed each play-off winner meets (drawn)'],
  ['half', '⇅ halves', 'Swap which half of the bracket each of this section\'s round-of-16 ties goes to (drawn)'],
];

export function UclKoBracket({ ko, change, onRestart, onStop }: { ko: KoSim; change: (f: (k: KoSim) => KoSim) => void; onRestart: () => void; onStop: () => void }) {
  const { model } = useFooty();
  const b = koBracket(ko);
  const pick = (key: string, team: string) => change((k) => pickKo(k, key, team));
  const swap = (l: Letter, w: keyof Draw) => change((k) => swapDraw(k, l, w));
  const half = (h: 't' | 'b') => b.qf.filter((t) => t.key.startsWith(`qf-${h}`));
  return (
    <div className="fk-ko-sim" data-testid="ko-sim">
      <div className="fk-wi-group-title">Knockouts <span className="fk-muted">· from the standings when started</span></div>
      <div className="fk-ko-sim-tools">
        <button type="button" className="fk-btn" onClick={onRestart} data-testid="wi-ko-start" title="Fill the knockouts again from the table as it stands now (results left to play ignored); clears the knockout picks">Restart from current standings</button>
        <button type="button" className="fk-btn" onClick={onStop} data-testid="wi-ko-stop" title="Back to the knockout places (the knockout picks are dropped; undo brings them back)">Knockout places</button>
      </div>
      {koBlocks().map((blk) => {
        const d = ko.draws?.[blk.letter] ?? {};
        return (
          <div key={blk.letter} className="fk-wi-block" data-testid="ko-section" data-letter={blk.letter}>
            <div className="fk-wi-block-title">
              {blk.letter} · play-offs {blk.seeded.join('/')} v {blk.unseeded.join('/')}, then {blk.r16.join(' / ')}
              <span className="fk-ko-sim-swaps">
                {SWAPS.map(([w, text, tip]) => (
                  <button key={w} type="button" className={`fk-ko-sim-swap${d[w] ? ' fk-on' : ''}`} aria-pressed={!!d[w]} data-testid={`ko-swap-${w}`} title={tip} onClick={() => swap(blk.letter, w)}>{text}</button>
                ))}
              </span>
            </div>
            {b.po.filter((t) => t.letter === blk.letter).map((t) => <Tie key={t.key} t={t} onPick={pick} />)}
            <div className="fk-wi-vs">Round of 16</div>
            {b.r16.filter((t) => t.letter === blk.letter).map((t, i) => <Tie key={t.key} t={t} onPick={pick} note={(i === 0) !== !!d.half ? 'top' : 'bottom'} />)}
          </div>
        );
      })}
      <div className="fk-wi-block" data-testid="ko-later">
        <div className="fk-wi-block-title">Quarter-finals <span className="fk-muted">· A v D and B v C in each half</span></div>
        <div className="fk-wi-vs">Top half</div>
        {half('t').map((t) => <Tie key={t.key} t={t} onPick={pick} />)}
        <div className="fk-wi-vs">Bottom half</div>
        {half('b').map((t) => <Tie key={t.key} t={t} onPick={pick} />)}
        <div className="fk-wi-block-title fk-ko-sim-next">Semi-finals</div>
        {b.sf.map((t) => <Tie key={t.key} t={t} onPick={pick} />)}
        <div className="fk-wi-block-title fk-ko-sim-next">Final</div>
        <Tie t={b.final} onPick={pick} />
        {b.champion && <div className="fk-ko-sim-champ" data-testid="ko-champion">🏆 {model.team(b.champion).name}</div>}
      </div>
    </div>
  );
}
