import { db, isFirebaseConfigured } from '../firebase.js';
import { collection, doc, query, orderBy, limit, onSnapshot, updateDoc, serverTimestamp } from 'firebase/firestore';

// ===================== WHATSAPP TAPS FROM THE SITE =====================
// Written by api/contact-intent.js (reference, page, unit; no personal data). Staff see them in
// the inbox and mark each one linked to the lead it became, or dismissed (see firestore.rules).

/** Staff listener: callback(list | null on error), newest first */
export const subscribeToContactIntents = (callback, max = 100) => {
  if (!isFirebaseConfigured() || !db) return null;
  return onSnapshot(
    query(collection(db, 'contact_intents'), orderBy('createdAt', 'desc'), limit(max)),
    (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    () => callback(null)
  );
};

/** status: 'linked' (with the lead id) | 'dismissed' | 'open' (undo) */
export const resolveContactIntent = async (ref, status, uid, leadId = null) => {
  if (!isFirebaseConfigured() || !db) return false;
  await updateDoc(doc(db, 'contact_intents', ref), { status, leadId, handledBy: uid, handledAt: serverTimestamp() });
  return true;
};
