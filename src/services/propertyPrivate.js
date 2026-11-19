// Internal details of a listing: /properties is public, so what the team must not show the site
// (what the owner told us, his lowest price, where the keys are, and whether/until when the listing is exclusive to us)
// is saved in property_private/{id}, a document with the same id that only staff can read (firestore.rules).
import { db, auth, isFirebaseConfigured } from '../firebase.js';
import { doc, getDoc, setDoc, deleteDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { cleanExclusive } from '../utils/exclusivity.js';

export const PRIVATE_NOTES_MAX = 3000;

/**
 * The internal details of a listing: { notes, exclusive, exclusiveFrom, exclusiveUntil } (empty when none are saved),
 * or null when they couldn't be read (so saving never wipes them).
 */
export const loadPropertyPrivateFull = async (propertyId) => {
  if (!propertyId || !isFirebaseConfigured() || !db) return null;
  try {
    const snap = await getDoc(doc(db, 'property_private', String(propertyId)));
    const d = snap.exists() ? snap.data() : {};
    return { notes: String(d.notes || ''), ...cleanExclusive(d) };
  } catch {
    return null;
  }
};

/** The internal notes of a listing: '' when none are saved, null when they couldn't be read (so saving never wipes them) */
export const loadPropertyPrivate = async (propertyId) => {
  const full = await loadPropertyPrivateFull(propertyId);
  return full ? full.notes : null;
};

/** Every exclusive listing's terms in one query: Map(property id → { exclusive, exclusiveFrom, exclusiveUntil }), or null when it couldn't be read */
export const loadExclusiveMap = async () => {
  if (!isFirebaseConfigured() || !db) return null;
  try {
    const snap = await getDocs(query(collection(db, 'property_private'), where('exclusive', '==', true)));
    return new Map(snap.docs.map((d) => [d.id, cleanExclusive(d.data())]));
  } catch {
    return null;
  }
};

/**
 * Saves the internal details. `exclusive` is { exclusive, exclusiveFrom, exclusiveUntil }; the document is removed when
 * there is neither a note nor an exclusive agreement. Always pass both: the document is written whole.
 * Returns true when it went through.
 */
export const savePropertyPrivate = async (propertyId, notes, exclusive = null) => {
  if (!propertyId || !isFirebaseConfigured() || !db) return false;
  const text = String(notes || '').trim().slice(0, PRIVATE_NOTES_MAX);
  const terms = exclusive ? cleanExclusive(exclusive) : null;
  const exclusiveOn = Boolean(terms?.exclusive);
  try {
    const ref = doc(db, 'property_private', String(propertyId));
    if (!text && !exclusiveOn) await deleteDoc(ref);
    else {
      await setDoc(ref, {
        ...(text ? { notes: text } : {}),
        ...(exclusiveOn ? terms : {}),
        updatedAt: Date.now(),
        updatedBy: String(auth?.currentUser?.displayName || '').slice(0, 80)
      });
    }
    return true;
  } catch (error) {
    console.error('savePropertyPrivate error:', error);
    return false;
  }
};
