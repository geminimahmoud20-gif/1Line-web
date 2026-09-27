// =============================================================
//  1LINE — Property insight helpers (finance breakdown, family hub, commercial hub)
//  Everything here reads optional fields the team fills in the CRM property editor.
//  Nothing is invented: a row whose data is missing is simply not shown.
// =============================================================

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

// ── Family Legacy hub ──────────────────────────────────────────
export const FAMILY_KINDS = [
  { id: 'full_building', ar: 'عمارة كاملة', en: 'Whole building', desc_ar: 'دور لكل أخ، والباقي للإيجار', desc_en: 'A floor per sibling, the rest for rent' },
  { id: 'adjacent_units', ar: 'شقق متجاورة في نفس الدور', en: 'Adjacent units, same floor', desc_ar: 'قريبين من بعض وكل واحد في بيته', desc_en: 'Close together, each in their own home' },
  { id: 'double_frontage_land', ar: 'أرض واجهتين للبناء العائلي', en: 'Double-frontage land to build', desc_ar: 'ابنِ بيت العيلة على مزاجك', desc_en: 'Build the family house your way' },
  { id: 'investment_hq', ar: 'مقر تجاري استثماري للعائلة', en: 'Family commercial asset', desc_ar: 'دخل ثابت يتوزع على العيلة', desc_en: 'Steady income shared by the family' }
];

export const getFamilyKind = (id) => FAMILY_KINDS.find((k) => k.id === id) || null;

/** { kind, units, note } when the listing is tagged for the family hub, else null. */
export function getFamilyInfo(p) {
  const f = p?.family;
  if (!f || !getFamilyKind(f.kind)) return null;
  return { kind: getFamilyKind(f.kind), units: num(f.units), note_ar: f.note_ar || '', note_en: f.note_en || '' };
}

// ── Commercial & medical hub ───────────────────────────────────
export const FOOT_TRAFFIC_TAGS = [
  { id: 'main_street', ar: 'شارع رئيسي حيوي', en: 'Busy main street' },
  { id: 'hospital_zone', ar: 'محيط مستشفيات', en: 'Near hospitals' },
  { id: 'university_zone', ar: 'محيط جامعة', en: 'Near a university' },
  { id: 'clinic_cluster', ar: 'تجمع عيادات مجاورة', en: 'Clinic cluster' },
  { id: 'market_zone', ar: 'منطقة أسواق', en: 'Market district' },
  { id: 'school_zone', ar: 'محيط مدارس', en: 'Near schools' }
];

export const ACCESS_POINTS = [
  { id: 'train_station', ar: 'محطة القطار', en: 'Train station' },
  { id: 'microbus_terminal', ar: 'مواقف المراكز والقرى', en: 'Regional microbus terminal' },
  { id: 'highway', ar: 'الطريق السريع', en: 'Highway' },
  { id: 'city_center', ar: 'وسط المدينة', en: 'City centre' }
];

export const PARKING_OPTIONS = [
  { id: 'dedicated_garage', ar: 'جراج مخصص', en: 'Dedicated garage', tone: 'good' },
  { id: 'private_spots', ar: 'أماكن ركن خاصة أمام العقار', en: 'Private spots in front', tone: 'good' },
  { id: 'easy_street', ar: 'ركن سهل في الشارع', en: 'Easy street parking', tone: 'ok' },
  { id: 'limited_street', ar: 'ركن محدود في أوقات الذروة', en: 'Limited at peak hours', tone: 'warn' },
  { id: 'none', ar: 'لا يوجد ركن قريب', en: 'No nearby parking', tone: 'warn' }
];

export const isCommercialAsset = (p) =>
  p?.type === 'commercial' || p?.type === 'office' || p?.category === 'commercial' || p?.category === 'administrative';

/** Indicators set in the CRM for commercial / medical listings, or null. */
export function getCommercialInsights(p) {
  const c = p?.commercial;
  if (!c) return null;
  const traffic = (Array.isArray(c.traffic) ? c.traffic : []).map((id) => FOOT_TRAFFIC_TAGS.find((t) => t.id === id)).filter(Boolean);
  const access = ACCESS_POINTS
    .map((a) => ({ ...a, minutes: num(c.access?.[a.id]) }))
    .filter((a) => a.minutes > 0);
  const parking = PARKING_OPTIONS.find((o) => o.id === c.parking) || null;
  const rentPerSqm = num(c.rentPerSqm);
  if (!traffic.length && !access.length && !parking && !rentPerSqm && !c.trafficNote_ar && !c.accessNote_ar) return null;
  return {
    traffic,
    trafficNote_ar: c.trafficNote_ar || '',
    access,
    accessNote_ar: c.accessNote_ar || '',
    parking,
    parkingNote_ar: c.parkingNote_ar || '',
    rentPerSqm
  };
}

/**
 * Commercial yield from a monthly rent per m².
 * Returns gross/net annual rent, cap rate (net / price) and payback years.
 */
export function computeRentalYield({ price, size, rentPerSqm, occupancyPct = 90, opexPct = 10 }) {
  const P = num(price);
  const S = num(size);
  const R = num(rentPerSqm);
  if (!P || !S || !R) return null;
  const grossAnnual = R * S * 12;
  const netAnnual = grossAnnual * (Math.min(100, Math.max(0, occupancyPct)) / 100) * (1 - Math.min(90, Math.max(0, opexPct)) / 100);
  if (netAnnual <= 0) return null;
  return {
    grossAnnual,
    netAnnual,
    grossYieldPct: (grossAnnual / P) * 100,
    capRatePct: (netAnnual / P) * 100,
    paybackYears: P / netAnnual,
    salePerSqm: P / S,
    rentMultiple: (P / S) / R // months of rent that equal the sale price per m²
  };
}

// ── Transparent financial breakdown ────────────────────────────
/**
 * Everything the buyer pays, from the listing's own numbers.
 * Optional extras live under property.finance (set in the CRM):
 *   cashPrice, quarterlyInstallment, handoverPayment, maintenanceDeposit | maintenancePct, maintenanceDue_ar,
 *   overPrice, paidToAuthority, overPriceNote_ar, utilitiesCost, transferCost, feesNote_ar
 */
export function computeFinanceBreakdown(p) {
  const price = num(p?.price);
  if (!price) return null;
  const f = p.finance || {};

  const cashPrice = num(f.cashPrice) && num(f.cashPrice) <= price ? num(f.cashPrice) : price;
  const cashDiscountPct = cashPrice < price ? ((price - cashPrice) / price) * 100 : 0;

  const down = num(p.downPayment);
  const monthly = num(p.monthlyInstallment);
  const quarterly = num(f.quarterlyInstallment);
  const years = num(p.installmentYears);
  const months = years * 12;
  const handover = num(f.handoverPayment);
  const hasPlan = Boolean((monthly || quarterly) && months);

  const installmentTotal = hasPlan
    ? down + monthly * months + quarterly * Math.floor(months / 3) + handover
    : 0;

  const maintenance = num(f.maintenanceDeposit) || (num(f.maintenancePct) ? price * num(f.maintenancePct) / 100 : 0);
  const maintenancePct = maintenance ? (maintenance / price) * 100 : 0;

  const overPrice = num(f.overPrice);
  const paidToAuthority = num(f.paidToAuthority);
  const utilities = num(f.utilitiesCost);
  const transfer = num(f.transferCost);

  return {
    price,
    cashPrice,
    cashDiscountPct,
    plan: hasPlan ? {
      down,
      downPct: (down / price) * 100,
      monthly,
      quarterly,
      months,
      years,
      handover,
      total: installmentTotal,
      // Down + installments + handover below the cash price means the listing only carries part of
      // the schedule (e.g. a balloon payment is missing) — never present that sum as the total.
      incomplete: installmentTotal < price * 0.98,
      // Balance the listing doesn't schedule (balloon / extra payments) — shown as its own line
      unscheduled: installmentTotal < price * 0.98 ? price - installmentTotal : 0,
      premiumOverCash: installmentTotal - cashPrice,
      premiumPct: cashPrice ? ((installmentTotal - cashPrice) / cashPrice) * 100 : 0
    } : null,
    maintenance: maintenance ? { amount: maintenance, pct: maintenancePct, due_ar: f.maintenanceDue_ar || '', due_en: f.maintenanceDue_en || '' } : null,
    overPrice: (overPrice || paidToAuthority) ? { overPrice, paidToAuthority, note_ar: f.overPriceNote_ar || '' } : null,
    fees: (utilities || transfer || f.feesNote_ar) ? { utilities, transfer, note_ar: f.feesNote_ar || '' } : null,
    // Grand total the buyer should budget for (cash route)
    cashAllIn: cashPrice + overPrice + maintenance + utilities + transfer
  };
}

/** Split a purchase between family members. `shares` are percentages that sum to ~100. */
export function splitFamilyCost({ down, monthly, cashPrice }, shares) {
  const total = shares.reduce((s, v) => s + (Number(v) || 0), 0) || 1;
  return shares.map((v) => {
    const r = (Number(v) || 0) / total;
    return { share: r * 100, down: down * r, monthly: monthly * r, cash: cashPrice * r };
  });
}

export const GOVERNORATES = [
  { id: 'sohag', ar: 'سوهاج', en: 'Sohag' },
  { id: 'qena', ar: 'قنا', en: 'Qena' },
  { id: 'assiut', ar: 'أسيوط', en: 'Assiut' },
  { id: 'luxor', ar: 'الأقصر', en: 'Luxor' },
  { id: 'aswan', ar: 'أسوان', en: 'Aswan' },
  { id: 'cairo', ar: 'القاهرة الكبرى', en: 'Greater Cairo' },
  { id: 'other', ar: 'محافظة أخرى', en: 'Other' }
];
