// FK-67: the 2026 World Cup teams as CazéTV's video titles name them (Portuguese, upper case, accents dropped by the
// reader), each mapped to the team's code in public/worldcup/2026.json. More than one spelling per team where Brazilian
// broadcasters use both (Holanda / Países Baixos, Tchéquia / República Tcheca). Read by src/data/wcVideos.ts.

export const WC_NAMES_PT: Record<string, string> = {
  'AFRICA DO SUL': 'ZAF', ALEMANHA: 'DEU', 'ARABIA SAUDITA': 'SAU', ARGELIA: 'DZA', ARGENTINA: 'ARG', AUSTRALIA: 'AUS',
  AUSTRIA: 'AUT', BELGICA: 'BEL', BOSNIA: 'BIH', 'BOSNIA E HERZEGOVINA': 'BIH', 'BOSNIA-HERZEGOVINA': 'BIH', BRASIL: 'BRA',
  'CABO VERDE': 'CPV', CANADA: 'CAN', CATAR: 'QAT', QATAR: 'QAT', COLOMBIA: 'COL', 'COREIA DO SUL': 'KOR',
  'COSTA DO MARFIM': 'CIV', CROACIA: 'HRV', CURACAO: 'CUW', EGITO: 'EGY', EQUADOR: 'ECU', ESCOCIA: 'SCO', ESPANHA: 'ESP',
  'ESTADOS UNIDOS': 'USA', EUA: 'USA', FRANCA: 'FRA', GANA: 'GHA', HAITI: 'HTI', HOLANDA: 'NLD', 'PAISES BAIXOS': 'NLD',
  INGLATERRA: 'ENG', IRA: 'IRN', IRAQUE: 'IRQ', JAPAO: 'JPN', JORDANIA: 'JOR', MARROCOS: 'MAR', MEXICO: 'MEX',
  NORUEGA: 'NOR', 'NOVA ZELANDIA': 'NZL', PANAMA: 'PAN', PARAGUAI: 'PRY', PORTUGAL: 'PRT', 'RD CONGO': 'COD',
  'RD DO CONGO': 'COD', 'REPUBLICA DEMOCRATICA DO CONGO': 'COD', SENEGAL: 'SEN', SUECIA: 'SWE', SUICA: 'CHE',
  TCHEQUIA: 'CZE', 'REPUBLICA TCHECA': 'CZE', TUNISIA: 'TUN', TURQUIA: 'TUR', URUGUAI: 'URY', UZBEQUISTAO: 'UZB',
};
