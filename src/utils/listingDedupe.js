// =============================================================
//  Prevents duplicate property listings per client and prevents
//  concurrent edits by two staff members from clobbering each other.
//  Pure helpers tested in tests/unit/listing-dedupe.test.mjs.
// =============================================================

export const isActiveListing = (p) => Boolean(p) && !p.deleted && !p.isDeleted && p.status !== 'trash';

const normText = (s) => String(s || '').trim().replace(/\s+/g, ' ').toLowerCase();

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
      && candPrice > 0 && Number(p.price) === candPrice
      && (!candSize || !Number(p.size) || Number(p.size) === candSize)
    ) {
      return p;
    }
  }
  return null;
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

const DIFF_IGNORED = new Set(['id', 'updatedAt', 'createdAt', 'approvedAt', 'submittedAt', 'rejectedAt', 'approval', 'deleted', 'isDemo', 'contactName', 'contactPhone', 'privateNotes', 'exclusive', 'exclusiveFrom', 'exclusiveUntil']);

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
