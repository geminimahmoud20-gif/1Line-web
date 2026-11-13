// =============================================================
//  Where a client came from, kept for the visitor and not only for the visit.
//  The campaign a visitor arrived through used to live in the session alone, so a client who clicked an
//  ad yesterday and came back directly today was recorded as «مباشر» and the ad lost the credit.
//  Now the last touch that came from somewhere (a utm link or another site) is kept for 30 days and
//  stands in for a direct return, and the very first touch is kept apart. Pure: tests/unit/attribution-touches.test.mjs.
// =============================================================
import { LEAD_SOURCES, leadSourceKey, leadCampaign } from './crmLeadViews.js';

export const TOUCH_TTL_MS = 30 * 86_400_000;

/** A visit that came from nowhere in particular (no utm link, no other site) */
export const isDirectTouch = (a) => !a || !a.campaign || a.campaign === 'direct_visit' || a.campaign === 'direct' || a.campaign === 'none';

/**
 * What to record for this visit. `current`: what this visit's address and referrer say; `stored`: the
 * last touch that came from somewhere. A direct visit inside the window is credited to that touch.
 * @returns {{ attribution: object, remember: boolean }} remember: save `attribution` as the last touch
 */
export function carryTouch(current, stored, now = Date.now()) {
  if (!isDirectTouch(current)) return { attribution: current, remember: true };
  const at = Date.parse(stored?.capturedAt || '');
  if (stored && !isDirectTouch(stored) && Number.isFinite(at) && now - at <= TOUCH_TTL_MS && now >= at) {
    return { attribution: { ...stored, returning: true }, remember: false };
  }
  return { attribution: current, remember: false };
}

const day = (iso) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('ar-EG-u-nu-latn', { day: 'numeric', month: 'short' });
};

/**
 * «من فين جه؟» rows for a client's profile: [label, value, wide?]. Only what is known; a client typed in
 * by hand shows just its source.
 */
export function attributionFacts(lead = {}) {
  const rows = [];
  const key = leadSourceKey(lead);
  const source = LEAD_SOURCES.find((s) => s.id === key);
  if (source) rows.push(['المصدر', source.ar]);
  const a = lead.marketingAttribution || {};
  const camp = leadCampaign(lead);
  if (camp) rows.push(['الحملة', camp.campaign]);
  if (camp?.ad) rows.push(['الإعلان / الفيديو', camp.ad]);
  if (a.landingPage) rows.push(['دخل على صفحة', a.landingPage, true]);
  if (a.returning) rows.push(['زيارة', `رجع مباشرة بعد ما جه من ${a.source || 'مصدر'}${a.capturedAt ? ` (${day(a.capturedAt)})` : ''}`, true]);
  const first = a.firstTouch;
  if (first && first.capturedAt && (first.campaign !== a.campaign || first.source !== a.source)) {
    rows.push(['أول مرة جه', `${first.source || '—'}${isDirectTouch(first) ? '' : ` · ${first.campaign}`} (${day(first.capturedAt)})`, true]);
  }
  return rows;
}
