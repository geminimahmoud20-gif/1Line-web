// =============================================================
//  The weekly WhatsApp report for the owner — logic shared by api/weekly-report.js and its tests.
//  Covers the 7 Cairo days that ended yesterday against the 7 before them, with the same numbers
//  and plain-language findings as the CRM's «تقارير الأداء» (src/utils/performanceReport.js).
//  Counts, source names and staff names only: never a client's name or phone.
//  Pure: the route reads Firestore and hands the records in.
// =============================================================
import { periodMetrics, compareMetrics, cohortReports, sellerPerformance, insights } from '../src/utils/performanceReport.js';
import { comparisonRange, addDays } from '../src/utils/reportPeriods.js';
import { goalProgress, GOAL_KEYS } from '../src/utils/goals.js';
import { cairoDay, splitMessage } from './_daily-report-core.js';

export { splitMessage };

const num = (v) => Math.round(Number(v) || 0).toLocaleString('en-US');
const mins = (ms) => {
  if (!ms) return '—';
  const m = Math.round(ms / 60000);
  if (m < 60) return `${m} دقيقة`;
  const h = Math.round(m / 6) / 10;
  return h < 48 ? `${h} ساعة` : `${Math.round(h / 24)} يوم`;
};
const MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
const dayText = (key) => { const [, m, d] = key.split('-').map(Number); return `${d} ${MONTHS[m - 1]}`; };

/** The 7 days that ended yesterday (Cairo), and the 7 before them */
export function weekWindow(now) {
  const to = addDays(cairoDay(now), -1);
  const range = { from: addDays(to, -6), to, days: 7 };
  return { range, prev: comparisonRange(range, 'previous') };
}

const arrow = (c) => (c === null ? '' : c > 0 ? ` (↑${c}%)` : c < 0 ? ` (↓${Math.abs(c)}%)` : ' (=)');
const points = (cur, prev) => { const d = cur - prev; return d === 0 ? ' (=)' : ` (${d > 0 ? '↑' : '↓'}${Math.abs(d)} نقطة)`; };

/** data: { leads, tasks } as stored. Returns { week, text, numbers } */
export function buildWeeklyReport(data, { now = Date.now(), siteUrl = 'https://www.1lineestate.com' } = {}) {
  const leads = data.leads || [];
  const tasks = data.tasks || [];
  const { range, prev } = weekWindow(now);
  const cur = periodMetrics(leads, tasks, range);
  const before = periodMetrics(leads, tasks, prev);
  const c = compareMetrics(cur, before);
  const { funnel, sources } = cohortReports(leads, range);
  const sellers = sellerPerformance(leads, tasks, range, now);
  const findings = insights({ metrics: cur, prev: before, funnel, sources, sellers, leads, tasks, range, now });

  const lines = [`📊 تقرير الأسبوع (${dayText(range.from)} – ${dayText(range.to)})`, 'مقارنة بالأسبوع اللي قبله', ''];
  lines.push(`عملاء جدد: ${num(cur.newLeads)}${arrow(c.newLeads.change)}`);
  lines.push(`اتردّ عليهم: ${num(cur.replied)}${arrow(c.replied.change)}`);
  if (cur.replied) lines.push(`الرد في الميعاد: ${cur.inTimePct}%${points(cur.inTimePct, before.inTimePct)} · وقت الرد: ${mins(cur.medianReplyMs)}`);
  lines.push(`وصلوا لمعاينة: ${num(cur.viewings)}${arrow(c.viewings.change)}`);
  lines.push(`صفقات اتقفلت: ${num(cur.closed)}${arrow(c.closed.change)} · عمولتها: ${num(cur.commission)} ج`);
  lines.push(`اتخسروا: ${num(cur.lost)}${arrow(c.lost.change)}`);
  if (cur.tasksDone || before.tasksDone) lines.push(`مهام خلصت: ${num(cur.tasksDone)}${arrow(c.tasksDone.change)}`);

  const best = sources.filter((s) => s.leads >= 3).sort((a, b) => b.visitPct - a.visitPct || b.leads - a.leads)[0];
  if (best) lines.push('', `🏅 أقوى مصدر: ${best.label} — ${best.leads} عميل، ${best.visitPct}% وصلوا لمعاينة`);
  const top = sellers.find((s) => s.name && s.closed > 0);
  if (top) lines.push(`🏆 أكتر صفقات: ${top.name} (${top.closed})`);

  // The month's goals against the pace: each team goal that is set, and who is behind
  const goalsNow = goalProgress(leads, data.goals, now);
  if (goalsNow.team.length) {
    lines.push('', `🎯 أهداف الشهر (يوم ${goalsNow.win.day} من ${goalsNow.win.days})`);
    for (const r of goalsNow.team) {
      const name = GOAL_KEYS.find((k) => k.id === r.key).ar;
      const verdict = r.status === 'done' ? '✅ تحقق' : r.status === 'behind' ? '⚠️ متأخر عن الإيقاع' : r.status === 'ahead' ? '👍 سابق الإيقاع' : 'على الإيقاع';
      lines.push(`${name}: ${num(r.actual)} من ${num(r.target)} (${r.pct}%) — ${verdict}`);
    }
    const late = goalsNow.people.filter((p) => p.name && p.rows.some((r) => r.status === 'behind')).map((p) => p.name);
    if (late.length) lines.push(`متأخرين عن هدفهم: ${late.slice(0, 5).join('، ')}`);
  }

  if (findings.length) {
    lines.push('', '💡 ملاحظات');
    for (const f of findings.slice(0, 5)) lines.push(`${f.tone === 'warn' ? '⚠️' : f.tone === 'good' ? '✅' : '•'} ${f.text}`);
  }
  lines.push('', `التفاصيل بالتواريخ والمقارنة: ${siteUrl}/crm`);
  return { week: range.to, text: lines.join('\n'), numbers: { ...cur } };
}

/**
 * deps: { now(), load(now) → { leads, tasks }, claimWeek(key) → true on the first call, releaseWeek(key), sendAll(text) → sent }
 * mode: 'cron' (once per week), 'preview' (just the text) or 'test' (sent, labelled, can repeat)
 */
export async function runWeeklyReport(deps, { mode = 'cron', siteUrl } = {}) {
  const now = deps.now();
  const data = await deps.load(now);
  const report = buildWeeklyReport(data, { now, siteUrl });
  const key = `week-${report.week}`;
  if (mode === 'preview') return { status: 200, body: { week: report.week, text: report.text, numbers: report.numbers } };
  if (mode === 'cron' && !(await deps.claimWeek(key))) return { status: 200, body: { skipped: 'already-sent', week: report.week } };
  const header = mode === 'test' ? '🧪 نسخة تجربة\n' : '';
  const parts = splitMessage(header + report.text);
  let sent = 0;
  for (const part of parts) sent = Math.max(sent, await deps.sendAll(part));
  if (!sent && mode === 'cron') await deps.releaseWeek?.(key);
  return { status: sent ? 200 : 502, body: { week: report.week, parts: parts.length, sent } };
}
