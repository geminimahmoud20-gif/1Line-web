// The public catalog (properties + projects) from /api/catalog: one CDN-cached response shared by
// every visitor instead of a live Firestore listener per visit. Resolves null when the route is
// missing or failing (local dev, preview without functions, Firestore down) so the caller can
// fall back to the live listener.

export const PUBLIC_CATALOG_REFRESH_MS = 10 * 60 * 1000;

/**
 * The catalog, or:
 *   null             → there is no /api/catalog here (local dev, a preview without functions): the caller may
 *                      read the database directly
 *   { failed: true } → the route exists but could not answer (Firestore quota or outage, network): the caller
 *                      must NOT fall back to reading the database per visitor, which multiplied the reads by the
 *                      number of visitors exactly when they had run out; it keeps what it has and asks again later
 */
export async function fetchPublicCatalog(fetchImpl = globalThis.fetch) {
  if (typeof fetchImpl !== 'function') return null;
  let res;
  try {
    res = await fetchImpl('/api/catalog', { headers: { accept: 'application/json' } });
  } catch {
    return { failed: true };
  }
  const isJson = String(res.headers.get('content-type') || '').includes('application/json');
  // A missing route answers 404, or the app's own HTML (the SPA fallback)
  if (res.status === 404 || (res.ok && !isJson)) return null;
  if (!res.ok || !isJson) return { failed: true };
  try {
    const body = await res.json();
    if (!body?.ok || !Array.isArray(body.properties) || !Array.isArray(body.projects)) return { failed: true };
    return { properties: body.properties, projects: body.projects, site: body.site ?? null, developers: Array.isArray(body.developers) ? body.developers : null, demands: Array.isArray(body.demands) ? body.demands : null };
  } catch {
    return { failed: true };
  }
}

/** After a failed catalog: ask again after this long (then every PUBLIC_CATALOG_REFRESH_MS as usual) */
export const PUBLIC_CATALOG_RETRY_MS = 60 * 1000;
