// FK-73: a club's usual home ground, set by hand. Normally footykit works it out by itself: the stadium where the club
// plays most of its home matches this season (src/data/homeGround.ts). Add a line here only when that answer is wrong
// (a club that moved mid-season, a new stadium): team id → the venue's key as ESPN spells it, "name|city|country"
// (the same key as config/venues.json), with where the fact comes from.

export interface HomeGroundOverride { venue: string; source: string }

export const HOME_GROUND_OVERRIDES: Record<string, HomeGroundOverride> = {};
