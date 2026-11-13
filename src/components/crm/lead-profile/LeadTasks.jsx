import { useMemo, useState } from 'react';
import { CheckCircle2, Circle, ListChecks } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useTasks } from '../../../hooks/useTasks';
import { updateTask } from '../../../firebaseLazy';
import { TaskForm } from '../TasksPanel';
import { bucketOf, completion, dueLabel } from '../../../utils/tasks';
import { Badge } from '../../ui';

/** The open tasks behind one client, and a quick way to add the next one */
export default function LeadTasks({ lead, isAr, triggerToast, onUpdateLead }) {
  const { currentUser } = useAuth();
  const { tasks } = useTasks();
  const me = useMemo(() => ({ uid: currentUser?.uid, name: currentUser?.displayName || currentUser?.name || currentUser?.email?.split('@')[0] || '' }), [currentUser]);
  const open = useMemo(() => tasks.filter((t) => String(t.leadId) === String(lead?.id) && t.status !== 'done')
    .sort((a, b) => String(a.dueAt || '9999').localeCompare(String(b.dueAt || '9999'))), [tasks, lead?.id]);
  const [now] = useState(() => Date.now()); // the drawer is short-lived: the time it opened is fine
  if (!lead?.id || !me.uid) return null;

  const done = async (t) => {
    if (!(await updateTask(t.id, completion(me)))) { triggerToast?.(isAr ? 'ماتحدّثتش، جرّب تاني' : 'Not updated', 'error'); return; }
    const at = new Date().toISOString();
    onUpdateLead?.(lead.id, { lastActivityAt: at, activityLogs: [{ timestamp: at, action: `${isAr ? 'أنجز مهمة' : 'Task done'}: ${t.title}` }, ...(lead.activityLogs || [])] }, lead.version);
  };

  return (
    <section className="crm-ld__block" aria-labelledby="crm-ld-tasks">
      <div className="crm-ld__block-head">
        <h3 id="crm-ld-tasks" className="crm-ld__h"><ListChecks size={16} aria-hidden="true" />{isAr ? 'مهام العميل' : 'Client tasks'}</h3>
        {open.length > 0 && <Badge tone="accent">{open.length}</Badge>}
      </div>
      {open.length > 0 && (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 6 }}>
          {open.map((t) => (
            <li key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button type="button" onClick={() => done(t)} aria-label={isAr ? 'تمّت' : 'Done'} style={{ border: 0, background: 'none', cursor: 'pointer', color: 'var(--ui-text-3)', minWidth: 36, minHeight: 36 }}>
                {bucketOf(t, now) === 'done' ? <CheckCircle2 size={20} aria-hidden="true" /> : <Circle size={20} aria-hidden="true" />}
              </button>
              <span style={{ flex: 1, minWidth: 0, overflowWrap: 'anywhere' }}>{t.title}</span>
              <small style={{ color: bucketOf(t, now) === 'overdue' ? 'var(--ui-danger)' : 'var(--ui-text-3)', whiteSpace: 'nowrap' }}>{dueLabel(t, isAr, now)}</small>
            </li>
          ))}
        </ul>
      )}
      <TaskForm isAr={isAr} me={me} lead={{ id: lead.id, name: lead.name }} triggerToast={triggerToast} compact />
    </section>
  );
}
