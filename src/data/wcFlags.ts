// FK-69: each World Cup team's flag, from the free flag-icons set (https://github.com/lipis/flag-icons, MIT; the files
// used are copied to public/worldcup/flags/ by scripts/make-wc-flags.ts). The editions' team codes → the set's file.
// A team whose country no longer exists (or played under another name and flag) has no flag here: its tile shows the
// code instead, never a wrong or approximate flag.

/** Team code → flag-icons file name (ISO 3166-1 alpha-2; the United Kingdom's teams have their own). */
export const WC_FLAGS: Record<string, string> = {
  AGO: 'ao', ARE: 'ae', ARG: 'ar', AUS: 'au', AUT: 'at', BEL: 'be', BGR: 'bg', BIH: 'ba', BOL: 'bo', BRA: 'br', CAN: 'ca', CHE: 'ch',
  CHL: 'cl', CHN: 'cn', CIV: 'ci', CMR: 'cm', COD: 'cd', COL: 'co', CPV: 'cv', CRI: 'cr', CUB: 'cu', CUW: 'cw', CZE: 'cz', DEU: 'de',
  DNK: 'dk', DZA: 'dz', ECU: 'ec', EGY: 'eg', ENG: 'gb-eng', ESP: 'es', FRA: 'fr', GHA: 'gh', GRC: 'gr', HND: 'hn', HRV: 'hr', HTI: 'ht',
  HUN: 'hu', IRL: 'ie', IRN: 'ir', IRQ: 'iq', ISL: 'is', ISR: 'il', ITA: 'it', JAM: 'jm', JOR: 'jo', JPN: 'jp', KOR: 'kr', KWT: 'kw',
  MAR: 'ma', MEX: 'mx', NGA: 'ng', NIR: 'gb-nir', NLD: 'nl', NOR: 'no', NZL: 'nz', PAN: 'pa', PER: 'pe', POL: 'pl', PRK: 'kp', PRT: 'pt',
  PRY: 'py', QAT: 'qa', ROU: 'ro', RUS: 'ru', SAU: 'sa', SCO: 'gb-sct', SEN: 'sn', SLV: 'sv', SRB: 'rs', SVK: 'sk', SVN: 'si', SWE: 'se',
  TGO: 'tg', TTO: 'tt', TUN: 'tn', TUR: 'tr', UKR: 'ua', URY: 'uy', USA: 'us', UZB: 'uz', WAL: 'gb-wls', ZAF: 'za',
};

/** Codes of countries that no longer exist: Czechoslovakia, East Germany, Serbia and Montenegro, Soviet Union, Yugoslavia; and the Dutch East Indies (1938). */
export const WC_NO_FLAG = ['CSK', 'DDR', 'SCG', 'SUN', 'YUG', 'IDN'];
/** Names a still-used code played under with another flag (1974: Zaire, today's DR Congo). */
export const WC_NO_FLAG_NAMES = ['Zaire'];

/** The team's flag file ("gb-eng"), or undefined: the neutral tile with its code. `name`: the team's name in that edition. */
export function flagOf(code: string, name?: string): string | undefined {
  if (name && WC_NO_FLAG_NAMES.includes(name)) return undefined;
  return WC_FLAGS[code];
}

const BASE = `${import.meta.env?.BASE_URL ?? '/'}worldcup/flags/`;
export const flagUrl = (file: string) => `${BASE}${file}.svg`;
