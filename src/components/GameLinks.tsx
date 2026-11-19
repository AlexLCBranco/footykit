// FK-40: a Slate card's game button and its pop-up of outside links, like calendarkit's CK-15 — links only, never
// betting in the app: each club's suspensions and injuries page (Transfermarkt, config/injuryLinks.ts) and the betting
// site's football section (a link to one match's props needs the site's own event id, which ESPN doesn't give).
// The button sits in the first row's empty "@" cell, so the card keeps calendarkit's size; it is never in a copy.
// The pop-up opens on hover or focus (and a click, for touch), stays while the pointer is on the button or in it,
// closes CLOSE_MS after the pointer leaves and on Escape (calendarkit CK-6); it starts no timer at rest.

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { BETTING_FOOTBALL_URL, TRANSFERMARKT } from '../../config/injuryLinks';
import type { Model } from '../data/model';
import type { Match } from '../data/snapshot';
import { useFooty } from './ctx';

const CLOSE_MS = 100;

/** A club's suspensions and injuries page: its Transfermarkt page, else Transfermarkt's search for its name. */
export function injuryLink(model: Model, teamId: string): { url: string; exact: boolean } {
  const tm = TRANSFERMARKT[teamId];
  if (tm) return { url: `https://www.transfermarkt.com/-/sperrenundverletzungen/verein/${tm}`, exact: true };
  return { url: `https://www.transfermarkt.com/schnellsuche/ergebnis/schnellsuche?${new URLSearchParams({ query: model.team(teamId).name })}`, exact: false };
}

/** The pop-up's links, in order: the home club's injuries, the away club's, the betting site's football page. */
export function gameLinks(model: Model, m: Match): { label: string; url: string; testId: string }[] {
  const team = (id: string) => {
    const l = injuryLink(model, id);
    return { label: `${model.team(id).short}: injuries & suspensions${l.exact ? '' : ' (search)'}`, url: l.url, testId: 'injury-link' };
  };
  return [team(m.h), team(m.a), { label: 'Match odds & player props (FanDuel soccer)', url: BETTING_FOOTBALL_URL, testId: 'props-link' }];
}

/** The card's game button ("⋯") and its pop-up. `extra`: more lines on top of the links (the weather, FK-39). */
export function GameMenu({ m, extra, mark }: { m: Match; extra?: ReactNode; mark?: ReactNode }) {
  const { model } = useFooty();
  const [at, setAt] = useState<DOMRect>();
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const btn = useRef<HTMLButtonElement>(null);
  const open = () => { clearTimeout(timer.current); setAt(btn.current!.getBoundingClientRect()); };
  const leave = () => { clearTimeout(timer.current); timer.current = setTimeout(() => setAt(undefined), CLOSE_MS); };
  const stay = () => clearTimeout(timer.current);
  useEffect(() => {
    if (!at) return;
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setAt(undefined); };
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [at]);
  useEffect(() => () => clearTimeout(timer.current), []);
  const label = `${model.team(m.h).name} vs ${model.team(m.a).name}`;
  const width = 320;
  const left = at ? Math.max(8, Math.min(at.left, innerWidth - width - 8)) : 0;
  const below = at ? at.bottom + 160 < innerHeight : true;
  return (
    <>
      <button ref={btn} type="button" className="fk-game-menu" data-testid="game-menu" data-capture-exclude="true" aria-haspopup="dialog" aria-expanded={!!at}
        aria-label={`Links for ${label}: injuries, odds and props`} onMouseEnter={open} onMouseLeave={leave} onFocus={open} onBlur={leave}
        onClick={(e) => { e.stopPropagation(); if (at) setAt(undefined); else open(); }}>
        {mark ?? '⋯'}
      </button>
      {at && createPortal(
        <div className="fk-pop fk-game-links-pop" role="dialog" aria-label={`Links for ${label}`} data-testid="game-links-popup" data-capture-exclude="true"
          style={{ left, width, ...(below ? { top: at.bottom + 4 } : { bottom: innerHeight - at.top + 4 }) }} onMouseEnter={stay} onMouseLeave={leave}>
          <strong className="fk-game-links-title">{label}</strong>
          {extra}
          <ul className="fk-game-links">
            {gameLinks(model, m).map((l) => (
              <li key={l.label}>
                <a className="fk-game-link" href={l.url} target="_blank" rel="noopener noreferrer" data-testid={l.testId}>{l.label} ↗</a>
              </li>
            ))}
          </ul>
        </div>,
        document.body,
      )}
    </>
  );
}
