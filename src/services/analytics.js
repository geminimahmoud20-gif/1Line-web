import { db, isFirebaseConfigured } from '../firebase.js';
import { collection, doc, getDoc, getDocs, query, where, orderBy, limit, documentId } from 'firebase/firestore';

// Visitor analytics written by /api/track (see api/_track-core.js). Readable with ld.manage.

const plain = (snap) => snap.docs.map((d) => ({ id: d.id, ...d.data() }));
const guard = async (fn, fallback) => {
  if (!isFirebaseConfigured() || !db) return { ok: false, reason: 'not-configured', data: fallback };
  try {
    return { ok: true, data: await fn() };
  } catch (error) {
    console.warn('analytics read failed:', error?.code || error);
    return { ok: false, reason: error?.code === 'permission-denied' ? 'denied' : 'error', data: fallback };
  }
};

/** Daily counter shards from `fromDay` (YYYY-MM-DD, Cairo) onwards. */
export const loadAnalyticsDays = (fromDay) => guard(async () => plain(await getDocs(
  query(collection(db, 'analytics_daily'), where('date', '>=', fromDay))
)), []);

export const loadTopAnalyticsProperties = (max = 15) => guard(async () => plain(await getDocs(
  query(collection(db, 'analytics_properties'), orderBy('views', 'desc'), limit(max))
)), []);

export const loadHotVisitors = (max = 20) => guard(async () => plain(await getDocs(
  query(collection(db, 'analytics_visitors'), orderBy('intent', 'desc'), limit(max))
)), []);

export const loadRecentSessions = (max = 30) => guard(async () => plain(await getDocs(
  query(collection(db, 'analytics_sessions'), orderBy('lastSeenAt', 'desc'), limit(max))
)), []);

/** One visitor's profile and their latest raw event batches (newest first). */
export const loadVisitorJourney = (visitorId, maxBatches = 25) => guard(async () => {
  if (!/^v_[A-Za-z0-9_-]{8,64}$/.test(String(visitorId || ''))) return { profile: null, batches: [] };
  const [profileSnap, batchSnap] = await Promise.all([
    getDoc(doc(db, 'analytics_visitors', visitorId)),
    getDocs(query(collection(db, 'analytics_visitors', visitorId, 'batches'), orderBy(documentId(), 'desc'), limit(maxBatches))),
  ]);
  return {
    profile: profileSnap.exists() ? { id: profileSnap.id, ...profileSnap.data() } : null,
    batches: plain(batchSnap),
  };
}, { profile: null, batches: [] });
