// Neutral venues. ESPN's `neutralSite` is false on every match (Phase 1), so which matches are neutral comes from
// here: a rule per competition and round, for this season's editions, each with its source. Researched 2026-11-14;
// **for Alex to confirm**. A match is neutral when a rule's competition matches and its round matches `rounds` (a
// regex on ESPN's round name; omitted = every match of that competition this season).
// Not neutral this season (checked): DFL-Supercup 2026 (played at Dortmund's ground), Trophée des Champions 2026
// (at Lens' ground), Recopa (two legs, home and away). Not found: the 2026-27 Supercoppa Italiana's venue — no rule
// until it is known.

export interface NeutralRule { comp: string; rounds?: RegExp; why: string; source: string }

export const NEUTRAL_RULES: NeutralRule[] = [
  { comp: 'eng.charity', why: 'Community Shield 2026, Principality Stadium, Cardiff', source: 'https://www.fourfourtwo.com/competition/big-change-made-to-community-shield-plans-for-2026' },
  { comp: 'eng.fa', rounds: /^(semi-?finals?|final)$/i, why: 'FA Cup semi-finals and final at Wembley', source: 'https://en.wikipedia.org/wiki/FA_Cup' },
  { comp: 'eng.league_cup', rounds: /^final$/i, why: 'EFL Cup final at Wembley', source: 'https://en.wikipedia.org/wiki/EFL_Cup' },
  { comp: 'esp.copa_del_rey', rounds: /^final$/i, why: 'Copa del Rey final, single match at a designated venue', source: 'https://en.wikipedia.org/wiki/Copa_del_Rey' },
  { comp: 'esp.super_cup', why: 'Supercopa de España 2027, Atatürk Olympic Stadium, Istanbul', source: 'https://www.insideworldfootball.com/2026/08/14/spanish-super-cup-relocates-from-saudi-to-turkey-for-2027-edition-due-to-clash-with-asian-cup-hosting/' },
  { comp: 'ita.coppa_italia', rounds: /^final$/i, why: 'Coppa Italia final, single match at the Stadio Olimpico, Rome', source: 'https://en.wikipedia.org/wiki/Coppa_Italia' },
  { comp: 'ger.dfb_pokal', rounds: /^final$/i, why: 'DFB-Pokal final at the Olympiastadion, Berlin', source: 'https://en.wikipedia.org/wiki/DFB-Pokal' },
  { comp: 'fra.coupe_de_france', rounds: /^final$/i, why: 'Coupe de France final at the Stade de France', source: 'https://en.wikipedia.org/wiki/Coupe_de_France' },
  { comp: 'uefa.champions', rounds: /^final$/i, why: 'Champions League final 2027, Madrid', source: 'https://www.fourfourtwo.com/competition/where-is-the-2027-champions-league-final-finally-an-accessible-host-city' },
  { comp: 'uefa.europa', rounds: /^final$/i, why: 'Europa League final 2027, Frankfurt', source: 'https://stadiumdb.com/news/2024/05/uefa_new_arenas_for_european_cup_finals_revealed_are_there_any_surprises' },
  { comp: 'uefa.europa.conf', rounds: /^final$/i, why: 'Conference League final 2027, Istanbul', source: 'https://www.uefa.com/uefaconferenceleague/final/' },
  { comp: 'uefa.super_cup', why: 'UEFA Super Cup, single match at a neutral venue', source: 'https://en.wikipedia.org/wiki/UEFA_Super_Cup' },
  { comp: 'conmebol.libertadores', rounds: /^final$/i, why: 'Libertadores final, single match at a neutral venue (since 2019)', source: 'https://en.wikipedia.org/wiki/Copa_Libertadores' },
  { comp: 'conmebol.sudamericana', rounds: /^final$/i, why: 'Sudamericana final, single match at a neutral venue (since 2019)', source: 'https://en.wikipedia.org/wiki/Copa_Sudamericana' },
  { comp: 'bra.copa_do_brazil', rounds: /^final$/i, why: 'Copa do Brasil 2026 final, single match at the Mané Garrincha, Brasília (Dec 6)', source: 'https://istoe.com.br/final-copa-do-brasil-2026-jogo-unico-mane-garrincha' },
  { comp: 'bra.supercopa_do_brazil', why: 'Supercopa do Brasil, single match at a neutral venue', source: 'https://en.wikipedia.org/wiki/Supercopa_do_Brasil' },
  { comp: 'fifa.intercontinental_cup', why: 'Intercontinental Cup, neutral venues', source: 'https://en.wikipedia.org/wiki/FIFA_Intercontinental_Cup' },
];
