import { auth, db, isFirebaseConfigured } from '../firebase.js';
import { doc, getDoc, setDoc } from 'firebase/firestore';

// Ask api/notify.js to WhatsApp the sales team about a record a visitor just created. The server
// reads the record itself and alerts each one once, so this only names it. Fire-and-forget:
// a missing or unconfigured route (local dev, no WhatsApp set up) changes nothing for the visitor.
// Records staff create from inside the CRM don't alert — they already know.
const RETRY_MS = 20 * 1000;

export const notifyStaff = (kind, id) => {
  try {
    if (!id || typeof window === 'undefined' || window.location.protocol !== 'https:' || auth?.currentUser) return;
    const send = (retry) => fetch('/api/notify', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ kind, id: String(id) }),
      keepalive: true // still sent when the visitor is redirected to WhatsApp right after submitting
    }).then((res) => {
      // 502: no number received it (the server gave the record back) — one more try while the page is open
      if (res.status === 502 && retry) setTimeout(() => send(false), RETRY_MS);
    }).catch(() => {});
    send(true);
  } catch { /* never affects the form */ }
};

// ── CRM → إدارة المنظومة → تنبيهات الطلبات ──

/** notify_status/whatsapp: { lastOkAt, lastOkRef, lastFailAt, lastFailRef, channels } or null */
export const loadNotifyStatus = async () => {
  if (!isFirebaseConfigured() || !db) return null;
  try {
    const snap = await getDoc(doc(db, 'notify_status', 'whatsapp'));
    if (!snap.exists()) return null;
    const d = snap.data();
    const ms = (t) => (t && typeof t.toMillis === 'function' ? t.toMillis() : Date.parse(t || '') || 0);
    return { lastOkAt: ms(d.lastOkAt), lastOkRef: d.lastOkRef || '', lastFailAt: ms(d.lastFailAt), lastFailRef: d.lastFailRef || '', channels: Number(d.channels) || 0 };
  } catch {
    return null;
  }
};

/** «ابعت رسالة تجربة»: { ok, sent, channels } or { ok: false, error: 'not-configured' | 'send-failed' | 'forbidden' | 'no-api' | 'network' } */
export const sendTestAlert = async () => {
  const user = auth?.currentUser;
  if (!user) return { ok: false, error: 'unauthenticated' };
  let res;
  try {
    res = await fetch('/api/notify', {
      method: 'POST',
      headers: { authorization: `Bearer ${await user.getIdToken()}`, 'content-type': 'application/json' },
      body: JSON.stringify({ test: true })
    });
  } catch {
    return { ok: false, error: 'network' };
  }
  let data = null;
  try { data = await res.json(); } catch { /* the site's HTML: no server functions here */ }
  if (!data) return { ok: false, error: 'no-api' };
  if (res.status === 503) return { ok: false, error: 'not-configured', channels: data.channels || 0, serviceAccount: Boolean(data.serviceAccount) };
  if (res.status === 403) return { ok: false, error: 'forbidden' };
  if (!res.ok) return { ok: false, error: 'send-failed', channels: data.channels || 0 };
  return { ok: true, sent: data.sent || 0, channels: data.channels || 0 };
};

// ── The bell's "seen up to" time, per team member (staff_prefs/{uid}) ──

export const loadAlertsSeenAt = async () => {
  const uid = auth?.currentUser?.uid;
  if (!uid || !db) return 0;
  try {
    const snap = await getDoc(doc(db, 'staff_prefs', uid));
    return snap.exists() ? Number(snap.data().alertsSeenAt) || 0 : 0;
  } catch {
    return 0;
  }
};

export const saveAlertsSeenAt = async (ms) => {
  const uid = auth?.currentUser?.uid;
  if (!uid || !db) return false;
  try {
    await setDoc(doc(db, 'staff_prefs', uid), { alertsSeenAt: Math.round(ms) });
    return true;
  } catch {
    return false;
  }
};
