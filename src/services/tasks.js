import { db, isFirebaseConfigured } from '../firebase.js';
import { collection, doc, setDoc, addDoc, updateDoc, deleteDoc, onSnapshot, query, where, limit } from 'firebase/firestore';

// CRM tasks (crm_tasks/{id}, shape and access in firestore.rules). A salesperson subscribes to the tasks
// assigned to them; a manager to everyone's. Changing the assignee is the manager's.

const MAX = 500;

/** callback(tasks[]) on every change; returns the unsubscribe. `all`: the manager's view of the whole team */
export function subscribeToTasks({ uid, all = false } = {}, callback, onError) {
  if (!isFirebaseConfigured() || !db || !uid) { callback([]); return () => {}; }
  const base = collection(db, 'crm_tasks');
  const q = all ? query(base, limit(MAX)) : query(base, where('assigneeUid', '==', uid), limit(MAX));
  return onSnapshot(
    q,
    (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    (err) => { console.warn('tasks subscription:', err?.code || err?.message); onError?.(err); callback([]); }
  );
}

/** the new task's id, or null when it was not saved */
export async function addTask(task) {
  if (!isFirebaseConfigured() || !db || !task) return null;
  try {
    const ref = await addDoc(collection(db, 'crm_tasks'), task);
    return ref.id;
  } catch (e) {
    console.warn('addTask failed:', e?.code || e?.message);
    return null;
  }
}

export async function updateTask(id, patch) {
  if (!isFirebaseConfigured() || !db || !id) return false;
  try {
    await updateDoc(doc(db, 'crm_tasks', id), patch);
    return true;
  } catch (e) {
    console.warn('updateTask failed:', e?.code || e?.message);
    return false;
  }
}

export async function removeTask(id) {
  if (!isFirebaseConfigured() || !db || !id) return false;
  try {
    await deleteDoc(doc(db, 'crm_tasks', id));
    return true;
  } catch (e) {
    console.warn('removeTask failed:', e?.code || e?.message);
    return false;
  }
}

/** Create a task under a fixed id (so a second device or a retry writes the same one); true when saved */
export async function addTaskWithId(id, task) {
  if (!isFirebaseConfigured() || !db || !id || !task) return false;
  try {
    await setDoc(doc(db, 'crm_tasks', id), task);
    return true;
  } catch (e) {
    console.warn('addTaskWithId failed:', e?.code || e?.message);
    return false;
  }
}
