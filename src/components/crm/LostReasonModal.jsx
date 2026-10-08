import { useState } from 'react';
import { X } from 'lucide-react';
import { LOST_REASONS } from '../../utils/crmLeadViews';

/** Asks why a deal was lost before the lead moves to 'lost'; onConfirm({ lostReason, lostNote }) */
export default function LostReasonModal({ lead, isAr, onConfirm, onCancel }) {
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const needsNote = reason === 'other';
  const canSave = reason && (!needsNote || note.trim().length >= 3);

  const submit = (e) => {
    e.preventDefault();
    if (!canSave) return;
    onConfirm({ lostReason: reason, lostNote: note.trim().slice(0, 300) });
  };

  return (
    <div className="track-modal-backdrop" onClick={onCancel}>
      <div
        className="property-form-modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="lost-reason-title"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '460px' }}
      >
        <div className="modal-form-header">
          <div>
            <h3 id="lost-reason-title">{isAr ? 'ليه الصفقة اتخسرت؟' : 'Why was this deal lost?'}</h3>
            {lead?.name && <p style={{ margin: '4px 0 0', fontSize: 'var(--crm-text-sm)', color: 'var(--crm-muted)' }}>{lead.name}</p>}
          </div>
          <button type="button" className="drawer-close-btn" onClick={onCancel} aria-label={isAr ? 'إغلاق' : 'Close'}>
            <X size={18} />
          </button>
        </div>
        <form onSubmit={submit} className="property-cms-form">
          <div className="crm-lost-reasons" role="radiogroup" aria-label={isAr ? 'سبب الخسارة' : 'Lost reason'}>
            {LOST_REASONS.map((r) => (
              <label key={r.id} className={`crm-lost-reason ${reason === r.id ? 'is-active' : ''}`}>
                <input type="radio" name="lost-reason" value={r.id} checked={reason === r.id} onChange={() => setReason(r.id)} />
                <span>{isAr ? r.ar : r.en}</span>
              </label>
            ))}
          </div>
          <div className="form-group-item" style={{ marginTop: '12px' }}>
            <label htmlFor="lost-note">{isAr ? (needsNote ? 'اكتب السبب *' : 'تفاصيل (اختياري)') : (needsNote ? 'Reason *' : 'Details (optional)')}</label>
            <textarea id="lost-note" rows={2} maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '14px' }}>
            <button type="button" className="btn btn-outline btn-sm" onClick={onCancel}>{isAr ? 'إلغاء' : 'Cancel'}</button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={!canSave}>{isAr ? 'تسجيل كصفقة خسرانة' : 'Mark as lost'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
