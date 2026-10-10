import { db, auth, isFirebaseConfigured } from '../firebase.js';

import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, sendPasswordResetEmail } from 'firebase/auth';

// ===================== UTILITY =====================

/**
 * Check if Firebase is active and ready.
 */
export const isFirebaseActive = () => {
  return isFirebaseConfigured() && db !== null;
};

export const isFirebaseAuthAvailable = () => isFirebaseConfigured() && auth !== null;

// Admin access comes from the ID token like every other CRM role: { role: 'super_admin', admin: true },
// set server-side (scripts/set-crm-role.mjs, scripts/ensure-admin-claim.mjs). Firestore rules check
// the same claims.
const hasRoleClaim = (claims) => claims.admin === true || typeof claims.role === 'string';
const refreshedFor = new Set();

/**
 * The user's custom claims. A role granted after sign-in only reaches the browser with a new token,
 * so when the cached token carries no role it is refreshed once per account per page load.
 */
export const getUserClaims = async (user) => {
  if (!user) return {};
  let claims = (await user.getIdTokenResult())?.claims || {};
  if (!hasRoleClaim(claims) && !refreshedFor.has(user.uid)) {
    refreshedFor.add(user.uid);
    claims = (await user.getIdTokenResult(true))?.claims || {};
  }
  return claims;
};

const isAdminClaims = (claims) => claims.admin === true || claims.role === 'admin' || claims.role === 'super_admin';

export const checkIsAdmin = async (user) => {
  if (!user) return false;
  try {
    return isAdminClaims(await getUserClaims(user));
  } catch {
    return false;
  }
};

import { accessFromClaims } from '../utils/accessModel.js';

// Staff roles are Firebase custom claims ({ role: 'sales_agent' }), set server-side with
// scripts/set-crm-role.mjs — a user cannot change their own claims. Must match firestore.rules.
export const CRM_STAFF_ROLES = ['sales_manager', 'sales_agent', 'property_manager', 'finance', 'viewer', 'agent_east', 'agent_new_sohag'];

/**
 * Resolves the CRM role for a signed-in user: 'super_admin', a staff role, or null (no CRM access).
 */
export const getCrmRole = async (user) => {
  if (!user) return null;
  try {
    const claims = await getUserClaims(user);
    if (isAdminClaims(claims)) return 'super_admin';
    if (claims.staff === true && claims.role) return claims.role;
    if (CRM_STAFF_ROLES.includes(claims.role)) return claims.role;
    return null;
  } catch {
    return null; // fail closed
  }
};

/**
 * Resolves full structured CRM access (role, desk, perms, flags)
 */
export const getCrmAccess = async (user) => {
  if (!user) return { role: null, desk: '', perms: [], isAdmin: false, isStaff: false };
  try {
    const claims = await getUserClaims(user);
    return accessFromClaims(claims);
  } catch {
    return { role: null, desk: '', perms: [], isAdmin: false, isStaff: false };
  }
};

// ===================== AUDIT LOGS =====================

/**
 * Persist an immutable audit log entry to Firestore (Canonical 9-field forensic schema).
 */
export const logAuditEvent = async ({
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
  type,
  metadata
}) => {
  // The rules only accept entries whose actor is the signed-in account, so identity always comes
  // from auth.currentUser (the actor/actorId arguments are kept for older callers but not trusted).
  const currentAuthUser = auth?.currentUser;
  if (isFirebaseConfigured() && db && currentAuthUser) {
    try {
      const effectiveActorId = currentAuthUser.uid;
      const effectiveAction = String(action || type || actionType || 'GENERAL_ACTION').toUpperCase().replace(/[^A-Z0-9_]/g, '_').slice(0, 64);
      const effectiveEntityType = String(entityType || targetCollection || 'general').slice(0, 64);
      const effectiveEntityId = String(entityId || targetId || 'global').slice(0, 20000);
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
        actorEmail: currentAuthUser.email || '',
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
 * Email a password-reset link (Firebase's own page sets the new password).
 * Resolves the same way whether or not the address has an account, so the login screen never
 * tells a stranger which emails exist. Only a malformed address or rate limiting rejects.
 */
export const requestPasswordReset = async (email, lang = 'ar') => {
  if (!isFirebaseAuthAvailable()) throw new Error('Firebase Auth is not configured');
  auth.languageCode = lang === 'ar' ? 'ar' : 'en';
  try {
    await sendPasswordResetEmail(auth, String(email || '').trim());
  } catch (error) {
    if (error?.code === 'auth/user-not-found') return;
    throw error;
  }
};

/**
 * Sign out the current user.
 */
export const logoutUser = async () => {
  if (isFirebaseAuthAvailable()) {
    const currentUser = auth?.currentUser;
    if (currentUser) {
      // Sent before signing out (afterwards the rules reject it), but never holds logout up for long
      await Promise.race([
        logAuditEvent({ actionType: 'CRM_LOGOUT', targetCollection: 'users', targetId: currentUser.uid }),
        new Promise((resolve) => setTimeout(resolve, 3000))
      ]);
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
    // Team and fine-grained permissions come from the same token as the role
    const access = await getCrmAccess(user);
    callback(true, {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName || user.email?.split('@')[0] || 'Admin',
      role,
      perms: access.role ? access.perms : [],
      desk: access.desk || ''
    });
  });
};
