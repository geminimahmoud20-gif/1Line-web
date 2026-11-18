// =============================================================
//  Arabic names for campaign slugs («owners-leads-soh-owners-nov26» → «ملاك سوهاج نوفمبر»). The manager types them once
//  (CRM → حملات الإعلان); until then crmLabels.campaignLabel falls back to a word-by-word guess.
//  Stored in settings/campaign_names { names: { slug: name } }.
// =============================================================

let names = {};
let version = 0;
export const namesVersion = () => version;
export const listeners = new Set();
const emit = () => { version += 1; listeners.forEach((l) => l()); };

const clean = (map = {}) => Object.fromEntries(Object.entries(map)
  .map(([k, v]) => [String(k).trim().toLowerCase(), String(v ?? '').trim().slice(0, 60)])
  .filter(([k, v]) => k && v));

export const setCampaignNames = (map) => { names = clean(map); emit(); };
export const customCampaignName = (slug) => names[String(slug ?? '').trim().toLowerCase()] || '';
export const allCampaignNames = () => names;
/** The map with one slug renamed (an empty name removes it) */
export const withCampaignName = (slug, name) => {
  const next = { ...names };
  const k = String(slug ?? '').trim().toLowerCase();
  if (String(name ?? '').trim()) next[k] = String(name).trim().slice(0, 60); else delete next[k];
  return next;
};

