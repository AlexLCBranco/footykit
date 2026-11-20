// FK-69: the World Cup's stadiums, per edition: which stadium each host city's matches were played in, its Wikidata
// item (scripts/make-wc-venues.ts reads its coordinates from there) and its roof over the pitch. Researched facts, each
// with its source (the stadium's Wikipedia article, read 2026-11-20), for Alex to confirm.
// Roof: `open` = the pitch is under the sky (stands may be covered), `fixed` = a roof that never opens, `retractable`.
// `city` is the match's `city` in public/worldcup/<year>.json.

export type Roof = 'open' | 'fixed' | 'retractable';
export interface WcStadiumFact { city: string; name: string; wikidata: string; roof: Roof; source: string }

const wp = (title: string) => `https://en.wikipedia.org/wiki/${title}`;

export const WC_STADIUMS: Record<number, WcStadiumFact[]> = {
  2026: [
    { city: 'Atlanta', name: 'Mercedes-Benz Stadium', wikidata: 'Q7007552', roof: 'retractable', source: wp('Mercedes-Benz_Stadium') },
    { city: 'Boston (Foxborough)', name: 'Gillette Stadium', wikidata: 'Q373355', roof: 'open', source: wp('Gillette_Stadium') },
    { city: 'Dallas (Arlington)', name: 'AT&T Stadium', wikidata: 'Q838284', roof: 'retractable', source: wp('AT%26T_Stadium') },
    { city: 'Guadalajara (Zapopan)', name: 'Estadio Akron', wikidata: 'Q666183', roof: 'open', source: wp('Estadio_Akron') },
    { city: 'Houston', name: 'NRG Stadium', wikidata: 'Q1058864', roof: 'retractable', source: wp('NRG_Stadium') },
    { city: 'Kansas City', name: 'Arrowhead Stadium', wikidata: 'Q544553', roof: 'open', source: wp('Arrowhead_Stadium') },
    // a translucent ETFE canopy over the whole bowl, open at the sides, that never opens
    { city: 'Los Angeles (Inglewood)', name: 'SoFi Stadium', wikidata: 'Q19520501', roof: 'fixed', source: wp('SoFi_Stadium') },
    { city: 'Mexico City', name: 'Estadio Azteca', wikidata: 'Q320454', roof: 'open', source: wp('Estadio_Azteca') },
    { city: 'Miami (Miami Gardens)', name: 'Hard Rock Stadium', wikidata: 'Q864339', roof: 'open', source: wp('Hard_Rock_Stadium') },
    { city: 'Monterrey (Guadalupe)', name: 'Estadio BBVA', wikidata: 'Q3058827', roof: 'open', source: wp('Estadio_BBVA') },
    { city: 'New York/New Jersey (East Rutherford)', name: 'MetLife Stadium', wikidata: 'Q10862290', roof: 'open', source: wp('MetLife_Stadium') },
    { city: 'Philadelphia', name: 'Lincoln Financial Field', wikidata: 'Q1052370', roof: 'open', source: wp('Lincoln_Financial_Field') },
    { city: 'San Francisco Bay Area (Santa Clara)', name: "Levi's Stadium", wikidata: 'Q7419343', roof: 'open', source: wp('Levi%27s_Stadium') },
    { city: 'Seattle', name: 'Lumen Field', wikidata: 'Q612736', roof: 'open', source: wp('Lumen_Field') },
    { city: 'Toronto', name: 'BMO Field', wikidata: 'Q796351', roof: 'open', source: wp('BMO_Field') },
    { city: 'Vancouver', name: 'BC Place', wikidata: 'Q612227', roof: 'retractable', source: wp('BC_Place') },
  ],
};

/**
 * Whether a retractable roof was open for a match: edition → match number → the state and where it is recorded.
 * Empty: no source lists it per match (searched 2026-11-20), so those matches show "Retractable roof" alone.
 */
export const WC_ROOF_STATE: Record<number, Record<number, { open: boolean; source: string }>> = {};
