// =============================================================
//  Vercel Function: give a client who just arrived from the website to a salesperson.
//    POST { id }  (sent by src/services/staffNotify.js right after the lead is saved)
//  Picks the person on the lead's team with the fewest open clients (api/_assign-core.js) and writes
//  the owner fields on the lead, the same ones the CRM's «تعيين» writes. Only a fresh, still-new
//  client nobody owns is touched; anything else answers { assigned: false }. The browser can't do
//  this itself: a visitor can't read the other leads, so its round-robin never balanced.
//
//  Environment (Vercel → Settings → Environment Variables):
//    FIREBASE_SERVICE_ACCOUNT — the service account JSON (same key as api/notify.js and api/team.js)
//  Without it the route answers 503 and the client simply stays on its team's queue.
// =============================================================
import { SignJWT, importPKCS8 } from 'jose';
import { teamStore, staffRegistry, accessStore } from './_team-core.js';
import { eligible, sellersOf, chooseSeller, ownerFields, MAX_OPEN_COUNT } from './_assign-core.js';
import { createRateLimiter, clientIp } from './_rate-limit.js';

const FIREBASE_PROJECT_ID = 'line-c9601';
const limitIp = createRateLimiter({ max: 40, windowMs: 10 * 60 * 1000 });
const limitAll = createRateLimiter({ max: 600, windowMs: 60 * 60 * 1000 });

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

const fromValue = (v) => {
  if (!v || typeof v !== 'object') return null;
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('timestampValue' in v) return v.timestampValue;
  if ('nullValue' in v) return null;
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(fromValue);
  if ('mapValue' in v) return Object.fromEntries(Object.entries(v.mapValue.fields || {}).map(([k, x]) => [k, fromValue(x)]));
  return null;
};
const plain = (doc) => Object.fromEntries(Object.entries(doc?.fields || {}).map(([k, v]) => [k, fromValue(v)]));

const toValue = (v) => (typeof v === 'boolean' ? { booleanValue: v } : { stringValue: String(v) });

// Only this site's pages may ask
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

const ID_RE = /^[A-Za-z0-9_-]{1,80}$/;

export async function POST(request) {
  const sa = serviceAccount();
  if (!sa?.private_key || !sa.client_email) return json(503, { error: 'not-configured' });
  if (!sameSite(request)) return json(403, { error: 'forbidden' });
  const ip = clientIp(request);
  if (limitIp(ip) || limitAll('all')) return json(429, { error: 'slow-down' });
  let body;
  try { body = await request.json(); } catch { return json(400, { error: 'bad-request' }); }
  const id = String(body?.id || '');
  if (!ID_RE.test(id)) return json(400, { error: 'bad-request' });

  try {
    const projectId = sa.project_id || FIREBASE_PROJECT_ID;
    const base = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;
    const fs = async (method, path, payload) => fetch(`${base}${path.startsWith(':') ? '' : '/'}${path}`, {
      method,
      headers: { authorization: `Bearer ${await accessToken(sa)}`, 'content-type': 'application/json' },
      body: payload ? JSON.stringify(payload) : undefined
    });
    const auth = async (method, path, payload) => fetch(`https://identitytoolkit.googleapis.com/v1/projects/${projectId}/${path}`, {
      method,
      headers: { authorization: `Bearer ${await accessToken(sa)}`, 'content-type': 'application/json' },
      body: payload ? JSON.stringify(payload) : undefined
    });

    const res = await fs('GET', `leads/${encodeURIComponent(id)}`);
    if (res.status === 404) return json(404, { assigned: false, reason: 'not-saved-yet' });
    if (!res.ok) throw new Error(`read ${res.status}`);
    const doc = await res.json();
    const lead = plain(doc);
    if (!eligible(lead)) return json(200, { assigned: false, reason: 'not-eligible' });

    const store = teamStore(auth, staffRegistry(fs), accessStore(fs), fs);
    const [members, config] = await Promise.all([store.listMembers(), store.getAccess()]);
    const sellers = sellersOf(members);
    if (!sellers.length) return json(200, { assigned: false, reason: 'no-sellers' });

    // Open clients per person (a few reads each; teams are small)
    const counts = {};
    for (const s of sellers) {
      const q = await fs('POST', ':runQuery', {
        structuredQuery: {
          from: [{ collectionId: 'leads' }],
          where: { fieldFilter: { field: { fieldPath: 'ownerUid' }, op: 'EQUAL', value: { stringValue: s.uid } } },
          select: { fields: [{ fieldPath: 'status' }, { fieldPath: 'isArchived' }] },
          limit: MAX_OPEN_COUNT
        }
      });
      if (!q.ok) throw new Error(`count ${q.status}`);
      const rows = await q.json();
      counts[s.uid] = rows.filter((r) => {
        if (!r.document) return false;
        const d = plain(r.document);
        return !d.isArchived && d.status !== 'closed' && d.status !== 'lost';
      }).length;
    }

    const seller = chooseSeller(lead, sellers, counts, config?.teams || []);
    if (!seller) return json(200, { assigned: false, reason: 'no-match' });

    const fields = ownerFields(seller, lead);
    const mask = Object.keys(fields).map((f) => `updateMask.fieldPaths=${f}`).join('&');
    // Only if nobody changed the lead since it was read (another assignment, a staff edit)
    const write = await fs('PATCH', `leads/${encodeURIComponent(id)}?${mask}&currentDocument.updateTime=${encodeURIComponent(doc.updateTime)}`, {
      fields: Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, toValue(v)]))
    });
    if (write.status === 400 || write.status === 409 || write.status === 412) return json(200, { assigned: false, reason: 'taken' });
    if (!write.ok) throw new Error(`write ${write.status}`);
    // The contact record carries the team too, so the new owner's team sees the phone
    if (fields.assignedTo !== lead.assignedTo) {
      const c = await fs('PATCH', `lead_contacts/${encodeURIComponent(id)}?updateMask.fieldPaths=assignedTo`, { fields: { assignedTo: { stringValue: fields.assignedTo } } });
      if (!c.ok && c.status !== 404) console.error('assign: contact desk not updated', c.status);
    }
    return json(200, { assigned: true });
  } catch (err) {
    console.error('assign failed:', err?.message || err);
    return json(502, { error: 'assign-failed' });
  }
}
