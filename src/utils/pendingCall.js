// =============================================================
//  The call that was just started from the CRM, kept in the browser so the «ردّ ولا ما ردّش؟» question can
//  be asked when the person comes back from the dialer, even if the phone put the page to sleep meanwhile.
//  Only the client's id and name, never the number. Pure apart from `storage` (injected in tests).
// =============================================================
const KEY = 'oneline_pending_call';
const MAX_AGE = 45 * 60 * 1000;

const defaultStorage = () => { try { return globalThis.localStorage; } catch { return null; } };

export function markCallStarted(lead, now = Date.now(), storage = defaultStorage()) {
  if (!lead?.id) return;
  try { storage?.setItem(KEY, JSON.stringify({ id: String(lead.id), name: String(lead.name || '').slice(0, 60), at: now })); } catch { /* storage is optional */ }
}

/** { id, name, at } of a call started in the last 45 minutes, else null */
export function readPendingCall(now = Date.now(), storage = defaultStorage()) {
  try {
    const v = JSON.parse(storage?.getItem(KEY) || 'null');
    return v && v.id && now - v.at >= 0 && now - v.at <= MAX_AGE ? v : null;
  } catch { return null; }
}

export function clearPendingCall(storage = defaultStorage()) {
  try { storage?.removeItem(KEY); } catch { /* storage is optional */ }
}
