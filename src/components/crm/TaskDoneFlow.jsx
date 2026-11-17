import { useMemo, useState } from 'react';
import { Modal, Button, Select } from '../ui';
import { useTasks } from '../../hooks/useTasks';
import { updateTask } from '../../firebaseLazy';
import { completion } from '../../utils/tasks';
import { suggestNextStep, SKIP_LOG } from '../../utils/nextStep';
import { OUTCOMES, STAGE_RULES, outcomeEntry, outcomeSave, outcomeById } from '../../utils/stageGate';
import { LOST_REASONS } from '../../utils/crmLeadViews';
import { scheduleNextAttempt } from '../../utils/retryCall';
import NextStepSheet from './NextStepSheet';

const NEEDS_OUTCOME = new Set(['call', 'whatsapp', 'visit']);

/**
 * Ticking a task off is not the end of it: a call, message or viewing asks «حصل إيه؟» (the answer is logged in the
 * client's history and moves his stage), and when nothing else is planned for him the next step must be set (or
 * skipped on purpose). The task stays open until the first part is answered, so a tick never leaves a client with
 * neither a result nor a next action.
 */
export default function TaskDoneFlow({ task, lead, me, isAr = true, onUpdateLead, triggerToast, onClose }) {
  const { tasks } = useTasks();
  const needsOutcome = NEEDS_OUTCOME.has(task.kind);
  const [step, setStep] = useState(needsOutcome ? 'outcome' : 'closing');
  const [outcomeId, setOutcomeId] = useState('');
  const [negative, setNegative] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const otherOpen = useMemo(() => tasks.some((t) => String(t.leadId) === String(lead.id) && t.id !== task.id && t.status !== 'done'), [tasks, lead.id, task.id]);
  const options = useMemo(() => (STAGE_RULES.find((s) => s.id === (lead.status || 'new'))?.outcomes || []).map((id) => OUTCOMES.find((o) => o.id === id)).filter(Boolean), [lead.status]);

  const finish = async (id, extra = {}) => {
    setBusy(true);
    const at = new Date().toISOString();
    const taskLine = { timestamp: at, action: `${isAr ? 'أنجز مهمة' : 'Task done'}: ${task.title}`, ...(me.name ? { agent: me.name } : {}) };
    let patch;
    if (id) {
      const entry = outcomeEntry(id, me, extra);
      const base = entry && outcomeSave(lead, entry);
      if (!base) { setBusy(false); return; }
      patch = { ...base, activityLogs: [taskLine, ...base.activityLogs].slice(0, 100) };
    } else {
      patch = { lastActivityAt: at, activityLogs: [taskLine, ...(Array.isArray(lead.activityLogs) ? lead.activityLogs : [])].slice(0, 100) };
    }
    if (!(await updateTask(task.id, completion(me)))) { triggerToast?.(isAr ? 'ماتحدّثتش، جرّب تاني' : 'Not updated', 'error'); setBusy(false); return; }
    onUpdateLead?.(lead.id, patch, lead.version);
    setOutcomeId(id);
    setBusy(false);
    if (id === 'no_answer') {
      scheduleNextAttempt({ id: lead.id, name: lead.name }, patch.outcomeAttempts, me).then((t) => { if (t) triggerToast?.(isAr ? 'اتضافت مهمة المحاولة الجاية' : 'Next attempt added', 'info'); });
      onClose();
      return;
    }
    if (otherOpen || !suggestNextStep(id || 'task_done')) { onClose(); return; }
    setStep('next');
  };

  const skip = () => {
    const at = new Date().toISOString();
    onUpdateLead?.(lead.id, { activityLogs: [{ timestamp: at, action: SKIP_LOG, kind: 'note', ...(me.name ? { agent: me.name } : {}) }, ...(Array.isArray(lead.activityLogs) ? lead.activityLogs : [])].slice(0, 100) }, lead.version);
    onClose();
  };

  if (step === 'next') {
    return (
      <NextStepSheet
        lead={lead}
        outcomeId={outcomeId || 'task_done'}
        me={me}
        isAr={isAr}
        onSaved={(t) => { triggerToast?.(isAr ? `اتضافت الخطوة الجاية: ${t.title}` : 'Next step saved', 'success'); onClose(); }}
        onSkip={skip}
      />
    );
  }

  if (step === 'closing') {
    return (
      <Modal open onClose={onClose} size="sm" title={isAr ? 'تقفل المهمة؟' : 'Complete this task?'} description={task.title} closeLabel={isAr ? 'إغلاق' : 'Close'}
        footer={(<><Button variant="secondary" onClick={onClose} disabled={busy}>{isAr ? 'إلغاء' : 'Cancel'}</Button><Button onClick={() => finish('')} disabled={busy}>{isAr ? 'تمّت' : 'Done'}</Button></>)}
      >
        <p>{isAr ? `هتتسجل في ملف ${lead.name || 'العميل'}${otherOpen ? '' : '، وبعدها هتحدد الخطوة الجاية'}.` : 'It is logged in the client file.'}</p>
      </Modal>
    );
  }

  return (
    <Modal open onClose={onClose} size="sm" title={isAr ? 'حصل إيه؟' : 'What happened?'} description={`${task.title} — ${lead.name || ''}`} closeLabel={isAr ? 'إلغاء' : 'Cancel'}>
      <div className="crm-ld__row">
        {options.map((o) => (
          <Button key={o.id} variant={o.kind === 'negative' ? 'ghost' : 'secondary'} size="sm" disabled={busy}
            onClick={() => (o.kind === 'negative' ? (setNegative(o.id), setReason('')) : finish(o.id))}>{o.ar}</Button>
        ))}
      </div>
      {negative && (
        <form className="crm-ld__form" onSubmit={(e) => { e.preventDefault(); if (reason) finish(negative, { reason }); }}>
          <Select label={`${outcomeById(negative)?.ar}: ${isAr ? 'السبب' : 'reason'}`} required value={reason} onChange={(e) => setReason(e.target.value)}
            placeholder={isAr ? 'اختار السبب' : 'Choose a reason'} options={LOST_REASONS.map((r) => ({ value: r.id, label: r.ar }))} />
          <Button type="submit" size="sm" disabled={!reason || busy}>{isAr ? 'سجّل وأقفل المهمة' : 'Log and complete'}</Button>
        </form>
      )}
    </Modal>
  );
}
