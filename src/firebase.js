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
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "000000000000",
  appId: "1:000000000000:web:xxxxxxxxxxxx"
};

// Check if Firebase is configured (not placeholder)
export const isFirebaseConfigured = () => {
  return firebaseConfig.apiKey !== "YOUR_API_KEY" && 
         firebaseConfig.projectId !== "YOUR_PROJECT_ID";
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
