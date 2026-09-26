// =============================================================
//  Lazy facade over firebaseService.js
//  The Firebase SDK (~550KB) is fetched after first paint instead of blocking it.
//  Same function names as firebaseService; calls resolve once the SDK has loaded.
// =============================================================

let servicePromise = null;

export const loadFirebaseService = () => {
  if (!servicePromise) servicePromise = import('./firebaseService.js');
  return servicePromise;
};

// Warm the SDK once the browser is idle so the first form submit doesn't wait on the download.
if (typeof window !== 'undefined') {
  const warm = () => loadFirebaseService().catch(() => {});
  if ('requestIdleCallback' in window) window.requestIdleCallback(warm, { timeout: 4000 });
  else setTimeout(warm, 2500);
}

const lazyCall = (name) => async (...args) => {
  const svc = await loadFirebaseService();
  return svc[name](...args);
};

// Subscriptions must hand back an unsubscribe synchronously; it is honored even if the SDK is still loading.
const lazySubscribe = (name) => (...args) => {
  let unsub = null;
  let cancelled = false;
  loadFirebaseService()
    .then((svc) => {
      if (cancelled) return;
      const u = svc[name](...args);
      if (typeof u === 'function') unsub = u;
    })
    .catch(() => {});
  return () => {
    cancelled = true;
    if (unsub) unsub();
  };
};

// Keys are bundled in firebase.js, so "configured" is known without loading the SDK.
export const isFirebaseActive = () => true;

export const saveLead = lazyCall('saveLead');
export const saveNotification = lazyCall('saveNotification');
export const updateLeadField = lazyCall('updateLeadField');
export const deleteLead = lazyCall('deleteLead');
export const saveDemand = lazyCall('saveDemand');
export const updateDemandStatus = lazyCall('updateDemandStatus');
export const deleteDemandDoc = lazyCall('deleteDemandDoc');
export const logoutUser = lazyCall('logoutUser');
export const saveSettings = lazyCall('saveSettings');
export const loadSettings = lazyCall('loadSettings');
export const upsertCatalogItem = lazyCall('upsertCatalogItem');
export const deleteCatalogItem = lazyCall('deleteCatalogItem');
export const incrementAdStat = lazyCall('incrementAdStat');
export const uploadCmsMedia = lazyCall('uploadCmsMedia');

export const subscribeToLeads = lazySubscribe('subscribeToLeads');
export const subscribeToDemands = lazySubscribe('subscribeToDemands');
export const monitorAuthState = lazySubscribe('monitorAuthState');
export const subscribeToSettings = lazySubscribe('subscribeToSettings');
export const subscribeToCatalog = lazySubscribe('subscribeToCatalog');
export const subscribeToAdStats = lazySubscribe('subscribeToAdStats');
