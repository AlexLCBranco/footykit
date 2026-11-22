// The Slate's self-contained part, for a host outside footykit (a gauntlet widget): one local day of the followed
// clubs' matches as cards with a note box each. Inputs: the data (loadFootyData), a day, a time zone, a notes store
// (localNotesStore), a width, and the host's choices (teamLink, live). Nothing from footykit's app shell.
// docs/slate-in-gauntlet.md is the guide.

export { loadFootyData, loadSnapshot } from '../data/load';
export type { Model as FootyData } from '../data/model';
export { SNAPSHOT_URL } from '../address';
export { SlateDay, SlateMatchCard, teamCalendarUrl, type SlateDayProps, type SlateHostProps, type SlateMatchCardProps } from './SlateDay';
// FK-77: the day's list of matches (exact start instants) for a host that mixes them with another sport's games
export { SLATE_DAY_START_HOUR, SLATE_DAY_ZONE, slateDayOf, slateMatches, type SlateMatch } from './matches';
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
export { copyColumns, COPY_GAP, COPY_MARGIN, PAGE as COPY_PAGE } from '../components/Copy';
// FK-35: calendarkit's card sizes and header line, for a combined Slate
export { slateHeaderLabel, SLATE_CARD_WIDTH, SLATE_CARD_HEIGHT, SLATE_INFO_WIDTH } from './layout';
