// =============================================================
//  «تقارير الأداء» for the managers: this week against last week, how far clients get through the
//  stages (and how long it takes), how each source does, and what the team did with its tasks.
//  Pure (tests/unit/performance-report.test.mjs); stage history (utils/stageHistory) says when each
//  stage was reached, and a client who never recorded one counts by the stage he is in.
// =============================================================
import { leadCreatedMs, toMs, responseSlaMs, leadSourceKey, LEAD_SOURCES, lostReasonCounts } from './crmLeadViews.js';
import { reachedAny, msToReach, avgDays } from './stageHistory.js';
import { leadCommission } from './commission.js';

const DAY = 86_400_000;
export const ORDER = ['new', 'contacted', 'site_visit', 'negotiating', 'closing', 'closed'];
export const STAGE_LABELS = {
  new: { ar: 'عميل جديد', en: 'New' },
  contacted: { ar: 'اتكلمنا معاه', en: 'Contacted' },
  site_visit: { ar: 'وصل لمعاينة', en: 'Reached a viewing' },
  negotiating: { ar: 'تفاوض', en: 'Negotiating' },
  closing: { ar: 'توقيع وحجز', en: 'Closing' },
  closed: { ar: 'صفقة ناجحة', en: 'Closed won' }
};
const from = (i) => ORDER.slice(i); // this stage or any later one
const VISITED = new Set(from(2));

const median = (nums) => {
  const v = nums.filter((n) => n >= 0).sort((a, b) => a - b);
  if (!v.length) return 0;
  const m = Math.floor(v.length / 2);
  return v.length % 2 ? v[m] : Math.round((v[m - 1] + v[m]) / 2);
};
const pct = (part, whole) => (whole > 0 ? Math.round((part / whole) * 100) : 0);

/** When the lead first entered any of these stages (ms), from its history, or 0 */
export function enteredAt(lead, stages) {
  const set = stages instanceof Set ? stages : new Set(stages);
  const hits = (Array.isArray(lead?.stageHistory) ? lead.stageHistory : []).filter((e) => e && set.has(e.s) && toMs(e.at));
  if (hits.length) return Math.min(...hits.map((e) => toMs(e.at)));
  // older client without history that is closed now: the date it was closed, when it has one
  if (set.has(lead?.status) && lead.status === 'closed') return toMs(lead.closedAt) || 0;
  return 0;
}

const inRange = (ms, lo, hi) => ms > 0 && ms >= lo && ms < hi;

/** The clients created in the last `days` days (0 = all), not archived */
const cohort = (leads, days, now) => {
  const since = days > 0 ? now - days * DAY : 0;
  return leads.filter((l) => l && !l.isArchived && (!since || leadCreatedMs(l) >= since));
};

/**
 * This 7 days against the 7 before: new clients, first replies, clients that reached a viewing, deals
 * closed, commission on them, tasks done.  Each value is { cur, prev, change } (change in %, null when
 * there was nothing before).
 */
export function weekCompare(leads = [], tasks = [], now = Date.now()) {
  const ranges = { cur: [now - 7 * DAY, now + 1], prev: [now - 14 * DAY, now - 7 * DAY] };
  const out = {};
  const put = (key, fn) => {
    const cur = fn(...ranges.cur);
    const prev = fn(...ranges.prev);
    out[key] = { cur, prev, change: prev > 0 ? Math.round(((cur - prev) / prev) * 100) : null };
  };
  const live = leads.filter((l) => l && !l.isArchived);
  put('newLeads', (lo, hi) => live.filter((l) => inRange(leadCreatedMs(l), lo, hi)).length);
  put('replied', (lo, hi) => live.filter((l) => inRange(toMs(l.firstContactedAt), lo, hi)).length);
  put('viewings', (lo, hi) => live.filter((l) => inRange(enteredAt(l, VISITED), lo, hi)).length);
  put('closed', (lo, hi) => live.filter((l) => inRange(enteredAt(l, ['closed']), lo, hi)).length);
  put('commission', (lo, hi) => live.filter((l) => inRange(enteredAt(l, ['closed']), lo, hi)).reduce((s, l) => s + leadCommission(l).gross, 0));
  put('tasksDone', (lo, hi) => tasks.filter((t) => t.status === 'done' && inRange(toMs(t.doneAt), lo, hi)).length);
  return out;
}

/**
 * How far the clients that arrived in the period got: for each stage, how many reached it (or any later
 * one), the share of all clients, the share of the previous stage, and the average days to get there.
 */
export function funnelReport(leads = [], { days = 30, now = Date.now() } = {}) {
  const list = cohort(leads, days, now);
  const total = list.length;
  const rows = ORDER.map((id, i) => {
    const stages = from(i);
    // everyone who arrived entered the first stage, even one who ended up lost
    const reached = i === 0 ? list : list.filter((l) => reachedAny(l, stages));
    return { id, reached: reached.length, avgDays: i === 0 ? 0 : avgDays(reached.map((l) => msToReach(l, stages))) };
  }).map((r, i, all) => ({ ...r, ofAll: pct(r.reached, total), ofPrevious: i === 0 ? 100 : pct(r.reached, all[i - 1].reached) }));
  const lost = list.filter((l) => l.status === 'lost');
  const top = Object.entries(lostReasonCounts(lost)).sort((a, b) => b[1] - a[1])[0];
  return { total, rows, lost: lost.length, topLostReason: top ? { id: top[0], count: top[1] } : null };
}

/** Per source: clients, how fast the first reply came, how many reached a viewing and closed */
export function sourceReport(leads = [], { days = 30, now = Date.now() } = {}) {
  const rows = new Map();
  for (const l of cohort(leads, days, now)) {
    const id = leadSourceKey(l);
    const r = rows.get(id) || { id, label: LEAD_SOURCES.find((s) => s.id === id)?.ar || id, leads: 0, replied: 0, inTime: 0, replyMs: [], visits: 0, closed: 0 };
    r.leads += 1;
    const created = leadCreatedMs(l);
    const first = toMs(l.firstContactedAt);
    if (created && first && first >= created) {
      r.replied += 1;
      r.replyMs.push(first - created);
      if (first - created <= responseSlaMs(l)) r.inTime += 1;
    }
    if (reachedAny(l, VISITED)) r.visits += 1;
    if (reachedAny(l, ['closed'])) r.closed += 1;
    rows.set(id, r);
  }
  return [...rows.values()]
    .map(({ replyMs, ...r }) => ({ ...r, medianReplyMs: median(replyMs), inTimePct: pct(r.inTime, r.replied), visitPct: pct(r.visits, r.leads) }))
    .sort((a, b) => b.leads - a.leads);
}

/** What each person did with their tasks: done in the period, open, and overdue right now */
export function taskBoard(tasks = [], { days = 30, now = Date.now() } = {}) {
  const since = days > 0 ? now - days * DAY : 0;
  const today = new Date(now).toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' });
  const rows = new Map();
  for (const t of tasks) {
    if (!t?.assigneeUid) continue;
    const r = rows.get(t.assigneeUid) || { uid: t.assigneeUid, name: t.assigneeName || '', done: 0, open: 0, overdue: 0 };
    if (t.assigneeName) r.name = t.assigneeName;
    if (t.status === 'done') { if (!since || toMs(t.doneAt) >= since) r.done += 1; }
    else {
      r.open += 1;
      if (String(t.dueAt || '').slice(0, 10) && String(t.dueAt).slice(0, 10) < today) r.overdue += 1;
    }
    rows.set(t.assigneeUid, r);
  }
  return [...rows.values()].sort((a, b) => b.done - a.done || b.overdue - a.overdue);
}
