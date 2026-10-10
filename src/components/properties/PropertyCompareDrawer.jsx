import { useState, useMemo } from 'react';
import { X, Trash2, ShieldCheck, Share2, Star, Download, Building2, Calendar, Maximize2, Minimize2, Calculator, Sparkles, Award, Plus, PhoneCall, Scale } from 'lucide-react';
import { Link } from 'react-router-dom';
import { trackEvent } from '../../utils/visitorTracker';
import { generateComparePdf } from '../../utils/comparePdfGenerator';
import useClientDownload from '../../hooks/useClientDownload';

import { getWhatsAppUrl, getDynamicPhone } from '../../utils/founderCmsData';
import { isMultiUnitOrBuilding } from '../../utils/currencyAndBenchmark';
import CompareColumn from './CompareColumn';
import CompareDuel from './CompareDuel';

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
  const download = useClientDownload();
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
      // Best Price Per Meter: only for single units, skip multi-unit buildings where price is for entire multi-floor structure
      const isMulti = isMultiUnitOrBuilding(p);
      const ppm = !isMulti && (p.pricePerMeter || (p.size ? Math.round(p.price / p.size) : Infinity));
      if (ppm && ppm < minPpm) {
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
      // Rank by what the legal record actually contains (registered title > any reviewed record > none)
      const legalScore = p.legalStatus?.ownershipType_ar?.includes('مسجل') ? 2 : p.legalStatus ? 1 : 0;
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

  // 1.5. Focused 1v1 Dual Comparison Duel Breakdown (When exactly 2 properties are compared)
  const dualDiff = useMemo(() => {
    if (compareList.length !== 2) return null;
    const [p1, p2] = compareList;
    const priceDiff = Math.abs(p1.price - p2.price);
    const ppm1 = p1.pricePerMeter || (p1.size ? Math.round(p1.price / p1.size) : 0);
    const ppm2 = p2.pricePerMeter || (p2.size ? Math.round(p2.price / p2.size) : 0);
    // Price per m² only compares when both listings have an area; 0 is "unknown", not "cheapest"
    const ppmComparable = ppm1 > 0 && ppm2 > 0;
    const ppmDiff = ppmComparable ? Math.abs(ppm1 - ppm2) : 0;
    const sizeDiff = Math.abs((Number(p1.size) || 0) - (Number(p2.size) || 0));
    const monthlyDiff = Math.abs((Number(p1.monthlyInstallment) || 0) - (Number(p2.monthlyInstallment) || 0));

    return {
      priceDiff,
      ppmDiff,
      sizeDiff,
      monthlyDiff,
      cheaperId: p1.price !== p2.price ? (p1.price < p2.price ? p1.id : p2.id) : null,
      largerId: (Number(p1.size) || 0) !== (Number(p2.size) || 0) ? ((Number(p1.size) || 0) > (Number(p2.size) || 0) ? p1.id : p2.id) : null,
      betterPpmId: ppmComparable && ppm1 !== ppm2 ? (ppm1 < ppm2 ? p1.id : p2.id) : null,
      lowerMonthlyId: (Number(p1.monthlyInstallment) || Infinity) < (Number(p2.monthlyInstallment) || Infinity) ? p1.id : p2.id,
      p1,
      p2,
      ppm1,
      ppm2
    };
  }, [compareList]);

  const handleDownloadPdf = () => {
    if (compareList.length === 0) return;
    download({ kind: 'compare_pdf', itemTitle: compareList.map((p) => p.title_ar || p.title_en || p.id).join(' / ') }, () => {
      generateComparePdf(compareList, lang);
      trackEvent('compare_downloaded_pdf', { count: compareList.length });
    });
  };

  const handleShareWhatsApp = () => {
    if (compareList.length === 0) return;
    let msg = isAr 
      ? `⚖️ *جدول مقارنة العقارات المختارة — 1Line Real Estate Sohag*\n\n`
      : `⚖️ *Property Comparison Matrix — 1Line Real Estate Sohag*\n\n`;

    compareList.forEach((p, idx) => {
      const title = isAr ? p.title_ar : p.title_en;
      const loc = isAr ? p.locationName_ar : p.locationName_en;
      msg += `📌 *الوحدة ${idx + 1}: ${title}*\n`;
      const isLand = p.type === 'land';
      const isCom = p.type === 'commercial' || p.category === 'commercial';
      const isOff = p.type === 'office' || p.category === 'administrative';
      let specsText;
      if (isLand) specsText = p.landType_ar || (isAr ? 'أرض استثمارية' : 'Land Plot');
      else if (isCom) specsText = p.commercialType_ar || (isAr ? 'محل تجاري واجهة' : 'Retail Shop');
      else if (isOff) specsText = p.adminType_ar || (isAr ? 'مقر إداري / عيادة' : 'Office/Clinic');
      else specsText = `${p.bedrooms || 0} ${isAr ? 'غرف' : 'Rooms'} / ${p.bathrooms || 0} ${isAr ? 'حمام' : 'Baths'}`;
      msg += `• المساحة: ${p.size} م² (${specsText})\n`;
      msg += `• المقدم: ${p.downPayment ? `${p.downPayment.toLocaleString('en-US')} ج.م` : 'كاش'}\n`;
      msg += `• القسط: ${p.monthlyInstallment ? `${p.monthlyInstallment.toLocaleString('en-US')} ج.م/شهرياً (${p.installmentYears || 0} سنوات)` : 'كاش فقط'}\n`;
      msg += `• الموقع: ${loc}\n`;
      // Only what the listing's legal review actually recorded; never a blanket guarantee
      const legalLine = p.legalStatus
        ? [p.legalStatus.ownershipType_ar, p.legalStatus.licenseStatus_ar].filter(Boolean).join(' • ')
        : '';
      msg += `• الموقف القانوني: ${legalLine || 'نراجع معك المستندات قبل التعاقد'}\n`;
      msg += `• الرابط: ${window.location.origin}/properties/${p.id}\n\n`;
    });

    msg += isAr 
      ? `🏛️ صادر عن منصة 1Line Solutions العقارية بسوهاج\n📞 للاستفسار وحجز معاينة مجمعة: ${getDynamicPhone()}` 
      : `🏛️ Issued by 1Line Solutions Sohag\n📞 For Inquiries & Group Tour: ${getDynamicPhone()}`;

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

  // Direct VIP joint viewing tour for the two compared properties
  const handleBookDualTour = () => {
    if (!dualDiff) return;
    const { p1, p2 } = dualDiff;
    const title1 = isAr ? p1.title_ar : p1.title_en;
    const title2 = isAr ? p2.title_ar : p2.title_en;
    const msg = isAr
      ? `مرحباً 1Line، أرغب في حجز جولة معاينة ميدانية مشتركة للمفاضلة بين هذين العقارين:\n1. ${title1} (كود #${p1.id})\n2. ${title2} (كود #${p2.id})\n\nأرجو من المستشار العقاري التنسيق معي لاختيار الأنسب استثمارياً.`
      : `Hello 1Line, I would like to schedule a joint viewing tour to compare these two properties:\n1. ${title1} (ID #${p1.id})\n2. ${title2} (ID #${p2.id})\n\nPlease connect me with an advisor.`;
    window.open(getWhatsAppUrl(msg), '_blank');
    trackEvent('compare_booked_dual_tour', { p1: p1.id, p2: p2.id });
  };

  if (!isOpen) return null;

  return (
    <div className={`compare-drawer-backdrop ${isFullscreen ? 'fullscreen-mode' : ''}`} onClick={onClose} dir={isAr ? 'rtl' : 'ltr'}>
      <div 
        className={`compare-drawer-panel luxury-compare-panel ${isFullscreen ? 'is-fullscreen' : ''}`} 
        onClick={(e) => e.stopPropagation()}
      >
        {/* 1. Header Bar */}
        {/* 1. Header Bar */}
        <div className="compare-drawer-header">
          <div className="compare-drawer-header-top">
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

            <button type="button" className="drawer-close-btn hide-desktop" onClick={onClose} title={isAr ? 'إغلاق' : 'Close'}>
              <X size={18} />
            </button>
          </div>

          <div className="compare-header-actions">
            {/* My Account Hub Link */}
            <Link 
              to="/my-account" 
              className="btn btn-sm btn-outline hide-mobile"
              onClick={onClose}
              title={isAr ? 'عرض في حسابي الخاص' : 'Open in My Account'}
              style={{
                borderColor: 'rgba(212, 175, 55, 0.35)',
                color: 'var(--luxury-gold, #d4af37)'
              }}
            >
              <Scale size={13} />
              <span>{isAr ? 'عرض في حسابي' : 'My Account'}</span>
            </Link>

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

            <button type="button" className="drawer-close-btn hide-mobile" onClick={onClose} title={isAr ? 'إغلاق' : 'Close'}>
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
                    {isAr ? 'أسهل قسط شهري:' : 'Lowest Monthly:'} <strong>{compareList.find(p => p.id === verdicts.lowestMonthlyId)?.monthlyInstallment?.toLocaleString('en-US')} ج.م</strong>
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
            <>
              {/* 🏛️ 1v1 Dual Comparison Duel Spotlight (When exactly 2 properties are compared) */}
              {dualDiff && (
                <CompareDuel
                  dualDiff={dualDiff}
                  handleBookDualTour={handleBookDualTour}
                  isAr={isAr}
                />
              )}

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
                      <div className="compare-cell label-cell">{isAr ? 'التصنيف والمواصفات' : 'Rooms & Specs'}</div>
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
                {compareList.map((prop) => (
                  <CompareColumn key={prop.id} prop={prop} isAr={isAr} lang={lang} currency={currency} verdicts={verdicts} customDownPercent={customDownPercent} onRemoveFromCompare={onRemoveFromCompare} activeTab={activeTab} setCustomDownPercent={setCustomDownPercent} onClose={onClose} />
                ))}

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
                                      {p.price.toLocaleString('en-US')} {isAr ? 'ج.م' : 'EGP'}
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
            </>
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
