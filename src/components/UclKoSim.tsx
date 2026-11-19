// FK-56: the UCL simulator's knockouts (logic: src/data/uclKoSim.ts) as a full-size bracket like the cups pages
// (owner: "like the Libertadores"): Play-offs → Round of 16 → Quarter-finals → Semi-finals → Final, each tie beside the
// ones it feeds, zoomed to fill the screen beside the table (useFitBracket). A click on a side sends it through (again
// clears); the ⇄ buttons above set each section's three drawn choices (the play-off pairing, which seed each winner
// meets, which half). Every change is one undo step.

import { koBracket, koBlocks, koColumns, pickKo, swapDraw, type Draw, type KoSim, type KoTie, type Letter } from '../data/uclKoSim';
import { TeamLogo } from './Bits';
import { useFooty } from './ctx';
import { useFitBracket } from './fitBracket';

const TITLES = ['Play-offs', 'Round of 16', 'Quarter-finals', 'Semi-finals', 'Final'];
const NOTES = ['two legs, the seeded side (9th–16th) at home second', 'two legs', 'two legs', 'two legs', 'one match'];

function Tie({ t, onPick }: { t: KoTie; onPick: (key: string, team: string) => void }) {
  const { model } = useFooty();
  const side = (team: string | undefined, pos: number | undefined, i: number) => {
    if (!team) return <div key={i} className="fk-ko-side fk-cupsim-pick fk-ko-wait fk-muted">winner of the tie before</div>;
    const won = t.winner === team;
    return (
      <button key={i} type="button" className={`fk-ko-side fk-cupsim-pick${won ? ' fk-ko-win fk-ko-picked' : t.winner ? ' fk-ko-lose' : ''}`} data-testid="ko-pick" data-team={model.team(team).abbr} aria-pressed={won}
        disabled={!t.a || !t.b} title={!t.a || !t.b ? `${model.team(team).name}: waiting for the other side` : won ? `${model.team(team).name} through: click to clear` : `Send ${model.team(team).name} through`} onClick={() => onPick(t.key, team)}>
        <span className="fk-ko-pos">{pos ?? ''}</span>
        <TeamLogo id={team} size={18} />
        <span className="fk-team-name">{model.team(team).short}</span>
      </button>
    );
  };
  const meta = t.round === 'po' ? `${t.letter} · ${t.posB} v ${t.posA}` : t.round === 'r16' ? `${t.letter} · ${t.half} half` : undefined;
  return (
    <div className={`fk-ko-tie${t.a && t.b && !t.winner ? ' fk-cupsim-open' : ''}`} data-testid="ko-tie" data-key={t.key} data-winner={t.winner ? model.team(t.winner).abbr : undefined}>
      {side(t.a, t.posA, 0)}
      {side(t.b, t.posB, 1)}
      {meta && <div className="fk-ko-legs fk-muted" data-testid={t.round === 'r16' ? 'ko-half' : undefined} data-half={t.half}>{meta}</div>}
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
  const cols = koColumns(b);
  const pick = (key: string, team: string) => change((k) => pickKo(k, key, team));
  const swap = (l: Letter, w: keyof Draw) => change((k) => swapDraw(k, l, w));
  const fit = useFitBracket(true, ko);
  return (
    <div className="fk-ko-sim fk-cups" data-testid="ko-sim">
      <div className="fk-ko-sim-tools">
        <span className="fk-wi-group-title">Knockouts <span className="fk-muted">· from the standings when started</span></span>
        <button type="button" className="fk-btn" onClick={onRestart} data-testid="wi-ko-start" title="Fill the knockouts again from the table as it stands now (results left to play ignored); clears the knockout picks">Restart from current standings</button>
        <button type="button" className="fk-btn" onClick={onStop} data-testid="wi-ko-stop" title="Back to the matches and the knockout places (undo brings the knockouts back)">Back to the league phase</button>
        {b.champion && <span className="fk-cupsim-champ" data-testid="ko-champion">🏆 <TeamLogo id={b.champion} size={18} /> {model.team(b.champion).name}</span>}
      </div>
      <div className="fk-ko-sim-draws" title="What UEFA draws, set per section">
        {koBlocks().map((blk) => {
          const d = ko.draws?.[blk.letter] ?? {};
          return (
            <span key={blk.letter} className="fk-ko-sim-section" data-testid="ko-section" data-letter={blk.letter}>
              <b>{blk.letter}</b> <span className="fk-muted">{blk.seeded.join('/')} v {blk.unseeded.join('/')} → {blk.r16.join('/')}</span>
              {SWAPS.map(([w, text, tip]) => (
                <button key={w} type="button" className={`fk-ko-sim-swap${d[w] ? ' fk-on' : ''}`} aria-pressed={!!d[w]} data-testid={`ko-swap-${w}`} title={tip} onClick={() => swap(blk.letter, w)}>{text}</button>
              ))}
            </span>
          );
        })}
      </div>
      <section className="fk-ko" data-testid="ko-bracket">
        <div className="fk-ko-grid fk-ko-fit" ref={fit} style={{ gridTemplateColumns: `repeat(${cols.length}, minmax(160px, 210px))` }}>
          {cols.map((col, i) => (
            <div key={TITLES[i]} className="fk-ko-col" data-testid="ko-col">
              <div className="fk-ko-col-title">{TITLES[i]}<span className="fk-muted"> {NOTES[i]}</span></div>
              <div className="fk-ko-col-ties">{col.map((t) => <Tie key={t.key} t={t} onPick={pick} />)}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
