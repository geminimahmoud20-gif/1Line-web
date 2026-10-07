// =============================================================
//  Access config client service: real-time subscription to roles & teams,
//  and API mutators that call /api/team (handled server-side with service account).
// =============================================================

import { doc, onSnapshot, getDoc } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../firebase';
import { teamAction } from '../firebaseService';
import { DEFAULT_ACCESS, normalizeAccess } from '../utils/accessModel.js';

const STORAGE_KEY = 'oneline_crm_access_config';

const readCachedConfig = () => {
  if (typeof window === 'undefined') return DEFAULT_ACCESS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? normalizeAccess(raw) : DEFAULT_ACCESS;
  } catch {
    return DEFAULT_ACCESS;
  }
};

const writeCachedConfig = (cfg) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
  } catch { /* storage full */ }
};

let currentConfig = readCachedConfig();
if (typeof window !== 'undefined') window.__ACTIVE_ACCESS_CONFIG__ = currentConfig;
const listeners = new Set();

const notifyListeners = (cfg) => {
  currentConfig = cfg;
  if (typeof window !== 'undefined') window.__ACTIVE_ACCESS_CONFIG__ = cfg;
  writeCachedConfig(cfg);
  listeners.forEach((fn) => {
    try { fn(cfg); } catch (e) { console.error('accessConfig listener error:', e); }
  });
};

/**
 * Returns the latest in-memory access config synchronously
 */
export const getActiveAccessConfig = () => currentConfig;

/**
 * Subscribes to real-time changes in settings/access.
 * Returns unsubscribe function.
 */
export function subscribeToAccessConfig(callback) {
  listeners.add(callback);
  callback(currentConfig);

  if (!isFirebaseConfigured() || !db) {
    return () => listeners.delete(callback);
  }

  let unsubDoc = null;
  try {
    const accessDocRef = doc(db, 'settings', 'access');
    unsubDoc = onSnapshot(
      accessDocRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          const parsed = normalizeAccess(data?.json || data);
          notifyListeners(parsed);
        } else {
          notifyListeners(DEFAULT_ACCESS);
        }
      },
      (err) => {
        // If permission denied or offline, keep using cached/default
        if (err?.code !== 'permission-denied') {
          console.warn('subscribeToAccessConfig snapshot warning:', err);
        }
      }
    );
  } catch (err) {
    console.warn('subscribeToAccessConfig setup error:', err);
  }

  return () => {
    listeners.delete(callback);
    if (unsubDoc) unsubDoc();
  };
}

/**
 * Super Admin mutators via /api/team
 */
export async function saveRoleApi(role) {
  const res = await teamAction({ action: 'save_role', role });
  if (res.ok && res.access) notifyListeners(normalizeAccess(res.access));
  return res;
}

export async function deleteRoleApi(roleId, fallbackRoleId) {
  const res = await teamAction({ action: 'delete_role', roleId, fallbackRoleId });
  if (res.ok && res.access) notifyListeners(normalizeAccess(res.access));
  return res;
}

export async function saveTeamApi(team) {
  const res = await teamAction({ action: 'save_team', team });
  if (res.ok && res.access) notifyListeners(normalizeAccess(res.access));
  return res;
}

export async function deleteTeamApi(teamId, fallbackTeamId) {
  const res = await teamAction({ action: 'delete_team', teamId, fallbackTeamId });
  if (res.ok && res.access) notifyListeners(normalizeAccess(res.access));
  return res;
}
