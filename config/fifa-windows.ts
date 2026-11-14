// FIFA international match windows (men) touching this season: 2026 (the Brasileirão's calendar year) and 2026-27
// (Europe). Researched 2026-11-14, each with its source. **For Alex to confirm** (secondary sources; FIFA's own
// calendar PDF was not checked). In Europe club football stops in these windows; the Brasileirão usually keeps
// playing, so its matches inside a window are flagged.

export interface FifaWindow { from: string; to: string; label: string; source: string; provisional?: true }

export const FIFA_WINDOWS: FifaWindow[] = [
  { from: '2026-03-23', to: '2026-03-31', label: 'FIFA window (March 2026)', source: 'https://en.wikipedia.org/wiki/FIFA_International_Match_Calendar' },
  { from: '2026-06-01', to: '2026-07-19', label: 'FIFA World Cup 2026 (release from Jun 1, final Jul 19)', source: 'https://en.wikipedia.org/wiki/2026_FIFA_World_Cup', provisional: true },
  { from: '2026-09-21', to: '2026-10-06', label: 'FIFA window (September–October 2026, merged)', source: 'https://www.si.com/soccer/when-is-next-international-break-2026-dates-schedule' },
  { from: '2026-11-09', to: '2026-11-17', label: 'FIFA window (November 2026)', source: 'https://www.si.com/soccer/when-is-next-international-break-2026-dates-schedule' },
  { from: '2027-03-22', to: '2027-03-30', label: 'FIFA window (March 2027)', source: 'https://www.sportsmole.co.uk/football/england/news/international-break-what-will-the-2027-calendar-look-like_608911.html', provisional: true },
  { from: '2027-06-07', to: '2027-06-15', label: 'FIFA window (June 2027)', source: 'https://en.wikipedia.org/wiki/FIFA_International_Match_Calendar', provisional: true },
];
