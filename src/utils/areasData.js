import { saveSettings, loadSettings, subscribeToSettings } from '../firebaseService.js';

export const DEFAULT_SOHAG_AREAS = [
  {
    id: 'all',
    name_ar: 'كل المناطق',
    name_en: 'All Locations',
    label_ar: 'أي منطقة في سوهاج (أفضل فرصة متاحة)',
    label_en: 'Any District in Sohag',
    center: { lat: 26.5569, lng: 31.7001 },
    zoom: 12,
    isSystem: true,
    description_ar: 'البحث في جميع أنحاء ومراكز محافظة سوهاج',
    avgPricePerMeter: 16500,
    annualGrowthRate: 75,
    historicalPrices: [
      { year: '2023 Q1', price: 9500 },
      { year: '2023 Q3', price: 11000 },
      { year: '2024 Q1', price: 12800 },
      { year: '2024 Q3', price: 14200 },
      { year: '2025 Q1', price: 15400 },
      { year: '2025 Q3', price: 16200 },
      { year: '2026 (الآن)', price: 16500 }
    ],
    amenities: [
      { id: 1, category: 'transport', name_ar: 'محطة قطار سوهاج الرئيسية', name_en: 'Sohag Main Railway Station', distance: '1.2 كم', timeWalk: '14 دقيقة', timeDrive: '3 دقائق' },
      { id: 2, category: 'health', name_ar: 'مستشفى سوهاج العام والجامعي', name_en: 'Sohag General & University Hospital', distance: '1.5 كم', timeWalk: '17 دقيقة', timeDrive: '4 دقائق' },
      { id: 3, category: 'education', name_ar: 'جامعة سوهاج والمجمعات التعليمية', name_en: 'Sohag University & Schools', distance: '2.0 كم', timeWalk: '24 دقيقة', timeDrive: '5 دقائق' },
      { id: 4, category: 'shopping', name_ar: 'المناطق والأسواق التجارية المركزية', name_en: 'Central Shopping & Commercial Districts', distance: '800 متر', timeWalk: '9 دقائق', timeDrive: '2 دقيقة' },
      { id: 5, category: 'lifestyle', name_ar: 'كورنيش النيل والحدائق العامة', name_en: 'Nile Corniche & Public Parks', distance: '1.0 كم', timeWalk: '12 دقيقة', timeDrive: '3 دقائق' }
    ]
  },
  {
    id: 'east',
    name_ar: 'شرق سوهاج',
    name_en: 'East Sohag',
    label_ar: 'شرق سوهاج (الجمهورية وسيتي وميدان الثقافة)',
    label_en: 'East Sohag (El Gomhoureya & City)',
    center: { lat: 26.5569, lng: 31.7001 },
    zoom: 14,
    description_ar: 'أرقى المناطق التجارية والسكنية وكورنيش النيل الشرقي',
    avgPricePerMeter: 21000,
    annualGrowthRate: 87,
    historicalPrices: [
      { year: '2023 Q1', price: 11500 },
      { year: '2023 Q3', price: 13200 },
      { year: '2024 Q1', price: 15400 },
      { year: '2024 Q3', price: 17100 },
      { year: '2025 Q1', price: 18800 },
      { year: '2025 Q3', price: 19800 },
      { year: '2026 (الآن)', price: 21500 }
    ],
    amenities: [
      { id: 1, category: 'lifestyle', name_ar: 'ممشى كورنيش النيل الشرقي وحديقة الفردوس', name_en: 'East Nile Corniche Promenade & Ferdous Park', distance: '400 متر', timeWalk: '5 دقائق', timeDrive: '1 دقيقة' },
      { id: 2, category: 'education', name_ar: 'مجمع مدارس شرق سوهاج للغات والتجريبية', name_en: 'East Sohag Language Schools Complex', distance: '750 متر', timeWalk: '9 دقائق', timeDrive: '2 دقيقة' },
      { id: 3, category: 'health', name_ar: 'مستشفى الهلال والمراكز التخصصية بشارع الجمهورية', name_en: 'El-Helal Hospital & Specialized Clinics', distance: '900 متر', timeWalk: '10 دقائق', timeDrive: '3 دقائق' },
      { id: 4, category: 'transport', name_ar: 'محطة قطار سوهاج وميدان الثقافة', name_en: 'Sohag Main Railway & Thakafa Square', distance: '1.5 كم', timeWalk: '18 دقيقة', timeDrive: '4 دقائق' },
      { id: 5, category: 'shopping', name_ar: 'منطقة التسوق والمطاعم بشارع الجمهورية و15', name_en: 'Gomhoreya & 15th St Shopping District', distance: '600 متر', timeWalk: '7 دقائق', timeDrive: '2 دقيقة' }
    ]
  },
  {
    id: 'corniche',
    name_ar: 'كورنيش النيل',
    name_en: 'Nile Corniche',
    label_ar: 'كورنيش النيل (الشرقي والغربي والواجهات النهرية)',
    label_en: 'Nile Corniche (Waterfronts)',
    center: { lat: 26.5620, lng: 31.7050 },
    zoom: 15,
    description_ar: 'أعلى قيمة عقارية معمارية وإطلالات بانورامية مفتوحة على النيل مباشرة',
    avgPricePerMeter: 26000,
    annualGrowthRate: 88,
    historicalPrices: [
      { year: '2023 Q1', price: 16500 },
      { year: '2023 Q3', price: 19000 },
      { year: '2024 Q1', price: 22000 },
      { year: '2024 Q3', price: 24500 },
      { year: '2025 Q1', price: 26800 },
      { year: '2025 Q3', price: 28500 },
      { year: '2026 (الآن)', price: 31000 }
    ],
    amenities: [
      { id: 1, category: 'lifestyle', name_ar: 'ممشى أهل مصر ونوادي النيل والصفوة', name_en: 'Ahl Masr Nile Walk & Clubs', distance: '50 متر', timeWalk: '1 دقيقة', timeDrive: '1 دقيقة' },
      { id: 2, category: 'shopping', name_ar: 'سلسلة مطاعم وكافيهات الكورنيش العالمية', name_en: 'Corniche Premium Waterfront Dining & Cafes', distance: '200 متر', timeWalk: '3 دقائق', timeDrive: '1 دقيقة' },
      { id: 3, category: 'health', name_ar: 'مستشفى سوهاج التعليمي والمركز التخصصي للقلب', name_en: 'Teaching Hospital & Heart Specialized Center', distance: '850 متر', timeWalk: '10 دقائق', timeDrive: '2 دقيقة' },
      { id: 4, category: 'education', name_ar: 'مدرسة الدعوة الإسلامية والمدارس القومية', name_en: 'Islamic Daawa & National Schools', distance: '900 متر', timeWalk: '11 دقيقة', timeDrive: '3 دقائق' },
      { id: 5, category: 'transport', name_ar: 'كوبري أخميم المعلق ومحاور الربط السريع', name_en: 'Akhmeem Cable Bridge & Nile Axis', distance: '600 متر', timeWalk: '8 دقائق', timeDrive: '2 دقيقة' }
    ]
  },
  {
    id: 'new_sohag',
    name_ar: 'سوهاج الجديدة',
    name_en: 'New Sohag',
    label_ar: 'سوهاج الجديدة (الحي الأول، الثاني، المحور المركزي)',
    label_en: 'New Sohag (Districts 1, 2 & Central Axis)',
    center: { lat: 26.4715, lng: 31.6620 },
    zoom: 13,
    description_ar: 'المدينة الذكية المستقبلية وأعلى عائد استثماري ونمو سكني',
    avgPricePerMeter: 12000,
    annualGrowthRate: 109,
    historicalPrices: [
      { year: '2023 Q1', price: 8500 },
      { year: '2023 Q3', price: 9800 },
      { year: '2024 Q1', price: 11800 },
      { year: '2024 Q3', price: 13500 },
      { year: '2025 Q1', price: 14900 },
      { year: '2025 Q3', price: 16200 },
      { year: '2026 (الآن)', price: 17800 }
    ],
    amenities: [
      { id: 1, category: 'education', name_ar: 'جامعة سوهاج (المقر الجديد - مجمع الكليات)', name_en: 'Sohag University (New Campus)', distance: '1.2 كم', timeWalk: '15 دقيقة', timeDrive: '3 دقائق' },
      { id: 2, category: 'health', name_ar: 'مستشفى سوهاج الجامعي الجديد سعة 300 سرير', name_en: 'New Sohag University Hospital', distance: '1.8 كم', timeWalk: '20 دقيقة', timeDrive: '4 دقائق' },
      { id: 3, category: 'shopping', name_ar: 'مول سيتي سنتر سوهاج الجديدة ومنطقة البنوك', name_en: 'City Center Mall New Sohag', distance: '800 متر', timeWalk: '9 دقائق', timeDrive: '2 دقيقة' },
      { id: 4, category: 'transport', name_ar: 'موقف النقل الداخلي لمدينة سوهاج وطريق المطار', name_en: 'New Sohag Transit Station & Airport Road', distance: '950 متر', timeWalk: '11 دقيقة', timeDrive: '3 دقائق' },
      { id: 5, category: 'lifestyle', name_ar: 'نادي ونادي الطفل وجهاز مدينة سوهاج الجديدة', name_en: 'New Sohag Sports Club & Authority', distance: '600 متر', timeWalk: '7 دقائق', timeDrive: '2 دقيقة' }
    ]
  },
  {
    id: 'west',
    name_ar: 'غرب سوهاج',
    name_en: 'West Sohag',
    label_ar: 'غرب سوهاج (الشهيد والمحطة والشبان المسلمين)',
    label_en: 'West Sohag (El Shaheed & Station)',
    center: { lat: 26.5500, lng: 31.6850 },
    zoom: 14,
    description_ar: 'كثافة سكانية وحيوية تجارية عالية وقرب من محطة القطار',
    avgPricePerMeter: 13500,
    annualGrowthRate: 70,
    historicalPrices: [
      { year: '2023 Q1', price: 8000 },
      { year: '2023 Q3', price: 9100 },
      { year: '2024 Q1', price: 10400 },
      { year: '2024 Q3', price: 11500 },
      { year: '2025 Q1', price: 12200 },
      { year: '2025 Q3', price: 12900 },
      { year: '2026 (الآن)', price: 13600 }
    ],
    amenities: [
      { id: 1, category: 'transport', name_ar: 'ميدان الشهيد ومحطة قطارات سوهاج', name_en: 'Shaheed Square & Railway Station', distance: '300 متر', timeWalk: '4 دقائق', timeDrive: '1 دقيقة' },
      { id: 2, category: 'shopping', name_ar: 'سوق غرب سوهاج التجاري وشارع المحطة', name_en: 'West Sohag Market & Mahatta St', distance: '450 متر', timeWalk: '6 دقائق', timeDrive: '2 دقيقة' },
      { id: 3, category: 'health', name_ar: 'مستشفى الحميات ومجمع العيادات التخصصي', name_en: 'Fever Hospital & Specialized Clinics', distance: '800 متر', timeWalk: '10 دقائق', timeDrive: '3 دقائق' },
      { id: 4, category: 'education', name_ar: 'مدرسة الشهيد ومجمع مدارس غرب', name_en: 'Shaheed School & West Schools', distance: '500 متر', timeWalk: '6 دقائق', timeDrive: '2 دقيقة' },
      { id: 5, category: 'lifestyle', name_ar: 'نادي الشبان المسلمين والساحة الشعبية', name_en: 'Muslim Youth Club & Community Arena', distance: '700 متر', timeWalk: '8 دقائق', timeDrive: '2 دقيقة' }
    ]
  },
  {
    id: 'center',
    name_ar: 'وسط البلد',
    name_en: 'City Center',
    label_ar: 'وسط البلد (ميدان العارف والشارع الجديد والجامعة)',
    label_en: 'City Center (Al Aref & University)',
    center: { lat: 26.5620, lng: 31.6910 },
    zoom: 14,
    description_ar: 'قلب سوهاج النابض بالأنشطة التجارية والخدمات الطبية',
    avgPricePerMeter: 17500,
    annualGrowthRate: 72,
    historicalPrices: [
      { year: '2023 Q1', price: 10200 },
      { year: '2023 Q3', price: 11800 },
      { year: '2024 Q1', price: 13400 },
      { year: '2024 Q3', price: 14800 },
      { year: '2025 Q1', price: 15900 },
      { year: '2025 Q3', price: 16700 },
      { year: '2026 (الآن)', price: 17500 }
    ],
    amenities: [
      { id: 1, category: 'lifestyle', name_ar: 'ميدان ومسجد العارف بالله الشهير', name_en: 'Al Aref Mosque & Historic Plaza', distance: '250 متر', timeWalk: '3 دقائق', timeDrive: '1 دقيقة' },
      { id: 2, category: 'shopping', name_ar: 'الشارع الجديد ومنطقة الصاغة والمراكز التجارية', name_en: 'New Street & Gold Market District', distance: '350 متر', timeWalk: '4 دقائق', timeDrive: '1 دقيقة' },
      { id: 3, category: 'health', name_ar: 'مستشفى سوهاج العام ومراكز الأشعة والتحاليل', name_en: 'Sohag General Hospital & Labs', distance: '600 متر', timeWalk: '7 دقائق', timeDrive: '2 دقيقة' },
      { id: 4, category: 'education', name_ar: 'جامعة سوهاج (المقر القديم بمدينة ناصر)', name_en: 'Sohag University (Old Campus)', distance: '1.1 كم', timeWalk: '13 دقيقة', timeDrive: '3 دقائق' },
      { id: 5, category: 'transport', name_ar: 'موقف السيرفيس الرئيسي الداخلي لوسط المدينة', name_en: 'Downtown Microbus Terminal', distance: '400 متر', timeWalk: '5 دقائق', timeDrive: '1 دقيقة' }
    ]
  },
  {
    id: 'thakafa',
    name_ar: 'منطقة الثقافة',
    name_en: 'El Thakafa',
    label_ar: 'منطقة الثقافة (ميدان الثقافة والمخبز الآلي)',
    label_en: 'El Thakafa & Bakery Zone',
    center: { lat: 26.5540, lng: 31.6920 },
    zoom: 15,
    description_ar: 'أعرق الأحياء السكنية العائلية وأقربها لكافة المراكز الثقافية والخدمية',
    avgPricePerMeter: 15500,
    annualGrowthRate: 74,
    historicalPrices: [
      { year: '2023 Q1', price: 9000 },
      { year: '2023 Q3', price: 10400 },
      { year: '2024 Q1', price: 11900 },
      { year: '2024 Q3', price: 13200 },
      { year: '2025 Q1', price: 14400 },
      { year: '2025 Q3', price: 15000 },
      { year: '2026 (الآن)', price: 15500 }
    ],
    amenities: [
      { id: 1, category: 'lifestyle', name_ar: 'قصر ثقافة سوهاج والمسرح الصيفي', name_en: 'Sohag Palace of Culture & Gardens', distance: '150 متر', timeWalk: '2 دقيقة', timeDrive: '1 دقيقة' },
      { id: 2, category: 'education', name_ar: 'مجمع مدارس الثقافة ومدرسة اللغات الرسمية', name_en: 'Thakafa Schools & Official Language School', distance: '400 متر', timeWalk: '5 دقائق', timeDrive: '1 دقيقة' },
      { id: 3, category: 'shopping', name_ar: 'منطقة المخبز الآلي والأسواق الاستهلاكية الكبرى', name_en: 'Automated Bakery Commercial Hub', distance: '300 متر', timeWalk: '4 دقائق', timeDrive: '1 دقيقة' },
      { id: 4, category: 'health', name_ar: 'مجمع العيادات التخصصية ومستشفى الطلبة', name_en: 'Specialized Clinics Complex', distance: '550 متر', timeWalk: '7 دقائق', timeDrive: '2 دقيقة' },
      { id: 5, category: 'transport', name_ar: 'ميدان الثقافة ومحاور الربط بين الشرق والغرب', name_en: 'Thakafa Square & Central Transit', distance: '250 متر', timeWalk: '3 دقائق', timeDrive: '1 دقيقة' }
    ]
  },
  {
    id: 'kawthar',
    name_ar: 'حي الكوثر',
    name_en: 'Al Kawthar',
    label_ar: 'حي الكوثر (المنطقة الصناعية والإسكان المتميز)',
    label_en: 'Al Kawthar District',
    center: { lat: 26.5920, lng: 31.7850 },
    zoom: 13,
    description_ar: 'الموقع الاستراتيجي الصناعي والسكني الواعد شرق النيل',
    avgPricePerMeter: 9000,
    annualGrowthRate: 95,
    historicalPrices: [
      { year: '2023 Q1', price: 4600 },
      { year: '2023 Q3', price: 5400 },
      { year: '2024 Q1', price: 6500 },
      { year: '2024 Q3', price: 7400 },
      { year: '2025 Q1', price: 8100 },
      { year: '2025 Q3', price: 8600 },
      { year: '2026 (الآن)', price: 9000 }
    ],
    amenities: [
      { id: 1, category: 'shopping', name_ar: 'المنطقة الصناعية والاستثمارية بحي الكوثر', name_en: 'Al Kawthar Industrial & Logistics Zone', distance: '900 متر', timeWalk: '11 دقيقة', timeDrive: '2 دقيقة' },
      { id: 2, category: 'education', name_ar: 'معهد التمريض الفني والمجمع التكنولوجي بالكوثر', name_en: 'Technical Nursing Institute & Tech Complex', distance: '700 متر', timeWalk: '8 دقائق', timeDrive: '2 دقيقة' },
      { id: 3, category: 'health', name_ar: 'مستشفى الكوثر التخصصي ووحدة طب الأسرة', name_en: 'Al Kawthar Specialized Hospital', distance: '600 متر', timeWalk: '7 دقائق', timeDrive: '2 دقيقة' },
      { id: 4, category: 'transport', name_ar: 'طريق سوهاج - البحر الأحمر وموقف الكوثر الرئيسي', name_en: 'Red Sea Highway & Kawthar Station', distance: '850 متر', timeWalk: '10 دقائق', timeDrive: '2 دقيقة' },
      { id: 5, category: 'lifestyle', name_ar: 'نادي ونزل شباب حي الكوثر الرياضي', name_en: 'Al Kawthar Youth Hostel & Sports Club', distance: '500 متر', timeWalk: '6 دقائق', timeDrive: '1 دقيقة' }
    ]
  },
  {
    id: 'akhmeem',
    name_ar: 'أخميم',
    name_en: 'Akhmeem',
    label_ar: 'أخميم (شارع بورسعيد وميدان الست دميانة والسنترال)',
    label_en: 'Akhmeem City',
    center: { lat: 26.5650, lng: 31.7450 },
    zoom: 14,
    description_ar: 'مدينة التاريخ والنسيج وعقارات سكنية وتجارية مميزة',
    avgPricePerMeter: 9500,
    annualGrowthRate: 65,
    historicalPrices: [
      { year: '2023 Q1', price: 5800 },
      { year: '2023 Q3', price: 6600 },
      { year: '2024 Q1', price: 7500 },
      { year: '2024 Q3', price: 8300 },
      { year: '2025 Q1', price: 8900 },
      { year: '2025 Q3', price: 9200 },
      { year: '2026 (الآن)', price: 9500 }
    ],
    amenities: [
      { id: 1, category: 'lifestyle', name_ar: 'متحف تمثال ميريت آمون المفتوح ومعالم أخميم', name_en: 'Meritamen Statue Open Museum', distance: '400 متر', timeWalk: '5 دقائق', timeDrive: '1 دقيقة' },
      { id: 2, category: 'shopping', name_ar: 'شارع بورسعيد التجاري وأسواق النسيج التراثي', name_en: 'Port Said Commercial St & Textile Markets', distance: '300 متر', timeWalk: '4 دقائق', timeDrive: '1 دقيقة' },
      { id: 3, category: 'health', name_ar: 'مستشفى أخميم المركزي والعيادات الشاملة', name_en: 'Akhmeem Central Hospital', distance: '650 متر', timeWalk: '8 دقائق', timeDrive: '2 دقيقة' },
      { id: 4, category: 'education', name_ar: 'مجمع مدارس الست دميانة وأخميم الإعدادية والثانوية', name_en: 'Demiana Schools Complex', distance: '500 متر', timeWalk: '6 دقائق', timeDrive: '2 دقيقة' },
      { id: 5, category: 'transport', name_ar: 'موقف سيارات أخميم - سوهاج السريع', name_en: 'Akhmeem - Sohag Fast Transit Line', distance: '600 متر', timeWalk: '7 دقائق', timeDrive: '2 دقيقة' }
    ]
  },
  {
    id: 'tahta',
    name_ar: 'طهطا',
    name_en: 'Tahta',
    label_ar: 'طهطا (شارع المحطة ووسط المدينة والتجاري)',
    label_en: 'Tahta City',
    center: { lat: 26.7690, lng: 31.5020 },
    zoom: 13,
    description_ar: 'عاصمة التجارة والأثاث في شمال سوهاج',
    avgPricePerMeter: 11000,
    annualGrowthRate: 68,
    historicalPrices: [
      { year: '2023 Q1', price: 6500 },
      { year: '2023 Q3', price: 7400 },
      { year: '2024 Q1', price: 8600 },
      { year: '2024 Q3', price: 9500 },
      { year: '2025 Q1', price: 10200 },
      { year: '2025 Q3', price: 10600 },
      { year: '2026 (الآن)', price: 11000 }
    ],
    amenities: [
      { id: 1, category: 'transport', name_ar: 'محطة قطار طهطا الرئيسية وميدان المحطة', name_en: 'Tahta Main Railway Station & Plaza', distance: '350 متر', timeWalk: '4 دقائق', timeDrive: '1 دقيقة' },
      { id: 2, category: 'shopping', name_ar: 'شارع بورسعيد وتجارة الأثاث والمولات التجارية', name_en: 'Port Said St Furniture & Commercial Hubs', distance: '500 متر', timeWalk: '6 دقائق', timeDrive: '2 دقيقة' },
      { id: 3, category: 'health', name_ar: 'مستشفى طهطا العام الجديد والمراكز الطبية', name_en: 'New Tahta General Hospital', distance: '900 متر', timeWalk: '11 دقيقة', timeDrive: '3 دقائق' },
      { id: 4, category: 'education', name_ar: 'مدرسة طهطا الثانوية ومجمع المعاهد الأزهرية', name_en: 'Tahta Secondary & Azhar Complex', distance: '600 متر', timeWalk: '7 دقائق', timeDrive: '2 دقيقة' },
      { id: 5, category: 'lifestyle', name_ar: 'نادي طهطا الرياضي وكورنيش ترعة نجع حمادي', name_en: 'Tahta Sports Club & Corniche', distance: '750 متر', timeWalk: '9 دقائق', timeDrive: '2 دقيقة' }
    ]
  },
  {
    id: 'girga',
    name_ar: 'جرجا',
    name_en: 'Girga',
    label_ar: 'جرجا (الكورنيش والميدان الرئيسي وشارع البحر)',
    label_en: 'Girga City',
    center: { lat: 26.3360, lng: 31.8920 },
    zoom: 13,
    description_ar: 'المركز التجاري والحيوي الأكبر في جنوب سوهاج',
    avgPricePerMeter: 10500,
    annualGrowthRate: 60,
    historicalPrices: [
      { year: '2023 Q1', price: 6500 },
      { year: '2023 Q3', price: 7300 },
      { year: '2024 Q1', price: 8200 },
      { year: '2024 Q3', price: 9100 },
      { year: '2025 Q1', price: 9800 },
      { year: '2025 Q3', price: 10200 },
      { year: '2026 (الآن)', price: 10500 }
    ],
    amenities: [
      { id: 1, category: 'transport', name_ar: 'محطة قطار جرجا وموقف الخطوط السريعة', name_en: 'Girga Railway Station & Intercity Terminal', distance: '400 متر', timeWalk: '5 دقائق', timeDrive: '1 دقيقة' },
      { id: 2, category: 'shopping', name_ar: 'شارع البحر والميدان التجاري الكبير', name_en: 'Bahr St & Central Commercial Plaza', distance: '450 متر', timeWalk: '6 دقائق', timeDrive: '2 دقيقة' },
      { id: 3, category: 'health', name_ar: 'مستشفى جرجا العام والمجمع الطبي', name_en: 'Girga General Hospital', distance: '800 متر', timeWalk: '10 دقائق', timeDrive: '2 دقيقة' },
      { id: 4, category: 'lifestyle', name_ar: 'ممشى كورنيش النيل بجرجا والنوادي النهرية', name_en: 'Girga Nile Corniche & Waterfront Clubs', distance: '300 متر', timeWalk: '4 دقائق', timeDrive: '1 دقيقة' },
      { id: 5, category: 'education', name_ar: 'مجمع مدارس جرجا ولغات ومعهد الفتيات', name_en: 'Girga Schools Complex & Institutes', distance: '650 متر', timeWalk: '8 دقائق', timeDrive: '2 دقيقة' }
    ]
  }
];

const LOCAL_STORAGE_KEY = 'oneline_custom_areas';
const SETTING_DOC_KEY = 'areas_cms';

/**
 * Get all active areas from LocalStorage with smart-merge of enriched defaults
 */
export function getAreas() {
  if (typeof window === 'undefined') return DEFAULT_SOHAG_AREAS;
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Smart merge so existing stored areas inherit new benchmark/amenities if not previously stored
        const mergedDefaults = DEFAULT_SOHAG_AREAS.map(def => {
          const userModified = parsed.find(p => p.id === def.id);
          if (!userModified) return def;
          return {
            ...def,
            ...userModified,
            // Keep rich amenities and historical prices if user hasn't explicitly set them
            amenities: userModified.amenities || def.amenities,
            historicalPrices: userModified.historicalPrices || def.historicalPrices,
            avgPricePerMeter: userModified.avgPricePerMeter || def.avgPricePerMeter,
            annualGrowthRate: userModified.annualGrowthRate || def.annualGrowthRate
          };
        });

        // Add any purely custom areas created by admin
        const customOnly = parsed.filter(p => !DEFAULT_SOHAG_AREAS.some(def => def.id === p.id));
        return [...mergedDefaults, ...customOnly];
      }
    }
  } catch (err) {
    console.error('Error reading custom areas:', err);
  }
  return DEFAULT_SOHAG_AREAS;
}

/**
 * Get specific area by ID or fallback
 */
export function getAreaById(areaId) {
  const all = getAreas();
  return all.find(a => a.id === areaId) || all.find(a => a.id === 'default') || DEFAULT_SOHAG_AREAS[1];
}

/**
 * Save custom areas locally and sync to Firestore
 */
export async function saveAreas(areasList) {
  if (!Array.isArray(areasList) || areasList.length === 0) return;
  
  // 1. Immediate Local Persistence
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(areasList));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('oneline_areas_updated', { detail: areasList }));
    }
  } catch (err) {
    console.error('Error saving areas to localStorage:', err);
  }

  // 2. Cloud Firestore Persistence
  try {
    await saveSettings(SETTING_DOC_KEY, {
      areas: areasList,
      updatedAt: new Date().toISOString()
    });
  } catch (err) {
    console.warn('Firestore cloud sync for areas deferred (offline/cached):', err);
  }
}

/**
 * Add a new area/district
 */
export async function addArea(areaData) {
  const currentAreas = getAreas();
  const rawId = (areaData.id || areaData.name_en || areaData.name_ar || `area_${Date.now()}`)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_]/g, '_');
  
  // Ensure unique ID
  let uniqueId = rawId;
  let counter = 1;
  while (currentAreas.some(a => a.id === uniqueId)) {
    uniqueId = `${rawId}_${counter++}`;
  }

  const newArea = {
    id: uniqueId,
    name_ar: areaData.name_ar?.trim() || 'حي جديد',
    name_en: areaData.name_en?.trim() || 'New District',
    label_ar: areaData.label_ar?.trim() || areaData.name_ar?.trim() || 'حي جديد',
    label_en: areaData.label_en?.trim() || areaData.name_en?.trim() || 'New District',
    center: areaData.center || { lat: 26.5569, lng: 31.7001 },
    zoom: areaData.zoom || 14,
    description_ar: areaData.description_ar?.trim() || '',
    avgPricePerMeter: Number(areaData.avgPricePerMeter) || 15000,
    annualGrowthRate: Number(areaData.annualGrowthRate) || 75,
    historicalPrices: areaData.historicalPrices || DEFAULT_SOHAG_AREAS[0].historicalPrices,
    amenities: areaData.amenities || DEFAULT_SOHAG_AREAS[0].amenities,
    isSystem: false,
    createdAt: new Date().toISOString()
  };

  const updated = [...currentAreas, newArea];
  await saveAreas(updated);
  return newArea;
}

/**
 * Update an existing area
 */
export async function updateArea(id, patch) {
  const currentAreas = getAreas();
  const updated = currentAreas.map(a => {
    if (a.id === id) {
      return {
        ...a,
        ...patch,
        label_ar: patch.label_ar || patch.name_ar || a.label_ar || a.name_ar,
        label_en: patch.label_en || patch.name_en || a.label_en || a.name_en,
        avgPricePerMeter: patch.avgPricePerMeter !== undefined ? Number(patch.avgPricePerMeter) : a.avgPricePerMeter,
        annualGrowthRate: patch.annualGrowthRate !== undefined ? Number(patch.annualGrowthRate) : a.annualGrowthRate,
        updatedAt: new Date().toISOString()
      };
    }
    return a;
  });

  await saveAreas(updated);
  return updated;
}

/**
 * Delete an area (Safety protection: cannot delete 'all')
 */
export async function deleteArea(id) {
  if (id === 'all') return false;
  const currentAreas = getAreas();
  const updated = currentAreas.filter(a => a.id !== id);
  await saveAreas(updated);
  return true;
}

/**
 * Reset areas back to default list
 */
export async function resetAreasToDefault() {
  await saveAreas(DEFAULT_SOHAG_AREAS);
  return DEFAULT_SOHAG_AREAS;
}

/**
 * Initialize real-time cloud listener for areas
 */
export function initAreasSync() {
  if (typeof window === 'undefined') return () => {};

  return subscribeToSettings(SETTING_DOC_KEY, (cloudData) => {
    if (cloudData && Array.isArray(cloudData.areas) && cloudData.areas.length > 0) {
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cloudData.areas));
        window.dispatchEvent(new CustomEvent('oneline_areas_updated', { detail: cloudData.areas }));
      } catch (e) {
        console.error('Error applying cloud areas sync:', e);
      }
    }
  });
}
