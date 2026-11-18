// Internal details of a listing: /properties is public, so what the team must not show the site
// (what the owner told us, his lowest price, where the keys are) is saved in property_private/{id},
// a document with the same id that only staff can read (firestore.rules).
import { db, auth, isFirebaseConfigured } from '../firebase.js';
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';

export const PRIVATE_NOTES_MAX = 3000;

/** The internal notes of a listing: '' when none are saved, null when they couldn't be read (so saving never wipes them) */
export const loadPropertyPrivate = async (propertyId) => {
  if (!propertyId || !isFirebaseConfigured() || !db) return null;
  try {
    const snap = await getDoc(doc(db, 'property_private', String(propertyId)));
    return snap.exists() ? String(snap.data().notes || '') : '';
  } catch {
    return null;
  }
};

/** Saves the internal notes (an empty text removes the document). Returns true when it went through. */
export const savePropertyPrivate = async (propertyId, notes) => {
  if (!propertyId || !isFirebaseConfigured() || !db) return false;
  const text = String(notes || '').trim().slice(0, PRIVATE_NOTES_MAX);
  try {
    const ref = doc(db, 'property_private', String(propertyId));
    if (!text) await deleteDoc(ref);
    else await setDoc(ref, { notes: text, updatedAt: Date.now(), updatedBy: String(auth?.currentUser?.displayName || '').slice(0, 80) });
    return true;
  } catch (error) {
    console.error('savePropertyPrivate error:', error);
    return false;
  }
};
