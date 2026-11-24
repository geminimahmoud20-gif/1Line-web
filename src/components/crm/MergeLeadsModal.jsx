import { useState } from 'react';
import { X } from 'lucide-react';
import { leadCreatedMs, leadSourceKey, LEAD_SOURCES, isSellerLead, leadBudget } from '../../utils/crmLeadViews';
import { getAreaDisplayName } from '../../pages/ClientAccountPageData';

const STAGE = { new: ['عميل محتمل', 'Lead'], contacted: ['مؤهل', 'Qualified'], site_visit: ['اجتماع / معاينة', 'Meeting / viewing'], negotiating: ['تفاوض', 'Negotiation'], closing: ['إغلاق (توقيع وحجز)', 'Closing'], closed: ['إغلاق', 'Closed'], lost: ['خسارة', 'Lost'], inactive: ['غير متفاعل', 'Unresponsive'] };

/**
 * Same phone on several leads: pick the record to keep, the others are folded into it and deleted.
 * Deleting is admin-only in the rules, so other roles see the list with a note instead of the button.
 *
 * When every lead in the group is a seller/owner submission, a second "sell" form is not always the
 * same resubmission — it can be a genuinely different unit from the same owner or broker. So that case
 * asks first: same unit (go on to merge) or a different unit (leave both, never ask about this pair again).
 */
export default function MergeLeadsModal({ group = [], isAr, canMerge, onMerge, onDismiss, onCancel }) {
  const sorted = [...group].sort((a, b) => (leadCreatedMs(a) || Infinity) - (leadCreatedMs(b) || Infinity));
  const allSellers = sorted.length > 0 && sorted.every(isSellerLead);
  const [askedUnit, setAskedUnit] = useState(!allSellers);
  const [keepId, setKeepId] = useState(sorted[0]?.id);
  const [busy, setBusy] = useState(false);
  const fmt = (l) => {
    const t = leadCreatedMs(l);
    return t ? new Date(t).toLocaleDateString(isAr ? 'ar-EG-u-nu-latn' : 'en-GB') : '—';
  };
  const sourceLabel = (l) => { const s = LEAD_SOURCES.find((x) => x.id === leadSourceKey(l)); return s ? (isAr ? s.ar : s.en) : ''; };
  const unitLine = (l) => {
    const area = getAreaDisplayName(l.details?.area || l.area || '', isAr ? 'ar' : 'en');
    const price = leadBudget(l);
    return [area, price > 0 ? `${price.toLocaleString('en-US')} ${isAr ? 'ج.م' : 'EGP'}` : ''].filter(Boolean).join(' · ');
  };

  const merge = async () => {
    if (!canMerge || busy || !keepId) return;
    setBusy(true);
    try {
      await onMerge(keepId, sorted.filter((l) => l.id !== keepId).map((l) => l.id));
    } finally {
      setBusy(false);
    }
  };

  const dismiss = async () => {
    if (busy || !onDismiss) return;
    setBusy(true);
    try {
      await onDismiss(sorted.map((l) => l.id));
    } finally {
      setBusy(false);
    }
  };

  // All of them are sell/owner requests: ask first whether this is one unit or several, before picking
  // which record to keep. "Different units" never merges — it just stops asking about this exact group.
  if (!askedUnit) {
    return (
      <div className="track-modal-backdrop" onClick={onCancel}>
        <div className="property-form-modal-card" role="dialog" aria-modal="true" aria-labelledby="dup-unit-title" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
          <div className="modal-form-header">
            <h3 id="dup-unit-title">{isAr ? 'نفس الرقم، بس هو نفس العرض؟' : 'Same phone — but the same listing?'}</h3>
            <button type="button" className="drawer-close-btn" onClick={onCancel} aria-label={isAr ? 'إغلاق' : 'Close'}>
              <X size={18} />
            </button>
          </div>
          <p style={{ margin: '0 0 12px', fontSize: 'var(--crm-text-sm)', color: 'var(--crm-muted)' }}>
            {isAr
              ? 'نفس المالك أو الوسيط ممكن يبعت أكتر من عرض لوحدات مختلفة. قبل الدمج، قارن التفاصيل:'
              : "The same owner or broker can list more than one unit. Compare the details before merging:"}
          </p>
          <div className="crm-merge-list">
            {sorted.map((l) => (
              <div key={l.id} className="crm-merge-item">
                <span className="crm-merge-main">
                  <strong>{l.name || (isAr ? 'بدون اسم' : 'Unnamed')}</strong>
                  <span>{unitLine(l) || (isAr ? 'مفيش تفاصيل وحدة متسجّلة' : 'No unit details on file')}</span>
                  <span>{fmt(l)} · {sourceLabel(l)}</span>
                </span>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center', marginTop: '14px', flexWrap: 'wrap' }}>
            <button type="button" className="btn btn-outline btn-sm" onClick={onCancel}>{isAr ? 'إغلاق' : 'Close'}</button>
            {onDismiss && (
              <button type="button" className="btn btn-outline btn-sm" onClick={dismiss} disabled={busy}>
                {busy ? (isAr ? 'جاري الحفظ…' : 'Saving…') : (isAr ? 'لأ، دي وحدة تانية لنفس العميل' : "No, it's a different unit")}
              </button>
            )}
            <button type="button" className="btn btn-primary btn-sm" onClick={() => setAskedUnit(true)}>
              {isAr ? 'آه، نفس الوحدة — كمّل الدمج' : 'Yes, same unit — continue'}
            </button>
          </div>
        </div>
      </div>
    );
  }

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
