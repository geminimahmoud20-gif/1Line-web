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
  query,
  orderBy,
  onSnapshot,
  serverTimestamp
} from 'firebase/firestore';

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
      await updateDoc(leadRef, {
        ...fieldUpdates,
        updatedAt: serverTimestamp()
      });
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

// ===================== UTILITY =====================

/**
 * Check if Firebase is active and ready.
 */
export const isFirebaseActive = () => {
  return isFirebaseConfigured() && db !== null;
};

// ===================== AUTHENTICATION =====================

/**
 * Sign in with email and password using Firebase Auth.
 */
export const loginUser = async (email, password) => {
  if (isFirebaseConfigured() && auth) {
    const { signInWithEmailAndPassword } = await import('firebase/auth');
    return signInWithEmailAndPassword(auth, email, password);
  }
  throw new Error("Firebase Auth is not configured");
};

/**
 * Sign out the current user.
 */
export const logoutUser = async () => {
  if (isFirebaseConfigured() && auth) {
    const { signOut } = await import('firebase/auth');
    return signOut(auth);
  }
};

/**
 * Monitor user authentication state changes.
 */
export const monitorAuthState = (callback) => {
  if (isFirebaseConfigured() && auth) {
    // Dynamic import to avoid loading auth unless Firebase is active
    import('firebase/auth').then(({ onAuthStateChanged }) => {
      onAuthStateChanged(auth, callback);
    }).catch(err => console.error("Error loading auth listener:", err));
  }
};
