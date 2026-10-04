// =============================================================
//  Vercel Function: CRM team accounts (CRM → إدارة المنظومة → الفريق والصلاحيات).
//    GET               → the staff list (accounts with a CRM role)
//    POST { action }   → add | role | disable | enable | remove | resync   (see api/_team-core.js)
//  The staff list comes from staff_registry in Firestore (kept here), not a scan of every account.
//  Caller: a signed-in super admin (Firebase ID token in Authorization: Bearer …).
//
//  Environment (Vercel → Settings → Environment Variables):
//    FIREBASE_SERVICE_ACCOUNT — the service account JSON (same key as api/notify.js)
//  Without it the route answers 503 and the CRM explains how to turn it on.
// =============================================================
import { SignJWT, importPKCS8, createRemoteJWKSet, jwtVerify, decodeJwt } from 'jose';
import { handleTeam, teamStore, staffRegistry, roleOf } from './_team-core.js';

const FIREBASE_PROJECT_ID = 'line-c9601';
const firebaseKeys = createRemoteJWKSet(
  new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com')
);

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
  const assertion = await new SignJWT({ scope: 'https://www.googleapis.com/auth/identitytoolkit https://www.googleapis.com/auth/cloud-platform' })
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

// FIREBASE_AUTH_EMULATOR_HOST: the integration test runs this against the local Auth emulator
const emulator = () => process.env.FIREBASE_AUTH_EMULATOR_HOST;

export function authCaller(sa) {
  const host = emulator();
  const projectId = sa?.project_id || FIREBASE_PROJECT_ID;
  const base = `${host ? `http://${host}/` : 'https://'}identitytoolkit.googleapis.com/v1/projects/${projectId}`;
  return async (method, path, body) => fetch(`${base}/${path}`, {
    method,
    headers: { authorization: `Bearer ${host ? 'owner' : await accessToken(sa)}`, 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined
  });
}

/** Firestore REST for the staff registry (FIRESTORE_EMULATOR_HOST in tests) */
export function firestoreCaller(sa) {
  const host = process.env.FIRESTORE_EMULATOR_HOST;
  const projectId = sa?.project_id || FIREBASE_PROJECT_ID;
  const base = `${host ? `http://${host}` : 'https://firestore.googleapis.com'}/v1/projects/${projectId}/databases/(default)/documents`;
  return async (method, path, body) => fetch(`${base}/${path}`, {
    method,
    headers: { authorization: `Bearer ${host ? 'owner' : await accessToken(sa)}`, 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined
  });
}

/** The caller's verified claims (emulator tokens are unsigned, so they are only decoded there) */
async function verifyCaller(request) {
  const idToken = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!idToken) return null;
  try {
    if (emulator()) return decodeJwt(idToken);
    const { payload } = await jwtVerify(idToken, firebaseKeys, {
      issuer: `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`,
      audience: FIREBASE_PROJECT_ID
    });
    return payload;
  } catch {
    return null;
  }
}

async function route(request) {
  const sa = serviceAccount();
  if (!sa && !emulator()) return json(503, { error: 'not-configured' });
  const caller = await verifyCaller(request);
  if (!caller) return json(401, { error: 'unauthenticated' });
  if (roleOf(caller) !== 'super_admin') return json(403, { error: 'forbidden' });
  let body = null;
  if (request.method === 'POST') {
    try { body = await request.json(); } catch { return json(400, { error: 'bad-request' }); }
  }
  try {
    const { status, body: out } = await handleTeam({ method: request.method, body, callerUid: caller.sub || caller.user_id, store: teamStore(authCaller(sa), staffRegistry(firestoreCaller(sa))) });
    return json(status, out);
  } catch (err) {
    console.error('team route error:', err?.message);
    const code = String(err?.code || '');
    if (code.includes('EMAIL_EXISTS')) return json(409, { error: 'email-exists' });
    if (code.includes('INVALID_EMAIL')) return json(400, { error: 'invalid-email' });
    return json(502, { error: 'auth-error' });
  }
}

export const GET = route;
export const POST = route;
