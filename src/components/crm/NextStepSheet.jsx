import { useId, useState } from 'react';
import { Modal, Button, Input } from '../ui';
import { buildTask, dayKeyFrom, KINDS, PRIORITIES } from '../../utils/tasks';
import { suggestNextStep, composeDue } from '../../utils/nextStep';
import { addTask } from '../../firebaseLazy';

/**
 * «الخطوة الجاية؟» after an outcome: the next task comes pre-filled and has to be saved, or skipped on purpose
 * (onSkip is logged in the client's history). There is no «x»: leaving without choosing is not an option.
 */
export default function NextStepSheet({ lead, outcomeId, me, isAr = true, onSaved, onSkip }) {
  const formId = useId();
  const [s] = useState(() => suggestNextStep(outcomeId));
  const [title, setTitle] = useState(s?.title || '');
  const [kind, setKind] = useState(s?.kind || 'call');
  const [priority, setPriority] = useState(s?.priority || 'normal');
  const [day, setDay] = useState(s?.day || '');
  const [time, setTime] = useState(s?.time || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (!s) return null;

  const dueAt = composeDue(day, time, { needsTime: s.needsTime });
  const save = async (e) => {
    e.preventDefault();
    const task = buildTask({ title, dueAt, priority, kind, lead: { id: lead.id, name: lead.name }, me });
    if (!task) { setError(s.needsTime && !time ? 'حدد ساعة المعاينة' : 'اكتب الخطوة وحدد اليوم'); return; }
    setBusy(true);
    try {
      await addTask(task);
      onSaved?.(task);
    } catch {
      setError('محصلش حفظ للمهمة، جرّب تاني');
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      dismissible={false}
      size="sm"
      title={isAr ? 'الخطوة الجاية؟' : 'What is the next step?'}
      description={lead?.name}
      footer={(
        <>
          <Button variant="secondary" onClick={onSkip} disabled={busy}>{isAr ? 'مفيش خطوة تانية' : 'No next step'}</Button>
          <Button variant="primary" type="submit" form={formId} disabled={busy}>{isAr ? 'احفظ وفكّرني' : 'Save & remind me'}</Button>
        </>
      )}
    >
      <form id={formId} onSubmit={save} className="crm-nextstep">
        <Input label={isAr ? 'الخطوة' : 'Step'} value={title} maxLength={140} onChange={(e) => setTitle(e.target.value)} required />
        <div className="crm-nextstep__row">
          <label className="crm-nextstep__f">
            <span>{isAr ? 'النوع' : 'Type'}</span>
            <select value={kind} onChange={(e) => setKind(e.target.value)}>
              {KINDS.map((k) => <option key={k.id} value={k.id}>{isAr ? k.ar : k.en}</option>)}
            </select>
          </label>
          <label className="crm-nextstep__f">
            <span>{isAr ? 'الأولوية' : 'Priority'}</span>
            <select value={priority} onChange={(e) => setPriority(e.target.value)}>
              {PRIORITIES.map((p) => <option key={p.id} value={p.id}>{isAr ? p.ar : p.en}</option>)}
            </select>
          </label>
        </div>
        <div className="crm-nextstep__row">
          <Input type="date" label={isAr ? 'اليوم' : 'Day'} value={day} min={dayKeyFrom()} onChange={(e) => setDay(e.target.value)} required />
          <Input type="time" label={isAr ? (s.needsTime ? 'الساعة (إلزامي)' : 'الساعة') : 'Time'} value={time} onChange={(e) => setTime(e.target.value)} required={s.needsTime} />
        </div>
        {error && <p className="crm-nextstep__err" role="alert">{error}</p>}
      </form>
    </Modal>
  );
}
