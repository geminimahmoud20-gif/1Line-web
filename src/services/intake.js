import { db, isFirebaseConfigured } from '../firebase.js';

import { collection, updateDoc, doc, query, orderBy, limit, onSnapshot, serverTimestamp } from 'firebase/firestore';

import { notifyStaff } from './staffNotify.js';
import { createRequestWithContact, splitRequestFields, updateRequestContact, withRequestContacts } from './requestContacts.js';

// ===================== EXPAT & TRADE-IN INTAKE =====================
// Public forms write "new" records only (see firestore.rules); staff list and triage them in the CRM.

const INTAKE_COLLECTIONS = new Set(['remote_inspections', 'trade_ins']);

/**
 * Store a public intake request (remote inspection / trade-in). Returns the stored record with its id,
 * or null on failure so the caller can still hand the visitor over to WhatsApp.
 */
export const submitIntakeRecord = async (collectionName, record) => {
  if (!INTAKE_COLLECTIONS.has(collectionName) || !isFirebaseConfigured() || !db) return null;
  try {
    const payload = { ...record, status: 'new', createdAt: serverTimestamp() };
    const id = await createRequestWithContact(collectionName, doc(collection(db, collectionName)).id, payload);
    notifyStaff(collectionName, id);
    return { ...record, id, status: 'new' };
  } catch (error) {
    console.error(`Firebase submitIntakeRecord [${collectionName}] error:`, error);
    return null;
  }
};

/** Staff-only live list of intake requests, newest first. */
export const subscribeToIntake = (collectionName, callback, maxCount = 200) => {
  if (!INTAKE_COLLECTIONS.has(collectionName) || !isFirebaseConfigured() || !db) return null;
  try {
    const q = query(collection(db, collectionName), orderBy('createdAt', 'desc'), limit(maxCount));
    return withRequestContacts(collectionName, callback, (emit) => onSnapshot(q, { includeMetadataChanges: true }, (snapshot) => {
      emit(snapshot.docs.map((d) => {
        const data = d.data();
        const ts = data.createdAt;
        return {
          ...data,
          id: d.id,
          createdAtIso: ts && typeof ts.toDate === 'function' ? ts.toDate().toISOString() : (data.submittedAt || null)
        };
      }), { fromCache: snapshot.metadata.fromCache });
    }, (err) => {
      if (err?.code !== 'permission-denied') console.warn(`Firebase subscribeToIntake [${collectionName}] warning:`, err);
      emit([], { error: err?.code || 'error' });
    }));
  } catch (error) {
    console.error(`Firebase subscribeToIntake [${collectionName}] error:`, error);
    return null;
  }
};

/** Staff update (status, assignee, notes, matches). */
export const updateIntakeRecord = async (collectionName, id, updates) => {
  if (!INTAKE_COLLECTIONS.has(collectionName) || !isFirebaseConfigured() || !db) return false;
  try {
    const { rest, contact } = splitRequestFields(updates);
    await updateDoc(doc(db, collectionName, String(id)), { ...rest, updatedAt: serverTimestamp() });
    await updateRequestContact(collectionName, id, contact);
    return true;
  } catch (error) {
    console.error(`Firebase updateIntakeRecord [${collectionName}] error:`, error);
    return false;
  }
};
