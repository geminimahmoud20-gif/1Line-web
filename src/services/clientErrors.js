import { db, isFirebaseConfigured } from '../firebase.js';

import { collection, addDoc, doc, query, orderBy, limit, onSnapshot, serverTimestamp, writeBatch } from 'firebase/firestore';

// ===================== CLIENT ERROR LOG =====================
// Visitors' browsers report JavaScript errors, crashes and Content-Security-Policy violations to
// client_errors (see src/utils/errorReporter.js). Anyone may create a bounded entry; only the
// admin reads or clears them (CRM → System → Site errors). Field list must match firestore.rules.

// Vercel exposes the deployed commit to Vite builds as VITE_VERCEL_GIT_COMMIT_SHA
const RELEASE = String(import.meta.env?.VITE_VERCEL_GIT_COMMIT_SHA || 'local').slice(0, 12);

export const reportClientError = async (entry) => {
  if (!isFirebaseConfigured() || !db) return false;
  await addDoc(collection(db, 'client_errors'), {
    kind: entry.kind,
    message: entry.message,
    source: entry.source || '',
    line: entry.line || 0,
    col: entry.col || 0,
    stack: entry.stack || '',
    path: entry.path || '',
    ua: entry.ua || '',
    release: RELEASE,
    createdAt: serverTimestamp()
  });
  return true;
};

/** Admin listener: callback(list | null on error), newest first */
export const subscribeToClientErrors = (callback, max = 200) => {
  if (!isFirebaseConfigured() || !db) return null;
  return onSnapshot(
    query(collection(db, 'client_errors'), orderBy('createdAt', 'desc'), limit(max)),
    (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    () => callback(null)
  );
};

/** Delete the given entries (a resolved error group) in batches of 400 */
export const deleteClientErrors = async (ids = []) => {
  if (!isFirebaseConfigured() || !db || ids.length === 0) return false;
  for (let i = 0; i < ids.length; i += 400) {
    const batch = writeBatch(db);
    ids.slice(i, i + 400).forEach((id) => batch.delete(doc(db, 'client_errors', id)));
    await batch.commit();
  }
  return true;
};
