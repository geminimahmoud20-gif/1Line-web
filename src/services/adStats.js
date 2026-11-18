import { db, isFirebaseConfigured } from '../firebase.js';

import { collection, collectionGroup, doc, setDoc, onSnapshot, increment } from 'firebase/firestore';

// ===================== AD CAMPAIGN STATS =====================
// Campaigns themselves live in settings/ad_campaigns (public read, admin write).
// Counters live in ad_stats/{campaignId}; the rules only allow +1 steps on these two fields.

const AD_ID_RE = /^[A-Za-z0-9_-]{3,64}$/;
const SHARDS = 10;

export const incrementAdStat = async (campaignId, field) => {
  if (!['impressions', 'clicks'].includes(field) || !AD_ID_RE.test(String(campaignId))) return false;
  if (!isFirebaseConfigured() || !db) return false;
  try {
    // One of 10 shard docs at random: one document only takes about one write a second
    const shard = String(Math.floor(Math.random() * SHARDS));
    await setDoc(doc(db, 'ad_stats', String(campaignId), 'ad_stat_shards', shard), {
      impressions: increment(field === 'impressions' ? 1 : 0),
      clicks: increment(field === 'clicks' ? 1 : 0)
    }, { merge: true });
    return true;
  } catch (error) {
    console.warn('Ad stat write skipped:', error?.code || error);
    return false;
  }
};

/**
 * Staff-only listener: callback({ [campaignId]: { impressions, clicks } }).
 * Totals = the parent doc (counts written before sharding) + every shard.
 */
export const subscribeToAdStats = (callback) => {
  if (!isFirebaseConfigured() || !db) return null;
  let parents = {};
  let shards = {};
  const emit = () => {
    const ids = new Set([...Object.keys(parents), ...Object.keys(shards)]);
    callback(Object.fromEntries([...ids].map((id) => {
      const p = parents[id] || {};
      const s = shards[id] || {};
      return [id, {
        impressions: (Number(p.impressions) || 0) + (s.impressions || 0),
        clicks: (Number(p.clicks) || 0) + (s.clicks || 0)
      }];
    })));
  };
  try {
    const unsubParents = onSnapshot(collection(db, 'ad_stats'), (snap) => {
      parents = Object.fromEntries(snap.docs.map((d) => [d.id, d.data()]));
      emit();
    }, () => {});
    const unsubShards = onSnapshot(collectionGroup(db, 'ad_stat_shards'), (snap) => {
      const next = {};
      for (const d of snap.docs) {
        const id = d.ref.parent.parent?.id;
        if (!id) continue;
        const t = next[id] || (next[id] = { impressions: 0, clicks: 0 });
        t.impressions += Number(d.data().impressions) || 0;
        t.clicks += Number(d.data().clicks) || 0;
      }
      shards = next;
      emit();
    }, () => {});
    return () => { unsubParents(); unsubShards(); };
  } catch {
    return null;
  }
};
