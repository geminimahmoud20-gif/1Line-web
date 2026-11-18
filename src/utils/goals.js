// =============================================================
//  Monthly goals: what the team and each salesperson aim for this month (new clients, viewings, deals,
//  commission), how far they are, and whether the pace will reach it. The goals are saved as
//  crm_goals/current { team: { key: n }, people: { uid: { key: n } } } and repeat every month.
//  Actuals are counted on the day each thing happened, from the 1st of the month (Cairo) until today.
//  Pure: tests/unit/goals.test.mjs
// =============================================================
import { leadCreatedMs } from './crmLeadViews.js';
import { leadCommission } from './commission.js';
import { enteredAt } from './performanceReport.js';
import { dayOf, inRange } from './reportPeriods.js';

export const GOAL_KEYS = [
  { id: 'leads', ar: 'عملاء جدد', en: 'New clients' },
  { id: 'viewings', ar: 'معاينات', en: 'Viewings' },
  { id: 'closed', ar: 'صفقات', en: 'Deals' },
  { id: 'commission', ar: 'عمولة (ج)', en: 'Commission (EGP)', money: true }
];
const VISITED = ['site_visit', 'negotiating', 'closing', 'closed'];

/** Month to date in Cairo: { from, to, day (of the month), days (in the month) } */
export function monthWindow(now = Date.now()) {
  const to = dayOf(now);
  const [y, m, d] = to.split('-').map(Number);
  return { from: `${to.slice(0, 7)}-01`, to, day: d, days: new Date(Date.UTC(y, m, 0)).getUTCDate() };
}

const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';
const num = (v) => {
  const text = String(v ?? '').replace(/[٠-٩]/g, (d) => ARABIC_DIGITS.indexOf(d)).replace(/[,،\s]/g, '');
  const n = Math.round(Number(text));
  return Number.isFinite(n) && n > 0 ? n : 0;
};

/** Only known keys, positive whole numbers; empty ones dropped */
export function cleanTargets(raw = {}) {
  const out = {};
  for (const { id } of GOAL_KEYS) if (num(raw?.[id]) > 0) out[id] = num(raw[id]);
  return out;
}
export function normalizeGoals(raw) {
  const people = {};
  for (const [uid, t] of Object.entries(raw?.people || {})) { const c = cleanTargets(t); if (Object.keys(c).length) people[uid] = c; }
  return { team: cleanTargets(raw?.team), people };
}

const emptyCount = () => ({ leads: 0, viewings: 0, closed: 0, commission: 0 });
const add = (acc, l, win) => {
  if (inRange(leadCreatedMs(l), win)) acc.leads += 1;
  if (inRange(enteredAt(l, VISITED), win)) acc.viewings += 1;
  if (inRange(enteredAt(l, ['closed']), win)) { acc.closed += 1; acc.commission += leadCommission(l).gross; }
};

/** This month's counts for the whole team and per owner: { team, people: { uid: { name, ...counts } } } */
export function monthActuals(leads = [], now = Date.now()) {
  const win = monthWindow(now);
  const team = emptyCount();
  const people = {};
  for (const l of leads) {
    if (!l || l.isArchived) continue;
    add(team, l, win);
    if (l.ownerUid) {
      const p = people[l.ownerUid] || { name: l.ownerName || '', ...emptyCount() };
      if (l.ownerName && !p.name) p.name = l.ownerName;
      add(p, l, win);
      people[l.ownerUid] = p;
    }
  }
  return { team, people };
}

/**
 * One goal against its pace: { pct, expectedPct, projected, status }. The pace is the share of the month
 * gone; 'done' once reached, else 'ahead' (10+ points above the pace), 'on', or 'behind' (10+ below).
 */
export function paceOf(actual, target, win) {
  if (!(target > 0)) return null;
  const pct = Math.round((actual / target) * 100);
  const expectedPct = Math.round((win.day / win.days) * 100);
  const projected = Math.round((actual / Math.max(1, win.day)) * win.days);
  const status = actual >= target ? 'done' : pct >= expectedPct + 10 ? 'ahead' : pct >= expectedPct - 10 ? 'on' : 'behind';
  return { actual, target, pct, expectedPct, projected, status };
}

const rowsOf = (targets, actual, win) => GOAL_KEYS
  .map((k) => ({ key: k.id, ...paceOf(actual?.[k.id] || 0, targets?.[k.id] || 0, win) }))
  .filter((r) => r.target > 0);

/** { win, team: rows, people: [{ uid, name, rows }] } for goals + leads; people with no target are left out */
export function goalProgress(leads, goals, now = Date.now()) {
  const win = monthWindow(now);
  const g = normalizeGoals(goals);
  const act = monthActuals(leads, now);
  return {
    win,
    team: rowsOf(g.team, act.team, win),
    people: Object.entries(g.people).map(([uid, t]) => ({ uid, name: act.people[uid]?.name || '', rows: rowsOf(t, act.people[uid], win) }))
  };
}

/** A person's own rows (what a salesperson sees about themselves) */
export const myGoalRows = (leads, goals, uid, now = Date.now()) => goalProgress(leads, goals, now).people.find((p) => p.uid === uid)?.rows || [];

export const STATUS_LABEL = {
  done: { ar: 'تحقق ✓', en: 'Reached' },
  ahead: { ar: 'سابق الإيقاع', en: 'Ahead' },
  on: { ar: 'على الإيقاع', en: 'On pace' },
  behind: { ar: 'متأخر عن الإيقاع', en: 'Behind pace' }
};
