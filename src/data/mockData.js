// =============================================================
//  ONE LINE REAL ESTATE - MOCK & INITIAL DATA
// =============================================================

export const INITIAL_LEADS = [
  {
    id: 'lead-1',
    name: 'أحمد محمود السوهاجي',
    phone: '01012345678',
    whatsapp: '01012345678',
    email: 'ahmed.sohag@gmail.com',
    type: 'buyer',
    score: 95,
    temperature: 'hot',
    source: 'Facebook Ad',
    campaignName: 'sohag_east_premium',
    adSet: 'apartments_interest',
    creativeSource: 'video_tour_1',
    landingPage: '/buy',
    timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
    status: 'new',
    followUp: 'First Call Done',
    assignedTo: 'Dr. Mahmoud Elbaz',
    notes: 'العميل مهتم جداً بالشراء الفوري كاش في شرق سوهاج. ميزانية 3.5 مليون مع مقدم 1.5 مليون وقسط مريح.',
    outcomes: [
      { id: 'callback', at: new Date(Date.now() - 3600000 * 4).toISOString(), n: 'د. محمود الباز' }
    ],
    lastOutcome: 'callback',
    lastOutcomeAt: new Date(Date.now() - 3600000 * 4).toISOString(),
    details: {
      purpose: 'live',
      propertyType: 'apartment',
      area: 'east',
      budget: '3,500,000',
      paymentMethod: 'cash',
      timeframe: 'immediate',
      downPayment: '1,500,000',
      monthlyInstallment: '20,000',
      financingType: 'cash',
      sourceOfFunds: 'عمل بالخارج (الخليج)',
      currentResidence: 'سوهاج - شارع الجمهورية',
      reasonForBuying: 'سكن عائلي أساسي',
      familySize: '5',
      moveInDate: '2026-08-01',
      investmentHorizon: 'medium',
      readinessScore: 92
    }
  },
  {
    id: 'lead-seller-notfit',
    name: 'محمود هاشم',
    phone: '01099887766',
    whatsapp: '01099887766',
    email: 'm.hashem@gmail.com',
    type: 'seller',
    score: 65,
    temperature: 'cold',
    source: 'الموقع',
    landingPage: '/sell',
    timestamp: new Date(Date.now() - 3600000 * 24).toISOString(),
    status: 'new',
    assignedTo: 'Dr. Mahmoud Elbaz',
    notes: 'المالك نفسه للشقة بسوهاج الجديدة، طلب السعر 2.5 مليون لكن صرف نظر حالياً.',
    outcomes: [
      { id: 'not_fit', at: new Date(Date.now() - 60000 * 5).toISOString(), n: 'د. محمود الباز' }
    ],
    lastOutcome: 'not_fit',
    lastOutcomeAt: new Date(Date.now() - 60000 * 5).toISOString(),
    details: {
      propertyType: 'apartment',
      area: 'new_sohag',
      budget: '2,500,000',
      askingPrice: 2500000
    }
  },
  {
    id: 'lead-2',
    name: 'د. خالد عبد الرحمن',
    phone: '01122334455',
    whatsapp: '01122334455',
    email: 'khaled.doc@hotmail.com',
    type: 'seller',
    score: 85,
    temperature: 'warm',
    source: 'Google Organic',
    campaignName: 'organic_search',
    adSet: 'seo_valuation',
    creativeSource: 'homepage_valuation_cta',
    landingPage: '/valuation',
    timestamp: new Date(Date.now() - 3600000 * 5).toISOString(),
    status: 'contacted',
    followUp: 'Valuation Shared',
    assignedTo: 'Sales Team A',
    notes: 'يريد بيع قطعة أرض 400م في سوهاج الجديدة. تم إرسال تقرير التقييم المبدئي.',
    outcomes: [
      { id: 'interested', at: new Date(Date.now() - 3600000 * 2).toISOString(), n: 'د. محمود الباز' }
    ],
    lastOutcome: 'interested',
    lastOutcomeAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    details: {
      propertyType: 'land',
      area: 'new_sohag',
      size: '400',
      finishing: 'none',
      expectedPrice: '2,800,000',
      urgency: 'medium'
    }
  },
  {
    id: 'lead-3',
    name: 'المهندس مصطفى عمران',
    phone: '01234567890',
    whatsapp: '01234567890',
    email: 'mostafa.emran@solutions.com',
    type: 'broker',
    score: 90,
    temperature: 'warm',
    source: 'TikTok Campaign',
    campaignName: 'broker_network_expansion',
    adSet: 'sohag_local_brokers',
    creativeSource: 'video_join_portal',
    landingPage: '/broker',
    timestamp: new Date(Date.now() - 3600000 * 12).toISOString(),
    status: 'negotiating',
    followUp: 'Contract Review',
    assignedTo: 'Dr. Mahmoud Elbaz',
    notes: 'وسيط عقاري ذو خبرة 8 سنوات بسوهاج الجديدة، يملك محفظة حصرية من المحلات التجارية والعملاء.',
    details: {
      experience: '8',
      areas: ['new_sohag', 'east'],
      categories: ['commercial', 'retail'],
      inventoryCount: '14'
    }
  },
  {
    id: 'lead-4',
    name: 'أ. أشرف البارودي',
    phone: '01511223344',
    whatsapp: '01511223344',
    email: 'ashraf.baroudi@invest.net',
    type: 'investor',
    score: 92,
    temperature: 'hot',
    source: 'WhatsApp Blast',
    campaignName: 'investor_roi_promo',
    adSet: 'sohag_investors_list',
    creativeSource: 'whatsapp_roi_calc',
    landingPage: '/investor',
    timestamp: new Date(Date.now() - 3600000 * 24).toISOString(),
    status: 'contacted',
    followUp: 'ROI Presentation Sent',
    assignedTo: 'Dr. Mahmoud Elbaz',
    notes: 'مستثمر يبحث عن فرص تجارية بعائد إيجاري مرتفع. قيمة استثماره المقترحة 10 مليون جنيه.',
    details: {
      investmentAmount: '10,000,000',
      propertyType: 'commercial',
      holdingPeriod: '5',
      expectedYield: '14%'
    }
  },
  {
    id: 'lead-seller-1',
    name: 'مؤمن رمضان',
    phone: '01151015008',
    whatsapp: '01151015008',
    email: 'moemen.ramadan@gmail.com',
    type: 'seller',
    score: 95,
    temperature: 'hot',
    source: 'Website Form',
    timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
    status: 'new',
    assignedTo: 'Unassigned',
    budget: '21,000,000',
    notes: 'صفقة كبرى +5 مليون. مالك فيلا / تاون هاوس في سوهاج غرب. يرغب بالبيع السريع.',
    details: {
      propertyType: 'villa',
      area: 'west',
      location: 'سوهاج غرب',
      expectedPrice: '21,000,000',
      askingPrice: '21,000,000',
      price: '21,000,000',
      budget: '21,000,000'
    }
  },
  {
    id: 'lead-seller-2',
    name: 'وليد محمد مسعود',
    phone: '01014124720',
    whatsapp: '01014124720',
    email: 'walid.masoud@gmail.com',
    type: 'seller',
    score: 88,
    temperature: 'warm',
    source: 'WhatsApp',
    timestamp: new Date(Date.now() - 3600000 * 20).toISOString(),
    status: 'contacted',
    assignedTo: 'Dr. Mahmoud Elbaz',
    budget: '3,500,000',
    notes: 'مالك فيلا / تاون هاوس سوهاج غرب. تم التواصل ومطلوب تحديد موعد معاينة.',
    details: {
      propertyType: 'villa',
      area: 'west',
      location: 'سوهاج غرب',
      expectedPrice: '3,500,000',
      askingPrice: '3,500,000',
      budget: '3,500,000'
    }
  },
  {
    id: 'lead-seller-3',
    name: 'محمد العوامري',
    phone: '01224751500',
    whatsapp: '01224751500',
    email: 'm.awamri@gmail.com',
    type: 'seller',
    score: 90,
    temperature: 'warm',
    source: 'Direct Call',
    timestamp: new Date(Date.now() - 3600000 * 30).toISOString(),
    status: 'site_visit',
    assignedTo: 'Dr. Mahmoud Elbaz',
    budget: '4,200,000',
    notes: 'شقة سكنية سوهاج شرق (ش أخميم). تم فحص المستندات والاتفاق على السعر.',
    details: {
      propertyType: 'apartment',
      area: 'east',
      location: 'سوهاج شرق',
      expectedPrice: '4,200,000',
      askingPrice: '4,200,000',
      budget: '4,200,000'
    }
  },
  {
    id: 'lead-seller-4',
    name: 'عبد الحكيم عامر',
    phone: '01025930000',
    whatsapp: '01025930000',
    email: 'amer@gmail.com',
    type: 'seller',
    score: 92,
    temperature: 'hot',
    source: 'CRM Referral',
    timestamp: new Date(Date.now() - 3600000 * 48).toISOString(),
    status: 'negotiating',
    assignedTo: 'Dr. Mahmoud Elbaz',
    budget: '1,660,000',
    notes: 'المالك نفسه للوحدة، شقة سكنية للسكن أو الاستثمار - جاردن سيتي سوهاج.',
    details: {
      propertyType: 'apartment',
      area: 'east',
      location: 'جاردن سيتي',
      expectedPrice: '1,660,000',
      askingPrice: '1,660,000',
      budget: '1,660,000'
    }
  },
  {
    id: 'lead-salah-rejected',
    name: 'صلاح عبدالمجيد محمد امين',
    phone: '01001625926',
    whatsapp: '01001625926',
    email: 'salah.amin@gmail.com',
    type: 'seller',
    score: 85,
    temperature: 'cold',
    source: 'Website Form',
    timestamp: new Date(Date.now() - 3600000 * 24 * 6).toISOString(),
    status: 'lost',
    lostReason: 'property_rejected',
    lostReasonDetails: 'تم رفض العقار من قِبل الإدارة',
    lostAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    assignedTo: 'Dr. Mahmoud Elbaz',
    budget: '12,000,000',
    notes: 'صفقة كبرى +5 مليون. مالك فيلا / تاون هاوس سوهاج الجديدة. تم تحويل الطلب لعقار ولكن رفضته الإدارة لوجود مخالفات.',
    outcomes: [
      { id: 'not_fit', at: new Date(Date.now() - 3600000 * 12).toISOString(), reason: 'property_rejected', n: 'د. محمود الباز' }
    ],
    lastOutcome: 'not_fit',
    lastOutcomeAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    convertedPropertyId: 'prop-salah-rejected',
    details: {
      propertyType: 'villa',
      area: 'new_sohag',
      location: 'سوهاج الجديدة',
      expectedPrice: '12,000,000',
      askingPrice: '12,000,000',
      budget: '12,000,000'
    }
  }
];

export const INITIAL_DEMANDS = [
  {
    id: 'dem-1',
    text_ar: 'مطلوب شقة سكنية 160 متر في منطقة شرق سوهاج بميزانية 3.2 مليون جنيه كاش - استلام فوري.',
    text_en: 'Wanted: 160 sqm residential apartment in East Sohag, budget 3.2 Million EGP Cash - immediate handover.',
    area: 'east',
    area_ar: 'شرق سوهاج',
    area_en: 'East Sohag',
    type: 'apartment',
    budget: 3200000,
    timeframe: 'immediate',
    urgency: 'high',
    timestamp: 'منذ ساعتين'
  },
  {
    id: 'dem-2',
    text_ar: 'مطلوب محل تجاري على شارع رئيسي في سوهاج الجديدة بمساحة لا تقل عن 50 متر مربع لفرنشايز مطعم.',
    text_en: 'Wanted: Retail shop on main street in New Sohag, min 50 sqm area for a food franchise.',
    area: 'new_sohag',
    area_ar: 'سوهاج الجديدة',
    area_en: 'New Sohag',
    type: 'retail',
    budget: 6000000,
    timeframe: 'within_3_months',
    urgency: 'medium',
    timestamp: 'منذ 4 ساعات'
  },
  {
    id: 'dem-3',
    text_ar: 'مطلوب أرض استثمارية بمساحة 500 متر إلى 800 متر مربع بترخيص تجاري أو إداري في حي الكوثر.',
    text_en: 'Wanted: Commercial investment land 500-800 sqm with building license in Al-Kawthar.',
    area: 'kawthar',
    area_ar: 'حي الكوثر',
    area_en: 'Al-Kawthar',
    type: 'land',
    budget: 4500000,
    timeframe: 'within_6_months',
    urgency: 'low',
    timestamp: 'منذ يوم'
  },
  {
    id: 'dem-4',
    text_ar: 'مطلوب مكتب إداري أو عيادة طبية بمساحة 80 متر مربع نصف تشطيب بالقرب من مستشفى سوهاج الجامعي.',
    text_en: 'Wanted: 80 sqm admin office or medical clinic, semi-finished, near Sohag University Hospital.',
    area: 'center',
    area_ar: 'وسط البلد - الجامعة',
    area_en: 'City Center',
    type: 'office',
    budget: 1800000,
    timeframe: 'immediate',
    urgency: 'high',
    timestamp: 'منذ يومين'
  }
];

export const FAQS = [
  {
    q_ar: 'كيف تضمن شركة 1Line صحة وسلامة الأوراق القانونية للعقارات؟',
    q_en: 'How does 1Line ensure legal verification of property documents?',
    a_ar: 'لدينا فريق قانوني واستشاري متخصص يقوم بفحص تسلسل الملكية وتراخيص البناء وشهادات السجل العيني قبل عرض أي عقار على المنصة.',
    a_en: 'Our dedicated legal team conducts thorough title deeds verification, building permits check, and municipality validation before listing any property.'
  },
  {
    q_ar: 'هل يمكنني الشراء بأنظمة تقسيط مرنة؟',
    q_en: 'Can I purchase properties with flexible installment plans?',
    a_ar: 'نعم، نوفر برنامج 1Line Now للتمويل العقاري بأقساط تصل إلى 7 سنوات ومقدمات تبدأ من 15% مع خطط سداد مريحة.',
    a_en: 'Yes, our 1Line Now financing program provides installment plans up to 7 years with downpayments starting from 15%.'
  },
  {
    q_ar: 'كيف أستفيد كمسوق أو وسيط عقاري من المنصة؟',
    q_en: 'How can I benefit as a broker or real estate marketer?',
    a_ar: 'يمكنك الانضمام لشبكة شركاء النجاح عبر بوابة الوسطاء للوصول لمحفظة حصرية من الوحدات والعملاء المؤهلين بعمولات مجزية.',
    a_en: 'You can join our Broker Partner Portal to access exclusive inventory, qualified buyer leads, and high-tier commission structures.'
  }
];

export const TESTIMONIALS = [
  {
    name_ar: 'م. حسام الدين عبد العال',
    name_en: 'Eng. Hossam El-Din',
    role_ar: 'مستثمر عقاري - سوهاج الجديدة',
    role_en: 'Real Estate Investor - New Sohag',
    text_ar: 'تجربة استثنائية مع 1Line في شراء مقر تجاري بسوهاج الجديدة. الشفافية التامة والدقة في مواعيد التسليم هي سر تميزهم.',
    text_en: 'Exceptional experience with 1Line purchasing commercial real estate in New Sohag. True transparency and professionalism.',
    rating: 5
  },
  {
    name_ar: 'أ. سارة المنشاوي',
    name_en: 'Sara El-Menshawy',
    role_ar: 'مالكة شقة - شرق سوهاج',
    role_en: 'Homeowner - East Sohag',
    text_ar: 'تم بيع شقتي في أقل من 10 أيام وبأعلى تقييم سوقي عادل دون أي إزعاج أو إضاعة وقت.',
    text_en: 'My apartment was sold in less than 10 days at fair market value without any hassle. Highly recommended!',
    rating: 5
  },
  {
    name_ar: 'د. طارق القاضي',
    name_en: 'Dr. Tarek El-Kady',
    role_ar: 'استشاري جراحة - وسط البلد',
    role_en: 'Consultant Surgeon - City Center',
    text_ar: 'حصلت على عيادة طبية بمواصفات ممتازة وموقع استراتيجي بفضل المعالج الذكي للبحث في 1Line.',
    text_en: 'Found the perfect clinic space with prime accessibility thanks to 1Line smart matching wizard.',
    rating: 5
  }
];
