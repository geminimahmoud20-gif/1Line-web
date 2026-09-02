// =============================================================
//  ONE LINE REAL ESTATE - MEGA PROJECTS & COMPOUNDS DATA
// =============================================================

export const MEGA_PROJECTS = [
  {
    id: 'proj-1',
    title_ar: 'كمبوند لؤلؤة سوهاج الجديدة',
    title_en: 'New Sohag Pearl Luxury Compound',
    brandTag: 'Pearl Compound',
    developer_ar: 'شركة 1Line للتطوير العقاري',
    developer_en: '1Line Real Estate Developments',
    location_ar: 'سوهاج الجديدة - الحي السكني الثاني بجوار الجامعة',
    location_en: 'New Sohag - 2nd Residential District near University',
    type_ar: 'كمبوند سكني متكامل',
    type_en: 'Integrated Residential Compound',
    category: 'residential',
    startPrice: 2200000,
    downPaymentPercent: 15,
    installmentYears: 6,
    deliveryDate_ar: 'ديسمبر 2026',
    deliveryDate_en: 'Dec 2026',
    progress: 78,
    progressBreakdown: {
      concrete: 100,
      masonry: 85,
      finishing: 60,
      infrastructure: 75
    },
    area_sqm: '45,000 م²',
    totalUnits: 320,
    availableUnits: 42,
    images: [
      'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80'
    ],
    features_ar: ['أمن وحراسة 24 ساعة', 'لاندسكيب وبحيرات صناعية', 'مول تجاري خاص', 'كلوب هاوس وحمام سباحة', 'مداخل فندقية فاخرة'],
    features_en: ['24/7 Security', 'Lush Green Landscape', 'Private Commercial Mall', 'Clubhouse & Pool', 'Hotel-grade Entrances'],
    description_ar: 'أرقى كمبوند سكني مسور في سوهاج الجديدة بتصميمات معمارية حديثة ونظام عزل حراري وتقسيط مريح حتى 6 سنوات.',
    description_en: 'The premier gated residential compound in New Sohag featuring modern architecture and flexible 6-year payment plans.'
  },
  {
    id: 'proj-2',
    title_ar: 'سيتي سنتر مول سوهاج',
    title_en: 'City Center Mall & Executive Hub',
    brandTag: 'City Center Mall',
    developer_ar: 'مجموعة الصعيد للمشروعات التجارية',
    developer_en: 'Upper Egypt Commercial Group',
    location_ar: 'سوهاج الجديدة - المحور المركزي الرئيسي',
    location_en: 'New Sohag - Main Central Axis',
    type_ar: 'مول تجاري وإداري وطبي',
    type_en: 'Commercial, Medical & Retail Mall',
    category: 'commercial',
    startPrice: 1850000,
    downPaymentPercent: 20,
    installmentYears: 5,
    deliveryDate_ar: 'يونيو 2026',
    deliveryDate_en: 'June 2026',
    progress: 92,
    progressBreakdown: {
      concrete: 100,
      masonry: 100,
      finishing: 88,
      infrastructure: 95
    },
    area_sqm: '18,500 م²',
    totalUnits: 140,
    availableUnits: 18,
    roiEstimate: 14.5,
    images: [
      'https://images.unsplash.com/photo-1519643381401-22c77e60520e?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1582407947304-fd86f028f716?auto=format&fit=crop&w=1200&q=80'
    ],
    features_ar: ['أكبر مجمع توكيلات وبنوك', 'عيادات طبية مجهزة', 'جراج إلكتروني ذكي 3 أدوار', 'مصاعد بانورامية وسلالم كهربائية', 'إدارة تشغيل احترافية'],
    features_en: ['Retail & Banking Hub', 'Medical Suites', '3-Level Smart Parking', 'Panoramic Elevators', 'Facility Management'],
    description_ar: 'الوجهة التجارية الأولى للأعمال والاستثمار في سوهاج الجديدة مع أعلى عائد إيجاري سنوي مضمون يصل إلى 14.5%.',
    description_en: 'Prime commercial and medical destination in New Sohag with high projected annual rental yields up to 14.5%.'
  },
  {
    id: 'proj-3',
    title_ar: 'أبراج رويال بلازا كورنيش النيل',
    title_en: 'Royal Plaza Nilefront Towers',
    brandTag: 'Royal Plaza',
    developer_ar: 'شركة الصفا للاستثمار والتطوير',
    developer_en: 'Al Safa Development',
    location_ar: 'مدينة سوهاج - الكورنيش الشرقي المباشر',
    location_en: 'Sohag City - Direct East Corniche Frontage',
    type_ar: 'أبراج سكنية وإدارية فاخرة',
    type_en: 'Ultra-Luxury Nile View Towers',
    category: 'residential',
    startPrice: 4200000,
    downPaymentPercent: 25,
    installmentYears: 4,
    deliveryDate_ar: 'مارس 2027',
    deliveryDate_en: 'March 2027',
    progress: 54,
    progressBreakdown: {
      concrete: 90,
      masonry: 60,
      finishing: 30,
      infrastructure: 45
    },
    area_sqm: '28,000 م²',
    totalUnits: 180,
    availableUnits: 14,
    images: [
      'https://images.unsplash.com/photo-1577495508048-b635879837f1?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80'
    ],
    features_ar: ['إطلالة بانورامية كاملة على نهر النيل', 'واجهات زجاجية مزدوجة عازلة', 'مولدات كهربائية ونظام إطفاء ذكي', 'خدمة كونسيرج واستقبال فندقي', 'تشطيبات فائقة الجودة'],
    features_en: ['Direct Panoramic Nile Views', 'Double-Glazed Facades', 'Smart Backup Generators', '24/7 Hotel Concierge', 'Ultra-Lux Finishing'],
    description_ar: 'عنوان الفخامة على ضفاف نيل سوهاج، وحدات سكنية وبنتهاوس بمساحات من 180 إلى 320 م² بتشطيبات فندقية فائقة الجودة.',
    description_en: 'The pinnacle of Nilefront luxury living in Sohag, featuring residences and penthouses from 180 to 320 sqm.'
  }
];
