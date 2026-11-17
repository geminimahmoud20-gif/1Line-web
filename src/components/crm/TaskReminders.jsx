import { useEffect, useRef } from 'react';
import { useTasks } from '../../hooks/useTasks';
import { dueReminders } from '../../utils/nextStep';
import { dueLabel } from '../../utils/tasks';

const KEY = 'crm_task_reminded';
const read = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; } };
const write = (m) => { try { localStorage.setItem(KEY, JSON.stringify(m)); } catch { /* private mode */ } };

/**
 * Reminds the signed-in person of their own tasks shortly BEFORE they are due: a toast while the CRM is open,
 * plus a browser notification when the tab is in the background. Each task+due value is announced once.
 */
export default function TaskReminders({ uid, triggerToast }) {
  const { tasks } = useTasks();
  const ref = useRef({ tasks, triggerToast });
  useEffect(() => { ref.current = { tasks, triggerToast }; });

  useEffect(() => {
    if (!uid) return undefined;
    const tick = () => {
      const { tasks: all, triggerToast: toast } = ref.current;
      const reminded = read();
      const due = dueReminders(all, uid, Date.now(), reminded);
      if (!due.length) return;
      for (const t of due.slice(0, 3)) {
        const text = `${t.title}${t.leadName ? ` — ${t.leadName}` : ''} (${dueLabel(t, true)})`;
        toast?.(`تذكير: ${text}`, 'info');
        try {
          if (typeof document !== 'undefined' && document.hidden && 'Notification' in window && Notification.permission === 'granted') {
            new Notification('تذكير بمهمة', { body: text, tag: `task-${t.id}` });
          }
        } catch { /* not allowed here */ }
        reminded[t.id] = t.dueAt;
      }
      for (const t of due.slice(3)) reminded[t.id] = t.dueAt;
      // keep the memory small: only ids still open
      const open = new Set(all.map((t) => t.id));
      for (const id of Object.keys(reminded)) if (!open.has(id)) delete reminded[id];
      write(reminded);
    };
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, [uid]);

  return null;
}
