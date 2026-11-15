// Champions League 2026-27 rules for the competition page (Phase 4): pots, zones, tiebreakers, knockout pairings.
// Researched 2026-11-14 from UEFA's 2026/27 regulations and Wikipedia; DRAFT until Alex confirms (PLAN.md).
// Teams are ESPN ids (the snapshot's). tests/ucl.test.ts checks the pots against the drawn fixtures: every team
// meets exactly two teams of each pot, one at home and one away (UEFA's draw rule), which a wrong pot would break.

export const UCL_REGS = 'https://documents.uefa.com/r/Regulations-of-the-UEFA-Champions-League-2026/27-Online';
const LEAGUE_PHASE = 'https://en.wikipedia.org/wiki/2026%E2%80%9327_UEFA_Champions_League_league_phase';

/** Pots 1–4 by UEFA club coefficient; the title holders (PSG) head pot 1. */
export const UCL_POTS: { pot: 1 | 2 | 3 | 4; teams: string[] }[] = [
  // PSG (holders), Bayern, Real Madrid, Liverpool, Inter, Man City, Arsenal, Barcelona, Atlético
  { pot: 1, teams: ['160', '132', '86', '364', '110', '382', '359', '83', '1068'] },
  // Dortmund, Roma, Sporting, Aston Villa, Porto, Man Utd, Club Brugge, Real Betis, PSV
  { pot: 2, teams: ['124', '104', '2250', '362', '437', '360', '570', '244', '148'] },
  // Feyenoord, Lille, Bodø/Glimt, Napoli, RB Leipzig, Villarreal, Fenerbahçe, Shakhtar, Galatasaray
  { pot: 3, teams: ['142', '166', '2980', '114', '11420', '102', '436', '493', '432'] },
  // Slavia Prague, Slovan Bratislava, Stuttgart, AEK Athens, LASK, Como, Lens, Viking, Sabah
  { pot: 4, teams: ['494', '521', '134', '887', '4411', '2572', '175', '510', '21922'] },
];
export const UCL_POTS_SOURCE = LEAGUE_PHASE;

/** League-phase dates (first matchday's first day, last matchday's last day): the page's matches are the ones between
 * two league-phase teams inside them. */
export const UCL_LEAGUE_PHASE = { from: '2026-09-08', to: '2027-01-27', source: LEAGUE_PHASE };

/** League-phase zones (Art. 19.01–19.02; 25th–36th go out, "with no access to the UEFA Europa League"). */
export const UCL_ZONES = [
  { from: 1, to: 8, id: 'r16', label: 'Round of 16 (seeded)' },
  { from: 9, to: 16, id: 'po-seeded', label: 'Knockout play-offs, seeded' },
  { from: 17, to: 24, id: 'po-unseeded', label: 'Knockout play-offs, unseeded' },
  { from: 25, to: 36, id: 'out', label: 'Eliminated' },
] as const;
export const UCL_ZONES_SOURCE = [`${UCL_REGS} (Article 19)`, 'https://www.uefa.com/uefachampionsleague/news/0268-12157d69ce2d-9f011c70f6fa-1000--new-format-for-champions-league-post-2024-everything-you-ne/'];

/** Equal points, in order (Art. 18.01). The regulations apply them once the league phase is complete. */
export const UCL_TIEBREAKERS = [
  'goal difference',
  'goals scored',
  'away goals scored',
  'wins',
  'away wins',
  'points of league-phase opponents (together)',
  'goal difference of league-phase opponents (together)',
  'goals scored by league-phase opponents (together)',
  'fewer disciplinary points (yellow 1, red 3, two yellows 3)',
  'club coefficient',
];
export const UCL_TIEBREAKERS_SOURCE = 'https://documents.uefa.com/r/Regulations-of-the-UEFA-Champions-League-2026/27/Article-18-Equality-of-points-league-phase-Online';

/**
 * Knockout pairings by league position (Art. 19.02–19.03): play-off ties are fixed pairs of positions, the seeded side
 * (9–16) hosts the second leg; each round-of-16 seeded pair meets the winner of one play-off pairing. Which of the two
 * positions within a pair meets which is drawn. No country protection in the knockout phase.
 */
export const UCL_PLAYOFF_PAIRS: { seeded: [number, number]; unseeded: [number, number]; r16: [number, number] }[] = [
  { seeded: [9, 10], unseeded: [23, 24], r16: [7, 8] },
  { seeded: [11, 12], unseeded: [21, 22], r16: [5, 6] },
  { seeded: [13, 14], unseeded: [19, 20], r16: [3, 4] },
  { seeded: [15, 16], unseeded: [17, 18], r16: [1, 2] },
];
export const UCL_KNOCKOUT_SOURCE = [
  'https://documents.uefa.com/r/Regulations-of-the-UEFA-Champions-League-2026/27/Article-19-Draw-system-knockout-phase-Online',
  'https://en.wikipedia.org/wiki/2025%E2%80%9326_UEFA_Champions_League_knockout_phase',
];
/** Two legs on aggregate; level → 30 min extra time (no away goals) → penalties. Final: one match at a neutral venue. */
export const UCL_TIE_RULE_SOURCE = 'https://en.wikipedia.org/wiki/2025%E2%80%9326_UEFA_Champions_League_knockout_phase';

/** Knockout calendar (draws and the final), for the page's empty slots. */
export const UCL_KO_DATES = {
  playoffDraw: '2027-01-29',
  r16Draw: '2027-02-26',
  final: { day: '2027-06-05', venue: 'Metropolitano Stadium, Madrid' },
  source: 'https://en.wikipedia.org/wiki/2026%E2%80%9327_UEFA_Champions_League_knockout_phase',
};
