import { db, auth, isFirebaseConfigured } from '../firebase.js';
import { checkIsAdmin } from './auth.js';
import { approvalStamp } from '../utils/publishApproval.js';

import { collection, addDoc, getDocs, doc, setDoc, deleteDoc, query, orderBy, limit, onSnapshot, serverTimestamp, writeBatch } from 'firebase/firestore';

// ===================== PROPERTIES =====================

/**
 * Load all properties from Firestore (or return null for local fallback).
 */
export const loadProperties = async (maxCount = 100) => {
  if (isFirebaseConfigured() && db) {
    try {
      const q = query(collection(db, 'properties'), orderBy('createdAt', 'desc'), limit(maxCount));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => ({ ...d.data(), id: d.id }));
    } catch (error) {
      console.error('Firebase loadProperties error:', error);
      return null;
    }
  }
  return null;
};

/**
 * Save a new property to Firestore.
 */
export const saveProperty = async (property) => {
  if (isFirebaseConfigured() && db) {
    try {
      const docRef = await addDoc(collection(db, 'properties'), {
        ...property,
        createdAt: serverTimestamp()
      });
      return { ...property, id: docRef.id };
    } catch (error) {
      console.error('Firebase saveProperty error:', error);
      return property;
    }
  }
  return property;
};

// ===================== CATALOG SYNC (properties / projects) =====================
// One document per item, keyed by the item's own id so the static seed data and the
// cloud copy line up. Deletes write a tombstone ({ deleted: true }) so seed items
// removed by the admin don't reappear from the bundled data on the next load.

const CATALOG_COLLECTIONS = new Set(['properties', 'projects']);
const MAX_DOC_BYTES = 900 * 1024; // Firestore hard limit is 1 MiB per document

/** Strips undefined/functions (Firestore rejects them) and measures the payload. */
const toFirestorePayload = (item) => {
  const json = JSON.stringify(item);
  return { data: JSON.parse(json), bytes: new Blob([json]).size };
};

/**
 * Real-time listener for a catalog collection. Returns an unsubscribe function or null.
 * callback receives [{ id, ...data }] including tombstones.
 */
export const subscribeToCatalog = (collectionName, callback) => {
  if (!CATALOG_COLLECTIONS.has(collectionName) || !isFirebaseConfigured() || !db) return null;
  try {
    return onSnapshot(collection(db, collectionName), (snapshot) => {
      callback(snapshot.docs.map((d) => ({ ...d.data(), id: d.data().id ?? d.id })));
    }, (err) => {
      console.warn(`Firebase subscribeToCatalog [${collectionName}] warning:`, err);
    });
  } catch (error) {
    console.error(`Firebase subscribeToCatalog [${collectionName}] error:`, error);
    return null;
  }
};

/**
 * Who is saving: the general manager publishes, anyone else's save waits for approval
 * (src/utils/publishApproval.js; firestore.rules enforces the same).
 */
export const currentApprover = async () => {
  const user = auth?.currentUser || null;
  return { isManager: await checkIsAdmin(user), who: user?.email || user?.uid || '' };
};

/**
 * Create or replace one catalog item. Resolves { ok, reason, item } (item = what was saved,
 * with its approval stamp). reason = 'not-configured' | 'too-large' | Firestore error code.
 */
export const upsertCatalogItem = async (collectionName, item) => {
  if (!CATALOG_COLLECTIONS.has(collectionName) || !item || item.id === undefined || item.id === null) {
    return { ok: false, reason: 'invalid' };
  }
  if (!isFirebaseConfigured() || !db) return { ok: false, reason: 'not-configured' };
  const stamped = approvalStamp({ ...item, deleted: false, updatedAt: new Date().toISOString() }, await currentApprover());
  const { data, bytes } = toFirestorePayload(stamped);
  if (bytes > MAX_DOC_BYTES) return { ok: false, reason: 'too-large' };
  try {
    await setDoc(doc(db, collectionName, String(item.id)), data);
    return { ok: true, item: stamped };
  } catch (error) {
    console.error(`Firebase upsertCatalogItem [${collectionName}] error:`, error);
    return { ok: false, reason: error?.code || 'error' };
  }
};

/**
 * Removes an item. A tombstone ({ deleted: true }) is kept only for items the site also ships as
 * bundled samples (`keepTombstone`), so the sample doesn't come back; anything else is deleted
 * outright — every document left behind is read again on each catalog refresh.
 */
export const deleteCatalogItem = async (collectionName, id, { keepTombstone = true } = {}) => {
  if (!CATALOG_COLLECTIONS.has(collectionName) || id === undefined || id === null) return { ok: false, reason: 'invalid' };
  if (!isFirebaseConfigured() || !db) return { ok: false, reason: 'not-configured' };
  try {
    if (!keepTombstone) {
      await deleteDoc(doc(db, collectionName, String(id)));
      return { ok: true };
    }
    await setDoc(doc(db, collectionName, String(id)), { id, deleted: true, updatedAt: new Date().toISOString() });
    return { ok: true };
  } catch (error) {
    console.error(`Firebase deleteCatalogItem [${collectionName}] error:`, error);
    return { ok: false, reason: error?.code || 'error' };
  }
};

/**
 * Many catalog items in batched writes (file import). Items over the size limit are skipped.
 * Returns { ok, written, skipped: [{ id, reason }], reason? } — one report for the whole import.
 */
export const upsertCatalogItems = async (collectionName, items = []) => {
  if (!CATALOG_COLLECTIONS.has(collectionName)) return { ok: false, written: 0, skipped: [], reason: 'invalid' };
  if (!isFirebaseConfigured() || !db) return { ok: false, written: 0, skipped: [], reason: 'not-configured' };
  const now = new Date().toISOString();
  const approver = await currentApprover();
  const skipped = [];
  const docs = [];
  for (const item of items) {
    if (!item || item.id === undefined || item.id === null) { skipped.push({ id: item?.id, reason: 'invalid' }); continue; }
    const { data, bytes } = toFirestorePayload(approvalStamp({ ...item, deleted: false, updatedAt: now }, { ...approver, now }));
    if (bytes > MAX_DOC_BYTES) { skipped.push({ id: item.id, reason: 'too-large' }); continue; }
    docs.push([String(item.id), data]);
  }
  let written = 0;
  try {
    // A batch takes up to 500 writes; stay well under for large documents
    for (let i = 0; i < docs.length; i += 200) {
      const batch = writeBatch(db);
      for (const [id, data] of docs.slice(i, i + 200)) batch.set(doc(db, collectionName, id), data);
      await batch.commit();
      written += Math.min(200, docs.length - i);
    }
    return { ok: true, written, skipped };
  } catch (error) {
    console.error(`Firebase upsertCatalogItems [${collectionName}] error:`, error);
    return { ok: false, written, skipped, reason: error?.code || 'error' };
  }
};
