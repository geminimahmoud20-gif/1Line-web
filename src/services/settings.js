import { db, isFirebaseConfigured } from '../firebase.js';

import { getDoc, doc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { reportError } from '../utils/errorReporter.js';

// ===================== SETTINGS / CMS =====================

// Firestore rejects undefined anywhere in a document; form state often carries some
const dropUndefined = (v) => {
  if (Array.isArray(v)) return v.filter((x) => x !== undefined).map(dropUndefined);
  if (v && typeof v === 'object' && Object.getPrototypeOf(v) === Object.prototype) {
    return Object.fromEntries(Object.entries(v).filter(([, x]) => x !== undefined).map(([k, x]) => [k, dropUndefined(x)]));
  }
  return v;
};

// Firestore's document limit is 1 MiB; leave room for field names and the timestamp
const MAX_SETTINGS_BYTES = 1000 * 1000;

/**
 * Save site / founder CMS settings to Firestore.
 * A failure is also sent to CRM → System → Site errors: these settings are what visitors see,
 * and a save that only lands in the admin's own browser looks fine on that one device.
 */
export const saveSettings = async (key, data) => {
  if (isFirebaseConfigured() && db) {
    try {
      const clean = dropUndefined(data);
      const bytes = new Blob([JSON.stringify(clean)]).size;
      if (bytes > MAX_SETTINGS_BYTES) {
        throw Object.assign(new Error(`settings/${key} is ${Math.round(bytes / 1024)} KB — over Firestore's 1 MB limit (embedded image or video?)`), { code: 'too-large' });
      }
      const docRef = doc(db, 'settings', key);
      await setDoc(docRef, {
        ...clean,
        updatedAt: serverTimestamp()
      }, { merge: true });
      return true;
    } catch (error) {
      console.error(`Firebase saveSettings [${key}] error:`, error);
      reportError('error', { source: 'settings', message: `Settings not saved to the cloud — saveSettings ${key}: ${error?.code || ''} ${error?.message || error}`.trim() });
      return false;
    }
  }
  return false;
};

/**
 * Whether settings/{key} exists in Firestore. Unlike loadSettings, a failed read throws instead of
 * looking like "missing", so callers never mistake an error for an empty document.
 */
export const settingsExist = async (key) => {
  if (!isFirebaseConfigured() || !db) throw new Error('Firebase is not configured');
  const snapshot = await getDoc(doc(db, 'settings', key));
  return snapshot.exists();
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
