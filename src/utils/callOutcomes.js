// =============================================================
//  How each call ended: ردّ / ما ردّش / مشغول / رقم غلط. Asked right after a call button was tapped, saved on
//  the lead (`callOutcomes`, the last 20) and counted here: how often clients answer, and at which hours
//  and days, so the team calls when people pick up. Pure: tests/unit/call-outcomes.test.mjs
// =============================================================
import { toMs } from './crmLeadViews.js';
import { dayOf, inRange } from './reportPeriods.js';

export const OUTCOMES = [
  { id: 'answered', ar: 'ردّ وكلّمته', en: 'Answered' },
  { id: 'no_answer', ar: 'ما ردّش', en: 'No answer' },
  { id: 'busy', ar: 'مشغول / كلّمني بعدين', en: 'Busy' },
  { id: 'wrong', ar: 'رقم غلط', en: 'Wrong number' }
];
export const KEEP = 20;
/** Fewest calls in a time slot before it is called "best" */
export const MIN_SLOT_CALLS = 5;
/** Fewest calls in total before the hours are worth reading */
export const MIN_TOTAL_CALLS = 30;

export const callEntry = (outcome, me, now = Date.now()) => OUTCOMES.some((o) => o.id === outcome)
  ? { at: new Date(now).toISOString(), o: outcome, by: String(me?.uid || ''), n: String(me?.name || '').slice(0, 40) }
  : null;

/** The patch that adds an outcome to a lead (keeps the latest 20) and counts as activity */
export function outcomePatch(lead, entry) {
  if (!entry) return null;
  const label = OUTCOMES.find((o) => o.id === entry.o)?.ar;
  return {
    callOutcomes: [...(Array.isArray(lead?.callOutcomes) ? lead.callOutcomes : []), entry].slice(-KEEP),
    lastCallOutcome: entry.o,
    lastActivityAt: entry.at,
    activityLogs: [{ timestamp: entry.at, action: `مكالمة: ${label}` }, ...(lead?.activityLogs || [])]
  };
}

/** Egypt's hour (0–23) and weekday (0 = Sunday) of a timestamp */
export const cairoHour = (ms) => Number(new Date(ms).toLocaleString('en-GB', { hour: '2-digit', hour12: false, timeZone: 'Africa/Cairo' })) % 24;
export const cairoWeekday = (ms) => new Date(`${dayOf(ms)}T12:00:00Z`).getUTCDay();

/** Every recorded call of these leads within a range: [{ ms, o, by, n }] */
export function callsIn(leads = [], range) {
  const out = [];
  for (const l of leads) {
    if (!l || l.isArchived) continue;
    for (const e of Array.isArray(l.callOutcomes) ? l.callOutcomes : []) {
      const ms = toMs(e?.at);
      if (ms && (!range || inRange(ms, range))) out.push({ ms, o: e.o, by: e.by || '', n: e.n || '' });
    }
  }
  return out;
}

const rateOf = (list) => {
  const counted = list.filter((c) => c.o !== 'wrong');
  return counted.length ? Math.round((counted.filter((c) => c.o === 'answered').length / counted.length) * 100) : 0;
};

/**
 * { total, answered, rate, wrong, slots, days, sellers, best, enough } for the calls in a range.
 * slots: 2-hour blocks that have calls ({ from, to, calls, rate }); best: the top slots with enough calls.
 */
export function callStats(leads = [], range) {
  const calls = callsIn(leads, range);
  const real = calls.filter((c) => c.o !== 'wrong');
  const slotMap = new Map();
  const dayMap = new Map();
  const sellerMap = new Map();
  for (const c of calls) {
    const block = Math.floor(cairoHour(c.ms) / 2);
    slotMap.set(block, [...(slotMap.get(block) || []), c]);
    const wd = cairoWeekday(c.ms);
    dayMap.set(wd, [...(dayMap.get(wd) || []), c]);
    const key = c.by || c.n || '—';
    sellerMap.set(key, { id: key, name: c.n, list: [...(sellerMap.get(key)?.list || []), c] });
  }
  const slots = [...slotMap.entries()].sort((a, b) => a[0] - b[0]).map(([b, list]) => ({ from: b * 2, to: b * 2 + 2, calls: list.length, rate: rateOf(list) }));
  return {
    total: calls.length,
    answered: real.filter((c) => c.o === 'answered').length,
    rate: rateOf(calls),
    wrong: calls.length - real.length,
    slots,
    days: [...dayMap.entries()].sort((a, b) => a[0] - b[0]).map(([d, list]) => ({ weekday: d, calls: list.length, rate: rateOf(list) })),
    sellers: [...sellerMap.values()].map((s) => ({ id: s.id, name: s.name, calls: s.list.length, rate: rateOf(s.list) })).sort((a, b) => b.calls - a.calls),
    best: slots.filter((s) => s.calls >= MIN_SLOT_CALLS).sort((a, b) => b.rate - a.rate || b.calls - a.calls).slice(0, 3),
    enough: calls.length >= MIN_TOTAL_CALLS
  };
}

export const WEEKDAYS_AR = ['الأحد', 'الاتنين', 'التلات', 'الأربع', 'الخميس', 'الجمعة', 'السبت'];

/** 'من 9 ص إلى 11 ص' for a 2-hour slot (words, not a dash, so right-to-left text keeps the order) */
export function slotLabel(from, to) {
  const at = (n) => `${n % 12 === 0 ? 12 : n % 12} ${n % 24 < 12 ? 'ص' : 'م'}`;
  return `من ${at(from)} إلى ${at(to)}`;
}
