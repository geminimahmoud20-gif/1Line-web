// =============================================================
//  «أداء البياعين»: per person (or team) that leads are assigned to, how fast they reply, how many
//  clients reach a visit and close, and what is waiting on them right now. Pure,
//  tests/unit/seller-report.test.mjs runs it.
// =============================================================
import { leadCreatedMs, toMs, waitingMs, responseSlaMs, isOverdue, localDayKey } from './crmLeadViews.js';
import { assigneeValue, isPersonValue } from './assignees.js';
import { reachedAny } from './stageHistory.js';

const CONTACTED = new Set(['contacted', 'site_visit', 'negotiating', 'closing', 'closed']);
const VISITED = new Set(['site_visit', 'negotiating', 'closing', 'closed']);

export const PERIODS = [
  { id: '7', days: 7, ar: 'آخر ٧ أيام', en: 'Last 7 days' },
  { id: '30', days: 30, ar: 'آخر ٣٠ يوم', en: 'Last 30 days' },
  { id: 'all', days: 0, ar: 'من البداية', en: 'All time' }
];

const isOpen = (l) => !l.isArchived && l.status !== 'lost' && l.status !== 'closed';

/**
 * Rows for the report, most closings then most visits first.
 * @param {object[]} leads
 * @param {{days?: number, now?: number, deskLabel?: (value: string) => string}} opts
 */
export function sellerReport(leads = [], { days = 0, now = Date.now(), deskLabel = (v) => v } = {}) {
  const since = days > 0 ? now - days * 86400000 : 0;
  const rows = new Map();
  for (const l of leads) {
    if (!l || l.isArchived) continue;
    if (since && leadCreatedMs(l) < since) continue;
    const value = assigneeValue(l);
    const row = rows.get(value) || {
      value,
      person: isPersonValue(value),
      label: isPersonValue(value) ? (l.ownerName || l.claimedBy || '') : deskLabel(value),
      leads: 0, contacted: 0, visits: 0, closed: 0, lost: 0,
      replied: 0, inTime: 0, replyMs: [], waiting: 0, late: 0, overdue: 0
    };
    row.leads += 1;
    if (reachedAny(l, CONTACTED)) row.contacted += 1;
    if (reachedAny(l, VISITED)) row.visits += 1;
    if (l.status === 'closed') row.closed += 1;
    if (l.status === 'lost') row.lost += 1;
    const created = leadCreatedMs(l);
    const first = toMs(l.firstContactedAt);
    if (created && first && first >= created) {
      const ms = first - created;
      row.replied += 1;
      row.replyMs.push(ms);
      if (ms <= responseSlaMs(l)) row.inTime += 1;
    }
    if (waitingMs(l, now) > 0) {
      row.waiting += 1;
      if (waitingMs(l, now) > responseSlaMs(l)) row.late += 1;
    }
    if (isOpen(l) && isOverdue(l, localDayKey(now))) row.overdue += 1;
    rows.set(value, row);
  }
  return [...rows.values()]
    .map(({ replyMs, ...r }) => ({
      ...r,
      avgReplyMin: replyMs.length ? Math.round(replyMs.reduce((a, b) => a + b, 0) / replyMs.length / 60000) : 0,
      inTimeRate: r.replied ? Math.round((r.inTime / r.replied) * 100) : 0,
      visitRate: r.leads ? Math.round((r.visits / r.leads) * 100) : 0
    }))
    .sort((a, b) => b.closed - a.closed || b.visits - a.visits || b.leads - a.leads);
}
