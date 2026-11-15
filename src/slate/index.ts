// The Slate's self-contained part, for a host outside footykit (a gauntlet widget): one local day of the followed
// clubs' matches as cards with a note box each. Inputs: the data (loadFootyData), a day, a time zone, a notes store
// (localNotesStore), a width, and the host's choices (teamLink, live). Nothing from footykit's app shell.
// docs/slate-in-gauntlet.md is the guide.

export { loadFootyData, loadSnapshot } from '../data/load';
export type { Model as FootyData } from '../data/model';
export { SNAPSHOT_URL } from '../address';
export { SlateDay, teamCalendarUrl, type SlateDayProps } from './SlateDay';
export { matchUrl } from '../data/snapshot';
export {
  createNotesStore,
  EMPTY_NOTE,
  localNotesStore,
  mergeNotes,
  NOTES_KEY,
  parseNotes,
  SAVE_DELAY_MS,
  SLOTS,
  type GameNote,
  type NotesMap,
  type NotesStore,
  type Slot,
  type SlateNotes,
} from './notes';
export { copyColumns, COPY_GAP, PAGE as COPY_PAGE } from '../components/Copy';
