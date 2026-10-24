// The short facts row under a listing's title: area, rooms, baths, floor, finishing, handover.
// Only filled facts show; farmland and industrial units skip rooms and floors.
// Pure, unit-tested in tests/unit/key-facts.test.mjs.
import { isAgricultural, isIndustrial, isLandType, sizeLabel } from './propertyKinds.js';
import { countLabel } from './arabicCount.js';

const filled = (v) => v !== undefined && v !== null && String(v).trim() !== '';

export function keyFacts(p, isAr = true) {
  if (!p) return [];
  const plain = !isAgricultural(p) && !isIndustrial(p) && !isLandType(p.type);
  const facts = [];
  const size = sizeLabel(p, isAr);
  if (size) facts.push({ key: 'size', label: isAr ? 'المساحة' : 'Area', value: size });
  if (plain && Number(p.bedrooms) > 0) facts.push({ key: 'rooms', label: isAr ? 'الغرف' : 'Rooms', value: countLabel('room', p.bedrooms, isAr) });
  if (plain && Number(p.bathrooms) > 0) facts.push({ key: 'baths', label: isAr ? 'الحمامات' : 'Baths', value: countLabel('bath', p.bathrooms, isAr) });
  if (plain && filled(p.floor)) {
    facts.push({ key: 'floor', label: isAr ? 'الدور' : 'Floor', value: Number(p.floor) === 0 ? (isAr ? 'أرضي' : 'Ground') : String(p.floor) });
  }
  const finishing = isAr ? p.finishing_ar : (p.finishing_en || p.finishing_ar);
  if (filled(finishing)) facts.push({ key: 'finishing', label: isAr ? 'التشطيب' : 'Finishing', value: String(finishing).trim() });
  const handover = p.deliveryYear
    ? String(p.deliveryYear)
    : p.completionStatus === 'ready'
      ? (isAr ? 'فوري' : 'Now')
      : ['under_construction', 'off_plan'].includes(p.completionStatus) ? (isAr ? 'تحت الإنشاء' : 'Building') : '';
  if (handover) facts.push({ key: 'handover', label: isAr ? 'الاستلام' : 'Handover', value: handover });
  return facts;
}
