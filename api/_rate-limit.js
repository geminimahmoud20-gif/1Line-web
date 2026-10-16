// In-memory, per warm instance: stops one address (or a burst from many) flooding a route. It is not a
// hard quota (a cold start resets it), so the routes that use it also have their own checks.
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

/** The caller's address as Vercel passes it */
export const clientIp = (request) => (request.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown';
