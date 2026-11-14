// =============================================================
//  Date ranges for the reports: a preset («آخر ٧ أيام», «الشهر ده») or a custom from/to, and the range
//  it is compared with (the same length right before, or the same dates a month ago). Days are Egypt's
//  calendar days as 'YYYY-MM-DD' keys, so a client who arrived at 1 a.m. counts on his own day.
//  Pure: tests/unit/report-periods.test.mjs
// =============================================================

const DAY = 86_400_000;

/** Egypt's calendar day of a timestamp (ms), or '' when there is none */
export const dayOf = (ms) => (ms > 0 ? new Date(ms).toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' }) : '');

const utc = (key) => Date.parse(`${key}T00:00:00Z`);
const keyOf = (ms) => new Date(ms).toISOString().slice(0, 10);
export const addDays = (key, n) => keyOf(utc(key) + n * DAY);
/** Days from `a` to `b`, inclusive of both ends */
export const spanDays = (a, b) => Math.round((utc(b) - utc(a)) / DAY) + 1;
export const eachDay = (from, to) => Array.from({ length: Math.max(0, spanDays(from, to)) }, (_, i) => addDays(from, i));

/** The same calendar day one month earlier (the 31st of March → the last day of February) */
export function addMonths(key, n) {
  const [y, m, d] = key.split('-').map(Number);
  const first = new Date(Date.UTC(y, m - 1 + n, 1));
  const last = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  return keyOf(Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), Math.min(d, last)));
}

export const PRESETS = [
  { id: 'today', ar: 'النهارده', en: 'Today' },
  { id: 'yesterday', ar: 'إمبارح', en: 'Yesterday' },
  { id: '7', ar: 'آخر ٧ أيام', en: 'Last 7 days' },
  { id: '30', ar: 'آخر ٣٠ يوم', en: 'Last 30 days' },
  { id: '90', ar: 'آخر ٩٠ يوم', en: 'Last 90 days' },
  { id: 'month', ar: 'الشهر ده', en: 'This month' },
  { id: 'lastMonth', ar: 'الشهر اللي فات', en: 'Last month' },
  { id: 'custom', ar: 'تاريخ مخصص', en: 'Custom' }
];

export const COMPARES = [
  { id: 'previous', ar: 'الفترة اللي قبلها', en: 'The period before' },
  { id: 'lastMonth', ar: 'نفس الفترة الشهر اللي فات', en: 'Same dates last month' },
  { id: 'none', ar: 'من غير مقارنة', en: 'No comparison' }
];

const MAX_DAYS = 366;

/** { from, to } (inclusive day keys) for a preset; a custom one is swapped if backwards and capped at a year */
export function resolveRange(preset = '30', now = Date.now(), custom = {}) {
  const today = dayOf(now);
  let from;
  let to = today;
  if (preset === 'today') from = today;
  else if (preset === 'yesterday') { from = addDays(today, -1); to = from; }
  else if (preset === 'month') from = `${today.slice(0, 7)}-01`;
  else if (preset === 'lastMonth') { const first = `${addMonths(`${today.slice(0, 7)}-01`, -1)}`; from = first; to = addDays(`${today.slice(0, 7)}-01`, -1); }
  else if (preset === 'custom') {
    const ok = (k) => /^\d{4}-\d{2}-\d{2}$/.test(k || '') && !Number.isNaN(utc(k));
    from = ok(custom.from) ? custom.from : addDays(today, -29);
    to = ok(custom.to) ? custom.to : today;
    if (from > to) [from, to] = [to, from];
  } else from = addDays(today, -(Math.max(1, Number(preset) || 30) - 1));
  if (spanDays(from, to) > MAX_DAYS) from = addDays(to, -(MAX_DAYS - 1));
  return { from, to, days: spanDays(from, to) };
}

/** The range to compare with, or null when no comparison is wanted */
export function comparisonRange(range, mode = 'previous') {
  if (!range || mode === 'none') return null;
  if (mode === 'lastMonth') {
    const from = addMonths(range.from, -1);
    const to = addMonths(range.to, -1);
    return { from, to, days: spanDays(from, to) };
  }
  const to = addDays(range.from, -1);
  const from = addDays(to, -(range.days - 1));
  return { from, to, days: range.days };
}

/** Does this timestamp (ms) fall on a day of the range? */
export function inRange(ms, range) {
  const d = dayOf(ms);
  return Boolean(d) && d >= range.from && d <= range.to;
}

/** '14 نوفمبر 2026' style, in Latin digits */
export const dateText = (key) => new Date(`${key}T12:00:00Z`).toLocaleDateString('ar-EG-u-nu-latn', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
export const rangeText = (r) => (r.from === r.to ? dateText(r.from) : `${dateText(r.from)} – ${dateText(r.to)}`);
