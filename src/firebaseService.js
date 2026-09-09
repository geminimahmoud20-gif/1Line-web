// =============================================================
//  ONE LINE SOLUTIONS - FIREBASE DATA SERVICE LAYER
//  Handles all CRUD operations for Leads, Demands, and Notifications.
//  Falls back to localStorage if Firebase is not configured.
// =============================================================

import { db, auth, isFirebaseConfigured } from './firebase.js';
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
  orderBy,
  onSnapshot,
  serverTimestamp
} from 'firebase/firestore';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';

// ===================== PROPERTIES =====================

/**
 * Load all properties from Firestore (or return null for local fallback).
 */
export const loadProperties = async () => {
  if (isFirebaseConfigured() && db) {
    try {
      const q = query(collection(db, 'properties'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
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
      const docRef = await addDoc(collection(db, 'leads'), {
        ...lead,
        createdAt: serverTimestamp()
      });
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
export const loadLeads = async () => {
  if (isFirebaseConfigured() && db) {
    try {
      const q = query(collection(db, 'leads'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (error) {
      console.error('Firebase loadLeads error:', error);
      return null;
    }
  }
  return null; // signal to use localStorage
};

/**
 * Subscribe to real-time lead updates from Firestore.
 * Returns an unsubscribe function, or null if Firebase isn't configured.
 */
export const subscribeToLeads = (callback) => {
  if (isFirebaseConfigured() && db) {
    try {
      const q = query(collection(db, 'leads'), orderBy('createdAt', 'desc'));
      return onSnapshot(q, (snapshot) => {
        const leads = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        callback(leads);
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
      const docRef = await addDoc(collection(db, 'demands'), {
        ...demand,
        createdAt: serverTimestamp()
      });
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
export const subscribeToDemands = (callback) => {
  if (isFirebaseConfigured() && db) {
    try {
      const q = query(collection(db, 'demands'), orderBy('createdAt', 'desc'));
      return onSnapshot(q, (snapshot) => {
        const demands = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        callback(demands);
      });
    } catch (error) {
      console.error('Firebase subscribeToDemands error:', error);
      return null;
    }
  }
  return null;
};

/**
 * Load all demands from Firestore.
 */
export const loadDemands = async () => {
  if (isFirebaseConfigured() && db) {
    try {
      const q = query(collection(db, 'demands'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
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

const isAdminUser = (user) => Boolean(user && ADMIN_USER_IDS.has(user.uid));

// ===================== AUTHENTICATION =====================

/**
 * Sign in with email and password using Firebase Auth.
 */
export const loginUser = async (email, password) => {
  if (!isFirebaseAuthAvailable()) {
    throw new Error('Firebase Auth is not configured');
  }

  const credential = await signInWithEmailAndPassword(auth, email, password);
  if (!isAdminUser(credential.user)) {
    await signOut(auth);
    throw new Error('This account is not authorized to access the CRM');
  }
  return credential;
};

/**
 * Sign out the current user.
 */
export const logoutUser = async () => {
  if (isFirebaseAuthAvailable()) {
    return signOut(auth);
  }
};

/**
 * Monitor user authentication state changes.
 */
export const monitorAuthState = (callback) => {
  if (!isFirebaseAuthAvailable()) {
    callback(false);
    return () => {};
  }

  return onAuthStateChanged(auth, (user) => {
    if (!user) return callback(false);
    callback(isAdminUser(user));
  });
};
