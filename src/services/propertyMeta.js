// Who added a listing and why it was sent back: property_meta/{id}, staff-only (the listing itself is public).
// Shapes and access are in firestore.rules; the pure helpers are src/utils/listingMeta.js.
import { db, auth, isFirebaseConfigured } from '../firebase.js';
import { collection, doc, addDoc, setDoc, getDocs, query, where, documentId } from 'firebase/firestore';
import { userDisplayName } from '../utils/assignees.js';

const cache = new Map(); // id → the document's data, or null when there is none

/** Records who is adding this listing. Only a new listing: the rules refuse a second write. true when saved. */
export async function stampSubmitter(propertyId) {
  const user = auth?.currentUser;
  if (!propertyId || !user || !isFirebaseConfigured() || !db) return false;
  try {
    const data = { submittedByUid: user.uid, submittedByName: userDisplayName(user).slice(0, 80), submittedAt: new Date().toISOString() };
    await setDoc(doc(db, 'property_meta', String(propertyId)), data);
    cache.set(String(propertyId), data);
    return true;
  } catch {
    return false; // an older listing already has its document, or the account may not write it
  }
}

/** The documents of these listings, 30 ids per query; ids already looked up are not asked again. Returns { id: data|null }. */
export async function loadPropertyMeta(ids = []) {
  const want = [...new Set(ids.map(String))].filter((id) => id && !cache.has(id));
  if (want.length && isFirebaseConfigured() && db) {
    for (let i = 0; i < want.length; i += 30) {
      const chunk = want.slice(i, i + 30);
      try {
        const snap = await getDocs(query(collection(db, 'property_meta'), where(documentId(), 'in', chunk)));
        const found = new Map(snap.docs.map((d) => [d.id, d.data()]));
        chunk.forEach((id) => cache.set(id, found.get(id) || null));
      } catch {
        // not readable now: leave them unknown so the next look tries again
      }
    }
  }
  return Object.fromEntries(ids.map((id) => [String(id), cache.get(String(id)) ?? null]));
}

/** Saves why a listing was sent back (the manager's write). true when saved. */
export async function saveRejection(propertyId, rejection) {
  if (!propertyId || !rejection || !isFirebaseConfigured() || !db) return false;
  try {
    await setDoc(doc(db, 'property_meta', String(propertyId)), { rejection }, { merge: true });
    cache.set(String(propertyId), { ...(cache.get(String(propertyId)) || {}), rejection });
    return true;
  } catch (error) {
    console.warn('saveRejection failed:', error?.code || error?.message);
    return false;
  }
}

/** The notification for the person who added the listing. true when saved. */
export async function sendRejectionNotice(notice) {
  if (!notice || !isFirebaseConfigured() || !db) return false;
  try {
    await addDoc(collection(db, 'crm_mentions'), notice);
    return true;
  } catch {
    return false;
  }
}
