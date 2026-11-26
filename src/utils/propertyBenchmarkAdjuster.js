// =============================================================
//  1Line Dynamic Hedonic Valuation & Multi-Factor Property Benchmark Adjuster
//  Calculates realistic, attribute-adjusted benchmark prices per m²
//  based on finishing, floor, elevator, view, facade, micro-location,
//  size bracket, utilities, and building amenities.
//  Pure functions tested in tests/unit/property-benchmark-adjuster.test.mjs.
// =============================================================

import { finishingIdOf } from './unitHandover.js';
import { buildingFacts } from './buildingFeatures.js';

const clean = (v) => String(v ?? '').trim();
const textOf = (p) => [
  p?.title_ar,
  p?.title_en,
  p?.locationName_ar,
  p?.locationName_en,
  p?.description_ar,
  p?.description_en,
  ...(Array.isArray(p?.quickHighlights) ? p.quickHighlights : []),
  ...(Array.isArray(p?.features_ar) ? p.features_ar : [])
].filter(Boolean).join(' ').toLowerCase();

/**
 * Finishing quality adjustments relative to standard full finish (0%).
 * Values represent standard Upper Egypt & Cairo market appraisal deltas.
 */
export const FINISHING_WEIGHTS = {
  core: -0.22,        // على الطوب (22% below standard)
  semi: -0.12,        // نصف تشطيب / محارة وحلوق (12% below standard)
  full: 0.00,         // تشطيب كامل تجاري/عادي (Baseline)
  lux: 0.08,          // لوكس (8% premium)
  super_lux: 0.18,    // سوبر لوكس (18% premium)
  ultra_lux: 0.30,    // ألترا سوبر لوكس / هاي كلاس (30% premium)
  furnished: 0.38     // مفروش بالكامل بأجهزة (38% premium)
};

/**
 * Evaluates floor level combined with elevator access.
 */
export function evaluateFloorElevatorFactor(property) {
  const floorRaw = clean(property?.floor);
  const floorNum = parseInt(floorRaw, 10);
  const facts = buildingFacts(property, true);
  const hasElevator = facts.some((f) => f.key === 'elevator' && f.positive)
    || textOf(property).includes('أسانسير')
    || textOf(property).includes('اسانسير')
    || textOf(property).includes('مصعد')
    || textOf(property).includes('elevator');

  const isGround = floorRaw === '0' || floorRaw.includes('أرضي') || floorRaw.includes('ارضي') || floorRaw.toLowerCase().includes('ground');
  const isTopFloor = floorRaw.includes('أخير') || floorRaw.includes('اخير') || floorRaw.includes('رووف') || floorRaw.includes('روف') || floorRaw.toLowerCase().includes('roof') || floorNum >= 7;

  // Ground floor
  if (isGround) {
    const hasGarden = facts.some((f) => f.key === 'garden' && f.positive) || textOf(property).includes('حديقة') || textOf(property).includes('جاردن');
    if (hasGarden) {
      return {
        percent: 0.05,
        reasonAr: 'دور أرضي بحديقة / مدخل خاص (+5%)',
        reasonEn: 'Ground floor with private garden (+5%)'
      };
    }
    return {
      percent: -0.04,
      reasonAr: 'دور أرضي عادي (-4%)',
      reasonEn: 'Standard ground floor (-4%)'
    };
  }

  // Top floor
  if (isTopFloor) {
    if (hasElevator) {
      return {
        percent: 0.00,
        reasonAr: 'دور أخير مخدوم بأسانسير (0%)',
        reasonEn: 'Top floor with elevator (0%)'
      };
    }
    return {
      percent: -0.18,
      reasonAr: 'دور أخير بدون أسانسير (-18%)',
      reasonEn: 'Top floor without elevator (-18%)'
    };
  }

  // Intermediate / numbered floors
  if (!Number.isNaN(floorNum)) {
    if (floorNum >= 1 && floorNum <= 4) {
      // Prime sweet-spot floors
      return {
        percent: hasElevator ? 0.06 : 0.02,
        reasonAr: hasElevator ? 'دور متكرر مميز بأسانسير (+6%)' : 'دور متكرر مريح (+2%)',
        reasonEn: hasElevator ? 'Prime floor with elevator (+6%)' : 'Prime floor (+2%)'
      };
    }
    if (floorNum >= 5) {
      // High floor
      if (hasElevator) {
        return {
          percent: 0.03,
          reasonAr: 'دور مرتفع بإطلالة وأسانسير (+3%)',
          reasonEn: 'High floor with elevator (+3%)'
        };
      }
      return {
        percent: -0.15,
        reasonAr: 'دور مرتفع بدون أسانسير (-15%)',
        reasonEn: 'High floor without elevator (-15%)'
      };
    }
  }

  // Unknown floor, but has elevator
  if (hasElevator) {
    return {
      percent: 0.04,
      reasonAr: 'مبنى مخدوم بمصعد معتمد (+4%)',
      reasonEn: 'Elevator-serviced building (+4%)'
    };
  }

  return { percent: 0, reasonAr: '', reasonEn: '' };
}

/**
 * Evaluates view, facade, and street prominence.
 */
export function evaluateViewAndLocationFactor(property) {
  const t = textOf(property);
  let percent = 0;
  const reasonsAr = [];
  const reasonsEn = [];

  // Main street / Wide boulevard
  const isMainStreet = t.includes('رئيسي')
    || t.includes('عمومي')
    || t.includes('شارع حلمي الشريف')
    || t.includes('شارع الجمهورية')
    || t.includes('شارع سيتي')
    || t.includes('شارع اسيوط سوهاج')
    || t.includes('الكورنيش')
    || t.includes('شارع 15')
    || t.includes('main street');

  // Panoramic or open view
  const isPanoramic = t.includes('بانورام')
    || t.includes('غير مجروح')
    || t.includes('مفتوح')
    || t.includes('إطلالة مفتوحة')
    || t.includes('على النيل')
    || t.includes('على ميدان')
    || t.includes('بحري صريح')
    || t.includes('واجهة بحري');

  // Corner unit (double facade)
  const isCorner = t.includes('ناصية') || t.includes('واجهتين') || t.includes('مزدوج');

  // Negative view cues (side street / rear / lightwell)
  const isRear = t.includes('خلفي') || t.includes('على منور') || t.includes('شارع جانبي ضيق');

  if (isMainStreet && isPanoramic) {
    percent += 0.12;
    reasonsAr.push('شارع رئيسي وإطلالة بانورامية مفتوحة (+12%)');
    reasonsEn.push('Main street & panoramic open view (+12%)');
  } else if (isMainStreet) {
    percent += 0.08;
    reasonsAr.push('واجهة على شارع رئيسي حيوي (+8%)');
    reasonsEn.push('Main street front facade (+8%)');
  } else if (isPanoramic) {
    percent += 0.06;
    reasonsAr.push('إطلالة مفتوحة بحري غير مجروحة (+6%)');
    reasonsEn.push('Open unblocked view (+6%)');
  }

  if (isCorner) {
    percent += 0.05;
    reasonsAr.push('شقة ناصية على شارعين (+5%)');
    reasonsEn.push('Corner unit on dual streets (+5%)');
  }

  if (isRear && percent <= 0) {
    percent -= 0.08;
    reasonsAr.push('وحدة خلفية / شارع جانبي (-8%)');
    reasonsEn.push('Rear / side street unit (-8%)');
  }

  return {
    percent,
    reasonAr: reasonsAr.join(' · '),
    reasonEn: reasonsEn.join(' · ')
  };
}

/**
 * Evaluates building facade, parking, land share, and active utilities.
 */
export function evaluateBuildingAndAmenitiesFactor(property) {
  const t = textOf(property);
  const facts = buildingFacts(property, true);
  let percent = 0;
  const reasonsAr = [];
  const reasonsEn = [];

  // 1. Garage / Parking
  const hasGarage = facts.some((f) => f.key === 'garage' && f.positive)
    || t.includes('جراج')
    || t.includes('باكية')
    || t.includes('parking');
  if (hasGarage) {
    percent += 0.06;
    reasonsAr.push('جراج / موقف سيارات خاص (+6%)');
    reasonsEn.push('Private garage / parking (+6%)');
  }

  // 2. Land Share
  const hasLand = facts.some((f) => f.key === 'landShare' && f.positive)
    || t.includes('حصة في الأرض')
    || t.includes('حصة بالأرض')
    || t.includes('حصة شائعة');
  if (hasLand) {
    percent += 0.04;
    reasonsAr.push('حصة قانونية مسجلة في الأرض (+4%)');
    reasonsEn.push('Registered land share (+4%)');
  }

  // 3. Official utilities (Electricity, water, gas)
  const hasUtilities = t.includes('عداد كهرباء')
    || t.includes('عداد مياه')
    || t.includes('غاز طبيعي')
    || t.includes('كاملة المرافق')
    || t.includes('مرافق رسمية')
    || t.includes('عداد كودي')
    || t.includes('عداد قديم');
  if (hasUtilities) {
    percent += 0.03;
    reasonsAr.push('عدادات ومرافق رسمية نشطة (+3%)');
    reasonsEn.push('Active official meters & utilities (+3%)');
  }

  // 4. Hotel Entrance / Luxury Facade
  const hasLuxuryFacade = t.includes('مدخل فندقي')
    || t.includes('مدخل رخام')
    || t.includes('واجهة كلاسيك')
    || t.includes('حجر هاشمي')
    || t.includes('برج حديث')
    || t.includes('عمارة حديثة');
  if (hasLuxuryFacade) {
    percent += 0.03;
    reasonsAr.push('مدخل رخام وواجهة فندقية حديثة (+3%)');
    reasonsEn.push('Luxury hotel entrance / modern facade (+3%)');
  }

  return {
    percent,
    reasonAr: reasonsAr.join(' · '),
    reasonEn: reasonsEn.join(' · ')
  };
}

/**
 * Size bracket liquidity adjustment.
 */
export function evaluateSizeBracketFactor(property) {
  const size = Number(property?.size) || 0;
  if (size <= 0) return { percent: 0, reasonAr: '', reasonEn: '' };

  // Micro-apartments / studios (very high demand per meter)
  if (size < 70) {
    return {
      percent: 0.04,
      reasonAr: 'استوديو / مساحة صغيرة عالية الطلب (+4%)',
      reasonEn: 'High-demand compact studio (+4%)'
    };
  }
  // Standard family apartments (70 to 190 m²) = Standard baseline 0%
  if (size >= 70 && size <= 190) {
    return { percent: 0, reasonAr: '', reasonEn: '' };
  }
  if (size >= 191 && size <= 260) {
    return {
      percent: -0.03,
      reasonAr: 'مساحة عائلية واسعة (-3%)',
      reasonEn: 'Large family layout (-3%)'
    };
  }
  if (size > 260) {
    return {
      percent: -0.06,
      reasonAr: 'مساحة ضخمة (-6%)',
      reasonEn: 'Extra-large footprint (-6%)'
    };
  }
  return { percent: 0, reasonAr: '', reasonEn: '' };
}

/**
 * Computes all attribute adjustments for a given property.
 */
export function calculatePropertyAttributeAdjustments(property) {
  if (!property) {
    return { totalMultiplier: 1, totalPercent: 0, breakdown: [] };
  }

  const breakdown = [];

  // 1. Finishing
  const finishingKey = finishingIdOf(property) || 'full';
  const finishPct = FINISHING_WEIGHTS[finishingKey] ?? 0;
  if (finishPct !== 0) {
    const finishLabelAr = {
      core: 'على الطوب / بدون تشطيب (-22%)',
      semi: 'نصف تشطيب / محارة وحلوق (-12%)',
      lux: 'تشطيب لوكس (+8%)',
      super_lux: 'تشطيب سوبر لوكس (+18%)',
      ultra_lux: 'تشطيب ألترا سوبر لوكس (+30%)',
      furnished: 'مفروش بالكامل بأجهزة (+38%)'
    }[finishingKey] || 'مستوى التشطيب';

    breakdown.push({
      category: 'finishing',
      percent: finishPct,
      labelAr: finishLabelAr,
      labelEn: `Finishing: ${finishingKey} (${Math.round(finishPct * 100)}%)`
    });
  }

  // 2. Floor & Elevator
  const floorFactor = evaluateFloorElevatorFactor(property);
  if (floorFactor.percent !== 0) {
    breakdown.push({
      category: 'floor_elevator',
      percent: floorFactor.percent,
      labelAr: floorFactor.reasonAr,
      labelEn: floorFactor.reasonEn
    });
  }

  // 3. View & Location
  const viewFactor = evaluateViewAndLocationFactor(property);
  if (viewFactor.percent !== 0) {
    breakdown.push({
      category: 'view_location',
      percent: viewFactor.percent,
      labelAr: viewFactor.reasonAr,
      labelEn: viewFactor.reasonEn
    });
  }

  // 4. Building & Amenities (Garage, utilities, land share, entrance)
  const amenityFactor = evaluateBuildingAndAmenitiesFactor(property);
  if (amenityFactor.percent !== 0) {
    breakdown.push({
      category: 'amenities_utilities',
      percent: amenityFactor.percent,
      labelAr: amenityFactor.reasonAr,
      labelEn: amenityFactor.reasonEn
    });
  }

  // 5. Size Bracket
  const sizeFactor = evaluateSizeBracketFactor(property);
  if (sizeFactor.percent !== 0) {
    breakdown.push({
      category: 'size_bracket',
      percent: sizeFactor.percent,
      labelAr: sizeFactor.reasonAr,
      labelEn: sizeFactor.reasonEn
    });
  }

  // 6. Villa & Independent House asset class premium (villas hold private land parcel and total privacy)
  const isVilla = property?.type === 'villa'
    || textOf(property).includes('فيلا')
    || textOf(property).includes('توين هاوس')
    || textOf(property).includes('تاون هاوس');
  if (isVilla) {
    breakdown.push({
      category: 'property_asset_class',
      percent: 0.22,
      labelAr: 'فيلا مستقلة / خصوصية أرض وسور خاص (+22%)',
      labelEn: 'Standalone villa parcel & privacy (+22%)'
    });
  }

  // Sum total adjustments (capped between -45% and +65% for realism)
  const rawSum = breakdown.reduce((sum, item) => sum + item.percent, 0);
  const totalPercent = Math.max(-0.45, Math.min(0.65, Number(rawSum.toFixed(3))));
  const totalMultiplier = Number((1 + totalPercent).toFixed(3));

  return {
    totalMultiplier,
    totalPercent: Math.round(totalPercent * 100),
    breakdown
  };
}

/**
 * Calculates the final fair adjusted reference price per m² for a specific property
 * given the base area reference price.
 */
export function calculateAdjustedReferencePrice(property, baseAreaPpm) {
  const base = Number(baseAreaPpm) || 0;
  if (base <= 0) return null;

  const { totalMultiplier, totalPercent, breakdown } = calculatePropertyAttributeAdjustments(property);
  const adjustedPpm = Math.round(base * totalMultiplier);

  return {
    basePpm: base,
    adjustedPpm,
    totalPercent,
    deltaPpm: adjustedPpm - base,
    breakdown,
    isAdjusted: totalPercent !== 0,
    summaryAr: breakdown.length > 0
      ? breakdown.map((b) => b.labelAr).join(' · ')
      : 'متوافق مع متوسط مواصفات الحي القياسية',
    summaryEn: breakdown.length > 0
      ? breakdown.map((b) => b.labelEn).join(' · ')
      : 'Aligned with standard district specifications'
  };
}
