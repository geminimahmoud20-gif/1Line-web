/**
 * 🧠 ONELINE ENTERPRISE SEMANTIC REAL ESTATE SEARCH ENGINE 2026
 * Deep Natural Language Processor (NLP) tailored for Egyptian & Sohag Real Estate Dialect.
 * Extracts: Price Limits, Bed Counts, Districts, Property Types, and Commercial Intents.
 */

// Area Synonyms & Mappings in Sohag
const AREA_SYNONYMS = {
  east: [
    'شرق', 'شرق سوهاج', 'الشرق', 'شارع الجمهورية', 'الجمهورية', 'الفتح', 
    'أسيوط سوهاج', 'طريق اسيوط', 'طريق أسيوط', 'الثقافة', 'ميدان الثقافة', 
    'الكاشف', 'الأرقم', 'east', 'east sohag'
  ],
  new_sohag: [
    'سوهاج الجديدة', 'الجديدة', 'الجامعة', 'جامعة سوهاج', 'الجامعة الجديدة', 
    'النخيل', 'الزهور', 'حي النخيل', 'حي الزهور', 'ابني بيتك', 'إبني بيتك', 
    'مدينة سوهاج الجديدة', 'التوسعات', 'عمارات سوهاج الجديدة', 'new sohag', 'new_sohag'
  ],
  corniche: [
    'كورنيش', 'الكورنيش', 'كورنيش النيل', 'النيل', 'شارع النيل', 'نيل سوهاج', 
    'على البحر', 'ع البحر', 'ع النيل', 'على النيل', 'مطل على النيل', 'واجهة نيلية', 'corniche', 'nile'
  ],
  center: [
    'وسط البلد', 'المحطة', 'المدينة', 'المحافظة', 'شارع 15', '15', 'خمسطاشر', 'شارع خمسطاشر', 
    'الشهيد', 'حي الشهيد', 'ميدان الشهيد', 'المخبز الآلي', 'المخبز الالي', 'سيتي', 'حي سيتي', 
    'منطقة سيتي', 'الهلال', 'مستشفى الهلال', 'ميدان الهلال', 'المجزر', 'المجزر القديم', 
    'الجرجاوية', 'شارع الجرجاوية', 'غرب سوهاج', 'غرب', 'الغرب', 'center', 'downtown'
  ],
  kawthar: [
    'الكوثر', 'حي الكوثر', 'كوثر', 'المنطقة الصناعية', 'المنطقة الصناعية بالكوثر', 'المخيم', 'المخيم السياحي', 'kawthar', 'al-kawthar'
  ],
  akhmeem: [
    'أخميم', 'اخميم', 'طريق أخميم', 'مدينة أخميم', 'الصوامعة', 'akhmeem', 'akhmim'
  ],
  tahta: [
    'طهطا', 'طهطا البلد', 'شارع بورسعيد', 'مركز طهطا', 'مدينة طهطا', 'tahta'
  ],
  girga: [
    'جرجا', 'مركز جرجا', 'مدينة جرجا', 'طريق جرجا', 'girga'
  ]
};

// Property Types & Practical Commercial Intents
const TYPE_SYNONYMS = {
  apartment: [
    'شقة', 'شقق', 'شقه', 'شقق سكنية', 'دوبلكس', 'بنتهاوس', 'استوديو', 'سكن', 
    'عائلي', 'ع الطوب', 'طوب أحمر', 'طوب احمر', 'عضم', 'نصف تشطيب', 'محارة وحلوق', 
    'سوبر لوكس', 'الترا لوكس', 'لوكس', 'على المفتاح', 'واجهة بحري', 'بحري', 'قبلي', 
    'طابق أول', 'ارضي بحديقة', 'بلكونة', 'apartment', 'flat', 'duplex', 'penthouse'
  ],
  villa: [
    'فيلا', 'فيلات', 'فيلل', 'فيلا مستقلة', 'تاون هاوس', 'توين هاوس', 'قصر', 
    'روف', 'حديقة خاصة', 'حمامات سباحة', 'بيت أهالي', 'بيت', 'منزل عائلي', 'منزل مستقل', 
    'villa', 'mansion', 'townhouse'
  ],
  land: [
    'أرض', 'ارض', 'أراضي', 'اراضي', 'قطعة أرض', 'مباني', 'عمراني', 'صناعي', 
    'أرض بناء', 'تراخيص', 'كردون مباني', 'كردون', 'أرض مسجلة', 'رخصة بناء', 'حيازة', 
    'land', 'plot'
  ],
  commercial: [
    'محل', 'محلات', 'تجاري', 'صيدلية', 'سوبرماركت', 'مطعم', 'كافيه', 
    'فرنشايز', 'معرض', 'واجهة تجارية', 'محل تمليك', 'محل ايجار', 'ناصية', 
    'واجهة', 'شغال', 'ميزانين', 'بدروم', 'جراج', 'commercial', 'retail', 'shop'
  ],
  office: [
    'مكتب', 'مكاتب', 'إداري', 'اداري', 'عيادة', 'عيادات', 'مركز طبي', 
    'معمل', 'معمل تحاليل', 'مقر شركة', 'حسابات', 'office', 'clinic', 'administrative'
  ],
  building: [
    'عمارة', 'عماره', 'برج', 'أبراج', 'مبنى كامل', 'عمارة سكنية', 'building'
  ]
};

/**
 * Normalizes Arabic text: converts Eastern digits to Western, unifies Alef, Ta-Marbuta, and Ya forms.
 */
export function normalizeArabicText(text) {
  if (!text || typeof text !== 'string') return '';
  return text
    // Convert Eastern Arabic numerals ٠١٢٣٤٥٦٧٨٩ to 0123456789
    .replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d))
    // Convert Persian Arabic numerals ۰۱۲۳۴۵۶۷۸۹ to 0123456789
    .replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d))
    // Normalize Alef forms (أ, إ, آ, ٱ -> ا)
    .replace(/[أإآٱ]/g, 'ا')
    // Normalize Ta Marbuta (ة -> ه)
    .replace(/ة/g, 'ه')
    // Normalize Alif Maqsura (ى -> ي)
    .replace(/ى/g, 'ي')
    // Remove Arabic diacritics / Tashkeel
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .toLowerCase()
    .trim();
}

// Normalized Area Synonyms Map
const NORMALIZED_AREA_MAP = Object.entries(AREA_SYNONYMS).map(([key, list]) => ({
  key,
  originalName: list[0],
  normalizedSynonyms: list.map(s => normalizeArabicText(s))
}));

// Normalized Type Synonyms Map
const NORMALIZED_TYPE_MAP = Object.entries(TYPE_SYNONYMS).map(([key, list]) => ({
  key,
  originalName: list[0],
  normalizedSynonyms: list.map(s => normalizeArabicText(s))
}));

// Natural language price multipliers (configured for normalized text)
const PRICE_PATTERNS = [
  // "من 2 مليون إلى 5 مليون"
  { regex: /(?:من|between)\s*(\d+(?:\.\d+)?)\s*(?:مليون|م)?\s*(?:الي|وحتي|حتي|to|-)\s*(\d+(?:\.\d+)?)\s*(?:مليون|م)/i, isRange: true, multiplier: 1000000 },
  // "أقل من 3 مليون", "تحت 2.5 مليون", "في حدود 4 مليون", "بسعر 2.5 مليون", "بـ 2.5 مليون"
  { regex: /(?:اقل من|تحت|في حدود|حدود|بسعر|بـ?|باقل من|حتي|under|below|less than|max)\s*(\d+(?:\.\d+)?)\s*(?:مليون|ملايين|م)/i, multiplier: 1000000, type: 'max' },
  // "أكثر من 2 مليون", "فوق 3 مليون"
  { regex: /(?:اكثر من|فوق|من اول|above|min|more than)\s*(\d+(?:\.\d+)?)\s*(?:مليون|ملايين|م)/i, multiplier: 1000000, type: 'min' },
  // Direct numbers with "مليون"
  { regex: /(\d+(?:\.\d+)?)\s*(?:مليون|ملايين)/i, multiplier: 1000000, type: 'approx' },
  // "500 ألف", "بسعر 800 الف"
  { regex: /(?:اقل من|تحت|في حدود|حدود|بسعر|باقل من|حتي|under|below|max)?\s*(\d+)\s*(?:الف|k)/i, multiplier: 1000, type: 'max' },
  // Plain numbers over 100,000 (e.g. 2500000)
  { regex: /\b([1-9]\d{5,8})\b/, multiplier: 1, type: 'approx' }
];

// Bedrooms parser (configured for normalized text)
const BEDROOM_PATTERNS = [
  { regex: /(?:استوديو|ستوديو|studio)/i, parser: () => 1 },
  { regex: /(?:غرفتين|اوضتين|اوضتان|غرفتان)/i, parser: () => 2 },
  { regex: /(?:ثلاث|3)\s*(?:غرف|اوض|نوم)/i, parser: () => 3 },
  { regex: /(?:اربع|4)\s*(?:غرف|اوض|نوم)/i, parser: () => 4 },
  { regex: /(?:خمس|5)\s*(?:غرف|اوض|نوم)/i, parser: () => 5 },
  { regex: /(?:ست|6)\s*(?:غرف|اوض|نوم)/i, parser: () => 6 },
  { regex: /(\d+)\s*(?:غرف|غرفه|اوض|نوم|beds?|bedrooms?)/i, parser: (m) => parseInt(m[1], 10) }
];

/**
 * Parses raw search query into structured real estate search criteria
 */
export function parseSemanticQuery(rawQuery) {
  if (!rawQuery || typeof rawQuery !== 'string') {
    return { cleanText: '', filters: {}, tagsFound: [] };
  }

  const query = normalizeArabicText(rawQuery);
  const tagsFound = [];
  let detectedArea = null;
  let detectedType = null;
  let detectedBedrooms = null;
  let minPrice = null;
  let maxPrice = null;
  let detectedIntent = null;

  // 1. Detect Districts & Neighborhoods
  for (const item of NORMALIZED_AREA_MAP) {
    if (item.normalizedSynonyms.some(s => query.includes(s))) {
      detectedArea = item.key;
      tagsFound.push({ type: 'area', label_ar: item.originalName, key: item.key });
      break;
    }
  }

  // 2. Detect Property Types
  for (const item of NORMALIZED_TYPE_MAP) {
    if (item.normalizedSynonyms.some(s => query.includes(s))) {
      detectedType = item.key;
      tagsFound.push({ type: 'propertyType', label_ar: item.originalName, key: item.key });
      break;
    }
  }

  // 3. Detect Price Constraints
  for (const pattern of PRICE_PATTERNS) {
    if (pattern.isRange) {
      const match = query.match(pattern.regex);
      if (match) {
        minPrice = parseFloat(match[1]) * pattern.multiplier;
        maxPrice = parseFloat(match[2]) * pattern.multiplier;
        tagsFound.push({ 
          type: 'price', 
          label_ar: `من ${(minPrice/1000000).toFixed(1)} إلى ${(maxPrice/1000000).toFixed(1)} مليون` 
        });
        break;
      }
    } else {
      const match = query.match(pattern.regex);
      if (match) {
        const val = parseFloat(match[1]) * pattern.multiplier;
        if (pattern.type === 'max') {
          maxPrice = val;
          tagsFound.push({ type: 'price', label_ar: `أقصى سعر: ${(val/1000000).toFixed(1)} مليون` });
        } else if (pattern.type === 'min') {
          minPrice = val;
          tagsFound.push({ type: 'price', label_ar: `يبدأ من: ${(val/1000000).toFixed(1)} مليون` });
        } else {
          // Approx +/- 25% tolerance window
          minPrice = val * 0.75;
          maxPrice = val * 1.25;
          tagsFound.push({ type: 'price', label_ar: `في حدود ${(val/1000000).toFixed(1)} مليون` });
        }
        break;
      }
    }
  }

  // 4. Detect Bedrooms Count
  for (const pattern of BEDROOM_PATTERNS) {
    const match = query.match(pattern.regex);
    if (match) {
      detectedBedrooms = pattern.parser(match);
      tagsFound.push({ type: 'bedrooms', label_ar: `${detectedBedrooms} غرف نوم` });
      break;
    }
  }

  // 5. Detect Commercial & Investment Intent
  if (/(?:استثمار|عائد|مضمون|تجاري|ايجار|roi|دخل)/i.test(query)) {
    detectedIntent = 'investment';
    tagsFound.push({ type: 'intent', label_ar: 'عائد استثماري' });
  } else if (/(?:كاش|فوري|تخليص|جاهز|سريع|فلوس جاهزه)/i.test(query)) {
    detectedIntent = 'cash_deal';
    tagsFound.push({ type: 'intent', label_ar: 'صفقة كاش فورية' });
  } else if (/(?:تقسيط|تسهيلات|اقساط|مقدم|مقدم بسيط|قسط مريح)/i.test(query)) {
    detectedIntent = 'installments';
    tagsFound.push({ type: 'intent', label_ar: 'تسهيلات وتقسيط' });
  } else if (/(?:لقطه|فرصه|رخيص|حنين|اقتصادي|مهاجر|مستعجل|سعر زمان)/i.test(query)) {
    detectedIntent = 'budget';
    if (!maxPrice) maxPrice = 3000000;
    tagsFound.push({ type: 'intent', label_ar: 'عقار لقطة وفرصة' });
  }

  return {
    rawQuery,
    cleanQuery: query,
    filters: {
      area: detectedArea,
      type: detectedType,
      minPrice,
      maxPrice,
      bedrooms: detectedBedrooms,
      intent: detectedIntent
    },
    tagsFound
  };
}

/**
 * Executes Semantic Natural Language Search across property listings
 */
export function searchPropertiesSemantic(properties = [], queryText = '', options = {}) {
  if (!Array.isArray(properties) || properties.length === 0) return [];
  if (!queryText || queryText.trim() === '') return properties;

  const parsed = parseSemanticQuery(queryText);
  const { area, type, minPrice, maxPrice, bedrooms, intent } = parsed.filters;
  const terms = parsed.cleanQuery
    .replace(/[0-9]+/g, '')
    .split(/\s+/)
    .filter(w => w.length > 2 && !['شقة', 'فيلا', 'في', 'من', 'إلى', 'أو', 'مع', 'عقار', 'للبيع', 'أقل', 'تحت'].includes(w));

  // Score each property based on semantic alignment
  const scoredList = properties.map((prop) => {
    let score = 0;
    const matchReasons = [];

    // Area alignment (weight: 35)
    if (area) {
      if (prop.areaKey === area) {
        score += 35;
        matchReasons.push('المنطقة مطابقة');
      }
    }

    // Property Type alignment (weight: 30)
    if (type) {
      if (prop.type === type) {
        score += 30;
        matchReasons.push('نوع العقار مطابق');
      }
    }

    // Price range constraint (weight: 25)
    const price = Number(prop.price) || 0;
    if (maxPrice && minPrice) {
      if (price >= minPrice && price <= maxPrice) {
        score += 25;
        matchReasons.push('الميزانية في النطاق المطلوب');
      }
    } else if (maxPrice) {
      if (price <= maxPrice) {
        score += 25;
        matchReasons.push('السعر أقل من الحد الأقصى');
      } else if (price <= maxPrice * 1.1) {
        score += 10; // Close to budget
      }
    } else if (minPrice) {
      if (price >= minPrice) {
        score += 20;
      }
    }

    // Bedrooms constraint (weight: 15)
    if (bedrooms && prop.bedrooms) {
      if (prop.bedrooms === bedrooms) {
        score += 15;
        matchReasons.push('عدد الغرف مطابق');
      } else if (Math.abs(prop.bedrooms - bedrooms) === 1) {
        score += 6;
      }
    }

    // Keyword Text search in titles & descriptions (weight: 5-15)
    const haystack = [
      prop.title_ar,
      prop.title_en,
      prop.locationName_ar,
      prop.locationName_en,
      prop.description_ar,
      prop.description_en,
      ...(prop.features_ar || []),
      ...(prop.features_en || [])
    ].join(' ').toLowerCase();

    terms.forEach(term => {
      if (haystack.includes(term)) {
        score += 8;
      }
    });

    // Intent Bonus
    if (intent === 'investment' && (prop.roi || (prop.badge_ar && prop.badge_ar.includes('استثمار')))) {
      score += 15;
      matchReasons.push('عقار ذو عائد استثماري');
    }
    if (intent === 'budget' && price <= 3000000) {
      score += 12;
      matchReasons.push('سعر مناسب ومميز');
    }

    return {
      ...prop,
      _semanticScore: score,
      _matchReasons: matchReasons
    };
  });

  // Filter out completely unrelated items and sort by highest score
  const results = scoredList
    .filter(item => item._semanticScore > 0)
    .sort((a, b) => b._semanticScore - a._semanticScore);

  // If semantic parsing didn't find any tags, fallback to basic text includes
  if (results.length === 0) {
    const fallbackQ = queryText.toLowerCase().trim();
    return properties.filter(p => {
      const t = (p.title_ar || '') + (p.title_en || '') + (p.locationName_ar || '');
      return t.toLowerCase().includes(fallbackQ);
    });
  }

  return results;
}

/**
 * Pre-compiled High Conversion Semantic Suggestion Chips
 */
export const SEMANTIC_SEARCH_PRESETS = [
  {
    id: 'preset_new_sohag_apt',
    query_ar: 'شقق للبيع سوهاج الجديدة أقل من 3 مليون',
    query_en: 'Apartments in New Sohag under 3M EGP',
    icon: '',
    tag_ar: 'شقق سوهاج الجديدة'
  },
  {
    id: 'preset_commercial_pharmacy',
    query_ar: 'محل تجاري يصلح صيدلية أو فرنشايز شرق سوهاج',
    query_en: 'Commercial retail shop in East Sohag',
    icon: '',
    tag_ar: 'محلات تجارية ومقرات'
  },
  {
    id: 'preset_corniche_luxury',
    query_ar: 'شقة فاخرة على كورنيش النيل 3 غرف',
    query_en: 'Luxury 3-bedroom apartment on Nile Corniche',
    icon: '',
    tag_ar: 'شقق كورنيش النيل'
  },
  {
    id: 'preset_villas_cash',
    query_ar: 'فيلا مستقلة استثمارية كاش بسوهاج الجديدة',
    query_en: 'Standalone villa cash deal in New Sohag',
    icon: '',
    tag_ar: 'فيلات مستقلة'
  },
  {
    id: 'preset_city_street15',
    query_ar: 'محل تجاري تمليك بسيتي أو شارع 15',
    query_en: 'Commercial retail shop in City Street or Street 15',
    icon: '',
    tag_ar: 'محلات سيتي وشارع 15'
  },
  {
    id: 'preset_raw_brick_deals',
    query_ar: 'شقة لقطة ع الطوب بتسهيلات في السداد',
    query_en: 'Unfinished apartment with installment facilities',
    icon: '',
    tag_ar: 'شقق ع الطوب بتسهيلات'
  }
];
