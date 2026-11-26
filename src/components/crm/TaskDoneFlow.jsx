import { useMemo, useState } from 'react';
import { Modal, Button, Select } from '../ui';
import { useTasks } from '../../hooks/useTasks';
import { updateTask, addTask } from '../../firebaseLazy';
import { completion, parseTaskNote, nextRecurringDue, buildTask } from '../../utils/tasks';
import { suggestNextStep, SKIP_LOG } from '../../utils/nextStep';
import { OUTCOMES, STAGE_RULES, outcomeEntry, outcomeSave, outcomeById, guardStage } from '../../utils/stageGate';
import { lostReasonsFor, isSellerLead } from '../../utils/crmLeadViews';
import { scheduleNextAttempt } from '../../utils/retryCall';
import { validateStageTransition, handoffToCrmTask } from '../../services/stateMachineEngine';
import NextStepSheet from './NextStepSheet';

const SELLER_OUTCOME_LABELS = {
  reached: 'تم التواصل مع المالك',
  interested: 'أكّد الرغبة في البيع والسعر',
  viewing_set: 'تحديد موعد معاينة وتثمين',
  viewing_done: 'تمت معاينة العقار وتصويره',
  offer: 'تقديم عرض شراء للمالك',
  agreed: 'الاتفاق على السعر وعقد البيع',
  callback: 'طلب مهلة / كلّمني بعدين',
  no_answer: 'لم يرد',
  not_fit: 'غير مناسب / صرف نظر',
  wrong_number: 'رقم غلط'
};

const NEEDS_OUTCOME = new Set(['call', 'whatsapp', 'visit']);

/**
 * Ticking a task off is not the end of it: a call, message or viewing asks «حصل إيه؟» (the answer is logged in the
 * client's history and moves his stage), and when nothing else is planned for him the next step must be set (or
 * skipped on purpose). The task stays open until the first part is answered, so a tick never leaves a client with
 * neither a result nor a next action.
 */
export default function TaskDoneFlow({ task, lead, me, isAr = true, onUpdateLead, triggerToast, onClose, activeRole, isManager = false }) {
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
      const base = entry && outcomeSave(lead, entry, { lose: extra.lose });
      if (!base) { setBusy(false); return; }
      patch = { ...base, activityLogs: [taskLine, ...base.activityLogs].slice(0, 100) };
    } else {
      patch = { lastActivityAt: at, activityLogs: [taskLine, ...(Array.isArray(lead.activityLogs) ? lead.activityLogs : [])].slice(0, 100) };
    }
    if (!(await updateTask(task.id, completion(me)))) { triggerToast?.(isAr ? 'ماتحدّثتش، جرّب تاني' : 'Not updated', 'error'); setBusy(false); return; }
    onUpdateLead?.(lead.id, patch, lead.version);
    setOutcomeId(id);
    setBusy(false);

    // Schedule next recurring task if defined
    const parsed = parseTaskNote(task.note);
    if (parsed.recurrence && parsed.recurrence !== 'none') {
      const nextDue = nextRecurringDue(task.dueAt, parsed.recurrence);
      const nextPayload = buildTask({
        title: task.title,
        note: task.note,
        dueAt: nextDue,
        priority: task.priority,
        kind: task.kind,
        lead: task.leadId ? { id: task.leadId, name: task.leadName } : null,
        assignee: { uid: task.assigneeUid, name: task.assigneeName },
        me
      });
      if (nextPayload) {
        addTask(nextPayload).then((newId) => {
          if (newId) triggerToast?.(isAr ? 'تمت جدولة التكرار القادم للمهمة تلقائياً' : 'Next recurring task scheduled', 'info');
        });
      }
    }

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

  // Validates and builds the stage-change patch shared by onSaved/onStageOnly; null (and a toast) if the gate blocks it
  const applyStageChange = (newStage, meta = {}) => {
    const stagePatch = { status: newStage, ...(newStage === 'lost' ? { lostReason: meta.lostReason || 'other' } : {}) };
    if (!guardStage(lead, stagePatch, { role: activeRole, isManager, toast: triggerToast })) return null;

    const validation = validateStageTransition(lead, newStage, {
      userRole: activeRole,
      lostReason: meta.lostReason || (newStage === 'lost' ? 'other' : undefined),
      isFounderApproved: lead.isFounderApproved || activeRole === 'super_admin'
    });
    if (!validation.allowed) {
      triggerToast?.(validation.missingDeliverable, 'error');
      return null;
    }
    if (validation.nextTask) {
      const crmTask = handoffToCrmTask(validation.nextTask, lead, me);
      if (crmTask) addTask(crmTask).catch(() => {});
    }

    return {
      status: newStage,
      _bypassGate: true,
      _forceStage: true,
      lastActivityAt: new Date().toISOString(),
      ...(validation.nextTask ? { latestHandoffTask: validation.nextTask } : {}),
      ...(newStage === 'lost' ? { lostReason: meta.lostReason || 'other', lostNote: meta.lostNote || '', lostAt: new Date().toISOString() } : {}),
      ...(meta.note ? { notes: `[${meta.channel || 'تواصل'}] ${meta.note}\n${lead.notes || ''}` } : {})
    };
  };

  if (step === 'next') {
    return (
      <NextStepSheet
        lead={lead}
        outcomeId={outcomeId || 'task_done'}
        me={me}
        isAr={isAr}
        onSaved={(t, meta = {}) => {
          if (meta.newStage && meta.newStage !== lead.status) {
            const patch = applyStageChange(meta.newStage, meta);
            if (!patch) return;
            onUpdateLead?.(lead.id, patch, lead.version);
          }
          triggerToast?.(isAr ? `اتضافت الخطوة الجاية: ${t?.title || 'مهمة'}` : 'Next step saved', 'success');
          onClose();
        }}
        onStageOnly={(newStage, meta = {}) => {
          if (newStage && newStage !== lead.status) {
            const patch = applyStageChange(newStage, meta);
            if (!patch) return;
            onUpdateLead?.(lead.id, patch, lead.version);
            triggerToast?.(isAr ? 'تم تحديث مرحلة العميل بنجاح' : 'Stage updated successfully', 'success');
          }
          onClose();
        }}
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
        {options.map((o) => {
          const isSeller = isSellerLead(lead || {}) || lead?.type === 'seller';
          const label = isSeller && isAr && SELLER_OUTCOME_LABELS[o.id] ? SELLER_OUTCOME_LABELS[o.id] : o.ar;
          return (
            <Button key={o.id} variant="secondary" size="sm" disabled={busy}
              onClick={() => (o.kind === 'negative' ? (setNegative(o.id), setReason('')) : finish(o.id))}>{label}</Button>
          );
        })}
        <Button variant="ghost" size="sm" disabled={busy} onClick={() => finish('')}>
          {isAr ? 'إتمام المهمة فقط' : 'Complete task only'}
        </Button>
      </div>
      {negative && (
        <form className="crm-ld__form" onSubmit={(e) => { e.preventDefault(); if (reason) finish(negative, { reason, lose: true }); }}>
          <Select label={`${outcomeById(negative)?.ar}: ${isAr ? 'السبب' : 'reason'}`} required value={reason} onChange={(e) => setReason(e.target.value)}
            placeholder={isAr ? 'اختار السبب' : 'Choose a reason'} options={lostReasonsFor(lead).map((r) => ({ value: r.id, label: r.ar }))} />
          <div className="crm-ld__row">
            <Button type="submit" size="sm" disabled={!reason || busy}>{isAr ? 'سجّل وانقله لخسارة' : 'Log and mark as lost'}</Button>
            <Button type="button" variant="secondary" size="sm" disabled={!reason || busy} onClick={() => finish(negative, { reason })}>{isAr ? 'سجّل وسيبه في مرحلته' : 'Log only'}</Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
