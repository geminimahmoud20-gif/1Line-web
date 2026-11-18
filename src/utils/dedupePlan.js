// =============================================================
//  «دمج كل المكرر»: every client who filled in more than one form (same phone) becomes one file.
//  The oldest open request with an owner stays; the other requests are written into its history and
//  archived (never deleted) with mergedInto pointing at it. Pure: tests/unit/dedupe-plan.test.mjs.
// =============================================================
import { findDuplicateGroups, buildMergedLead, leadCreatedMs, leadSourceKey, LEAD_SOURCES } from './crmLeadViews.js';

const CLOSED = ['closed', 'lost', 'inactive'];
const STAGE_RANK = { new: 0, contacted: 1, site_visit: 2, negotiating: 3, closing: 4 };
const TYPE_AR = { buyer: 'شراء', seller: 'بيع', investor: 'استثمار', rent: 'إيجار', tenant: 'إيجار', landlord: 'تأجير', broker: 'وسيط', valuation: 'تقييم عقار' };
const hasOwner = (l) => Boolean(l.ownerUid || l.ownerName || l.claimedBy);

const day = (l) => {
  const t = leadCreatedMs(l);
  return t ? new Date(t).toISOString().slice(0, 10) : '';
};

/** One line for the history: what an earlier form asked */
export function requestLine(l = {}) {
  const src = LEAD_SOURCES.find((s) => s.id === leadSourceKey(l));
  const bits = [src?.ar || l.source || '', TYPE_AR[l.type] || '', l.details?.area || l.area || ''].filter(Boolean);
  return `طلب سابق من نفس العميل${day(l) ? ` (${day(l)})` : ''}${bits.length ? ` — ${bits.join(' · ')}` : ''}`;
}

/** The request that stays: has an owner first, then the furthest stage, then the oldest */
export function pickKeeper(group = []) {
  return [...group].sort((a, b) => (hasOwner(b) - hasOwner(a))
    || ((STAGE_RANK[b.status || 'new'] ?? 0) - (STAGE_RANK[a.status || 'new'] ?? 0))
    || ((leadCreatedMs(a) || Infinity) - (leadCreatedMs(b) || Infinity)))[0];
}

/**
 * [{ keep, others, merged, archive }] for every phone held by two or more open requests.
 * merged: the fields to write on the kept one; archive: the fields to write on each of the others.
 */
export function planDuplicateMerges(leads = [], nowIso = new Date().toISOString()) {
  const open = leads.filter((l) => l && !l.isArchived && !l.mergedInto && !CLOSED.includes(l.status));
  const byId = new Map(open.map((l) => [l.id, l]));
  const used = new Set();
  const plans = [];
  for (const ids of findDuplicateGroups(open).values()) {
    // A request shared with another phone's group is left for the next run
    if (ids.some((id) => used.has(id))) continue;
    const group = ids.map((id) => byId.get(id)).filter(Boolean);
    if (group.length < 2) continue;
    const keep = pickKeeper(group);
    const others = group.filter((l) => l.id !== keep.id)
      .sort((a, b) => (leadCreatedMs(a) || 0) - (leadCreatedMs(b) || 0));
    const merged = buildMergedLead(keep, others, nowIso);
    // Each earlier form as its own line in the history (buildMergedLead already carries the old logs)
    merged.activityLogs = [
      ...others.map((o) => ({ timestamp: nowIso, action: requestLine(o), kind: 'request', requestId: String(o.id) })),
      ...merged.activityLogs
    ].slice(0, 100);
    merged.requestCount = group.length + Math.max(0, (Number(keep.requestCount) || 1) - 1);
    merged.lastActivityAt = nowIso;
    ids.forEach((id) => used.add(id));
    plans.push({
      keep,
      others,
      merged,
      archive: { isArchived: true, mergedInto: String(keep.id), archivedAt: nowIso }
    });
  }
  return plans;
}
