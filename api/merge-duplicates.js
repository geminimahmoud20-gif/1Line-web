// =============================================================
//  Vercel Function: the duplicate sweep (logic in api/_dedupe-core.js).
//    GET — Vercel Cron, once a day (vercel.json "crons"): requests from the last few days that were not merged
//          when they arrived are merged into the same client's open request, if one exists. ?days=N (1–14).
//  Needs CRON_SECRET (Vercel sends it as a bearer token) and FIREBASE_SERVICE_ACCOUNT, the same keys as the other
//  functions. Reads only the last days' requests, so it costs a few reads a day.
// =============================================================
import { SignJWT, importPKCS8 } from 'jose';
import { runSweep, SWEEP_DAYS, MAX_SWEEP_DAYS } from './_dedupe-core.js';
import { mergeIntoOpen, plain } from './_merge-run.js';
import { withContact } from './_returning-core.js';

const FIREBASE_PROJECT_ID = 'line-c9601';

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

export async function GET(request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get('authorization') !== `Bearer ${secret}`) return json(401, { error: 'unauthorized' });
  const sa = serviceAccount();
  if (!sa?.private_key || !sa.client_email) return json(503, { error: 'not-configured' });

  const asked = Number(new URL(request.url).searchParams.get('days'));
  const days = Number.isFinite(asked) && asked >= 1 ? Math.min(asked, MAX_SWEEP_DAYS) : SWEEP_DAYS;
  try {
    const base = `https://firestore.googleapis.com/v1/projects/${sa.project_id || FIREBASE_PROJECT_ID}/databases/(default)/documents`;
    const fs = async (method, path, payload) => fetch(`${base}${path.startsWith(':') ? '' : '/'}${path}`, {
      method,
      headers: { authorization: `Bearer ${await accessToken(sa)}`, 'content-type': 'application/json' },
      body: payload ? JSON.stringify(payload) : undefined
    });
    const result = await runSweep({
      list: async () => {
        const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
        const q = await fs('POST', ':runQuery', {
          structuredQuery: {
            from: [{ collectionId: 'leads' }],
            where: { fieldFilter: { field: { fieldPath: 'createdAt' }, op: 'GREATER_THAN_OR_EQUAL', value: { timestampValue: cutoff } } },
            orderBy: [{ field: { fieldPath: 'createdAt' }, direction: 'ASCENDING' }],
            limit: 300
          }
        });
        if (!q.ok) throw new Error(`list ${q.status}`);
        return (await q.json()).filter((r) => r.document).map((r) => ({ id: String(r.document.name).split('/').pop(), data: plain(r.document), doc: r.document }));
      },
      withContact: ({ id, data }) => withContact({ fs, plain, id, lead: data }),
      mergeOne: ({ id, lead, doc }) => mergeIntoOpen({ fs, id, lead, doc })
    }, { days });
    return json(200, { ok: true, days, ...result });
  } catch (err) {
    console.error('dedupe sweep failed:', err?.message || err);
    return json(502, { error: 'sweep-failed' });
  }
}
