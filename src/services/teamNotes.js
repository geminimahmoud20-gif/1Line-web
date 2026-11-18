import { db, isFirebaseConfigured } from '../firebase.js';
import { collection, doc, setDoc, getDoc, deleteDoc, onSnapshot, query, where, limit, writeBatch } from 'firebase/firestore';

// Team notes and chat (crm_notes, crm_mentions, team_directory: shapes and access in firestore.rules,
// the documents themselves are built by src/utils/teamNotes.js).

const MAX_NOTES = 200;
const MAX_MENTIONS = 50;

/** Each member's own name card, so a colleague can be picked in an @mention. true when saved */
export async function registerSelf(person) {
  if (!isFirebaseConfigured() || !db || !person?.uid || !person?.name) return false;
  try {
    const ref = doc(db, 'team_directory', person.uid);
    const prev = await getDoc(ref).catch(() => null);
    const same = prev?.exists() && prev.data().name === person.name && (prev.data().desk || '') === (person.desk || '') && (prev.data().role || '') === (person.role || '');
    if (same) return true; // nothing to write on most visits
    await setDoc(ref, { name: String(person.name).slice(0, 80), desk: String(person.desk || '').slice(0, 60), role: String(person.role || '').slice(0, 40), updatedAt: new Date().toISOString() });
    return true;
  } catch (e) {
    console.warn('registerSelf failed:', e?.code || e?.message);
    return false;
  }
}

/** callback([{ uid, name, desk, role }]) on every change; returns the unsubscribe */
export function subscribeToPeople(callback) {
  if (!isFirebaseConfigured() || !db) { callback([]); return () => {}; }
  return onSnapshot(
    collection(db, 'team_directory'),
    (snap) => callback(snap.docs.map((d) => ({ uid: d.id, ...d.data() })).filter((p) => p.name)),
    (err) => { console.warn('team directory subscription:', err?.code || err?.message); callback([]); }
  );
}

/** callback(notes[]) for one client / listing / project / the team thread (oldest first is the caller's job) */
export function subscribeToNotes({ entityType, entityId } = {}, callback) {
  if (!isFirebaseConfigured() || !db || !entityType || !entityId) { callback([]); return () => {}; }
  const q = query(collection(db, 'crm_notes'), where('entityType', '==', entityType), where('entityId', '==', String(entityId)), limit(MAX_NOTES));
  return onSnapshot(
    q,
    (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    (err) => { console.warn('notes subscription:', err?.code || err?.message); callback(null); }
  );
}

/** The note and one notification per mentioned person, written together. The note's id, or null when not saved */
export async function sendNote(note, notices = []) {
  if (!isFirebaseConfigured() || !db || !note) return null;
  try {
    const batch = writeBatch(db);
    const noteRef = doc(collection(db, 'crm_notes'));
    batch.set(noteRef, note);
    for (const n of notices) batch.set(doc(collection(db, 'crm_mentions')), n);
    await batch.commit();
    return noteRef.id;
  } catch (e) {
    console.warn('sendNote failed:', e?.code || e?.message);
    return null;
  }
}

export async function removeNote(id) {
  if (!isFirebaseConfigured() || !db || !id) return false;
  try { await deleteDoc(doc(db, 'crm_notes', id)); return true; } catch (e) { console.warn('removeNote failed:', e?.code || e?.message); return false; }
}

/** callback(mentions[]) for the notifications addressed to this person */
export function subscribeToMentions(uid, callback) {
  if (!isFirebaseConfigured() || !db || !uid) { callback([]); return () => {}; }
  const q = query(collection(db, 'crm_mentions'), where('toUid', '==', uid), limit(MAX_MENTIONS));
  return onSnapshot(
    q,
    (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    (err) => { console.warn('mentions subscription:', err?.code || err?.message); callback([]); }
  );
}

export async function markMentionsRead(ids = []) {
  if (!isFirebaseConfigured() || !db || !ids.length) return false;
  try {
    const batch = writeBatch(db);
    const at = new Date().toISOString();
    for (const id of ids) batch.update(doc(db, 'crm_mentions', id), { readAt: at });
    await batch.commit();
    return true;
  } catch (e) {
    console.warn('markMentionsRead failed:', e?.code || e?.message);
    return false;
  }
}
