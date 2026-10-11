// The public catalog (properties + projects) from /api/catalog: one CDN-cached response shared by
// every visitor instead of a live Firestore listener per visit. Resolves null when the route is
// missing or failing (local dev, preview without functions, Firestore down) so the caller can
// fall back to the live listener.

export const PUBLIC_CATALOG_REFRESH_MS = 10 * 60 * 1000;

export async function fetchPublicCatalog(fetchImpl = globalThis.fetch) {
  if (typeof fetchImpl !== 'function') return null;
  try {
    const res = await fetchImpl('/api/catalog', { headers: { accept: 'application/json' } });
    if (!res.ok || !String(res.headers.get('content-type') || '').includes('application/json')) return null;
    const body = await res.json();
    if (!body?.ok || !Array.isArray(body.properties) || !Array.isArray(body.projects)) return null;
    return { properties: body.properties, projects: body.projects };
  } catch {
    return null;
  }
}
