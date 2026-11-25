import { useEffect, useRef } from 'react';
import { useTasks } from '../../hooks/useTasks';
import { dueReminders } from '../../utils/nextStep';
import { dueLabel, newAssignmentsFor } from '../../utils/tasks';

const KEY = 'crm_task_reminded';
const read = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; } };
const write = (m) => { try { localStorage.setItem(KEY, JSON.stringify(m)); } catch { /* private mode */ } };

const playChime = () => {
  try {
    if (typeof window === 'undefined') return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch { /* audio autoplay restriction */ }
};

/**
 * Reminds the signed-in person of their own tasks shortly BEFORE they are due: a toast while the CRM is open,
 * plus a browser notification when the tab is in the background. Each task+due value is announced once.
 */
export default function TaskReminders({ uid, triggerToast }) {
  const { tasks, ready } = useTasks();
  const ref = useRef({ tasks, triggerToast });
  useEffect(() => { ref.current = { tasks, triggerToast }; });

  // A colleague gives this person a task while the CRM is open: say so once (what was already there at the start is not news)
  const known = useRef(null);
  useEffect(() => {
    if (!uid || !ready) return;
    const mine = newAssignmentsFor(tasks, uid);
    if (known.current === null) { known.current = new Set(mine.map((t) => t.id)); return; }
    for (const t of mine) {
      if (known.current.has(t.id)) continue;
      known.current.add(t.id);
      const text = `${t.title}${t.leadName ? ` — ${t.leadName}` : ''} (${dueLabel(t, true)})`;
      playChime();
      triggerToast?.(`${t.createdByName || 'زميلك'} كلّفك بمهمة: ${text}`, 'info');
      try {
        if (typeof document !== 'undefined' && document.hidden && 'Notification' in window && Notification.permission === 'granted') {
          new Notification(`كلّفك ${t.createdByName || 'زميلك'} بمهمة`, { body: text, tag: `assigned-${t.id}` });
        }
      } catch { /* not allowed here */ }
    }
  }, [tasks, ready, uid, triggerToast]);

  useEffect(() => {
    if (!uid) return undefined;
    const tick = () => {
      const { tasks: all, triggerToast: toast } = ref.current;
      const reminded = read();
      const due = dueReminders(all, uid, Date.now(), reminded);
      if (!due.length) return;
      playChime();
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
