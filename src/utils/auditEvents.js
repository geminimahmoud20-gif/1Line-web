// =============================================================
//  The audit trail (audit_logs, written by logAuditEvent, read by the super admin in
//  CRM → إدارة المنظومة → سجل المراجعة): the labels the screen shows, and the two events the CRM
//  records when staff use a client's phone or hand a client to someone else.
//  No phone, email or message text ever goes into an entry: only the client's id and the channel.
//  Pure: tests/unit/audit-events.test.mjs.
// =============================================================

export const AUDIT_LABELS = {
  CONTACT_USED: { ar: 'استخدم رقم عميل', en: 'Used a client’s phone' },
  LEAD_REASSIGNED: { ar: 'نقل عميل لبياع أو فريق', en: 'Reassigned a client' },
  LEAD_AUTO_ASSIGNED: { ar: 'توزيع تلقائي لعميل جديد', en: 'Auto-assigned a new client' },
  LEAD_CLAIMED: { ar: 'استلم عميل', en: 'Claimed a client' },
  BULK_LEADS_ASSIGNED: { ar: 'وزّع عملاء بالجملة', en: 'Bulk-assigned clients' },
  BULK_LEADS_DELETED: { ar: 'حذف عملاء بالجملة', en: 'Bulk-deleted clients' },
  LEADS_EXPORTED_CSV: { ar: 'صدّر العملاء (CSV)', en: 'Exported clients (CSV)' },
  LEADS_EXPORTED_XLSX: { ar: 'صدّر العملاء (Excel)', en: 'Exported clients (Excel)' },
  LEADS_EXPORTED_JSON: { ar: 'صدّر العملاء (JSON)', en: 'Exported clients (JSON)' }
};

export const auditLabel = (action, isAr = true) => {
  const l = AUDIT_LABELS[action];
  return l ? (isAr ? l.ar : l.en) : String(action || '').replace(/_/g, ' ').toLowerCase();
};

const CHANNELS = { call: { ar: 'اتصال', en: 'Call' }, whatsapp: { ar: 'واتساب', en: 'WhatsApp' } };

/** The audit entry for a tap on «اتصال» or «واتساب»: who it was (by id), through what */
export function contactUseEvent(lead, channel) {
  if (!lead?.id || !CHANNELS[channel]) return null;
  return { actionType: 'CONTACT_USED', targetCollection: 'leads', targetId: String(lead.id), details: { channel } };
}

const holderOf = (l = {}) => l.ownerName || l.claimedBy || l.assignedTo || 'Unassigned';

/** The audit entry when a lead's owner or team changed, or null when it did not */
export function assignmentEvent(before, fields) {
  if (!before?.id || !fields) return null;
  const touched = ['ownerUid', 'ownerName', 'assignedTo'].some((k) => k in fields);
  if (!touched) return null;
  const after = { ...before, ...fields };
  const from = holderOf(before);
  const to = holderOf(after);
  if (from === to) return null;
  return { actionType: 'LEAD_REASSIGNED', targetCollection: 'leads', targetId: String(before.id), details: { from, to } };
}

// One entry per client and channel per minute, however many times it is tapped
const recent = new Map();
export function shouldLogContact(leadId, channel, now = Date.now()) {
  const key = `${leadId}|${channel}`;
  const last = recent.get(key);
  if (last !== undefined && now - last < 60_000) return false;
  if (recent.size > 500) recent.clear();
  recent.set(key, now);
  return true;
}

/** One readable line for the screen */
export function describeAudit(entry = {}, isAr = true) {
  const d = entry.details || entry.metadata || {};
  const action = entry.action || entry.actionType || '';
  if (action === 'CONTACT_USED') return `${(CHANNELS[d.channel] || {})[isAr ? 'ar' : 'en'] || ''} — ${entry.targetId || ''}`.trim();
  if (action === 'LEAD_AUTO_ASSIGNED') return `${d.to || '—'} (${d.team || ''}) — ${entry.targetId || ''}`;
  if (action === 'LEAD_REASSIGNED') return `${d.from || '—'} ← ${d.to || '—'} (${entry.targetId || ''})`;
  const bits = [entry.targetCollection, entry.targetId && entry.targetId !== 'global' ? entry.targetId : ''].filter(Boolean);
  return bits.join(' · ');
}
