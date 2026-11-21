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
import { eligible, sellersOf, chooseSeller, ownerFields, loadOf, OPEN_STAGES, MAX_OPEN_COUNT } from './_assign-core.js';
import { lookupReturning, withContact } from './_returning-core.js';
import { mergeIntoOpen, plain } from './_merge-run.js';
import { createRateLimiter, clientIp } from './_rate-limit.js';
import { cadenceTasks } from '../src/utils/followUpCadence.js';

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

    // The owner can switch this off (CRM → الأتمتة): settings/automation { autoAssign: false }, and the
    // follow-up tasks separately with { cadence: false }
    const setting = await fs('GET', 'settings/automation');
    const flags = setting.ok ? ((await setting.json())?.fields || {}) : {};
    const assignOn = flags.autoAssign?.booleanValue !== false;
    const mergeOn = flags.mergeRepeat?.booleanValue !== false;
    const cadenceOn = flags.cadence?.booleanValue !== false;

    const res = await fs('GET', `leads/${encodeURIComponent(id)}`);
    if (res.status === 404) return json(404, { assigned: false, reason: 'not-saved-yet' });
    if (!res.ok) throw new Error(`read ${res.status}`);
    const doc = await res.json();
    const lead = plain(doc);
    if (!eligible(lead)) return json(200, { assigned: false, reason: 'not-eligible' });

    // The same person filling a second form while their first request is still open: the new request goes into
    // that client's timeline and this record is archived (never deleted). Any failure falls through to a normal lead.
    if (mergeOn) {
      const merged = await mergeIntoOpen({ fs, id, lead: await withContact({ fs, plain, id, lead }), doc });
      if (merged) return json(200, { assigned: false, merged: true, into: merged });
    }
    if (!assignOn) return json(200, { assigned: false, reason: 'off' });

    const store = teamStore(auth, staffRegistry(fs), accessStore(fs), fs);
    const [members, config] = await Promise.all([store.listMembers(), store.getAccess()]);
    const sellers = sellersOf(members);
    if (!sellers.length) return json(200, { assigned: false, reason: 'no-sellers' });

    // Each person's load (open clients, the untouched ones counting extra). A COUNT query bills one read per
    // thousand entries, so this is about two reads a person instead of reading their clients one by one.
    const countOf = async (uid, stages) => {
      const stageFilter = stages.length === 1
        ? { fieldFilter: { field: { fieldPath: 'status' }, op: 'EQUAL', value: { stringValue: stages[0] } } }
        : { fieldFilter: { field: { fieldPath: 'status' }, op: 'IN', value: { arrayValue: { values: stages.map((v) => ({ stringValue: v })) } } } };
      const q = await fs('POST', ':runAggregationQuery', {
        structuredAggregationQuery: {
          structuredQuery: {
            from: [{ collectionId: 'leads' }],
            where: { compositeFilter: { op: 'AND', filters: [
              { fieldFilter: { field: { fieldPath: 'ownerUid' }, op: 'EQUAL', value: { stringValue: uid } } },
              stageFilter
            ] } }
          },
          aggregations: [{ alias: 'n', count: {} }]
        }
      });
      if (!q.ok) throw new Error(`count ${q.status}`);
      const rows = await q.json();
      return Number(rows?.[0]?.result?.aggregateFields?.n?.integerValue || 0);
    };
    // The old way (reading each person's clients): only if the count query is refused
    const readCounts = async (uid) => {
      const q = await fs('POST', ':runQuery', {
        structuredQuery: {
          from: [{ collectionId: 'leads' }],
          where: { fieldFilter: { field: { fieldPath: 'ownerUid' }, op: 'EQUAL', value: { stringValue: uid } } },
          select: { fields: [{ fieldPath: 'status' }, { fieldPath: 'isArchived' }] },
          limit: MAX_OPEN_COUNT
        }
      });
      if (!q.ok) throw new Error(`count ${q.status}`);
      const open = (await q.json()).map((r) => r.document && plain(r.document)).filter((d) => d && !d.isArchived && OPEN_STAGES.includes(d.status || 'new'));
      return { open: open.length, fresh: open.filter((d) => !d.status || d.status === 'new').length };
    };
    const counts = {};
    for (const s of sellers) {
      let c;
      try { c = { open: await countOf(s.uid, OPEN_STAGES), fresh: await countOf(s.uid, ['new']) }; } catch { c = await readCounts(s.uid); }
      counts[s.uid] = loadOf(c);
    }

    // A client who already asked before (same phone) goes back to their owner, and the new request is linked to the
    // earlier one. Any failure here just falls back to the fewest-clients rule.
    const returning = await lookupReturning({ fs, plain, lead: await withContact({ fs, plain, id, lead }), id, sellers });

    const seller = returning?.seller || chooseSeller(lead, sellers, counts, config?.teams || []);
    if (!seller) return json(200, { assigned: false, reason: 'no-match' });

    const fields = {
      ...ownerFields(seller, lead),
      ...(returning ? { returningClient: true, previousLeadId: returning.previousLeadId } : {})
    };
    const mask = Object.keys(fields).map((f) => `updateMask.fieldPaths=${f}`).join('&');
    // Only if nobody changed the lead since it was read (another assignment, a staff edit)
    const write = await fs('PATCH', `leads/${encodeURIComponent(id)}?${mask}&currentDocument.updateTime=${encodeURIComponent(doc.updateTime)}`, {
      fields: Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, toValue(v)]))
    });
    if (write.status === 400 || write.status === 409 || write.status === 412) return json(200, { assigned: false, reason: 'taken' });
    if (!write.ok) throw new Error(`write ${write.status}`);
    // The audit log: written here with the service account, as «النظام» (no staff member did it)
    const nowIso = new Date().toISOString();
    const entry = {
      actorId: 'system', actorUid: 'system', actorEmail: 'auto-assign',
      action: 'LEAD_AUTO_ASSIGNED', type: 'LEAD_AUTO_ASSIGNED', actionType: 'LEAD_AUTO_ASSIGNED',
      entityType: 'leads', targetCollection: 'leads', entityId: id, targetId: id,
      createdAt: nowIso
    };
    const log = await fs('POST', 'audit_logs', {
      fields: {
        ...Object.fromEntries(Object.entries(entry).map(([k, v]) => [k, { stringValue: v }])),
        timestamp: { timestampValue: nowIso },
        details: { mapValue: { fields: { to: { stringValue: fields.ownerName }, team: { stringValue: fields.assignedTo }, returning: { booleanValue: Boolean(returning) } } } }
      }
    });
    if (!log.ok) console.error('assign: audit entry not written', log.status);
    // The contact record carries the team too, so the new owner's team sees the phone
    if (fields.assignedTo !== lead.assignedTo) {
      const c = await fs('PATCH', `lead_contacts/${encodeURIComponent(id)}?updateMask.fieldPaths=assignedTo`, { fields: { assignedTo: { stringValue: fields.assignedTo } } });
      if (!c.ok && c.status !== 404) console.error('assign: contact desk not updated', c.status);
    }
    // The first week's follow-up as tasks for the new owner. Created once (a retry finds them), and a failure
    // here never undoes the assignment.
    let tasks = 0;
    if (cadenceOn) {
      try {
        const seller_ = { uid: seller.uid, name: fields.ownerName };
        for (const { id: taskId, task } of cadenceTasks({ lead: { ...lead, id }, seller: seller_ })) {
          const t = await fs('PATCH', `crm_tasks/${encodeURIComponent(taskId)}?currentDocument.exists=false`, {
            fields: Object.fromEntries(Object.entries(task).map(([k, v]) => [k, toValue(v)]))
          });
          if (t.ok) tasks += 1;
          else if (t.status !== 409 && t.status !== 412 && t.status !== 400) console.error('assign: follow-up task not written', t.status);
        }
      } catch (e) {
        console.error('assign: follow-up tasks failed:', e?.message || e);
      }
    }
    return json(200, { assigned: true, tasks });
  } catch (err) {
    console.error('assign failed:', err?.message || err);
    return json(502, { error: 'assign-failed' });
  }
}
