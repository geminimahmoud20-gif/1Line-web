import { db, isFirebaseConfigured } from '../firebase.js';

import { collection, doc, setDoc, onSnapshot, increment } from 'firebase/firestore';

// ===================== AD CAMPAIGN STATS =====================
// Campaigns themselves live in settings/ad_campaigns (public read, admin write).
// Counters live in ad_stats/{campaignId}; the rules only allow +1 steps on these two fields.

const AD_ID_RE = /^[A-Za-z0-9_-]{3,64}$/;

export const incrementAdStat = async (campaignId, field) => {
  if (!['impressions', 'clicks'].includes(field) || !AD_ID_RE.test(String(campaignId))) return false;
  if (!isFirebaseConfigured() || !db) return false;
  try {
    await setDoc(doc(db, 'ad_stats', String(campaignId)), {
      impressions: increment(field === 'impressions' ? 1 : 0),
      clicks: increment(field === 'clicks' ? 1 : 0)
    }, { merge: true });
    return true;
  } catch (error) {
    console.warn('Ad stat write skipped:', error?.code || error);
    return false;
  }
};

/** Staff-only listener: callback({ [campaignId]: { impressions, clicks } }) */
export const subscribeToAdStats = (callback) => {
  if (!isFirebaseConfigured() || !db) return null;
  try {
    return onSnapshot(collection(db, 'ad_stats'), (snap) => {
      callback(Object.fromEntries(snap.docs.map((d) => [d.id, d.data()])));
    }, () => {});
  } catch {
    return null;
  }
};
