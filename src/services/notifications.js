import { db, auth, isFirebaseConfigured } from '../firebase.js';

import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

// ===================== NOTIFICATIONS =====================

/**
 * Save a notification/activity log entry.
 */
export const saveNotification = async (text) => {
  // Only staff may write notifications (firestore.rules); a visitor's request already reaches the
  // team through the leads listener and api/notify.js, so don't send a write that will be refused.
  if (isFirebaseConfigured() && db && auth?.currentUser) {
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
