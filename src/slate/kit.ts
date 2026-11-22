// FK-76 (gauntlet GT-14): the Slate kit: everything a host outside footykit (the gauntlet's whiteboard) uses to draw
// footykit's Slate, built on its own (vite.slatekit.config.ts) into /football/slatekit/, so the whiteboard loads
// footykit's current Slate at run time: a new card design here reaches the whiteboard with footykit's deploy, with no
// new pin in the gauntlet. React comes from the page that loads it (globalThis.__footykitHost, see
// vite.slatekit.config.ts), so the cards are part of the page's own React tree. /football/slatekit/manifest.json names
// the files and the kit's API version. The same way as calendarkit's kit.
//
// What it gives: the Slate part (./index.ts: SlateDay, the whole-day Slate as the site draws it, with its data loader,
// notes store and card sizes), its stylesheet (footy.css, through SlateDay), and (FK-77) one match's card on its own
// with the day's list of matches.
//
// SLATEKIT_API: bumped only when this list changes in a way an older gauntlet can't use (a name removed or a
// signature changed); the gauntlet then keeps its own pinned copy until it is updated. Adding names is fine.

export * from './index';

export const SLATEKIT_API = 1;
