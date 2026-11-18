// The next days as tappable choices, for forms that ask "which day?". Pure (tests/unit/day-choices.test.mjs).
// Replaces <input type="date">, whose Arabic placeholder Chrome on Android draws with reversed letters.

const pad = (n) => String(n).padStart(2, '0');
/** Local calendar day as YYYY-MM-DD (the value the old date field produced) */
export const isoDay = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/**
 * `count` days starting today: { iso, top, bottom }. Today and tomorrow are named; other days
 * show the weekday over the day and month ("السبت" / "26 أكتوبر").
 */
export function upcomingDays(count = 14, now = new Date(), isAr = true) {
  const locale = isAr ? 'ar-EG-u-nu-latn' : 'en-GB';
  const weekday = new Intl.DateTimeFormat(locale, { weekday: 'long' });
  const dayMonth = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' });
  const out = [];
  for (let i = 0; i < count; i += 1) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i, 12);
    const named = i === 0 ? (isAr ? 'النهارده' : 'Today') : i === 1 ? (isAr ? 'بكرة' : 'Tomorrow') : weekday.format(d);
    out.push({ iso: isoDay(d), top: named, bottom: dayMonth.format(d) });
  }
  return out;
}
