import { db, isFirebaseConfigured } from '../firebase.js';
import { doc, getDoc, setDoc } from 'firebase/firestore';

// What each ad campaign cost, shared by the sales managers (campaign_spend/all, managers only).
// Used by the CRM «تقرير الحملات».

const clean = (m) => {
  const out = {};
  for (const [k, v] of Object.entries(m && typeof m === 'object' ? m : {})) {
    const n = Math.round(Number(v));
    if (k && k.length <= 160 && Number.isFinite(n) && n > 0) out[k] = n;
  }
  return out;
};

/** { key: amount } or null when it can't be read (offline, no permission) */
export const loadCampaignSpend = async () => {
  if (!isFirebaseConfigured() || !db) return null;
  try {
    const snap = await getDoc(doc(db, 'campaign_spend', 'all'));
    return snap.exists() ? clean(snap.data().amounts) : {};
  } catch {
    return null;
  }
};

/** true when saved */
export const saveCampaignSpend = async (amounts) => {
  if (!isFirebaseConfigured() || !db) return false;
  try {
    await setDoc(doc(db, 'campaign_spend', 'all'), { amounts: clean(amounts), updatedAt: new Date().toISOString() });
    return true;
  } catch {
    return false;
  }
};
