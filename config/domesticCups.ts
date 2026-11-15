// Domestic cups (PLAN.md Phase 4): which rounds are two-legged, the final, the tie rules as the sources state them.
// Researched 2026-11-15 from Wikipedia's 2026-27 (Copa do Brasil: 2026) pages; listed for Alex to confirm. Rounds
// themselves come from ESPN's data (each cup's round names differ and later rounds appear once drawn); winners are read
// from the scores and shootouts, so a rule the source doesn't state doesn't change what is shown.

export interface DomesticCup {
  slug: string;
  /** ESPN round names played over two legs (any round whose matches carry ESPN's leg number counts too) */
  twoLeg: string[];
  final: { day: string; venue?: string };
  rules: string[];
  source: string;
}

export const DOMESTIC_CUPS: DomesticCup[] = [
  {
    slug: 'eng.fa',
    twoLeg: [],
    final: { day: '2027-05-22', venue: 'Wembley Stadium, London' },
    rules: ['Single matches, no replays in the proper rounds', 'Premier League clubs enter in the third round (9 Jan 2027)', 'Level: extra time, then penalties (seen in results; the page doesn\'t state the rule)'],
    source: 'https://en.wikipedia.org/wiki/2026%E2%80%9327_FA_Cup',
  },
  {
    slug: 'eng.league_cup',
    twoLeg: ['Semifinals'],
    final: { day: '2027-03-21', venue: 'Wembley Stadium, London' },
    rules: ['Single matches; the semi-finals over two legs', 'Level: penalties (seen in the early rounds; extra time not stated)'],
    source: 'https://en.wikipedia.org/wiki/2026%E2%80%9327_EFL_Cup',
  },
  {
    slug: 'esp.copa_del_rey',
    twoLeg: ['Qualifying Round', 'Semifinals'],
    final: { day: '2027-04-24', venue: 'Estadio de La Cartuja, Seville' },
    rules: ['Single matches, played at the lower-division club; the preliminary round and the semi-finals over two legs', 'Level: extra time, then penalties'],
    source: 'https://en.wikipedia.org/wiki/2026%E2%80%9327_Copa_del_Rey',
  },
  {
    slug: 'ita.coppa_italia',
    twoLeg: ['Semifinals'],
    final: { day: '2027-05-19', venue: 'Stadio Olimpico, Rome' },
    rules: ['Single matches; the semi-finals over two legs', 'Serie A\'s seeded clubs enter in the round of 16; the bracket is set in advance', 'Extra time / penalties: not stated (shootouts seen in results)'],
    source: 'https://en.wikipedia.org/wiki/2026%E2%80%9327_Coppa_Italia',
  },
  {
    slug: 'ger.dfb_pokal',
    twoLeg: [],
    final: { day: '2027-05-29', venue: 'Olympiastadion, Berlin' },
    rules: ['Single matches, a new draw each round', 'Level: extra time, then penalties'],
    source: 'https://en.wikipedia.org/wiki/2026%E2%80%9327_DFB-Pokal',
  },
  {
    slug: 'fra.coupe_de_france',
    twoLeg: [],
    final: { day: '2027-05-15' },
    rules: ['Single matches', 'Ligue 1 clubs enter in the round of 64 (19–20 Dec 2026)', 'Extra time / penalties: not stated (shootouts seen in results); final venue not stated'],
    source: 'https://en.wikipedia.org/wiki/2026%E2%80%9327_Coupe_de_France',
  },
  {
    slug: 'bra.copa_do_brazil',
    twoLeg: ['Fifth Round', 'Round of 16', 'Quarterfinals', 'Semifinals'],
    final: { day: '2026-12-06', venue: 'Estádio Nacional Mané Garrincha, Brasília' },
    rules: ['Single matches in rounds 1–4 (the better-ranked club hosts in round 1); two legs from the fifth round to the semi-finals; the final is one match', 'Away goals, extra time and penalties: not stated (shootouts seen in results)'],
    source: 'https://en.wikipedia.org/wiki/2026_Copa_do_Brasil',
  },
];
