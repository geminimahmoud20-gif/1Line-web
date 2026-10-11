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

// Visitors see the site without the SDK (listings come from /api/catalog), so on a phone its
// ~170 KB (gzip) waits for the first touch, click or key, or a few seconds — whichever is first.
// (Not 'scroll': the router's scroll-to-top fires it on load; a finger scroll starts with a touch.)
// Pages that work with Firebase from the start (CRM, client account, buyer requests) open it at
// once, and any explicit call (a form submit, a CRM action) loads it immediately.
const EAGER_PATHS = /^\/(crm|my-account|demands)(\/|$)/;
const GATE_DELAY_MS = 6000;
let openGate = () => {};
const gate = new Promise((resolve) => { openGate = resolve; });
if (typeof window === 'undefined' || EAGER_PATHS.test(window.location.pathname)) {
  openGate();
} else {
  const events = ['pointerdown', 'touchstart', 'keydown'];
  const open = () => {
    events.forEach((e) => window.removeEventListener(e, open, true));
    openGate();
  };
  events.forEach((e) => window.addEventListener(e, open, { capture: true, passive: true }));
  setTimeout(open, GATE_DELAY_MS);
}

const lazyCall = (name) => async (...args) => {
  openGate();
  const svc = await loadFirebaseService();
  return svc[name](...args);
};

// Background calls (ad counters, error reports) wait for the gate instead of opening it,
// so an impression on a listing page doesn't pull the SDK onto a visitor's phone by itself.
const backgroundCall = (name) => async (...args) => {
  await gate;
  const svc = await loadFirebaseService();
  return svc[name](...args);
};

// Subscriptions must hand back an unsubscribe synchronously; it is honored even if the SDK is still loading.
const lazySubscribe = (name) => (...args) => {
  let unsub = null;
  let cancelled = false;
  gate
    .then(loadFirebaseService)
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
export const syncPendingLeads = lazyCall('syncPendingLeads');
export const saveNotification = lazyCall('saveNotification');
export const updateLeadField = lazyCall('updateLeadField');
export const deleteLead = lazyCall('deleteLead');
export const saveDemand = lazyCall('saveDemand');
export const updateDemandStatus = lazyCall('updateDemandStatus');
export const deleteDemandDoc = lazyCall('deleteDemandDoc');
export const reconcilePublicDemands = lazyCall('reconcilePublicDemands');
export const logoutUser = lazyCall('logoutUser');
export const saveSettings = lazyCall('saveSettings');
export const loadSettings = lazyCall('loadSettings');
export const settingsExist = lazyCall('settingsExist');
export const upsertCatalogItem = lazyCall('upsertCatalogItem');
export const upsertCatalogItems = lazyCall('upsertCatalogItems');
export const importLeads = lazyCall('importLeads');
export const restoreLeads = lazyCall('restoreLeads');
export const mergeLeads = lazyCall('mergeLeads');
export const loadAllLeadsForStats = lazyCall('loadAllLeadsForStats');
export const loadLeadChangesSince = lazyCall('loadLeadChangesSince');
export const loadAnalyticsDays = lazyCall('loadAnalyticsDays');
export const loadTopAnalyticsProperties = lazyCall('loadTopAnalyticsProperties');
export const loadHotVisitors = lazyCall('loadHotVisitors');
export const loadRecentSessions = lazyCall('loadRecentSessions');
export const loadVisitorJourney = lazyCall('loadVisitorJourney');
export const moveLeadsToArea = lazyCall('moveLeadsToArea');
export const moveDemandsToArea = lazyCall('moveDemandsToArea');
export const searchLeads = lazyCall('searchLeads');
export const recordClientDownload = lazyCall('recordClientDownload');
export const deleteCatalogItem = lazyCall('deleteCatalogItem');
export const incrementAdStat = backgroundCall('incrementAdStat');
export const reportClientError = backgroundCall('reportClientError');
export const deleteClientErrors = lazyCall('deleteClientErrors');
export const uploadCmsMedia = lazyCall('uploadCmsMedia');
export const getCmsStorageStatus = lazyCall('getCmsStorageStatus');
export const submitIntakeRecord = lazyCall('submitIntakeRecord');
export const updateIntakeRecord = lazyCall('updateIntakeRecord');

export const subscribeToLeads = lazySubscribe('subscribeToLeads');
export const subscribeToClientDownloads = lazySubscribe('subscribeToClientDownloads');
export const subscribeToDemands = lazySubscribe('subscribeToDemands');
export const monitorAuthState = lazySubscribe('monitorAuthState');
export const subscribeToSettings = lazySubscribe('subscribeToSettings');
export const subscribeToCatalog = lazySubscribe('subscribeToCatalog');
export const subscribeToAdStats = lazySubscribe('subscribeToAdStats');
export const subscribeToClientErrors = lazySubscribe('subscribeToClientErrors');
export const subscribeToIntake = lazySubscribe('subscribeToIntake');
