// =============================================================
//  «تدفق الشغل»: where the open clients are waiting right now, how long, and with whom. For each open stage:
//  how many clients are in it, how many have been there longer than the stage allows, the median and the
//  longest wait; the bottleneck is the stage holding the most clients past its limit. Per person: open
//  clients, how many are late and how many nobody touched for two days. Pure: tests/unit/flow-report.test.mjs
// =============================================================
import { isSellerLead, leadCreatedMs, toMs } from './crmLeadViews.js';
import { STAGE_LIMIT_HOURS, OPEN_STAGES } from './stages.js';

const HOUR = 3600000;
const DAY = 24 * HOUR;

// The stage order and how long a client may stay in each stage live in utils/stages.js (one source for every screen)
export { STAGE_LIMIT_HOURS, OPEN_STAGES };
export const IDLE_HOURS = 48;

const isOpen = (l) => l && !l.isArchived && OPEN_STAGES.includes(l.status || 'new');

/** When the client entered the stage he is in now: the last matching stage-history entry, else (still new) when he arrived */
export function stageEnteredMs(lead) {
  const status = lead?.status || 'new';
  const history = Array.isArray(lead?.stageHistory) ? lead.stageHistory : [];
  for (let i = history.length - 1; i >= 0; i -= 1) {
    if (history[i]?.s === status) { const t = toMs(history[i].at); if (t) return t; }
  }
  if (status === 'new') return leadCreatedMs(lead) || 0;
  return 0; // moved before stage history was kept: the time is unknown
}

const median = (xs) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const days = (ms) => Math.round((ms / DAY) * 10) / 10;
const lastTouchMs = (l) => toMs(l.lastActivityAt) || toMs(l.updatedAt) || leadCreatedMs(l) || 0;

/**
 * { stages, owners, bottleneck, totals, stuck }
 *  stages: [{ id, limitHours, count, sellers, buyers, late, latePct, unknown, medianDays, oldestDays }] in pipeline order
 *  owners: [{ id, label, open, late, idle, worstStage }] most late first
 *  bottleneck: the stage with the most late clients (ties: higher share), null when nobody is late
 *  stuck: the longest-waiting late clients [{ lead, stage, waitedDays, overDays }] (up to `top`)
 */
export function flowReport(leads = [], { now = Date.now(), top = 12 } = {}) {
  const open = leads.filter(isOpen);
  const stages = OPEN_STAGES.map((id) => ({ id, limitHours: STAGE_LIMIT_HOURS[id], count: 0, sellers: 0, buyers: 0, late: 0, unknown: 0, waits: [] }));
  const byStage = Object.fromEntries(stages.map((s) => [s.id, s]));
  const owners = {};
  const stuck = [];

  for (const l of open) {
    const st = byStage[l.status || 'new'];
    st.count += 1;
    if (isSellerLead(l)) st.sellers += 1; else st.buyers += 1;
    const entered = stageEnteredMs(l);
    const waited = entered ? Math.max(0, now - entered) : null;
    const late = waited !== null && waited > st.limitHours * HOUR;
    if (waited === null) st.unknown += 1; else st.waits.push(waited);
    if (late) {
      st.late += 1;
      stuck.push({ lead: l, stage: st.id, waitedDays: days(waited), overDays: days(waited - st.limitHours * HOUR) });
    }

    const key = l.ownerUid || l.ownerName || l.claimedBy || '';
    const o = owners[key] || (owners[key] = { id: key || '—', label: l.ownerName || l.claimedBy || '', open: 0, late: 0, idle: 0, lateByStage: {} });
    o.open += 1;
    if (late) { o.late += 1; o.lateByStage[st.id] = (o.lateByStage[st.id] || 0) + 1; }
    if (now - lastTouchMs(l) > IDLE_HOURS * HOUR) o.idle += 1;
  }

  const stageRows = stages.map(({ waits, ...s }) => ({
    ...s,
    latePct: s.count ? Math.round((s.late / s.count) * 100) : 0,
    medianDays: days(median(waits)),
    oldestDays: waits.length ? days(Math.max(...waits)) : 0,
  }));
  const bottleneck = stageRows.filter((s) => s.late > 0).sort((a, b) => b.late - a.late || b.latePct - a.latePct)[0] || null;
  const ownerRows = Object.values(owners).map(({ lateByStage, ...o }) => ({
    ...o,
    worstStage: Object.entries(lateByStage).sort((a, b) => b[1] - a[1])[0]?.[0] || null,
  })).sort((a, b) => b.late - a.late || b.idle - a.idle || b.open - a.open);
  const late = stageRows.reduce((n, s) => n + s.late, 0);

  return {
    stages: stageRows,
    owners: ownerRows,
    bottleneck,
    totals: { open: open.length, late, latePct: open.length ? Math.round((late / open.length) * 100) : 0, idle: ownerRows.reduce((n, o) => n + o.idle, 0) },
    stuck: stuck.sort((a, b) => b.overDays - a.overDays).slice(0, top),
  };
}
