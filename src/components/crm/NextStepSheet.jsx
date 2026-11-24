import { useId, useState, useMemo } from 'react';
import { localDayKey } from '../../utils/crmLeadViews';
import { Modal, Button, Input, Select } from '../ui';
import { buildTask, dayKeyFrom, KINDS, PRIORITIES } from '../../utils/tasks';
import { suggestNextStep, composeDue } from '../../utils/nextStep';
import { isSellerLead } from '../../utils/crmLeadViews';
import { addTask } from '../../firebaseLazy';

/**
 * «الخطوة الجاية؟» after an outcome: the next task comes pre-filled and has to be saved, or skipped on purpose
 * (onSkip is logged in the client's history). Can also be closed cleanly via `onClose`.
 */
export default function NextStepSheet({ lead, outcomeId, me, isAr = true, onSaved, onSkip, onClose }) {
  const formId = useId();
  const isSeller = isSellerLead(lead || {}) || lead?.type === 'seller';
  const [s] = useState(() => suggestNextStep(outcomeId, Date.now(), isSeller));
  const [title, setTitle] = useState(s?.title || '');
  const [kind, setKind] = useState(s?.kind || 'call');
  const [priority, setPriority] = useState(s?.priority || 'normal');
  const [day, setDay] = useState(s?.day || '');
  const [time, setTime] = useState(s?.time || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (!s) return null;

  const handleClose = () => {
    if (onClose) onClose();
    else if (onSkip) onSkip();
  };

  const dueAt = composeDue(day, time, { needsTime: s.needsTime });
  const save = async (e) => {
    e.preventDefault();

    // Validate: date must be today or later
    const selectedDayKey = day ? localDayKey(day) : '';
    const todayKey = localDayKey();
    if (selectedDayKey && selectedDayKey < todayKey) {
      setError(isAr ? 'تاريخ المهمة يجب أن يكون اليوم أو تاريخاً لاحقاً' : 'Task date must be today or later');
      return;
    }

    const task = buildTask({ title, dueAt, priority, kind, lead: { id: lead.id, name: lead.name }, me });
    if (!task) { setError(s.needsTime && !time ? (isAr ? 'حدد ساعة المعاينة' : 'Please specify time') : (isAr ? 'اكتب الخطوة وحدد اليوم' : 'Please write task and set day')); return; }
    setBusy(true);
    try {
      await addTask(task);
      onSaved?.(task);
    } catch {
      setError(isAr ? 'محصلش حفظ للمهمة، جرّب تاني' : 'Failed to save task');
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      dismissible
      onClose={handleClose}
      closeLabel={isAr ? 'إغلاق' : 'Close'}
      size="sm"
      title={isAr ? 'الخطوة الجاية؟' : 'What is the next step?'}
      description={lead?.name ? `${isAr ? 'للعميل: ' : 'For: '}${lead.name}` : ''}
      footer={(
        <div style={{ display: 'flex', gap: '8px', width: '100%', justifyContent: 'flex-start' }}>
          <Button variant="primary" type="submit" form={formId} disabled={busy}>
            {isAr ? 'حفظ المهمة ومتابعة' : 'Save & remind me'}
          </Button>
          <Button variant="secondary" onClick={onSkip} disabled={busy}>
            {isAr ? 'تخطي بدون مهمة' : 'No next step'}
          </Button>
        </div>
      )}
    >
      <form id={formId} onSubmit={save} className="crm-nextstep">
        <Input
          label={isAr ? 'الخطوة المطلوبة' : 'Step'}
          value={title}
          maxLength={140}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <div className="crm-nextstep__row">
          <Select
            label={isAr ? 'نوع المهمة' : 'Type'}
            value={kind}
            onChange={(e) => setKind(e.target.value)}
            options={KINDS.map((k) => ({ value: k.id, label: isAr ? k.ar : k.en }))}
          />
          <Select
            label={isAr ? 'درجة الأولوية' : 'Priority'}
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            options={PRIORITIES.map((p) => ({ value: p.id, label: isAr ? p.ar : p.en }))}
          />
        </div>
        <div className="crm-nextstep__row">
          <Input
            type="date"
            label={isAr ? 'تاريخ التنفيذ' : 'Day'}
            value={day}
            min={dayKeyFrom()}
            onChange={(e) => setDay(e.target.value)}
            required
          />
          <Input
            type="time"
            label={isAr ? (s.needsTime ? 'الساعة (مطلوب للمعاينات)' : 'الساعة') : 'Time'}
            value={time}
            onChange={(e) => setTime(e.target.value)}
            required={s.needsTime}
          />
        </div>
        {error && <p className="crm-nextstep__err" role="alert">{error}</p>}
      </form>
    </Modal>
  );
}
