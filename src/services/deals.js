import { db, isFirebaseConfigured } from '../firebase.js';
import { UNASSIGNED_DESK } from '../utils/rbacRules.js';

import { collection, addDoc, deleteDoc, doc, setDoc, query, where, orderBy, onSnapshot, serverTimestamp } from 'firebase/firestore';

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
