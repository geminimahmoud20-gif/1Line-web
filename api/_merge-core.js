// =============================================================
//  A client who fills a second form while their first request is still open is the same client: the new
//  request is written into the open lead's activity log (the timeline in their file) and the new record is
//  archived, pointing at it. Pure rules, tests/unit/merge-request.test.mjs. api/assign.js does the writes.
// =============================================================
import { splitNotes } from '../src/utils/inboxView.js';
import { isAccountLead } from '../src/utils/crmLeadViews.js';

const MAX_LOGS = 100;
const CLOSED = ['closed', 'lost', 'inactive'];
const TYPE_AR = { buyer: 'شراء', seller: 'بيع', investor: 'استثمار', rent: 'إيجار', tenant: 'إيجار', landlord: 'تأجير', broker: 'وسيط', valuation: 'تقييم عقار' };

const ms = (v) => {
  const t = Date.parse(v || '');
  return Number.isFinite(t) ? t : 0;
};
const createdMs = (l) => ms(l?.createdAt || l?.timestamp);

/** Is this earlier request still open, so a new one from the same person belongs to it */
export function isOpenEarlier(earlier, incoming) {
  if (!earlier || earlier.isArchived || earlier.mergedInto || CLOSED.includes(earlier.status)) return false;
  const a = createdMs(earlier);
  const b = createdMs(incoming);
  // Strictly earlier: two forms sent together never swallow each other
  return Boolean(a) && Boolean(b) && a < b;
}

/** The open request the new one joins (the most recent open one), or null */
export function pickPrimary(earlier = [], incoming) {
  const open = earlier.filter((e) => isOpenEarlier(e.data, incoming));
  open.sort((x, y) => createdMs(y.data) - createdMs(x.data));
  return open[0] || null;
}

/** One line for the timeline: what the person asked in this form */
export function requestSummary(lead = {}) {
  const d = lead.details || {};
  const bits = [
    lead.source || '',
    TYPE_AR[lead.type] || '',
    d.area || lead.area || '',
    lead.budget || d.budget ? `الميزانية ${lead.budget || d.budget}` : ''
  ].filter(Boolean);
  const words = splitNotes(lead.notes || '').client.slice(0, 160);
  return `طلب جديد من نفس العميل${bits.length ? ` — ${bits.join(' · ')}` : ''}${words ? ` — «${words}»` : ''}`;
}

// What a request says about what the client wants: copied onto an account-only record that had none of it
const REQUEST_FIELDS = ['details', 'budget', 'area', 'propertyType', 'location'];
const has = (v) => v !== undefined && v !== null && v !== '' && !(typeof v === 'object' && !Object.keys(v).length);

/**
 * The fields to write on the open lead and on the new record. A client who only registered an account has said
 * nothing about buying or selling; when they then send a real request, their one record becomes that request
 * (its type and details), and the account stays noted. The other way round, an account registration under a
 * client who already has a request only adds «hasAccount» to it.
 */
export function mergeFields(primary, incoming, incomingId, nowIso = new Date().toISOString()) {
  const logs = Array.isArray(primary.data.activityLogs) ? primary.data.activityLogs : [];
  const entry = { timestamp: nowIso, action: requestSummary(incoming), kind: 'request', requestId: String(incomingId) };
  const from = Array.isArray(primary.data.mergedFrom) ? primary.data.mergedFrom : [];
  const upgrade = {};
  if (isAccountLead(primary.data) && !isAccountLead(incoming)) {
    upgrade.type = incoming.type || 'buyer';
    upgrade.hasAccount = true;
    for (const k of REQUEST_FIELDS) if (!has(primary.data[k]) && has(incoming[k])) upgrade[k] = incoming[k];
  } else if (isAccountLead(incoming) && !isAccountLead(primary.data)) {
    upgrade.hasAccount = true;
  }
  return {
    primary: {
      ...upgrade,
      activityLogs: [entry, ...logs].slice(0, MAX_LOGS),
      mergedFrom: [...new Set([...from, String(incomingId)])],
      requestCount: (Number(primary.data.requestCount) || 1) + 1,
      lastRequestAt: nowIso,
      lastActivityAt: nowIso,
      updatedAt: nowIso
    },
    incoming: { isArchived: true, mergedInto: String(primary.id), archivedAt: nowIso, updatedAt: nowIso }
  };
}

/** A plain value as a Firestore REST value */
export function toFirestore(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(toFirestore) } };
  if (typeof v === 'object') return { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k, x]) => [k, toFirestore(x)])) } };
  return { stringValue: String(v) };
}
