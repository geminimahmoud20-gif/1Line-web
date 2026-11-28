// =============================================================
//  «مركز القرار»: cross-references the reports that already exist (marketing, team load, workflow,
//  stock vs demand, KPIs, losses) into one ranked list of decisions worth making right now. It never
//  recomputes a metric its own report already owns — each rule reads that report's output and states
//  what it means for a decision, so a number never drifts between the two screens.
//  Pure: tests/unit/decision-insights.test.mjs
// =============================================================
import { kpiScorecard, KPI_TARGETS } from './kpiScorecard.js';
import { orgReport } from './orgReport.js';
import { flowReport } from './flowReport.js';
import { cohortReports } from './performanceReport.js';
import { resolveRange } from './reportPeriods.js';
import { detectAreaSupplyDeficits } from './supplyGapMatcher.js';
import { findDuplicateListingPairs } from './listingDedupe.js';
import { getOfferListings } from './propertyOffers.js';
import { STAGE_LABELS } from './performanceReport.js';
import { commissionForecast } from './commission.js';

const SEVERITY_RANK = { critical: 0, warning: 1, info: 2 };
export const sortInsights = (list) => [...list].sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]);

/**
 * The company's five departments, in a fixed order (fixed layout, not computed from the data) —
 * every insight below is filed under whichever of these actually owns that decision, not the
 * report tab it reads from (several, like the lost-reason or off-target KPI rules, read one
 * report but belong to a different department than that report's own tab).
 */
export const DECISION_CATEGORIES = ['marketing', 'sales', 'ops', 'finance', 'hr'];

/**
 * One row per section: its worst insight's severity (or 'ok' when it has none right now) and how
 * many insights it has. Powers the section map — each node's colour and number come straight from
 * here, so the map and the list below it can never disagree.
 */
export function categorySummary(insights = []) {
  const rank = { critical: 0, warning: 1, info: 2 };
  const rows = Object.fromEntries(DECISION_CATEGORIES.map((c) => [c, { category: c, severity: null, count: 0 }]));
  for (const ins of insights) {
    const row = rows[ins.category];
    if (!row) continue;
    row.count += 1;
    if (row.severity === null || rank[ins.severity] < rank[row.severity]) row.severity = ins.severity;
  }
  return DECISION_CATEGORIES.map((c) => ({ ...rows[c], severity: rows[c].severity || 'ok' }));
}

const KPI_GROUP_RANK = { speed: 0, conversion: 1, flow: 2, capacity: 3, marketing: 4 };
const KPI_GROUP_CATEGORY = { speed: 'sales', conversion: 'sales', flow: 'sales', capacity: 'hr', marketing: 'marketing' };
const MIN_SOURCE_LEADS = 5;
const SPREAD_TO_FLAG_PCT = 15;
const MIN_LOST_REASON = 3;
const MIN_MISSING_VALUE = 3;

/**
 * properties/demands/leads/members: the live CRM lists.
 * access/capacity/spend: the saved access config, goals (capacity) and monthly ad spend — already
 * loaded the same way KpiScorecardPanel and OrgCapacityPanel load them.
 * areas: getAreas() — the configured districts.
 * Returns insights sorted critical → warning → info (ties keep the rule order below).
 */
export function buildDecisionInsights({
  leads = [],
  properties = [],
  demands = [],
  members = [],
  access = {},
  capacity = {},
  spend = {},
  areas = [],
  now = Date.now(),
} = {}) {
  const insights = [];
  const push = (insight) => insights.push(insight);

  // 1) Ops: areas with a critical or high supply deficit against live buyer demand
  const deficits = detectAreaSupplyDeficits(properties, demands, areas).filter((d) => d.severity === 'critical' || d.severity === 'high');
  deficits.slice(0, 3).forEach((d) => {
    push({
      id: `stock-deficit-${d.areaId}`,
      severity: d.severity === 'critical' ? 'critical' : 'warning',
      category: 'ops',
      title_ar: `عجز معروض في ${d.areaName}`,
      detail_ar: d.deficitReason,
      action_ar: d.buyerDemandsCount > 0
        ? 'وجّه فريق السورسينج للمنطقة دي قبل غيرها — في طلبات شراء مستنية'
        : 'لو مفيش طلب شراء حالياً، مش أولوية — راجعها لو بدأ الطلب يزيد',
      tab: 'stock',
    });
  });

  // 2) Sales: the pipeline stage holding the most late clients
  const flow = flowReport(leads, { now });
  if (flow.bottleneck && flow.bottleneck.latePct >= 20) {
    const label = STAGE_LABELS[flow.bottleneck.id]?.ar || flow.bottleneck.id;
    push({
      id: 'flow-bottleneck',
      severity: flow.bottleneck.latePct >= 40 ? 'critical' : 'warning',
      category: 'sales',
      title_ar: `عملاء متكدسين في مرحلة «${label}»`,
      detail_ar: `${flow.bottleneck.late} من ${flow.bottleneck.count} عميل عدّوا الوقت المسموح للمرحلة دي (${flow.bottleneck.latePct}%)، أطول انتظار ${flow.bottleneck.oldestDays} يوم.`,
      action_ar: 'راجع العملاء المتأخرين في المرحلة دي وحدد ليه واقفين',
      tab: 'flow',
    });
  }

  // 3) HR: an overloaded agent next to one with spare capacity (same desk = an easy reassignment)
  if (members.length) {
    const org = orgReport(leads, members, access, capacity, { now });
    const sales = org.people.filter((p) => p.tier === 'sales');
    const over = sales.filter((p) => p.level === 'over').sort((a, b) => b.pct - a.pct);
    const spare = sales.filter((p) => p.level === 'low').sort((a, b) => a.pct - b.pct);
    if (over.length && spare.length) {
      const a = over[0];
      const b = spare[0];
      push({
        id: `team-rebalance-${a.uid}`,
        severity: a.pct >= 130 ? 'critical' : 'warning',
        category: 'hr',
        title_ar: `حمل غير متوازن: ${a.name} فوق طاقته`,
        detail_ar: `${a.name} شايل ${a.open} عميل من سعة ${a.capacity} (${a.pct}%)، في حين ${b.name} عنده مساحة (${b.open} من ${b.capacity}, ${b.pct}%).`,
        action_ar: `انقل جزء من عملاء ${a.name} لـ ${b.name}`,
        tab: 'org',
      });
    } else if (over.length) {
      const a = over[0];
      push({
        id: `team-overload-${a.uid}`,
        severity: a.pct >= 130 ? 'critical' : 'warning',
        category: 'hr',
        title_ar: `${a.name} فوق طاقته`,
        detail_ar: `شايل ${a.open} عميل من سعة ${a.capacity} (${a.pct}%)، ومفيش حد تاني عنده مساحة دلوقتي.`,
        action_ar: 'فكّر تزوّد السعة أو توقف استقبال عملاء جداد له مؤقتاً',
        tab: 'org',
      });
    }
    if (org.unassigned.open > 0) {
      push({
        id: 'team-unassigned',
        severity: org.unassigned.open >= 10 ? 'critical' : 'warning',
        category: 'hr',
        title_ar: `${org.unassigned.open} عميل من غير مسؤول`,
        detail_ar: `${org.unassigned.sellers} ملاك و${org.unassigned.buyers} مشترين مستنيين حد يستلمهم.`,
        action_ar: 'وزّعهم على الفريق دلوقتي قبل ما يبردوا',
        tab: 'org',
      });
    }
  }

  // 4) Marketing: a clear spread between the best and worst source (by volume) suggests reallocating spend
  const range30 = resolveRange('30', now);
  const cohort = cohortReports(leads, range30);
  const bySpread = cohort.sources.filter((s) => s.leads >= MIN_SOURCE_LEADS);
  if (bySpread.length >= 2) {
    const best = [...bySpread].sort((a, b) => b.visitPct - a.visitPct)[0];
    const worst = [...bySpread].sort((a, b) => a.visitPct - b.visitPct)[0];
    if (best.id !== worst.id && best.visitPct - worst.visitPct >= SPREAD_TO_FLAG_PCT) {
      push({
        id: 'marketing-reallocate',
        severity: best.visitPct - worst.visitPct >= 30 ? 'warning' : 'info',
        category: 'marketing',
        title_ar: `«${best.label}» بيجيب عملاء أجدّ من «${worst.label}»`,
        detail_ar: `${best.visitPct}% من عملاء «${best.label}» (${best.leads}) وصلوا لمعاينة، مقابل ${worst.visitPct}% بس من «${worst.label}» (${worst.leads}).`,
        action_ar: `زوّد ميزانية «${best.label}» وقلّل «${worst.label}»`,
        tab: 'marketing',
      });
    }
  }
  if (cohort.funnel.topLostReason && cohort.funnel.topLostReason.count >= MIN_LOST_REASON) {
    push({
      id: 'risk-top-lost-reason',
      severity: cohort.funnel.topLostReason.count >= 10 ? 'warning' : 'info',
      category: 'sales',
      title_ar: 'أكتر سبب بيخسرنا عملاء',
      detail_ar: `«${cohort.funnel.topLostReason.id}» سبب خسارة ${cohort.funnel.topLostReason.count} عميل آخر 30 يوم.`,
      action_ar: 'راجع السبب ده مع الفريق — ممكن يكون حل واحد يوقف نزيف العملاء',
      tab: 'risk',
    });
  }

  // 5) KPIs off target: the speed/conversion ones first, they drive everything else
  if (members.length || leads.length) {
    const scorecard = kpiScorecard(leads, { members, access, capacity, spend, now, targets: KPI_TARGETS });
    const bad = scorecard.items.filter((k) => k.colour === 'bad').sort((a, b) => (KPI_GROUP_RANK[a.group] ?? 9) - (KPI_GROUP_RANK[b.group] ?? 9));
    bad.slice(0, 2).forEach((k) => {
      push({
        id: `kpi-bad-${k.id}`,
        severity: 'warning',
        category: KPI_GROUP_CATEGORY[k.group] || 'sales',
        title_ar: `مؤشر بعيد عن هدفه: ${k.note}`,
        detail_ar: `القيمة ${k.value ?? '—'}${k.unit}، والهدف ${k.target?.good ?? '—'}${k.unit}.`,
        action_ar: 'شوف تفاصيله في تبويب المؤشرات',
        tab: 'kpi',
      });
    });
  }

  // 6) Inventory hygiene: duplicate listings waiting to be merged, and offers ending within 2 days
  const dupPairs = findDuplicateListingPairs(properties);
  if (dupPairs.size > 0) {
    push({
      id: 'stock-duplicates',
      severity: 'info',
      category: 'ops',
      title_ar: `${dupPairs.size / 2} زوج عقارات مكررة محتاجة دمج`,
      detail_ar: 'نفس الوحدة مدخلة أكتر من مرة — بتوهم الفريق والعملاء بمعروض أكبر من الحقيقي.',
      action_ar: 'ادمجهم من أداة «دمج المكررين» في قائمة العقارات',
      tab: 'stock',
    });
  }
  const endingSoon = getOfferListings(properties, now).filter((o) => o.offer.msLeft <= 2 * 24 * 3600000);
  if (endingSoon.length > 0) {
    push({
      id: 'marketing-offers-ending',
      severity: 'info',
      category: 'marketing',
      title_ar: `${endingSoon.length} عرض هيخلص خلال يومين`,
      detail_ar: 'لو العرض ده بينجح، فكّر تمدده بدل ما يختفي من الواجهة لوحده.',
      action_ar: 'راجع العروض اللي قربت تخلص',
      tab: 'marketing',
    });
  }

  // 7) Finance: open deals carrying no deal value can't be forecast — the commission report under-counts them
  const commission = commissionForecast(leads, { now });
  const totalOpenValued = commission.valued + commission.missingValue;
  if (commission.missingValue >= MIN_MISSING_VALUE && totalOpenValued > 0) {
    const pct = Math.round((commission.missingValue / totalOpenValued) * 100);
    push({
      id: 'finance-missing-value',
      severity: pct >= 50 ? 'warning' : 'info',
      category: 'finance',
      title_ar: `${commission.missingValue} صفقة مفتوحة من غير قيمة متوقعة`,
      detail_ar: `${pct}% من الصفقات المفتوحة (${commission.missingValue} من ${totalOpenValued}) من غير قيمة صفقة مسجّلة — توقع العمولة بتاعهم مش داخل في تقرير الفلوس.`,
      action_ar: 'اطلب من الفريق يسجّل قيمة الصفقة لكل عميل في مرحلة متقدمة',
      tab: 'sales',
    });
  }

  return sortInsights(insights);
}
