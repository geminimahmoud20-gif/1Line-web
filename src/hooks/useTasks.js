import { useEffect, useSyncExternalStore } from 'react';
import { subscribeToTasks } from '../firebaseLazy';

// One subscription for the whole CRM (the sidebar badge, the tasks tab and a client's drawer read the same
// list): a salesperson gets the tasks assigned to them, a manager the whole team's.
let state = { tasks: [], ready: false };
const listeners = new Set();
let stop = null;
let current = '';

const set = (next) => { state = next; listeners.forEach((l) => l()); };
const subscribe = (l) => { listeners.add(l); return () => listeners.delete(l); };

function start(uid, all) {
  const key = uid ? `${uid}|${all ? 1 : 0}` : '';
  if (key === current) return;
  if (stop) { stop(); stop = null; }
  current = key;
  set({ tasks: [], ready: false });
  if (key) stop = subscribeToTasks({ uid, all }, (tasks) => set({ tasks, ready: true }));
}

/** Call once, high in the CRM: keeps the shared list in step with the signed-in person */
export function useTasksSync(uid, all = false) {
  useEffect(() => {
    start(uid, all);
    return () => { if (stop) { stop(); stop = null; } current = ''; };
  }, [uid, all]);
}

/** { tasks, ready } from the shared subscription */
export const useTasks = () => useSyncExternalStore(subscribe, () => state, () => state);
