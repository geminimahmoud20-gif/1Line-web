import { db, isFirebaseConfigured } from '../firebase.js';
import { collection, addDoc, onSnapshot, query, orderBy, limit, serverTimestamp } from 'firebase/firestore';

// ===================== CLIENT DOWNLOADS =====================
// A registered client (site account) downloaded a brochure, story card or file: one bounded
// record, which managers see live in the CRM ("العميل X حمّل Y").

export const DOWNLOAD_KINDS = ['property_brochure', 'story_card', 'project_brochure', 'investor_prospectus', 'compare_pdf'];

const clip = (v, n) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, n);

export const recordClientDownload = async ({ kind, itemId = '', itemTitle = '', client = {} }) => {
  if (!DOWNLOAD_KINDS.includes(kind) || !isFirebaseConfigured() || !db) return false;
  const name = clip(client.name, 100);
  if (!name) return false;
  try {
    await addDoc(collection(db, 'client_downloads'), {
      kind,
      itemId: clip(itemId, 128),
      itemTitle: clip(itemTitle, 200),
      clientName: name,
      clientPhone: clip(client.whatsapp || client.phone, 25),
      clientEmail: clip(client.email, 120),
      path: typeof window !== 'undefined' ? clip(window.location.pathname, 200) : '',
      createdAt: serverTimestamp()
    });
    return true;
  } catch (error) {
    console.warn('Download record skipped:', error?.code || error);
    return false;
  }
};

/** Managers: the latest downloads, newest first. callback([{ id, kind, ... }]) */
export const subscribeToClientDownloads = (callback, max = 50) => {
  if (!isFirebaseConfigured() || !db) return null;
  try {
    return onSnapshot(
      query(collection(db, 'client_downloads'), orderBy('createdAt', 'desc'), limit(max)),
      (snap) => callback(snap.docs.map((d) => ({ ...d.data(), id: d.id }))),
      () => {} // other roles may not read it
    );
  } catch {
    return null;
  }
};
