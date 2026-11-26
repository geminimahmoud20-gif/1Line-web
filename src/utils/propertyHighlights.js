/**
 * 1Line — Property Card Quick Highlights
 * Derives and formats high-converting quick chips displayed directly under the price
 * (e.g., [استلام فوري] • [نصف تشطيب] • [دور أرضي بحديقة]).
 *
 * Supports both:
 * 1. Manual CRM override via `property.quickHighlights` (array of strings or comma-separated).
 * 2. Smart automatic fallback from property metadata (handover, finishing, floor, garden, orientation).
 */
import { hasNoRooms } from './propertyKinds.js';

export const PRESET_HIGHLIGHTS = [
  { id: 'immediate_handover', ar: 'استلام فوري', en: 'Ready to move', tone: 'delivery' },
  { id: 'semi_finished', ar: 'نصف تشطيب', en: 'Core & Shell', tone: 'finishing' },
  { id: 'super_lux', ar: 'سوبر لوكس', en: 'Super Lux', tone: 'finishing' },
  { id: 'ultra_lux', ar: 'ألترا لوكس', en: 'Ultra Lux', tone: 'finishing' },
  { id: 'red_brick', ar: 'طوب أحمر', en: 'Red Brick', tone: 'finishing' },
  { id: 'ground_garden', ar: 'دور أرضي بحديقة', en: 'Ground + Garden', tone: 'feature' },
  { id: 'sea_facade', ar: 'واجهة بحرية', en: 'North-facing', tone: 'feature' },
  { id: 'main_street', ar: 'شارع رئيسي', en: 'Main Street', tone: 'feature' },
  { id: 'installment_avail', ar: 'متاح تقسيط', en: 'Installments available', tone: 'finance' },
  { id: 'registered_deed', ar: 'عقد مسجل', en: 'Registered deed', tone: 'legal' }
];

export const HANDOVER_OPTIONS = [
  { id: 'immediate', ar: 'استلام فوري', en: 'Immediate Handover' },
  { id: 'ready_inspect', ar: 'جاهزة للمعاينة والسكن', en: 'Ready for inspection' },
  { id: 'six_months', ar: 'استلام خلال 6 شهور', en: 'Within 6 months' },
  { id: 'year_2026', ar: 'استلام 2026', en: 'Delivery 2026' },
  { id: 'year_2027', ar: 'استلام 2027', en: 'Delivery 2027' },
  { id: 'under_construction', ar: 'تحت الإنشاء', en: 'Under construction' }
];

export const FINISHING_OPTIONS = [
  { id: 'semi_finished', ar: 'نصف تشطيب (محارة وحلوق)', en: 'Semi-finished (Core & Shell)' },
  { id: 'super_lux', ar: 'سوبر لوكس جاهز', en: 'Super Lux' },
  { id: 'ultra_lux', ar: 'ألترا سوبر لوكس فندقي', en: 'Ultra Super Lux' },
  { id: 'red_brick', ar: 'بدون تشطيب (طوب أحمر)', en: 'Red Brick' },
  { id: 'commercial', ar: 'تشطيب تجاري وإداري', en: 'Commercial / Office fit-out' }
];

/**
 * Assigns an aesthetic tone to a highlight text.
 */
function classifyTone(text) {
  if (!text) return 'feature';
  const t = String(text).toLowerCase();
  if (t.includes('استلام') || t.includes('فوري') || t.includes('جاهز') || t.includes('ready') || t.includes('move')) {
    return 'delivery';
  }
  if (t.includes('تشطيب') || t.includes('لوكس') || t.includes('محارة') || t.includes('طوب') || t.includes('finish') || t.includes('shell')) {
    return 'finishing';
  }
  if (t.includes('تقسيط') || t.includes('مقدم') || t.includes('كاش') || t.includes('تسهيلات') || t.includes('installment')) {
    return 'finance';
  }
  if (t.includes('عقد') || t.includes('مسجل') || t.includes('ترخيص') || t.includes('شخصي') || t.includes('حصة') || t.includes('deed')) {
    return 'legal';
  }
  return 'feature';
}

/**
 * Returns an array of { label: string, tone: string } for the property card.
 * Capped at 3 chips to maintain clean card proportions.
 */
export function getQuickHighlights(property, isAr = true) {
  if (!property) return [];

  // 1. Explicit CRM override
  if (Array.isArray(property.quickHighlights) && property.quickHighlights.length > 0) {
    return property.quickHighlights
      .filter((h) => typeof h === 'string' && h.trim().length > 0)
      .slice(0, 3)
      .map((label) => ({ label: label.trim(), tone: classifyTone(label) }));
  }

  if (typeof property.quickHighlights === 'string' && property.quickHighlights.trim().length > 0) {
    return property.quickHighlights
      .split(/[,،]/)
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 3)
      .map((label) => ({ label, tone: classifyTone(label) }));
  }

  // 2. Smart automatic fallback
  const items = [];

  // Chip 1: Handover / Delivery
  const delivery = property.delivery_ar || property.handover_ar || property.handoverStatus_ar;
  if (delivery) {
    items.push({ label: delivery, tone: 'delivery' });
  } else {
    // Check finishing or status for default immediate handover
    const finish = String(property.finishing_ar || '');
    if (finish.includes('لوكس') || finish.includes('جاهز') || finish.includes('سكن') || property.status === 'published') {
      items.push({ label: isAr ? 'استلام فوري' : 'Ready to move', tone: 'delivery' });
    }
  }

  // Chip 2: Finishing Level
  const finish = property.finishing_ar || property.finishing_en;
  if (finish) {
    let finishLabel = '';
    if (finish.includes('نصف') || finish.includes('محارة')) {
      finishLabel = isAr ? 'نصف تشطيب' : 'Core & shell';
    } else if (finish.includes('ألترا') || finish.includes('الترا')) {
      finishLabel = isAr ? 'ألترا سوبر لوكس' : 'Ultra lux';
    } else if (finish.includes('سوبر') || finish.includes('لوكس')) {
      finishLabel = isAr ? 'سوبر لوكس' : 'Super lux';
    } else if (finish.includes('طوب')) {
      finishLabel = isAr ? 'طوب أحمر' : 'Red brick';
    } else if (finish.length <= 18) {
      finishLabel = finish;
    }
    if (finishLabel) {
      items.push({ label: finishLabel, tone: 'finishing' });
    }
  }

  // Chip 3: Special Feature / Floor / Garden / Payment
  const title = String(property.title_ar || property.title_en || '');
  const desc = String(property.description_ar || property.description_en || '');
  const floorNum = Number(property.floor);
  // "floor 0" only means "ground floor" for units that actually have floors; for land, offices,
  // shops and similar it's just the unused default, and would otherwise show a nonsensical
  // "ground floor" chip on a plot of land.
  const canHaveFloor = !hasNoRooms(property.type);

  if ((canHaveFloor && floorNum === 0) || title.includes('حديقة') || desc.includes('حديقة')) {
    if (title.includes('حديقة') || desc.includes('حديقة')) {
      items.push({ label: isAr ? 'دور أرضي بحديقة' : 'Ground + Garden', tone: 'feature' });
    } else {
      items.push({ label: isAr ? 'دور أرضي' : 'Ground floor', tone: 'feature' });
    }
  } else if (title.includes('محور') || title.includes('رئيسي') || desc.includes('محور رئيسي')) {
    items.push({ label: isAr ? 'علي المحور الرئيسي' : 'Main Road View', tone: 'feature' });
  } else if (property.orientation?.direction_ar) {
    items.push({ label: `واجهة ${property.orientation.direction_ar}`, tone: 'feature' });
  } else if (property.frontage) {
    items.push({ label: `واجهة ${property.frontage}`, tone: 'feature' });
  } else if (Number(property.installmentYears) > 0 || (Number(property.monthlyInstallment) > 0 && Number(property.downPayment) > 0)) {
    items.push({ label: isAr ? 'متاح تقسيط' : 'Installments avail.', tone: 'finance' });
  } else if (Number(property.floor) > 0) {
    items.push({ label: isAr ? `الدور ${property.floor}` : `Floor ${property.floor}`, tone: 'feature' });
  }

  return items.slice(0, 3);
}
