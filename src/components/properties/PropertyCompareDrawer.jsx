import { useState, useMemo } from 'react';
import { 
  X, 
  Trash2, 
  ShieldCheck, 
  ExternalLink, 
  Share2, 
  Star, 
  Download,
  Check,
  Building2,
  Calendar,
  Maximize2,
  Minimize2,
  Calculator,
  Sliders,
  Sparkles,
  MapPin,
  FileCheck2,
  Award,
  Plus,
  PhoneCall
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { trackEvent } from '../../utils/visitorTracker';
import { generateComparePdf } from '../../utils/comparePdfGenerator';
import { formatCurrencyPrice, getPriceBenchmark, getDistrictBenchmark } from '../../utils/currencyAndBenchmark';
import { getWhatsAppUrl } from '../../utils/founderCmsData';

export default function PropertyCompareDrawer({
  isOpen,
  onClose,
  compareList = [],
  onRemoveFromCompare,
  onClearCompare,
  onAddToCompare,
  availableProperties = [],
  lang = 'ar',
  currency = 'EGP'
}) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'financial' | 'specs' | 'legal'
  const [customDownPercent, setCustomDownPercent] = useState(20); // 20% simulator
  const [showAddSelector, setShowAddSelector] = useState(false);
  const [selectorSearch, setSelectorSearch] = useState('');

  const isAr = lang === 'ar';
  const maxCompare = 4;

  // 1. AI Smart Verdicts & Winner Calculations
  const verdicts = useMemo(() => {
    if (compareList.length < 2) return { bestPpmId: null, largestAreaId: null, lowestMonthlyId: null, topLegalId: null };

    let minPpm = Infinity;
    let bestPpmId = null;

    let maxSize = -1;
    let largestAreaId = null;

    let minMonthly = Infinity;
    let lowestMonthlyId = null;

    let maxLegalScore = -1;
    let topLegalId = null;

    compareList.forEach((p) => {
      // Best Price Per Meter
      const ppm = p.pricePerMeter || (p.size ? Math.round(p.price / p.size) : Infinity);
      if (ppm < minPpm) {
        minPpm = ppm;
        bestPpmId = p.id;
      }

      // Largest Area
      const sz = Number(p.size) || 0;
      if (sz > maxSize) {
        maxSize = sz;
        largestAreaId = p.id;
      }

      // Lowest Monthly Installment
      const monthly = Number(p.monthlyInstallment) || Infinity;
      if (monthly > 0 && monthly < minMonthly) {
        minMonthly = monthly;
        lowestMonthlyId = p.id;
      }

      // Legal Score
      const legalScore = p.legalStatus?.safetyScore || (p.legalStatus?.ownershipType_ar?.includes('مسجل') ? 100 : 80);
      if (legalScore > maxLegalScore) {
        maxLegalScore = legalScore;
        topLegalId = p.id;
      }
    });

    return { bestPpmId, largestAreaId, lowestMonthlyId, topLegalId, maxSize };
  }, [compareList]);

  // Filter available properties for in-modal adder
  const addableProperties = useMemo(() => {
    if (!availableProperties || availableProperties.length === 0) return [];
    const currentIds = new Set(compareList.map(p => p.id));
    return availableProperties.filter(p => {
      if (currentIds.has(p.id)) return false;
      if (p.isDeleted || p.status === 'trash' || p.status === 'hidden') return false;
      if (!selectorSearch.trim()) return true;
      const q = selectorSearch.toLowerCase();
      const titleAr = (p.title_ar || '').toLowerCase();
      const titleEn = (p.title_en || '').toLowerCase();
      const loc = (p.locationName_ar || '').toLowerCase();
      return titleAr.includes(q) || titleEn.includes(q) || loc.includes(q);
    }).slice(0, 8);
  }, [availableProperties, compareList, selectorSearch]);

  if (!isOpen) return null;

  const handleDownloadPdf = () => {
    if (compareList.length === 0) return;
    generateComparePdf(compareList, lang);
    trackEvent('compare_downloaded_pdf', { count: compareList.length });
  };

  const handleShareWhatsApp = () => {
    if (compareList.length === 0) return;
    let msg = isAr 
      ? `⚖️ *جدول مقارنة العقارات المختارة — 1Line Real Estate Sohag*\n\n`
      : `⚖️ *Property Comparison Matrix — 1Line Real Estate Sohag*\n\n`;

    compareList.forEach((p, idx) => {
      const title = isAr ? p.title_ar : p.title_en;
      const loc = isAr ? p.locationName_ar : p.locationName_en;
      const ppm = p.pricePerMeter || (p.size ? Math.round(p.price / p.size) : 0);
      msg += `📌 *الوحدة ${idx + 1}: ${title}*\n`;
      msg += `• السعر: ${p.price.toLocaleString()} ج.م\n`;
      msg += `• سعر المتر: ${ppm.toLocaleString()} ج.م/م²\n`;
      msg += `• المساحة: ${p.size} م² (${p.bedrooms || 0} غرف / ${p.bathrooms || 0} حمام)\n`;
      msg += `• المقدم: ${p.downPayment ? `${p.downPayment.toLocaleString()} ج.م` : 'كاش'}\n`;
      msg += `• القسط: ${p.monthlyInstallment ? `${p.monthlyInstallment.toLocaleString()} ج.م/شهرياً (${p.installmentYears || 0} سنوات)` : 'كاش فقط'}\n`;
      msg += `• الموقع: ${loc}\n`;
      msg += `• الموقف القانوني: عقد مسجل وشهر عقاري معتمد 100%\n`;
      msg += `• الرابط: ${window.location.origin}/properties/${p.id}\n\n`;
    });

    msg += isAr 
      ? `🏛️ صادر عن منصة 1Line Solutions العقارية بسوهاج\n📞 للاستفسار وحجز معاينة مجمعة: +20 101 234 5678` 
      : `🏛️ Issued by 1Line Solutions Sohag\n📞 For Inquiries & Group Tour: +20 101 234 5678`;

    trackEvent('compare_shared_whatsapp', { count: compareList.length });
    const waUrl = `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(waUrl, '_blank');
  };

  // Group viewing tour via WhatsApp
  const handleBookGroupTour = () => {
    if (compareList.length === 0) return;
    const propTitles = compareList.map((p, i) => `${i + 1}. ${isAr ? p.title_ar : p.title_en} (${p.locationName_ar || ''})`).join('\n');
    const msg = isAr
      ? `مرحباً 1Line، أرغب في حجز موعد معاينة ميدانية مجمعة للوحدات التالية التي قمت بمقارنتها:\n\n${propTitles}\n\nيرجى التنسيق معي وتحديد أنسب موعد.`
      : `Hello 1Line, I would like to schedule a viewing tour for these compared properties:\n\n${propTitles}\n\nPlease contact me.`;

    const waUrl = getWhatsAppUrl(msg);
    trackEvent('compare_booked_group_tour', { count: compareList.length });
    window.open(waUrl, '_blank');
  };

  return (
    <div className={`compare-drawer-backdrop ${isFullscreen ? 'fullscreen-mode' : ''}`} onClick={onClose} dir={isAr ? 'rtl' : 'ltr'}>
      <div 
        className={`compare-drawer-panel luxury-compare-panel ${isFullscreen ? 'is-fullscreen' : ''}`} 
        onClick={(e) => e.stopPropagation()}
      >
        {/* 1. Header Bar */}
        <div className="compare-drawer-header">
          <div className="compare-header-title">
            <div className="compare-header-badge-icon">
              <Award size={20} className="text-gold" />
            </div>
            <div>
              <h3>{isAr ? 'أداة مقارنة العقارات الذكية' : 'Smart Property Comparison Matrix'}</h3>
              <p className="compare-header-sub">
                {isAr 
                  ? 'مقارنة تفصيلية دقيقة بين المواصفات المعمارية، أسعار المتر، خطط السداد ومؤشرات الأمان' 
                  : 'Multi-dimensional side-by-side comparison of specs, prices, benchmarks & payment plans'}
              </p>
            </div>
            <span className="compare-count-tag">
              {compareList.length} / {maxCompare}
            </span>
          </div>

          <div className="compare-header-actions">
            {/* Fullscreen Toggle */}
            <button
              type="button"
              className="btn btn-sm btn-outline hide-mobile"
              onClick={() => setIsFullscreen(!isFullscreen)}
              title={isFullscreen ? (isAr ? 'تصغير العرض' : 'Collapse') : (isAr ? 'عرض بكامل الشاشة' : 'Fullscreen')}
            >
              {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
              <span>{isFullscreen ? (isAr ? 'نافذة مصغرة' : 'Compact') : (isAr ? 'كامل الشاشة' : 'Fullscreen')}</span>
            </button>

            {compareList.length > 0 && (
              <button 
                type="button" 
                className="btn btn-sm btn-compare-action-pdf" 
                onClick={handleDownloadPdf}
                title={isAr ? 'تحميل جدول المقارنة بصيغة PDF' : 'Download Comparison PDF'}
              >
                <Download size={13} className="text-gold" />
                <span>{isAr ? 'تحميل PDF' : 'PDF Report'}</span>
              </button>
            )}

            {compareList.length > 0 && (
              <button 
                type="button" 
                className="btn btn-sm btn-outline btn-compare-share-wa" 
                onClick={handleShareWhatsApp}
                title={isAr ? 'مشاركة جدول المقارنة عبر الواتساب' : 'Share on WhatsApp'}
              >
                <Share2 size={13} />
                <span>{isAr ? 'مشاركة' : 'Share'}</span>
              </button>
            )}

            {compareList.length > 0 && (
              <button type="button" className="btn-clear-compare" onClick={onClearCompare}>
                <Trash2 size={14} />
                <span>{isAr ? 'مسح الكل' : 'Clear'}</span>
              </button>
            )}

            <button type="button" className="drawer-close-btn" onClick={onClose} title={isAr ? 'إغلاق' : 'Close'}>
              <X size={18} />
            </button>
          </div>
        </div>

        {/* 2. Interactive Navigation Tabs & Dimension Filter */}
        {compareList.length > 0 && (
          <div className="compare-tabs-bar">
            <button
              type="button"
              className={`compare-tab-btn ${activeTab === 'all' ? 'active' : ''}`}
              onClick={() => setActiveTab('all')}
            >
              <Sparkles size={14} />
              <span>{isAr ? 'المقارنة الشاملة (الكل)' : 'Full Matrix'}</span>
            </button>

            <button
              type="button"
              className={`compare-tab-btn ${activeTab === 'financial' ? 'active' : ''}`}
              onClick={() => setActiveTab('financial')}
            >
              <Calculator size={14} />
              <span>{isAr ? 'الأسعار وأنظمة السداد' : 'Pricing & Payment'}</span>
            </button>

            <button
              type="button"
              className={`compare-tab-btn ${activeTab === 'specs' ? 'active' : ''}`}
              onClick={() => setActiveTab('specs')}
            >
              <Building2 size={14} />
              <span>{isAr ? 'المواصفات والمساحة' : 'Specs & Area'}</span>
            </button>

            <button
              type="button"
              className={`compare-tab-btn ${activeTab === 'legal' ? 'active' : ''}`}
              onClick={() => setActiveTab('legal')}
            >
              <ShieldCheck size={14} />
              <span>{isAr ? 'الأمان والوضع القانوني' : 'Legal Verification'}</span>
            </button>
          </div>
        )}

        {/* 3. AI Verdict Top Ribbon (When 2+ properties compared) */}
        {compareList.length >= 2 && (
          <div className="compare-ai-verdict-ribbon">
            <div className="verdict-label">
              <Sparkles size={14} className="text-gold" />
              <span>{isAr ? 'مؤشرات الذكاء العقاري 1Line:' : '1Line Smart AI Insights:'}</span>
            </div>
            <div className="verdict-chips-row">
              {verdicts.bestPpmId && (
                <div className="verdict-chip best-value">
                  <Star size={12} />
                  <span>
                    {isAr ? 'أفضل سعر للمتر:' : 'Best Value / m²:'} <strong>{compareList.find(p => p.id === verdicts.bestPpmId)?.title_ar?.split('-')[0] || ''}</strong>
                  </span>
                </div>
              )}
              {verdicts.largestAreaId && (
                <div className="verdict-chip largest-space">
                  <Maximize2 size={12} />
                  <span>
                    {isAr ? 'أكبر مساحة:' : 'Largest Space:'} <strong>{compareList.find(p => p.id === verdicts.largestAreaId)?.size} م²</strong>
                  </span>
                </div>
              )}
              {verdicts.lowestMonthlyId && (
                <div className="verdict-chip lowest-installment">
                  <Calendar size={12} />
                  <span>
                    {isAr ? 'أسهل قسط شهري:' : 'Lowest Monthly:'} <strong>{compareList.find(p => p.id === verdicts.lowestMonthlyId)?.monthlyInstallment?.toLocaleString()} ج.م</strong>
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 4. Main Comparison Body */}
        <div className="compare-drawer-body luxury-scrollbar">
          {compareList.length === 0 ? (
            <div className="compare-empty-state">
              <div className="empty-icon-shield">
                <Award size={48} className="text-gold" />
              </div>
              <h4>{isAr ? 'لم تختر أي عقارات للمقارنة بعد' : 'No properties in comparison yet'}</h4>
              <p>
                {isAr 
                  ? 'تصفح قائمة العقارات واضغط على أيقونة الميزان ⚖️ لإضافة حتى 4 عقارات ومقارنتها هنا لحظياً.' 
                  : 'Explore listings and click the scale icon ⚖️ to add up to 4 units for live side-by-side analysis.'}
              </p>
              <button
                type="button"
                className="btn btn-primary"
                onClick={onClose}
              >
                <span>{isAr ? 'استكشاف العقارات الآن' : 'Browse Properties'}</span>
              </button>
            </div>
          ) : (
            <div className="compare-grid-matrix-container">
              <div 
                className="compare-grid-matrix" 
                style={{ 
                  gridTemplateColumns: `210px repeat(${compareList.length + (compareList.length < maxCompare && onAddToCompare ? 1 : 0)}, minmax(240px, 1fr))` 
                }}
              >
                {/* Column 0: Sticky Row Labels Column */}
                <div className="compare-labels-col">
                  {/* Header Spacer */}
                  <div className="compare-cell cell-header label-cell">
                    <span className="label-heading">{isAr ? 'المعيار / العقار' : 'Criteria / Property'}</span>
                  </div>

                  {/* Section: Overview & Pricing */}
                  {(activeTab === 'all' || activeTab === 'financial') && (
                    <>
                      <div className="compare-section-divider-label">
                        <span>💰 {isAr ? 'البيانات المالية والأسعار' : 'Pricing & Financials'}</span>
                      </div>
                      <div className="compare-cell label-cell">{isAr ? 'السعر الإجمالي' : 'Total Price'}</div>
                      <div className="compare-cell label-cell">{isAr ? 'سعر المتر المربع' : 'Price / m²'}</div>
                      <div className="compare-cell label-cell">{isAr ? 'مؤشر سعر الحي بسوهاج' : 'District Benchmark'}</div>
                      <div className="compare-cell label-cell">{isAr ? 'المقدم المطلوب' : 'Downpayment'}</div>
                      <div className="compare-cell label-cell">{isAr ? 'القسط الشهري' : 'Monthly Installment'}</div>
                      <div className="compare-cell label-cell">{isAr ? 'مدة التقسيط' : 'Installment Period'}</div>
                    </>
                  )}

                  {/* Section: Interactive Financing Simulator */}
                  {(activeTab === 'all' || activeTab === 'financial') && (
                    <>
                      <div className="compare-section-divider-label highlight-sim">
                        <span>🧮 {isAr ? 'محاكي التقسيط التفاعلي' : 'Installment Simulator'}</span>
                      </div>
                      <div className="compare-cell label-cell" style={{ minHeight: '62px' }}>
                        <span>{isAr ? `مقدم مفترض (${customDownPercent}%)` : `Est. Downpayment (${customDownPercent}%)`}</span>
                      </div>
                      <div className="compare-cell label-cell" style={{ minHeight: '62px' }}>
                        <span>{isAr ? 'القسط المقدر شهرياً' : 'Est. Monthly Payment'}</span>
                      </div>
                    </>
                  )}

                  {/* Section: Specs & Architecture */}
                  {(activeTab === 'all' || activeTab === 'specs') && (
                    <>
                      <div className="compare-section-divider-label">
                        <span>📐 {isAr ? 'المواصفات المعمارية' : 'Architectural Specs'}</span>
                      </div>
                      <div className="compare-cell label-cell">{isAr ? 'المساحة الصافية' : 'Total Space'}</div>
                      <div className="compare-cell label-cell">{isAr ? 'الغرف والحمامات' : 'Bedrooms & Baths'}</div>
                      <div className="compare-cell label-cell">{isAr ? 'الدور والارتفاع' : 'Floor Level'}</div>
                      <div className="compare-cell label-cell">{isAr ? 'مستوى التشطيب' : 'Finishing Quality'}</div>
                      <div className="compare-cell label-cell">{isAr ? 'الواجهة والإطلالة' : 'Facade & View'}</div>
                      <div className="compare-cell label-cell">{isAr ? 'حالة الاستلام' : 'Handover Status'}</div>
                    </>
                  )}

                  {/* Section: Legal & Verification */}
                  {(activeTab === 'all' || activeTab === 'legal') && (
                    <>
                      <div className="compare-section-divider-label">
                        <span>🛡️ {isAr ? 'الأمان والفحص القانوني' : 'Legal Audit & Security'}</span>
                      </div>
                      <div className="compare-cell label-cell">{isAr ? 'سند الملكية والشهر العقاري' : 'Deed & Registry'}</div>
                      <div className="compare-cell label-cell">{isAr ? 'رخصة البناء ونموذج 10' : 'License & Form 10'}</div>
                      <div className="compare-cell label-cell">{isAr ? 'الحصة في الأرض' : 'Land Share'}</div>
                      <div className="compare-cell label-cell">{isAr ? 'مؤشر الأمان القانوني' : 'Legal Safety Score'}</div>
                    </>
                  )}

                  {/* Section: Location & Actions */}
                  <div className="compare-section-divider-label">
                    <span>📍 {isAr ? 'الموقع والإجراءات' : 'Location & Actions'}</span>
                  </div>
                  <div className="compare-cell label-cell">{isAr ? 'المنطقة في سوهاج' : 'District Location'}</div>
                  <div className="compare-cell cell-footer label-cell">{isAr ? 'الإجراء المباشر' : 'Actions'}</div>
                </div>

                {/* Property Columns */}
                {compareList.map((prop) => {
                  const title = isAr ? prop.title_ar : prop.title_en;
                  const location = isAr ? prop.locationName_ar : prop.locationName_en;
                  const finishing = isAr ? prop.finishing_ar : prop.finishing_en;
                  const ppm = prop.pricePerMeter || (prop.size ? Math.round(prop.price / prop.size) : 0);
                  const benchmark = getPriceBenchmark(prop, lang);
                  const priceData = formatCurrencyPrice(prop.price, currency, lang);
                  const isBestPpm = prop.id === verdicts.bestPpmId;
                  const isLargest = prop.id === verdicts.largestAreaId;
                  const isLowestMonthly = prop.id === verdicts.lowestMonthlyId;
                  const isTopLegal = prop.id === verdicts.topLegalId;

                  // Simulator Math
                  const simDownVal = Math.round((prop.price * customDownPercent) / 100);
                  const simYears = prop.installmentYears || 5;
                  const simMonthlyVal = Math.round((prop.price - simDownVal) / (simYears * 12));

                  // Area relative bar percentage
                  const maxArea = verdicts.maxSize || 1;
                  const areaPercent = Math.min(100, Math.round(((Number(prop.size) || 0) / maxArea) * 100));

                  return (
                    <div key={prop.id} className="compare-property-col">
                      {/* Top Header Box */}
                      <div className="compare-cell cell-header">
                        <button
                          type="button"
                          className="remove-compare-item-btn"
                          onClick={() => onRemoveFromCompare(prop.id)}
                          title={isAr ? 'إزالة من المقارنة' : 'Remove'}
                        >
                          <X size={14} />
                        </button>

                        {/* Top Winner Tag */}
                        {isBestPpm && (
                          <div className="prop-winner-badge best-ppm">
                            <Star size={11} />
                            <span>{isAr ? 'أفضل سعر للمتر' : 'Best Value / m²'}</span>
                          </div>
                        )}
                        {!isBestPpm && isLargest && (
                          <div className="prop-winner-badge largest-area">
                            <Maximize2 size={11} />
                            <span>{isAr ? 'أكبر مساحة' : 'Largest Area'}</span>
                          </div>
                        )}
                        {!isBestPpm && !isLargest && isLowestMonthly && (
                          <div className="prop-winner-badge lowest-pay">
                            <Calendar size={11} />
                            <span>{isAr ? 'أقل قسط' : 'Lowest Pay'}</span>
                          </div>
                        )}

                        <div className="compare-thumb-wrap">
                          <img 
                            src={prop.images && prop.images[0] ? prop.images[0] : ''} 
                            alt={title} 
                            className="compare-thumb" 
                          />
                        </div>
                        <h4 className="compare-prop-title" title={title}>{title}</h4>
                      </div>

                      {/* Pricing Section */}
                      {(activeTab === 'all' || activeTab === 'financial') && (
                        <>
                          <div className="compare-section-divider-spacer" />

                          {/* Total Price */}
                          <div className="compare-cell highlight-gold">
                            <strong className="cell-price-big">
                              {priceData.primary} {priceData.symbol}
                            </strong>
                          </div>

                          {/* Price Per SqM */}
                          <div className="compare-cell">
                            <span className={`cell-ppm-val ${isBestPpm ? 'text-gold fw-bold' : ''}`}>
                              {ppm.toLocaleString()} {isAr ? 'ج.م / م²' : 'EGP / m²'}
                            </span>
                          </div>

                          {/* Benchmark Comparison */}
                          <div className="compare-cell">
                            {benchmark ? (
                              <div 
                                className="benchmark-badge-compare" 
                                style={{ background: benchmark.badgeBg, color: benchmark.badgeColor }}
                              >
                                {benchmark.badgeLabel}
                              </div>
                            ) : (
                              <span className="text-muted">{isAr ? 'سعر عادل ومعتمد' : 'Standard Market Rate'}</span>
                            )}
                          </div>

                          {/* Downpayment */}
                          <div className="compare-cell">
                            {prop.downPayment ? (
                              <span className="fw-semibold">
                                {prop.downPayment.toLocaleString()} {isAr ? 'ج.م' : 'EGP'}
                                <span className="text-muted" style={{ fontSize: '0.75rem', marginRight: '4px' }}>
                                  ({Math.round((prop.downPayment / prop.price) * 100)}%)
                                </span>
                              </span>
                            ) : (
                              <span className="text-muted">{isAr ? 'كاش / تفاوض' : 'Cash / Special'}</span>
                            )}
                          </div>

                          {/* Monthly Installment */}
                          <div className="compare-cell highlight-blue">
                            {prop.monthlyInstallment ? (
                              <strong className="text-emerald">
                                {prop.monthlyInstallment.toLocaleString()} {isAr ? 'ج.م/شهر' : 'EGP/mo'}
                              </strong>
                            ) : (
                              <span className="text-muted">{isAr ? 'غير متاح (كاش)' : 'N/A (Cash only)'}</span>
                            )}
                          </div>

                          {/* Installment Years */}
                          <div className="compare-cell">
                            {prop.installmentYears ? (
                              <span>{prop.installmentYears} {isAr ? 'سنوات تقسيط مريح' : 'Years flexible'}</span>
                            ) : (
                              <span className="text-muted">{isAr ? 'سداد فوري كاش' : 'Cash on delivery'}</span>
                            )}
                          </div>
                        </>
                      )}

                      {/* Interactive Simulator Section */}
                      {(activeTab === 'all' || activeTab === 'financial') && (
                        <>
                          <div className="compare-section-divider-spacer" />

                          <div className="compare-cell highlight-simulator" style={{ minHeight: '62px' }}>
                            <div className="sim-cell-box">
                              <span className="sim-down-val">{simDownVal.toLocaleString()} {isAr ? 'ج.م' : 'EGP'}</span>
                              <div className="sim-slider-wrap">
                                <span className="sim-slider-pct">{customDownPercent}%</span>
                                <input 
                                  type="range" 
                                  min="10" 
                                  max="50" 
                                  step="5" 
                                  value={customDownPercent} 
                                  onChange={(e) => setCustomDownPercent(Number(e.target.value))}
                                  className="sim-range-input"
                                  title={isAr ? 'تغيير نسبة المقدم' : 'Adjust Downpayment %'}
                                />
                              </div>
                            </div>
                          </div>

                          <div className="compare-cell highlight-simulator" style={{ minHeight: '62px' }}>
                            <div className="sim-cell-box">
                              <span className="sim-monthly-val">~ {simMonthlyVal.toLocaleString()} {isAr ? 'ج.م/شهر' : 'EGP/mo'}</span>
                              <span className="sim-sub-note">
                                {isAr ? `على ${simYears} سنوات` : `over ${simYears} yrs`}
                              </span>
                            </div>
                          </div>
                        </>
                      )}

                      {/* Specs Section */}
                      {(activeTab === 'all' || activeTab === 'specs') && (
                        <>
                          <div className="compare-section-divider-spacer" />

                          {/* Space with visual bar */}
                          <div className="compare-cell">
                            <div className="area-cell-container">
                              <span className="area-number">{prop.size} {isAr ? 'م²' : 'm²'}</span>
                              <div className="area-progress-track">
                                <div 
                                  className="area-progress-fill" 
                                  style={{ width: `${areaPercent}%` }} 
                                />
                              </div>
                            </div>
                          </div>

                          {/* Bedrooms & Bathrooms */}
                          <div className="compare-cell">
                            <span>
                              {prop.bedrooms || 0} {isAr ? 'غرف' : 'Beds'} • {prop.bathrooms || 0} {isAr ? 'حمام' : 'Baths'}
                            </span>
                          </div>

                          {/* Floor */}
                          <div className="compare-cell">
                            <span>
                              {prop.floor ? (isAr ? `الدور ${prop.floor}` : `Floor ${prop.floor}`) : (isAr ? 'أرضي / متكرر' : 'Typical')}
                              {prop.totalFloors ? ` (${isAr ? `من أصل ${prop.totalFloors}` : `of ${prop.totalFloors}`})` : ''}
                            </span>
                          </div>

                          {/* Finishing */}
                          <div className="compare-cell">
                            <span className="finishing-chip-badge">
                              {finishing || (isAr ? 'سوبر لوكس' : 'Super Lux')}
                            </span>
                          </div>

                          {/* View & Facade */}
                          <div className="compare-cell">
                            <span>
                              {prop.features_ar?.find(f => f.includes('بحرية') || f.includes('نيل') || f.includes('واجهة') || f.includes('شارع')) 
                                || (isAr ? 'واجهة رئيسية مفتوحة' : 'Open Main Facade')}
                            </span>
                          </div>

                          {/* Delivery Status */}
                          <div className="compare-cell">
                            <span className={prop.completionStatus === 'ready' ? 'text-emerald fw-semibold' : 'text-amber'}>
                              {prop.completionStatus === 'ready' 
                                ? (isAr ? '✅ جاهز للاستلام الفوري' : '✅ Ready for Immediate Handover') 
                                : (isAr ? '🏗️ تحت الإنشاء' : '🏗️ Under Construction')}
                            </span>
                          </div>
                        </>
                      )}

                      {/* Legal Section */}
                      {(activeTab === 'all' || activeTab === 'legal') && (
                        <>
                          <div className="compare-section-divider-spacer" />

                          {/* Ownership Type */}
                          <div className="compare-cell text-emerald">
                            <div className="cell-legal-item">
                              <ShieldCheck size={14} className="legal-icon" />
                              <span>{prop.legalStatus?.ownershipType_ar || (isAr ? 'مسجل شهر عقاري موثق' : 'Certified Notary Deed')}</span>
                            </div>
                          </div>

                          {/* License */}
                          <div className="compare-cell">
                            <div className="cell-legal-item">
                              <FileCheck2 size={14} className="legal-icon text-gold" />
                              <span>{prop.legalStatus?.licenseStatus_ar || (isAr ? 'ترخيص رسمي + نموذج 10' : 'Licensed & Form 10')}</span>
                            </div>
                          </div>

                          {/* Land Share */}
                          <div className="compare-cell">
                            <span>{prop.legalStatus?.landShare_ar || (isAr ? 'حصة شائعة في الأرض مسجلة' : 'Proportional Land Share')}</span>
                          </div>

                          {/* Safety Score */}
                          <div className="compare-cell">
                            <span className="legal-score-pill">
                              🛡️ {prop.legalStatus?.safetyScore || 100}% {isAr ? 'أمان قانوني تام' : 'Legal Clearance'}
                            </span>
                          </div>
                        </>
                      )}

                      {/* Location & Action Section */}
                      <div className="compare-section-divider-spacer" />

                      {/* District Location */}
                      <div className="compare-cell text-muted">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <MapPin size={13} className="text-gold" />
                          <span>{location}</span>
                        </div>
                      </div>

                      {/* Action Cell */}
                      <div className="compare-cell cell-footer">
                        <Link
                          to={`/properties/${prop.id}`}
                          className="btn btn-primary btn-sm btn-full"
                          onClick={onClose}
                        >
                          <span>{isAr ? 'معاينة العقار' : 'View Unit'}</span>
                          <ExternalLink size={13} />
                        </Link>
                      </div>
                    </div>
                  );
                })}

                {/* Column N+1: Add Another Property Slot */}
                {compareList.length < maxCompare && onAddToCompare && (
                  <div className="compare-property-col add-slot-col">
                    <div className="compare-cell cell-header add-slot-header">
                      {!showAddSelector ? (
                        <button
                          type="button"
                          className="btn-add-prop-slot"
                          onClick={() => setShowAddSelector(true)}
                        >
                          <div className="add-slot-circle">
                            <Plus size={24} />
                          </div>
                          <span className="add-slot-text">
                            {isAr ? 'أضف عقاراً آخر للمقارنة' : 'Add Another Unit'}
                          </span>
                          <span className="add-slot-sub">
                            ({maxCompare - compareList.length} {isAr ? 'أماكن متبقية' : 'slots left'})
                          </span>
                        </button>
                      ) : (
                        <div className="add-selector-container">
                          <div className="add-selector-top">
                            <span>{isAr ? 'اختر عقاراً لإضافته:' : 'Select Property:'}</span>
                            <button
                              type="button"
                              className="selector-close-btn"
                              onClick={() => setShowAddSelector(false)}
                            >
                              <X size={14} />
                            </button>
                          </div>

                          <input
                            type="text"
                            placeholder={isAr ? 'ابحث بالاسم أو الحي...' : 'Search properties...'}
                            className="selector-search-input"
                            value={selectorSearch}
                            onChange={(e) => setSelectorSearch(e.target.value)}
                            autoFocus
                          />

                          <div className="selector-results-list luxury-scrollbar">
                            {addableProperties.map((p) => {
                              const t = isAr ? p.title_ar : p.title_en;
                              const loc = isAr ? p.locationName_ar : p.locationName_en;
                              return (
                                <div
                                  key={p.id}
                                  className="selector-item-card"
                                  onClick={() => {
                                    onAddToCompare(p);
                                    setShowAddSelector(false);
                                    setSelectorSearch('');
                                  }}
                                >
                                  <img src={p.images && p.images[0] ? p.images[0] : ''} alt={t} className="sel-item-thumb" />
                                  <div className="sel-item-info">
                                    <h5 className="sel-item-title">{t}</h5>
                                    <span className="sel-item-price">
                                      {p.price.toLocaleString()} {isAr ? 'ج.م' : 'EGP'}
                                    </span>
                                    <span className="sel-item-loc">{loc}</span>
                                  </div>
                                </div>
                              );
                            })}

                            {addableProperties.length === 0 && (
                              <div className="selector-empty">
                                {isAr ? 'لا توجد نتائج مطابقة' : 'No matching properties'}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Placeholder fill for remaining cells */}
                    <div className="add-slot-body-fill">
                      <p className="add-slot-hint">
                        {isAr 
                          ? 'قارن حتى 4 عقارات لتحديد أفضل سعر للمتر وأنظمة السداد الأكثر ملاءمة لميزانيتك' 
                          : 'Compare up to 4 properties to find the best deal for your investment'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 5. Sticky Bottom Action Bar */}
        {compareList.length > 0 && (
          <div className="compare-drawer-footer">
            <div className="footer-left-info">
              <span className="footer-lead-text">
                💡 {isAr 
                  ? `مقارنة نشطة لـ ${compareList.length} عقارات معتمدة في سوهاج` 
                  : `Active comparison for ${compareList.length} certified units in Sohag`}
              </span>
            </div>

            <div className="footer-right-actions">
              <button
                type="button"
                className="btn btn-emerald btn-book-group-tour"
                onClick={handleBookGroupTour}
              >
                <PhoneCall size={15} />
                <span>{isAr ? 'حجز جولة معاينة مجمعة لكافة الوحدات' : 'Book Multi-Unit Viewing Tour'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
