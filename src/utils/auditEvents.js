// =============================================================
//  The audit trail (audit_logs, written by logAuditEvent, read by the super admin in
//  CRM → إدارة المنظومة → سجل المراجعة): the labels the screen shows, and the two events the CRM
//  records when staff use a client's phone or hand a client to someone else.
//  No phone, email or message text ever goes into an entry: only the client's id and the channel.
//  Pure: tests/unit/audit-events.test.mjs.
// =============================================================

export const AUDIT_LABELS = {
  CONTACT_USED: { ar: 'استخدم رقم عميل', en: 'Used a client’s phone' },
  PHONE_REVEALED: { ar: 'أظهر رقم عميل', en: 'Revealed a client’s phone' },
  PHONE_COPIED: { ar: 'نسخ رقم عميل', en: 'Copied a client’s phone' },
  LEAD_REASSIGNED: { ar: 'نقل عميل لبياع أو فريق', en: 'Reassigned a client' },
  LEAD_AUTO_ASSIGNED: { ar: 'توزيع تلقائي لعميل جديد', en: 'Auto-assigned a new client' },
  LEAD_CLAIMED: { ar: 'استلم عميل', en: 'Claimed a client' },
  BULK_LEADS_ASSIGNED: { ar: 'وزّع عملاء بالجملة', en: 'Bulk-assigned clients' },
  BULK_LEADS_DELETED: { ar: 'حذف عملاء بالجملة', en: 'Bulk-deleted clients' },
  LEADS_EXPORTED_CSV: { ar: 'صدّر العملاء (CSV)', en: 'Exported clients (CSV)' },
  LEADS_EXPORTED_XLSX: { ar: 'صدّر العملاء (Excel)', en: 'Exported clients (Excel)' },
  LEADS_EXPORTED_JSON: { ar: 'صدّر العملاء (JSON)', en: 'Exported clients (JSON)' },
  LEAD_DELETED: { ar: 'حذف عميل', en: 'Deleted a client' },
  ROLE_SAVED: { ar: 'غيّر صلاحيات دور', en: 'Changed a role’s permissions' },
  ROLE_DELETED: { ar: 'حذف دور', en: 'Deleted a role' },
  DATA_EXPORTED: { ar: 'صدّر بيانات', en: 'Exported data' },
  PROPERTY_EDITED: { ar: 'عدّل عقار', en: 'Edited a listing' },
  PROPERTY_APPROVED: { ar: 'وافق على نشر عقار', en: 'Approved a listing' },
  PROPERTY_REJECTED: { ar: 'رفض نشر عقار', en: 'Rejected a listing' }
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

/** «إظهار» on a masked number: the client's id and the screen it was on, never the number */
export function phoneRevealEvent(leadId, surface = '') {
  if (!leadId) return null;
  return { actionType: 'PHONE_REVEALED', targetCollection: 'leads', targetId: String(leadId), details: { surface: String(surface || '').slice(0, 24) } };
}

/** The copy button next to a number */
export function phoneCopyEvent(leadId, surface = '') {
  if (!leadId) return null;
  return { actionType: 'PHONE_COPIED', targetCollection: 'leads', targetId: String(leadId), details: { surface: String(surface || '').slice(0, 24) } };
}

/** How many reveals + copies in one day look like harvesting rather than work */
export const REVEAL_ALERT_PER_DAY = 40;

/**
 * Per person, how many numbers they revealed or copied on the day of `now` (local), most first.
 * `flagged` once someone passes REVEAL_ALERT_PER_DAY. Reads the entries already loaded on screen.
 */
export function revealSummary(events = [], now = Date.now(), limit = REVEAL_ALERT_PER_DAY) {
  const day = new Date(now).toDateString();
  const by = new Map();
  for (const e of events) {
    if (e?.action !== 'PHONE_REVEALED' && e?.action !== 'PHONE_COPIED') continue;
    if (!e.at || new Date(e.at).toDateString() !== day) continue;
    const who = e.actorEmail || '—';
    const row = by.get(who) || { actor: who, reveals: 0, copies: 0, total: 0, flagged: false };
    if (e.action === 'PHONE_REVEALED') row.reveals += 1; else row.copies += 1;
    row.total += 1;
    row.flagged = row.total >= limit;
    by.set(who, row);
  }
  return [...by.values()].sort((a, b) => b.total - a.total);
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

// Bookkeeping fields a save always carries alongside the real change; not worth listing on their own
const PROPERTY_NOISE_FIELDS = new Set(['statusChangedAt', 'soldAt', 'updatedAt', 'lastActivityAt']);

/**
 * The audit entry for a property edit: who changed it and which fields (never the values — a
 * listing can carry long descriptions or embedded images). A manager's approval/rejection gets
 * its own, more specific action so it reads clearly in the log.
 */
export function propertyEditEvent(current, patch) {
  if (!current?.id || !patch) return null;
  const fields = Object.keys(patch).filter((k) => !PROPERTY_NOISE_FIELDS.has(k));
  if (!fields.length) return null;
  if (patch.approval === 'approved' && current.approval !== 'approved') {
    return { actionType: 'PROPERTY_APPROVED', targetCollection: 'properties', targetId: String(current.id), details: {} };
  }
  if (patch.approval === 'rejected' && current.approval !== 'rejected') {
    return { actionType: 'PROPERTY_REJECTED', targetCollection: 'properties', targetId: String(current.id), details: {} };
  }
  return { actionType: 'PROPERTY_EDITED', targetCollection: 'properties', targetId: String(current.id), details: { fields: fields.slice(0, 20) } };
}

/** A single client deleted: only the id (no name, phone or notes) */
export function leadDeletedEvent(leadId) {
  if (!leadId) return null;
  return { actionType: 'LEAD_DELETED', targetCollection: 'leads', targetId: String(leadId), details: {} };
}

/**
 * A role saved: which permissions it gained and lost (ids), so the trail shows what changed,
 * not just that something did. A new role lists everything as added.
 */
export function roleChangeEvent(before, after) {
  if (!after?.id) return null;
  const was = new Set(before?.perms || []);
  const now = new Set(after.perms || []);
  const added = [...now].filter((p) => !was.has(p));
  const removed = [...was].filter((p) => !now.has(p));
  if (before && !added.length && !removed.length) return null;
  return { actionType: 'ROLE_SAVED', targetCollection: 'roles', targetId: String(after.id), details: { created: !before, added, removed } };
}

export const roleDeletedEvent = (roleId, fallbackRoleId) => (roleId
  ? { actionType: 'ROLE_DELETED', targetCollection: 'roles', targetId: String(roleId), details: { fallback: fallbackRoleId || '' } }
  : null);

/** Any table export that has no entry of its own: which table and how many rows, never the rows */
export function dataExportEvent(scope, format, count) {
  if (!scope) return null;
  return { actionType: 'DATA_EXPORTED', targetCollection: String(scope).slice(0, 40), targetId: String(format || 'file'), details: { format: String(format || ''), count: Number(count) || 0 } };
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
  if (action === 'PHONE_REVEALED' || action === 'PHONE_COPIED') return `${entry.targetId || ''}${d.surface ? ` · ${d.surface}` : ''}`;
  if (action === 'LEAD_AUTO_ASSIGNED') return `${d.to || '—'} (${d.team || ''}) — ${entry.targetId || ''}`;
  if (action === 'LEAD_REASSIGNED') return `${d.from || '—'} ← ${d.to || '—'} (${entry.targetId || ''})`;
  if (action === 'ROLE_SAVED') {
    const parts = [d.created ? (isAr ? 'دور جديد' : 'New role') : '', d.added?.length ? `+${d.added.join(', ')}` : '', d.removed?.length ? `−${d.removed.join(', ')}` : ''].filter(Boolean);
    return `${entry.targetId || ''}${parts.length ? ` · ${parts.join(' ')}` : ''}`;
  }
  if (action === 'ROLE_DELETED') return `${entry.targetId || ''}${d.fallback ? ` → ${d.fallback}` : ''}`;
  if (action === 'DATA_EXPORTED') return `${entry.targetCollection || ''} · ${d.format || ''} · ${d.count ?? 0}`;
  if (action === 'PROPERTY_EDITED') return `${entry.targetId || ''}${d.fields?.length ? ` · ${d.fields.join(', ')}` : ''}`;
  if (action === 'PROPERTY_APPROVED' || action === 'PROPERTY_REJECTED') return `${entry.targetId || ''}`;
  const bits = [entry.targetCollection, entry.targetId && entry.targetId !== 'global' ? entry.targetId : ''].filter(Boolean);
  return bits.join(' · ');
}
