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

// Meta campaigns paired by hand with a report campaign (campaign_spend/links): { metaCampaignId: campaignKey }.
// For the ones whose name can't match a link (Arabic names, or a different name than the utm_campaign).
const cleanLinks = (m) => {
  const out = {};
  for (const [k, v] of Object.entries(m && typeof m === 'object' ? m : {})) {
    if (k && k.length <= 64 && typeof v === 'string' && v && v.length <= 160) out[k] = v;
  }
  return out;
};

/** { metaCampaignId: key } or null when it can't be read */
export const loadCampaignLinks = async () => {
  if (!isFirebaseConfigured() || !db) return null;
  try {
    const snap = await getDoc(doc(db, 'campaign_spend', 'links'));
    return snap.exists() ? cleanLinks(snap.data().links) : {};
  } catch {
    return null;
  }
};

/** true when saved */
export const saveCampaignLinks = async (links) => {
  if (!isFirebaseConfigured() || !db) return false;
  try {
    await setDoc(doc(db, 'campaign_spend', 'links'), { links: cleanLinks(links), updatedAt: new Date().toISOString() });
    return true;
  } catch {
    return false;
  }
};

// Marketing spend per calendar month (campaign_spend/months): { 'YYYY-MM': { meta, other } }. meta is pulled from the
// ad account (api/ads-spend.js, mode 'monthly'); other is typed in for every other channel (Google, portals, print).
const cleanMonths = (m) => {
  const out = {};
  for (const [k, v] of Object.entries(m && typeof m === 'object' ? m : {})) {
    if (!/^\d{4}-\d{2}$/.test(k) || !v || typeof v !== 'object') continue;
    const meta = Math.round(Number(v.meta));
    const other = Math.round(Number(v.other));
    const row = {};
    if (Number.isFinite(meta) && meta > 0) row.meta = meta;
    if (Number.isFinite(other) && other > 0) row.other = other;
    if (Object.keys(row).length) out[k] = row;
  }
  return out;
};

/** { 'YYYY-MM': { meta, other } } or null when it can't be read (offline, no permission) */
export const loadMonthlySpend = async () => {
  if (!isFirebaseConfigured() || !db) return null;
  try {
    const snap = await getDoc(doc(db, 'campaign_spend', 'months'));
    return snap.exists() ? cleanMonths(snap.data().months) : {};
  } catch {
    return null;
  }
};

/** true when saved */
export const saveMonthlySpend = async (months) => {
  if (!isFirebaseConfigured() || !db) return false;
  try {
    await setDoc(doc(db, 'campaign_spend', 'months'), { months: cleanMonths(months), updatedAt: new Date().toISOString() });
    return true;
  } catch {
    return false;
  }
};
