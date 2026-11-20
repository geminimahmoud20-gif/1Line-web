// Saved report views (a manager's own shortcuts: «أداء الشهر», «آخر أسبوع مقابل السنة اللي فاتت»).
// Kept on this device only; pure helpers take the storage so they can be tested. tests/unit/report-views.test.mjs
export const VIEWS_KEY = 'crm_report_views_v1';
export const MAX_VIEWS = 8;

const browserStore = () => {
  try { return typeof localStorage === 'undefined' ? null : localStorage; } catch { return null; }
};

export function loadViews(store = browserStore()) {
  try {
    const list = JSON.parse(store?.getItem(VIEWS_KEY) || '[]');
    return Array.isArray(list) ? list.filter((v) => v && v.id && v.name && v.tab) : [];
  } catch { return []; }
}

const write = (list, store) => { try { store?.setItem(VIEWS_KEY, JSON.stringify(list)); } catch { /* storage full or blocked */ } return list; };

/** Adds (or replaces one with the same name) and returns the new list; newest first, at most MAX_VIEWS */
export function saveView({ name, tab, preset, custom, mode }, store = browserStore(), now = Date.now()) {
  const clean = String(name || '').trim().slice(0, 40);
  if (!clean || !tab) return loadViews(store);
  const view = { id: `v${now}`, name: clean, tab, preset: preset || '30', custom: preset === 'custom' ? { from: custom?.from || '', to: custom?.to || '' } : {}, mode: mode || 'previous' };
  const rest = loadViews(store).filter((v) => v.name !== clean);
  return write([view, ...rest].slice(0, MAX_VIEWS), store);
}

export const removeView = (id, store = browserStore()) => write(loadViews(store).filter((v) => v.id !== id), store);
