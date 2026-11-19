import { useId, useState } from 'react';
import { REJECT_REASONS, rejectionText } from '../../utils/listingMeta';
import { Modal, Button, Textarea } from '../ui';

/**
 * Sends a listing back: asks why, says who it goes back to and that they are told, and only then rejects.
 * onConfirm(text): the reason as the team will read it.
 */
export default function RejectListingModal({ property, submitterName = '', isAr = true, onConfirm, onCancel }) {
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const formId = useId();
  const text = rejectionText(reason, note);
  const L = (ar, en) => (isAr ? ar : en);
  const title = property?.title_ar || property?.title_en || String(property?.id || '');

  return (
    <Modal
      open
      onClose={onCancel}
      size="sm"
      title={L('ترفض العقار ده؟', 'Reject this listing?')}
      description={title}
      closeLabel={L('إغلاق', 'Close')}
      footer={(
        <>
          <Button variant="secondary" onClick={onCancel}>{L('إلغاء', 'Cancel')}</Button>
          <Button variant="danger" type="submit" form={formId} disabled={!text}>{L('ارفض وابعت السبب', 'Reject and send the reason')}</Button>
        </>
      )}
    >
      <form id={formId} onSubmit={(e) => { e.preventDefault(); if (text) onConfirm(text); }}>
        <p className="crm-lost-hint">
          {submitterName
            ? L(`العقار هيرجع لـ ${submitterName} (اللي رفعه) ومش هيظهر على الموقع، وهيوصله إشعار بالرفض والسبب. بعد ما يعدّله ويحفظه بيرجعلك للموافقة.`, `It goes back to ${submitterName}, who is notified with the reason.`)
            : L('العقار مش هيظهر على الموقع. مفيش حد مسجّل إنه رفعه (عقار قديم)، فمفيش إشعار هيتبعت: كلّم المسؤول عنه بنفسك.', 'It stays off the site. Nobody is recorded as its author, so no notice is sent.')}
        </p>
        <div className="crm-lost-reasons" role="radiogroup" aria-label={L('سبب الرفض', 'Reason')}>
          {REJECT_REASONS.map((r) => (
            <label key={r.id} className={`crm-lost-reason ${reason === r.id ? 'is-active' : ''}`}>
              <input type="radio" name="reject-reason" value={r.id} checked={reason === r.id} onChange={() => setReason(r.id)} />
              <span>{isAr ? r.ar : r.en}</span>
            </label>
          ))}
        </div>
        <Textarea
          className="crm-lost-note"
          label={reason === 'other' ? L('اكتب السبب', 'Reason') : L('توضيح للمسؤول (اختياري)', 'Details (optional)')}
          required={reason === 'other'}
          rows={2}
          maxLength={200}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </form>
    </Modal>
  );
}
