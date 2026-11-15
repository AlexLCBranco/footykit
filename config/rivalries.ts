// Derbies and rivalries, for the derby flag (Phase 3). Hand-maintained: researched 2026-11-14 for every league
// footykit covers, confirmed by Alex the same day; add, drop or rename pairs here. Only pairs with at least one followed club are
// listed (others never show). Each entry: ESPN team ids, the rivalry's usual name and a page that documents it
// (`npm run check-rivalries` checks every source page answers). The flag shows in any competition, cups included.

export interface Rivalry {
  /** ESPN team ids (order doesn't matter) */
  teams: [string, string];
  name: string;
  source: string;
}

const EN = 'https://en.wikipedia.org/wiki/';
const PT = 'https://pt.wikipedia.org/wiki/';

export const RIVALRIES: Rivalry[] = [
  // England
  { teams: ['359', '367'], name: 'North London derby', source: `${EN}North_London_derby` }, // ARS–TOT
  { teams: ['368', '364'], name: 'Merseyside derby', source: `${EN}Merseyside_derby` }, // EVE–LIV
  { teams: ['382', '360'], name: 'Manchester derby', source: `${EN}Manchester_derby` }, // MNC–MAN
  { teams: ['364', '360'], name: 'North West derby', source: `${EN}Liverpool_F.C.%E2%80%93Manchester_United_F.C._rivalry` }, // LIV–MAN
  { teams: ['361', '366'], name: 'Tyne–Wear derby', source: `${EN}Tyne%E2%80%93Wear_derby` }, // NEW–SUN
  { teams: ['331', '384'], name: 'M23 derby', source: `${EN}M23_derby` }, // BHA–CRY
  { teams: ['357', '360'], name: 'Roses rivalry', source: `${EN}Leeds_United_F.C.%E2%80%93Manchester_United_F.C._rivalry` }, // LEE–MAN
  { teams: ['359', '363'], name: 'Arsenal–Chelsea rivalry', source: `${EN}Arsenal_F.C.%E2%80%93Chelsea_F.C._rivalry` }, // ARS–CHE
  { teams: ['363', '367'], name: 'Chelsea–Tottenham rivalry', source: `${EN}Chelsea_F.C.%E2%80%93Tottenham_Hotspur_F.C._rivalry` }, // CHE–TOT
  { teams: ['363', '370'], name: 'West London derby', source: `${EN}West_London_derby` }, // CHE–FUL
  { teams: ['337', '370'], name: 'West London derby', source: `${EN}West_London_derby` }, // BRE–FUL
  { teams: ['337', '363'], name: 'West London derby', source: `${EN}West_London_derby` }, // BRE–CHE
  // Brazil
  { teams: ['874', '2026'], name: 'Majestoso', source: `${EN}Cl%C3%A1ssico_Majestoso` }, // COR–SAO
  { teams: ['874', '2029'], name: 'Derby Paulista', source: `${EN}Derby_Paulista` }, // COR–PAL
  { teams: ['2029', '2026'], name: 'Choque-Rei', source: `${EN}Choque-Rei` }, // PAL–SAO
  { teams: ['2674', '2026'], name: 'San-São', source: `${EN}San-S%C3%A3o` }, // SAN–SAO
  { teams: ['874', '2674'], name: 'Clássico Alvinegro', source: `${EN}Cl%C3%A1ssico_Alvinegro` }, // COR–SAN
  { teams: ['2029', '2674'], name: 'Clássico da Saudade', source: `${EN}Cl%C3%A1ssico_da_Saudade` }, // PAL–SAN
  { teams: ['819', '3445'], name: 'Fla-Flu', source: `${EN}Fla%E2%80%93Flu` }, // FLA–FLU
  { teams: ['819', '3454'], name: 'Clássico dos Milhões', source: `${EN}Cl%C3%A1ssico_dos_Milh%C3%B5es` }, // FLA–VAS
  { teams: ['3445', '3454'], name: 'Clássico dos Gigantes', source: `${PT}Cl%C3%A1ssico_dos_Gigantes` }, // FLU–VAS
  { teams: ['6086', '3445'], name: 'Clássico Vovô', source: `${EN}Cl%C3%A1ssico_Vov%C3%B4` }, // BOT–FLU
  { teams: ['6086', '3454'], name: 'Clássico da Amizade', source: `${PT}Cl%C3%A1ssico_da_Amizade` }, // BOT–VAS
  { teams: ['819', '6086'], name: 'Clássico da Rivalidade', source: `${PT}Cl%C3%A1ssico_da_Rivalidade` }, // FLA–BOT
  { teams: ['7632', '2022'], name: 'Clássico Mineiro', source: `${EN}Cl%C3%A1ssico_Mineiro` }, // CAM–CRU
  { teams: ['6273', '1936'], name: 'Grenal', source: `${EN}Grenal` }, // GRE–INT
  { teams: ['9967', '3457'], name: 'Ba-Vi', source: `${PT}Ba-Vi` }, // BAH–VIT
  { teams: ['3458', '3456'], name: 'Atletiba', source: `${EN}Atletiba` }, // CAP–CFC
  // Spain
  { teams: ['86', '83'], name: 'El Clásico', source: `${EN}El_Cl%C3%A1sico` }, // RMA–BAR
  { teams: ['1068', '86'], name: 'Madrid derby', source: `${EN}Madrid_derby` }, // ATM–RMA
  { teams: ['83', '88'], name: 'Derbi Barceloní', source: `${EN}Derbi_Barcelon%C3%AD` }, // BAR–ESP
  { teams: ['244', '243'], name: 'Seville derby', source: `${EN}Seville_derby` }, // BET–SEV
  { teams: ['102', '94'], name: 'Derbi de la Comunitat', source: `${EN}Derbi_de_la_Comunitat` }, // VIL–VAL
  // Italy
  { teams: ['110', '103'], name: 'Derby della Madonnina', source: `${EN}Derby_della_Madonnina` }, // INT–MIL
  { teams: ['110', '111'], name: "Derby d'Italia", source: `${EN}Derby_d%27Italia` }, // INT–JUV
  { teams: ['104', '112'], name: 'Derby della Capitale', source: `${EN}Derby_della_Capitale` }, // ROMA–LAZ
  { teams: ['114', '104'], name: 'Derby del Sole', source: `${EN}Derby_del_Sole` }, // NAP–ROMA
  // Germany
  { teams: ['132', '124'], name: 'Der Klassiker', source: `${EN}Der_Klassiker` }, // MUN–DOR
  { teams: ['124', '133'], name: 'Revierderby', source: `${EN}Revierderby` }, // DOR–S04
  // France
  { teams: ['160', '176'], name: 'Le Classique', source: `${EN}Le_Classique` }, // PSG–OLM
  { teams: ['160', '6851'], name: 'Paris derby', source: `${EN}Paris_derby` }, // PSG–PAR
];
