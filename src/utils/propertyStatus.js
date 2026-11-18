// =============================================================
//  When a listing changes status we remember the day: `statusChangedAt` for any change, and `soldAt` for the
//  day it became «اتباعت» (cleared if it is put back on sale). The reports read soldAt to say how many sold
//  in a period. Pure: tests/unit/property-status.test.mjs
// =============================================================

/** The extra fields to save with a patch that changes `current`'s status ({} when the status does not change) */
export function statusStamp(current, patch, nowIso = new Date().toISOString()) {
  const next = patch?.status;
  if (!next || next === (current?.status || 'published')) return {};
  const stamp = { statusChangedAt: nowIso };
  if (next === 'sold') stamp.soldAt = nowIso;
  else if (current?.status === 'sold' || current?.soldAt) stamp.soldAt = '';
  return stamp;
}
