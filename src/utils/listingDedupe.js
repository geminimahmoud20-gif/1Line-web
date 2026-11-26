// =============================================================
//  Prevents duplicate property listings per client and prevents
//  concurrent edits by two staff members from clobbering each other.
//  Pure helpers tested in tests/unit/listing-dedupe.test.mjs.
// =============================================================

export const isActiveListing = (p) => Boolean(p) && !p.deleted && !p.isDeleted && p.status !== 'trash';

export const normText = (s) => String(s || '').trim().replace(/\s+/g, ' ').toLowerCase();

// Same listing re-quoted at a slightly different asking price (common when two staff list the
// same unit, or an owner's price shifts) still counts as a match; an unrelated unit never lands
// this close by coincidence once the title, area and size already match.
const PRICE_MATCH_TOLERANCE = 0.08;
const pricesMatch = (a, b) => a > 0 && b > 0 && Math.abs(a - b) <= Math.max(a, b) * PRICE_MATCH_TOLERANCE;

/**
 * Find an existing active (non-trashed, non-deleted) listing already linked to a CRM lead.
 */
export function findExistingLeadListing(properties = [], leadId, extraIds = []) {
  if (!leadId && (!extraIds || !extraIds.length)) return null;
  const lid = leadId ? String(leadId) : '';
  const extraSet = new Set((extraIds || []).filter(Boolean).map(String));
  const matches = (properties || []).filter((p) => {
    if (!isActiveListing(p)) return false;
    if (lid && String(p.sourceLeadId || '') === lid) return true;
    return extraSet.has(String(p.id));
  });
  if (matches.length === 0) return null;
  // Prefer live/approved or most recently updated listing
  return [...matches].sort((a, b) => {
    const score = (x) => (x.approval === 'approved' || x.status === 'published' ? 2 : 1);
    return score(b) - score(a) || String(b.updatedAt || '').localeCompare(String(a.updatedAt || ''));
  })[0];
}

/**
 * Detect whether creating `candidate` would duplicate an existing active listing:
 * 1) Same sourceLeadId (for non-brokers, or when key unit specs match for a broker).
 * 2) Same normalized title + areaKey + price + size.
 */
export function findPotentialDuplicateListing(properties = [], candidate = {}, { isBroker = false } = {}) {
  const selfId = candidate?.id ? String(candidate.id) : '';
  const candLead = candidate?.sourceLeadId ? String(candidate.sourceLeadId) : '';
  const candTitle = normText(candidate?.title_ar);
  const candArea = String(candidate?.areaKey || '');
  const candType = String(candidate?.type || '');
  const candPrice = Number(candidate?.price) || 0;
  const candSize = Number(candidate?.size) || 0;

  for (const p of properties || []) {
    if (!isActiveListing(p)) continue;
    if (selfId && String(p.id) === selfId) continue;

    if (candLead && String(p.sourceLeadId || '') === candLead) {
      if (!isBroker) return p;
      const sameSpecs = p.type === candType && (!candArea || p.areaKey === candArea)
        && (!candSize || !Number(p.size) || Number(p.size) === candSize);
      if (sameSpecs) return p;
    }

    if (
      candTitle && normText(p.title_ar) === candTitle
      && candArea && p.areaKey === candArea
      && pricesMatch(candPrice, Number(p.price) || 0)
      && (!candSize || !Number(p.size) || Number(p.size) === candSize)
    ) {
      return p;
    }
  }
  return null;
}

/**
 * Two active listings that look like the same unit entered twice: the CRM's catalog-wide
 * "merge duplicates" tool (PropertyManagerPanel) offers to merge any pair this returns true
 * for. areaKey alone covers a whole district, so two unrelated plots of the same type can
 * share size/price/area by coincidence — a matching title is what actually says this is the
 * same listing re-entered, not a coincidence, so it's required alongside specs unless a
 * stronger identity signal (the same source lead, or the same contact phone) already agrees.
 */
export function isSameListingPair(p1, p2) {
  if (!p1 || !p2) return false;
  const sameLead = p1.sourceLeadId && p2.sourceLeadId && String(p1.sourceLeadId) === String(p2.sourceLeadId);
  const phone1 = String(p1.contactPhone || p1.phone || '').replace(/[^0-9]/g, '');
  const phone2 = String(p2.contactPhone || p2.phone || '').replace(/[^0-9]/g, '');
  const samePhone = phone1.length >= 9 && phone1 === phone2;
  const sameSpecs = Boolean(p1.areaKey) && p1.areaKey === p2.areaKey
    && Number(p1.size) > 0 && Number(p1.size) === Number(p2.size)
    && Number(p1.price) > 0 && Number(p1.price) === Number(p2.price)
    && p1.type === p2.type;
  const sameTitle = Boolean(normText(p1.title_ar)) && normText(p1.title_ar) === normText(p2.title_ar);
  return Boolean(sameLead) || (samePhone && (sameSpecs || p1.type === p2.type)) || (sameSpecs && sameTitle);
}

/**
 * Pairs up active listings across the whole catalog that isSameListingPair flags as the same
 * unit. Returns a Map from listing id -> the other listing in its first-found match.
 */
export function findDuplicateListingPairs(properties = []) {
  const map = new Map();
  const list = properties || [];
  for (let i = 0; i < list.length; i++) {
    const p1 = list[i];
    if (!isActiveListing(p1)) continue;
    for (let j = i + 1; j < list.length; j++) {
      const p2 = list[j];
      if (!isActiveListing(p2)) continue;
      if (isSameListingPair(p1, p2)) {
        if (!map.has(String(p1.id))) map.set(String(p1.id), p2);
        if (!map.has(String(p2.id))) map.set(String(p2.id), p1);
      }
    }
  }
  return map;
}

const sameValue = (a, b) => {
  if (a === b) return true;
  if ((a === null || a === undefined || a === '') && (b === null || b === undefined || b === '')) return true;
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
};

const DIFF_IGNORED = new Set(['id', 'updatedAt', 'createdAt', 'approvedAt', 'submittedAt', 'rejectedAt', 'approval', 'deleted', 'isDemo', 'contactName', 'contactPhone', 'privateNotes', 'exclusive', 'exclusiveFrom', 'exclusiveUntil', '_baseUpdatedAt']);

/**
 * Compute ONLY the fields that changed between `original` (when Edit opened) and `next` (when Saved),
 * so saving an edit never overwrites unrelated fields modified concurrently by another colleague.
 */
export function listingDiffPatch(original = {}, next = {}) {
  const patch = {};
  const keys = new Set([...Object.keys(original || {}), ...Object.keys(next || {})]);
  for (const k of keys) {
    if (DIFF_IGNORED.has(k)) continue;
    if (!sameValue(original?.[k], next?.[k])) {
      patch[k] = next[k] === undefined ? null : next[k];
    }
  }
  return patch;
}

/**
 * Compare local diff against the latest state on the device/server (`latest`) relative to `original`.
 * Returns { mergedPatch, conflicts: string[] }.
 */
export function analyzeConcurrentEdits(original = {}, latest = {}, localPatch = {}) {
  const conflicts = [];
  for (const key of Object.keys(localPatch || {})) {
    const remoteChanged = !sameValue(original?.[key], latest?.[key]);
    const differsFromLocal = !sameValue(latest?.[key], localPatch[key]);
    if (remoteChanged && differsFromLocal) {
      conflicts.push(key);
    }
  }
  return { conflicts, hasConflicts: conflicts.length > 0 };
}
