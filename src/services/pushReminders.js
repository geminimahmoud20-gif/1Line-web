import { auth, db, isFirebaseConfigured } from '../firebase.js';
import { doc, getDoc, setDoc } from 'firebase/firestore';

// Phone reminders for follow-ups and late replies (Web Push). The hourly job
// (scripts/send-followup-reminders.mjs) creates the VAPID key pair the first time it runs and
// publishes the public half in settings/push; until then the option is not offered.
// Each device's subscription is kept in push_subscriptions/{uid} (own document only).

const MAX_DEVICES = 5;

export const pushSupported = () => typeof window !== 'undefined'
  && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

const keyBytes = (b64url) => {
  const pad = '='.repeat((4 - (b64url.length % 4)) % 4);
  const raw = atob((b64url + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
};

const loadPublicKey = async () => {
  if (!isFirebaseConfigured() || !db) return '';
  try {
    const snap = await getDoc(doc(db, 'settings', 'push'));
    return snap.exists() ? String(snap.data().vapidPublicKey || '') : '';
  } catch {
    return '';
  }
};

const currentSubscription = async () => {
  try {
    const reg = await navigator.serviceWorker.ready;
    return await reg.pushManager.getSubscription();
  } catch {
    return null;
  }
};

/** 'unsupported' | 'denied' | 'unavailable' (the job hasn't published its key yet) | 'off' | 'on' */
export async function pushReminderState() {
  if (!pushSupported()) return 'unsupported';
  if (Notification.permission === 'denied') return 'denied';
  if (Notification.permission === 'granted' && await currentSubscription()) return 'on';
  return (await loadPublicKey()) ? 'off' : 'unavailable';
}

/** Ask for permission, subscribe this device and save it. { ok } or { ok: false, error } */
export async function enablePushReminders({ manager = false, name = '' } = {}) {
  const uid = auth?.currentUser?.uid;
  if (!uid || !db) return { ok: false, error: 'unauthenticated' };
  if (!pushSupported()) return { ok: false, error: 'unsupported' };
  const publicKey = await loadPublicKey();
  if (!publicKey) return { ok: false, error: 'unavailable' };
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return { ok: false, error: 'denied' };
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = (await reg.pushManager.getSubscription())
      || await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(publicKey) });
    const json = sub.toJSON();
    const ref = doc(db, 'push_subscriptions', uid);
    const existing = await getDoc(ref);
    const others = ((existing.exists() && existing.data().subs) || []).filter((s) => s && s.endpoint && s.endpoint !== json.endpoint);
    // merge: the server's digest record in the same document must stay
    await setDoc(ref, { subs: [...others, { endpoint: json.endpoint, keys: json.keys }].slice(-MAX_DEVICES), manager: Boolean(manager), name: String(name).slice(0, 80), updatedAt: new Date().toISOString() }, { merge: true });
    return { ok: true };
  } catch {
    return { ok: false, error: 'failed' };
  }
}

/** Stop reminders on this device */
export async function disablePushReminders() {
  const uid = auth?.currentUser?.uid;
  try {
    const sub = await currentSubscription();
    const endpoint = sub?.endpoint;
    if (sub) await sub.unsubscribe();
    if (uid && db && endpoint) {
      const ref = doc(db, 'push_subscriptions', uid);
      const existing = await getDoc(ref);
      if (existing.exists()) {
        await setDoc(ref, { subs: (existing.data().subs || []).filter((s) => s.endpoint !== endpoint), updatedAt: new Date().toISOString() }, { merge: true });
      }
    }
    return true;
  } catch {
    return false;
  }
}
