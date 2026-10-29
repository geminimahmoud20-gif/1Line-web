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

// Warm the SDK: Immediate on /crm, /my-account, /demands.
// On visitor routes: loads only after first user touch/interaction or 6-second timer.
// Background subscriptions (site settings, FX rates, auth state) wait for the same signal, so they
// don't pull the SDK onto a slow phone while the first page is still painting.
let warmed = false;
let releaseWarm = () => {};
const warmSignal = new Promise((resolve) => { releaseWarm = resolve; });
const warm = () => {
  if (warmed) return;
  warmed = true;
  releaseWarm();
  loadFirebaseService().catch(() => {});
};
if (typeof window === 'undefined') {
  warmed = true;
  releaseWarm();
} else if (/^\/(crm|my-account|demands)($|\/)/.test(window.location.pathname)) {
  warm();
} else {
  const events = ['touchstart', 'pointerdown', 'keydown', 'scroll'];
  const onEvent = () => {
    events.forEach((ev) => window.removeEventListener(ev, onEvent));
    clearTimeout(timer);
    warm();
  };
  events.forEach((ev) => window.addEventListener(ev, onEvent, { passive: true, once: true }));
  const timer = setTimeout(onEvent, 6000);
}

// A direct call is something the visitor asked for (send a request, sign in): load right away.
const lazyCall = (name) => async (...args) => {
  warm();
  const svc = await loadFirebaseService();
  return svc[name](...args);
};

// Subscriptions must hand back an unsubscribe synchronously; it is honored even if the SDK is still loading.
const lazySubscribe = (name, { eager = false } = {}) => (...args) => {
  let unsub = null;
  let cancelled = false;
  (eager ? Promise.resolve() : warmSignal)
    .then(() => (cancelled ? null : loadFirebaseService()))
    .then((svc) => {
      if (!svc || cancelled) return;
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
export const loadNotifyStatus = lazyCall('loadNotifyStatus');
export const sendTestAlert = lazyCall('sendTestAlert');
export const loadAlertsSeenAt = lazyCall('loadAlertsSeenAt');
export const saveAlertsSeenAt = lazyCall('saveAlertsSeenAt');
export const updateLeadField = lazyCall('updateLeadField');
export const deleteLead = lazyCall('deleteLead');
export const deleteLeads = lazyCall('deleteLeads');
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
export const incrementAdStat = lazyCall('incrementAdStat');
export const reportClientError = lazyCall('reportClientError');
export const deleteClientErrors = lazyCall('deleteClientErrors');
export const resolveContactIntent = lazyCall('resolveContactIntent');
export const uploadCmsMedia = lazyCall('uploadCmsMedia');
export const getCmsStorageStatus = lazyCall('getCmsStorageStatus');
export const submitIntakeRecord = lazyCall('submitIntakeRecord');
export const updateIntakeRecord = lazyCall('updateIntakeRecord');

export const subscribeToLeads = lazySubscribe('subscribeToLeads');
export const subscribeToClientDownloads = lazySubscribe('subscribeToClientDownloads');
export const subscribeToDemands = lazySubscribe('subscribeToDemands');
export const monitorAuthState = lazySubscribe('monitorAuthState');
export const subscribeToSettings = lazySubscribe('subscribeToSettings');
// Only used when the CDN catalog is unavailable (or in the CRM): the listings themselves, so no wait
export const subscribeToCatalog = lazySubscribe('subscribeToCatalog', { eager: true });
export const subscribeToAdStats = lazySubscribe('subscribeToAdStats');
export const subscribeToClientErrors = lazySubscribe('subscribeToClientErrors');
export const subscribeToContactIntents = lazySubscribe('subscribeToContactIntents');
export const subscribeToIntake = lazySubscribe('subscribeToIntake');
