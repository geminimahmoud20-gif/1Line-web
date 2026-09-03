// =============================================================
//  ONE LINE SOLUTIONS - FIREBASE DATA SERVICE LAYER
//  Handles all CRUD operations for Leads, Demands, and Notifications.
//  Falls back to localStorage if Firebase is not configured.
// =============================================================

import { db, auth, isFirebaseConfigured } from './firebase';
import {
  collection,
  addDoc,
  getDocs,
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

// ===================== LEADS =====================

/**
 * Save a new lead to Firestore (or localStorage fallback).
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
      console.error('Firebase saveLead error:', error);
      return lead; // fallback: return as-is
    }
  }
  // localStorage fallback handled by the app
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
