// =============================================================
//  Property Deep Reports & Inventory Analytics (تقارير العقارات المعمقة)
//  1. Days on Market (DOM) & Ageing Inventory
//  2. Buyer Demand Density per Listing
//  3. Exclusivity & Mandate Expiry Tracking
//  4. Comparative Market Analysis (CMA) Engine for Sellers
// =============================================================

import { toMs } from './crmLeadViews.js';
import { getNormalizedPropertyStatus } from './crmLeadViews.js';
import { blockedByApproval } from './publishApproval.js';
import { median } from './marketStats.js';
import { areaNameOf } from './areaLookup.js';
import { getAreas } from '../data/propertiesData.js';
import { parseMoney } from './crmLeadViews.js';

const DAY_MS = 86_400_000;

/**
 * 1. Calculate Days on Market (DOM) & Ageing Inventory
 */
export function calculateDaysOnMarket(properties = [], now = Date.now()) {
  const activeListings = properties.filter((p) => {
    if (!p || p.deleted || p.isDemo) return false;
    const st = getNormalizedPropertyStatus(p);
    return st === 'published' && !blockedByApproval(p);
  });

  const domItems = activeListings.map((p) => {
    const startMs = toMs(p.publishedAt) || toMs(p.approvedAt) || toMs(p.createdAt) || (now - 14 * DAY_MS);
    const dom = Math.max(0, Math.floor((now - startMs) / DAY_MS));

    let bracket = 'fresh';
    if (dom > 90) bracket = 'stale';
    else if (dom > 60) bracket = 'slow';
    else if (dom >= 30) bracket = 'mature';

    return {
      id: String(p.id),
      title: p.title_ar || p.title_en || String(p.id),
      code: p.unitCode || String(p.id),
      type: p.type || 'apartment',
      areaKey: p.areaKey || 'other',
      price: Number(p.price) || 0,
      size: Number(p.size) || 0,
      dom,
      bracket,
      image: Array.isArray(p.images) && p.images[0] ? p.images[0] : null
    };
  });

  // Calculate bracket distributions
  const brackets = {
    fresh: domItems.filter((d) => d.bracket === 'fresh'),
    mature: domItems.filter((d) => d.bracket === 'mature'),
    slow: domItems.filter((d) => d.bracket === 'slow'),
    stale: domItems.filter((d) => d.bracket === 'stale')
  };

  // Average DOM overall
  const totalDom = domItems.reduce((acc, cur) => acc + cur.dom, 0);
  const avgDom = domItems.length > 0 ? Math.round(totalDom / domItems.length) : 0;

  // Average DOM per area
  const areaGroups = new Map();
  domItems.forEach((item) => {
    if (!areaGroups.has(item.areaKey)) areaGroups.set(item.areaKey, []);
    areaGroups.get(item.areaKey).push(item.dom);
  });

  const areas = getAreas();
  const areaDomStats = Array.from(areaGroups.entries()).map(([areaKey, domList]) => {
    const avg = Math.round(domList.reduce((a, b) => a + b, 0) / domList.length);
    const name = areaNameOf(areaKey, areas, true) || areaKey;
    return { areaKey, name, count: domList.length, avgDom: avg };
  }).sort((a, b) => b.avgDom - a.avgDom);

  return {
    totalActive: domItems.length,
    avgDom,
    brackets: {
      freshCount: brackets.fresh.length,
      matureCount: brackets.mature.length,
      slowCount: brackets.slow.length,
      staleCount: brackets.stale.length
    },
    staleItems: brackets.stale.sort((a, b) => b.dom - a.dom),
    areaDomStats,
    items: domItems
  };
}

/**
 * 2. Calculate Buyer Demand Density per Listing
 */
export function calculateBuyerDemandDensity(properties = [], leads = []) {
  const activeBuyers = leads.filter((l) => {
    if (!l || l.isArchived || l.status === 'closed' || l.status === 'lost') return false;
    return l.type !== 'seller';
  });

  const activeProperties = properties.filter((p) => {
    if (!p || p.deleted || p.isDemo) return false;
    return !blockedByApproval(p);
  });

  return activeProperties.map((prop) => {
    const propPrice = Number(prop.price) || 0;
    const propType = prop.type || '';
    const propArea = prop.areaKey || '';

    // Matching buyers: matching area and type, and budget >= 85% of price
    const matches = activeBuyers.filter((b) => {
      const budget = parseMoney(b.dealValue) || parseMoney(b.budget) || parseMoney(b.details?.budget) || 0;
      const bType = b.propertyType || b.details?.propertyType || '';
      const bArea = b.area || b.details?.area || '';

      const areaMatches = !bArea || bArea === 'all' || bArea === propArea;
      const typeMatches = !bType || bType === propType;
      const budgetMatches = budget === 0 || budget >= propPrice * 0.85;

      return areaMatches && typeMatches && budgetMatches;
    });

    const budgets = matches.map((m) => parseMoney(m.budget) || parseMoney(m.details?.budget) || 0).filter((v) => v > 0);
    const avgBuyerBudget = budgets.length > 0 ? Math.round(budgets.reduce((a, b) => a + b, 0) / budgets.length) : 0;
    const priceGapPct = (avgBuyerBudget > 0 && propPrice > 0)
      ? Math.round(((propPrice - avgBuyerBudget) / avgBuyerBudget) * 100)
      : 0;

    return {
      propertyId: String(prop.id),
      title: prop.title_ar || prop.title_en || String(prop.id),
      price: propPrice,
      areaKey: propArea,
      type: propType,
      readyBuyersCount: matches.length,
      avgBuyerBudget,
      priceGapPct,
      demandLevel: matches.length >= 5 ? 'high' : matches.length >= 2 ? 'medium' : 'low'
    };
  }).sort((a, b) => b.readyBuyersCount - a.readyBuyersCount);
}

/**
 * 3. Exclusivity & Mandate Expiry Report
 */
export function calculateExclusivityAlerts(properties = [], now = Date.now()) {
  const exclusives = properties.filter((p) => {
    if (!p || p.deleted) return false;
    return p.exclusive === true || Boolean(p.exclusiveUntil);
  });

  const alerts = exclusives.map((p) => {
    const untilMs = p.exclusiveUntil ? Date.parse(p.exclusiveUntil) : null;
    let daysRemaining = null;
    let status = 'active';

    if (untilMs && Number.isFinite(untilMs)) {
      daysRemaining = Math.round((untilMs - now) / DAY_MS);
      if (daysRemaining < 0) status = 'expired';
      else if (daysRemaining <= 15) status = 'critical';
      else if (daysRemaining <= 30) status = 'warning';
      else status = 'safe';
    }

    return {
      propertyId: String(p.id),
      title: p.title_ar || p.title_en || String(p.id),
      ownerName: p.contactName || 'المالك',
      ownerPhone: p.contactPhone || p.phone || '',
      exclusiveFrom: p.exclusiveFrom || '',
      exclusiveUntil: p.exclusiveUntil || '',
      daysRemaining,
      status,
      price: Number(p.price) || 0
    };
  });

  return {
    totalExclusives: alerts.length,
    criticalCount: alerts.filter((a) => a.status === 'critical').length,
    expiredCount: alerts.filter((a) => a.status === 'expired').length,
    warningCount: alerts.filter((a) => a.status === 'warning').length,
    alerts: alerts.sort((a, b) => (a.daysRemaining ?? 999) - (b.daysRemaining ?? 999))
  };
}

/**
 * 4. Comparative Market Analysis (CMA) Engine for Sellers
 */
export function generateCmaReport(property, allProperties = [], isAr = true) {
  if (!property) return null;

  const propPrice = Number(property.price) || 0;
  const propSize = Number(property.size) || 0;
  const propSqm = propSize > 0 && propPrice > 0 ? Math.round(propPrice / propSize) : 0;
  const propArea = property.areaKey || '';
  const propType = property.type || 'apartment';

  const areas = getAreas();
  const areaName = areaNameOf(propArea, areas, isAr) || (isAr ? 'سوهاج' : 'Sohag');

  // Find competing units in the same district and asset class
  const peers = allProperties.filter((p) => {
    if (!p || p.deleted || String(p.id) === String(property.id)) return false;
    return p.areaKey === propArea && p.type === propType && Number(p.price) > 0 && Number(p.size) > 0;
  });

  const peerSqms = peers.map((p) => Math.round(Number(p.price) / Number(p.size)));
  const medianPeerSqm = peerSqms.length > 0 ? median(peerSqms) : propSqm;
  const minPeerSqm = peerSqms.length > 0 ? Math.min(...peerSqms) : propSqm;
  const maxPeerSqm = peerSqms.length > 0 ? Math.max(...peerSqms) : propSqm;

  const diffPct = medianPeerSqm > 0 ? Math.round(((propSqm - medianPeerSqm) / medianPeerSqm) * 100) : 0;

  // Recommended price to achieve sale within 30 days
  const recommendedSqm = diffPct > 5 ? Math.round(medianPeerSqm * 0.98) : propSqm;
  const recommendedTotal = recommendedSqm * propSize;

  // WhatsApp CMA Message Text for the agent to share with the owner
  const whatsappCmaText = isAr
    ? `📊 *تقرير التحليل المقارن للسوق العقاري (CMA) — شركة 1Line*\n\n` +
      `أهلاً بك أستاذنا العزيز، بخصوص عقاركم المسجل لدينا في *${areaName}*:\n` +
      `• السعر الحالي المطلوب: *${propPrice.toLocaleString('en-US')} ج.م* (${propSqm.toLocaleString('en-US')} ج.م/م²)\n` +
      `• متوسط أسعار المتر للوحدات المماثلة في ${areaName}: *${medianPeerSqm.toLocaleString('en-US')} ج.م/م²*\n` +
      `• الفارق عن متوسط السوق: *${diffPct > 0 ? `أعلى من متوسط الحي بـ ${diffPct}% ⚠️` : diffPct < 0 ? `أقل من السوق بـ ${Math.abs(diffPct)}% (فرصة ممتازة) ✅` : 'متطابق مع سعر السوق تماماً'}*\n` +
      `• عدد الوحدات المنافسة المعروضة حالياً بالمنطقة: *${peers.length} وحدات*\n\n` +
      (diffPct > 5
        ? `💡 *توصية المستشار العقاري لسرعة البيع:* نقترح تعديل السعر إلى *${recommendedTotal.toLocaleString('en-US')} ج.م* لجذب المشترين الجادين وتفادي ركود الوحدة.\n`
        : `✨ عقاركم مسعر بسعر منافس ومرشح لإنهاء الصفقة في أقرب وقت.\n`) +
      `\n🤝 يسعدنا دائماً التنسيق معكم لتحقيق أفضل عائد استثماري.`
    : `Property Market Analysis Report for ${areaName}`;

  return {
    propertyId: String(property.id),
    title: property.title_ar || property.title_en || String(property.id),
    areaName,
    askingPrice: propPrice,
    askingSqm: propSqm,
    peerCount: peers.length,
    medianPeerSqm,
    minPeerSqm,
    maxPeerSqm,
    diffPct,
    isOverpriced: diffPct > 5,
    recommendedTotal,
    recommendedSqm,
    whatsappCmaText
  };
}
