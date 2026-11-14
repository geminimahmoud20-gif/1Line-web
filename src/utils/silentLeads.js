// =============================================================
//  «عملاء ساكتين»: open clients nobody has touched for a week or more (no call, no note, no stage move),
//  that no open task is already chasing. The list a salesperson works through to wake them up, longest
//  silence first. Pure: tests/unit/silent-leads.test.mjs
// =============================================================
import { toMs, leadCreatedMs } from './crmLeadViews.js';

const DAY = 86_400_000;
export const SILENT_DAYS = 7;
const CLOSED = new Set(['closed', 'lost']);

/** When someone last did something with the client (ms), or when he arrived */
export const lastTouchMs = (l) => Math.max(toMs(l?.lastActivityAt), toMs(l?.lastContactedAt), toMs(l?.updatedAt), 0) || leadCreatedMs(l) || 0;

/**
 * [{ lead, days }] longest silence first.
 * uid: only this person's clients (omit for everyone's); tasks: open tasks that already cover a client
 */
export function silentLeads(leads = [], { uid = '', tasks = [], days = SILENT_DAYS, now = Date.now() } = {}) {
  const covered = new Set(tasks.filter((t) => t && t.status === 'open' && t.leadId).map((t) => String(t.leadId)));
  const out = [];
  for (const lead of leads) {
    if (!lead || !lead.id || lead.isArchived || CLOSED.has(lead.status)) continue;
    if (uid && lead.ownerUid !== uid) continue;
    if (covered.has(String(lead.id))) continue;
    const last = lastTouchMs(lead);
    if (!last) continue;
    const silent = Math.floor((now - last) / DAY);
    if (silent >= days) out.push({ lead, days: silent });
  }
  return out.sort((a, b) => b.days - a.days);
}

/** How long, in words a salesperson says it: «أسبوع», «١٢ يوم», «شهرين» */
export function silenceLabel(days, isAr = true) {
  if (!isAr) return `${days} days`;
  if (days < 14) return days < 10 ? `${days} أيام` : `${days} يوم`;
  if (days < 30) return `${Math.floor(days / 7)} أسابيع`;
  const months = Math.floor(days / 30);
  return months === 1 ? 'شهر' : months === 2 ? 'شهرين' : `${months} شهور`;
}

/** Buckets for grouping the list: 7–13 days, 14–29, 30+ */
export function silenceBucket(days) {
  return days >= 30 ? 'month' : days >= 14 ? 'fortnight' : 'week';
}
