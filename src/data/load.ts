// Loads the snapshot once per page and indexes it (every widget of a page shares the one promise). A failed load is
// not cached: calling again retries.

import { SNAPSHOT_URL } from '../address.ts';
import { buildModel, type Model } from './model.ts';
import type { Snapshot } from './snapshot.ts';

let pending: Promise<Snapshot> | undefined;

export function loadSnapshot(url = SNAPSHOT_URL, fetcher: typeof fetch = fetch): Promise<Snapshot> {
  pending ??= fetcher(url)
    .then((r) => (r.ok ? (r.json() as Promise<Snapshot>) : Promise.reject(new Error(`${url}: HTTP ${r.status}`))))
    .catch((e: unknown) => {
      pending = undefined;
      throw e;
    });
  return pending;
}

/** The snapshot as the views read it, in the viewer's zone (or `timeZone`). */
export const loadFootyData = async (timeZone?: string, url?: string): Promise<Model> => buildModel(await loadSnapshot(url), timeZone);
