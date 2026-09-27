// =============================================================
//  Demo (sample) content shipped with the app.
//  Every item carries isDemo: true so the UI can label it "مثال توضيحي" and keep it out of
//  counts, totals and "live" claims. Demo listings/demands disappear as soon as the real
//  catalog / demands arrive from Firestore (see PropertiesContext).
// =============================================================
import { PROPERTIES_DATA } from './propertiesData';
import { INITIAL_DEMANDS } from './mockData';

export const DEMO_PROPERTY_IDS = new Set(PROPERTIES_DATA.map((p) => String(p.id)));
export const DEMO_DEMAND_IDS = new Set(INITIAL_DEMANDS.map((d) => String(d.id)));

export const DEMO_PROPERTIES = PROPERTIES_DATA.map((p) => ({ ...p, isDemo: true }));
export const DEMO_DEMANDS = INITIAL_DEMANDS.map((d) => ({ ...d, status: d.status || 'published', isDemo: true }));

/** Re-tag items restored from localStorage (saved before the flag existed). */
export const tagDemoProperty = (p) => (p && DEMO_PROPERTY_IDS.has(String(p.id)) && p.isDemo !== false ? { ...p, isDemo: true } : p);
export const tagDemoDemand = (d) => (d && DEMO_DEMAND_IDS.has(String(d.id)) && d.isDemo !== false ? { ...d, isDemo: true } : d);

export const isRealItem = (x) => Boolean(x) && !x.isDemo;
