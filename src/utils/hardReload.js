// =============================================================
//  Recovery for a tab stuck on «فيه نسخة أحدث»: an ordinary refresh keeps the service worker and its
//  cached copies, which are exactly what keeps asking for files a newer deploy removed. This drops the
//  worker and every cache first, then reloads, so the page is fetched from the network from scratch.
//  The environment is passed in so it can be tested without a browser. tests/unit/hard-reload.test.mjs
// =============================================================

export const HARD_RECOVERY_KEY = '1line_hard_recovery';
export const HARD_RECOVERY_GAP_MS = 60 * 1000;

/** True when a hard recovery was not already tried in the last minute (so a real outage cannot loop) */
export function canHardRecover(storage, now = Date.now()) {
  try {
    const last = Number(storage?.getItem(HARD_RECOVERY_KEY) || 0);
    return !last || now - last > HARD_RECOVERY_GAP_MS;
  } catch {
    return false;
  }
}

/**
 * Unregister the service workers, delete the caches, then reload.
 * env: { navigator, caches, storage, reload }. Every step is best-effort: one failing must not stop the reload.
 */
export async function hardReload(env = {}, now = Date.now()) {
  const { navigator: nav, caches: cacheStore, storage, reload } = env;
  try { storage?.setItem(HARD_RECOVERY_KEY, String(now)); } catch { /* private mode */ }
  try {
    const regs = (await nav?.serviceWorker?.getRegistrations?.()) || [];
    await Promise.all(regs.map((r) => r.unregister().catch(() => false)));
  } catch { /* no service worker support */ }
  try {
    const keys = (await cacheStore?.keys?.()) || [];
    await Promise.all(keys.map((k) => cacheStore.delete(k).catch(() => false)));
  } catch { /* no Cache API */ }
  reload?.();
}

/** The browser's real environment */
export const browserEnv = () => ({
  navigator: typeof navigator !== 'undefined' ? navigator : undefined,
  caches: typeof caches !== 'undefined' ? caches : undefined,
  storage: typeof sessionStorage !== 'undefined' ? sessionStorage : undefined,
  reload: () => window.location.reload()
});
