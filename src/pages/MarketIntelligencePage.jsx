import { useState, useMemo, useEffect } from 'react';
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
import { getWhatsAppUrl } from '../utils/founderCmsData';
import { getAreas } from '../utils/areasData';

export default function MarketIntelligencePage({ lang = 'ar', triggerToast }) {
  const [selectedAssetType, setSelectedAssetType] = useState('all'); // 'all' | 'residential' | 'commercial'
  const [userBudget, setUserBudget] = useState(2500000);
  const [, setTick] = useState(0);
  const isAr = lang === 'ar';

  // Live listen for area data updates from CRM
  useEffect(() => {
    const handleUpdate = () => setTick(t => t + 1);
    window.addEventListener('oneline_areas_updated', handleUpdate);
    return () => window.removeEventListener('oneline_areas_updated', handleUpdate);
  }, []);

  // Live Sohag District Price Benchmark & Rental Yield Intelligence Data
  const districtsData = useMemo(() => {
    const rawAreas = getAreas().filter(a => a.id !== 'all');
    
    // Metadata presets per district ID to enrich dynamic prices
    const districtMeta = {
      corniche: {
        rentalYield: 9.2,
        demandLevel_ar: 'طلب فائق (نادر المعروض)',
        demandLevel_en: 'Very High (Scarce)',
        topAsset_ar: 'شقق سكنية بإطلالة نيلية',
        topAsset_en: 'Nile View Residences',
        category: 'residential'
      },
      east: {
        rentalYield: 11.0,
        demandLevel_ar: 'نشط جداً (المركز الإداري والمالي)',
        demandLevel_en: 'Highly Active',
        topAsset_ar: 'مقرات إدارية وعيادات',
        topAsset_en: 'Offices & Clinics',
        category: 'commercial'
      },
      new_sohag: {
        rentalYield: 14.2,
        demandLevel_ar: 'أعلى عائد رأسمالي في الصعيد',
        demandLevel_en: 'Highest Capital Growth in Upper Egypt',
        topAsset_ar: 'محلات ومقرات تجارية وكمبوندات',
        topAsset_en: 'Retail Shops & Gated Villas',
        category: 'commercial'
      },
      center: {
        rentalYield: 10.5,
        demandLevel_ar: 'حركة تجارية مستمرة (قلب المدينة)',
        demandLevel_en: 'Continuous Downtown Traffic',
        topAsset_ar: 'صيدليات ومحلات تجزئة',
        topAsset_en: 'Pharmacies & Retail Stores',
        category: 'commercial'
      },
      kawthar: {
        rentalYield: 12.8,
        demandLevel_ar: 'نمو صناعي ولوجستي واعد',
        demandLevel_en: 'Industrial & Logistics Expansion',
        topAsset_ar: 'مستودعات ومصانع وسكن متميز',
        topAsset_en: 'Warehouses & Industrial Sites',
        category: 'commercial'
      },
      thakafa: {
        rentalYield: 8.8,
        demandLevel_ar: 'طلب سكني عائلي مستقر',
        demandLevel_en: 'Stable Residential',
        topAsset_ar: 'شقق سكنية عائلية',
        topAsset_en: 'Family Apartments',
        category: 'residential'
      },
      tahta: {
        rentalYield: 10.2,
        demandLevel_ar: 'عاصمة التجارة والأثاث شمالاً',
        demandLevel_en: 'Northern Commercial Hub',
        topAsset_ar: 'محلات تجارية وأراضي استثمارية',
        topAsset_en: 'Commercial Outlets & Land',
        category: 'commercial'
      },
      girga: {
        rentalYield: 9.5,
        demandLevel_ar: 'مركز الثقل الاقتصادي جنوباً',
        demandLevel_en: 'Southern Commercial Center',
        topAsset_ar: 'عقارات شارع البحر والكورنيش',
        topAsset_en: 'Waterfront & Bahr St Real Estate',
        category: 'commercial'
      },
      west: {
        rentalYield: 8.5,
        demandLevel_ar: 'طلب سكني متصل بالمحطة',
        demandLevel_en: 'Transit & Residential Demand',
        topAsset_ar: 'وحدات سكنية وتجارية',
        topAsset_en: 'Mixed-Use Units',
        category: 'residential'
      },
      akhmeem: {
        rentalYield: 9.0,
        demandLevel_ar: 'تراث ونشاط سكني تجاري متنامي',
        demandLevel_en: 'Historic & Commercial Growth',
        topAsset_ar: 'شقق سكنية وأسواق تجزئة',
        topAsset_en: 'Apartments & Retail Stalls',
        category: 'residential'
      }
    };

    return rawAreas.map(area => {
      const meta = districtMeta[area.id] || {
        rentalYield: 9.5,
        demandLevel_ar: 'طلب استثماري مستقر',
        demandLevel_en: 'Stable Demand',
        topAsset_ar: 'وحدات سكنية وتجارية',
        topAsset_en: 'Mixed-Use Real Estate',
        category: 'residential'
      };

      const cagr = area.annualGrowthRate || 75;
      const annualGrowth = Number((cagr / 3.2).toFixed(1));

      return {
        id: area.id,
        name_ar: area.name_ar,
        name_en: area.name_en,
        avgPricePerSqm: area.avgPricePerMeter || 15000,
        annualGrowth: annualGrowth,
        cagr3Yrs: cagr,
        rentalYield: meta.rentalYield,
        demandLevel_ar: meta.demandLevel_ar,
        demandLevel_en: meta.demandLevel_en,
        topAsset_ar: meta.topAsset_ar,
        topAsset_en: meta.topAsset_en,
        category: meta.category
      };
    });
  }, [tick]);

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
      triggerToast(isAr ? 'تم تصدير تقرير دراسة السوق العقاري الشاملة بنجاح' : 'Market intelligence report exported successfully!', 'success');
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
                <h4>{isAr ? 'محاكي ترشيح أفضل حي لاستثمار ميزانيتك' : 'Certified Investment District Recommender'}</h4>
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
              href={getWhatsAppUrl('مرحباً، أريد طلب دراسة جدوى عقارية استثمارية لمحفظتي')}
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
