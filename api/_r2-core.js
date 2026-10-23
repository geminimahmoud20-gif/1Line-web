// =============================================================
//  Uploads into Cloudflare R2 when the site runs on Cloudflare (worker/index.js passes the bucket as
//  env.MEDIA). The browser sends the file body to the same /api route that signs Vercel Blob uploads;
//  each route keeps its own checks (who may upload, which folder, which types) and calls this to store.
//  Pure apart from the bucket it is given, unit-tested in tests/unit/r2-core.test.mjs.
// =============================================================

const CACHE_SECONDS = 60 * 60 * 24 * 365;

/** "cms/images/1712-front.jpg" → "cms/images/1712-front-k3j9x2.jpg" (same idea as Blob's random suffix) */
export function withRandomSuffix(key, rand = () => Math.random().toString(36).slice(2, 8)) {
  const m = String(key).match(/^(.*?)(\.[a-z0-9]{2,5})?$/i);
  return `${m[1]}-${rand()}${m[2] || ''}`;
}

/** Where a stored file is read from: the bucket's own domain when set, else the site's /media route */
export function mediaUrl(key, { baseUrl, requestUrl } = {}) {
  const base = String(baseUrl || '').replace(/\/+$/, '') || `${new URL(requestUrl).origin}/media`;
  return `${base}/${key.split('/').map(encodeURIComponent).join('/')}`;
}

/**
 * Read the request body, refusing anything over maxBytes or of another type.
 * Resolves { ok: true, body, type } or { ok: false, status, error }.
 */
export async function readUpload(request, { types, maxBytes }) {
  const type = String(request.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
  if (!types.includes(type)) return { ok: false, status: 415, error: 'type' };
  const declared = Number(request.headers.get('content-length') || 0);
  if (declared > maxBytes) return { ok: false, status: 413, error: 'size' };
  const body = await request.arrayBuffer();
  if (!body.byteLength) return { ok: false, status: 400, error: 'empty' };
  if (body.byteLength > maxBytes) return { ok: false, status: 413, error: 'size' };
  return { ok: true, body, type };
}

/** Store one file; returns { url, pathname } in the same shape the Blob SDK gave the browser */
export async function putMedia(bucket, key, body, type, urlOptions) {
  await bucket.put(key, body, {
    httpMetadata: { contentType: type, cacheControl: `public, max-age=${CACHE_SECONDS}` }
  });
  return { url: mediaUrl(key, urlOptions), pathname: key };
}

/** GET /media/<key> on the site: the file from the bucket, cached by the browser and Cloudflare */
export async function serveMedia(bucket, key, request) {
  if (!/^(cms|seller)\/[\w./-]{1,240}$/.test(key) || key.includes('..')) return new Response('Not found', { status: 404 });
  const object = await bucket.get(key, { onlyIf: request.headers, range: request.headers });
  if (!object) return new Response('Not found', { status: 404 });
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('etag', object.httpEtag);
  if (!headers.has('cache-control')) headers.set('cache-control', `public, max-age=${CACHE_SECONDS}`);
  headers.set('x-content-type-options', 'nosniff');
  if (!('body' in object) || !object.body) return new Response(null, { status: 304, headers });
  return new Response(object.body, { status: object.range ? 206 : 200, headers });
}
