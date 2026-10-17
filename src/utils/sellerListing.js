// =============================================================
//  What an owner fills in on /sell: the photo spots per kind of property, the features they can
//  tick, and how the request is summarised for the team. Pure data + functions (unit-tested).
// =============================================================

export const MAX_SELLER_PHOTOS = 8;

// Photos uploaded to Blob are URLs; when the upload route is unavailable the form falls back to small
// inline images, which must all fit in the lead document with room to spare (Firestore caps it at 1 MB).
export const INLINE_PHOTO_BUDGET = 650 * 1024;

// Farmland and industrial land use the land photo spots; factories and warehouses the shop ones
export const sellerAssetClass = (type) => (
  ['retail', 'office', 'factory', 'warehouse'].includes(type) ? 'commercial'
    : ['land', 'agri_land', 'farm', 'industrial_land'].includes(type) ? 'land'
      : type === 'villa' ? 'house' : 'apartment'
);

const extra = (n) => ({ id: `extra_${n}`, ar: 'صورة إضافية', en: 'Extra photo', hint_ar: 'أي زاوية تانية حابب نشوفها', hint_en: 'Any other angle' });

// One photo per spot, so the team gets the same set for every listing
export const PHOTO_SLOTS = {
  commercial: [
    { id: 'street_1', ar: 'الشارع (اتجاه أول)', en: 'Street (one way)', hint_ar: 'صوّر الشارع من قدام المحل', hint_en: 'The street from the shop front' },
    { id: 'street_2', ar: 'الشارع (اتجاه تاني)', en: 'Street (other way)', hint_ar: 'نفس الشارع من الناحية التانية', hint_en: 'The same street, other direction' },
    { id: 'facade', ar: 'الواجهة', en: 'Frontage', hint_ar: 'واجهة الوحدة كاملة', hint_en: 'The whole frontage' },
    { id: 'building', ar: 'المبنى', en: 'Building', hint_ar: 'المبنى كله من بره', hint_en: 'The whole building' },
    { id: 'interior_1', ar: 'من الداخل', en: 'Inside', hint_ar: 'من الباب لجوه', hint_en: 'From the door inwards' },
    { id: 'interior_2', ar: 'من الداخل (زاوية تانية)', en: 'Inside (another angle)', hint_ar: 'من آخر الوحدة ناحية الباب', hint_en: 'From the back towards the door' },
    extra(1),
    extra(2)
  ],
  apartment: [
    { id: 'building', ar: 'المبنى من بره', en: 'Building', hint_ar: 'واجهة العمارة', hint_en: 'The building front' },
    { id: 'living', ar: 'الصالة', en: 'Living room', hint_ar: 'من ركن الصالة', hint_en: 'From a corner' },
    { id: 'bedroom', ar: 'أوضة النوم', en: 'Bedroom', hint_ar: 'الأوضة الرئيسية', hint_en: 'The main bedroom' },
    { id: 'kitchen', ar: 'المطبخ', en: 'Kitchen', hint_ar: 'المطبخ كله', hint_en: 'The whole kitchen' },
    { id: 'bathroom', ar: 'الحمام', en: 'Bathroom', hint_ar: 'الحمام الرئيسي', hint_en: 'The main bathroom' },
    { id: 'view', ar: 'البلكونة أو الإطلالة', en: 'Balcony / view', hint_ar: 'اللي بتشوفه من الشباك', hint_en: 'What you see from the window' },
    extra(1),
    extra(2)
  ],
  house: [
    { id: 'facade', ar: 'الواجهة', en: 'Frontage', hint_ar: 'البيت كله من بره', hint_en: 'The whole house' },
    { id: 'street', ar: 'الشارع', en: 'Street', hint_ar: 'الشارع قدام البيت', hint_en: 'The street in front' },
    { id: 'living', ar: 'الصالة', en: 'Living room', hint_ar: 'من ركن الصالة', hint_en: 'From a corner' },
    { id: 'bedroom', ar: 'أوضة النوم', en: 'Bedroom', hint_ar: 'الأوضة الرئيسية', hint_en: 'The main bedroom' },
    { id: 'kitchen', ar: 'المطبخ', en: 'Kitchen', hint_ar: 'المطبخ كله', hint_en: 'The whole kitchen' },
    { id: 'outdoor', ar: 'الحديقة أو السطح', en: 'Garden / roof', hint_ar: 'المساحة المفتوحة', hint_en: 'The open space' },
    extra(1),
    extra(2)
  ],
  land: [
    { id: 'street_1', ar: 'الشارع (اتجاه أول)', en: 'Street (one way)', hint_ar: 'الشارع من قدام الأرض', hint_en: 'The street in front' },
    { id: 'street_2', ar: 'الشارع (اتجاه تاني)', en: 'Street (other way)', hint_ar: 'نفس الشارع من الناحية التانية', hint_en: 'The same street, other direction' },
    { id: 'plot_front', ar: 'الأرض من قدام', en: 'Plot (front)', hint_ar: 'الأرض كلها من الشارع', hint_en: 'The whole plot from the street' },
    { id: 'plot_side', ar: 'الأرض من الجنب', en: 'Plot (side)', hint_ar: 'من الناصية أو الجار', hint_en: 'From the corner or next door' },
    { id: 'surroundings', ar: 'المنطقة حواليها', en: 'Surroundings', hint_ar: 'أقرب مباني أو خدمات', hint_en: 'Nearby buildings or services' },
    extra(1),
    extra(2),
    extra(3)
  ]
};

export const photoSlotsFor = (type) => PHOTO_SLOTS[sellerAssetClass(type)];

export const SELLER_FEATURES = {
  apartment: [
    { id: 'elevator', ar: 'أسانسير', en: 'Elevator' },
    { id: 'parking', ar: 'مكان ركنة', en: 'Parking' },
    { id: 'balcony', ar: 'بلكونة', en: 'Balcony' },
    { id: 'nile_view', ar: 'على النيل', en: 'Nile view' },
    { id: 'main_street', ar: 'على شارع رئيسي', en: 'On a main street' },
    { id: 'corner', ar: 'ناصية', en: 'Corner' },
    { id: 'gas', ar: 'عداد غاز', en: 'Gas meter' },
    { id: 'ac', ar: 'تكييفات', en: 'Air conditioning' },
    { id: 'kitchen', ar: 'مطبخ مجهز', en: 'Fitted kitchen' },
    { id: 'security', ar: 'أمن وحراسة', en: 'Security' }
  ],
  house: [
    { id: 'garden', ar: 'حديقة', en: 'Garden' },
    { id: 'roof', ar: 'سطح أو روف', en: 'Roof' },
    { id: 'garage', ar: 'جراج', en: 'Garage' },
    { id: 'private_entrance', ar: 'مدخل خاص', en: 'Private entrance' },
    { id: 'elevator', ar: 'أسانسير', en: 'Elevator' },
    { id: 'separate_meters', ar: 'عدادات منفصلة', en: 'Separate meters' },
    { id: 'corner', ar: 'ناصية', en: 'Corner' },
    { id: 'main_street', ar: 'على شارع رئيسي', en: 'On a main street' },
    { id: 'rented', ar: 'فيه أدوار مؤجرة', en: 'Partly rented' }
  ],
  commercial: [
    { id: 'main_street', ar: 'على شارع رئيسي', en: 'On a main street' },
    { id: 'corner', ar: 'ناصية', en: 'Corner' },
    { id: 'glass_front', ar: 'واجهة زجاج', en: 'Glass front' },
    { id: 'high_ceiling', ar: 'سقف عالي', en: 'High ceiling' },
    { id: 'mezzanine', ar: 'ميزانين أو مخزن', en: 'Mezzanine / storage' },
    { id: 'bathroom', ar: 'حمام', en: 'Bathroom' },
    { id: 'elevator', ar: 'أسانسير', en: 'Elevator' },
    { id: 'parking', ar: 'مكان ركنة', en: 'Parking' },
    { id: 'licensed', ar: 'مرخص للنشاط', en: 'Licensed for business' },
    { id: 'commercial_meter', ar: 'عداد كهرباء تجاري', en: 'Commercial meter' },
    { id: 'rented', ar: 'مؤجر حالياً', en: 'Currently rented' }
  ],
  land: [
    { id: 'corner', ar: 'ناصية', en: 'Corner' },
    { id: 'main_street', ar: 'على شارع رئيسي', en: 'On a main street' },
    { id: 'utilities', ar: 'المرافق واصلة', en: 'Utilities connected' },
    { id: 'permit', ar: 'رخصة بناء', en: 'Building permit' },
    { id: 'fenced', ar: 'مسوّرة', en: 'Fenced' },
    { id: 'near_services', ar: 'قريبة من الخدمات', en: 'Near services' }
  ]
};

export const featuresFor = (type) => SELLER_FEATURES[sellerAssetClass(type)];

export const featureLabels = (type, ids = []) => {
  const list = featuresFor(type);
  return ids.map((id) => list.find((f) => f.id === id)?.ar).filter(Boolean);
};

/**
 * Photos in slot order → images (the URL list the CRM already reads) and photoLabels, the spot of
 * each image at the same index. Each photo is stored once: inline fallbacks are large.
 */
export function orderedPhotos(type, bySlot = {}) {
  const used = photoSlotsFor(type)
    .filter((s) => typeof bySlot?.[s.id] === 'string' && bySlot[s.id])
    .slice(0, MAX_SELLER_PHOTOS);
  return { images: used.map((s) => bySlot[s.id]), photoLabels: used.map((s) => s.ar) };
}

// The lead is readable by roles that may not see contact details, so none ride along in `details`
const CONTACT_KEYS = ['phone', 'whatsapp', 'email', 'altPhone', 'name'];
export const withoutContact = (answers = {}) => Object.fromEntries(
  Object.entries(answers).filter(([k]) => !CONTACT_KEYS.includes(k))
);
