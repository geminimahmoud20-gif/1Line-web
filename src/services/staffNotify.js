import { auth } from '../firebase.js';

// Ask api/notify.js to WhatsApp the sales team about a record a visitor just created. The server
// reads the record itself and alerts each one once, so this only names it. Fire-and-forget:
// a missing or unconfigured route (local dev, no WhatsApp set up) changes nothing for the visitor.
// Records staff create from inside the CRM don't alert — they already know.
export const notifyStaff = (kind, id) => {
  try {
    if (!id || typeof window === 'undefined' || window.location.protocol !== 'https:' || auth?.currentUser) return;
    fetch('/api/notify', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ kind, id: String(id) }),
      keepalive: true // still sent when the visitor is redirected to WhatsApp right after submitting
    }).catch(() => {});
  } catch { /* never affects the form */ }
};
