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
  LEADS_EXPORTED_JSON: { ar: 'صدّر العملاء (JSON)', en: 'Exported clients (JSON)' },
  LEAD_DELETED: { ar: 'حذف عميل', en: 'Deleted a client' },
  ROLE_SAVED: { ar: 'غيّر صلاحيات دور', en: 'Changed a role’s permissions' },
  ROLE_DELETED: { ar: 'حذف دور', en: 'Deleted a role' },
  DATA_EXPORTED: { ar: 'صدّر بيانات', en: 'Exported data' }
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
  if (action === 'LEAD_AUTO_ASSIGNED') return `${d.to || '—'} (${d.team || ''}) — ${entry.targetId || ''}`;
  if (action === 'LEAD_REASSIGNED') return `${d.from || '—'} ← ${d.to || '—'} (${entry.targetId || ''})`;
  if (action === 'ROLE_SAVED') {
    const parts = [d.created ? (isAr ? 'دور جديد' : 'New role') : '', d.added?.length ? `+${d.added.join(', ')}` : '', d.removed?.length ? `−${d.removed.join(', ')}` : ''].filter(Boolean);
    return `${entry.targetId || ''}${parts.length ? ` · ${parts.join(' ')}` : ''}`;
  }
  if (action === 'ROLE_DELETED') return `${entry.targetId || ''}${d.fallback ? ` → ${d.fallback}` : ''}`;
  if (action === 'DATA_EXPORTED') return `${entry.targetCollection || ''} · ${d.format || ''} · ${d.count ?? 0}`;
  const bits = [entry.targetCollection, entry.targetId && entry.targetId !== 'global' ? entry.targetId : ''].filter(Boolean);
  return bits.join(' · ');
}
