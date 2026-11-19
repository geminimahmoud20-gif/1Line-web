// =============================================================
//  Vercel Function: "a client opened a listing link the team sent them".
//    POST { lead, property }   (src/utils/linkOpen.js, from the listing page opened with ?lc=<client id>)
//  Checks the client exists, then records link_opens/{lead__property} (first and last open, how many times, and the
//  salesperson who holds the client). The 15-minute reminder job tells that salesperson (scripts/send-followup-reminders.mjs).
//  Answers 204 whatever the client id, so it cannot be used to find out which ids exist.
//
//  Environment: FIREBASE_SERVICE_ACCOUNT (same key as api/lead.js). Without it: 503, the site is unaffected.
// =============================================================
import { SignJWT, importPKCS8 } from 'jose';
import { sanitizeOpen, openDocId, firstOpenFields, MAX_BODY_BYTES, OPEN_LIMITS } from './_link-open-core.js';
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

const limitIp = createRateLimiter(OPEN_LIMITS.perIp);
const overall = createRateLimiter(OPEN_LIMITS.overall);

// Only this site's pages may post (a beacon or a fetch from the page always sends Origin)
const sameSite = (request) => {
  const origin = request.headers.get('origin');
  if (!origin) return false;
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
  if (limitIp(clientIp(request)) || overall('all')) return reply(429);

  let body;
  try {
    const text = await request.text();
    if (text.length > MAX_BODY_BYTES) return reply(413);
    body = JSON.parse(text);
  } catch { return reply(400); }
  const open = sanitizeOpen(body);
  if (!open) return reply(400);

  const docRoot = `projects/${sa.project_id}/databases/(default)/documents`;
  const base = emulator ? `http://${emulator}` : 'https://firestore.googleapis.com';
  try {
    const headers = { authorization: `Bearer ${emulator ? 'owner' : await accessToken(sa)}`, 'content-type': 'application/json' };
    // The client must exist; the salesperson who holds it is who gets told
    const leadRes = await fetch(`${base}/v1/${docRoot}/leads/${encodeURIComponent(open.leadId)}`, { headers });
    if (leadRes.status === 404) return reply(204);
    if (!leadRes.ok) { console.error('link-open: lead read', leadRes.status); return reply(502); }
    const ownerUid = (await leadRes.json())?.fields?.ownerUid?.stringValue || '';

    const name = `${docRoot}/link_opens/${openDocId(open.leadId, open.propertyId)}`;
    const nowIso = new Date().toISOString();
    const commit = (writes) => fetch(`${base}/v1/${docRoot}:commit`, { method: 'POST', headers, body: JSON.stringify({ writes }) });
    // The first open creates the document; a later one adds to it
    let res = await commit([{ update: { name, fields: firstOpenFields(open, ownerUid, nowIso) }, currentDocument: { exists: false } }]);
    if (res.status === 409) {
      res = await commit([{
        update: { name, fields: { lastAt: { stringValue: nowIso }, ownerUid: { stringValue: ownerUid } } },
        updateMask: { fieldPaths: ['lastAt', 'ownerUid'] },
        updateTransforms: [{ fieldPath: 'count', increment: { integerValue: '1' } }],
        currentDocument: { exists: true }
      }]);
    }
    if (!res.ok) { console.error('link-open: write', res.status, (await res.text()).slice(0, 200)); return reply(502); }
    return reply(204);
  } catch (err) {
    console.error('link-open failed:', err?.message || err);
    return reply(502);
  }
}
