import { db, isFirebaseConfigured } from '../firebase.js';
import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore';

/** The latest audit entries, newest first (super admin only: the rules refuse everyone else). null when unreadable. */
export const loadAuditEvents = async (max = 300) => {
  if (!isFirebaseConfigured() || !db) return null;
  try {
    const snap = await getDocs(query(collection(db, 'audit_logs'), orderBy('timestamp', 'desc'), limit(Math.min(Math.max(max, 1), 500))));
    return snap.docs.map((d) => {
      const x = d.data();
      const t = x.timestamp;
      const at = t && typeof t.toMillis === 'function' ? t.toMillis() : Date.parse(x.createdAt || '') || 0;
      return { id: d.id, at, actorEmail: x.actorEmail || '', action: x.action || x.actionType || '', targetCollection: x.targetCollection || '', targetId: x.targetId || '', details: x.details || {} };
    });
  } catch {
    return null;
  }
};
