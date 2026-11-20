// FK-62: the floating live-scores window, halftime-timer's technique (Document Picture-in-Picture: a small
// always-on-top window, Chrome / Edge on desktop; the button is hidden where the browser lacks it). The window's content
// is rendered by this page into the window's document (a portal), so it follows the same live data the Slate uses
// (useLive: polls only while a match is live or about to start). Before the first kick-off it is a countdown to it, and
// it turns into the scores list by itself at kick-off.

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { countdownText, countdownTo, popLines } from '../data/popout';
import type { Match } from '../data/snapshot';
import { useFooty } from './ctx';

interface PipApi { requestWindow(o: { width: number; height: number }): Promise<Window> }
type PopWindow = Window & { __fkInline?: boolean };
const pipApi = () => (window as unknown as { documentPictureInPicture?: PipApi }).documentPictureInPicture;
/** Tests render the window's content into the page instead (a real window needs a user's click). */
const inline = () => !!(window as unknown as { __FK_POPOUT_INLINE__?: boolean }).__FK_POPOUT_INLINE__;
export const popoutSupported = () => typeof window !== 'undefined' && (!!pipApi() || inline());

/** Opens / closes the window; `target` is where its content goes. */
export function usePopout() {
  const [target, setTarget] = useState<{ win?: PopWindow; el: HTMLElement } | null>(null);
  useEffect(() => () => { if (target?.win && !target.win.__fkInline) target.win.close(); }, [target]);
  const close = () => { if (target?.win && !target.win.__fkInline) target.win.close(); else target?.el.remove(); setTarget(null); };
  const open = async (rows: number) => {
    if (target) { target.win?.focus(); return; }
    if (inline()) {
      const el = document.createElement('div');
      el.dataset.testid = 'popout-inline';
      el.className = 'fk-root fk-lpop-inline';
      document.body.appendChild(el);
      setTarget({ el });
      return;
    }
    const api = pipApi();
    if (!api) return;
    let win: PopWindow;
    // the browser can refuse (no click behind it, popups blocked): nothing opens, the button stays as it was
    try { win = (await api.requestWindow({ width: 340, height: Math.min(640, 58 + 25 * Math.max(rows, 3)) })) as PopWindow; } catch { return; }
    // the page's styles, so the window looks like footykit
    for (const s of document.querySelectorAll('style, link[rel="stylesheet"]')) win.document.head.appendChild(s.cloneNode(true));
    win.document.title = 'footykit · live scores';
    const el = win.document.createElement('div');
    el.className = 'fk-root fk-lpop-root';
    win.document.body.className = 'fk-lpop-body';
    win.document.body.appendChild(el);
    win.addEventListener('pagehide', () => setTarget(null));
    setTarget({ win, el });
  };
  return { open, close, target };
}

/** The window's content: a countdown to the first match, then a line per match. */
export function LiveScores({ list, day }: { list: Match[]; day: string }) {
  const { model, timeZone, now } = useFooty();
  // a clock of its own for the countdown, started from the page's "now" (fixed in tests)
  const [offset] = useState(() => now - Date.now());
  const [t, setT] = useState(now);
  const first = countdownTo(list, t);
  useEffect(() => {
    if (!first) return;
    const id = setInterval(() => setT(Date.now() + offset), 1000);
    return () => clearInterval(id);
  }, [first, offset]);
  const lines = useMemo(() => popLines(list, timeZone), [list, timeZone]);
  const name = (id: string) => model.team(id).short.trim();
  if (!list.length) return <div className="fk-lpop" data-testid="popout"><p className="fk-muted">No matches on {day}.</p></div>;
  if (first) {
    return (
      <div className="fk-lpop fk-lpop-count" data-testid="popout" data-mode="countdown">
        <div className="fk-lpop-label">First match · {name(first.h)}–{name(first.a)}</div>
        <div className="fk-lpop-clock" data-testid="popout-countdown">{countdownText(Date.parse(first.t) - t)}</div>
        <div className="fk-muted">{lines.length} match{lines.length > 1 ? 'es' : ''} today · the scores show here at kick-off</div>
      </div>
    );
  }
  return (
    <div className="fk-lpop" data-testid="popout" data-mode="list">
      {lines.map((l) => (
        <div key={l.id} className={`fk-lpop-line fk-lpop-${l.kind}`} data-testid="popout-line" data-kind={l.kind}>
          <span className="fk-lpop-time">{l.kind === 'live' ? <><b className="fk-lpop-livetag">LIVE</b> {l.time}</> : l.time}</span>
          <span className="fk-lpop-team fk-lpop-h">{name(l.h)}</span>
          <span className="fk-lpop-score">{l.hs !== undefined ? `${l.hs}–${l.as}` : '–'}</span>
          <span className="fk-lpop-team">{name(l.a)}</span>
        </div>
      ))}
    </div>
  );
}

export interface PopoutCtl { on: boolean; toggle: () => void }

/** The Slate header's button (the window itself is kept by the widget, so it stays open while you browse). */
export function PopoutButton({ ctl }: { ctl?: PopoutCtl }) {
  if (!ctl || !popoutSupported()) return null;
  return (
    <button type="button" className={`fk-lpop-btn${ctl.on ? ' fk-lpop-btn-on' : ''}`} data-capture-exclude="true" aria-pressed={ctl.on}
      title={ctl.on ? 'Close the live scores window' : "Pop out live scores: a small always-on-top window with the day's matches"}
      onClick={ctl.toggle} data-testid="popout-button">
      {ctl.on ? 'Close live scores' : 'Pop out live scores'}
    </button>
  );
}

/** The window's content, rendered into it. */
export const PopoutPortal = ({ el, list, day }: { el: HTMLElement; list: Match[]; day: string }) => createPortal(<LiveScores list={list} day={day} />, el);
