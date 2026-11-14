// =============================================================
//  Vercel Function: the owner's weekly WhatsApp report (logic in api/_weekly-report-core.js).
//    GET   — Vercel Cron, Saturday morning Cairo (vercel.json "crons"): the 7 days that ended yesterday.
//            Sends once per week.
//    POST { mode: 'preview' | 'test' } with a super admin's ID token (a test send says so and can repeat).
//  Same environment and channels as api/daily-report.js.
// =============================================================
import { createRemoteJWKSet, jwtVerify, decodeJwt } from 'jose';
import { makeSenders, sendAll } from './_notify-core.js';
import { runWeeklyReport } from './_weekly-report-core.js';
import { reportStore } from './daily-report.js';
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

// What the weekly numbers read from each client (never the contact details) and from the tasks
const LEAD_FIELDS = ['createdAt', 'timestamp', 'status', 'source', 'utmSource', 'utmCampaign', 'marketingAttribution', 'type',
  'firstContactedAt', 'stageHistory', 'ownerUid', 'ownerName', 'claimedBy', 'isArchived', 'closedAt', 'lostAt', 'lostReason',
  'dealValue', 'commissionPct', 'budget', 'details'];
const TASK_FIELDS = ['status', 'doneAt', 'dueAt', 'assigneeUid', 'assigneeName'];

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
    const { status, body } = await runWeeklyReport({
      now: () => Date.now(),
      load: async () => {
        const [leads, tasks, goals] = await Promise.all([
          store.list('leads', LEAD_FIELDS),
          store.list('crm_tasks', TASK_FIELDS, 3000).catch((err) => { console.warn('weekly report: tasks skipped', err?.message); return []; }),
          store.get('crm_goals/current').catch((err) => { console.warn('weekly report: goals skipped', err?.message); return null; })
        ]);
        return { leads, tasks, goals };
      },
      claimWeek: store.claimDay,
      releaseWeek: store.releaseDay,
      sendAll: (text) => sendAll(senders, text)
    }, { mode, siteUrl: SITE_URL });
    return json(status, body);
  } catch (err) {
    console.error('weekly report failed:', err?.message || err);
    return json(502, { error: 'report-failed' });
  }
}

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
