import { auth } from '../firebase.js';

// Pull what the Facebook / Instagram campaigns cost (api/ads-spend.js, which holds the Meta token).
// { ok: true, currency, campaigns, ads, names, skipped } or { ok: false, error }.
export const pullMetaSpend = async () => callAds();

/** One row per campaign for 'last_7d' | 'last_30d' | 'maximum': { ok, currency, campaigns } or { ok: false, error } */
export const pullMetaPerformance = async (preset = 'last_30d') => callAds({ mode: 'performance', preset });

async function callAds(payload) {
  const user = auth?.currentUser;
  if (!user) return { ok: false, error: 'unauthenticated' };
  let res;
  try {
    res = await fetch('/api/ads-spend', { method: 'POST', headers: { authorization: `Bearer ${await user.getIdToken()}`, ...(payload ? { 'content-type': 'application/json' } : {}) }, body: payload ? JSON.stringify(payload) : undefined });
  } catch {
    return { ok: false, error: 'network' };
  }
  let data = null;
  try { data = await res.json(); } catch { /* the site's HTML: no server functions here */ }
  if (!data) return { ok: false, error: 'no-api' };
  if (res.status === 503) return { ok: false, error: 'not-configured', token: data.token !== false, account: data.account !== false };
  if (res.status === 403) return { ok: false, error: 'forbidden' };
  if (res.status === 401) return { ok: false, error: 'bad-token' };
  if (!res.ok) return { ok: false, error: data.error || 'meta-error', detail: data.detail };
  return { ok: true, ...data };
}
