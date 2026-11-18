// =============================================================
//  Vercel Function: "a visitor tapped WhatsApp on the site".
//    POST { ref, path, propertyId, source, placement, device }   (src/utils/contactIntent.js)
//  Writes contact_intents/{ref} so the CRM inbox can show it and staff can link it to the chat.
//  No personal data: the chat goes straight to WhatsApp and the site never sees it.
//
//  Environment: FIREBASE_SERVICE_ACCOUNT (same key as api/track.js). Without it: 503, site unaffected.
// =============================================================
import { SignJWT, importPKCS8 } from 'jose';
import { handleIntent, intentFields, INTENT_LIMITS } from './_contact-intent-core.js';
import { isBot } from './_track-core.js';
import { createRateLimiter, clientIp } from './_rate-limit.js';

const reply = (status) => new Response(null, { status, headers: { 'cache-control': 'no-store' } });
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

const limitIp = createRateLimiter(INTENT_LIMITS.perIp);
const overall = createRateLimiter(INTENT_LIMITS.overall);
const limitOverall = () => overall('all');

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
  if (!sa?.project_id || (!emulator && (!sa.private_key || !sa.client_email))) return reply(503);
  if (!sameSite(request)) return reply(403);
  if (isBot(request.headers.get('user-agent') || '')) return reply(204);

  const docRoot = `projects/${sa.project_id}/databases/(default)/documents`;
  const base = emulator ? `http://${emulator}` : 'https://firestore.googleapis.com';
  const write = async (intent) => {
    try {
      // documentId = the reference: creating twice fails (409) instead of overwriting a handled row
      const res = await fetch(`${base}/v1/${docRoot}/contact_intents?documentId=${encodeURIComponent(intent.ref)}`, {
        method: 'POST',
        headers: { authorization: `Bearer ${emulator ? 'owner' : await accessToken(sa)}`, 'content-type': 'application/json' },
        body: JSON.stringify({ fields: intentFields(intent) })
      });
      if (res.ok || res.status === 409) return true;
      console.error('contact-intent write failed:', res.status, (await res.text()).slice(0, 200));
      return false;
    } catch (err) {
      console.error('contact-intent failed:', err?.message || err);
      return false;
    }
  };

  return reply(await handleIntent(await request.text(), clientIp(request), { limitIp, limitOverall, write }));
}
