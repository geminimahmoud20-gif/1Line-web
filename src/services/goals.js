import { db, isFirebaseConfigured } from '../firebase.js';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

// Monthly goals (crm_goals/current, shape and access in firestore.rules): staff read, a lead manager writes.

/** { team, people } or null when none are set (or the read is not allowed) */
export async function loadGoals() {
  if (!isFirebaseConfigured() || !db) return null;
  try {
    const snap = await getDoc(doc(db, 'crm_goals', 'current'));
    return snap.exists() ? snap.data() : null;
  } catch (e) {
    console.warn('loadGoals failed:', e?.code || e?.message);
    return null;
  }
}

/** true when saved */
export async function saveGoals({ team, people }, uid = '') {
  if (!isFirebaseConfigured() || !db) return false;
  try {
    await setDoc(doc(db, 'crm_goals', 'current'), { team, people, updatedAt: serverTimestamp(), updatedBy: String(uid || '') });
    return true;
  } catch (e) {
    console.warn('saveGoals failed:', e?.code || e?.message);
    return false;
  }
}
