// Round names, shared by the job's knockout logic (ko.ts) and the app's context tags (alive.ts). Kept apart from
// ko.ts because ko.ts reads raw ESPN events and the app must not import those.

/** Group stage, league phase and other round-robin rounds: no tie is decided in one of these matches. */
export function isPhaseRound(roundName: string | undefined): boolean {
  return /group|league|phase|stage$/i.test(roundName ?? '') && !/knockout|play-?off/i.test(roundName ?? '');
}
