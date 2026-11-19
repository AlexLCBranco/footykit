// FK-49: calendarkit's SideArrows (ScheduleDestination.tsx, .ck-side-arrow): a large chevron at each side of a calendar
// grid, in the page margin beside it (as wide as that margin, 14–40 px, so it covers no day cell), "Back a month" /
// "Forward a month", disabled at the ends of the data, never in a copy (data-capture-exclude). The bar's ‹ › stay.

import { useLayoutEffect, useRef, type ReactNode } from 'react';

export function SideArrows({ onPrev, onNext }: { /** undefined: disabled (the first / last month) */ onPrev?: () => void; onNext?: () => void }) {
  const prev = useRef<HTMLButtonElement>(null);
  useLayoutEffect(() => {
    const host = prev.current?.parentElement;
    if (!host) return;
    const fit = () => {
      const r = host.getBoundingClientRect();
      const room = Math.min(r.left, document.documentElement.clientWidth - r.right);
      host.style.setProperty('--fk-side-w', `${Math.max(14, Math.min(40, Math.floor(room) - 2))}px`);
    };
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);
  return (
    <>
      <button type="button" ref={prev} className="fk-side-arrow fk-side-prev" data-testid="side-prev" data-capture-exclude="true" aria-label="Back a month" title="Back a month" disabled={!onPrev} onClick={onPrev}>
        <svg viewBox="0 0 16 48" aria-hidden="true"><path d="M12 6 3 24l9 18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>
      <button type="button" className="fk-side-arrow fk-side-next" data-testid="side-next" data-capture-exclude="true" aria-label="Forward a month" title="Forward a month" disabled={!onNext} onClick={onNext}>
        <svg viewBox="0 0 16 48" aria-hidden="true"><path d="M4 6l9 18-9 18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>
    </>
  );
}

/** The box the arrows hang beside (position: relative; they sit just outside its left and right edges). */
export function SideHost({ children, side }: { children: ReactNode; side?: ReactNode }) {
  return <div className="fk-side-host">{children}{side}</div>;
}
