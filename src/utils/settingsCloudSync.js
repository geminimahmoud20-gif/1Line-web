// =============================================================
//  Site settings edited in the CRM (hero video & clips, ad campaigns, areas) are saved to this
//  browser first and to Firestore settings/* in the background. Visitors only ever get the
//  Firestore copy, so a cloud save that failed leaves the change visible on the admin's device
//  and nowhere else.
//
//  When a super admin opens the CRM, any of these settings that exist here but not in Firestore
//  are uploaded. A document that already exists in Firestore is never overwritten from here.
// =============================================================

import { settingsExist, saveSettings } from '../firebaseLazy.js';
import { getFounderSettings } from './founderCmsData.js';

// Firestore doc → how to rebuild it from this browser's copy (null = nothing local to upload)
const LOCAL_SETTINGS = {
  // getFounderSettings drops videos embedded as data: URLs, exactly as a normal CRM save does
  founder_cms: () => (readJson('oneline_founder_cms_settings') ? getFounderSettings() : null),
  ad_campaigns: () => {
    const list = readJson('oneline_ad_campaigns');
    if (!Array.isArray(list) || list.length === 0) return null;
    return { campaigns: list, campaignIds: list.map((c) => String(c?.id || '')).filter(Boolean) };
  },
  areas_cms: () => {
    const areas = readJson('oneline_custom_areas');
    return Array.isArray(areas) && areas.length > 0 ? { areas, updatedAt: new Date().toISOString() } : null;
  }
};

function readJson(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || 'null');
  } catch {
    return null;
  }
}

/** Resolves to { uploaded: [keys], failed: [keys] } */
export async function pushLocalSettingsMissingFromCloud() {
  const uploaded = [];
  const failed = [];
  for (const [key, build] of Object.entries(LOCAL_SETTINGS)) {
    const local = build();
    if (!local) continue;
    try {
      if (await settingsExist(key)) continue;
    } catch {
      continue; // can't tell whether it exists — never risk overwriting
    }
    const ok = await saveSettings(key, local).catch(() => false);
    (ok === false ? failed : uploaded).push(key);
  }
  return { uploaded, failed };
}
