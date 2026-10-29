// =============================================================
//  Vercel Function: WhatsApp alert and receipt to the company number when a visitor creates a lead
//  or request.
//  POST { kind, id } right after the browser saved it. See api/_notify-core.js for the rules.
//  POST { test: true } with a super admin's ID token (Authorization: Bearer …): the CRM's
//  «ابعت رسالة تجربة» button. Each send is recorded in notify_status/whatsapp for the CRM.
//
//  Environment (Vercel → Settings → Environment Variables):
//   FIREBASE_SERVICE_ACCOUNT  — the service account JSON (reads the record, records "alert sent")
//   WHATSAPP_CALLMEBOT and/or WHATSAPP_CLOUD_*  — where to send (see _notify-core.js)
//  Without them the route answers 503 and the site carries on normally.
// =============================================================
import { SignJWT, importPKCS8, createRemoteJWKSet, jwtVerify, decodeJwt } from 'jose';
import { handleNotify, handleTest, makeSenders, sendAll, ALERT_LIMITS } from './_notify-core.js';
import { roleOf } from './_team-core.js';
import { createRateLimiter, clientIp } from './_rate-limit.js';

const limitIp = createRateLimiter(ALERT_LIMITS.perIp);
const overall = createRateLimiter(ALERT_LIMITS.overall);
let floodWarnedAt = 0;
// true over the limit; 'first' for the first refused alert of a window (sends one warning instead)
const limitOverall = () => {
  if (!overall('all')) return false;
  const now = Date.now();
  if (now - floodWarnedAt > ALERT_LIMITS.overall.windowMs) { floodWarnedAt = now; return 'first'; }
  return true;
};

const SITE_URL = (process.env.SITE_URL || 'https://www.1lineestate.com').replace(/\/$/, '');

const json = (status, body) => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json', 'cache-control': 'no-store' }
});

// ── Firestore REST with the service account (no firebase-admin dependency) ──
let cached = { token: null, exp: 0 };
const serviceAccount = () => {
  try { return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || ''); } catch { return null; }
};

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

// Firestore REST value → plain JS (only the shapes our records use)
const fromValue = (v) => {
  if (!v || typeof v !== 'object') return null;
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('timestampValue' in v) return v.timestampValue;
  if ('mapValue' in v) return Object.fromEntries(Object.entries(v.mapValue.fields || {}).map(([k, x]) => [k, fromValue(x)]));
  return null;
};

export function firestore(sa) {
  // FIRESTORE_EMULATOR_HOST: the integration test runs this against the local emulator
  const emulator = process.env.FIRESTORE_EMULATOR_HOST;
  const base = `${emulator ? `http://${emulator}` : 'https://firestore.googleapis.com'}/v1/projects/${sa.project_id}/databases/(default)/documents`;
  const call = async (method, path, body) => {
    const res = await fetch(`${base}/${path}`, {
      method,
      headers: { authorization: `Bearer ${emulator ? 'owner' : await accessToken(sa)}`, 'content-type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined
    });
    return res;
  };
  return {
    async readRecord(kind, id) {
      const res = await call('GET', `${kind}/${encodeURIComponent(id)}`);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`read ${res.status}`);
      const doc = await res.json();
      const data = Object.fromEntries(Object.entries(doc.fields || {}).map(([k, v]) => [k, fromValue(v)]));
      const createdAtMs = Date.parse(data.createdAt || doc.createTime || '');
      return { data, createdAtMs: Number.isNaN(createdAtMs) ? 0 : createdAtMs };
    },
    // Phone lives apart from the record: lead_contacts/{id}, request_contacts/{kind}__{id}
    async readContact(kind, id) {
      const path = kind === 'leads' ? `lead_contacts/${encodeURIComponent(id)}` : `request_contacts/${encodeURIComponent(`${kind}__${id}`)}`;
      const res = await call('GET', path);
      if (!res.ok) return null;
      const doc = await res.json();
      return { phone: fromValue(doc.fields?.phone), whatsapp: fromValue(doc.fields?.whatsapp) };
    },
    // notify_log/{kind__id}: create fails with 409 when it already exists → each record alerts once
    // A send that failed gives the record back, so a retry can alert it
    async releaseClaim(kind, id) {
      await call('DELETE', `notify_log/${encodeURIComponent(`${kind}__${id}`)}`);
    },
    // notify_status/whatsapp: last message that went out and last one that didn't (no customer data)
    async recordStatus({ ok, ref }, channels = 0) {
      const at = { timestampValue: new Date().toISOString() };
      const fields = ok
        ? { lastOkAt: at, lastOkRef: { stringValue: ref }, channels: { integerValue: String(channels) } }
        : { lastFailAt: at, lastFailRef: { stringValue: ref }, channels: { integerValue: String(channels) } };
      const mask = Object.keys(fields).map((f) => `updateMask.fieldPaths=${f}`).join('&');
      await call('PATCH', `notify_status/whatsapp?${mask}`, { fields });
    },
    async claimOnce(kind, id) {
      const res = await call('POST', `notify_log?documentId=${encodeURIComponent(`${kind}__${id}`)}`, {
        fields: { kind: { stringValue: kind }, sentAt: { timestampValue: new Date().toISOString() } }
      });
      if (res.status === 409) return false;
      if (!res.ok) throw new Error(`claim ${res.status}`);
      return true;
    }
  };
}

// The test button: only a signed-in super admin (same check as api/team.js)
const FIREBASE_PROJECT_ID = 'line-c9601';
const firebaseKeys = createRemoteJWKSet(new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'));
async function isSuperAdmin(request) {
  const idToken = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!idToken) return false;
  try {
    const claims = process.env.FIREBASE_AUTH_EMULATOR_HOST
      ? decodeJwt(idToken)
      : (await jwtVerify(idToken, firebaseKeys, { issuer: `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`, audience: FIREBASE_PROJECT_ID })).payload;
    return roleOf(claims) === 'super_admin';
  } catch {
    return false;
  }
}

export async function POST(request) {
  const sa = serviceAccount();
  const senders = makeSenders(process.env);
  let body;
  try { body = await request.json(); } catch { return json(400, { error: 'bad-request' }); }
  if (body?.test === true && !(await isSuperAdmin(request))) return json(403, { error: 'forbidden' });
  if (!sa?.private_key || !sa.client_email || !sa.project_id || senders.length === 0) {
    return json(503, { error: 'notify-not-configured', channels: senders.length, serviceAccount: Boolean(sa?.private_key) });
  }
  try {
    const db = firestore(sa);
    const recordStatus = (entry) => db.recordStatus(entry, senders.length);
    if (body?.test === true) {
      const { status, body: out } = await handleTest({ sendAll: (text) => sendAll(senders, text), recordStatus }, SITE_URL, senders.length);
      return json(status, out);
    }
    const { status, body: out } = await handleNotify(body, {
      readRecord: db.readRecord,
      readContact: db.readContact,
      claimOnce: db.claimOnce,
      releaseClaim: db.releaseClaim,
      recordStatus,
      limitIp,
      limitOverall,
      sendAll: (text) => sendAll(senders, text),
      now: () => Date.now()
    }, SITE_URL, clientIp(request));
    return json(status, out);
  } catch (err) {
    console.error('notify failed:', err?.message || err);
    return json(502, { error: 'notify-failed' });
  }
}
