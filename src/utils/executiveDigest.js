// =============================================================
//  Executive Daily Digest & Weighted Pipeline Cashflow Engine
//  1. Advanced Stage-Weighted Cashflow Horizon (30d / 60d / 90d)
//  2. 9:00 AM Executive Morning Briefing Generator for Founders & GMs
// =============================================================

import { leadCommission, STAGE_PROBABILITY, dealValue } from './commission.js';
import { checkSlaEscalations } from './tasks.js';
import { calculateDaysOnMarket } from './propertyDeepReports.js';
import { toMs } from './crmLeadViews.js';

const DAY_MS = 86_400_000;

/**
 * 1. Calculate Advanced Weighted Cashflow Horizons
 */
export function calculateAdvancedCashflowForecast(leads = [], now = Date.now()) {
  const activeLeads = leads.filter((l) => l && !l.isArchived);

  let horizon30d = 0; // Closing (90%) + active Negotiating (75%)
  let horizon60d = 0; // Site Visit (35%) + Negotiating
  let horizon90d = 0; // Full weighted pipeline
  let grossPipeline = 0;
  let dealsUnderNegotiation = [];

  for (const l of activeLeads) {
    const st = l.status || 'new';
    if (st === 'closed' || st === 'lost') continue;

    const comm = leadCommission(l);
    if (!comm.value) continue;

    grossPipeline += comm.gross;
    horizon90d += comm.weighted;

    const lastTouch = toMs(l.lastActivityAt) || toMs(l.updatedAt) || now;
    const isRecent = now - lastTouch <= 14 * DAY_MS;

    if (st === 'closing') {
      horizon30d += Math.round(comm.gross * 0.90);
      horizon60d += Math.round(comm.gross * 0.90);
    } else if (st === 'negotiating') {
      if (isRecent) {
        horizon30d += Math.round(comm.gross * 0.75);
      }
      horizon60d += Math.round(comm.gross * 0.75);
      dealsUnderNegotiation.push({
        id: String(l.id),
        name: l.name || 'عميل',
        dealValue: comm.value,
        expectedCommission: comm.gross,
        weighted: comm.weighted
      });
    } else if (st === 'site_visit') {
      horizon60d += Math.round(comm.gross * 0.35);
    }
  }

  return {
    horizon30d,
    horizon60d,
    horizon90d,
    grossPipeline,
    dealsUnderNegotiation: dealsUnderNegotiation.sort((a, b) => b.dealValue - a.dealValue)
  };
}

/**
 * 2. Generate Executive Morning Briefing
 */
export function generateExecutiveDigest({
  leads = [],
  properties = [],
  tasks = [],
  now = Date.now(),
  isAr = true
} = {}) {
  const yesterdayMs = now - 24 * 3600 * 1000;

  // 1. New Leads in last 24h
  const newLeads24h = leads.filter((l) => {
    const created = toMs(l.createdAt) || toMs(l.timestamp);
    return created >= yesterdayMs;
  });

  // Source breakdown
  const sourcesMap = new Map();
  newLeads24h.forEach((l) => {
    const src = l.source || 'مباشر';
    sourcesMap.set(src, (sourcesMap.get(src) || 0) + 1);
  });
  const topSources = Array.from(sourcesMap.entries()).map(([k, v]) => `${k} (${v})`).join('، ') || '—';

  // 2. Visits scheduled for today
  const todayKey = new Date(now).toISOString().slice(0, 10);
  const visitsToday = leads.filter((l) => {
    return l.siteVisit?.visitDate === todayKey || l.details?.visitDate === todayKey;
  });

  // 3. SLA Escalations
  const sla = checkSlaEscalations(tasks, leads, now);

  // 4. Financial Horizons
  const cashflow = calculateAdvancedCashflowForecast(leads, now);

  // 5. Stale Inventory
  const dom = calculateDaysOnMarket(properties, now);

  // Compile formatted WhatsApp Executive Briefing
  const dateStr = new Date(now).toLocaleDateString('ar-EG-u-nu-latn', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const whatsappDigestText = isAr
    ? `🌅 *ملخص الصباح التنفيذي — شركة 1Line للحلول العقارية*\n` +
      `📅 *${dateStr}*\n` +
      `━━━━━━━━━━━━━━━━━━━━\n\n` +
      `📥 *1. حركة العملاء الجدد (آخر 24 ساعة):*\n` +
      `• عدد العملاء الجدد: *${newLeads24h.length} عملاء*\n` +
      `• أبرز المصادر: ${topSources}\n\n` +
      `🚗 *2. المعاينات الميدانية المجدولة لليوم:*\n` +
      `• إجمالي المعاينات: *${visitsToday.length} معاينات*\n` +
      (visitsToday.length > 0
        ? visitsToday.slice(0, 3).map((v) => `  - ${v.name} (${v.siteVisit?.visitTime || 'موعد محدد'}) في ${v.area || 'سوهاج'}`).join('\n') + '\n\n'
        : '  (لا توجد معاينات مسجلة لليوم حتى الآن)\n\n') +
      `⚠️ *3. مؤشر الانضباط والمهام الحرجة (SLA):*\n` +
      `• مهام متأخرة عاجلة/صفقات كبرى: *${sla.criticalCount} مهام حرجة*\n` +
      (sla.criticalCount > 0
        ? sla.escalatedTasks.slice(0, 2).map((t) => `  - 🔴 ${t.title} (${t.assigneeName}) • متأخرة ${t.overdueHours}س`).join('\n') + '\n\n'
        : '  - ✅ مؤشر الانضباط ممتاز: لا توجد أي مهام حرجة متأخرة.\n\n') +
      `💰 *4. التدفق النقدي والعمولات المتوقعة (Weighted Forecast):*\n` +
      `• السيولة المتوقعة خلال 30 يوماً: *${cashflow.horizon30d.toLocaleString('en-US')} ج.م*\n` +
      `• أفق السيولة لـ 60 يوماً: *${cashflow.horizon60d.toLocaleString('en-US')} ج.م*\n` +
      `• إجمالي عمولات الصفقات المفتوحة: *${cashflow.grossPipeline.toLocaleString('en-US')} ج.م*\n` +
      `• صفقات بمرحلة التفاوض النهائي: *${cashflow.dealsUnderNegotiation.length} صفقات*\n\n` +
      `🏠 *5. صحة المخزون العقاري:*` +
      `• إجمالي المعروض النشط: *${dom.totalActive} وحدة* (متوسط العرض: ${dom.avgDom} يوم)\n` +
      `• وحدات راكدة تحتاج تخفيض سعر (>90 يوم): *${dom.brackets.staleCount} وحدة*\n\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `📌 *1Line OS Real Estate Intelligence System*`
    : `1Line Executive Daily Digest for ${dateStr}`;

  return {
    dateStr,
    newLeadsCount: newLeads24h.length,
    topSources,
    visitsTodayCount: visitsToday.length,
    visitsToday,
    sla,
    cashflow,
    dom,
    whatsappDigestText
  };
}
