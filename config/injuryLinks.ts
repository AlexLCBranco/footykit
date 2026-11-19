// FK-40: each followed club's Transfermarkt "Suspensions and injuries" page, by ESPN team id → Transfermarkt club id.
// Source: Wikidata's "Transfermarkt team ID" (P7223) for each club's item (query.wikidata.org, read 2026-11-19); every
// page was opened once (https://www.transfermarkt.com/-/sperrenundverletzungen/verein/<id>) and its title named the club
// ("CR Flamengo - Suspensions and injuries | Transfermarkt"), all 54 clubs of the 2026 snapshot, Brazilian ones included.
// Transfermarkt accepts "-" for the club's page slug. A club missing here (a promoted club next season, a cup opponent
// we don't follow) gets Transfermarkt's search for its name instead (injuryLink), and tests/game-links.test.ts fails for
// a followed club without an id, so a new season's clubs get added here.

export const TRANSFERMARKT: Readonly<Record<string, number>> = {
  // Premier League
  349: 989, // AFC Bournemouth
  359: 11, // Arsenal
  362: 405, // Aston Villa
  337: 1148, // Brentford
  331: 1237, // Brighton & Hove Albion
  363: 631, // Chelsea
  388: 990, // Coventry City
  384: 873, // Crystal Palace
  368: 29, // Everton
  370: 931, // Fulham
  306: 3008, // Hull City
  373: 677, // Ipswich Town
  357: 399, // Leeds United
  364: 31, // Liverpool
  382: 281, // Manchester City
  360: 985, // Manchester United
  361: 762, // Newcastle United
  393: 703, // Nottingham Forest
  366: 289, // Sunderland
  367: 148, // Tottenham Hotspur
  // Brasileirão
  3458: 679, // Athletico-PR
  7632: 330, // Atlético-MG
  9967: 10010, // Bahia
  6086: 537, // Botafogo
  9318: 17776, // Chapecoense
  874: 199, // Corinthians
  3456: 776, // Coritiba
  2022: 609, // Cruzeiro
  819: 614, // Flamengo
  3445: 2462, // Fluminense
  6273: 210, // Grêmio
  1936: 6600, // Internacional
  9169: 3876, // Mirassol
  2029: 1023, // Palmeiras
  6079: 8793, // Red Bull Bragantino
  4936: 10997, // Remo
  2674: 221, // Santos
  2026: 585, // São Paulo
  3454: 978, // Vasco da Gama
  3457: 2125, // Vitória
  // LaLiga, Serie A, Bundesliga, Ligue 1
  1068: 13, // Atlético Madrid
  83: 131, // Barcelona
  244: 150, // Real Betis
  86: 418, // Real Madrid
  102: 1050, // Villarreal
  104: 12, // AS Roma
  2572: 1047, // Como
  110: 46, // Internazionale
  114: 6195, // Napoli
  132: 27, // Bayern Munich
  124: 16, // Borussia Dortmund
  11420: 23826, // RB Leipzig
  134: 79, // VfB Stuttgart
  160: 583, // Paris Saint-Germain
};

/**
 * The betting site's football page (calendarkit CK-15 uses FanDuel). A link to one match's props page needs FanDuel's
 * own event id, which nothing in ESPN's feed gives, so this is FanDuel's soccer section. Links only: no betting in the app.
 */
export const BETTING_FOOTBALL_URL = 'https://sportsbook.fanduel.com/soccer';
