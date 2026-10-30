// =============================================================
//  The daily WhatsApp report for the owner — logic shared by api/daily-report.js and its tests.
//  (Files starting with "_" in api/ are not deployed as their own routes.)
//
//  Everything here is pure: the route reads Firestore and hands the records in. The report is
//  about yesterday (Cairo time), compared with the 7 days before it, and ends with a few
//  suggested decisions drawn only from those numbers. It never contains a customer's name or
//  phone: counts, areas and listing titles only.
// =============================================================

import {
  toMs, leadCreatedMs, isOverdue, isUnassigned, waitingMs, leadSourceKey, LEAD_SOURCES,
  LOST_REASONS, isViewingLead, isSellerLead, getNormalizedPropertyStatus, localDayKey
} from '../src/utils/crmLeadViews.js';
import { propertyTypeLabel } from '../src/utils/placeLabels.js';

const HOUR = 3600 * 1000;
const DAY = 24 * HOUR;

// ── Cairo calendar ──────────────────────────────────────────────────────────

const cairoFields = (ms) => Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Africa/Cairo', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
}).formatToParts(new Date(ms)).map((p) => [p.type, p.value]));

/** YYYY-MM-DD of the Cairo day that contains ms */
export const cairoDay = (ms) => { const f = cairoFields(ms); return `${f.year}-${f.month}-${f.day}`; };

/** Cairo's offset from UTC at ms (2 or 3 hours, daylight saving included) */
const cairoOffset = (ms) => {
  const f = cairoFields(ms);
  return Date.UTC(+f.year, +f.month - 1, +f.day, +f.hour, +f.minute) - Math.floor(ms / 60000) * 60000;
};

/** [start, end) in ms of a Cairo day */
export function cairoDayRange(day) {
  const [y, m, d] = day.split('-').map(Number);
  const utcMidnight = Date.UTC(y, m - 1, d);
  const start = utcMidnight - cairoOffset(utcMidnight - 2 * HOUR);
  const next = Date.UTC(y, m - 1, d + 1);
  const end = next - cairoOffset(next - 2 * HOUR);
  return [start, end];
}

/** The day the report is about (yesterday in Cairo) and the 7 days before it, oldest first */
export function reportDays(now) {
  const today = cairoDay(now);
  const [todayStart] = cairoDayRange(today);
  const target = cairoDay(todayStart - HOUR);
  const before = [];
  for (let i = 7; i >= 1; i -= 1) before.push(cairoDay(cairoDayRange(target)[0] - (i - 1) * DAY - HOUR));
  return { today, target, before };
}

// ── Small helpers ───────────────────────────────────────────────────────────

const n = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const fmt = (v) => Math.round(n(v)).toLocaleString('en-US');
const topEntries = (obj, k = 3) => Object.entries(obj || {}).filter(([, v]) => n(v) > 0).sort((a, b) => n(b[1]) - n(a[1])).slice(0, k);
const avg = (list) => (list.length ? list.reduce((s, v) => s + v, 0) / list.length : 0);

/** "↑18%" / "↓10%" against the 7-day average; '' when there is nothing to compare with */
export function trend(value, average) {
  if (!(average > 0)) return '';
  // A percentage of a handful (3 against 0.6 is "+400%") says nothing: show the average instead
  if (average < 5) return `(متوسط الأسبوع ${Number(average.toFixed(1))} في اليوم)`;
  const pct = Math.round(((value - average) / average) * 100);
  if (Math.abs(pct) < 5) return '(زي المعتاد)';
  return pct > 0 ? `(↑${pct}%)` : `(↓${Math.abs(pct)}%)`;
}

const hoursText = (ms) => {
  const h = ms / HOUR;
  if (h < 1) return `${Math.max(1, Math.round(ms / 60000))} دقيقة`;
  if (h < 48) return `${Math.round(h)} ساعة`;
  return `${Math.round(h / 24)} يوم`;
};

/** Merge the day's sharded analytics_daily docs into one set of counters */
export function mergeDaily(docs = []) {
  const out = {};
  const add = (target, src) => {
    for (const [k, v] of Object.entries(src || {})) {
      if (v && typeof v === 'object' && !Array.isArray(v)) add(target[k] = target[k] || {}, v);
      else if (typeof v === 'number') target[k] = (target[k] || 0) + v;
    }
  };
  for (const d of docs) add(out, d);
  return out;
}

const TYPE_AR = {
  buyer: 'شراء', buyer_demand: 'شراء', request: 'شراء', investor: 'استثمار', seller: 'بيع', valuation: 'بيع',
  broker: 'وسيط', visit: 'معاينة', viewing: 'معاينة', viewing_request: 'معاينة', financing: 'تمويل',
  account: 'حساب جديد', client_registration: 'حساب جديد', callback_request: 'اتصال', deposit: 'حجز'
};
const leadKind = (l) => {
  if (isViewingLead(l)) return 'معاينة';
  if (isSellerLead(l)) return 'بيع';
  return TYPE_AR[l.type] || 'أخرى';
};
const SOURCE_AR = {
  direct: 'مباشر', google: 'جوجل', facebook: 'فيسبوك', fb: 'فيسبوك', instagram: 'إنستجرام', ig: 'إنستجرام',
  whatsapp: 'واتساب', tiktok: 'تيك توك', youtube: 'يوتيوب', bing: 'بينج', referral: 'مواقع تانية', email: 'إيميل'
};
const sourceAr = (id) => LEAD_SOURCES.find((s) => s.id === id)?.ar || 'أخرى';
const lostAr = (id) => LOST_REASONS.find((r) => r.id === id)?.ar || 'سبب آخر';
const deskName = (d) => (!d || d === 'Unassigned' ? 'من غير مسؤول' : String(d));
const leadArea = (l) => l.area || l.details?.area || '';
const leadPropertyId = (l) => String(l.propertyId || l.details?.propertyId || l.details?.propertyCode || '');

/** Split a long report at line breaks into WhatsApp-sized messages, numbered when more than one */
export function splitMessage(text, max = 1000) {
  const parts = [];
  let cur = '';
  for (const line of String(text).split('\n')) {
    const piece = line.length > max ? `${line.slice(0, max - 1)}…` : line;
    if (cur && cur.length + 1 + piece.length > max - 8) { parts.push(cur); cur = piece; } else cur = cur ? `${cur}\n${piece}` : piece;
  }
  if (cur) parts.push(cur);
  return parts.length > 1 ? parts.map((p, i) => `(${i + 1}/${parts.length})\n${p}`) : parts;
}

// ── The report ──────────────────────────────────────────────────────────────

/**
 * data: {
 *   leads, demands, remoteInspections, tradeIns, properties,   // records as stored
 *   daily: { [day]: mergedCounters },                           // analytics_daily, merged per day
 *   propertyStats: [{ id, days: { [day]: views } }],            // analytics_properties
 *   intents: [{ channel, propertyId, createdAt }],               // WhatsApp/phone taps, last 8 days
 *   errorsYesterday, notifyStatus, areaNames: { id: name }
 * }
 */
export function buildDailyReport(data, { now = Date.now(), siteUrl = 'https://www.1lineestate.com' } = {}) {
  const { target, before } = reportDays(now);
  const [start, end] = cairoDayRange(target);
  const weekStart = cairoDayRange(before[0])[0];
  const inDay = (ms) => ms >= start && ms < end;
  const inWeek = (ms) => ms >= weekStart && ms < start;
  const areaName = (id) => (data.areaNames && data.areaNames[id]) || (id ? String(id) : 'من غير منطقة');

  const leads = (data.leads || []).filter((l) => !l.isDeleted);
  const properties = data.properties || [];
  const daily = data.daily || {};
  const today = daily[target] || {};
  const week = before.map((d) => daily[d] || {});
  const avgOf = (fn) => avg(week.map(fn));

  // Traffic (anonymous counts, every visitor)
  const sessions = n(today.sessions);
  const pageViews = n(today.pageViews);
  const propViews = n(today.propertyViews);
  const waTaps = n(today.contacts?.whatsapp);
  const phoneTaps = n(today.contacts?.phone);

  // Requests created yesterday and in the week before
  const dayLeads = leads.filter((l) => inDay(leadCreatedMs(l)));
  const weekLeads = leads.filter((l) => inWeek(leadCreatedMs(l)));
  const kinds = {};
  const sources = {};
  const areas = {};
  for (const l of dayLeads) {
    const k = leadKind(l); kinds[k] = (kinds[k] || 0) + 1;
    const s = sourceAr(leadSourceKey(l)); sources[s] = (sources[s] || 0) + 1;
    const a = leadArea(l); if (a) areas[a] = (areas[a] || 0) + 1;
  }
  const countIn = (list, test) => (list || []).filter((r) => test(toMs(r.createdAt) || toMs(r.submittedAt))).length;
  const dayDemands = countIn(data.demands, inDay);
  const dayRemote = countIn(data.remoteInspections, inDay);
  const dayTradeIns = countIn(data.tradeIns, inDay);

  // What needs doing today (the whole open book, not just yesterday)
  const todayKey = localDayKey(now);
  const waiting = leads.map((l) => waitingMs(l, now)).filter((ms) => ms > 0);
  const overdue = leads.filter((l) => isOverdue(l, todayKey)).length;
  const unassigned = leads.filter(isUnassigned).length;

  // First reply time, leads of the last 7 days that got one
  const replyTimes = [...weekLeads, ...dayLeads]
    .map((l) => { const first = toMs(l.firstContactedAt); const made = leadCreatedMs(l); return first && made && first >= made ? first - made : 0; })
    .filter((ms) => ms > 0);

  // Team, last 7 days + yesterday
  const team = {};
  for (const l of [...weekLeads, ...dayLeads]) {
    const d = deskName(l.assignedTo);
    team[d] = team[d] || { total: 0, replied: 0, won: 0 };
    team[d].total += 1;
    if (toMs(l.firstContactedAt) || toMs(l.lastContactedAt) || (l.status && l.status !== 'new')) team[d].replied += 1;
    if (l.status === 'closed') team[d].won += 1;
  }

  // Won and lost during the last 8 days (by last change)
  const changedRecently = (l) => { const t = toMs(l.statusChangedAt) || toMs(l.updatedAt) || toMs(l.lastActivityAt); return t >= weekStart && t < end; };
  const wonRecent = leads.filter((l) => l.status === 'closed' && changedRecently(l)).length;
  const lostRecent = leads.filter((l) => l.status === 'lost' && !l.isArchived && changedRecently(l));
  const lostReasons = {};
  for (const l of lostRecent) { const r = lostAr(l.lostReason); lostReasons[r] = (lostReasons[r] || 0) + 1; }

  // Listings
  const live = properties.filter((p) => getNormalizedPropertyStatus(p) === 'published');
  const byId = new Map(properties.map((p) => [String(p.id), p]));
  const newListings = properties.filter((p) => inDay(toMs(p.createdAt))).length;
  const liveByArea = {};
  for (const p of live) { const a = p.areaKey || p.area; if (a) liveByArea[a] = (liveByArea[a] || 0) + 1; }

  // Interest per listing yesterday, and taps on its contact buttons over the last 8 days
  const contactsByProp = {};
  for (const i of data.intents || []) { const id = String(i.propertyId || ''); if (id) contactsByProp[id] = (contactsByProp[id] || 0) + 1; }
  for (const l of [...weekLeads, ...dayLeads]) { const id = leadPropertyId(l); if (id) contactsByProp[id] = (contactsByProp[id] || 0) + 1; }
  const viewsYesterday = (data.propertyStats || [])
    .map((s) => ({ id: String(s.id), views: n(s.days?.[target]), week: before.reduce((t, d) => t + n(s.days?.[d]), 0) + n(s.days?.[target]) }))
    .filter((s) => s.views > 0 || s.week > 0);
  const topProps = [...viewsYesterday].sort((a, b) => b.views - a.views).filter((s) => s.views > 0).slice(0, 3);
  const titleOf = (id) => {
    const p = byId.get(id);
    if (!p) return `عقار ${id}`;
    const title = String(p.title_ar || '').trim() || `${propertyTypeLabel(p.type)} ${areaName(p.areaKey || p.area)}`;
    return title.length > 38 ? `${title.slice(0, 37)}…` : title;
  };

  // Demand by area: searches + views + requests over 8 days, against live listings there
  const demandByArea = {};
  const addDemand = (obj, w = 1) => { for (const [a, v] of Object.entries(obj || {})) if (a && a !== 'all') demandByArea[a] = (demandByArea[a] || 0) + n(v) * w; };
  for (const d of [...week, today]) { addDemand(d.searchAreas, 1); addDemand(d.viewAreas, 0.2); }
  for (const l of [...weekLeads, ...dayLeads]) { const a = leadArea(l); if (a) demandByArea[a] = (demandByArea[a] || 0) + 5; }

  // Peak hour yesterday
  const peak = topEntries(today.hours, 1)[0];

  // ── Write it ──
  const dayLabel = new Intl.DateTimeFormat('ar-EG-u-nu-latn', { timeZone: 'Africa/Cairo', weekday: 'long', day: 'numeric', month: 'numeric' }).format(new Date(start + 12 * HOUR));
  const L = [];
  L.push(`📊 تقرير 1Line اليومي — ${dayLabel}`);
  L.push('(أرقام امبارح، والنسبة مقارنة بمتوسط الـ7 أيام اللي قبله)');
  L.push('');
  L.push('👥 الزوار');
  L.push(`• زيارات: ${fmt(sessions)} ${trend(sessions, avgOf((d) => n(d.sessions)))}`);
  L.push(`• صفحات اتفتحت: ${fmt(pageViews)} · عقارات اتشافت: ${fmt(propViews)} ${trend(propViews, avgOf((d) => n(d.propertyViews)))}`);
  L.push(`• ضغطات تواصل: واتساب ${fmt(waTaps)} · اتصال ${fmt(phoneTaps)} ${trend(waTaps + phoneTaps, avgOf((d) => n(d.contacts?.whatsapp) + n(d.contacts?.phone)))}`);
  if (sessions > 0) L.push(`• نسبة اللي سابوا طلب: ${((dayLeads.length / sessions) * 100).toFixed(1)}% من الزيارات`);
  const topSources = topEntries(today.sources, 3);
  if (topSources.length) L.push(`• جايين منين: ${topSources.map(([k, v]) => `${SOURCE_AR[k] || k} ${fmt(v)}`).join('، ')}`);
  if (peak) L.push(`• أكتر ساعة زيارات: ${Number(peak[0])}:00`);
  L.push('');

  L.push(`🆕 طلبات جديدة: ${dayLeads.length} ${trend(dayLeads.length, weekLeads.length / 7)}`);
  if (dayLeads.length) {
    L.push(`• النوع: ${topEntries(kinds, 5).map(([k, v]) => `${k} ${v}`).join(' · ')}`);
    L.push(`• المصدر: ${topEntries(sources, 4).map(([k, v]) => `${k} ${v}`).join('، ')}`);
    const ta = topEntries(areas, 3);
    if (ta.length) L.push(`• المناطق: ${ta.map(([k, v]) => `${areaName(k)} (${v})`).join('، ')}`);
  }
  const extras = [dayDemands && `طلبات مشترين ${dayDemands}`, dayRemote && `معاينة عن بُعد ${dayRemote}`, dayTradeIns && `بدل ${dayTradeIns}`].filter(Boolean);
  if (extras.length) L.push(`• كمان: ${extras.join(' · ')}`);
  L.push('');

  const todo = [];
  if (waiting.length) todo.push(`• ${waiting.length} طلب مستني أول رد (أقدمهم من ${hoursText(Math.max(...waiting))})`);
  if (overdue) todo.push(`• ${overdue} متابعة فات معادها`);
  if (unassigned) todo.push(`• ${unassigned} طلب من غير موظف مسؤول`);
  if (data.notifyStatus && data.notifyStatus.lastFailAt > data.notifyStatus.lastOkAt) todo.push('• تنبيهات الواتساب: آخر رسالة ماوصلتش');
  if (n(data.errorsYesterday) >= 10) todo.push(`• ${fmt(data.errorsYesterday)} خطأ في الموقع امبارح (إدارة المنظومة ← أخطاء الموقع)`);
  L.push(todo.length ? '⚠️ محتاج يتعمل النهارده' : '✅ مفيش طلبات متأخرة');
  L.push(...todo);
  L.push('');

  L.push('⏱️ الأداء (آخر 8 أيام)');
  if (replyTimes.length) L.push(`• متوسط أول رد: ${hoursText(avg(replyTimes))} (على ${replyTimes.length} طلب)`);
  L.push(`• صفقات اتقفلت: ${wonRecent} · اتخسرت: ${lostRecent.length}`);
  const lr = topEntries(lostReasons, 2);
  if (lr.length) L.push(`• أسباب الخسارة: ${lr.map(([k, v]) => `${k} (${v})`).join('، ')}`);
  const teamRows = Object.entries(team).sort((a, b) => b[1].total - a[1].total).slice(0, 4);
  for (const [d, t] of teamRows) L.push(`• ${d}: ${t.total} طلب، اترد على ${t.replied}${t.won ? `، اتقفل ${t.won}` : ''}`);
  L.push('');

  L.push(`🏠 العقارات: ${live.length} معروض${newListings ? ` · ${newListings} جديد امبارح` : ''}`);
  topProps.forEach((s, i) => L.push(`${i + 1}. ${titleOf(s.id)} — ${s.views} مشاهدة${contactsByProp[s.id] ? `، ${contactsByProp[s.id]} تواصل (8 أيام)` : ''}`));
  const searchTop = topEntries(Object.fromEntries(Object.entries(today.searchAreas || {}).filter(([k]) => k !== 'all')), 3);
  if (searchTop.length) L.push(`🔍 الناس دوّرت على: ${searchTop.map(([k, v]) => `${areaName(k)} (${v})`).join('، ')}`);
  L.push('');

  // Suggested decisions, only from the numbers above
  const ideas = [];
  if (waiting.length) ideas.push(`رد على الـ${waiting.length} طلب المستنيين قبل الضهر؛ الطلب اللي بيستنى أكتر من ساعتين فرصته بتقل.`);
  const gap = Object.entries(demandByArea)
    .map(([a, d]) => ({ a, d, supply: liveByArea[a] || 0 }))
    .filter((x) => x.d >= 8 && x.supply <= 2)
    .sort((x, y) => y.d / (y.supply + 1) - x.d / (x.supply + 1))[0];
  if (gap) ideas.push(`فيه طلب على ${areaName(gap.a)} و${gap.supply ? `عندنا ${gap.supply} عقار بس معروض هناك` : 'مفيش ولا عقار معروض هناك'}: دوّر على عروض فيها.`);
  const cold = viewsYesterday.filter((s) => s.week >= 30 && !contactsByProp[s.id]).sort((a, b) => b.week - a.week)[0];
  if (cold) ideas.push(`«${titleOf(cold.id)}» اتشاف ${cold.week} مرة في 8 أيام ومفيش حد اتواصل: راجع السعر أو الصور.`);
  const sessAvg = avgOf((d) => n(d.sessions));
  if (sessAvg >= 20 && sessions < sessAvg * 0.7) ideas.push(`الزيارات قلّت ${Math.round((1 - sessions / sessAvg) * 100)}% عن المعتاد: راجع الإعلانات والبوستات.`);
  if (replyTimes.length >= 3 && avg(replyTimes) > 2 * HOUR) ideas.push(`متوسط أول رد ${hoursText(avg(replyTimes))}: حاول تنزّله تحت الساعتين.`);
  const lostTop = lr[0];
  if (lostTop && lostTop[1] >= 2 && /السعر/.test(lostTop[0])) ideas.push('أكتر سبب خسارة هو السعر: راجع تسعير العقارات المعروضة أو اعرض بدائل أرخص.');
  if (unassigned >= 3) ideas.push(`وزّع الـ${unassigned} طلب اللي من غير مسؤول على الفريق.`);
  if (ideas.length) {
    L.push('💡 قرارات مقترحة');
    ideas.slice(0, 4).forEach((t) => L.push(`• ${t}`));
    L.push('');
  }
  L.push(`افتح الـCRM: ${siteUrl}/crm`);

  return {
    day: target,
    text: L.join('\n').replace(/\n{3,}/g, '\n\n'),
    numbers: { sessions, pageViews, propViews, waTaps, phoneTaps, leads: dayLeads.length, waiting: waiting.length, overdue, unassigned, live: live.length, ideas: ideas.length }
  };
}

/**
 * One run: build, claim the day (unless a test or a preview), send.
 * deps: { load() → data, claimDay(day) → bool, releaseDay(day), sendAll(text) → number sent, now() }
 */
export async function runDailyReport(deps, { mode = 'cron', siteUrl } = {}) {
  const now = deps.now();
  const data = await deps.load(now);
  const report = buildDailyReport(data, { now, siteUrl });
  if (mode === 'preview') return { status: 200, body: { day: report.day, text: report.text, numbers: report.numbers } };
  if (mode === 'cron' && !(await deps.claimDay(report.day))) return { status: 200, body: { skipped: 'already-sent', day: report.day } };
  const header = mode === 'test' ? '🧪 نسخة تجربة\n' : '';
  const parts = splitMessage(header + report.text);
  let sent = 0;
  for (const part of parts) sent = Math.max(sent, await deps.sendAll(part));
  if (!sent && mode === 'cron') await deps.releaseDay?.(report.day);
  return { status: sent ? 200 : 502, body: { day: report.day, parts: parts.length, sent } };
}
