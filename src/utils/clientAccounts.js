// Client accounts remembered on this device, so a client who signed out can come back with just
// their WhatsApp number instead of registering again (and without a second lead in the CRM).
// Accounts live only in this browser; nothing here is checked against a server.
// Pure helpers taking a Storage-like object; unit-tested in tests/unit/client-accounts.test.mjs.

export const ACCOUNTS_KEY = 'oneline_client_accounts';
export const MAX_ACCOUNTS = 5;

const KEEP = ['id', 'name', 'email', 'whatsapp', 'phone', 'country', 'countryFlag', 'verified', 'verifiedAt', 'verificationMethod', 'role'];

/** "+20" + "01012345678" → "+201012345678" (a leading 0 is dropped) */
export function intlPhone(country = '+20', raw = '') {
  const digits = String(raw).replace(/\D/g, '');
  if (!digits) return '';
  const local = digits.startsWith('0') ? digits.slice(1) : digits;
  return `+${String(country).replace(/\D/g, '')}${local}`;
}

/** Digits only, the key accounts and saved favourites are stored under */
export const phoneKey = (phone) => String(phone || '').replace(/\D/g, '');

export function readAccounts(storage) {
  try {
    const parsed = JSON.parse(storage?.getItem(ACCOUNTS_KEY) || '{}');
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

/** Remember an account on this device (newest first, at most MAX_ACCOUNTS) */
export function rememberAccount(storage, account) {
  const key = phoneKey(account?.whatsapp || account?.phone);
  if (!key || !account?.name) return null;
  const slim = Object.fromEntries(KEEP.filter((k) => account[k] !== undefined).map((k) => [k, account[k]]));
  const entry = { ...slim, lastSeenAt: new Date().toISOString() };
  const others = Object.entries(readAccounts(storage)).filter(([k]) => k !== key)
    .sort(([, a], [, b]) => String(b.lastSeenAt || '').localeCompare(String(a.lastSeenAt || '')))
    .slice(0, MAX_ACCOUNTS - 1);
  try {
    storage?.setItem(ACCOUNTS_KEY, JSON.stringify(Object.fromEntries([[key, entry], ...others])));
  } catch { /* storage full or blocked — the client just registers again */ }
  return entry;
}

export function findAccount(storage, phone) {
  const key = phoneKey(phone);
  return key ? readAccounts(storage)[key] || null : null;
}

/** Remove an account from this device (the "forget me here" choice on sign-out) */
export function forgetAccount(storage, phone) {
  const key = phoneKey(phone);
  const all = readAccounts(storage);
  if (!key || !all[key]) return false;
  delete all[key];
  try { storage?.setItem(ACCOUNTS_KEY, JSON.stringify(all)); } catch { /* ignore */ }
  return true;
}
