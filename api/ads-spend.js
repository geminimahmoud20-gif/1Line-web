// =============================================================
//  Vercel Function: pull what the Facebook / Instagram campaigns cost (logic in api/_meta-spend-core.js).
//    POST with a sales manager's or super admin's ID token — the CRM's «اسحب الصرف من فيسبوك» button.
//  Returns the lifetime spend per campaign and per ad, as {key: EGP}; the CRM matches it to its report rows and
//  saves it (campaign_spend/all). Nothing is stored here.
//
//  Environment (Vercel → Settings → Environment Variables):
//    META_ADS_TOKEN       — a Meta access token with the ads_read permission (a system-user token does not expire)
//    META_AD_ACCOUNT_ID   — the ad account number, with or without the act_ prefix
// =============================================================
import { createRemoteJWKSet, jwtVerify, decodeJwt } from 'jose';
import { fetchAdInsights, spendFromInsights } from './_meta-spend-core.js';
import { roleOf } from './_team-core.js';
import { createRateLimiter, clientIp } from './_rate-limit.js';

const FIREBASE_PROJECT_ID = 'line-c9601';
const limit = createRateLimiter({ max: 12, windowMs: 10 * 60 * 1000 });

const json = (status, body) => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json', 'cache-control': 'no-store' }
});

const firebaseKeys = createRemoteJWKSet(new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'));
async function canManage(request) {
  const idToken = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!idToken) return false;
  try {
    const claims = process.env.FIREBASE_AUTH_EMULATOR_HOST
      ? decodeJwt(idToken)
      : (await jwtVerify(idToken, firebaseKeys, { issuer: `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`, audience: FIREBASE_PROJECT_ID })).payload;
    const perms = Array.isArray(claims.perms) ? claims.perms : [];
    return roleOf(claims) === 'super_admin' || perms.includes('ld.manage');
  } catch {
    return false;
  }
}

export async function POST(request) {
  if (!(await canManage(request))) return json(403, { error: 'forbidden' });
  if (limit(clientIp(request))) return json(429, { error: 'slow-down' });
  const accountId = process.env.META_AD_ACCOUNT_ID;
  const token = process.env.META_ADS_TOKEN;
  if (!accountId || !token) return json(503, { error: 'not-configured', token: Boolean(token), account: Boolean(accountId) });
  try {
    const rows = await fetchAdInsights({ accountId, token });
    return json(200, { ok: true, ...spendFromInsights(rows), rows: rows.length });
  } catch (err) {
    if (err?.code === 'bad-token') return json(401, { error: 'bad-token' });
    console.error('ads spend failed:', err?.message || err);
    return json(502, { error: 'meta-error', detail: String(err?.message || '').slice(0, 160) });
  }
}
