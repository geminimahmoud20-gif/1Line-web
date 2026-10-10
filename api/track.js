// =============================================================
//  Vercel Function: visitor analytics collector.
//    POST { consent, vid?, sid?, ctx, events: [{ t, ts, m }] }  (sent by src/utils/analytics.js)
//  Validates every field (api/_track-core.js) and writes the counters to Firestore in one commit.
//  Answers 204 in all normal cases so the browser never retries or shows errors.
//
//  Environment (Vercel → Settings → Environment Variables):
//    FIREBASE_SERVICE_ACCOUNT — the service account JSON (same key as api/notify.js)
//  Without it the route answers 503 and the site carries on normally.
// =============================================================
import { SignJWT, importPKCS8 } from 'jose';
import { sanitizeBatch, buildWrites, isBot, DAILY_SHARDS, MAX_BODY_BYTES } from './_track-core.js';

const noContent = (status = 204) => new Response(null, { status, headers: { 'cache-control': 'no-store' } });

const serviceAccount = () => {
  try { return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || ''); } catch { return null; }
};

let cached = { token: null, exp: 0 };
async function accessToken(sa) {
  if (cached.token && Date.now() < cached.exp - 60_000) return cached.token;
  const key = await importPKCS8(sa.private_key, 'RS256');
  const now = Math.floor(Date.now() / 1000);
  const assertion = await new SignJWT({ scope: 'https://www.googleapis.com/auth/datastore' })
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
    .setIssuer(sa.client_email).setAudience('https://oauth2.googleapis.com/token')
    .setIssuedAt(now).setExpirationTime(now + 3600)
    .sign(key);
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion })
  });
  if (!res.ok) throw new Error(`token ${res.status}`);
  const { access_token: token, expires_in: ttl } = await res.json();
  cached = { token, exp: Date.now() + (ttl || 3600) * 1000 };
  return token;
}

// Best effort per warm instance: one browser flushes every few seconds at most
const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_MAX = 150;
const hits = new Map();
const rateLimited = (ip) => {
  const now = Date.now();
  const entry = hits.get(ip);
  if (!entry || now - entry.start > RATE_WINDOW_MS) {
    if (hits.size > 5000) hits.clear();
    hits.set(ip, { start: now, count: 1 });
    return false;
  }
  entry.count += 1;
  return entry.count > RATE_MAX;
};

// Only this site's pages may post (sendBeacon always sends Origin)
const sameSite = (request) => {
  const origin = request.headers.get('origin');
  if (!origin) return true;
  try {
    const host = new URL(origin).host;
    const allowed = [new URL(request.url).host, ...(process.env.SITE_URL ? [new URL(process.env.SITE_URL).host] : [])];
    return allowed.includes(host) || (host.endsWith('.vercel.app') && host.startsWith('1-line-'));
  } catch {
    return false;
  }
};

export async function POST(request) {
  const emulator = process.env.FIRESTORE_EMULATOR_HOST;
  const sa = serviceAccount() || (emulator ? { project_id: process.env.FIREBASE_PROJECT || 'line-c9601' } : null);
  if (!sa?.project_id || (!emulator && (!sa.private_key || !sa.client_email))) return noContent(503);
  if (!sameSite(request)) return noContent(403);
  if (isBot(request.headers.get('user-agent') || '')) return noContent();
  const ip = (request.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown';
  if (rateLimited(ip)) return noContent(429);

  let body;
  try {
    const text = await request.text();
    if (text.length > MAX_BODY_BYTES) return noContent(413);
    body = JSON.parse(text);
  } catch {
    return noContent(400);
  }

  const now = Date.now();
  const batch = sanitizeBatch(body, now);
  if (!batch) return noContent();

  const docRoot = `projects/${sa.project_id}/databases/(default)/documents`;
  const writes = buildWrites(batch, { docRoot, now, shard: Math.floor(Math.random() * DAILY_SHARDS) });
  const base = emulator ? `http://${emulator}` : 'https://firestore.googleapis.com';
  try {
    const res = await fetch(`${base}/v1/${docRoot}:commit`, {
      method: 'POST',
      headers: { authorization: `Bearer ${emulator ? 'owner' : await accessToken(sa)}`, 'content-type': 'application/json' },
      body: JSON.stringify({ writes })
    });
    if (!res.ok) {
      console.error('track commit failed:', res.status, (await res.text()).slice(0, 300));
      return noContent(502);
    }
  } catch (err) {
    console.error('track failed:', err?.message || err);
    return noContent(502);
  }
  return noContent();
}
