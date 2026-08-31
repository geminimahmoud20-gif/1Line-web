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
  }
];

export const INITIAL_DEMANDS = [
  {
    id: 'dem-1',
    text_ar: 'مطلوب شقة سكنية 160 متر في منطقة شرق سوهاج بميزانية 3.2 مليون جنيه كاش - استلام فوري.',
    text_en: 'Wanted: 160 sqm residential apartment in East Sohag, budget 3.2 Million EGP Cash - immediate handover.',
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
    q_ar: 'كيف تضمن شركة ون لاين صحة وسلامة الأوراق القانونية للعقارات؟',
    q_en: 'How does One Line ensure legal verification of property documents?',
    a_ar: 'لدينا فريق قانوني واستشاري متخصص يقوم بفحص تسلسل الملكية وتراخيص البناء وشهادات السجل العيني قبل عرض أي عقار على المنصة.',
    a_en: 'Our dedicated legal team conducts thorough title deeds verification, building permits check, and municipality validation before listing any property.'
  },
  {
    q_ar: 'هل يمكنني الشراء بأنظمة تقسيط مرنة؟',
    q_en: 'Can I purchase properties with flexible installment plans?',
    a_ar: 'نعم، نوفر برنامج One Line Now للتمويل العقاري بأقساط تصل إلى 7 سنوات ومقدمات تبدأ من 15% مع خطط سداد مريحة.',
    a_en: 'Yes, our One Line Now financing program provides installment plans up to 7 years with downpayments starting from 15%.'
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
    text_ar: 'تجربة استثنائية مع ون لاين في شراء مقر تجاري بسوهاج الجديدة. الشفافية التامة والدقة في مواعيد التسليم هي سر تميزهم.',
    text_en: 'Exceptional experience with One Line purchasing commercial real estate in New Sohag. True transparency and professionalism.',
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
    text_ar: 'حصلت على عيادة طبية بمواصفات ممتازة وموقع استراتيجي بفضل المعالج الذكي للبحث في ون لاين.',
    text_en: 'Found the perfect clinic space with prime accessibility thanks to One Line smart matching wizard.',
    rating: 5
  }
];
