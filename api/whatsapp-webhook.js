// =============================================================
//  Vercel Function: WhatsApp Cloud API webhook (Meta → this site).
//    GET  ?hub.mode=subscribe&hub.verify_token=…&hub.challenge=…   Meta's subscription check
//    POST signed message events → each customer message becomes / updates a client in the CRM
//  The logic and the documents it writes: api/_whatsapp-inbound-core.js.
//
//  Environment (Vercel → Settings → Environment Variables):
//   WHATSAPP_VERIFY_TOKEN     any long random text; the same text goes in Meta's webhook settings
//   WHATSAPP_APP_SECRET       Meta app → App settings → Basic → App secret (checks each request)
//   WHATSAPP_CLOUD_PHONE_ID   optional: only this number's messages (the id Meta shows for it)
//   FIREBASE_SERVICE_ACCOUNT  the same service account key the other functions use
//  Without them the route answers 503 and nothing else changes.
// =============================================================
import { SignJWT, importPKCS8 } from 'jose';
import { verifyChallenge, handleInbound, intentFromDoc, intentLinkFields } from './_whatsapp-inbound-core.js';

const text = (status, body = '') => new Response(body, { status, headers: { 'content-type': 'text/plain', 'cache-control': 'no-store' } });
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
  const challenge = verifyChallenge(new URL(request.url).searchParams, process.env.WHATSAPP_VERIFY_TOKEN);
  return challenge ? text(200, challenge) : text(403);
}

export async function POST(request) {
  const sa = serviceAccount();
  const appSecret = process.env.WHATSAPP_APP_SECRET;
  if (!appSecret || !sa?.project_id || !sa.private_key || !sa.client_email) return text(503);

  const root = `projects/${sa.project_id}/databases/(default)/documents`;
  const api = `https://firestore.googleapis.com/v1/${root}`;
  const auth = async () => ({ authorization: `Bearer ${await accessToken(sa)}`, 'content-type': 'application/json' });
  const commit = async (writes) => {
    const res = await fetch(`${api}:commit`, { method: 'POST', headers: await auth(), body: JSON.stringify({ writes }) });
    if (res.ok) return { ok: true };
    const body = (await res.text()).slice(0, 300);
    return { ok: false, status: res.status, body };
  };

  const deps = {
    appSecret,
    phoneNumberId: process.env.WHATSAPP_CLOUD_PHONE_ID || '',
    readIntent: async (ref) => {
      try {
        const res = await fetch(`${api}/contact_intents/${encodeURIComponent(ref)}`, { headers: await auth() });
        return res.ok ? intentFromDoc(await res.json()) : null;
      } catch { return null; }
    },
    createLead: async (id, fields, contact) => {
      try {
        const r = await commit([
          { update: { name: `${root}/leads/${id}`, fields }, currentDocument: { exists: false } },
          { update: { name: `${root}/lead_contacts/${id}`, fields: contact } }
        ]);
        if (r.ok) return 'created';
        if (r.status === 409 || /ALREADY_EXISTS|FAILED_PRECONDITION/.test(r.body)) return 'exists';
        console.error('whatsapp-webhook create failed:', r.status, r.body);
        return false;
      } catch (err) {
        console.error('whatsapp-webhook create failed:', err?.message || err);
        return false;
      }
    },
    updateLead: async (id, fields) => {
      try {
        const r = await commit([{
          update: { name: `${root}/leads/${id}`, fields },
          updateMask: { fieldPaths: Object.keys(fields) },
          updateTransforms: [{ fieldPath: 'whatsappMessages', increment: { integerValue: '1' } }],
          currentDocument: { exists: true }
        }]);
        if (!r.ok) console.error('whatsapp-webhook update failed:', r.status, r.body);
        return r.ok;
      } catch { return false; }
    },
    linkIntent: async (ref, leadId) => {
      try {
        const fields = intentLinkFields(leadId, new Date().toISOString());
        const r = await commit([{
          update: { name: `${root}/contact_intents/${ref}`, fields },
          updateMask: { fieldPaths: Object.keys(fields) },
          currentDocument: { exists: true }
        }]);
        return r.ok;
      } catch { return false; }
    }
  };

  const { status } = await handleInbound(await request.text(), request.headers.get('x-hub-signature-256'), deps);
  return text(status, status === 200 ? 'ok' : '');
}
