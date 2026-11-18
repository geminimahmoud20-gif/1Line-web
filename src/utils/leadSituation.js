// =============================================================
//  «الموقف الحالي» of a client in one line: was he turned into a listing, was the property not suitable,
//  did he not answer, is a viewing set… The stage pill says where the client is in the pipeline; this says what
//  happened last, which is what the team needs to decide the next call. Pure: tests/unit/lead-situation.test.mjs.
// =============================================================
import { outcomeById, outcomesOf, attemptsOf } from './stageGate.js';
import { LOST_REASONS } from './crmLeadViews.js';

/** What a listing made from a client is doing now */
export const LISTING_STATUS_AR = {
  published: 'معروض على الموقع',
  under_negotiation: 'تحت التفاوض',
  reserved: 'محجوز',
  deposit_paid: 'عربون مدفوع',
  contracted: 'متعاقد',
  sold: 'اتباع',
  hidden: 'مسودة غير منشورة',
  draft: 'مسودة غير منشورة',
  pending: 'مستني موافقة المدير',
  rejected: 'مرفوض',
  trash: 'اتحذف'
};

/** The listing made from this client (the listing form saves it with the client's id as sourceLeadId) */
export function listingByLead(properties = []) {
  const map = new Map();
  for (const p of properties) {
    if (p?.sourceLeadId && !p.deleted && !map.has(String(p.sourceLeadId))) map.set(String(p.sourceLeadId), p);
  }
  return map;
}

/**
 * { kind, tone, label, at? } or null when nothing happened yet.
 *   kind: 'converted' (a listing was made from him) | 'not_fit' | an outcome id
 *   tone: 'good' | 'bad' | 'warn' | 'neutral'
 */
export function leadSituation(lead = {}, listing = null) {
  if (listing) {
    return { kind: 'converted', tone: listing.status === 'sold' ? 'good' : 'info', label: `اتحوّل لعقار · ${LISTING_STATUS_AR[listing.status] || 'مسودة'}` };
  }
  const last = outcomesOf(lead).at(-1);
  const o = last && outcomeById(last.id);
  if (!o) return null;
  const tone = o.kind === 'positive' ? 'good' : o.kind === 'negative' ? 'bad' : 'warn';
  let label = o.ar;
  if (last.id === 'no_answer') label = `${o.ar} · محاولة ${Math.max(1, attemptsOf(lead))}`;
  else if (last.reason) {
    const why = LOST_REASONS.find((r) => r.id === last.reason)?.ar;
    if (why) label = `${o.ar} · ${why}`;
  }
  return { kind: last.id, tone, label, at: last.at };
}

/** id → kind for every client with a situation, for the filter chips and counts */
export function situationKinds(leads = [], properties = []) {
  const byLead = listingByLead(properties);
  const out = new Map();
  for (const l of leads) {
    const s = leadSituation(l, byLead.get(String(l.id)) || null);
    if (s) out.set(l.id, s.kind);
  }
  return out;
}
