import { useMemo, useState } from 'react';
import { CheckCircle2, Circle, ListChecks } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useTasks } from '../../../hooks/useTasks';
import { TaskForm } from '../TasksPanel';
import { bucketOf, dueLabel, buildTask, dueFromPreset } from '../../../utils/tasks';
import { Badge } from '../../ui';
import TaskDoneFlow from '../TaskDoneFlow';
import { userDisplayName } from '../../../utils/assignees';
import { isSellerLead } from '../../../utils/crmLeadViews';
import { addTask } from '../../../firebaseLazy';

/** The open tasks behind one client, and a quick way to add the next one */
export default function LeadTasks({ lead, isAr, triggerToast, onUpdateLead, title, members = [], canAssign = false, activeRole }) {
  const { currentUser } = useAuth();
  const { tasks } = useTasks();
  const me = useMemo(() => ({
    uid: currentUser?.uid || 'crm-user',
    name: userDisplayName(currentUser) || (isAr ? 'مسؤول المبيعات' : 'Sales Advisor')
  }), [currentUser, isAr]);
  const open = useMemo(() => tasks.filter((t) => String(t.leadId) === String(lead?.id) && t.status !== 'done')
    .sort((a, b) => String(a.dueAt || '9999').localeCompare(String(b.dueAt || '9999'))), [tasks, lead?.id]);
  const [flowTask, setFlowTask] = useState(null);
  const [now] = useState(() => Date.now()); // the drawer is short-lived: the time it opened is fine
  if (!lead?.id) return null;
  // A manager adding a task from a client's file gives it to the person who holds the client (shown in their list)
  const ownerUid = lead.ownerUid && lead.ownerUid !== me.uid && members.some((m) => m.uid === lead.ownerUid) ? lead.ownerUid : '';
  const isSeller = isSellerLead(lead || {}) || lead?.type === 'seller';

  const done = (t) => setFlowTask(t);

  const handleQuickAdd = async (quickTitle, kind = 'call') => {
    const day = dueFromPreset('tomorrow');
    const payload = buildTask({
      title: `${quickTitle} — ${String(lead.name || '').split(' ').slice(0, 2).join(' ')}`,
      dueAt: `${day}T11:00`,
      priority: 'high',
      kind,
      lead: { id: lead.id, name: lead.name },
      assignee: null,
      me
    });
    if (!payload) return;
    const id = await addTask(payload);
    if (id) {
      triggerToast?.(isAr ? `اتضافت المهمة: ${quickTitle}` : 'Task created', 'success');
    }
  };

  return (
    <section className="crm-ld__block" aria-labelledby="crm-ld-tasks">
      <div className="crm-ld__block-head">
        <h3 id="crm-ld-tasks" className="crm-ld__h"><ListChecks size={16} aria-hidden="true" />{title || (isAr ? 'مهام العميل' : 'Client tasks')}</h3>
        {open.length > 0 && <Badge tone="accent">{isAr ? `${open.length} مهام مجدولة` : `${open.length} tasks`}</Badge>}
      </div>
      {open.length > 0 && (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 6 }}>
          {open.map((t) => (
            <li key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button type="button" onClick={() => done(t)} aria-label={isAr ? 'تمّت' : 'Done'} style={{ border: 0, background: 'none', cursor: 'pointer', color: 'var(--ui-text-3)', minWidth: 36, minHeight: 36 }}>
                {bucketOf(t, now) === 'done' ? <CheckCircle2 size={20} aria-hidden="true" /> : <Circle size={20} aria-hidden="true" />}
              </button>
              <span style={{ flex: 1, minWidth: 0, overflowWrap: 'anywhere' }}>
                {t.title}
                {t.assigneeUid !== me.uid && <small style={{ display: 'block', color: 'var(--ui-text-3)' }}>{isAr ? `عند ${t.assigneeName || 'زميل'}${t.seenAt ? ' · شافها' : ' · لسه ما شافهاش'}` : `${t.assigneeName || 'Colleague'}${t.seenAt ? ' · seen' : ' · not seen yet'}`}</small>}
              </span>
              <small style={{ color: bucketOf(t, now) === 'overdue' ? 'var(--ui-danger)' : 'var(--ui-text-3)', whiteSpace: 'nowrap' }}>{dueLabel(t, isAr, now)}</small>
            </li>
          ))}
        </ul>
      )}
      {open.length === 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 }}>
          <span style={{ fontSize: 'var(--crm-text-xs)', color: 'var(--ui-text-3)', fontWeight: 600 }}>
            {isAr ? '⚡ مهام سريعة بنقرة واحدة:' : '⚡ Quick 1-tap tasks:'}
          </span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {isSeller ? (
              <>
                <button
                  type="button"
                  className="ui-btn ui-btn--secondary ui-btn--xs"
                  onClick={() => handleQuickAdd(isAr ? '📞 تأكيد السعر والمساحة' : 'Confirm Price & Size', 'call')}
                >
                  📞 {isAr ? 'تأكيد السعر والمساحة' : 'Confirm Price & Size'}
                </button>
                <button
                  type="button"
                  className="ui-btn ui-btn--secondary ui-btn--xs"
                  onClick={() => handleQuickAdd(isAr ? '📸 طلب صور ومواصفات العقار' : 'Request Photos & Specs', 'whatsapp')}
                >
                  📸 {isAr ? 'طلب صور العقار' : 'Request Photos'}
                </button>
                <button
                  type="button"
                  className="ui-btn ui-btn--secondary ui-btn--xs"
                  onClick={() => handleQuickAdd(isAr ? '📍 تحديد موعد معاينة وتثمين' : 'Schedule Inspection & Valuation', 'visit')}
                >
                  📍 {isAr ? 'تحديد موعد معاينة وتثمين' : 'Schedule Inspection'}
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="ui-btn ui-btn--secondary ui-btn--xs"
                  onClick={() => handleQuickAdd(isAr ? '📞 الاتصال واستكشاف الاحتياج' : 'Call & Discovery', 'call')}
                >
                  📞 {isAr ? 'استكشاف الاحتياج' : 'Call & Discovery'}
                </button>
                <button
                  type="button"
                  className="ui-btn ui-btn--secondary ui-btn--xs"
                  onClick={() => handleQuickAdd(isAr ? '🏠 ترشيح 3 وحدات مطابقة' : 'Send 3 Matched Units', 'whatsapp')}
                >
                  🏠 {isAr ? 'ترشيح 3 وحدات' : 'Send Matches'}
                </button>
                <button
                  type="button"
                  className="ui-btn ui-btn--secondary ui-btn--xs"
                  onClick={() => handleQuickAdd(isAr ? '📅 حجز موعد معاينة ميدانية' : 'Book Viewing', 'visit')}
                >
                  📅 {isAr ? 'حجز موعد معاينة' : 'Book Viewing'}
                </button>
              </>
            )}
          </div>
        </div>
      )}
      {flowTask && <TaskDoneFlow key={flowTask.id} task={flowTask} lead={lead} me={me} isAr={isAr} onUpdateLead={onUpdateLead} triggerToast={triggerToast} onClose={() => setFlowTask(null)} activeRole={activeRole} />}
      <TaskForm key={lead.id} isAr={isAr} me={me} members={members} canAssign={canAssign} defaultAssigneeUid={ownerUid} lead={{ id: lead.id, name: lead.name }} triggerToast={triggerToast} compact />
    </section>
  );
}
