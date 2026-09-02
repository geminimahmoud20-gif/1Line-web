// =============================================================
//  ONE LINE SOLUTIONS - FIREBASE CONFIGURATION
//  Replace the values below with your own Firebase project keys.
//  Get them from: https://console.firebase.google.com
//  Project Settings > General > Your apps > Web app > Config
// =============================================================

import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  // ⬇️ ضع بيانات مشروعك من Firebase Console هنا ⬇️
  apiKey: "AIzaSyDPgFF3temb0pgQfSbycUj3DMkZdzcNGRs",
  authDomain: "line-c9601.firebaseapp.com",
  projectId: "line-c9601",
  storageBucket: "line-c9601.firebasestorage.app",
  messagingSenderId: "229136955798",
  appId: "1:229136955798:web:26ce9b1ce054de874905b7",
  measurementId: "G-EXT5JHJMX3"
};

// Check if Firebase is configured (not placeholder)
export const isFirebaseConfigured = () => {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);
};

let app = null;
let db = null;
let auth = null;

try {
  if (isFirebaseConfigured()) {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
    console.log('✅ Firebase connected successfully — بيانات العملاء ستُخزن في السحابة.');
  } else {
    console.warn('⚠️ Firebase not configured — using localStorage fallback. Update src/firebase.js with your project keys.');
  }
} catch (error) {
  console.error('❌ Firebase initialization error:', error);
}

export { db, auth };
export default app;
