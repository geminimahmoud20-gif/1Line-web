import { db, auth, isFirebaseConfigured } from '../firebase.js';

import { collection, getDocs, getDoc, updateDoc, deleteDoc, doc, setDoc, query, orderBy, limit, onSnapshot, serverTimestamp, writeBatch } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { notifyStaff } from './staffNotify.js';
import { createRequestWithContact, splitRequestFields, updateRequestContact, withRequestContacts, requestContactRef } from './requestContacts.js';

// ===================== DEMANDS =====================

/**
 * Save a new demand to Firestore (or return for local fallback).
 */
export const saveDemand = async (demand) => {
  if (isFirebaseConfigured() && db) {
    try {
      // The rules require `name`; the public form sends `clientName`.
      const payload = { ...demand, name: demand.name || demand.clientName || '', createdAt: serverTimestamp() };
      delete payload.id;
      // Keep the document id equal to the app's demand id, so approve/unpublish/delete
      // (which address the doc by that id) hit the same document instead of a random id.
      const hasId = demand.id !== undefined && demand.id !== null && demand.id !== '';
      const id = hasId ? String(demand.id) : doc(collection(db, 'demands')).id;
      await createRequestWithContact('demands', id, payload);
      notifyStaff('demands', id);
      if (payload.status === 'published') await syncPublicDemand(id);
      return { ...demand, id };
    } catch (error) {
      console.error('Firebase saveDemand error:', error);
      return demand;
    }
  }
  return demand;
};

// ── Public demand copies ──────────────────────────────────────────────────────
// `demands` holds the buyer's contact details and is staff-only. When staff publish a demand,
// a copy with only the fields below goes to `public_demands`, which the site reads.
// Keep in sync with the hasOnly() list for public_demands in firestore.rules.
export const PUBLIC_DEMAND_FIELDS = [
  'text_ar', 'text_en', 'area', 'area_ar', 'area_en', 'type', 'budget', 'paymentMethod', 'timeframe',
  'urgency', 'minSize', 'status', 'timestamp', 'createdAt', 'approvedAt', 'updatedAt'
];

export const toPublicDemand = (demand) => {
  const out = {};
  for (const key of PUBLIC_DEMAND_FIELDS) {
    if (demand[key] !== undefined && demand[key] !== null) out[key] = demand[key];
  }
  return out;
};

/** Mirror one demand into public_demands: copy it while it is published, remove it otherwise. */
export const syncPublicDemand = async (demandId) => {
  if (!isFirebaseConfigured() || !db || !demandId) return false;
  try {
    const snap = await getDoc(doc(db, 'demands', String(demandId)));
    const publicRef = doc(db, 'public_demands', String(demandId));
    if (snap.exists() && snap.data().status === 'published') {
      await setDoc(publicRef, toPublicDemand(snap.data()));
    } else {
      await deleteDoc(publicRef);
    }
    return true;
  } catch (error) {
    console.error('Firebase syncPublicDemand error:', error);
    return false;
  }
};

/**
 * Publish missing public copies for demands that are published in the staff list — needed once
 * for demands published before the split. Add-only: the list may be partial (cache, 100 cap),
 * so nothing is removed here; unpublish/delete remove their copy themselves.
 */
export const reconcilePublicDemands = async (demands) => {
  if (!isFirebaseConfigured() || !db || !Array.isArray(demands)) return 0;
  try {
    const existing = await getDocs(collection(db, 'public_demands'));
    const existingIds = new Set(existing.docs.map((d) => d.id));
    let added = 0;
    for (const demand of demands) {
      if (!demand?.id || demand.status !== 'published' || existingIds.has(String(demand.id))) continue;
      // Re-read the source doc: the list may hold stale local copies
      if (await syncPublicDemand(String(demand.id))) added++;
    }
    return added;
  } catch (error) {
    console.error('Firebase reconcilePublicDemands error:', error);
    return 0;
  }
};

/**
 * Subscribe to real-time demands. Staff get the full `demands` list (with contacts);
 * everyone else gets the published, contact-free `public_demands`. Follows login/logout.
 * Returns an unsubscribe function, or null if Firebase isn't configured.
 */
export const subscribeToDemands = (callback, maxCount = 100) => {
  if (!isFirebaseConfigured() || !db) return null;
  const toDemands = (snapshot) => snapshot.docs.map(d => ({ ...d.data(), id: d.id }));
  let unsubSnapshot = null;
  let authVersion = 0;

  const listenPublic = () => onSnapshot(
    query(collection(db, 'public_demands'), limit(maxCount)),
    (snapshot) => callback(toDemands(snapshot), { fromCache: snapshot.metadata.fromCache, isPublic: true }),
    (err) => console.warn('Firebase public demands warning:', err)
  );
  const listenStaff = (version) => withRequestContacts('demands', callback, (emit) => onSnapshot(
    query(collection(db, 'demands'), orderBy('createdAt', 'desc'), limit(maxCount)),
    { includeMetadataChanges: true },
    (snapshot) => emit(toDemands(snapshot), { fromCache: snapshot.metadata.fromCache }),
    (err) => {
      // Signed in without a CRM role → fall back to the public list
      if (err && err.code === 'permission-denied') {
        if (version === authVersion) {
          if (unsubSnapshot) unsubSnapshot();
          unsubSnapshot = listenPublic();
        }
        return;
      }
      console.warn('Firebase subscribeToDemands snapshot warning:', err);
    }
  ));
  const stopSnapshot = () => {
    if (unsubSnapshot) unsubSnapshot();
    unsubSnapshot = null;
  };

  try {
    if (!auth) {
      unsubSnapshot = listenPublic();
      return stopSnapshot;
    }
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      const version = ++authVersion;
      stopSnapshot();
      unsubSnapshot = user ? listenStaff(version) : listenPublic();
    });
    return () => {
      authVersion++;
      unsubAuth();
      stopSnapshot();
    };
  } catch (error) {
    console.error('Firebase subscribeToDemands error:', error);
    return null;
  }
};

/**
 * Load all demands from Firestore (capped with limit).
 */
export const loadDemands = async (maxCount = 100) => {
  if (isFirebaseConfigured() && db) {
    try {
      const q = query(collection(db, 'demands'), orderBy('createdAt', 'desc'), limit(maxCount));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => ({ ...d.data(), id: d.id }));
    } catch (error) {
      console.error('Firebase loadDemands error:', error);
      return null;
    }
  }
  return null;
};

/**
 * Update demand status or fields in Firestore.
 */
export const updateDemandStatus = async (demandId, updates) => {
  if (isFirebaseConfigured() && db) {
    try {
      const demandRef = doc(db, 'demands', demandId);
      const { rest, contact } = splitRequestFields(updates);
      delete rest.id;
      await updateDoc(demandRef, {
        ...rest,
        updatedAt: serverTimestamp()
      });
      await updateRequestContact('demands', demandId, contact);
      await syncPublicDemand(demandId);
      return true;
    } catch (error) {
      console.error('Firebase updateDemandStatus error:', error);
      return false;
    }
  }
  return false;
};

/**
 * Delete a demand from Firestore.
 */
export const deleteDemandDoc = async (demandId) => {
  if (isFirebaseConfigured() && db) {
    try {
      const batch = writeBatch(db);
      batch.delete(doc(db, 'demands', String(demandId)));
      batch.delete(requestContactRef('demands', String(demandId)));
      await batch.commit();
      await deleteDoc(doc(db, 'public_demands', String(demandId)));
      return true;
    } catch (error) {
      console.error('Firebase deleteDemandDoc error:', error);
      return false;
    }
  }
  return false;
};
