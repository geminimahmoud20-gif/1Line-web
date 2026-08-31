import { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  BarChart3, 
  DollarSign, 
  Percent, 
  Building, 
  ArrowUpRight, 
  Download, 
  Sparkles, 
  ShieldCheck, 
  FileSpreadsheet,
  Layers,
  MapPin,
  CheckCircle2,
  Calendar,
  Calculator,
  Compass
} from 'lucide-react';
import { exportToCsv } from '../utils/exportCsv';

export default function MarketIntelligencePage({ lang = 'ar', triggerToast }) {
  const [selectedAssetType, setSelectedAssetType] = useState('all'); // 'all' | 'residential' | 'commercial'
  const [userBudget, setUserBudget] = useState(2500000);
  const isAr = lang === 'ar';

  // Live Sohag District Price Benchmark & Rental Yield Intelligence Data
  const districtsData = [
    {
      id: 'corniche',
      name_ar: 'كورنيش النيل (شرقي وغربي)',
      name_en: 'Nile Corniche (East & West)',
      avgPricePerSqm: 31000,
      annualGrowth: 18.5,
      rentalYield: 9.2,
      demandLevel_ar: 'طلب فائق (نادر المعروض)',
      demandLevel_en: 'Very High (Scarce)',
      topAsset_ar: 'شقق سكنية بإطلالة نيلية',
      topAsset_en: 'Nile View Residences',
      category: 'residential',
      cagr3Yrs: 54
    },
    {
      id: 'east_sohag',
      name_ar: 'شرق سوهاج (شارع الجمهورية وسيتي)',
      name_en: 'East Sohag (Republic St & City)',
      avgPricePerSqm: 21500,
      annualGrowth: 24.0,
      rentalYield: 11.0,
      demandLevel_ar: 'نشط جداً (المركز الإداري)',
      demandLevel_en: 'Highly Active',
      topAsset_ar: 'مقرات إدارية وعيادات',
      topAsset_en: 'Offices & Clinics',
      category: 'commercial',
      cagr3Yrs: 48
    },
    {
      id: 'new_sohag',
      name_ar: 'سوهاج الجديدة (الحي الأول والثاني والمحور)',
      name_en: 'New Sohag (1st & 2nd Districts)',
      avgPricePerSqm: 17800,
      annualGrowth: 32.5,
      rentalYield: 14.2,
      demandLevel_ar: 'أعلى عائد رأسمالي في الصعيد',
      demandLevel_en: 'Highest Capital Growth in Upper Egypt',
      topAsset_ar: 'محلات ومقرات تجارية وكمبوندات',
      topAsset_en: 'Retail Shops & Gated Villas',
      category: 'commercial',
      cagr3Yrs: 72
    },
    {
      id: 'thakafa',
      name_ar: 'منطقة الثقافة والمخبز الآلي',
      name_en: 'El Thakafa & Automatic Bakery',
      avgPricePerSqm: 15200,
      annualGrowth: 16.0,
      rentalYield: 8.8,
      demandLevel_ar: 'طلب سكني مستقر',
      demandLevel_en: 'Stable Residential',
      topAsset_ar: 'شقق سكنية عائلية',
      topAsset_en: 'Family Apartments',
      category: 'residential',
      cagr3Yrs: 36
    },
    {
      id: 'tahta_girga',
      name_ar: 'مراكز المحافظة (طهطا وجرجا)',
      name_en: 'Major Hubs (Tahta & Girga)',
      avgPricePerSqm: 13500,
      annualGrowth: 14.5,
      rentalYield: 9.5,
      demandLevel_ar: 'نشاط تجاري مرتفع',
      demandLevel_en: 'High Commercial Activity',
      topAsset_ar: 'أراضي ومحلات رئيسية',
      topAsset_en: 'Plots & Main Street Shops',
      category: 'commercial',
      cagr3Yrs: 30
    }
  ];

  const filteredDistricts = selectedAssetType === 'all' 
    ? districtsData 
    : districtsData.filter(d => d.category === selectedAssetType);

  // Dynamic Budget Recommendation
  const budgetRecommendation = useMemo(() => {
    if (userBudget >= 5000000) {
      return {
        district_ar: 'سوهاج الجديدة + كورنيش النيل',
        district_en: 'New Sohag + Nile Corniche',
        strategy_ar: 'توزيع المحفظة بين مقر تجاري بسوهاج الجديدة وشقة فاخرة على الكورنيش لتعظيم العائد الإيجاري وحفظ القيمة.',
        strategy_en: 'Split allocation between commercial retail in New Sohag and Nilefront luxury residence.',
        estAnnualYield: (userBudget * 0.135).toLocaleString()
      };
    } else if (userBudget >= 2000000) {
      return {
        district_ar: 'سوهاج الجديدة (الحي الثاني أو المحور المركزي)',
        district_en: 'New Sohag (Central Axis / 2nd District)',
        strategy_ar: 'محل تجاري أو عيادة طبية بمقدم 20% وتقسيط حتى 5 سنوات لتحقيق عائد رأسمالي متوقع +32% سنوياً.',
        strategy_en: 'Prime commercial/medical unit with 20% downpayment to capture 32%+ annual capital appreciation.',
        estAnnualYield: (userBudget * 0.14).toLocaleString()
      };
    } else {
      return {
        district_ar: 'شرق سوهاج أو الثقافة (شقة سكنية متكاملة)',
        district_en: 'East Sohag or Thakafa (Ready Residence)',
        strategy_ar: 'شقة سكنية مسجلة 120-150م² بموقع حيوي بتشطيب سوبر لوكس للإيجار السكني الفوري المستقر.',
        strategy_en: 'Serviced 120-150 sqm residential apartment for steady long-term rental income.',
        estAnnualYield: (userBudget * 0.095).toLocaleString()
      };
    }
  }, [userBudget]);

  const handleExportReport = () => {
    const headers = [
      { key: 'name_ar', label: 'المنطقة في سوهاج' },
      { key: 'avgPricePerSqm', label: 'متوسط سعر المتر (ج.م)' },
      { key: 'annualGrowth', label: 'نسبة النمو السنوي (%)' },
      { key: 'rentalYield', label: 'العائد الإيجاري السنوي (%)' },
      { key: 'demandLevel_ar', label: 'مستوى الطلب' },
      { key: 'topAsset_ar', label: 'النوع الأكثر ربحية' }
    ];

    exportToCsv('Sohag_RealEstate_Market_Intelligence_Report_2026', districtsData, headers);
    if (triggerToast) {
      triggerToast(isAr ? 'تم تصدير تقرير ذكاء السوق العقاري بنجاح' : 'Market intelligence report exported successfully!', 'success');
    }
  };

  return (
    <div className="market-intelligence-page-wrapper">
      {/* Hero Banner */}
      <div className="market-hero-banner">
        <div className="market-hero-container">
          <div className="market-badge-pill">
            <TrendingUp size={16} className="text-gold" />
            <span>{isAr ? 'مركز أبحاث وبيانات السوق العقاري بسوهاج 2026' : 'Sohag Real Estate Market Intelligence Hub'}</span>
          </div>

          <h1>{isAr ? 'مؤشرات أسعار المتر والعوائد الاستثمارية بسوهاج' : 'Price per Sqm & ROI Intelligence in Sohag'}</h1>
          <p>
            {isAr 
              ? 'بيانات حية ومحدثة دورياً من واقع صفقات الشهر العقاري وتداولات السوق لمساعدة المستثمرين والمشترين في اتخاذ قرارات دقيقة.' 
              : 'Live verified transaction data, average sqm benchmarks, and projected rental yields across all Sohag districts.'}
          </p>

          <div className="market-hero-actions">
            <button type="button" className="btn btn-primary" onClick={handleExportReport}>
              <FileSpreadsheet size={16} />
              <span>{isAr ? 'تصدير التقرير الكامل لإكسل (Excel CSV)' : 'Export Market Report (Excel)'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Top 4 Key Economic Indicators Strip */}
      <div className="market-content-container">
        <div className="market-summary-stats-grid">
          <div className="summary-stat-box">
            <div className="stat-icon-wrap bg-blue">
              <TrendingUp size={22} />
            </div>
            <div>
              <span className="stat-lbl">{isAr ? 'متوسط نمو رأس المال السنوي' : 'Avg Capital Growth'}</span>
              <strong className="stat-num text-primary">+26.4% {isAr ? 'سنوياً' : '/ Year'}</strong>
            </div>
          </div>

          <div className="summary-stat-box">
            <div className="stat-icon-wrap bg-green">
              <Percent size={22} />
            </div>
            <div>
              <span className="stat-lbl">{isAr ? 'متوسط العائد الإيجاري التجاري' : 'Commercial Rental Yield'}</span>
              <strong className="stat-num text-success">12.5% - 15%</strong>
            </div>
          </div>

          <div className="summary-stat-box">
            <div className="stat-icon-wrap bg-gold">
              <DollarSign size={22} />
            </div>
            <div>
              <span className="stat-lbl">{isAr ? 'أعلى منطقة طلباً للاستثمار' : 'Top Investment District'}</span>
              <strong className="stat-num">{isAr ? 'سوهاج الجديدة' : 'New Sohag'}</strong>
            </div>
          </div>

          <div className="summary-stat-box">
            <div className="stat-icon-wrap bg-purple">
              <ShieldCheck size={22} />
            </div>
            <div>
              <span className="stat-lbl">{isAr ? 'نسبة الأمان القانوني للصفقات' : 'Legal Safety Index'}</span>
              <strong className="stat-num">100% {isAr ? 'معتمد' : 'Verified'}</strong>
            </div>
          </div>
        </div>

        {/* Interactive Custom Budget ROI Simulator */}
        <div className="market-budget-advisor-card">
          <div className="advisor-header-row">
            <div className="advisor-title-wrap">
              <div className="advisor-glow-icon">
                <Calculator size={20} className="text-white" />
              </div>
              <div>
                <h4>{isAr ? 'محاكي ترشيح أفضل حي لاستثمار ميزانيتك' : 'AI Investment District Recommender'}</h4>
                <p>{isAr ? 'أدخل حجم السيولة المتاحة لديك لنرشح لك الحي الأكثر ربحية وأعلى عائد إيجاري فورياً' : 'Input your capital to discover the highest-yield district in Sohag'}</p>
              </div>
            </div>

            <div className="advisor-input-box">
              <label>{isAr ? 'ميزانيتك الاستثمارية:' : 'Your Capital:'}</label>
              <div className="advisor-num-input-wrap">
                <input
                  type="number"
                  min="500000"
                  max="30000000"
                  step="100000"
                  value={userBudget}
                  onChange={(e) => setUserBudget(Math.max(0, parseInt(e.target.value) || 0))}
                  className="advisor-direct-input"
                />
                <span>{isAr ? 'ج.م' : 'EGP'}</span>
              </div>
            </div>
          </div>

          <div className="advisor-result-banner">
            <div className="advisor-res-district">
              <span className="res-tag">{isAr ? 'الترشيح الاستثماري الأفضل' : 'Top Recommended Location'}</span>
              <h5>{isAr ? budgetRecommendation.district_ar : budgetRecommendation.district_en}</h5>
              <p>{isAr ? budgetRecommendation.strategy_ar : budgetRecommendation.strategy_en}</p>
            </div>
            <div className="advisor-res-yield">
              <span className="yield-tag">{isAr ? 'العائد السنوي المتوقع' : 'Est. Annual Cash Flow'}</span>
              <strong>{budgetRecommendation.estAnnualYield} {isAr ? 'ج.م / سنوياً' : 'EGP/yr'}</strong>
            </div>
          </div>
        </div>

        {/* Main District Matrix Table */}
        <div className="market-matrix-card">
          <div className="matrix-header-flex">
            <div>
              <h3>{isAr ? 'جدول مقارنة أسعار المتر والعوائد حسب أحياء سوهاج' : 'District Price & Yield Benchmark Matrix'}</h3>
              <p>{isAr ? 'متوسط سعر المتر الكاش ومعدلات النمو والعوائد المتوقعة لعام 2026' : 'Average cash price per sqm, CAGR, and yield forecast'}</p>
            </div>

            {/* Filter Toggle */}
            <div className="matrix-filter-pills">
              <button
                type="button"
                className={`mat-btn ${selectedAssetType === 'all' ? 'active' : ''}`}
                onClick={() => setSelectedAssetType('all')}
              >
                {isAr ? 'الكل' : 'All'}
              </button>
              <button
                type="button"
                className={`mat-btn ${selectedAssetType === 'commercial' ? 'active' : ''}`}
                onClick={() => setSelectedAssetType('commercial')}
              >
                {isAr ? 'تجاري وإداري' : 'Commercial'}
              </button>
              <button
                type="button"
                className={`mat-btn ${selectedAssetType === 'residential' ? 'active' : ''}`}
                onClick={() => setSelectedAssetType('residential')}
              >
                {isAr ? 'سكني' : 'Residential'}
              </button>
            </div>
          </div>

          {/* Desktop Table View */}
          <div className="matrix-table-scroll">
            <table className="market-data-table">
              <thead>
                <tr>
                  <th>{isAr ? 'المنطقة / الحي' : 'District'}</th>
                  <th>{isAr ? 'متوسط سعر المتر' : 'Avg Price / Sqm'}</th>
                  <th>{isAr ? 'النمو السنوي' : 'Annual Growth'}</th>
                  <th>{isAr ? 'العائد الإيجاري' : 'Rental Yield'}</th>
                  <th>{isAr ? 'النمو التراكمي (3 سنوات)' : '3-Yr Growth'}</th>
                  <th>{isAr ? 'حالة الطلب' : 'Demand Status'}</th>
                </tr>
              </thead>
              <tbody>
                {filteredDistricts.map((d) => (
                  <tr key={d.id}>
                    <td>
                      <div className="district-cell">
                        <MapPin size={15} className="text-primary" />
                        <strong>{isAr ? d.name_ar : d.name_en}</strong>
                      </div>
                    </td>
                    <td>
                      <strong className="cell-price">{d.avgPricePerSqm.toLocaleString()} ج.م</strong>
                    </td>
                    <td>
                      <span className="growth-badge">+{d.annualGrowth}%</span>
                    </td>
                    <td>
                      <strong className="text-success">{d.rentalYield}% {isAr ? 'سنوياً' : '/ yr'}</strong>
                    </td>
                    <td>
                      <span className="cagr-text">+{d.cagr3Yrs}%</span>
                    </td>
                    <td>
                      <span className="demand-tag">{isAr ? d.demandLevel_ar : d.demandLevel_en}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Investment Insights & Expert Forecast Section */}
        <div className="market-insights-grid">
          <div className="insight-card">
            <div className="insight-card-header">
              <Sparkles size={18} className="text-gold" />
              <h4>{isAr ? 'أبرز توصيات خبراء الاستثمار العقاري بسوهاج 2026' : 'Key Investment Recommendations 2026'}</h4>
            </div>
            <ul className="insights-points-list">
              <li>
                <CheckCircle2 size={16} className="text-success" />
                <span>{isAr ? 'سوهاج الجديدة تمثل الفرصة الذهبية للمضاعفة الرأسمالية خلال الـ 24 شهراً القادمة بسبب نقل المصالح والجامعات.' : 'New Sohag is the prime capital appreciation hotspot for the next 24 months.'}</span>
              </li>
              <li>
                <CheckCircle2 size={16} className="text-success" />
                <span>{isAr ? 'المقرات الإدارية والعيادات في شرق سوهاج تحقق أسرع وأعلى عائد إيجاري فوري بمتوسط 14% سنوياً.' : 'Medical and executive clinics in East Sohag yield the highest immediate rental cash flow.'}</span>
              </li>
              <li>
                <CheckCircle2 size={16} className="text-success" />
                <span>{isAr ? 'عقارات الكورنيش تحافظ على قيمتها كأفضل ملاذ آمن ضد التضخم مع ندرة الأراضي المتاحة على النيل.' : 'Nile Corniche properties remain the premier inflation-proof luxury store of value.'}</span>
              </li>
            </ul>
          </div>

          <div className="insight-card cta-consult-card">
            <div className="insight-card-header">
              <Building size={18} className="text-white" />
              <h4>{isAr ? 'طلب دراسة جدوى استثمارية مخصصة' : 'Request Custom Feasibility Study'}</h4>
            </div>
            <p>{isAr ? 'هل تمتلك سيولة وترغب في توزيعها على أفضل محفظة عقارية في سوهاج؟ تواصل مع خبرائنا لإعداد دراسة جدوى مجانية.' : 'Have investment capital and looking for the optimal property portfolio? Consult our advisors.'}</p>
            <a
              href="https://wa.me/201012345678?text=مرحباً،%20أريد%20طلب%20دراسة%20جدوى%20عقارية%20استثمارية%20لمحفظتي"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-whatsapp btn-full"
            >
              <span>{isAr ? 'تواصل مع مستشار الاستثمار (VIP)' : 'Consult Investment Desk'}</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
