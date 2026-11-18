// =============================================================
//  Stage history: when a lead entered each pipeline stage. The lead keeps only its current status,
//  so without this the CRM can't tell a lead that reached a visit and was then lost from one that
//  never did, or how long clients wait in a stage. Stored on the lead as
//  stageHistory: [{ s: status, at: ISO time }], oldest first. Pure, tests/unit/stage-history.test.mjs.
// =============================================================
import { leadCreatedMs, toMs } from './crmLeadViews.js';

export const MAX_STAGE_HISTORY = 40;
const DAY_MS = 86400000;

/**
 * The history to save when `lead` moves to `nextStatus`, or null when the status doesn't change.
 * A lead saved before this existed is seeded with the stage it was in since it was created.
 */
export function stageHistoryAfter(lead, nextStatus, nowIso = new Date().toISOString()) {
  const from = (lead?.status || 'new');
  if (!nextStatus || nextStatus === from) return null;
  let history = Array.isArray(lead?.stageHistory) ? lead.stageHistory.filter((e) => e && e.s && e.at) : [];
  if (!history.length) {
    const created = leadCreatedMs(lead);
    history = [{ s: from, at: created ? new Date(created).toISOString() : nowIso }];
  }
  return [...history, { s: nextStatus, at: nowIso }].slice(-MAX_STAGE_HISTORY);
}

/** The history a brand-new lead starts with */
export const initialStageHistory = (nowIso = new Date().toISOString()) => [{ s: 'new', at: nowIso }];

/** Has the lead ever been in any of these stages? Uses the history, and the current status for older leads. */
export function reachedAny(lead, stages) {
  const set = stages instanceof Set ? stages : new Set(stages);
  if (set.has(lead?.status || 'new')) return true;
  return Array.isArray(lead?.stageHistory) && lead.stageHistory.some((e) => e && set.has(e.s));
}

/** ms from the lead's creation to first entering one of these stages, or 0 when it never did / unknown */
export function msToReach(lead, stages) {
  const set = stages instanceof Set ? stages : new Set(stages);
  const created = leadCreatedMs(lead);
  const hit = (Array.isArray(lead?.stageHistory) ? lead.stageHistory : []).find((e) => e && set.has(e.s) && toMs(e.at));
  if (!hit || !created) return 0;
  return Math.max(0, toMs(hit.at) - created);
}

/** Whole days, one decimal, for a list of ms values (0 when there are none) */
export function avgDays(msList = []) {
  const v = msList.filter((n) => n > 0);
  return v.length ? Math.round((v.reduce((a, b) => a + b, 0) / v.length / DAY_MS) * 10) / 10 : 0;
}
