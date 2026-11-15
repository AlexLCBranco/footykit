// Altitude levels for venues on the travel map (thin air matters for Libertadores and Sudamericana trips). Alex asked
// for levels instead of one mark (2026-11-14) and confirmed this scale. The names are footykit's own; the lines:
// - 1,500 m: where sports medicine starts calling it high altitude (Physio-pedia, "Altitude and Sport");
// - 2,500 m: FIFA's May 2007 ban on internationals above it (raised to 3,000 m in June 2007);
// - 3,000 m: the start of "high altitude" in Bärtsch & Saltin's classification (2008), the sports-science standard
//   (moderate 2,000–3,000 m, high 3,000–5,500 m);
// - 3,500 m: footykit's own line (no source: the classification has none until 5,500 m) — only the Bolivian Altiplano
//   grounds (La Paz, El Alto, Oruro, Potosí) are this high.

export interface AltitudeLevel { from: number; name: string; source?: string }

/** Lowest first. */
export const ALTITUDE_LEVELS: AltitudeLevel[] = [
  { from: 1500, name: 'moderate altitude', source: 'https://www.physio-pedia.com/Altitude_and_Sport' },
  { from: 2500, name: 'high altitude', source: 'https://en.wikipedia.org/wiki/FIFA_altitude_ban' },
  { from: 3000, name: 'very high altitude', source: 'https://researchprofiles.ku.dk/da/publications/general-introduction-to-altitude-adaptation-and-mountain-sickness/' },
  { from: 3500, name: 'insane altitude' },
];
