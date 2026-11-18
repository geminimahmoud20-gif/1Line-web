// =============================================================
//  «أداء المسؤول»: what one salesperson has done with the clients he holds.
//  Pure functions over the leads already on the screen, so the clients list can show it for
//  whoever is picked in the owner filter (and a table of everyone).
// =============================================================
import { assigneeValue } from './assignees.js';
import { outcomeById, OUTCOME_OF_CALL } from './stageGate.js';
import { periodMetrics, compareMetrics } from './performanceReport.js';
import { toMs, leadCreatedMs, isOverdue, isStale, localDayKey, waitingMs, responseSlaMs } from './crmLeadViews.js';

export { OWNER_ALL, OWNER_NONE, matchesOwner } from './crmLeadViews.js';
import { OWNER_NONE } from './crmLeadViews.js';

const STAGES = ['new', 'contacted', 'site_visit', 'negotiating', 'closing'];

/**
 * The picture of one person's clients: how many in each stage, how many are waiting for a first
 * reply or late, how fast he first answers, how many he closed or lost, and when he last touched one.
 */
export function ownerStats(leads = [], now = Date.now()) {
  const today = localDayKey(now);
  const stages = Object.fromEntries(STAGES.map((s) => [s, 0]));
  let won = 0;
  let lost = 0;
  let inactive = 0;
  let open = 0;
  let unanswered = 0;
  let late = 0;
  let overdue = 0;
  let stale = 0;
  let lastActivity = 0;
  const replyMins = [];

  for (const l of leads) {
    if (l.isArchived) continue;
    const st = l.status || 'new';
    const touched = toMs(l.lastActivityAt) || toMs(l.updatedAt) || 0;
    if (touched > lastActivity) lastActivity = touched;
    if (st === 'closed') { won += 1; continue; }
    if (st === 'lost') { lost += 1; continue; }
    if (st === 'inactive') { inactive += 1; continue; }
    open += 1;
    if (st in stages) stages[st] += 1;
    if (!l.firstContactedAt && !l.lastContactedAt && st === 'new') unanswered += 1;
    if (waitingMs(l, now) > responseSlaMs(l)) late += 1;
    if (isOverdue(l, today)) overdue += 1;
    if (isStale(l, now)) stale += 1;
  }
  for (const l of leads) {
    const first = toMs(l.firstContactedAt);
    const created = leadCreatedMs(l);
    if (first && created && first >= created) replyMins.push((first - created) / 60000);
  }
  replyMins.sort((a, b) => a - b);
  const median = replyMins.length ? replyMins[Math.floor(replyMins.length / 2)] : null;
  const decided = won + lost;
  return {
    total: open + won + lost + inactive,
    open, stages, won, lost, inactive,
    unanswered, late, overdue, stale,
    medianReplyMins: median,
    winRate: decided ? Math.round((won / decided) * 100) : null,
    lastActivity: lastActivity || null
  };
}

/** One row per person holding clients (plus «من غير مسؤول»), for the comparison table. Busiest first. */
export function ownersTable(leads = [], people = [], now = Date.now()) {
  const groups = new Map();
  for (const l of leads) {
    const v = assigneeValue(l);
    const key = v.startsWith('user:') ? v : OWNER_NONE;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(l);
  }
  const nameOf = (key) => {
    if (key === OWNER_NONE) return '';
    const raw = key.slice(5);
    if (raw.startsWith('name:')) return raw.slice(5);
    return people.find((p) => p.uid === raw)?.name || leads.find((l) => l.ownerUid === raw)?.ownerName || raw;
  };
  return [...groups.entries()]
    .map(([key, list]) => ({ key, name: nameOf(key), stats: ownerStats(list, now) }))
    .sort((a, b) => b.stats.open - a.stats.open);
}

/** «٣ ساعات» / «٤٥ دقيقة» / «يومين» for a number of minutes */
export function formatMins(mins, isAr = true) {
  if (mins == null) return '—';
  if (mins < 60) return isAr ? `${Math.max(1, Math.round(mins))} د` : `${Math.max(1, Math.round(mins))} min`;
  if (mins < 60 * 24) return isAr ? `${Math.round(mins / 60)} س` : `${Math.round(mins / 60)} h`;
  return isAr ? `${Math.round(mins / 1440)} يوم` : `${Math.round(mins / 1440)} d`;
}

/**
 * Each owner's activity inside a date range, next to the range before it: new clients, replies,
 * visits, closed deals, lost, tasks done. Clients count under whoever holds them now.
 * range / prevRange are { from, to } day keys (utils/reportPeriods); prevRange may be null.
 */
export function ownersPeriodTable(leads = [], people = [], tasks = [], range, prevRange = null, now = Date.now()) {
  return ownersTable(leads, people, now).map((o) => {
    const list = leads.filter((l) => matchesOwnerKey(l, o.key));
    const uid = o.key.startsWith('user:') && !o.key.startsWith('user:name:') ? o.key.slice(5) : '';
    const mine = uid ? tasks.filter((t) => t.assigneeUid === uid) : [];
    const cur = periodMetrics(list, mine, range);
    const prev = prevRange ? periodMetrics(list, mine, prevRange) : null;
    return { key: o.key, name: o.name, cur, prev, cmp: compareMetrics(cur, prev) };
  }).filter((r) => r.cur.newLeads || r.cur.replied || r.cur.viewings || r.cur.closed || r.cur.lost || r.cur.tasksDone || (r.prev && (r.prev.newLeads || r.prev.closed)));
}

const matchesOwnerKey = (lead, key) => {
  const v = assigneeValue(lead);
  return key === OWNER_NONE ? !v.startsWith('user:') : v === key;
};

/**
 * The latest logged contacts across these clients, newest first: [{ leadId, name, outcome, kind, at, by, note, reason }].
 * Reads the outcomes the team logged (and the call prompt's answers), so it says what came of each call or visit.
 */
export function recentContacts(leads = [], limit = 8) {
  const out = [];
  for (const l of leads) {
    if (l.isArchived) continue;
    const seen = new Set();
    for (const e of Array.isArray(l.outcomes) ? l.outcomes : []) {
      const at = toMs(e?.at);
      if (!outcomeById(e?.id) || !at) continue;
      seen.add(`${e.id}@${at}`);
      out.push({ leadId: l.id, name: l.name || '', outcome: e.id, at, by: e.n || '', note: e.note || '', reason: e.reason || '' });
    }
    for (const e of Array.isArray(l.callOutcomes) ? l.callOutcomes : []) {
      const id = OUTCOME_OF_CALL[e?.o];
      const at = toMs(e?.at);
      if (!id || !at || seen.has(`${id}@${at}`)) continue;
      out.push({ leadId: l.id, name: l.name || '', outcome: id, at, by: '', note: '', reason: '' });
    }
  }
  return out
    .sort((a, b) => b.at - a.at)
    .slice(0, limit)
    .map((c) => ({ ...c, kind: outcomeById(c.outcome).kind, label: outcomeById(c.outcome).ar }));
}
