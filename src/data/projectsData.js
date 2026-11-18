// =============================================================
//  ONE LINE REAL ESTATE - MEGA PROJECTS & COMPOUNDS DATA
//  Sample projects that show the layout until real ones are added from the CRM. Each carries
//  isDemo: true: the site labels them "مثال توضيحي", hides unit counts and booking, and they use
//  generic developer names so they can't be mistaken for a real company's project.
// =============================================================

const SAMPLE_PROJECTS = [
  {
    id: 'proj-1',
    title_ar: 'كمبوند لؤلؤة سوهاج الجديدة',
    title_en: 'New Sohag Pearl Luxury Compound',
    brandTag: 'Pearl Compound',
    developer_ar: 'مطوّر عقاري (مثال)',
    developer_en: 'Developer (sample)',
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
    description_ar: 'كمبوند سكني مسور في سوهاج الجديدة بتصميم معماري حديث وعزل حراري، وتقسيط حتى 6 سنوات.',
    description_en: 'A gated residential compound in New Sohag with modern architecture, thermal insulation and up to 6-year payment plans.'
  },
  {
    id: 'proj-2',
    title_ar: 'سيتي سنتر مول سوهاج',
    title_en: 'City Center Mall & Executive Hub',
    brandTag: 'City Center Mall',
    developer_ar: 'مطوّر تجاري (مثال)',
    developer_en: 'Commercial developer (sample)',
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
    features_ar: ['مساحات للتوكيلات والبنوك', 'عيادات طبية مجهزة', 'جراج إلكتروني ذكي 3 أدوار', 'مصاعد بانورامية وسلالم كهربائية', 'إدارة تشغيل احترافية'],
    features_en: ['Retail & banking units', 'Medical Suites', '3-Level Smart Parking', 'Panoramic Elevators', 'Facility Management'],
    description_ar: 'مول تجاري وإداري وطبي في سوهاج الجديدة؛ العائد الإيجاري يُحسب بإيجارات مقارنة فعلية عند الطلب.',
    description_en: 'Commercial and medical destination in New Sohag — rental yield is worked out from real comparable rents on request.'
  },
  {
    id: 'proj-3',
    title_ar: 'أبراج رويال بلازا كورنيش النيل',
    title_en: 'Royal Plaza Nilefront Towers',
    brandTag: 'Royal Plaza',
    developer_ar: 'مطوّر سكني (مثال)',
    developer_en: 'Residential developer (sample)',
    location_ar: 'مدينة سوهاج - الكورنيش الشرقي المباشر',
    location_en: 'Sohag City - Direct East Corniche Frontage',
    type_ar: 'أبراج سكنية وإدارية',
    type_en: 'Nile View Residential Towers',
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
    features_ar: ['إطلالة بانورامية كاملة على نهر النيل', 'واجهات زجاجية مزدوجة عازلة', 'مولدات كهربائية ونظام إطفاء ذكي', 'خدمة كونسيرج واستقبال فندقي', 'تشطيب كامل'],
    features_en: ['Direct Panoramic Nile Views', 'Double-Glazed Facades', 'Smart Backup Generators', '24/7 Hotel Concierge', 'Fully finished'],
    description_ar: 'أبراج سكنية على كورنيش نيل سوهاج، وحدات وبنتهاوس من 180 إلى 320 م² بتشطيب كامل.',
    description_en: 'Residential towers on the Sohag Nile corniche: apartments and penthouses from 180 to 320 sqm, fully finished.'
  }
];

export const MEGA_PROJECTS = SAMPLE_PROJECTS.map((p) => ({ ...p, isDemo: true }));
export const DEMO_PROJECT_IDS = new Set(SAMPLE_PROJECTS.map((p) => String(p.id)));
/** Copies saved in the browser before the isDemo flag existed are still samples */
export const tagDemoProject = (p) => (p && DEMO_PROJECT_IDS.has(String(p.id)) && p.isDemo !== false ? { ...p, isDemo: true } : p);
