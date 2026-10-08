import { useState } from 'react';
import { X } from 'lucide-react';
import { leadCreatedMs, leadSourceKey, LEAD_SOURCES } from '../../utils/crmLeadViews';

const STAGE = { new: ['طلب جديد', 'New'], contacted: ['تم التواصل', 'Contacted'], site_visit: ['معاينة', 'Site visit'], negotiating: ['تفاوض', 'Negotiating'], closing: ['توقيع وحجز', 'Closing'], closed: ['صفقة ناجحة', 'Won'], lost: ['خسرانة', 'Lost'] };

/**
 * Same phone on several leads: pick the record to keep, the others are folded into it and deleted.
 * Deleting is admin-only in the rules, so other roles see the list with a note instead of the button.
 */
export default function MergeLeadsModal({ group = [], isAr, canMerge, onMerge, onCancel }) {
  const sorted = [...group].sort((a, b) => (leadCreatedMs(a) || Infinity) - (leadCreatedMs(b) || Infinity));
  const [keepId, setKeepId] = useState(sorted[0]?.id);
  const [busy, setBusy] = useState(false);
  const fmt = (l) => {
    const t = leadCreatedMs(l);
    return t ? new Date(t).toLocaleDateString(isAr ? 'ar-EG-u-nu-latn' : 'en-GB') : '—';
  };
  const sourceLabel = (l) => { const s = LEAD_SOURCES.find((x) => x.id === leadSourceKey(l)); return s ? (isAr ? s.ar : s.en) : ''; };

  const merge = async () => {
    if (!canMerge || busy || !keepId) return;
    setBusy(true);
    try {
      await onMerge(keepId, sorted.filter((l) => l.id !== keepId).map((l) => l.id));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="track-modal-backdrop" onClick={onCancel}>
      <div className="property-form-modal-card" role="dialog" aria-modal="true" aria-labelledby="merge-title" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
        <div className="modal-form-header">
          <h3 id="merge-title">{isAr ? `نفس الرقم مسجل ${sorted.length} مرات` : `Same phone on ${sorted.length} leads`}</h3>
          <button type="button" className="drawer-close-btn" onClick={onCancel} aria-label={isAr ? 'إغلاق' : 'Close'}>
            <X size={18} />
          </button>
        </div>
        <p style={{ margin: '0 0 12px', fontSize: 'var(--crm-text-sm)', color: 'var(--crm-muted)' }}>
          {isAr
            ? 'اختار السجل اللي هيفضل. الملاحظات والوسوم وسجل النشاط من الباقي هتتنقل له، والمرحلة الأبعد وأعلى جدية هيتحفظوا، وبعدين السجلات التانية تتمسح.'
            : 'Pick the record to keep. Notes, tags and history from the others move into it, the furthest stage and best score are kept, then the others are deleted.'}
        </p>
        <div className="crm-merge-list" role="radiogroup" aria-label={isAr ? 'السجل اللي هيفضل' : 'Record to keep'}>
          {sorted.map((l) => (
            <label key={l.id} className={`crm-merge-item ${keepId === l.id ? 'is-active' : ''}`}>
              <input type="radio" name="merge-keep" checked={keepId === l.id} onChange={() => setKeepId(l.id)} disabled={!canMerge} />
              <span className="crm-merge-main">
                <strong>{l.name || (isAr ? 'بدون اسم' : 'Unnamed')}</strong>
                <span><bdi dir="ltr">{l.phone || l.whatsapp || '—'}</bdi> · {fmt(l)} · {sourceLabel(l)}</span>
                <span>{(STAGE[l.status || 'new'] || [l.status, l.status])[isAr ? 0 : 1]} · {l.assignedTo && l.assignedTo !== 'Unassigned' ? l.assignedTo : (isAr ? 'بدون مسؤول' : 'Unassigned')}</span>
              </span>
            </label>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center', marginTop: '14px', flexWrap: 'wrap' }}>
          {!canMerge && (
            <span style={{ fontSize: 'var(--crm-text-xs)', color: 'var(--crm-muted)', marginInlineEnd: 'auto' }}>
              {isAr ? 'الدمج للمدير العام بس — بلّغه أو أرشف السجل المكرر.' : 'Only a super admin can merge — tell one, or archive the duplicate.'}
            </span>
          )}
          <button type="button" className="btn btn-outline btn-sm" onClick={onCancel}>{isAr ? 'إغلاق' : 'Close'}</button>
          {canMerge && (
            <button type="button" className="btn btn-primary btn-sm" onClick={merge} disabled={busy}>
              {busy ? (isAr ? 'جاري الدمج…' : 'Merging…') : (isAr ? 'دمج في السجل المختار' : 'Merge into selected')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
