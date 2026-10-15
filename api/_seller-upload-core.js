// Checks for /api/seller-upload, kept apart so they can be unit-tested without Vercel.
// Owners on /sell are not signed in, so the grant is narrow instead: images only, already shrunk in
// the browser, one folder, a short validity, same-site callers, and a per-address cap.

export const SELLER_UPLOAD = {
  types: ['image/jpeg', 'image/webp'],
  maxBytes: 1.5 * 1024 * 1024,
  grantTtlMs: 10 * 60 * 1000,
  // 8 photos a request, a few retries or replaced photos, two requests
  perIpMax: 24,
  windowMs: 30 * 60 * 1000
};

const PATH_RE = /^seller\/[\w.-]{1,100}\.(jpe?g|webp)$/;

export const validSellerPath = (pathname) => typeof pathname === 'string' && PATH_RE.test(pathname);

/** The browser always sends Origin on these fetches; anything from another site is refused. */
export function sameSite(originHeader, hostHeader) {
  if (!originHeader || !hostHeader) return false;
  try {
    return new URL(originHeader).host === hostHeader;
  } catch {
    return false;
  }
}

/** In-memory, per warm instance: enough to stop one address filling the store, not a hard quota. */
export function createRateLimiter({ max, windowMs }, now = () => Date.now()) {
  const hits = new Map();
  return (key) => {
    const t = now();
    const entry = hits.get(key);
    if (!entry || t - entry.start > windowMs) {
      if (hits.size > 5000) hits.clear();
      hits.set(key, { start: t, count: 1 });
      return false;
    }
    entry.count += 1;
    return entry.count > max;
  };
}
