// =============================================================
//  «تقارير الأداء» for the managers: any date range against another, a daily trend, how far clients get
//  through the stages (and how long it takes), how each source and each seller does, and a few findings.
//  Pure (tests/unit/performance-report.test.mjs); stage history (utils/stageHistory) says when each
//  stage was reached, and a client who never recorded one counts by the stage he is in.
// =============================================================
import { leadCreatedMs, toMs, responseSlaMs, leadSourceKey, LEAD_SOURCES, lostReasonCounts } from './crmLeadViews.js';
import { reachedAny, msToReach, avgDays } from './stageHistory.js';
import { leadCommission } from './commission.js';
import { dayOf, inRange, eachDay } from './reportPeriods.js';

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
  // older client without history: the date it was closed or lost, when the lead has one
  if (set.has(lead?.status) && lead.status === 'closed') return toMs(lead.closedAt) || 0;
  if (set.has(lead?.status) && lead.status === 'lost') return toMs(lead.lostAt) || 0;
  return 0;
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────
//  Advanced report: any date range, compared with another, a daily trend, each seller, and a few
//  plain-language findings. Everything below takes a range ({ from, to } day keys, reportPeriods.js).
// ─────────────────────────────────────────────────────────────────────────────────────────────────
const live = (leads) => leads.filter((l) => l && !l.isArchived);
const createdIn = (l, range) => inRange(leadCreatedMs(l), range);
const enteredIn = (l, stages, range) => inRange(enteredAt(l, stages), range);
const repliedAfterCreate = (l) => {
  const created = leadCreatedMs(l);
  const first = toMs(l.firstContactedAt);
  return created && first && first >= created ? first - created : -1;
};

/** The headline numbers of one range */
export function periodMetrics(leads = [], tasks = [], range) {
  const all = live(leads);
  const fresh = all.filter((l) => createdIn(l, range));
  const repliedNow = all.filter((l) => inRange(toMs(l.firstContactedAt), range) && repliedAfterCreate(l) >= 0);
  const inTime = repliedNow.filter((l) => repliedAfterCreate(l) <= responseSlaMs(l)).length;
  const closedNow = all.filter((l) => enteredIn(l, ['closed'], range));
  const newLeads = fresh.length;
  return {
    newLeads,
    replied: repliedNow.length,
    inTimePct: pct(inTime, repliedNow.length),
    medianReplyMs: median(repliedNow.map(repliedAfterCreate)),
    viewings: all.filter((l) => enteredIn(l, [...VISITED], range)).length,
    closed: closedNow.length,
    lost: all.filter((l) => enteredIn(l, ['lost'], range)).length,
    commission: closedNow.reduce((s, l) => s + leadCommission(l).gross, 0),
    conversionPct: pct(fresh.filter((l) => reachedAny(l, ['closed'])).length, newLeads),
    tasksDone: tasks.filter((t) => t.status === 'done' && inRange(toMs(t.doneAt), range)).length
  };
}

/** For every metric: { cur, prev, change } (change in %, null when there was nothing before) */
export function compareMetrics(cur, prev) {
  const out = {};
  for (const k of Object.keys(cur)) {
    const c = cur[k];
    const p = prev ? prev[k] : null;
    out[k] = { cur: c, prev: p, change: p > 0 ? Math.round(((c - p) / p) * 100) : null };
  }
  return out;
}

/** Per day (or per week for a long range): new clients and closed deals, for the trend chart */
export function dailySeries(leads = [], range) {
  const all = live(leads);
  const days = eachDay(range.from, range.to);
  const step = days.length > 62 ? 7 : 1;
  const idx = new Map();
  days.forEach((d, i) => idx.set(d, Math.floor(i / step)));
  const buckets = Array.from({ length: Math.ceil(days.length / step) }, (_, i) => ({ day: days[i * step], newLeads: 0, closed: 0 }));
  for (const l of all) {
    const c = dayOf(leadCreatedMs(l));
    if (idx.has(c)) buckets[idx.get(c)].newLeads += 1;
    const w = dayOf(enteredAt(l, ['closed']));
    if (idx.has(w)) buckets[idx.get(w)].closed += 1;
  }
  return { step, buckets };
}

/** The funnel and the sources for the clients that arrived in a range */
export function cohortReports(leads = [], range) {
  const list = live(leads).filter((l) => createdIn(l, range));
  const total = list.length;
  const rows = ORDER.map((id, i) => {
    const reached = i === 0 ? list : list.filter((l) => reachedAny(l, from(i)));
    return { id, reached: reached.length, avgDays: i === 0 ? 0 : avgDays(reached.map((l) => msToReach(l, from(i)))) };
  }).map((r, i, all) => ({ ...r, ofAll: pct(r.reached, total), ofPrevious: i === 0 ? 100 : pct(r.reached, all[i - 1].reached) }));
  const lostList = list.filter((l) => l.status === 'lost');
  const top = Object.entries(lostReasonCounts(lostList)).sort((a, b) => b[1] - a[1])[0];
  const sources = new Map();
  for (const l of list) {
    const id = leadSourceKey(l);
    const r = sources.get(id) || { id, label: LEAD_SOURCES.find((s) => s.id === id)?.ar || id, leads: 0, replied: 0, inTime: 0, ms: [], visits: 0, closed: 0 };
    r.leads += 1;
    const ms = repliedAfterCreate(l);
    if (ms >= 0) { r.replied += 1; r.ms.push(ms); if (ms <= responseSlaMs(l)) r.inTime += 1; }
    if (reachedAny(l, [...VISITED])) r.visits += 1;
    if (reachedAny(l, ['closed'])) r.closed += 1;
    sources.set(id, r);
  }
  return {
    funnel: { total, rows, lost: lostList.length, topLostReason: top ? { id: top[0], count: top[1] } : null },
    sources: [...sources.values()].map(({ ms, ...r }) => ({ ...r, medianReplyMs: median(ms), inTimePct: pct(r.inTime, r.replied), visitPct: pct(r.visits, r.leads) })).sort((a, b) => b.leads - a.leads)
  };
}

/** Per salesperson: the clients handed to them in the range, how fast they replied, what closed, and their tasks */
export function sellerPerformance(leads = [], tasks = [], range, now = Date.now()) {
  const rows = new Map();
  const get = (uid, name) => {
    const key = uid || name || '—';
    if (!rows.has(key)) rows.set(key, { key, uid: uid || '', name: name || '', leads: 0, replied: 0, inTime: 0, ms: [], visits: 0, closed: 0, commission: 0, tasksDone: 0, tasksOpen: 0, tasksOverdue: 0 });
    const r = rows.get(key);
    if (name && !r.name) r.name = name;
    return r;
  };
  for (const l of live(leads).filter((x) => createdIn(x, range))) {
    const r = get(l.ownerUid, l.ownerName || l.claimedBy);
    r.leads += 1;
    const ms = repliedAfterCreate(l);
    if (ms >= 0) { r.replied += 1; r.ms.push(ms); if (ms <= responseSlaMs(l)) r.inTime += 1; }
    if (reachedAny(l, [...VISITED])) r.visits += 1;
    if (reachedAny(l, ['closed'])) { r.closed += 1; r.commission += leadCommission(l).gross; }
  }
  const today = dayOf(now);
  for (const t of tasks) {
    if (!t?.assigneeUid) continue;
    const r = get(t.assigneeUid, t.assigneeName);
    if (t.status === 'done') { if (inRange(toMs(t.doneAt), range)) r.tasksDone += 1; }
    else {
      r.tasksOpen += 1;
      const due = String(t.dueAt || '').slice(0, 10);
      if (due && due < today) r.tasksOverdue += 1;
    }
  }
  return [...rows.values()]
    .filter((r) => r.leads || r.tasksDone || r.tasksOpen)
    .map(({ ms, ...r }) => ({ ...r, medianReplyMs: median(ms), inTimePct: pct(r.inTime, r.replied), visitPct: pct(r.visits, r.leads) }))
    .sort((a, b) => b.closed - a.closed || b.leads - a.leads);
}

const WEEKDAYS = ['الأحد', 'الاتنين', 'التلات', 'الأربع', 'الخميس', 'الجمعة', 'السبت'];

/**
 * A handful of plain findings for the manager, most urgent first: [{ tone: 'warn'|'good'|'info', text }].
 * Each needs enough clients behind it to mean something; nothing is said about a handful of leads.
 */
export function insights({ metrics, prev, funnel, sources = [], sellers = [], leads = [], tasks = [], range, now = Date.now() } = {}) {
  const out = [];
  const warn = (text) => out.push({ tone: 'warn', text });
  const good = (text) => out.push({ tone: 'good', text });
  const info = (text) => out.push({ tone: 'info', text });
  const all = live(leads);

  const idle = all.filter((l) => l.status === 'new' && !l.firstContactedAt && now - leadCreatedMs(l) > 24 * 3600_000).length;
  if (idle >= 1) warn(`${idle} عميل جديد عدّى عليهم أكتر من ٢٤ ساعة ولسه محدش كلّمهم.`);
  const overdueTasks = tasks.filter((t) => t.status === 'open' && String(t.dueAt || '').slice(0, 10) && String(t.dueAt).slice(0, 10) < dayOf(now)).length;
  if (overdueTasks >= 1) warn(`${overdueTasks} مهمة متأخرة عن ميعادها.`);

  if (metrics) {
    if (metrics.replied >= 5 && metrics.inTimePct < 60) warn(`الرد في الميعاد ${metrics.inTimePct}% بس — العملاء بيستنّوا أكتر من اللازم.`);
    else if (metrics.replied >= 5 && metrics.inTimePct >= 85) good(`الرد في الميعاد ${metrics.inTimePct}% — فريقك سريع.`);
  }
  if (metrics && prev) {
    if (prev.newLeads >= 5 && metrics.newLeads <= prev.newLeads * 0.7) warn(`العملاء الجدد قلّوا ${Math.round((1 - metrics.newLeads / prev.newLeads) * 100)}% عن الفترة المقارنة.`);
    if (prev.newLeads >= 5 && metrics.newLeads >= prev.newLeads * 1.3) good(`العملاء الجدد زادوا ${Math.round((metrics.newLeads / prev.newLeads - 1) * 100)}% عن الفترة المقارنة.`);
    if (prev.closed >= 2 && metrics.closed < prev.closed) info(`الصفقات المقفولة نزلت من ${prev.closed} لـ ${metrics.closed}.`);
  }
  for (const s of sources) {
    if (s.leads >= 5 && s.visits === 0) warn(`«${s.label}» جابوا ${s.leads} عميل ومحدش وصل لمعاينة — راجع جودتهم أو سرعة الرد عليهم.`);
  }
  const best = sources.filter((s) => s.leads >= 5).sort((a, b) => b.visitPct - a.visitPct)[0];
  if (best && best.visitPct >= 25) good(`أفضل مصدر: «${best.label}» — ${best.visitPct}% من عملائه وصلوا لمعاينة.`);
  for (const s of sellers) {
    if (s.replied >= 3 && s.inTimePct < 50 && s.name) warn(`${s.name} بيرد في الميعاد ${s.inTimePct}% بس من ${s.replied} عميل.`);
  }
  if (funnel?.rows) {
    const drop = funnel.rows.slice(1).filter((r, i) => funnel.rows[i].reached >= 5).sort((a, b) => a.ofPrevious - b.ofPrevious)[0];
    if (drop && drop.ofPrevious < 50) info(`أكبر تسرّب عند «${STAGE_LABELS[drop.id].ar}»: ${drop.ofPrevious}% بس من اللي قبلها وصلوا.`);
    if (funnel.topLostReason && funnel.lost >= 5 && funnel.topLostReason.count / funnel.lost >= 0.4) {
      info(`أكتر سبب خسارة: ${funnel.topLostReason.count} من ${funnel.lost} (${Math.round((funnel.topLostReason.count / funnel.lost) * 100)}%).`);
    }
  }
  if (range) {
    const byDay = new Array(7).fill(0);
    for (const l of all.filter((x) => createdIn(x, range))) {
      const d = dayOf(leadCreatedMs(l));
      if (d) byDay[new Date(`${d}T12:00:00Z`).getUTCDay()] += 1;
    }
    const total = byDay.reduce((a, b) => a + b, 0);
    const top = byDay.indexOf(Math.max(...byDay));
    if (total >= 14 && byDay[top] / total >= 0.25) info(`أكتر يوم بييجي فيه عملاء: ${WEEKDAYS[top]} (${byDay[top]} من ${total}).`);
  }
  const rank = { warn: 0, good: 1, info: 2 };
  return out.sort((a, b) => rank[a.tone] - rank[b.tone]).slice(0, 8);
}
