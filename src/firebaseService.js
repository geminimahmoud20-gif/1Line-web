// =============================================================
//  ONE LINE SOLUTIONS - FIREBASE DATA SERVICE LAYER
//  Handles all CRUD operations for Leads, Demands, and Notifications.
//  Falls back to localStorage if Firebase is not configured.
// =============================================================

import { db, auth, isFirebaseConfigured } from './firebase.js';
import { DESK_BY_ROLE, UNASSIGNED_DESK } from './utils/rbacRules.js';
import { enqueuePendingLead, readPendingLeads, writePendingLeads } from './utils/leadQueue.js';
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
  increment,
  writeBatch,
  deleteField,
  documentId
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

// Files go to Vercel Blob (Firebase Storage was never enabled for this project: its bucket
// answers 404 and needs the Blaze plan). /api/cms-upload signs each upload for admins only.
const CMS_UPLOAD_ROUTE = '/api/cms-upload';

/**
 * For the CMS to decide up front whether the device-upload box can work at all.
 * 'ready' | 'unavailable' (no Blob store connected) | 'unknown' (offline / timeout).
 */
// 'presigned' (store connected via BLOB_STORE_ID + OIDC) or 'token' (BLOB_READ_WRITE_TOKEN)
let cmsUploadMode = null;

export const getCmsStorageStatus = async () => {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(CMS_UPLOAD_ROUTE, { signal: ctrl.signal, cache: 'no-store' });
    if (!res.ok) return res.status === 404 || res.status === 503 ? 'unavailable' : 'unknown';
    const info = await res.json();
    if (!info?.ok) return 'unavailable';
    cmsUploadMode = info.mode;
    return 'ready';
  } catch {
    return 'unknown';
  } finally {
    clearTimeout(timer);
  }
};

/**
 * Upload a CMS media file. onProgress(0..100); onStart(cancel) hands back a cancel function.
 * Resolves { ok, url, path } or { ok: false, reason }: 'type' | 'size' | 'offline' |
 * 'unauthenticated' | 'storage/unauthorized' | 'bucket-unavailable' | 'stalled' | 'storage/canceled' | 'error'.
 */
export const uploadCmsMedia = async (file, kind = 'video', onProgress, onStart) => {
  const limits = CMS_MEDIA_LIMITS[kind];
  if (!file || !limits) return { ok: false, reason: 'type' };
  if (!limits.types.includes(file.type)) return { ok: false, reason: 'type' };
  if (file.size > limits.maxBytes) return { ok: false, reason: 'size' };
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return { ok: false, reason: 'offline' };
  // The route only signs uploads for signed-in admins; the local PIN session has no Firebase user
  if (!auth?.currentUser) return { ok: false, reason: 'unauthenticated' };

  let idToken;
  try { idToken = await auth.currentUser.getIdToken(); } catch { return { ok: false, reason: 'unauthenticated' }; }
  if (!cmsUploadMode) await getCmsStorageStatus();
  const blobClient = await import('@vercel/blob/client');
  const upload = cmsUploadMode === 'token' ? blobClient.upload : blobClient.uploadPresigned;
  const safeName = file.name.normalize('NFKD').replace(/[^\w.-]+/g, '-').slice(-80) || kind;
  const path = `cms/${kind}s/${Date.now()}-${safeName}`;
  const ctrl = new AbortController();
  let moved = false;
  let cancelled = false;
  onStart?.(() => { cancelled = true; ctrl.abort(); });
  // Watchdog: nothing transferred in 30s means the upload is not going to start
  const stallTimer = setTimeout(() => { if (!moved) ctrl.abort(); }, 30 * 1000);

  try {
    const blob = await upload(path, file, {
      access: 'public',
      handleUploadUrl: CMS_UPLOAD_ROUTE,
      clientPayload: JSON.stringify({ kind, idToken }),
      contentType: file.type,
      multipart: file.size > 8 * 1024 * 1024,
      abortSignal: ctrl.signal,
      onUploadProgress: ({ loaded, percentage }) => {
        if (loaded > 0) moved = true;
        onProgress?.(Math.min(100, Math.round(percentage)));
      }
    });
    return { ok: true, url: blob.url, path: blob.pathname };
  } catch (error) {
    if (cancelled) return { ok: false, reason: 'storage/canceled' };
    if (ctrl.signal.aborted) return { ok: false, reason: 'stalled' };
    const msg = String(error?.message || error);
    if (/unauthori[sz]ed|403/i.test(msg)) return { ok: false, reason: 'storage/unauthorized' };
    if (/not-configured|503|404/i.test(msg)) return { ok: false, reason: 'bucket-unavailable' };
    console.warn('CMS upload failed:', msg);
    return { ok: false, reason: 'error' };
  } finally {
    clearTimeout(stallTimer);
  }
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

// Guard against concurrent background synchronization tasks
let isSyncingPendingLeads = false;

// ── Lead contacts ────────────────────────────────────────────────────────────
// Client phone/WhatsApp/email live in lead_contacts/{leadId} (managers + the lead's desk only),
// not on the lead itself, which read-only roles can list. Keep in sync with contactFields() in
// firestore.rules. The contact doc mirrors the lead's desk in assignedTo.
export const LEAD_CONTACT_FIELDS = ['phone', 'whatsapp', 'email', 'altPhone'];
const CLIENT_ONLY_FIELDS = ['_cloud', '_inlineContact', 'queuedAt', 'id'];

const splitLeadFields = (fields) => {
  const lead = {};
  const contact = {};
  for (const [key, value] of Object.entries(fields || {})) {
    if (CLIENT_ONLY_FIELDS.includes(key) || value === undefined) continue;
    if (LEAD_CONTACT_FIELDS.includes(key)) {
      if (value !== null && value !== '') contact[key] = String(value);
    } else {
      lead[key] = value;
    }
  }
  return { lead, contact };
};
const deskOf = (data) => data?.assignedTo || UNASSIGNED_DESK;

// One Firestore write for a lead: the lead and its contact doc in one batch. Document id = app
// lead id, so updateLeadField/deleteLead (which use lead.id) reach it, and a retried write lands
// on the same doc instead of a duplicate.
const writeLead = async (rawLead, extra = {}) => {
  const { lead, contact } = splitLeadFields(rawLead);
  const payload = { ...lead, ...extra, createdAt: serverTimestamp() };
  const write = async (id) => {
    const batch = writeBatch(db);
    batch.set(doc(db, 'leads', id), payload);
    batch.set(doc(db, 'lead_contacts', id), { ...contact, assignedTo: deskOf(payload) });
    await batch.commit();
    return { ...rawLead, id };
  };
  const appId = rawLead?.id;
  if (appId !== undefined && appId !== null && appId !== '') {
    try {
      return await write(String(appId));
    } catch (error) {
      // A visitor re-submitting (merged into an existing lead id) is an update, which the
      // rules reserve for staff — store it as a fresh inquiry instead of dropping it.
      if (error?.code !== 'permission-denied') throw error;
    }
  }
  return write(doc(collection(db, 'leads')).id);
};

/**
 * Synchronizes all locally queued leads to Firebase Firestore when connection is live.
 * Guarded against duplicate concurrent task executions. A lead the rules reject outright
 * (permission-denied / invalid-argument) can never succeed, so it is dropped instead of
 * blocking the queue on every visit; anything else stays for the next attempt.
 */
export const syncPendingLeads = async () => {
  if (!isFirebaseConfigured() || !db || isSyncingPendingLeads) return 0;
  isSyncingPendingLeads = true;
  let synced = 0;
  try {
    const list = readPendingLeads();
    if (list.length === 0) return 0;

    const remaining = [];
    for (const lead of list) {
      try {
        await writeLead(lead, { syncedFromOfflineQueue: true });
        synced++;
      } catch (error) {
        if (['permission-denied', 'invalid-argument'].includes(error?.code)) {
          console.error('Dropping queued lead the server rejects:', error.code);
        } else {
          remaining.push(lead);
        }
      }
    }

    writePendingLeads(remaining);
  } catch (err) {
    console.error('Error syncing pending leads:', err);
  } finally {
    isSyncingPendingLeads = false;
  }
  return synced;
};

// Retry on every page load: a visitor may have closed the tab while offline.
// Reconnects are handled by PropertiesContext, which also tells the visitor.
if (typeof window !== 'undefined') {
  setTimeout(syncPendingLeads, 4000);
}

/**
 * Save a new lead to Firestore (with automatic offline fallback queue).
 */
export const saveLead = async (lead) => {
  if (isFirebaseConfigured() && db) {
    try {
      return await writeLead(lead);
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

// Desk agents may only read their own queue (firestore.rules → leadDesk()), so their listener
// must ask for exactly that slice; an unfiltered query would be rejected as a whole.
/**
 * Subscribe to real-time lead updates from Firestore (capped to prevent client memory bloat).
 * Follows the signed-in user: re-subscribes on login/logout with the query their role may read.
 * Returns an unsubscribe function, or null if Firebase isn't configured.
 */
export const subscribeToLeads = (callback, maxCount = 150) => {
  if (!isFirebaseConfigured() || !db) return null;
  let unsubSnapshot = null;
  let authVersion = 0;

  // Leads + (for roles allowed to see them) their contact docs, merged into one list.
  // contactsMode: 'desk' → the desk's contact docs by assignedTo; 'all' → contact docs of the
  // listed leads by id (30 per query); null → none (read-only roles never receive phones).
  const listen = (desk, contactsMode) => {
    let leads = null; // null until the first leads snapshot — never emit contacts alone
    let meta = { fromCache: true };
    let contacts = new Map();
    let contactUnsubs = [];
    let contactIdsKey = '';
    const stopContacts = () => { contactUnsubs.forEach((u) => u()); contactUnsubs = []; };

    const emit = () => leads && callback(leads.map((l) => {
      const merged = { ...l };
      if (LEAD_CONTACT_FIELDS.some((f) => f in l)) merged._inlineContact = true;
      const c = contacts.get(String(l.id));
      if (c) LEAD_CONTACT_FIELDS.forEach((f) => { if (c[f]) merged[f] = c[f]; });
      return merged;
    }), meta);

    const onContactsError = (err) => {
      if (err?.code !== 'permission-denied') console.warn('Firebase lead contacts warning:', err);
    };

    if (contactsMode === 'desk') {
      contactUnsubs.push(onSnapshot(
        query(collection(db, 'lead_contacts'), where('assignedTo', 'in', [desk, UNASSIGNED_DESK]), limit(maxCount * 4)),
        (snap) => { contacts = new Map(snap.docs.map((d) => [d.id, d.data()])); emit(); },
        onContactsError
      ));
    }

    const followLeadIds = () => {
      if (contactsMode !== 'all') return;
      const ids = leads.map((l) => String(l.id)).sort();
      const key = ids.join('|');
      if (key === contactIdsKey) return;
      contactIdsKey = key;
      stopContacts();
      contacts = new Map();
      for (let i = 0; i < ids.length; i += 30) {
        const chunk = ids.slice(i, i + 30);
        contactUnsubs.push(onSnapshot(
          query(collection(db, 'lead_contacts'), where(documentId(), 'in', chunk)),
          (snap) => {
            chunk.forEach((id) => contacts.delete(id));
            snap.docs.forEach((d) => contacts.set(d.id, d.data()));
            emit();
          },
          onContactsError
        ));
      }
    };

    const base = collection(db, 'leads');
    const q = desk
      ? query(base, where('assignedTo', 'in', [desk, UNASSIGNED_DESK]), orderBy('createdAt', 'desc'), limit(maxCount))
      : query(base, orderBy('createdAt', 'desc'), limit(maxCount));
    // includeMetadataChanges: also hear "now confirmed by the server" (fromCache true → false),
    // which the CRM needs to know the list is complete
    const unsubLeads = onSnapshot(q, { includeMetadataChanges: true }, (snapshot) => {
      leads = snapshot.docs.map(d => ({ ...d.data(), id: d.id }));
      // fromCache snapshots can hold only this device's pending writes — not the full list
      meta = { fromCache: snapshot.metadata.fromCache };
      followLeadIds();
      emit();
    }, (err) => {
      // Guests and non-CRM accounts have no lead access — expected, stay quiet
      if (err && err.code === 'permission-denied') return;
      console.warn('Firebase subscribeToLeads snapshot warning:', err);
    });
    return () => { unsubLeads(); stopContacts(); };
  };

  const stopSnapshot = () => {
    if (unsubSnapshot) unsubSnapshot();
    unsubSnapshot = null;
  };

  try {
    if (!auth) {
      unsubSnapshot = listen(null, null);
      return stopSnapshot;
    }
    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      const version = ++authVersion;
      stopSnapshot();
      if (!user) {
        callback([], { signedOut: true });
        return;
      }
      let claims = {};
      try {
        claims = (await user.getIdTokenResult()).claims || {};
      } catch { /* treat as no desk; rules decide */ }
      if (version !== authVersion) return; // a newer auth change already took over
      const desk = DESK_BY_ROLE[claims.role] || null;
      const seesAllContacts = claims.admin === true || ADMIN_USER_IDS.has(user.uid)
        || ['admin', 'super_admin', 'sales_manager'].includes(claims.role);
      unsubSnapshot = listen(desk, desk ? 'desk' : (seesAllContacts ? 'all' : null));
    });
    return () => {
      authVersion++;
      unsubAuth();
      stopSnapshot();
    };
  } catch (error) {
    console.error('Firebase subscribeToLeads error:', error);
    return null;
  }
};

/**
 * Update a specific field on a lead document in Firestore.
 */
export const updateLeadField = async (leadId, fieldUpdates) => {
  if (isFirebaseConfigured() && db) {
    try {
      const leadRef = doc(db, 'leads', leadId);
      const { lead, contact } = splitLeadFields(fieldUpdates);
      const touchesContact = Object.keys(contact).length > 0 || 'assignedTo' in lead;
      const batch = writeBatch(db);
      // merge also supports leads that were created locally before Firebase
      // was connected, instead of failing because the document does not exist.
      batch.set(leadRef, { ...lead, updatedAt: serverTimestamp() }, { merge: true });
      if (touchesContact) {
        // The contact doc follows the lead's desk (rules check both in the same batch)
        let desk = lead.assignedTo;
        if (desk === undefined) {
          const snap = await getDoc(leadRef);
          desk = deskOf(snap.exists() ? snap.data() : {});
        }
        batch.set(doc(db, 'lead_contacts', leadId), { ...contact, assignedTo: desk || UNASSIGNED_DESK }, { merge: true });
      }
      await batch.commit();
      return true;
    } catch (error) {
      console.error('Firebase updateLeadField error:', error);
      return false;
    }
  }
  return false;
};

/**
 * Move contact fields still stored on lead docs (written before the split, or by an older
 * build) into lead_contacts. Managers' CRM sessions call this; returns how many were moved.
 */
export const migrateInlineLeadContacts = async (leads) => {
  if (!isFirebaseConfigured() || !db || !Array.isArray(leads)) return 0;
  let moved = 0;
  for (const item of leads) {
    if (!item?._inlineContact || !item.id) continue;
    try {
      const leadRef = doc(db, 'leads', String(item.id));
      const snap = await getDoc(leadRef);
      if (!snap.exists()) continue;
      const data = snap.data();
      const { contact } = splitLeadFields(data);
      const batch = writeBatch(db);
      batch.set(doc(db, 'lead_contacts', String(item.id)), { ...contact, assignedTo: deskOf(data) }, { merge: true });
      batch.update(leadRef, Object.fromEntries(LEAD_CONTACT_FIELDS.filter((f) => f in data).map((f) => [f, deleteField()])));
      await batch.commit();
      moved++;
    } catch (error) {
      console.error('Firebase migrateInlineLeadContacts error:', error);
    }
  }
  return moved;
};

/**
 * Delete a lead from Firestore.
 */
export const deleteLead = async (leadId) => {
  if (isFirebaseConfigured() && db) {
    try {
      const batch = writeBatch(db);
      batch.delete(doc(db, 'leads', leadId));
      batch.delete(doc(db, 'lead_contacts', leadId));
      await batch.commit();
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
export const subscribeToDeals = (callback, desk = null) => {
  if (isFirebaseConfigured() && db) {
    try {
      // Desk agents may only list their own desk's deals (firestore.rules) — callers pass their desk
      const q = desk
        ? query(collection(db, 'deals'), where('assignedTo', 'in', [desk, UNASSIGNED_DESK]))
        : query(collection(db, 'deals'), orderBy('updatedAt', 'desc'));
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

// ── Request contacts (demands, remote inspections, trade-ins) ───────────────────
// The client's phone/whatsapp/email go to request_contacts/{kind}__{id}, readable only by roles
// that may see client phones (firestore.rules seesClientContacts); the request itself keeps the
// rest, which every CRM role can read. Written in one batch with the request.
export const REQUEST_CONTACT_FIELDS = ['phone', 'whatsapp', 'email'];
const CONTACT_ROLES = ['admin', 'super_admin', 'sales_manager', 'sales_agent', 'agent_east', 'agent_new_sohag'];
const MANAGER_ROLES = ['admin', 'super_admin', 'sales_manager'];

const requestContactRef = (kind, id) => doc(db, 'request_contacts', `${kind}__${id}`);

const splitRequestFields = (record) => {
  const rest = {};
  const contact = {};
  for (const [key, value] of Object.entries(record || {})) {
    if (value === undefined) continue;
    if (REQUEST_CONTACT_FIELDS.includes(key)) {
      if (value !== null && value !== '') contact[key] = String(value);
    } else {
      rest[key] = value;
    }
  }
  return { rest, contact };
};

/** The signed-in user's CRM claims: { seesContacts, isManager }. */
const contactAccess = async () => {
  const user = auth?.currentUser;
  if (!user) return { seesContacts: false, isManager: false };
  try {
    const claims = (await user.getIdTokenResult()).claims || {};
    const isManager = claims.admin === true || ADMIN_USER_IDS.has(user.uid) || MANAGER_ROLES.includes(claims.role);
    return { seesContacts: isManager || CONTACT_ROLES.includes(claims.role), isManager };
  } catch {
    return { seesContacts: false, isManager: false };
  }
};

/** Create a request and its contact doc together; returns the id used. */
const createRequestWithContact = async (kind, id, record) => {
  const { rest, contact } = splitRequestFields(record);
  const batch = writeBatch(db);
  batch.set(doc(db, kind, id), rest);
  batch.set(requestContactRef(kind, id), { kind, parentId: id, ...contact });
  await batch.commit();
  return id;
};

/** Contact edits made from the CRM go to the contact doc (best effort: roles that can't see phones can't write them either). */
const updateRequestContact = async (kind, id, contact) => {
  if (Object.keys(contact).length === 0) return;
  try {
    await setDoc(requestContactRef(kind, id), { kind, parentId: String(id), ...contact }, { merge: true });
  } catch (error) {
    if (error?.code !== 'permission-denied') console.error(`Firebase request contact [${kind}] error:`, error);
  }
};

/**
 * Wrap a staff list listener: merge contact docs in for roles allowed to see them, and let a
 * manager's session move phones still stored on the request (older records, older builds)
 * into request_contacts. `start(emit)` must start the list listener and return its unsubscribe.
 */
const withRequestContacts = (kind, callback, start) => {
  let items = null;
  let meta = {};
  let contacts = new Map();
  let unsubContacts = null;
  let access = { seesContacts: false, isManager: false };
  const migrated = new Set();

  const emit = () => items && callback(items.map((r) => {
    const c = contacts.get(String(r.id));
    if (!c) return r;
    const merged = { ...r };
    REQUEST_CONTACT_FIELDS.forEach((f) => { if (c[f]) merged[f] = c[f]; });
    return merged;
  }), meta);

  const migrateInline = (list) => {
    if (!access.isManager) return;
    list.filter((r) => REQUEST_CONTACT_FIELDS.some((f) => f in r) && !migrated.has(r.id)).forEach((r) => {
      migrated.add(r.id);
      const { contact } = splitRequestFields(r);
      const batch = writeBatch(db);
      batch.set(requestContactRef(kind, String(r.id)), { kind, parentId: String(r.id), ...contact }, { merge: true });
      batch.update(doc(db, kind, String(r.id)), Object.fromEntries(REQUEST_CONTACT_FIELDS.filter((f) => f in r).map((f) => [f, deleteField()])));
      batch.commit().catch((error) => console.error(`Firebase migrate [${kind}] contacts error:`, error));
    });
  };

  const unsubList = start((list, listMeta = {}) => {
    items = list;
    meta = listMeta;
    if (!listMeta.fromCache && !listMeta.error) migrateInline(list);
    emit();
  });

  let stopped = false;
  contactAccess().then((a) => {
    access = a;
    if (stopped || !a.seesContacts) return;
    unsubContacts = onSnapshot(
      query(collection(db, 'request_contacts'), where('kind', '==', kind), limit(1000)),
      (snap) => { contacts = new Map(snap.docs.map((d) => [d.data().parentId, d.data()])); emit(); },
      (err) => { if (err?.code !== 'permission-denied') console.warn(`Firebase request contacts [${kind}] warning:`, err); }
    );
    if (items) migrateInline(items);
  });

  return () => {
    stopped = true;
    if (typeof unsubList === 'function') unsubList();
    if (unsubContacts) unsubContacts();
  };
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
      delete payload.id;
      // Keep the document id equal to the app's demand id, so approve/unpublish/delete
      // (which address the doc by that id) hit the same document instead of a random id.
      const hasId = demand.id !== undefined && demand.id !== null && demand.id !== '';
      const id = hasId ? String(demand.id) : doc(collection(db, 'demands')).id;
      await createRequestWithContact('demands', id, payload);
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
