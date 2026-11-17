import { useEffect, useSyncExternalStore } from 'react';
import { subscribeToSettings } from '../firebaseLazy';
import { setCampaignNames, listeners, namesVersion } from './campaignNamesStore.js';

export { setCampaignNames, customCampaignName, withCampaignName, allCampaignNames } from './campaignNamesStore.js';

/** Keeps the names in step with the cloud while mounted (call once, high in the CRM); re-renders on a change */
export function useCampaignNames() {
  useEffect(() => {
    const stop = subscribeToSettings('campaign_names', (d) => setCampaignNames(d?.names || {}));
    return () => { if (typeof stop === 'function') stop(); };
  }, []);
  useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, namesVersion, namesVersion);
}
