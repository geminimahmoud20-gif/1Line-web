// =============================================================
//  Vercel Function: save a request a visitor sent from the website (the public forms).
//    POST { lead, token }   token = a Cloudflare Turnstile token (when Turnstile is set up)
//    → 200 { ok: true, id } | 4xx { error } (a rejected request: do not retry) | 5xx / 503 (try the old way)
//  The browser used to write the lead straight into Firestore, which let any script flood the CRM.
//  Here the server checks the visitor (Turnstile, per-address limits, field rules) and writes the lead and
//  its lead_contacts doc in one commit with the service account.
//
//  Environment (Vercel → Settings → Environment Variables):
//    FIREBASE_SERVICE_ACCOUNT — the service account JSON (same key as api/assign.js)
//    TURNSTILE_SECRET_KEY     — optional: Cloudflare Turnstile secret. Without it the Turnstile check is skipped.
//  Browser side (build time): VITE_TURNSTILE_SITE_KEY — the Turnstile site key.
// =============================================================
import { SignJWT, importPKCS8 } from 'jose';
import { randomBytes } from 'node:crypto';
import { toFirestore } from './_merge-core.js';
import { createRateLimiter, clientIp } from './_rate-limit.js';
import { sanitizePublicLead, verifyTurnstile } from './_lead-core.js';

const FIREBASE_PROJECT_ID = 'line-c9601';
const limitIp = createRateLimiter({ max: 6, windowMs: 10 * 60 * 1000 });
const limitPhone = createRateLimiter({ max: 3, windowMs: 10 * 60 * 1000 });
const limitAll = createRateLimiter({ max: 400, windowMs: 60 * 60 * 1000 });

const json = (status, body) => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json', 'cache-control': 'no-store' }
});

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

// Only this site's pages may post (a browser always sends Origin on a cross-origin or POST fetch)
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

const newId = () => randomBytes(15).toString('base64url').slice(0, 20);

export function GET() {
  return json(200, { ok: Boolean(serviceAccount()?.private_key), turnstile: Boolean(process.env.TURNSTILE_SECRET_KEY) });
}

export async function POST(request) {
  const sa = serviceAccount();
  if (!sa?.private_key || !sa.client_email) return json(503, { error: 'not-configured' });
  if (!sameSite(request)) return json(403, { error: 'forbidden' });
  const ip = clientIp(request);
  if (limitIp(ip) || limitAll('all')) return json(429, { error: 'slow-down' });

  let body;
  try { body = await request.json(); } catch { return json(400, { error: 'bad-request' }); }

  const captcha = await verifyTurnstile({ secret: process.env.TURNSTILE_SECRET_KEY, token: body?.token, ip });
  if (!captcha.ok) {
    // Turnstile itself unreachable: let the browser fall back rather than lose a real client
    return captcha.error === 'captcha-unavailable' ? json(503, { error: captcha.error }) : json(403, { error: captcha.error });
  }

  const clean = sanitizePublicLead(body?.lead);
  if (!clean.ok) return json(400, { error: clean.error });
  const phoneKey = String(clean.contact.phone || clean.contact.whatsapp || '').replace(/\D/g, '').slice(-9);
  if (phoneKey && limitPhone(phoneKey)) return json(429, { error: 'slow-down' });

  try {
    const projectId = sa.project_id || FIREBASE_PROJECT_ID;
    const root = `projects/${projectId}/databases/(default)/documents`;
    const id = newId();
    const desk = clean.lead.assignedTo || 'Unassigned';
    const fields = (obj) => Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, toFirestore(v)]));
    const res = await fetch(`https://firestore.googleapis.com/v1/${root}:commit`, {
      method: 'POST',
      headers: { authorization: `Bearer ${await accessToken(sa)}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        writes: [
          {
            update: { name: `${root}/leads/${id}`, fields: fields({ ...clean.lead, assignedTo: desk }) },
            updateTransforms: [{ fieldPath: 'createdAt', setToServerValue: 'REQUEST_TIME' }],
            currentDocument: { exists: false }
          },
          {
            update: { name: `${root}/lead_contacts/${id}`, fields: fields({ ...clean.contact, assignedTo: desk }) },
            currentDocument: { exists: false }
          }
        ]
      })
    });
    if (!res.ok) {
      console.error('lead: commit', res.status);
      return json(502, { error: 'save-failed' });
    }
    return json(200, { ok: true, id });
  } catch (error) {
    console.error('lead: failed', error?.message);
    return json(502, { error: 'save-failed' });
  }
}
