// =============================================================
//  The last catalog that came back whole, kept in the project's public Blob store, so the site still
//  shows the real listings when Firestore cannot answer (its daily free quota used up, an outage):
//  /api/catalog serves this copy instead of failing, and visitors never fall back to reading the
//  database themselves (which multiplied the reads by the number of visitors exactly when they ran out).
//  The Blob calls are passed in, so this is tested without a store: tests/unit/catalog-backup.test.mjs
// =============================================================

export const BACKUP_PATH = 'catalog/last-good.json';
/** One instance writes the copy at most this often (the catalog itself refreshes about every 15 minutes) */
export const BACKUP_EVERY_MS = 10 * 60 * 1000;
const TIMEOUT_MS = 4000;

let lastSavedAt = 0;
export const resetBackupClock = () => { lastSavedAt = 0; };

const withTimeout = (promise) => Promise.race([
  promise,
  new Promise((_, reject) => setTimeout(() => reject(new Error('blob timeout')), TIMEOUT_MS))
]);

/** Save a good catalog body; never throws (a failed save must not fail the catalog). Resolves true when written. */
export async function saveLastGood(body, { put, now = Date.now() } = {}) {
  if (typeof put !== 'function' || !body?.ok) return false;
  if (lastSavedAt && now - lastSavedAt < BACKUP_EVERY_MS) return false;
  lastSavedAt = now;
  try {
    await withTimeout(put(BACKUP_PATH, JSON.stringify(body), {
      access: 'public', addRandomSuffix: false, allowOverwrite: true,
      contentType: 'application/json', cacheControlMaxAge: 60
    }));
    return true;
  } catch {
    lastSavedAt = 0; // try again on the next good read
    return false;
  }
}

/** The saved copy, marked stale, or null when there is none (or it is unreadable). Never throws. */
export async function readLastGood({ head, fetchImpl = globalThis.fetch } = {}) {
  if (typeof head !== 'function' || typeof fetchImpl !== 'function') return null;
  try {
    const meta = await withTimeout(head(BACKUP_PATH));
    if (!meta?.url) return null;
    const res = await withTimeout(fetchImpl(meta.url, { headers: { accept: 'application/json' } }));
    if (!res.ok) return null;
    const body = await res.json();
    if (!body?.ok || !Array.isArray(body.properties) || !Array.isArray(body.projects)) return null;
    return { ...body, stale: true };
  } catch {
    return null;
  }
}
