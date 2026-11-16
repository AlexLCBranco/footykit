// The header above a club's Calendar and List (FK-23, calendarkit's TeamHeader.tsx / team-header.css): its logo on a
// 48 px light disc, its full name, and the period on show at the right. Part of the page (so a whole-view copy has it,
// as calendarkit's copies do), not of the fixed bar.

import { useState } from 'react';
import { teamLogoUrl } from '../address';
import { monthLabel } from '../data/model';
import { useFooty } from './ctx';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const md = (d: string) => `${MONTHS[Number(d.slice(5, 7)) - 1]} ${Number(d.slice(8, 10))}`;

/** calendarkit's fmtRange: "Nov 15 – 21, 2026", "Nov 29 – Dec 5, 2026", "Dec 27, 2026 – Jan 2, 2027". */
export function fmtRange(from: string, to: string): string {
  if (from.slice(0, 4) !== to.slice(0, 4)) return `${md(from)}, ${from.slice(0, 4)} – ${md(to)}, ${to.slice(0, 4)}`;
  const end = from.slice(0, 7) === to.slice(0, 7) ? String(Number(to.slice(8))) : md(to);
  return `${md(from)} – ${end}, ${to.slice(0, 4)}`;
}

/** calendarkit's fmtMonthSpan: "November 2026", "October – November 2026", "December 2026 – January 2027". */
export function fmtMonthSpan(from: string, to: string): string {
  if (from === to) return monthLabel(from);
  const [a, b] = [monthLabel(from), monthLabel(to)];
  return from.slice(0, 4) === to.slice(0, 4) ? `${a.replace(/ \d{4}$/, '')} – ${b}` : `${a} – ${b}`;
}

export function TeamHeader({ team, period }: { team: string; period: string }) {
  const { model } = useFooty();
  const [failed, setFailed] = useState(false);
  return (
    <div className="fk-team-header" data-testid="team-header">
      <span className="fk-logo-backing" aria-hidden="true">
        {!failed && <img src={teamLogoUrl(team)} alt="" width={48} height={48} onError={() => setFailed(true)} />}
      </span>
      <h2 className="fk-team-header-name" data-testid="team-header-name">{model.team(team).name}</h2>
      <span className="fk-team-period" data-testid="team-period">{period}</span>
    </div>
  );
}
