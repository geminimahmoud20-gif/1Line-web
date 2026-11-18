import { useId, useState } from 'react';
import { LOST_REASONS } from '../../utils/crmLeadViews';
import { Modal, Button, Textarea } from '../ui';

/** Asks why a deal was lost before the lead moves to 'lost'; onConfirm({ lostReason, lostNote }) */
export default function LostReasonModal({ lead, isAr, onConfirm, onCancel }) {
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const formId = useId();
  const needsNote = reason === 'other';
  const canSave = reason && (!needsNote || note.trim().length >= 3);

  const submit = (e) => {
    e.preventDefault();
    if (!canSave) return;
    onConfirm({ lostReason: reason, lostNote: note.trim().slice(0, 300) });
  };

  return (
    <Modal
      open
      onClose={onCancel}
      size="sm"
      title={isAr ? 'ليه الصفقة اتخسرت؟' : 'Why was this deal lost?'}
      description={lead?.name}
      closeLabel={isAr ? 'إغلاق' : 'Close'}
      footer={(
        <>
          <Button variant="secondary" onClick={onCancel}>{isAr ? 'إلغاء' : 'Cancel'}</Button>
          <Button variant="danger" type="submit" form={formId} disabled={!canSave}>{isAr ? 'سجّلها خسرانة' : 'Mark as lost'}</Button>
        </>
      )}
    >
      <form id={formId} onSubmit={submit}>
        <div className="crm-lost-reasons" role="radiogroup" aria-label={isAr ? 'سبب الخسارة' : 'Lost reason'}>
          {LOST_REASONS.map((r) => (
            <label key={r.id} className={`crm-lost-reason ${reason === r.id ? 'is-active' : ''}`}>
              <input type="radio" name="lost-reason" value={r.id} checked={reason === r.id} onChange={() => setReason(r.id)} />
              <span>{isAr ? r.ar : r.en}</span>
            </label>
          ))}
        </div>
        <Textarea
          className="crm-lost-note"
          label={isAr ? (needsNote ? 'اكتب السبب' : 'تفاصيل (اختياري)') : (needsNote ? 'Reason' : 'Details (optional)')}
          required={needsNote}
          rows={2}
          maxLength={300}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </form>
    </Modal>
  );
}
