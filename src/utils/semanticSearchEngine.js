/**
 * 🧠 ONELINE ENTERPRISE SEMANTIC REAL ESTATE SEARCH ENGINE 2026
 * Deep Natural Language Processor (NLP) tailored for Egyptian & Sohag Real Estate Dialect.
 * Extracts: Price Limits, Bed Counts, Districts, Property Types, and Commercial Intents.
 */

// Area Synonyms & Mappings in Sohag
const AREA_SYNONYMS = {
  east: [
    'شرق', 'شرق سوهاج', 'الشرق', 'شارع الجمهورية', 'الجمهورية', 'الفتح', 
    'أسيوط سوهاج', 'الثقافة', 'ميدان الثقافة', 'east', 'east sohag'
  ],
  new_sohag: [
    'سوهاج الجديدة', 'الجديدة', 'الجامعة', 'جامعة سوهاج', 'النخيل', 'الزهور', 
    'حي النخيل', 'ابني بيتك', 'مدينة سوهاج الجديدة', 'new sohag', 'new_sohag'
  ],
  corniche: [
    'كورنيش', 'الكورنيش', 'كورنيش النيل', 'النيل', 'شارع النيل', 'نيل سوهاج', 
    'على البحر', 'مطل على النيل', 'corniche', 'nile'
  ],
  center: [
    'وسط البلد', 'المحطة', 'المدينة', 'المحافظة', 'شارع 15', 'الشهيد', 
    'المخبز الآلي', 'سيتي', 'center', 'downtown'
  ],
  kawthar: [
    'الكوثر', 'حي الكوثر', 'كوثر', 'المنطقة الصناعية', 'المخيم', 'kawthar', 'al-kawthar'
  ],
  akhmeem: [
    'أخميم', 'اخميم', 'طريق أخميم', 'مدينة أخميم', 'akhmeem', 'akhmim'
  ]
};

// Property Types & Practical Commercial Intents
const TYPE_SYNONYMS = {
  apartment: [
    'شقة', 'شقق', 'شقه', 'شقق سكنية', 'دوبلكس', 'بنتهاوس', 'استوديو', 'سكن', 
    'عائلي', 'apartment', 'flat', 'duplex', 'penthouse'
  ],
  villa: [
    'فيلا', 'فيلات', 'فيلل', 'فيلا مستقلة', 'تاون هاوس', 'توين هاوس', 'قصر', 
    'روف', 'حديقة خاصة', 'حمامات سباحة', 'villa', 'mansion', 'townhouse'
  ],
  land: [
    'أرض', 'ارض', 'أراضي', 'اراضي', 'قطعة أرض', 'مباني', 'عمراني', 'صناعي', 
    'أرض بناء', 'تراخيص', 'land', 'plot'
  ],
  commercial: [
    'محل', 'محلات', 'تجاري', 'صيدلية', 'سوبرماركت', 'مطعم', 'كافيه', 
    'فرنشايز', 'معرض', 'واجهة تجارية', 'commercial', 'retail', 'shop'
  ],
  office: [
    'مكتب', 'مكاتب', 'إداري', 'اداري', 'عيادة', 'عيادات', 'مركز طبي', 
    'مقر شركة', 'حسابات', 'office', 'clinic', 'administrative'
  ],
  building: [
    'عمارة', 'عماره', 'برج', 'أبراج', 'مبنى كامل', 'عمارة سكنية', 'building'
  ]
};

// Natural language price multipliers
const PRICE_PATTERNS = [
  // "أقل من 3 مليون", "تحت 2.5 مليون", "في حدود 4 مليون"
  { regex: /(?:أقل من|تحت|في حدود|حدود|بسعر|بأقل من|حتى|اقل من|under|below|less than|max)\s*(\d+(?:\.\d+)?)\s*(?:مليون|ملايين|م)/i, multiplier: 1000000, type: 'max' },
  // "من 2 مليون إلى 5 مليون"
  { regex: /(?:من|between)\s*(\d+(?:\.\d+)?)\s*(?:مليون|م)\s*(?:إلى|الي|وحتى|to|-)\s*(\d+(?:\.\d+)?)\s*(?:مليون|م)/i, isRange: true, multiplier: 1000000 },
  // "أكثر من 2 مليون", "فوق 3 مليون"
  { regex: /(?:أكثر من|فوق|من أول|اكثر من|above|min|more than)\s*(\d+(?:\.\d+)?)\s*(?:مليون|ملايين|م)/i, multiplier: 1000000, type: 'min' },
  // Direct numbers with "مليون"
  { regex: /(\d+(?:\.\d+)?)\s*(?:مليون|ملايين)/i, multiplier: 1000000, type: 'approx' },
  // "500 ألف", "750 الف"
  { regex: /(\d+)\s*(?:ألف|الف|k)/i, multiplier: 1000, type: 'approx' },
  // Plain numbers over 100,000 (e.g. 2500000)
  { regex: /\b([1-9]\d{5,8})\b/, multiplier: 1, type: 'approx' }
];

// Bedrooms parser
const BEDROOM_PATTERNS = [
  { regex: /(\d+)\s*(?:غرف|غرفة|اوض|أوض|نوم|غرفه|beds?|bedrooms?)/i, parser: (m) => parseInt(m[1], 10) },
  { regex: /\b(?:استوديو|studio)\b/i, parser: () => 1 },
  { regex: /\b(?:غرفتين|اوضتين|أوضتين)\b/i, parser: () => 2 },
  { regex: /\b(?:ثلاث|3)\s*غرف\b/i, parser: () => 3 },
  { regex: /\b(?:أربع|اربع|4)\s*غرف\b/i, parser: () => 4 },
  { regex: /\b(?:خمس|5)\s*غرف\b/i, parser: () => 5 }
];

/**
 * Parses raw search query into structured real estate search criteria
 */
export function parseSemanticQuery(rawQuery) {
  if (!rawQuery || typeof rawQuery !== 'string') {
    return { cleanText: '', filters: {}, tagsFound: [] };
  }

  const query = rawQuery.toLowerCase().trim();
  const tagsFound = [];
  let detectedArea = null;
  let detectedType = null;
  let detectedBedrooms = null;
  let minPrice = null;
  let maxPrice = null;
  let detectedIntent = null;

  // 1. Detect Districts & Neighborhoods
  for (const [areaKey, synonyms] of Object.entries(AREA_SYNONYMS)) {
    if (synonyms.some(s => query.includes(s))) {
      detectedArea = areaKey;
      tagsFound.push({ type: 'area', label_ar: synonyms[0], key: areaKey });
      break;
    }
  }

  // 2. Detect Property Types
  for (const [typeKey, synonyms] of Object.entries(TYPE_SYNONYMS)) {
    if (synonyms.some(s => query.includes(s))) {
      detectedType = typeKey;
      tagsFound.push({ type: 'propertyType', label_ar: synonyms[0], key: typeKey });
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
  if (/\b(?:استثمار|عائد|مضمون|تجاري|ايجار|إيجار|roi)\b/i.test(query)) {
    detectedIntent = 'investment';
    tagsFound.push({ type: 'intent', label_ar: 'عائد استثماري' });
  } else if (/\b(?:كاش|فوري|لقطة|جاهز|سريع)\b/i.test(query)) {
    detectedIntent = 'cash_deal';
    tagsFound.push({ type: 'intent', label_ar: 'صفقة كاش فورية' });
  } else if (/\b(?:تقسيط|تسهيلات|أقساط|مقدم)\b/i.test(query)) {
    detectedIntent = 'installments';
    tagsFound.push({ type: 'intent', label_ar: 'تسهيلات وتقسيط' });
  } else if (/\b(?:رخيص|حنين|اقتصادي|فرصة)\b/i.test(query)) {
    detectedIntent = 'budget';
    if (!maxPrice) maxPrice = 3000000;
    tagsFound.push({ type: 'intent', label_ar: 'سعر اقتصادي' });
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
  }
];
