import { saveSettings, subscribeToSettings } from '../firebaseLazy.js';

const BUILT_IN_AREAS = [
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
    city_ar: 'سوهاج',
    city_en: 'Sohag',
    sector_ar: 'شرق النيل',
    sector_en: 'East Nile',
    name_ar: 'شرق سوهاج',
    name_en: 'East Sohag',
    label_ar: 'شرق سوهاج (الكورنيش الشرقي وشارع العشرين)',
    label_en: 'East Sohag (East Corniche & 20th St)',
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
    city_ar: 'سوهاج',
    city_en: 'Sohag',
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
    city_ar: 'سوهاج',
    city_en: 'Sohag',
    sector_ar: 'سوهاج الجديدة',
    sector_en: 'New Sohag',
    name_ar: 'سوهاج الجديدة',
    name_en: 'New Sohag',
    label_ar: 'سوهاج الجديدة (الحي الأول، الثاني، المحور المركزي)',
    label_en: 'New Sohag (Districts 1, 2 & Central Axis)',
    center: { lat: 26.4715, lng: 31.6620 },
    zoom: 13,
    description_ar: 'المدينة الجديدة ومحور النمو السكني والتجاري',
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
    city_ar: 'سوهاج',
    city_en: 'Sohag',
    sector_ar: 'غرب النيل',
    sector_en: 'West Nile',
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
    city_ar: 'سوهاج',
    city_en: 'Sohag',
    sector_ar: 'غرب النيل',
    sector_en: 'West Nile',
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
    city_ar: 'سوهاج',
    city_en: 'Sohag',
    sector_ar: 'غرب النيل',
    sector_en: 'West Nile',
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
    city_ar: 'سوهاج',
    city_en: 'Sohag',
    sector_ar: 'شرق النيل',
    sector_en: 'East Nile',
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
    city_ar: 'سوهاج',
    city_en: 'Sohag',
    sector_ar: 'شرق النيل',
    sector_en: 'East Nile',
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
    city_ar: 'طهطا',
    city_en: 'Tahta',
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
    city_ar: 'جرجا',
    city_en: 'Girga',
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

// The built-in price series were illustrations, not recorded prices: they never reach a page,
// and a saved copy of one (areas saved before this change carry them) is dropped on load.
const SAMPLE_SERIES = new Set(BUILT_IN_AREAS.map((a) => JSON.stringify(a.historicalPrices || [])));
const realSeries = (series) => (Array.isArray(series) && !SAMPLE_SERIES.has(JSON.stringify(series)) ? series : []);
export const DEFAULT_SOHAG_AREAS = BUILT_IN_AREAS.map((a) => ({ ...a, historicalPrices: [] }));

const ALL_AREA = DEFAULT_SOHAG_AREAS[0];

/**
 * The saved list is the source of truth: an area the admin deleted (built-in or not) stays deleted.
 * Built-in areas that are still in the list keep their reference data (amenities, price history)
 * unless the admin saved their own. "كل المناطق" is always present and first.
 * Pure, so it can be unit-tested.
 */
export function mergeStoredAreas(stored, defaults = DEFAULT_SOHAG_AREAS) {
  if (!Array.isArray(stored) || stored.length === 0) return defaults;
  const byId = new Map(defaults.map((d) => [d.id, d]));
  const seen = new Set();
  const out = [];
  for (const item of stored) {
    if (!item || typeof item !== 'object' || !item.id || seen.has(item.id)) continue;
    seen.add(item.id);
    const def = byId.get(item.id);
    out.push(def
      ? {
          ...def,
          ...item,
          amenities: Array.isArray(item.amenities) ? item.amenities : def.amenities,
          historicalPrices: realSeries(item.historicalPrices),
          // ?? not ||: a saved 0% growth must stay 0
          avgPricePerMeter: item.avgPricePerMeter ?? def.avgPricePerMeter,
          annualGrowthRate: item.annualGrowthRate ?? def.annualGrowthRate
        }
      : { ...item, historicalPrices: realSeries(item.historicalPrices) });
  }
  const allIdx = out.findIndex((a) => a.id === 'all');
  const all = allIdx >= 0 ? out.splice(allIdx, 1)[0] : (byId.get('all') || ALL_AREA);
  return [all, ...out];
}

/**
 * All active areas: this browser's copy of settings/areas_cms (kept in sync by initAreasSync),
 * or the built-in list when nothing was ever saved.
 */
export function getAreas() {
  if (typeof window === 'undefined') return DEFAULT_SOHAG_AREAS;
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) return mergeStoredAreas(JSON.parse(saved));
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
 * 🗺️ Canonical Area Normalizer
 * Unifies Arabic district names, English variations, and legacy keys (e.g. 'sohag_jadida')
 * into the standard system area ID (e.g. 'new_sohag').
 */
export function normalizeAreaKey(rawArea) {
  if (!rawArea) return 'new_sohag';
  if (typeof rawArea !== 'string') return String(rawArea);

  const clean = rawArea.trim().toLowerCase().replace(/[\s\-_]+/g, '_');

  // Direct canonical map
  const aliases = {
    // New Sohag
    'sohag_jadida': 'new_sohag',
    'sohag_gadida': 'new_sohag',
    'new_sohag': 'new_sohag',
    'newsohag': 'new_sohag',
    'sohag_new': 'new_sohag',
    'سوهاج_الجديدة': 'new_sohag',
    'سوهاج_الجديده': 'new_sohag',
    'الجديدة': 'new_sohag',
    'الجديده': 'new_sohag',
    'مدينة_سوهاج_الجديدة': 'new_sohag',
    
    // East Sohag & Gomhoureya
    'east': 'east',
    'east_sohag': 'east',
    'شرق': 'east',
    'شرق_سوهاج': 'east',
    'حي_شرق': 'east',
    'الجمهورية': 'east',
    'شارع_الجمهورية': 'east',

    // Corniche
    'corniche': 'corniche',
    'nile_corniche': 'corniche',
    'الكورنيش': 'corniche',
    'كورنيش': 'corniche',
    'كورنيش_النيل': 'corniche',

    // West Sohag
    'west': 'west',
    'west_sohag': 'west',
    'غرب': 'west',
    'غرب_سوهاج': 'west',
    'حي_غرب': 'west',
    'المحطة': 'west',
    'الشهيد': 'west',

    // City Center
    'center': 'center',
    'city_center': 'center',
    'downtown': 'center',
    'وسط': 'center',
    'وسط_البلد': 'center',
    'وسط_سوهاج': 'center',
    'العارف': 'center',
    'ميدان_العارف': 'center',
    'الشارع_الجديد': 'center',

    // Thakafa
    'thakafa': 'thakafa',
    'el_thakafa': 'thakafa',
    'الثقافة': 'thakafa',
    'منطقة_الثقافة': 'thakafa',
    'حي_الثقافة': 'thakafa',
    'ميدان_الثقافة': 'thakafa',
    'المخبز_الآلي': 'thakafa',

    // City & Shoban
    'city': 'city',
    'سيتي': 'city',
    'سيتي_والشبان': 'city',
    'الشبان': 'city',

    // Kawthar
    'kawthar': 'kawthar',
    'al_kawthar': 'kawthar',
    'alkawthar': 'kawthar',
    'الكوثر': 'kawthar',
    'حي_الكوثر': 'kawthar',
    'مدينة_الكوثر': 'kawthar',

    // Akhmeem
    'akhmeem': 'akhmeem',
    'akhmim': 'akhmeem',
    'أخميم': 'akhmeem',
    'اخميم': 'akhmeem',

    // Tahta
    'tahta': 'tahta',
    'طهطا': 'tahta',

    // Girga
    'girga': 'girga',
    'جرجا': 'girga',

    // Araba Abydos
    'araba': 'araba',
    'عرابة': 'araba',
    'عرابة_أبيدوس': 'araba',
    'عرابه': 'araba',

    // All
    'all': 'all',
    'all_areas': 'all',
    'الكل': 'all',
    'كل_المناطق': 'all',
    'جميع_المناطق': 'all',
    'أي_منطقة': 'all',
    'اي_منطقه': 'all'
  };

  if (aliases[clean]) return aliases[clean];

  // Try checking raw string without underscore replacement
  const rawClean = rawArea.trim();
  if (aliases[rawClean]) return aliases[rawClean];

  // Check against dynamic areas list from getAreas()
  try {
    const currentAreas = getAreas();
    const matched = currentAreas.find(a => 
      a.id === clean || 
      a.id === rawArea ||
      a.name_ar === rawClean || 
      a.name_en?.toLowerCase() === rawArea.toLowerCase() ||
      a.label_ar === rawClean ||
      rawClean.includes(a.name_ar)
    );
    if (matched) return matched.id;
  } catch (_e) {
    // Ignore matching errors and fallback to clean
  }

  return clean;
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

  // 2. Cloud Firestore Persistence — runs in the background. Firestore only resolves
  // after the server acks, so awaiting it froze the CMS modal on slow or offline links.
  saveSettings(SETTING_DOC_KEY, {
    areas: areasList,
    updatedAt: new Date().toISOString()
  }).then((ok) => {
    if (ok === false) throw new Error('saveSettings returned false');
  }).catch((err) => {
    console.warn('Firestore cloud sync for areas failed:', err);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('oneline_areas_sync_failed', { detail: String(err?.code || err?.message || err) }));
    }
  });
}

/**
 * Add a new area/district
 */
export async function addArea(areaData) {
  const currentAreas = getAreas();
  // Latin ids only (they end up in URLs and saved listings); an Arabic-only name gets area_<time>
  const slug = String(areaData.id || areaData.name_en || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  const rawId = slug || `area_${Date.now().toString(36)}`;

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
    annualGrowthRate: Number.isFinite(Number(areaData.annualGrowthRate)) ? Number(areaData.annualGrowthRate) : 0,
    // A new area starts without landmarks or price history; never borrow another area's figures
    historicalPrices: Array.isArray(areaData.historicalPrices) ? areaData.historicalPrices : [],
    amenities: Array.isArray(areaData.amenities) ? areaData.amenities : [],
    ...placementOf(areaData),
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


// ===================== PLACEMENT: city → sector → district =====================
// Every area is a district (حي) a listing belongs to. It sits in a city (سوهاج، 6 أكتوبر…) and,
// optionally, a sector inside that city (غرب النيل، شرق النيل، سوهاج الجديدة…). Listings only
// store the district id; city and sector come from the area, so moving a district to another
// sector never touches a listing. "all" is the site's "every area" filter, not a place.

export const DEFAULT_CITY_AR = 'سوهاج';
export const DEFAULT_CITY_EN = 'Sohag';
const clean = (v) => String(v ?? '').trim().replace(/\s+/g, ' ').slice(0, 60);

/** The placement fields of an area form / patch, trimmed (empty sector = none). */
export function placementOf(data = {}) {
  const city_ar = clean(data.city_ar) || DEFAULT_CITY_AR;
  const sector_ar = clean(data.sector_ar);
  return {
    city_ar,
    city_en: clean(data.city_en) || (city_ar === DEFAULT_CITY_AR ? DEFAULT_CITY_EN : city_ar),
    sector_ar,
    sector_en: sector_ar ? (clean(data.sector_en) || sector_ar) : ''
  };
}

/**
 * Areas grouped for menus and lists: [{ key, ar, en, count, sectors: [{ key, ar, en, areas }] }].
 * Cities and sectors keep the order they first appear in; districts without a sector come last
 * in their city (key ''). The "all" pseudo-area is left out.
 */
export function groupAreas(areas = []) {
  const cities = new Map();
  for (const a of areas) {
    if (!a || a.id === 'all') continue;
    const p = placementOf(a);
    if (!cities.has(p.city_ar)) cities.set(p.city_ar, { key: p.city_ar, ar: p.city_ar, en: p.city_en, count: 0, sectors: new Map() });
    const city = cities.get(p.city_ar);
    if (!city.sectors.has(p.sector_ar)) city.sectors.set(p.sector_ar, { key: p.sector_ar, ar: p.sector_ar, en: p.sector_en, areas: [] });
    city.sectors.get(p.sector_ar).areas.push(a);
    city.count += 1;
  }
  return [...cities.values()].map((c) => {
    const sectors = [...c.sectors.values()];
    return { ...c, sectors: [...sectors.filter((x) => x.key), ...sectors.filter((x) => !x.key)] };
  });
}

/** Filter values beyond a single district: the whole city, or one sector of it. */
export const cityFilterValue = (cityKey) => `city:${cityKey}`;
export const sectorFilterValue = (cityKey, sectorKey) => `sector:${cityKey}|${sectorKey}`;

/**
 * District ids an area filter covers: null for "all" (no restriction), a set otherwise.
 * Accepts a district id, city:<city> or sector:<city>|<sector>.
 */
export function areaIdsForFilter(value, areas = []) {
  if (!value || value === 'all') return null;
  const v = String(value);
  if (v.startsWith('city:') || v.startsWith('sector:')) {
    const [cityKey, sectorKey] = v.startsWith('city:') ? [v.slice(5), null] : v.slice(7).split('|');
    return new Set(areas.filter((a) => {
      if (!a || a.id === 'all') return false;
      const p = placementOf(a);
      return p.city_ar === cityKey && (sectorKey === null || p.sector_ar === (sectorKey || ''));
    }).map((a) => a.id));
  }
  return new Set([v]);
}

/** Readable name of an area filter value ("سوهاج"، "سوهاج · شرق النيل"، or the district). */
export function areaFilterLabel(value, areas = [], isAr = true) {
  if (!value || value === 'all') return isAr ? 'كل المناطق' : 'All areas';
  const v = String(value);
  const pick = (ar, en) => (isAr ? ar : (en || ar));
  for (const city of groupAreas(areas)) {
    if (v === cityFilterValue(city.key)) return pick(city.ar, city.en);
    for (const sector of city.sectors) {
      if (sector.key && v === sectorFilterValue(city.key, sector.key)) return `${pick(city.ar, city.en)} · ${pick(sector.ar, sector.en)}`;
    }
  }
  const area = areas.find((a) => a.id === v);
  return area ? pick(area.name_ar || area.label_ar, area.name_en || area.label_en) : v;
}

/** "سوهاج · شرق النيل · أخميم" — where a district sits. */
export function areaPathLabel(area, isAr = true) {
  if (!area) return '';
  const p = placementOf(area);
  const pick = (ar, en) => (isAr ? ar : (en || ar));
  return [pick(p.city_ar, p.city_en), p.sector_ar && pick(p.sector_ar, p.sector_en), pick(area.name_ar, area.name_en)].filter(Boolean).join(' · ');
}

/**
 * How close two districts are: 'same', 'sector' (same city and sector), 'city' or null.
 * 'all' on either side counts as 'same' (the client is open to any area).
 */
export function areaProximity(aId, bId, areas = getAreas()) {
  if (!aId || !bId) return null;
  if (aId === bId || aId === 'all' || bId === 'all') return 'same';
  const a = areas.find((x) => x.id === aId);
  const b = areas.find((x) => x.id === bId);
  if (!a || !b) return null;
  const pa = placementOf(a);
  const pb = placementOf(b);
  if (pa.city_ar !== pb.city_ar) return null;
  return pa.sector_ar && pa.sector_ar === pb.sector_ar ? 'sector' : 'city';
}
