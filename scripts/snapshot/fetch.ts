// ESPN fetching for the scripts: cached per URL, a few requests at a time, retried on network errors and 5xx.

let requests = 0;
const cache = new Map<string, Promise<unknown>>();
const slots = { free: 6, queue: [] as (() => void)[] };

async function slot<T>(fn: () => Promise<T>): Promise<T> {
  if (slots.free === 0) await new Promise<void>((r) => slots.queue.push(r));
  slots.free--;
  try { return await fn(); } finally { slots.free++; slots.queue.shift()?.(); }
}

export type Json = Record<string, unknown> & { __status?: number; __error?: string };

/** GET a JSON URL. Never throws: a failure answers `{ __status }` (HTTP status, or -1 for a network error). */
export function get(url: string): Promise<Json> {
  if (!cache.has(url)) {
    cache.set(url, slot(async () => {
      for (let attempt = 1; ; attempt++) {
        requests++;
        try {
          const r = await fetch(url, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(20000) });
          if (r.ok) return (await r.json()) as Json;
          if (attempt >= 3 || r.status < 500) return { __status: r.status };
        } catch (e) {
          if (attempt >= 3) return { __status: -1, __error: String(e) };
        }
        await new Promise((r) => setTimeout(r, 1000 * attempt));
      }
    }));
  }
  return cache.get(url) as Promise<Json>;
}

export const requestCount = () => requests;
