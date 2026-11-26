// =============================================================
//  Supply Gap & Seller Intake Auto-Matching Engine
//  Detects regional inventory shortages and proactively matches them
//  with unconverted seller intake forms to fuel inventory on demand.
//  Pure functions tested in tests/unit/supply-gap-matcher.test.mjs.
// =============================================================

import { isActiveListing, findExistingLeadListing } from './listingDedupe.js';
import { blockedByApproval } from './publishApproval.js';
import { listingStatus, NO_AREA } from './listingReview.js';
import {
  mainAreas,
  mainAreaOf,
  placeAreas,
  findArea,
  areaNameOf,
  areaPathName,
  formArea,
  areaFromText,
  recordInArea,
  foldAr
} from './areaLookup.js';
import { parseMoney } from './crmLeadViews.js';
import { handoverFromSeller } from './unitHandover.js';
import { buildingFromSellerFeatures } from './buildingFeatures.js';

const TYPE_LABELS = {
  apartment: { ar: 'شقة سكنية', en: 'Apartment' },
  villa: { ar: 'فيلا / تاون هاوس', en: 'Villa' },
  commercial: { ar: 'محل تجاري', en: 'Commercial Shop' },
  retail: { ar: 'محل تجاري', en: 'Retail' },
  office: { ar: 'مكتب إداري / عيادة', en: 'Office' },
  land: { ar: 'قطعة أرض', en: 'Land' },
  building: { ar: 'عمارة سكنية / تجارية', en: 'Building' },
  agri_land: { ar: 'أرض زراعية', en: 'Agricultural Land' },
  farm: { ar: 'مزرعة', en: 'Farm' },
  warehouse: { ar: 'مخزن', en: 'Warehouse' },
  factory: { ar: 'مصنع', en: 'Factory' },
  industrial_land: { ar: 'أرض صناعية', en: 'Industrial Land' }
};

export const getPropertyTypeLabel = (typeKey, isAr = true) => {
  const t = TYPE_LABELS[typeKey];
  if (!t) return isAr ? 'وحدة عقارية' : 'Property';
  return isAr ? t.ar : t.en;
};

/**
 * Detects regional supply shortages (deficits) across inventory.
 * An area has a deficit when active live stock is 0, very thin (<= 2),
 * or when active buyer demand significantly outstrips available units.
 */
export function detectAreaSupplyDeficits(properties = [], demands = [], areas = []) {
  const mains = mainAreas(areas);
  const effectiveAreas = mains.length > 0 ? mains : placeAreas(areas);
  if (!effectiveAreas.length) return [];

  // 1. Group active supply and total held supply by area
  const areaStats = new Map();
  for (const a of effectiveAreas) {
    areaStats.set(a.id, {
      area: a,
      areaId: a.id,
      areaName: areaNameOf(a.id, areas, true) || a.name_ar || a.id,
      activeSupply: 0,
      totalHeld: 0,
      buyerDemandsCount: 0
    });
  }

  // Count active properties
  for (const p of properties || []) {
    if (p.isDemo || !isActiveListing(p)) continue;
    const st = blockedByApproval(p) ? 'approval' : listingStatus(p);
    if (st === 'trash') continue;

    const mainA = mainAreaOf(p.areaKey, areas) || findArea(p.areaKey, areas);
    const targetId = mainA?.id;
    if (targetId && areaStats.has(targetId)) {
      const stat = areaStats.get(targetId);
      stat.totalHeld += 1;
      if (st === 'published' || st === 'under_negotiation') {
        stat.activeSupply += 1;
      }
    }
  }

  // Count buyer demands looking in each area
  for (const d of demands || []) {
    if (d.status === 'closed' || d.status === 'cancelled' || d.deleted) continue;
    for (const [areaId, stat] of areaStats.entries()) {
      if (recordInArea(d, areaId, areas)) {
        stat.buyerDemandsCount += 1;
      }
    }
  }

  // Calculate deficit severity
  const deficits = [];
  for (const stat of areaStats.values()) {
    let severity = 'balanced';
    let deficitReason = '';

    if (stat.activeSupply === 0) {
      severity = 'critical';
      deficitReason = stat.buyerDemandsCount > 0
        ? `عجز حرج: لا توجد أي وحدة معروضة مقابل ${stat.buyerDemandsCount} طلبات شراء نشطة!`
        : 'عجز كلي: لا توجد أي وحدة معروضة بالمنطقة على الموقع.';
    } else if (stat.activeSupply <= 2 && stat.buyerDemandsCount >= stat.activeSupply) {
      severity = 'high';
      deficitReason = `معروض ضعيف: ${stat.activeSupply} وحدة فقط مقابل ${stat.buyerDemandsCount} طلب شراء.`;
    } else if (stat.activeSupply <= 2) {
      severity = 'moderate';
      deficitReason = `معروض شحيح: إجمالي المعروض ${stat.activeSupply} وحدة فقط.`;
    }

    if (severity !== 'balanced') {
      deficits.push({
        ...stat,
        severity,
        deficitReason,
        priorityScore: (severity === 'critical' ? 100 : severity === 'high' ? 60 : 30) + stat.buyerDemandsCount * 5 - stat.activeSupply * 10
      });
    }
  }

  // Sort by priority score descending
  return deficits.sort((a, b) => b.priorityScore - a.priorityScore);
}

/**
 * Normalizes an area name cleanly, stripping internal machine codes like "area_mvruggdx"
 */
export function resolveCleanAreaName(rawArea, areas = [], leadDetails = {}) {
  const formKey = formArea(rawArea, areas);
  if (formKey) {
    const cleanName = areaNameOf(formKey, areas, true);
    if (cleanName && !cleanName.startsWith('area_')) return cleanName;
  }

  // Try text detection
  const textLocation = [leadDetails.location, leadDetails.area, leadDetails.district, leadDetails.address]
    .filter(Boolean)
    .join(' ');
  const detectedKey = areaFromText(textLocation, areas);
  if (detectedKey) {
    const cleanName = areaNameOf(detectedKey, areas, true);
    if (cleanName && !cleanName.startsWith('area_')) return cleanName;
  }

  // Fallbacks
  if (leadDetails.location && !String(leadDetails.location).startsWith('area_')) {
    return String(leadDetails.location).trim();
  }
  if (rawArea && !String(rawArea).startsWith('area_')) {
    return String(rawArea).trim();
  }

  return 'سوهاج';
}

/**
 * Identifies seller leads whose units are NOT yet published or converted.
 */
export function findUnconvertedSellerLeads(leads = [], properties = [], areas = []) {
  const candidates = [];

  for (const lead of leads || []) {
    if (!lead || lead.deleted || lead.isDeleted) continue;
    // Skip rejected/lost leads
    if (lead.status === 'lost' && (lead.lostReason === 'property_rejected' || lead.lostReasonDetails?.includes('رفض'))) {
      continue;
    }

    // Check if seller lead
    const isSeller = lead.type === 'seller'
      || lead.landingPage === '/sell'
      || lead.landingPage === '/valuation'
      || lead.source?.toLowerCase()?.includes('seller')
      || (lead.details && (lead.details.askingPrice || lead.details.propertyType || lead.details.size));

    if (!isSeller) continue;

    // Check if already converted into an active property
    const existing = findExistingLeadListing(properties, lead.id, [
      lead.convertedPropertyId,
      ...(Array.isArray(lead.details?.listingIds) ? lead.details.listingIds : [])
    ]);

    if (existing) continue; // Already listed!

    const details = lead.details || {};
    const askingPrice = parseMoney(details.askingPrice)
      || parseMoney(details.expectedPrice)
      || parseMoney(details.price)
      || parseMoney(lead.budget)
      || 0;

    const propertyType = details.propertyType || lead.propertyType || 'apartment';
    const rawArea = details.area || lead.area || '';
    const cleanAreaName = resolveCleanAreaName(rawArea, areas, details);
    const validAreaKey = formArea(rawArea, areas) || areaFromText(cleanAreaName, areas);

    const size = parseInt(details.size, 10) || 0;
    const rooms = parseInt(details.rooms, 10) || 0;
    const floor = details.floor || '';
    const images = Array.isArray(details.images) ? details.images.filter(Boolean) : [];
    const finishing = details.finishingLabelAr || details.finishing || '';

    // Calculate readiness score
    let score = 30; // base score for registered seller
    if (askingPrice > 0) score += 20;
    if (size > 0) score += 15;
    if (images.length > 0) score += Math.min(25, images.length * 5);
    if (lead.phone) score += 10;

    candidates.push({
      leadId: lead.id,
      leadName: lead.name || 'عميل غير مسمى',
      phone: lead.phone || '',
      whatsapp: lead.whatsapp || lead.phone || '',
      email: lead.email || '',
      propertyType,
      typeLabelAr: getPropertyTypeLabel(propertyType, true),
      typeLabelEn: getPropertyTypeLabel(propertyType, false),
      areaKey: validAreaKey,
      areaNameAr: cleanAreaName,
      askingPrice,
      size,
      rooms,
      floor,
      finishing,
      images,
      features: Array.isArray(details.featuresAr) ? details.featuresAr : (details.features || []),
      notes: lead.notes || details.notes || '',
      timestamp: lead.timestamp || lead.createdAt || new Date().toISOString(),
      readinessScore: score,
      leadRef: lead
    });
  }

  // Sort by readiness score descending
  return candidates.sort((a, b) => b.readinessScore - a.readinessScore);
}

/**
 * Cross-references supply deficits with unconverted seller candidate units.
 */
export function matchSellerLeadsToSupplyDeficits(properties = [], leads = [], demands = [], areas = []) {
  const deficits = detectAreaSupplyDeficits(properties, demands, areas);
  const sellerCandidates = findUnconvertedSellerLeads(leads, properties, areas);

  let totalOpportunityCount = 0;
  let totalOpportunityValue = 0;

  const matchedDeficits = deficits.map((deficit) => {
    // Find all candidate seller leads that match this deficit area
    const matchingLeads = sellerCandidates.filter((cand) => {
      // 1. Direct areaKey match or family match
      if (cand.areaKey && recordInArea({ areaKey: cand.areaKey }, deficit.areaId, areas)) {
        return true;
      }
      // 2. Lead object matching
      if (recordInArea(cand.leadRef, deficit.areaId, areas)) {
        return true;
      }
      // 3. Normalized Arabic text match
      const normCandArea = foldAr(cand.areaNameAr);
      const normDeficitArea = foldAr(deficit.areaName);
      if (normCandArea && normDeficitArea && (normCandArea.includes(normDeficitArea) || normDeficitArea.includes(normCandArea))) {
        return true;
      }
      return false;
    });

    const candidatesValue = matchingLeads.reduce((sum, l) => sum + (l.askingPrice || 0), 0);
    totalOpportunityCount += matchingLeads.length;
    totalOpportunityValue += candidatesValue;

    return {
      ...deficit,
      matchingLeads,
      matchingCount: matchingLeads.length,
      matchingValue: candidatesValue
    };
  });

  return {
    matchedDeficits,
    totalDeficitAreas: deficits.length,
    criticalDeficitCount: deficits.filter((d) => d.severity === 'critical').length,
    totalOpportunityCount,
    totalOpportunityValue,
    allCandidatesCount: sellerCandidates.length
  };
}

/**
 * Prepares pre-populated listing data from an unconverted seller lead,
 * ensuring clean deterministic IDs and no garbled machine area keys.
 */
export function buildPrepopulatedPropertyFromLead(lead, areas = []) {
  if (!lead) return null;

  const details = lead.details || {};
  const priceVal = parseMoney(details.askingPrice)
    || parseMoney(details.expectedPrice)
    || parseMoney(details.price)
    || parseMoney(details.estimatedAvg)
    || parseMoney(lead.budget)
    || 0;

  const typeVal = details.propertyType || lead.propertyType || 'apartment';
  const typeLabelAr = getPropertyTypeLabel(typeVal, true);
  const typeLabelEn = getPropertyTypeLabel(typeVal, false);

  const cleanAreaName = resolveCleanAreaName(details.area || lead.area, areas, details);
  const areaVal = formArea(details.area || lead.area, areas) || areaFromText(cleanAreaName, areas);

  const sizeVal = parseInt(details.size, 10) || 0;
  const roomsVal = parseInt(details.rooms, 10) || 0;
  const floorVal = details.floor || '';
  const finishVal = details.finishingLabelAr || details.finishing || '';
  const imagesVal = Array.isArray(details.images) && details.images.length > 0 ? details.images.filter(Boolean) : [];

  const building = details.features ? buildingFromSellerFeatures(details.features) : null;
  const cleanBuilding = building && Object.keys(building).length > 0 ? building : null;

  return {
    suggestedId: `prop-lead-${lead.id}`,
    title_ar: `عرض بيع: ${typeLabelAr} ${sizeVal ? `${sizeVal}م² ` : ''}في ${cleanAreaName}`,
    title_en: `Owner listing: ${typeLabelEn} ${sizeVal ? `${sizeVal} sqm` : ''}`,
    type: typeVal,
    areaKey: areaVal || '',
    price: priceVal || '',
    size: sizeVal || '',
    bedrooms: roomsVal || '',
    floor: floorVal || '',
    ...handoverFromSeller(details.finishing, finishVal),
    images: imagesVal,
    building: cleanBuilding,
    features_ar: Array.isArray(details.featuresAr) ? details.featuresAr : [],
    description_ar: lead.notes || (details.legalSummaryAr ? `الموقف القانوني: ${details.legalSummaryAr}` : ''),
    description_en: '',
    status: 'hidden',
    featured: false,
    sourceLeadId: lead.id,
    contactName: lead.name || '',
    contactPhone: lead.phone || '',
    listedBy: 'owner'
  };
}
