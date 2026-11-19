// =============================================================
//  The line the activity log (اللي حصل) records when a client is edited: what changed, from what to what.
//  It used to say «تحديث بيانات: تواصل» for almost everything. Phone numbers and emails are never written
//  into it (the field's name only), and a change that is only bookkeeping (timestamps, versions) writes no line.
//  Pure: tests/unit/lead-change-log.test.mjs
// =============================================================
import { LOST_REASONS } from './crmLeadViews.js';

export const LEAD_STAGE_AR = { new: 'عميل محتمل', contacted: 'مؤهل', site_visit: 'اجتماع / معاينة', negotiating: 'تفاوض', closing: 'إغلاق (توقيع وحجز)', closed: 'إغلاق', lost: 'خسارة', inactive: 'غير متفاعل' };

const day = (v) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v) ? v.slice(0, 10) : '');
const money = (v) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v).toLocaleString('en-US') : '');
const plain = (v) => (typeof v === 'string' || typeof v === 'number' ? String(v).slice(0, 40) : '');

// The fields worth a line. `show` writes the value too (from → to); the rest are named only.
const FIELDS = {
  name: { ar: 'الاسم' },
  phone: { ar: 'رقم التليفون' },
  whatsapp: { ar: 'رقم الواتساب' },
  altPhone: { ar: 'رقم تاني' },
  email: { ar: 'الإيميل' },
  budget: { ar: 'الميزانية', show: money },
  area: { ar: 'المنطقة', show: plain },
  propertyType: { ar: 'نوع العقار', show: plain },
  temperature: { ar: 'درجة الحرارة', show: plain },
  score: { ar: 'الجدية', show: plain },
  nextFollowUpAt: { ar: 'موعد المتابعة', show: day },
  notes: { ar: 'الملاحظات' },
  tags: { ar: 'الوسوم' },
  source: { ar: 'المصدر', show: plain },
  paymentMethod: { ar: 'طريقة الدفع', show: plain },
  timeframe: { ar: 'موعد الشراء', show: plain },
  urgency: { ar: 'الاستعجال', show: plain },
  details: { ar: 'تفاصيل الطلب' }
};

const sameValue = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

/** Who holds the client: the person if there is one, else the team's desk */
export function holderLabel(lead = {}) {
  const v = lead.ownerName || lead.claimedBy || lead.assignedTo || '';
  return !v || v === 'Unassigned' ? 'غير مسند' : String(v);
}

/** One readable line for what `fields` changes on `before`, or '' when nothing worth recording changes */
export function describeLeadChange(fields = {}, before = {}) {
  const parts = [];
  if (fields.status && fields.status !== (before.status || 'new')) {
    const from = LEAD_STAGE_AR[before.status || 'new'] || before.status || '';
    let line = `تغيير المرحلة${from ? ` من ${from}` : ''} إلى: ${LEAD_STAGE_AR[fields.status] || fields.status}`;
    const reason = fields.status === 'lost' && LOST_REASONS.find((r) => r.id === fields.lostReason);
    if (reason) line += ` (${reason.ar}${fields.lostNote ? ` — ${fields.lostNote}` : ''})`;
    parts.push(line);
  }

  if (['ownerUid', 'ownerName', 'claimedBy', 'assignedTo'].some((k) => k in fields)) {
    const from = holderLabel(before);
    const to = holderLabel({ ...before, ...fields });
    if (from !== to) parts.push(from === 'غير مسند' ? `تعيين المسؤول: ${to}` : `تعيين المسؤول: من ${from} إلى ${to}`);
  }

  if (typeof fields._logAction === 'string' && fields._logAction.trim()) parts.push(fields._logAction.trim());
  else if (fields.lastContactedAt) parts.push('تواصل مع العميل');

  const changed = [];
  for (const [key, spec] of Object.entries(FIELDS)) {
    if (!(key in fields) || sameValue(fields[key], before[key])) continue;
    const to = spec.show ? spec.show(fields[key]) : '';
    const from = spec.show ? spec.show(before[key]) : '';
    changed.push(to && from && to !== from ? `${spec.ar} (من ${from} إلى ${to})` : to ? `${spec.ar} (${to})` : spec.ar);
  }
  if ('isArchived' in fields && Boolean(fields.isArchived) !== Boolean(before.isArchived)) changed.push(fields.isArchived ? 'نقل للأرشيف' : 'إرجاع من الأرشيف');
  if (changed.length) parts.push(`تعديل: ${changed.join('، ')}`);

  return parts.join(' · ');
}

/** The entry to put at the top of the log, or null when there is nothing to say */
export function changeEntry(fields, before, { agent = '', nowIso = new Date().toISOString() } = {}) {
  const action = describeLeadChange(fields, before);
  if (!action) return null;
  return { timestamp: nowIso, action, ...(agent ? { agent } : {}) };
}
