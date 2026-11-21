// Pipeline decisions: which deals need a person today, why, and what to do next.
// Pure helpers (no React), unit-tested in tests/unit/deal-signals.test.mjs.
import { toMs, createdMs, stageSinceMs, isStalled, isNewOverdue } from './pipelineCards.js';
import { isAccountLead } from './crmLeadViews.js';

const DAY = 24 * 60 * 60 * 1000;
export const BIG_DEAL = 5_000_000;
/** A big deal untouched this many days is urgent; any deal untouched IDLE_DAYS is worth a call */
export const BIG_IDLE_DAYS = 3;
export const IDLE_DAYS = 5;

/** What to do next, per stage (the same activities the stage lock asks for) */
export const NEXT_STEP = {
  new: 'اتصل بيه وأكّد المطلوب',
  contacted: 'حدّد ميعاد معاينة',
  site_visit: 'اسأله رأيه بعد المعاينة',
  negotiating: 'قدّم العرض واقفل على سعر',
  closing: 'جهّز الحجز والعقد'
};

/** Someone who only registered an account: the first call finds out what they want */
export const NEXT_STEP_ACCOUNT = 'اتصل واسأله: بيدوّر على شراء ولا عنده عقار للبيع؟';

const REASONS = {
  new_overdue: { tone: 'danger', label: 'محدش كلّمه +24 ساعة', weight: 100 },
  follow_overdue: { tone: 'danger', label: 'متابعة فاتت', weight: 90 },
  big_idle: { tone: 'danger', label: 'صفقة كبيرة من غير حركة', weight: 80 },
  stalled: { tone: 'warn', label: 'راكدة في المرحلة', weight: 50 },
  idle: { tone: 'warn', label: 'من غير تواصل', weight: 40 }
};

const startOfDay = (ms) => { const d = new Date(ms); d.setHours(0, 0, 0, 0); return d.getTime(); };

const lastTouchMs = (lead) => {
  for (const v of [lead?.lastActivityAt, lead?.lastContactedAt, lead?.updatedAt]) {
    const t = toMs(v);
    if (Number.isFinite(t)) return t;
  }
  const s = stageSinceMs(lead);
  return Number.isFinite(s) ? s : createdMs(lead);
};

/**
 * Why a deal needs attention now, or null. One reason per deal (the most urgent), with a score
 * to sort by: the reason first, the money second.
 * @returns {{ id: string, tone: 'danger'|'warn', label: string, next: string, score: number, days?: number } | null}
 */
export function attentionOf(lead, { now = Date.now(), value = 0 } = {}) {
  const status = lead?.status || 'new';
  if (!NEXT_STEP[status]) return null; // won, lost, inactive: nothing to decide
  let id = null;
  let days;
  const follow = toMs(lead?.nextFollowUpAt);
  const touched = lastTouchMs(lead);
  const idleDays = Number.isFinite(touched) ? Math.floor((now - touched) / DAY) : 0;

  if (isNewOverdue(lead, now)) id = 'new_overdue';
  else if (Number.isFinite(follow) && follow < startOfDay(now)) {
    id = 'follow_overdue';
    days = Math.max(1, Math.round((startOfDay(now) - startOfDay(follow)) / DAY));
  } else if (value >= BIG_DEAL && idleDays >= BIG_IDLE_DAYS) { id = 'big_idle'; days = idleDays; }
  else if (isStalled(lead, now)) id = 'stalled';
  else if (idleDays >= IDLE_DAYS) { id = 'idle'; days = idleDays; }

  if (!id) return null;
  const r = REASONS[id];
  // Money breaks ties inside one reason: up to +9 for 10M and above
  const money = Math.min(9, Math.floor((Number(value) || 0) / 1_000_000 * 0.9));
  return { id, tone: r.tone, label: r.label, next: (status === 'new' || status === 'contacted') && isAccountLead(lead) ? NEXT_STEP_ACCOUNT : NEXT_STEP[status], score: r.weight + money, ...(days ? { days } : {}) };
}

/** Deals that need attention, most urgent first: [{ lead, value, signal }] */
export function decisionList(leads, { now = Date.now(), worth = () => 0, limit = 5 } = {}) {
  const out = [];
  for (const lead of leads) {
    const value = worth(lead);
    const signal = attentionOf(lead, { now, value });
    if (signal) out.push({ lead, value, signal });
  }
  out.sort((a, b) => b.signal.score - a.signal.score || b.value - a.value);
  return limit ? out.slice(0, limit) : out;
}

/** Per-stage and board totals of deals needing attention and the money sitting in them */
export function attentionSummary(leads, { now = Date.now(), worth = () => 0, columnOf = (l) => l.status || 'new' } = {}) {
  const byStage = {};
  let count = 0;
  let value = 0;
  let danger = 0;
  for (const lead of leads) {
    const v = worth(lead);
    const s = attentionOf(lead, { now, value: v });
    if (!s) continue;
    const col = columnOf(lead);
    const b = byStage[col] || (byStage[col] = { count: 0, value: 0 });
    b.count += 1;
    b.value += v;
    count += 1;
    value += v;
    if (s.tone === 'danger') danger += 1;
  }
  return { byStage, count, value, danger };
}

/** The attention order for a column: urgent first, the rest keep their order */
export function sortByAttention(leads, { now = Date.now(), worth = () => 0 } = {}) {
  const scored = leads.map((lead, i) => ({ lead, i, s: attentionOf(lead, { now, value: worth(lead) })?.score || 0 }));
  scored.sort((a, b) => b.s - a.s || a.i - b.i);
  return scored.map((x) => x.lead);
}
