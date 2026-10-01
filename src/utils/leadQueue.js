// =============================================================
//  Offline lead queue (localStorage). No Firebase imports on purpose: it must work while
//  offline, when the lazily loaded Firebase chunk may not be downloadable.
//  syncPendingLeads() in firebaseService.js uploads the queue on load and on reconnect.
// =============================================================

const PENDING_LEADS_KEY = 'oneline_pending_leads_queue';
const LEGACY_QUEUE_KEY = 'oneline_offline_lead_queue'; // older second queue, folded in on read

const readList = (key) => {
  try {
    const list = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(list) ? list.filter((x) => x && typeof x === 'object') : [];
  } catch {
    return [];
  }
};

export const writePendingLeads = (list) => {
  try {
    if (list.length > 0) localStorage.setItem(PENDING_LEADS_KEY, JSON.stringify(list));
    else localStorage.removeItem(PENDING_LEADS_KEY);
  } catch { /* storage unavailable */ }
};

export const readPendingLeads = () => {
  const legacy = readList(LEGACY_QUEUE_KEY);
  if (legacy.length > 0) {
    legacy.forEach((lead) => enqueuePendingLead(lead));
    try { localStorage.removeItem(LEGACY_QUEUE_KEY); } catch { /* storage unavailable */ }
  }
  return readList(PENDING_LEADS_KEY);
};

/** Queue a lead for upload (deduplicated by id, or same phone + property within 30 s). */
export const enqueuePendingLead = (lead) => {
  if (!lead) return false;
  const list = readList(PENDING_LEADS_KEY);
  const isDuplicate = list.some((item) =>
    (lead.id && item.id === lead.id) ||
    (item.phone === lead.phone && item.propertyId === lead.propertyId && Math.abs(Date.now() - (item.queuedAt || 0)) < 30000)
  );
  if (isDuplicate) return false;
  list.push({ ...lead, queuedAt: Date.now() });
  writePendingLeads(list);
  return true;
};

export const pendingLeadCount = () => readList(PENDING_LEADS_KEY).length + readList(LEGACY_QUEUE_KEY).length;
