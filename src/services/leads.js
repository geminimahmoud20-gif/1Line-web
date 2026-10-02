import { db, auth, isFirebaseConfigured } from '../firebase.js';
import { DESK_BY_ROLE, UNASSIGNED_DESK } from '../utils/rbacRules.js';
import { enqueuePendingLead, readPendingLeads, writePendingLeads } from '../utils/leadQueue.js';
import { collection, getDocs, getDoc, doc, query, where, orderBy, limit, onSnapshot, serverTimestamp, writeBatch, deleteField, documentId } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { getUserClaims } from './auth.js';
import { notifyStaff } from './staffNotify.js';

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
// createdAt is a Firestore Timestamp (cloud writes) or an ISO string (older / offline-queued leads)
const createdMillis = (lead) => {
  const c = lead?.createdAt;
  if (c && typeof c.toMillis === 'function') return c.toMillis();
  const t = Date.parse(c || lead?.timestamp || '');
  return Number.isNaN(t) ? 0 : t;
};

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
    notifyStaff('leads', id);
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
    // A desk's queue is filtered on assignedTo only (no orderBy), so it needs no composite index;
    // it is sorted newest-first here. Desk queues are small, so a wider window keeps the newest.
    const q = desk
      ? query(base, where('assignedTo', 'in', [desk, UNASSIGNED_DESK]), limit(maxCount * 4))
      : query(base, orderBy('createdAt', 'desc'), limit(maxCount));
    // includeMetadataChanges: also hear "now confirmed by the server" (fromCache true → false),
    // which the CRM needs to know the list is complete
    const unsubLeads = onSnapshot(q, { includeMetadataChanges: true }, (snapshot) => {
      leads = snapshot.docs.map(d => ({ ...d.data(), id: d.id }));
      if (desk) leads = leads.sort((x, y) => createdMillis(y) - createdMillis(x)).slice(0, maxCount);
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
        claims = await getUserClaims(user);
      } catch { /* treat as no desk; rules decide */ }
      if (version !== authVersion) return; // a newer auth change already took over
      const desk = DESK_BY_ROLE[claims.role] || null;
      const seesAllContacts = claims.admin === true
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
