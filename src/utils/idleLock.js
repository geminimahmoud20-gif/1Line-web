// CRM auto-lock: after N minutes with no mouse, keyboard or touch activity the CRM signs out and
// asks for the password again. Matters most for the installed desktop app, which otherwise stays
// signed in on a shared computer. The last activity is kept in localStorage so every CRM window on
// the device shares it, and an app reopened the next morning locks straight away.
// Pure helpers (tests/unit/idle-lock.test.mjs) + storage accessors.

export const LOCK_OPTIONS = [15, 30, 60, 120, 0]; // minutes; 0 = never
export const DEFAULT_LOCK_MINUTES = 30;
const MINUTES_KEY = 'oneline_crm_lock_minutes';
const LAST_ACTIVE_KEY = 'oneline_crm_last_active';
export const LOCKED_FLAG = 'oneline_crm_idle_locked';

const read = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const write = (k, v) => { try { localStorage.setItem(k, v); } catch { /* storage unavailable */ } };

/** Minutes before locking on this device (0 = never) */
export function getLockMinutes() {
  const n = Number(read(MINUTES_KEY));
  return LOCK_OPTIONS.includes(n) && read(MINUTES_KEY) !== null ? n : DEFAULT_LOCK_MINUTES;
}
export const setLockMinutes = (m) => write(MINUTES_KEY, String(LOCK_OPTIONS.includes(Number(m)) ? Number(m) : DEFAULT_LOCK_MINUTES));

export const getLastActive = () => Number(read(LAST_ACTIVE_KEY)) || 0;
export const markCrmActive = (now = Date.now()) => write(LAST_ACTIVE_KEY, String(now));

/** True when the session has been idle for longer than the limit (never with 0 or no record yet) */
export function isIdleExpired(lastActive, now, minutes) {
  if (!minutes || !lastActive) return false;
  return now - lastActive >= minutes * 60 * 1000;
}

export const lockLabel = (m, isAr = true) => {
  if (!m) return isAr ? 'أبداً' : 'Never';
  if (m < 60) return isAr ? `بعد ${m} دقيقة` : `After ${m} min`;
  const h = m / 60;
  return isAr ? (h === 1 ? 'بعد ساعة' : h === 2 ? 'بعد ساعتين' : `بعد ${h} ساعات`) : `After ${h} h`;
};
