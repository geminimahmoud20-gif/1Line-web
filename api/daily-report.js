// =============================================================
//  Vercel Function: the owner's daily WhatsApp report (logic in api/_daily-report-core.js).
//    GET   — Vercel Cron, every morning (vercel.json "crons"). Sends once per Cairo day.
//    POST { mode: 'preview' | 'test' } with a super admin's ID token — the CRM's
//          «اعرض التقرير» and «ابعته دلوقتي» buttons (a test send says so and can repeat).
//
//  Environment (Vercel → Settings → Environment Variables), the same keys as api/notify.js:
//    FIREBASE_SERVICE_ACCOUNT, WHATSAPP_CALLMEBOT and/or WHATSAPP_CLOUD_*
//    CRON_SECRET (optional) — when set, the cron call must carry it (Vercel adds it itself)
// =============================================================
import { SignJWT, importPKCS8, createRemoteJWKSet, jwtVerify, decodeJwt } from 'jose';
import { makeSenders, sendAll } from './_notify-core.js';
import { runDailyReport, reportDays, cairoDayRange, mergeDaily } from './_daily-report-core.js';
import { DAILY_SHARDS } from './_track-core.js';
import { roleOf } from './_team-core.js';

const SITE_URL = (process.env.SITE_URL || 'https://www.1lineestate.com').replace(/\/$/, '');
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

// Firestore REST value → plain JS
export const fromValue = (v) => {
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
const docOf = (d) => ({ id: d.name.split('/').pop(), ...Object.fromEntries(Object.entries(d.fields || {}).map(([k, v]) => [k, fromValue(v)])) });

/** Everything the report reads, with the service account (or the emulator in tests) */
export function reportStore(sa) {
  const emulator = process.env.FIRESTORE_EMULATOR_HOST;
  const projectId = sa?.project_id || FIREBASE_PROJECT_ID;
  const root = `projects/${projectId}/databases/(default)/documents`;
  const base = `${emulator ? `http://${emulator}` : 'https://firestore.googleapis.com'}/v1/${root}`;
  const call = async (method, path, body) => fetch(`${base}${path}`, {
    method,
    headers: { authorization: `Bearer ${emulator ? 'owner' : await accessToken(sa)}`, 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined
  });

  // A whole collection, only the fields the report uses, page by page (capped)
  const list = async (collection, fields, max = 6000) => {
    const out = [];
    let pageToken = '';
    while (out.length < max) {
      const q = new URLSearchParams({ pageSize: '300' });
      for (const f of fields) q.append('mask.fieldPaths', f);
      if (pageToken) q.set('pageToken', pageToken);
      const res = await call('GET', `/${collection}?${q}`);
      if (!res.ok) throw new Error(`list ${collection} ${res.status}`);
      const data = await res.json();
      for (const d of data.documents || []) out.push(docOf(d));
      if (!data.nextPageToken) break;
      pageToken = data.nextPageToken;
    }
    return out;
  };

  // Records created since a moment (createdAt is a Firestore timestamp on these collections)
  const since = async (collection, fromMs, limit = 1000) => {
    const res = await call('POST', ':runQuery', {
      structuredQuery: {
        from: [{ collectionId: collection }],
        where: { fieldFilter: { field: { fieldPath: 'createdAt' }, op: 'GREATER_THAN_OR_EQUAL', value: { timestampValue: new Date(fromMs).toISOString() } } },
        limit
      }
    });
    if (!res.ok) throw new Error(`query ${collection} ${res.status}`);
    return (await res.json()).filter((r) => r.document).map((r) => docOf(r.document));
  };

  const get = async (path) => {
    const res = await call('GET', `/${path}`);
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`get ${path} ${res.status}`);
    return docOf(await res.json());
  };

  const getMany = async (paths) => {
    const res = await call('POST', ':batchGet', { documents: paths.map((p) => `${root}/${p}`) });
    if (!res.ok) throw new Error(`batchGet ${res.status}`);
    return (await res.json()).filter((r) => r.found).map((r) => docOf(r.found));
  };

  return {
    async load(now) {
      const { target, before } = reportDays(now);
      const weekStart = cairoDayRange(before[0])[0];
      const [targetStart, targetEnd] = cairoDayRange(target);
      const days = [...before, target];
      const optional = (p, fallback) => p.catch((err) => { console.warn('daily report: part skipped', err?.message); return fallback; });

      const [leads, properties, demands, remoteInspections, tradeIns, intents, errors, dailyDocs, propertyStats, notify, areas] = await Promise.all([
        list('leads', ['createdAt', 'timestamp', 'status', 'type', 'source', 'utmSource', 'landingPage', 'notes', 'area', 'details', 'propertyId',
          'assignedTo', 'firstContactedAt', 'lastContactedAt', 'lastActivityAt', 'updatedAt', 'statusChangedAt', 'nextFollowUpAt', 'followUp',
          'isArchived', 'isDeleted', 'lostReason']),
        optional(list('properties', ['title_ar', 'type', 'price', 'size', 'areaKey', 'area', 'status', 'isDeleted', 'isArchived', 'createdAt']), []),
        optional(since('demands', weekStart), []),
        optional(since('remote_inspections', weekStart), []),
        optional(since('trade_ins', weekStart), []),
        optional(since('contact_intents', weekStart), []),
        optional(since('client_errors', targetStart, 500), []),
        optional(getMany(days.flatMap((d) => Array.from({ length: DAILY_SHARDS }, (_, i) => `analytics_daily/${d}_${i}`))), []),
        optional(list('analytics_properties', ['days'], 2000), []),
        optional(get('notify_status/whatsapp'), null),
        optional(get('settings/areas_cms'), null)
      ]);

      const daily = {};
      for (const d of days) daily[d] = mergeDaily(dailyDocs.filter((doc) => doc.id.startsWith(`${d}_`)));
      const ms = (v) => Date.parse(v || '') || 0;
      return {
        leads,
        properties,
        demands,
        remoteInspections,
        tradeIns,
        intents,
        errorsYesterday: errors.filter((e) => { const t = ms(e.createdAt); return t >= targetStart && t < targetEnd; }).length,
        daily,
        propertyStats: propertyStats.map((p) => ({ id: p.id, days: p.days || {} })),
        notifyStatus: notify ? { lastOkAt: ms(notify.lastOkAt), lastFailAt: ms(notify.lastFailAt) } : null,
        areaNames: Object.fromEntries((areas?.areas || []).filter((a) => a && a.id).map((a) => [a.id, a.name_ar || a.id]))
      };
    },
    // report_log/{day}: created once, so the cron never sends the same day twice
    async claimDay(day) {
      const res = await call('POST', `/report_log?documentId=${encodeURIComponent(day)}`, { fields: { sentAt: { timestampValue: new Date().toISOString() } } });
      if (res.status === 409) return false;
      if (!res.ok) throw new Error(`claim ${res.status}`);
      return true;
    },
    async releaseDay(day) {
      await call('DELETE', `/report_log/${encodeURIComponent(day)}`);
    }
  };
}

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

async function run(mode) {
  const sa = serviceAccount();
  const senders = makeSenders(process.env);
  if (!sa?.private_key) return json(503, { error: 'not-configured', serviceAccount: false, channels: senders.length });
  if (mode !== 'preview' && senders.length === 0) return json(503, { error: 'not-configured', serviceAccount: true, channels: 0 });
  try {
    const store = reportStore(sa);
    const { status, body } = await runDailyReport({
      now: () => Date.now(),
      load: store.load,
      claimDay: store.claimDay,
      releaseDay: store.releaseDay,
      sendAll: (text) => sendAll(senders, text)
    }, { mode, siteUrl: SITE_URL });
    return json(status, body);
  } catch (err) {
    console.error('daily report failed:', err?.message || err);
    return json(502, { error: 'report-failed' });
  }
}

// Vercel Cron. Without CRON_SECRET anyone could call it, but the day can only be sent once.
export async function GET(request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get('authorization') !== `Bearer ${secret}`) return json(401, { error: 'unauthorized' });
  return run('cron');
}

export async function POST(request) {
  if (!(await isSuperAdmin(request))) return json(403, { error: 'forbidden' });
  let body = {};
  try { body = await request.json(); } catch { /* no body: preview */ }
  return run(body?.mode === 'test' ? 'test' : 'preview');
}
