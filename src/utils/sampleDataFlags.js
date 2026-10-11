// Finds listings / projects that still carry the sample values the old "add" forms pre-filled
// (stock photo, sample description, "featured" badge, 2.5M / 150 m² / 3 rooms …). Those forms
// were fixed; records saved before then are flagged so the team can review them. Pure; tested.

const STOCK_PHOTOS = ['photo-1600585154340-be6161a56a0c', 'photo-1545324418-cc1a3fa10c00'];
const OLD_DESCRIPTION = 'شقة فاخرة بموقع حيوي متكامل الخدمات وإطلالة ممتازة كاملة المرافق.';
const OLD_LOCATION = 'شرق سوهاج - شارع الجمهورية الرئيسي';

const usesStockPhoto = (item) => (Array.isArray(item?.images) ? item.images : [item?.image])
  .some((src) => typeof src === 'string' && STOCK_PHOTOS.some((id) => src.includes(id)));

/** Reasons a listing still looks like the old form defaults ([] = fine). Samples (isDemo) are skipped. */
export function listingSampleFlags(p = {}) {
  if (!p || p.isDemo) return [];
  const out = [];
  if (usesStockPhoto(p)) out.push('صورة جاهزة مش صورة العقار');
  if (p.description_ar === OLD_DESCRIPTION) out.push('وصف افتراضي');
  if (p.locationName_ar === OLD_LOCATION) out.push('عنوان افتراضي');
  if (Number(p.price) === 2500000 && Number(p.size) === 150 && Number(p.bedrooms) === 3) out.push('سعر ومساحة وغرف افتراضية (2.5 مليون / 150م² / 3 غرف)');
  if (p.featured && p.badge_ar === 'عرض مميز' && Number(p.priorityRank) === 90) out.push('"عرض مميز" اتحط تلقائياً');
  return out;
}

/** Same for mega projects. */
export function projectSampleFlags(p = {}) {
  if (!p || p.isDemo) return [];
  const out = [];
  if (usesStockPhoto(p)) out.push('صورة جاهزة مش صورة المشروع');
  if (Number(p.progress) === 75 && p.deliveryDate_ar === 'ديسمبر 2026') out.push('نسبة إنجاز وموعد تسليم افتراضيين');
  if (Number(p.totalUnits) === 150 && Number(p.availableUnits) === 25) out.push('عدد وحدات افتراضي');
  if (Number(p.roiEstimate) === 12.5) out.push('عائد متوقع افتراضي 12.5%');
  if (p.location_ar === 'سوهاج الجديدة - الحي السكني' && p.developer_ar === 'شركة 1Line للتطوير العقاري') out.push('مطوّر وموقع افتراضيين');
  return out;
}

/**
 * For the public site: drop the old stock photo from a real listing so visitors never see a
 * picture that isn't the unit (the CRM still sees and flags the stored record).
 */
export function withoutStockPhotos(p) {
  if (!p || p.isDemo || !usesStockPhoto(p)) return p;
  const images = (Array.isArray(p.images) ? p.images : []).filter((src) => !STOCK_PHOTOS.some((id) => String(src).includes(id)));
  return { ...p, images, image: images[0] || '' };
}
