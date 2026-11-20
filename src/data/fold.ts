/** Lower case without accents, for matching typed text against names ("gremio" finds Grêmio). */
export const fold = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
