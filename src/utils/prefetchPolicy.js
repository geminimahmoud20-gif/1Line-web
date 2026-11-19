// When the site may fetch screens nobody asked for yet (modals warmed after first paint).
// On a slow or metered connection that fetching competes with what the visitor is actually loading,
// so it is skipped there and each screen loads when it is opened. Pure; tests/unit/prefetch-policy.test.mjs.

/** Wait this long after the page has loaded before the first warm-up fetch */
export const PREFETCH_DELAY_MS = 4000;

const SLOW = new Set(['slow-2g', '2g', '3g']);

/** @param conn navigator.connection (may be undefined: Safari/Firefox expose nothing, so those warm up) */
export function canPrefetch(conn) {
  if (!conn) return true;
  if (conn.saveData) return false;
  return !SLOW.has(String(conn.effectiveType || '').toLowerCase());
}
