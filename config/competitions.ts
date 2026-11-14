// Which ESPN competitions footykit shows, and the short code shown on hover beside each match's competition logo.
// Codes are footykit's own labels (not facts about the competitions), so they need no source.
// Friendlies and pre-season trophies are left out: they are not part of a club's season and would crowd the calendar.

export type CompKind = 'league' | 'cup' | 'continental' | 'state' | 'super';

export interface CompInfo { code: string; name: string; kind: CompKind }

export const COMPETITIONS: Record<string, CompInfo> = {
  'eng.1': { code: 'PL', name: 'Premier League', kind: 'league' },
  'esp.1': { code: 'LL', name: 'LaLiga', kind: 'league' },
  'ita.1': { code: 'SA', name: 'Serie A', kind: 'league' },
  'ger.1': { code: 'BL', name: 'Bundesliga', kind: 'league' },
  'fra.1': { code: 'L1', name: 'Ligue 1', kind: 'league' },
  'bra.1': { code: 'BSA', name: 'Brasileirão', kind: 'league' },
  'eng.fa': { code: 'FAC', name: 'FA Cup', kind: 'cup' },
  'eng.league_cup': { code: 'EFL', name: 'EFL Cup', kind: 'cup' },
  'esp.copa_del_rey': { code: 'CDR', name: 'Copa del Rey', kind: 'cup' },
  'ita.coppa_italia': { code: 'CI', name: 'Coppa Italia', kind: 'cup' },
  'ger.dfb_pokal': { code: 'DFB', name: 'DFB-Pokal', kind: 'cup' },
  'fra.coupe_de_france': { code: 'CDF', name: 'Coupe de France', kind: 'cup' },
  'bra.copa_do_brazil': { code: 'CDB', name: 'Copa do Brasil', kind: 'cup' },
  'bra.copa_do_nordeste': { code: 'CNE', name: 'Copa do Nordeste', kind: 'cup' },
  'uefa.champions': { code: 'UCL', name: 'Champions League', kind: 'continental' },
  'uefa.champions_qual': { code: 'UCLQ', name: 'Champions League qualifying', kind: 'continental' },
  'uefa.europa': { code: 'UEL', name: 'Europa League', kind: 'continental' },
  'uefa.europa_qual': { code: 'UELQ', name: 'Europa League qualifying', kind: 'continental' },
  'uefa.europa.conf': { code: 'UECL', name: 'Conference League', kind: 'continental' },
  'uefa.europa.conf_qual': { code: 'UECLQ', name: 'Conference League qualifying', kind: 'continental' },
  'conmebol.libertadores': { code: 'LIB', name: 'Libertadores', kind: 'continental' },
  'conmebol.sudamericana': { code: 'SUD', name: 'Sudamericana', kind: 'continental' },
  'bra.camp.carioca': { code: 'CAR', name: 'Carioca', kind: 'state' },
  'bra.camp.paulista': { code: 'PAU', name: 'Paulista', kind: 'state' },
  'bra.camp.mineiro': { code: 'MIN', name: 'Mineiro', kind: 'state' },
  'bra.camp.gaucho': { code: 'GAU', name: 'Gaúcho', kind: 'state' },
  'eng.charity': { code: 'CS', name: 'Community Shield', kind: 'super' },
  'esp.super_cup': { code: 'SCE', name: 'Supercopa de España', kind: 'super' },
  'ita.super_cup': { code: 'SCI', name: 'Supercoppa Italiana', kind: 'super' },
  'ger.super_cup': { code: 'SCG', name: 'DFL-Supercup', kind: 'super' },
  'fra.super_cup': { code: 'TDC', name: 'Trophée des Champions', kind: 'super' },
  'bra.supercopa_do_brazil': { code: 'SCB', name: 'Supercopa do Brasil', kind: 'super' },
  'uefa.super_cup': { code: 'USC', name: 'UEFA Super Cup', kind: 'super' },
  'conmebol.recopa': { code: 'REC', name: 'Recopa', kind: 'super' },
  'fifa.intercontinental_cup': { code: 'FIC', name: 'Intercontinental Cup', kind: 'super' },
  'fifa.cwc': { code: 'CWC', name: 'Club World Cup', kind: 'super' },
};

/** Left out on purpose. Any other slug the feeds carry is kept under a generic code and listed by the snapshot job. */
export const DROPPED = (slug: string) => slug === 'club.friendly' || slug.startsWith('friendly.') || slug === 'esp.joan_gamper';

export function compInfo(slug: string, espnName?: string): CompInfo {
  return COMPETITIONS[slug] ?? { code: slug.split('.').pop()!.slice(0, 4).toUpperCase(), name: espnName ?? slug, kind: 'cup' };
}
