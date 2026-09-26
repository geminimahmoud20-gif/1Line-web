// =============================================================
//  ONE LINE SOLUTIONS - FIREBASE DATA SERVICE LAYER
//  Handles all CRUD operations for Leads, Demands, and Notifications.
//  Falls back to localStorage if Firebase is not configured.
// =============================================================

import { db, auth, storage, isFirebaseConfigured } from './firebase.js';
import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  updateDoc,
  deleteDoc,
  doc,
  setDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  increment
} from 'firebase/firestore';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';

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
 * Create or replace one catalog item. Resolves { ok, reason }:
 * reason = 'not-configured' | 'too-large' | Firestore error code.
 */
export const upsertCatalogItem = async (collectionName, item) => {
  if (!CATALOG_COLLECTIONS.has(collectionName) || !item || item.id === undefined || item.id === null) {
    return { ok: false, reason: 'invalid' };
  }
  if (!isFirebaseConfigured() || !db) return { ok: false, reason: 'not-configured' };
  const { data, bytes } = toFirestorePayload({ ...item, deleted: false, updatedAt: new Date().toISOString() });
  if (bytes > MAX_DOC_BYTES) return { ok: false, reason: 'too-large' };
  try {
    await setDoc(doc(db, collectionName, String(item.id)), data);
    return { ok: true };
  } catch (error) {
    console.error(`Firebase upsertCatalogItem [${collectionName}] error:`, error);
    return { ok: false, reason: error?.code || 'error' };
  }
};

export const deleteCatalogItem = async (collectionName, id) => {
  if (!CATALOG_COLLECTIONS.has(collectionName) || id === undefined || id === null) return { ok: false, reason: 'invalid' };
  if (!isFirebaseConfigured() || !db) return { ok: false, reason: 'not-configured' };
  try {
    await setDoc(doc(db, collectionName, String(id)), { id, deleted: true, updatedAt: new Date().toISOString() });
    return { ok: true };
  } catch (error) {
    console.error(`Firebase deleteCatalogItem [${collectionName}] error:`, error);
    return { ok: false, reason: error?.code || 'error' };
  }
};

// ===================== CMS MEDIA (Firebase Storage) =====================
// Hero videos used to be read as base64 data URLs and stored inside the settings doc:
// a 15MB clip became ~20MB of text — over localStorage (~5MB) and Firestore (1MB per doc)
// limits, and it froze the CMS form. Files now go to Storage; settings keep only the URL.

export const CMS_MEDIA_LIMITS = {
  video: { maxBytes: 60 * 1024 * 1024, types: ['video/mp4', 'video/webm', 'video/quicktime'] },
  image: { maxBytes: 5 * 1024 * 1024, types: ['image/jpeg', 'image/png', 'image/webp'] }
};

/**
 * Upload a CMS media file. onProgress(0..100). Resolves { ok, url } or { ok: false, reason }:
 * reason = 'type' | 'size' | 'not-configured' | Firebase error code (e.g. 'storage/unauthorized').
 */
/**
 * Is the Storage bucket provisioned? When Storage was never enabled in the console the
 * bucket answers 404 (measured on line-c9601.firebasestorage.app, 2026-09-26) and the SDK
 * kept retrying the upload at 0%. An existing bucket answers 200/401/403 to this
 * unauthenticated list call. Resolves true | false, or null when unreachable (offline / timeout).
 */
const probeStorageBucket = async () => {
  const bucket = storage?.app?.options?.storageBucket;
  if (!bucket) return false;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(`https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(bucket)}/o?maxResults=1`, { signal: ctrl.signal, cache: 'no-store' });
    return res.status !== 404;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
};

/**
 * onStart(cancel) hands the caller a cancel function once bytes start moving.
 * Extra reasons: 'unauthenticated' | 'offline' | 'bucket-unavailable' | 'stalled' | 'storage/canceled'.
 */
export const uploadCmsMedia = async (file, kind = 'video', onProgress, onStart) => {
  const limits = CMS_MEDIA_LIMITS[kind];
  if (!file || !limits) return { ok: false, reason: 'type' };
  if (!limits.types.includes(file.type)) return { ok: false, reason: 'type' };
  if (file.size > limits.maxBytes) return { ok: false, reason: 'size' };
  if (!isFirebaseConfigured() || !storage) return { ok: false, reason: 'not-configured' };
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return { ok: false, reason: 'offline' };
  // The rules only accept signed-in admins; the local PIN session has no Firebase user
  if (!auth?.currentUser) return { ok: false, reason: 'unauthenticated' };
  if ((await probeStorageBucket()) === false) return { ok: false, reason: 'bucket-unavailable' };

  const { ref, uploadBytesResumable, getDownloadURL } = await import('firebase/storage');
  // Default retry window is 10 minutes — on a dead connection the admin would watch 0% that long
  storage.maxUploadRetryTime = 90 * 1000;
  const safeName = file.name.normalize('NFKD').replace(/[^\w.-]+/g, '-').slice(-80) || `${kind}`;
  const path = `cms/${kind}s/${Date.now()}-${safeName}`;
  const task = uploadBytesResumable(ref(storage, path), file, {
    contentType: file.type,
    cacheControl: 'public, max-age=31536000, immutable'
  });
  onStart?.(() => task.cancel());

  return new Promise((resolve) => {
    let settled = false;
    const finish = (res) => { if (!settled) { settled = true; clearTimeout(stallTimer); resolve(res); } };
    // Watchdog: nothing transferred in 20s means the upload is not going to start
    const stallTimer = setTimeout(() => {
      if (task.snapshot.bytesTransferred === 0) { task.cancel(); finish({ ok: false, reason: 'stalled' }); }
    }, 20 * 1000);
    task.on('state_changed',
      (snap) => onProgress?.(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
      (error) => finish({ ok: false, reason: error?.code || 'error' }),
      async () => {
        try {
          finish({ ok: true, url: await getDownloadURL(task.snapshot.ref), path });
        } catch (error) {
          finish({ ok: false, reason: error?.code || 'error' });
        }
      });
  });
};

// ===================== AD CAMPAIGN STATS =====================
// Campaigns themselves live in settings/ad_campaigns (public read, admin write).
// Counters live in ad_stats/{campaignId}; the rules only allow +1 steps on these two fields.

const AD_ID_RE = /^[A-Za-z0-9_-]{3,64}$/;

export const incrementAdStat = async (campaignId, field) => {
  if (!['impressions', 'clicks'].includes(field) || !AD_ID_RE.test(String(campaignId))) return false;
  if (!isFirebaseConfigured() || !db) return false;
  try {
    await setDoc(doc(db, 'ad_stats', String(campaignId)), {
      impressions: increment(field === 'impressions' ? 1 : 0),
      clicks: increment(field === 'clicks' ? 1 : 0)
    }, { merge: true });
    return true;
  } catch (error) {
    console.warn('Ad stat write skipped:', error?.code || error);
    return false;
  }
};

/** Staff-only listener: callback({ [campaignId]: { impressions, clicks } }) */
export const subscribeToAdStats = (callback) => {
  if (!isFirebaseConfigured() || !db) return null;
  try {
    return onSnapshot(collection(db, 'ad_stats'), (snap) => {
      callback(Object.fromEntries(snap.docs.map((d) => [d.id, d.data()])));
    }, () => {});
  } catch {
    return null;
  }
};

// ===================== LEADS & OFFLINE SYNC QUEUE =====================

const PENDING_LEADS_KEY = 'oneline_pending_leads_queue';

// Guard against concurrent background synchronization tasks
let isSyncingPendingLeads = false;

/**
 * Enqueues a lead locally if network or Firebase is unavailable (with deduplication).
 */
export const enqueuePendingLead = (lead) => {
  try {
    const raw = localStorage.getItem(PENDING_LEADS_KEY);
    const list = raw ? JSON.parse(raw) : [];

    // Prevent duplicate lead submission within 30 seconds for identical phone & property
    const isDuplicate = list.some(item => 
      item.phone === lead.phone && 
      item.propertyId === lead.propertyId && 
      Math.abs(Date.now() - (item.queuedAt || 0)) < 30000
    );

    if (isDuplicate) {
      console.warn('🛡️ Duplicate lead submission prevented.');
      return;
    }

    list.push({ ...lead, queuedAt: Date.now() });
    localStorage.setItem(PENDING_LEADS_KEY, JSON.stringify(list));
    console.warn('⚠️ Lead enqueued locally for automatic background synchronization.');
  } catch (err) {
    console.error('Failed to enqueue pending lead:', err);
  }
};

/**
 * Synchronizes all locally queued leads to Firebase Firestore when connection is live.
 * Guarded against duplicate concurrent task executions.
 */
export const syncPendingLeads = async () => {
  if (!isFirebaseConfigured() || !db || isSyncingPendingLeads) return;
  isSyncingPendingLeads = true;
  try {
    const raw = localStorage.getItem(PENDING_LEADS_KEY);
    if (!raw) return;
    const list = JSON.parse(raw);
    if (!Array.isArray(list) || list.length === 0) return;

    const remaining = [];
    for (const lead of list) {
      try {
        await addDoc(collection(db, 'leads'), {
          ...lead,
          createdAt: serverTimestamp(),
          syncedFromOfflineQueue: true
        });
      } catch {
        remaining.push(lead);
      }
    }

    if (remaining.length > 0) {
      localStorage.setItem(PENDING_LEADS_KEY, JSON.stringify(remaining));
    } else {
      localStorage.removeItem(PENDING_LEADS_KEY);
      console.log('✅ All offline pending leads synchronized to Cloud.');
    }
  } catch (err) {
    console.error('Error syncing pending leads:', err);
  } finally {
    isSyncingPendingLeads = false;
  }
};

// Automatic network recovery listener
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    syncPendingLeads();
  });
  setTimeout(syncPendingLeads, 4000);
}

/**
 * Save a new lead to Firestore (with automatic offline fallback queue).
 */
export const saveLead = async (lead) => {
  if (isFirebaseConfigured() && db) {
    try {
      const payload = { ...lead, createdAt: serverTimestamp() };
      // Document id = app lead id, so updateLeadField/deleteLead (which use lead.id) reach it.
      if (lead.id !== undefined && lead.id !== null && lead.id !== '') {
        try {
          await setDoc(doc(db, 'leads', String(lead.id)), payload);
          return lead;
        } catch (error) {
          // A visitor re-submitting (merged into an existing lead id) is an update, which the
          // rules reserve for admins — store it as a fresh inquiry instead of dropping it.
          if (error?.code !== 'permission-denied') throw error;
        }
      }
      const docRef = await addDoc(collection(db, 'leads'), payload);
      return { ...lead, id: docRef.id };
    } catch (error) {
      console.error('Firebase saveLead error, enqueuing for background retry:', error);
      enqueuePendingLead(lead);
      return lead;
    }
  }
  enqueuePendingLead(lead);
  return lead;
};

/**
 * Load all leads from Firestore.
 * Returns null if Firebase is not configured (use localStorage).
 */
export const loadLeads = async (maxCount = 150) => {
  if (isFirebaseConfigured() && db) {
    try {
      const q = query(collection(db, 'leads'), orderBy('createdAt', 'desc'), limit(maxCount));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => ({ ...d.data(), id: d.id }));
    } catch (error) {
      console.error('Firebase loadLeads error:', error);
      return null;
    }
  }
  return null; // signal to use localStorage
};

/**
 * Subscribe to real-time lead updates from Firestore (capped to prevent client memory bloat).
 * Returns an unsubscribe function, or null if Firebase isn't configured.
 */
export const subscribeToLeads = (callback, maxCount = 150) => {
  if (isFirebaseConfigured() && db) {
    try {
      const q = query(collection(db, 'leads'), orderBy('createdAt', 'desc'), limit(maxCount));
      return onSnapshot(q, (snapshot) => {
        const leads = snapshot.docs.map(d => ({ ...d.data(), id: d.id }));
        // fromCache snapshots can hold only this device's pending writes — not the full list
        callback(leads, { fromCache: snapshot.metadata.fromCache });
      }, (err) => {
        if (err && err.code === 'permission-denied') {
          // Graceful fallback for unauthenticated guests
          return;
        }
        console.warn('Firebase subscribeToLeads snapshot warning:', err);
      });
    } catch (error) {
      console.error('Firebase subscribeToLeads error:', error);
      return null;
    }
  }
  return null;
};

/**
 * Update a specific field on a lead document in Firestore.
 */
export const updateLeadField = async (leadId, fieldUpdates) => {
  if (isFirebaseConfigured() && db) {
    try {
      const leadRef = doc(db, 'leads', leadId);
      // merge also supports leads that were created locally before Firebase
      // was connected, instead of failing because the document does not exist.
      await setDoc(leadRef, {
        ...fieldUpdates,
        updatedAt: serverTimestamp()
      }, { merge: true });
      return true;
    } catch (error) {
      console.error('Firebase updateLeadField error:', error);
      return false;
    }
  }
  return false;
};

/**
 * Delete a lead from Firestore.
 */
export const deleteLead = async (leadId) => {
  if (isFirebaseConfigured() && db) {
    try {
      await deleteDoc(doc(db, 'leads', leadId));
      return true;
    } catch (error) {
      console.error('Firebase deleteLead error:', error);
      return false;
    }
  }
  return false;
};

// ===================== DEALS & SALES PIPELINE =====================

/**
 * Save a canonical deal to Firestore.
 */
export const saveDeal = async (deal) => {
  if (isFirebaseConfigured() && db) {
    try {
      const docRef = await addDoc(collection(db, 'deals'), {
        ...deal,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return { ...deal, id: docRef.id };
    } catch (error) {
      console.error('Firebase saveDeal error:', error);
      return deal;
    }
  }
  return deal;
};

/**
 * Update an existing deal.
 */
export const updateDealDoc = async (dealId, updates) => {
  if (isFirebaseConfigured() && db) {
    try {
      const dealRef = doc(db, 'deals', dealId);
      await setDoc(dealRef, {
        ...updates,
        updatedAt: serverTimestamp()
      }, { merge: true });
      return true;
    } catch (error) {
      console.error('Firebase updateDealDoc error:', error);
      return false;
    }
  }
  return false;
};

/**
 * Delete a deal from Firestore.
 */
export const deleteDealDoc = async (dealId) => {
  if (isFirebaseConfigured() && db) {
    try {
      await deleteDoc(doc(db, 'deals', dealId));
      return true;
    } catch (error) {
      console.error('Firebase deleteDealDoc error:', error);
      return false;
    }
  }
  return false;
};

/**
 * Subscribe to real-time deals updates.
 */
export const subscribeToDeals = (callback) => {
  if (isFirebaseConfigured() && db) {
    try {
      const q = query(collection(db, 'deals'), orderBy('updatedAt', 'desc'));
      return onSnapshot(q, (snapshot) => {
        const deals = snapshot.docs.map(d => ({ ...d.data(), id: d.id }));
        callback(deals);
      }, (err) => {
        if (err && err.code === 'permission-denied') return;
        console.warn('Firebase subscribeToDeals snapshot warning:', err);
      });
    } catch (error) {
      console.error('Firebase subscribeToDeals error:', error);
      return null;
    }
  }
  return null;
};

// ===================== NOTIFICATIONS =====================

/**
 * Save a notification/activity log entry.
 */
export const saveNotification = async (text) => {
  if (isFirebaseConfigured() && db) {
    try {
      await addDoc(collection(db, 'notifications'), {
        text,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Firebase saveNotification error:', error);
    }
  }
};

// ===================== DEMANDS =====================

/**
 * Save a new demand to Firestore (or return for local fallback).
 */
export const saveDemand = async (demand) => {
  if (isFirebaseConfigured() && db) {
    try {
      // The rules require `name`; the public form sends `clientName`.
      const payload = { ...demand, name: demand.name || demand.clientName || '', createdAt: serverTimestamp() };
      // Keep the document id equal to the app's demand id, so approve/unpublish/delete
      // (which address the doc by that id) hit the same document instead of a random addDoc id.
      if (demand.id !== undefined && demand.id !== null && demand.id !== '') {
        await setDoc(doc(db, 'demands', String(demand.id)), payload);
        return demand;
      }
      const docRef = await addDoc(collection(db, 'demands'), payload);
      return { ...demand, id: docRef.id };
    } catch (error) {
      console.error('Firebase saveDemand error:', error);
      return demand;
    }
  }
  return demand;
};

/**
 * Subscribe to real-time demands updates from Firestore.
 * Returns an unsubscribe function, or null if Firebase isn't configured.
 */
export const subscribeToDemands = (callback, maxCount = 100) => {
  if (isFirebaseConfigured() && db) {
    try {
      let unsubscribe = () => {};
      const toDemands = (snapshot) => snapshot.docs.map(d => ({ ...d.data(), id: d.id }));
      const q = query(collection(db, 'demands'), orderBy('createdAt', 'desc'), limit(maxCount));
      unsubscribe = onSnapshot(q, (snapshot) => callback(toDemands(snapshot), { fromCache: snapshot.metadata.fromCache }), (err) => {
        if (err && err.code === 'permission-denied') {
          // Visitors may only list published demands; the rules reject an unfiltered query.
          // Single-field equality filter → no composite index needed.
          const publicQ = query(collection(db, 'demands'), where('status', '==', 'published'), limit(maxCount));
          unsubscribe = onSnapshot(publicQ, (snapshot) => callback(toDemands(snapshot), { fromCache: snapshot.metadata.fromCache }), () => {});
          return;
        }
        console.warn('Firebase subscribeToDemands snapshot warning:', err);
      });
      return () => unsubscribe();
    } catch (error) {
      console.error('Firebase subscribeToDemands error:', error);
      return null;
    }
  }
  return null;
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
      await updateDoc(demandRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });
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
      await deleteDoc(doc(db, 'demands', demandId));
      return true;
    } catch (error) {
      console.error('Firebase deleteDemandDoc error:', error);
      return false;
    }
  }
  return false;
};

// ===================== SETTINGS / CMS =====================

/**
 * Save site / founder CMS settings to Firestore.
 */
export const saveSettings = async (key, data) => {
  if (isFirebaseConfigured() && db) {
    try {
      const docRef = doc(db, 'settings', key);
      await setDoc(docRef, {
        ...data,
        updatedAt: serverTimestamp()
      }, { merge: true });
      return true;
    } catch (error) {
      console.error(`Firebase saveSettings [${key}] error:`, error);
      return false;
    }
  }
  return false;
};

/**
 * Load settings from Firestore.
 */
export const loadSettings = async (key) => {
  if (isFirebaseConfigured() && db) {
    try {
      const docRef = doc(db, 'settings', key);
      const snapshot = await getDoc(docRef);
      if (snapshot.exists()) {
        return snapshot.data();
      }
    } catch (error) {
      console.error(`Firebase loadSettings [${key}] error:`, error);
      return null;
    }
  }
  return null;
};

/**
 * Subscribe to real-time settings updates from Firestore.
 */
export const subscribeToSettings = (key, callback) => {
  if (isFirebaseConfigured() && db) {
    try {
      const docRef = doc(db, 'settings', key);
      return onSnapshot(docRef, (snapshot) => {
        if (snapshot.exists()) {
          callback(snapshot.data());
        }
      }, (err) => {
        if (err && err.code === 'permission-denied') {
          // Graceful fallback to default/local cached settings for guests
          return;
        }
        console.warn(`Firebase subscribeToSettings [${key}] snapshot warning:`, err);
      });
    } catch (error) {
      console.error(`Firebase subscribeToSettings [${key}] error:`, error);
      return null;
    }
  }
  return null;
};

// ===================== UTILITY =====================

/**
 * Check if Firebase is active and ready.
 */
export const isFirebaseActive = () => {
  return isFirebaseConfigured() && db !== null;
};

export const isFirebaseAuthAvailable = () => isFirebaseConfigured() && auth !== null;

// Firebase Authentication user IDs approved to access the internal CRM.
// Authorization is also enforced independently by Firestore rules.
const ADMIN_USER_IDS = new Set(['dB6GM2RoPQRE0iksDnqcdvUKgXy2']);

export const checkIsAdmin = async (user) => {
  if (!user) return false;
  if (ADMIN_USER_IDS.has(user.uid)) return true;
  try {
    const tokenResult = await user.getIdTokenResult();
    return Boolean(
      tokenResult?.claims?.admin === true ||
      tokenResult?.claims?.role === 'admin' ||
      tokenResult?.claims?.role === 'super_admin'
    );
  } catch {
    return false;
  }
};

const isAdminUser = (user) => Boolean(user && ADMIN_USER_IDS.has(user.uid));

// Staff roles are Firebase custom claims ({ role: 'sales_agent' }), set server-side with
// scripts/set-crm-role.mjs — a user cannot change their own claims. Must match firestore.rules.
export const CRM_STAFF_ROLES = ['sales_manager', 'sales_agent', 'property_manager', 'finance', 'viewer', 'agent_east', 'agent_new_sohag'];

/**
 * Resolves the CRM role for a signed-in user: 'super_admin', a staff role, or null (no CRM access).
 */
export const getCrmRole = async (user) => {
  if (!user) return null;
  if (ADMIN_USER_IDS.has(user.uid)) return 'super_admin';
  try {
    const claims = (await user.getIdTokenResult())?.claims || {};
    if (claims.admin === true || claims.role === 'admin' || claims.role === 'super_admin') return 'super_admin';
    if (CRM_STAFF_ROLES.includes(claims.role)) return claims.role;
    return null;
  } catch {
    return null; // fail closed
  }
};

// ===================== AUDIT LOGS =====================

/**
 * Persist an immutable audit log entry to Firestore (Canonical 9-field forensic schema).
 */
export const logAuditEvent = async ({ 
  actorId,
  action,
  entityType,
  entityId,
  before = null,
  after = null,
  ipHashOrMetadata = null,
  actionType, 
  targetCollection, 
  targetId, 
  details = {}, 
  actor = null,
  type,
  metadata
}) => {
  if (isFirebaseConfigured() && db) {
    try {
      const currentAuthUser = auth?.currentUser;
      const effectiveActorId = actorId || actor?.uid || currentAuthUser?.uid || 'system';
      const effectiveAction = action || type || actionType || 'GENERAL_ACTION';
      const effectiveEntityType = entityType || targetCollection || 'general';
      const effectiveEntityId = entityId || targetId || 'global';
      const effectiveBefore = before !== undefined ? before : null;
      const effectiveAfter = after !== undefined ? after : null;
      const effectiveMeta = ipHashOrMetadata || metadata || details || {};
      const nowIso = new Date().toISOString();

      const logDoc = {
        // Canonical 9 Fields
        actorId: effectiveActorId,
        action: effectiveAction,
        entityType: effectiveEntityType,
        entityId: effectiveEntityId,
        before: effectiveBefore,
        after: effectiveAfter,
        ipHashOrMetadata: effectiveMeta,
        createdAt: nowIso,

        // Backward-compatibility properties
        type: effectiveAction,
        actionType: effectiveAction,
        targetCollection: effectiveEntityType,
        targetId: effectiveEntityId,
        actorUid: effectiveActorId,
        actorEmail: actor?.email || currentAuthUser?.email || 'admin@1line.com',
        details: effectiveMeta,
        metadata: effectiveMeta,
        timestamp: serverTimestamp()
      };
      const docRef = await addDoc(collection(db, 'audit_logs'), logDoc);
      return { ...logDoc, id: docRef.id };
    } catch (err) {
      console.warn('Audit log write notice:', err);
      return false;
    }
  }
  return false;
};

// ===================== AUTHENTICATION =====================

/**
 * Sign in with email and password using Firebase Auth.
 */
export const loginUser = async (email, password) => {
  if (!isFirebaseAuthAvailable()) {
    throw new Error('Firebase Auth is not configured');
  }

  const credential = await signInWithEmailAndPassword(auth, email, password);
  const role = await getCrmRole(credential.user);
  if (!role) {
    await signOut(auth);
    // "unauthorized" is matched by the CRM login screen to show the no-access message
    throw new Error('unauthorized: this account has no CRM role');
  }

  // Record audit log entry for successful login
  logAuditEvent({
    actionType: 'CRM_LOGIN_SUCCESS',
    targetCollection: 'users',
    targetId: credential.user.uid,
    actor: { uid: credential.user.uid, email: credential.user.email },
    details: { loginMethod: 'email_password' }
  });

  return credential;
};

/**
 * Sign out the current user.
 */
export const logoutUser = async () => {
  if (isFirebaseAuthAvailable()) {
    const currentUser = auth?.currentUser;
    if (currentUser) {
      logAuditEvent({
        actionType: 'CRM_LOGOUT',
        targetCollection: 'users',
        targetId: currentUser.uid,
        actor: { uid: currentUser.uid, email: currentUser.email }
      });
    }
    return signOut(auth);
  }
};

/**
 * Monitor user authentication state changes with rich user profile.
 */
export const monitorAuthState = (callback) => {
  if (!isFirebaseAuthAvailable()) {
    callback(false, null);
    return () => {};
  }

  return onAuthStateChanged(auth, async (user) => {
    if (!user) {
      callback(false, null);
      return;
    }
    // Fail closed: no recognised role (or a claims error) → no CRM session at all
    const role = await getCrmRole(user);
    if (!role) {
      callback(false, null);
      return;
    }
    callback(true, {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName || user.email?.split('@')[0] || 'Admin',
      role
    });
  });
};
