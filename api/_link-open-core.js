// Pure logic for api/link-open.js: a client opened a listing link the team sent them (src/utils/linkTracking.js).
// Only two ids come in; the lead is checked against the database before anything is written.
import { isLeadId } from '../src/utils/linkTracking.js';

export const MAX_BODY_BYTES = 512;
export const OPEN_LIMITS = { perIp: { max: 30, windowMs: 10 * 60 * 1000 }, overall: { max: 1500, windowMs: 60 * 60 * 1000 } };

const PROP_RE = /^[\w-]{1,80}$/;

/** { leadId, propertyId } or null when the body is not one */
export function sanitizeOpen(body) {
  if (!body || typeof body !== 'object') return null;
  const leadId = String(body.lead ?? '');
  const propertyId = String(body.property ?? '');
  if (!isLeadId(leadId) || !PROP_RE.test(propertyId)) return null;
  return { leadId, propertyId };
}

/** The document id for one client and one listing */
export const openDocId = (leadId, propertyId) => `${leadId}__${propertyId}`;

const s = (v) => ({ stringValue: String(v) });
const i = (n) => ({ integerValue: String(n) });

/** Fields of a first open: link_opens/{leadId__propertyId} */
export function firstOpenFields({ leadId, propertyId }, ownerUid = '', nowIso = new Date().toISOString()) {
  return { leadId: s(leadId), propertyId: s(propertyId), ownerUid: s(ownerUid || ''), firstAt: s(nowIso), lastAt: s(nowIso), count: i(1) };
}
