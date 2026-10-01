import { useState, useMemo, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { MapPin, BedDouble, Bath, Maximize2, Sparkles, CheckCircle2, Layers, Calendar, Phone, MessageSquare, ShieldCheck, Clock, TrendingUp, TrendingDown, Calculator, Navigation, ArrowRight, ArrowLeft, Store, Briefcase, Building, Video, Zap, Droplets, Copy, Sun, Moon, Scale, Flame } from 'lucide-react';
import { incrementPropertyView, getPropertyViews } from '../utils/visitorTracker';
import PropertyGallery from '../components/properties/PropertyGallery';
import MortgageRoiCalculator from '../components/calculators/MortgageRoiCalculator';
import PropertyCard from '../components/properties/PropertyCard';
import LegalAuditCard from '../components/properties/LegalAuditCard';
import WhatsAppAutomationBar from '../components/properties/WhatsAppAutomationBar';
import DepositModal from '../components/properties/DepositModal';
import NotFoundPage from './NotFoundPage';
import PriceBenchmarkIndicator from '../components/properties/PriceBenchmarkIndicator';
import NearbyAmenities from '../components/properties/NearbyAmenities';
import { getWhatsAppUrl, getPhoneCallUrl } from '../utils/founderCmsData';
import SunlightCompassWidget from '../components/properties/SunlightCompassWidget';
import HistoricalPriceChart from '../components/properties/HistoricalPriceChart';
import SocialStoryCardModal from '../components/properties/SocialStoryCardModal';
import { updatePageSeo, buildPropertySchema } from '../utils/seoHelper';
import { checkFormSpamProtection } from '../utils/securityShield';
import { formatCurrencyPrice, getPriceBenchmark } from '../utils/currencyAndBenchmark';
import BookingConfirmationModal from '../components/common/BookingConfirmationModal';
import { saveLead } from '../firebaseLazy';
import { useClientAuth } from '../context/ClientAuthContext';
import { useUIModal } from '../context/UIModalContext';
import FinancialBreakdown from '../components/properties/FinancialBreakdown';
import FamilyCostSplitter from '../components/family/FamilyCostSplitter';
import CommercialInsightsCard from '../components/commercial/CommercialInsightsCard';
import { getFamilyInfo, computeFinanceBreakdown } from '../utils/propertyInsights';
import { PROPERTY_TYPES } from '../data/propertiesData';
import { Users } from 'lucide-react';
import '../styles/expat-suite.css';

const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// "01012345678" / "1012345678" → +201012345678; "+9665…" / "009665…" kept international. null if invalid.
const normalizeBookingPhone = (raw) => {
  const s = String(raw || '')
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[\s\-().]/g, '');
  if (/^(\+|00)\d{8,15}$/.test(s)) return `+${s.replace(/^(\+|00)/, '')}`;
  if (/^01[0125]\d{8}$/.test(s)) return `+20${s.slice(1)}`;
  if (/^1[0125]\d{8}$/.test(s)) return `+20${s}`;
  return null;
};

// Office hours from siteConfig CONTACT: daily 10:00–22:00 Cairo time, closed Friday
const isOfficeOpenNow = () => {
  try {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Africa/Cairo', weekday: 'short', hour: 'numeric', hourCycle: 'h23' }).formatToParts(new Date());
    const day = parts.find((p) => p.type === 'weekday')?.value;
    const hour = Number(parts.find((p) => p.type === 'hour')?.value);
    return day !== 'Fri' && hour >= 10 && hour < 22;
  } catch {
    return false;
  }
};

export default function PropertyDetailPage({
  lang,
  currency = 'EGP',
  properties,
  favorites,
  onToggleFavorite,
  onQuickView,
  triggerToast,
  onAddNewLead
}) {
  const { id } = useParams();
  const { openRemoteInspection } = useUIModal();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'legal' | 'valuation' | 'financing'
  const [depositModalOpen, setDepositModalOpen] = useState(false);
  const [storyModalOpen, setStoryModalOpen] = useState(false);
  const [bookingConfirmationOpen, setBookingConfirmationOpen] = useState(false);
  const [confirmedBookingData, setConfirmedBookingData] = useState(null);
  // Real counter only (no invented baseline)
  const [, setViewsCount] = useState(() => (id ? getPropertyViews(id) || 0 : 0));

  // Deleted / hidden / draft listings are not public, even by direct link
  const isPublicListing = (p) => p && !p.isDeleted && !['trash', 'hidden', 'draft'].includes(p.status);

  // Find Property
  const property = useMemo(() => {
    const found = properties.find(p => p.id === id) || null;
    return isPublicListing(found) ? found : null;
  }, [properties, id]);

  // Smart Similar Properties recommendation (Same district first, fallback to same property type)
  const similarProperties = useMemo(() => {
    if (!property) return [];
    const pool = properties.filter((p) => p.id !== property.id && isPublicListing(p) && p.status !== 'sold');
    const sameArea = pool.filter((p) => p.areaKey === property.areaKey);
    if (sameArea.length >= 3) return sameArea.slice(0, 3);
    const sameType = pool.filter((p) => p.type === property.type && !sameArea.some(sa => sa.id === p.id));
    return [...sameArea, ...sameType].slice(0, 3);
  }, [properties, property]);

  const isAr = lang === 'ar';

  // 🌐 Inject Google Schema.org & Dynamic OpenGraph Meta Tags
  useEffect(() => {
    if (property) {
      const propTitle = isAr ? property.title_ar : property.title_en;
      const propDesc = isAr ? property.description_ar : property.description_en;
      const schema = buildPropertySchema(property, lang);

      updatePageSeo({
        title: propTitle,
        description: propDesc,
        image: property.image || (property.images && property.images[0]),
        url: `/properties/${property.id}`,
        type: 'article',
        price: property.price,
        schemaId: 'property-jsonld-schema',
        schema: schema
      });
    }
  }, [property, lang, isAr]);

  // Track Property View in Visitor Intelligence (scheduled asynchronously to avoid cascading renders)
  useEffect(() => {
    if (property?.id) {
      const updated = incrementPropertyView(property.id, property);
      if (updated) {
        requestAnimationFrame(() => {
          setViewsCount(updated);
        });
      }
    }
  }, [property?.id, property]);

  const { clientUser, isClientAuthenticated } = useClientAuth();

  // Booking Form State - auto-populated for verified clients
  const [bookingForm, setBookingForm] = useState({
    name: clientUser?.name || '',
    phone: clientUser?.whatsapp || clientUser?.phone || '',
    tourType: 'field', // 'field' | 'video'
    date: '',
    slot: 'evening',
    notes: ''
  });
  const [bookingSubmitted, setBookingSubmitted] = useState(false);
  const [isBookingSubmitting, setIsBookingSubmitting] = useState(false);
  const [hpField, setHpField] = useState('');
  const [phoneError, setPhoneError] = useState('');
  // The viewing form opens on demand so the sidebar leads with two clear actions
  const [showBookingForm, setShowBookingForm] = useState(false);

  // Prefill the booking form when the client signs in (adjusted during render, not in an effect)
  const [prefilledFor, setPrefilledFor] = useState(clientUser);
  if (prefilledFor !== clientUser) {
    setPrefilledFor(clientUser);
    if (clientUser) {
      setBookingForm((prev) => ({
        ...prev,
        name: prev.name || clientUser.name || '',
        phone: prev.phone || clientUser.whatsapp || clientUser.phone || ''
      }));
    }
  }

  if (!property) {
    return <NotFoundPage lang={lang} variant="property" />;
  }

  const title = isAr ? property.title_ar : property.title_en;
  const location = isAr ? property.locationName_ar : property.locationName_en;
  const finishing = isAr ? property.finishing_ar : property.finishing_en;
  const description = isAr ? property.description_ar : property.description_en;
  const features = isAr ? property.features_ar : property.features_en;
  const priceData = formatCurrencyPrice(property.price, currency, lang);
  const familyInfo = getFamilyInfo(property);
  // Licence line only from the reviewed legal record (CRM → الموقف القانوني)
  const licenseText = property.legalStatus
    ? (isAr ? property.legalStatus.licenseStatus_ar : (property.legalStatus.licenseStatus_en || property.legalStatus.licenseStatus_ar)) || ''
    : '';
  const deliveryText = property.deliveryYear
    ? String(property.deliveryYear)
    : property.completionStatus === 'ready'
      ? (isAr ? 'فوري — جاهز للاستلام' : 'Ready now')
      : (property.completionStatus === 'under_construction' || property.completionStatus === 'off_plan')
        ? (isAr ? 'تحت الإنشاء' : 'Under construction')
        : '';
  const officeOpen = isOfficeOpenNow();
  const financePlan = computeFinanceBreakdown(property)?.plan || null;
  const util = property.utilities || {};
  const utilityItems = [
    { key: 'electricity', Icon: Zap, label: isAr ? 'الكهرباء' : 'Electricity', value: util.electricity_ar },
    { key: 'water', Icon: Droplets, label: isAr ? 'المياه' : 'Water', value: util.water_ar },
    { key: 'gas', Icon: Flame, label: isAr ? 'الغاز' : 'Gas', value: util.gas_ar },
    { key: 'elevator', Icon: Building, label: isAr ? 'المصعد' : 'Elevator', value: util.elevator_ar },
    { key: 'parking', Icon: MapPin, label: isAr ? 'الجراج / الركن' : 'Parking', value: util.parking_ar }
  ].filter((u) => String(u.value || '').trim() !== '');
  const benchmark = getPriceBenchmark(property, lang);

  // Sector separation
  const isLand = property.type === 'land' || (title && title.includes('أرض'));
  const isCommercial = !isLand && (property.type === 'commercial' || property.category === 'commercial' || (title && (title.includes('محل') || title.includes('معرض') || title.includes('ريتيل') || title.includes('تجاري'))));
  const isOffice = !isLand && !isCommercial && (property.type === 'office' || property.category === 'administrative' || (title && (title.includes('مكتب') || title.includes('عيادة') || title.includes('إداري'))));

  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    if (isBookingSubmitting) return;

    // 🛡️ Anti-Bot & Spam Rate-Limit Shield
    const spamCheck = checkFormSpamProtection(hpField, 'property_inspection_booking');
    if (!spamCheck.allowed) {
      triggerToast(isAr ? spamCheck.message_ar : spamCheck.message_en, 'error');
      return;
    }

    if (!bookingForm.name || bookingForm.name.trim().length < 2) {
      triggerToast(isAr ? 'الرجاء إدخال اسمك (إلزامي)' : 'Please enter your name', 'error');
      return;
    }

    const fullPhone = normalizeBookingPhone(bookingForm.phone);
    if (!fullPhone) {
      setPhoneError(isAr ? 'اكتب رقم واتساب صحيح: 01XXXXXXXXX أو رقم دولي يبدأ بـ +' : 'Enter a valid WhatsApp number: 01XXXXXXXXX or an international number starting with +');
      return;
    }
    setPhoneError('');

    if (bookingForm.date && bookingForm.date < todayIso()) {
      triggerToast(isAr ? 'اختر تاريخاً من اليوم فصاعداً' : 'Pick today or a later date', 'error');
      return;
    }

    setIsBookingSubmitting(true);
    try {
      // Time-based reference: readable, and unique enough to find the request in the CRM
      const serialCode = `1L-${Date.now().toString(36).toUpperCase()}`;
      const isVideo = bookingForm.tourType === 'video';
      const slotAr = bookingForm.slot === 'morning' ? 'صباحاً (10 ص – 2 م)' : 'مساءً (5 م – 9 م)';
      const fullBookingRecord = {
        ...bookingForm,
        name: bookingForm.name.trim(),
        whatsapp: fullPhone,
        phone: fullPhone,
        propertyType: property.type || 'residential',
        area: property.areaKey || 'new_sohag',
        serialCode,
        propertyId: property.id,
        propertyTitle: title,
        propertyPrice: property.price,
        type: 'viewing_request',
        tourType: isVideo ? 'video' : 'field',
        source: 'طلب معاينة (صفحة العقار)',
        notes: `طلب ${isVideo ? 'معاينة فيديو حية' : 'معاينة ميدانية'} للعقار: ${title} (كود ${property.id.toUpperCase()}) | التاريخ: ${bookingForm.date || 'أقرب موعد'} | الفترة: ${slotAr} | المرجع: ${serialCode}`,
        createdAt: new Date().toISOString()
      };

      // Save lead to CRM & cloud with automatic deduplication
      if (typeof onAddNewLead === 'function') {
        await onAddNewLead(fullBookingRecord);
      } else {
        await saveLead(fullBookingRecord);
      }

      setConfirmedBookingData(fullBookingRecord);
      setBookingSubmitted(true);
      setBookingConfirmationOpen(true);
    } finally {
      setIsBookingSubmitting(false);
    }
  };

  return (
    <div className={`property-detail-page-wrapper ${isAr ? 'rtl-dir' : 'ltr-dir'}`} dir={isAr ? 'rtl' : 'ltr'}>
      {/* 🌟 SOVEREIGN DARK HERO SHOWCASE STAGE */}
      <section className="property-detail-hero-stage" aria-label={title}>
        <div className="detail-hero-ambient" aria-hidden="true" />
        <div className="detail-container">
          {/* Quick Back Navigation Bar */}
          <div className="page-top-back-bar">
            <button
              type="button"
              className="btn-back-step"
              onClick={() => {
                if (window.history.length > 1) {
                  navigate(-1);
                } else {
                  navigate('/properties');
                }
              }}
              title={isAr ? 'الرجوع خطوة للخلف' : 'Go back one step'}
            >
              {isAr ? <ArrowRight size={16} /> : <ArrowLeft size={16} />}
              <span>{isAr ? 'رجوع خطوة للخلف' : 'Back'}</span>
            </button>
            <div className="page-breadcrumb-sub">
              <Link to="/">{isAr ? 'الرئيسية' : 'Home'}</Link>
              <span className="crumb-sep">/</span>
              <Link to="/properties">{isAr ? 'العقارات' : 'Properties'}</Link>
              <span className="crumb-sep">/</span>
              <span className="crumb-current">{property.id.toUpperCase()}</span>
            </div>
          </div>

          {property.isDemo && (
            <div className="pd-demo-banner" role="note">
              <Sparkles size={16} aria-hidden="true" />
              <span>{isAr ? 'هذا عقار توضيحي لعرض إمكانيات المنصة، وليس معروضاً للبيع. تصفح العقارات المتاحة أو اطلب عقاراً بمواصفاتك.' : 'This is a sample listing that shows what the platform can do — it is not for sale.'}</span>
            </div>
          )}

          {/* Main Title & Price Header Banner */}
          <div className="detail-header-block">
            <div className="detail-title-col">
              <div className="detail-badges-row">
                {/* Only listings with a legal record carry the badge */}
                {property.legalStatus && (
                  <span className="status-pill-badge">
                    <CheckCircle2 size={13} style={{ flexShrink: 0 }} />
                    <span>{isAr ? 'مستندات مراجَعة' : 'Documents reviewed'}</span>
                  </span>
                )}
                <span className="type-pill-badge">
                  <Building size={13} style={{ flexShrink: 0 }} />
                  <span>
                    {(() => {
                      const t = PROPERTY_TYPES.find((x) => x.id === property.type);
                      return t ? (isAr ? t.name_ar : t.name_en) : property.type;
                    })()}
                  </span>
                </span>
                {property.badge_ar && (
                  <span className="gold-pill-badge">
                    <Sparkles size={13} style={{ flexShrink: 0 }} />
                    <span>{isAr ? property.badge_ar : property.badge_en}</span>
                  </span>
                )}
                <button 
                  type="button" 
                  className="code-copy-pill-btn" 
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(property.id.toUpperCase());
                      triggerToast(isAr ? `تم نسخ كود العقار: ${property.id.toUpperCase()}` : `Copied ID: ${property.id.toUpperCase()}`, 'success');
                    } catch {
                      triggerToast(isAr ? `كود العقار: ${property.id.toUpperCase()}` : `Property ID: ${property.id.toUpperCase()}`, 'info');
                    }
                  }}
                  title={isAr ? 'انقر لنسخ كود العقار' : 'Click to copy property ID'}
                >
                  <span className="code-id-txt">{property.id.toUpperCase()}</span>
                  <span className="copy-icon-txt"><Copy size={12} /></span>
                </button>
              </div>
              <h1 className="detail-main-title">{title}</h1>
              <div className="detail-location-text">
                <div className="detail-loc-label">
                  <MapPin size={16} className="loc-icon-gold" />
                  <span>{location}</span>
                </div>
                {property.coordinates?.lat && (
                  <a
                    href={`https://www.google.com/maps?q=${property.coordinates.lat},${property.coordinates.lng}+(${encodeURIComponent(`${title} - 1Line`)})&z=17`}
                    target="_blank"
                    rel="noreferrer"
                    className="detail-maps-pill"
                    title={isAr ? 'فتح اللوكيشن الدقيق على خرائط Google' : 'Open Location in Google Maps'}
                  >
                    <Navigation size={13} />
                    <span>{isAr ? 'عرض على خرائط Google' : 'Open in Google Maps'}</span>
                  </a>
                )}
              </div>
            </div>

            <div className="detail-price-box">
              <span className="price-tag-sub">{isAr ? 'السعر الإجمالي' : 'Total Price'}</span>
              <div className="price-num-row">
                <h2>{priceData.primary}</h2>
                <span className="curr">{priceData.symbol}</span>
              </div>
              {priceData.isConverted && (
                <span className="price-converted-sub">
                  ≈ {priceData.originalEgp}
                </span>
              )}
              {benchmark && (
                <div className={`benchmark-hero-pill is-${benchmark.badgeType}`}>
                  {benchmark.badgeType === 'deal' ? <TrendingDown size={13} /> : benchmark.badgeType === 'premium' ? <Sparkles size={13} /> : <Scale size={13} />}
                  <span>{benchmark.badgeLabel}</span>
                </div>
              )}
              {Number(property.size) > 0 && (
                // price ÷ size — same figure as the listing card and the valuation tab
                <span className="price-per-m">
                  <bdi>{Math.round(Number(property.price) / Number(property.size)).toLocaleString('en-US')}</bdi> {isAr ? 'ج.م / م²' : 'EGP / m²'}
                </span>
              )}

              {/* 🛡️ Free viewing + written fees (1Line charges commission — never claim 0%) */}
              <div className="buyer-commission-badge">
                <CheckCircle2 size={14} style={{ color: '#34D399', flexShrink: 0 }} />
                <span>{isAr ? 'معاينة ميدانية مجانية للموقع • كل الأتعاب والرسوم مكتوبة قبل التعاقد' : 'Free on-site viewing • All fees in writing before contract'}</span>
              </div>
            </div>
          </div>

          {/* 📸 Gallery Component */}
          <PropertyGallery
            images={property.images}
            title={title}
            virtualTour={property.virtualTour}
            lang={lang}
            floorPlan={property.floorPlan || property.floorPlanImage}
          />
        </div>
      </section>

      {/* Main Page Lower Container */}
      <div className="detail-container">

        {/* 📱 WhatsApp Automation, Instant PDF Brochure & Story Bar */}
        <WhatsAppAutomationBar
          property={property}
          lang={lang}
          currency={currency}
          triggerToast={triggerToast}
          onOpenStoryCard={() => setStoryModalOpen(true)}
        />

        {/* 🎯 Sticky Compact Section Tabs (Solves Scrolling & Overload) */}
        <div className="detail-section-tabs-bar" role="tablist" aria-label={isAr ? 'أقسام تفاصيل العقار' : 'Listing sections'}>
          {[
            { id: 'overview', Icon: Layers, ar: 'المواصفات والتكاليف', en: 'Specs & costs' },
            { id: 'legal', Icon: ShieldCheck, ar: 'الموقف القانوني', en: 'Legal status' },
            { id: 'valuation', Icon: TrendingUp, ar: 'السعر والمنطقة', en: 'Price & area' },
            { id: 'financing', Icon: Calculator, ar: 'حاسبة التمويل', en: 'Financing calculator' }
          ].map(({ id: tabId, Icon, ar, en }, idx, all) => (
            <button
              key={tabId}
              type="button"
              role="tab"
              id={`pd-tab-${tabId}`}
              aria-selected={activeTab === tabId}
              aria-controls="pd-tabpanel"
              tabIndex={activeTab === tabId ? 0 : -1}
              className={`section-tab-btn ${activeTab === tabId ? 'active' : ''}`}
              onClick={() => setActiveTab(tabId)}
              onKeyDown={(e) => {
                // Arrow keys move between tabs (reading direction aware)
                const fwd = isAr ? 'ArrowLeft' : 'ArrowRight';
                const back = isAr ? 'ArrowRight' : 'ArrowLeft';
                if (e.key !== fwd && e.key !== back) return;
                e.preventDefault();
                const next = all[(idx + (e.key === fwd ? 1 : all.length - 1)) % all.length].id;
                setActiveTab(next);
                document.getElementById(`pd-tab-${next}`)?.focus();
              }}
            >
              <Icon size={16} aria-hidden="true" />
              <span>{isAr ? ar : en}</span>
            </button>
          ))}
        </div>

        {/* 2-Column Content Grid */}
        <div className="detail-content-grid">
          {/* Left / Main Details Column */}
          <div className="detail-main-col" role="tabpanel" id="pd-tabpanel" aria-labelledby={`pd-tab-${activeTab}`}>
            {/* TAB 1: OVERVIEW & SPECS */}
            {activeTab === 'overview' && (
              <div className="tab-pane-content">
                {/* Quick Specs Overview Grid */}
                <div className="detail-card-box">
                  <h3>{isAr ? 'المواصفات الرئيسية للعقار' : 'Key Specifications'}</h3>
                  <div className="specs-detail-grid">
                    <div className="spec-box">
                      <Maximize2 size={20} className="text-gold" />
                      <div>
                        <span className="spec-lbl">{isAr ? 'المساحة الإجمالية' : 'Total Area'}</span>
                        <strong>{property.size} {isAr ? 'متر مربع صافي' : 'sqm net'}</strong>
                      </div>
                    </div>

                    {/* Sector-Specific Specifications */}
                    {isLand ? (
                      <>
                        {property.landType_ar && (
                          <div className="spec-box">
                            <Building size={20} className="text-gold" />
                            <div>
                              <span className="spec-lbl">{isAr ? 'تصنيف الأرض' : 'Land Classification'}</span>
                              <strong>{isAr ? property.landType_ar : (property.landType_en || property.landType_ar)}</strong>
                            </div>
                          </div>
                        )}
                        {property.frontage && (
                          <div className="spec-box">
                            <Sparkles size={20} className="text-gold" />
                            <div>
                              <span className="spec-lbl">{isAr ? 'واجهة القطعة' : 'Plot Frontage'}</span>
                              <strong>{property.frontage}</strong>
                            </div>
                          </div>
                        )}
                        {licenseText && (
                          <div className="spec-box">
                            <ShieldCheck size={20} className="text-gold" />
                            <div>
                              <span className="spec-lbl">{isAr ? 'الترخيص (من المراجعة)' : 'Licence (reviewed)'}</span>
                              <strong>{licenseText}</strong>
                            </div>
                          </div>
                        )}
                      </>
                    ) : isCommercial ? (
                      <>
                        <div className="spec-box">
                          <Store size={20} className="text-gold" />
                          <div>
                            <span className="spec-lbl">{isAr ? 'نوع العقار التجاري' : 'Commercial Type'}</span>
                            <strong>{property.commercialType_ar || (isAr ? 'محل تجاري واجهة' : 'Retail Shop')}</strong>
                          </div>
                        </div>
                        {property.frontage && (
                          <div className="spec-box">
                            <Sparkles size={20} className="text-gold" />
                            <div>
                              <span className="spec-lbl">{isAr ? 'عرض الواجهة' : 'Storefront Width'}</span>
                              <strong>{property.frontage}</strong>
                            </div>
                          </div>
                        )}
                        {licenseText && (
                          <div className="spec-box">
                            <ShieldCheck size={20} className="text-gold" />
                            <div>
                              <span className="spec-lbl">{isAr ? 'الترخيص (من المراجعة)' : 'Licence (reviewed)'}</span>
                              <strong>{licenseText}</strong>
                            </div>
                          </div>
                        )}
                      </>
                    ) : isOffice ? (
                      <>
                        <div className="spec-box">
                          <Briefcase size={20} className="text-gold" />
                          <div>
                            <span className="spec-lbl">{isAr ? 'نوع المقر الإداري' : 'Admin Type'}</span>
                            <strong>{property.adminType_ar || (isAr ? 'مكتب إداري / عيادة' : 'Admin Office / Clinic')}</strong>
                          </div>
                        </div>
                        {property.frontage && (
                          <div className="spec-box">
                            <Sparkles size={20} className="text-gold" />
                            <div>
                              <span className="spec-lbl">{isAr ? 'الواجهة' : 'Facade'}</span>
                              <strong>{property.frontage}</strong>
                            </div>
                          </div>
                        )}
                        {licenseText && (
                          <div className="spec-box">
                            <ShieldCheck size={20} className="text-gold" />
                            <div>
                              <span className="spec-lbl">{isAr ? 'الترخيص (من المراجعة)' : 'Licence (reviewed)'}</span>
                              <strong>{licenseText}</strong>
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      /* Residential Units */
                      <>
                        {property.bedrooms > 0 && (
                          <div className="spec-box">
                            <BedDouble size={20} className="text-gold" />
                            <div>
                              <span className="spec-lbl">{isAr ? 'غرف النوم' : 'Bedrooms'}</span>
                              <strong>{property.bedrooms} {isAr ? 'غرف' : 'Rooms'}</strong>
                            </div>
                          </div>
                        )}

                        {property.bathrooms > 0 && (
                          <div className="spec-box">
                            <Bath size={20} className="text-gold" />
                            <div>
                              <span className="spec-lbl">{isAr ? 'الحمامات' : 'Bathrooms'}</span>
                              <strong>{property.bathrooms} {isAr ? 'حمامات' : 'Baths'}</strong>
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    {!isLand && property.floor !== undefined && property.floor !== null && property.floor !== '' && (
                      <div className="spec-box">
                        <Layers size={20} className="text-gold" />
                        <div>
                          <span className="spec-lbl">{isAr ? 'الدور / الطابق' : 'Floor'}</span>
                          <strong>{Number(property.floor) === 0 ? (isAr ? 'أرضي' : 'Ground') : property.floor}</strong>
                        </div>
                      </div>
                    )}

                    {finishing && (
                      <div className="spec-box">
                        <Sparkles size={20} className="text-gold" />
                        <div>
                          <span className="spec-lbl">{isLand ? (isAr ? 'طبيعة التجهيز' : 'Site Readiness') : (isAr ? 'مستوى التشطيب' : 'Finishing')}</span>
                          <strong>{finishing}</strong>
                        </div>
                      </div>
                    )}

                    {deliveryText && (
                      <div className="spec-box">
                        <Clock size={20} className="text-gold" />
                        <div>
                          <span className="spec-lbl">{isAr ? 'الاستلام' : 'Delivery'}</span>
                          <strong>{deliveryText}</strong>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* 🧾 مصفوفة الشفافية المالية — every cost from the listing's own data */}
                <FinancialBreakdown property={property} lang={lang} currency={currency} />

                {/* 👨‍👩‍👧 بيت العيلة — only for listings tagged in the CRM */}
                {familyInfo && (
                  <section className="xs-fam-card" aria-labelledby="xs-fam-card-title">
                    <header className="xs-fin-head">
                      <span className="xs-fin-icon"><Users size={20} aria-hidden="true" /></span>
                      <div>
                        <h3 id="xs-fam-card-title">{isAr ? `بيت العيلة: ${familyInfo.kind.ar}` : `Family hub: ${familyInfo.kind.en}`}</h3>
                        <p>
                          {familyInfo.units > 0
                            ? (isAr ? `${familyInfo.units} وحدة قابلة للفرز` : `${familyInfo.units} units that can be split`)
                            : (isAr ? familyInfo.kind.desc_ar : familyInfo.kind.desc_en)}
                          {(isAr ? familyInfo.note_ar : familyInfo.note_en || familyInfo.note_ar) ? ` — ${isAr ? familyInfo.note_ar : familyInfo.note_en || familyInfo.note_ar}` : ''}
                        </p>
                      </div>
                    </header>
                    <FamilyCostSplitter property={property} lang={lang} currency={currency} compact />
                  </section>
                )}

                {/* 🏥 مؤشرات القرار للعقار التجاري/الطبي + حاسبة العائد */}
                <CommercialInsightsCard property={property} lang={lang} currency={currency} />

                {/* Description Box */}
                <div className="detail-card-box">
                  <h3>{isAr ? 'وصف العقار وتفاصيل الموقع' : 'Property Description'}</h3>
                  <p className="detail-description-p">{description}</p>
                </div>

                {/* Features & Amenities List */}
                {features && features.length > 0 && (
                  <div className="detail-card-box">
                    <h3>{isAr ? 'المزايا والخدمات الملحقة' : 'Features & Amenities'}</h3>
                    <div className="features-checklist-grid">
                      {features.map((feat, i) => (
                        <div key={i} className="feature-check-item">
                          <CheckCircle2 size={18} className="text-gold" />
                          <span>{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ⚖️ Legal status at a glance (full summary lives in the legal tab) */}
                <button type="button" className={`pd-legal-glance ${property.legalStatus ? 'is-reviewed' : 'is-pending'}`} onClick={() => setActiveTab('legal')}>
                  <ShieldCheck size={18} aria-hidden="true" />
                  <span>
                    <strong>{property.legalStatus ? (isAr ? 'المستندات مراجَعة' : 'Documents reviewed') : (isAr ? 'المراجعة القانونية لم تُنشر بعد' : 'Legal review not published yet')}</strong>
                    <small>
                      {property.legalStatus
                        ? ((isAr ? property.legalStatus.ownershipType_ar : (property.legalStatus.ownershipType_en || property.legalStatus.ownershipType_ar)) || (isAr ? 'اعرض ملخص المراجعة' : 'See the review summary'))
                        : (isAr ? 'نراجع المستندات معك قبل أي حجز' : 'We review documents with you before any reservation')}
                    </small>
                  </span>
                  <span className="pd-legal-glance-cta">{isAr ? 'التفاصيل ←' : 'Details →'}</span>
                </button>

                {/* 🔌 Utilities — only what the team recorded for this unit (CRM → المرافق) */}
                {utilityItems.length > 0 && (
                  <div className="detail-card-box pd-utilities">
                    <div className="pd-utilities-head">
                      <h3>
                        <Zap size={20} className="text-gold" aria-hidden="true" />
                        <span>{isAr ? 'المرافق والخدمات' : 'Utilities'}</span>
                      </h3>
                      {property.utilities?.verifiedOnSite && (
                        <span className="pd-utilities-verified">
                          {isAr ? '✓ تمت المعاينة ميدانياً' : '✓ Checked on site'}
                          {property.utilities?.verifiedDate ? ` — ${property.utilities.verifiedDate}` : ''}
                        </span>
                      )}
                    </div>
                    <ul className="pd-utilities-grid">
                      {utilityItems.map(({ key, Icon, label, value }) => (
                        <li key={key}>
                          <Icon size={18} aria-hidden="true" />
                          <div>
                            <strong>{label}</strong>
                            <span>{value}</span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* 💼 Optional turnkey / rental management service (not shown for land) */}
                {!isLand && <div className="investor-turnkey-banner detail-card-box" style={{
                  background: 'linear-gradient(135deg, rgba(217, 119, 6, 0.08), rgba(11, 78, 162, 0.06))',
                  border: '1px solid rgba(217, 119, 6, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  padding: '16px'
                }}>
                  <div style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '10px',
                    background: 'var(--accent-gold, #d97706)',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <Briefcase size={22} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ margin: '0 0 4px 0', fontSize: '0.92rem', color: 'var(--text-primary)' }}>
                      {isAr ? 'خدمة اختيارية: الاستلام والتشطيب وإدارة الإيجار' : 'Optional service: handover, finishing & rental management'}
                    </h4>
                    <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: '1.45' }}>
                      {isAr
                        ? 'لو مقيم بعيد، نقدر نتابع الاستلام والتشطيب ونبحث لك عن مستأجر وندير الإيجار. نطاق الخدمة وأتعابها في اتفاق مكتوب منفصل.'
                        : 'If you live away, we can handle handover, finishing, tenant search and rent management. Scope and fees go in a separate written agreement.'}
                    </p>
                  </div>
                </div>}

                {/* 🧭☀️ Orientation, Natural Breeze & Sunlight Compass */}
                <SunlightCompassWidget
                  property={property}
                  lang={lang}
                />
              </div>
            )}

            {/* TAB 2: LEGAL VERIFICATION & TITLE DEED */}
            {activeTab === 'legal' && (
              <div className="tab-pane-content">
                <LegalAuditCard
                  property={property}
                  lang={lang}
                />
              </div>
            )}

            {/* TAB 3: VALUATION, PRICE TRENDS & NEARBY POIs */}
            {activeTab === 'valuation' && (
              <div className="tab-pane-content valuation-tab-content">
                <div className="valuation-market-grid">
                  {/* 📉 Smart Market Price Benchmark & Valuation Indicator */}
                  <PriceBenchmarkIndicator
                    property={property}
                    lang={lang}
                    currency={currency}
                  />

                  {/* 📈 Historical Price Trends & Capital Growth Chart */}
                  <HistoricalPriceChart
                    areaKey={property.areaKey}
                    customPoints={property.historicalPrices}
                    lang={lang}
                  />
                </div>

                {/* 🏥🏫 Nearby Landmarks & POIs in Sohag */}
                <NearbyAmenities
                  property={property}
                  lang={lang}
                />
              </div>
            )}

            {/* TAB 4: FINANCING & ROI CALCULATOR */}
            {activeTab === 'financing' && (
              <div className="tab-pane-content">
                {/* Customized Mortgage Calculator for this property */}
                <div className="detail-card-box">
                  <h3>{isAr ? 'حاسبة القسط والتمويل لهذا العقار' : 'Payment & Financing Calculator'}</h3>
                  {Number(property.monthlyInstallment) > 0 && (
                    <p className="pd-calc-note">
                      {financePlan?.incomplete
                        ? (isAr
                          ? `الحاسبة توزّع كل المبلغ المتبقي على أقساط شهرية متساوية بدون فوائد، لذلك يختلف القسط هنا عن القسط المسجل (${Number(property.monthlyInstallment).toLocaleString('en-US')} ج.م) الذي يصاحبه رصيد غير مجدول — راجع مصفوفة التكاليف.`
                          : `The calculator spreads the whole remaining amount over equal interest-free months, so it differs from the listed installment (${Number(property.monthlyInstallment).toLocaleString('en-US')} EGP), which comes with an unscheduled balance — see the cost breakdown.`)
                        : (isAr
                          ? 'الحاسبة تبدأ بنظام السداد المسجل لهذا العقار (تقسيط مباشر بدون فوائد). غيّر النسبة لو هتمول من بنك.'
                          : 'The calculator starts from this listing\'s own plan (direct, interest-free). Change the rate if you finance through a bank.')}
                    </p>
                  )}
                  <MortgageRoiCalculator
                    lang={lang}
                    initialPrice={property.price}
                    // exact share (not rounded) so the down payment matches the listing to the pound
                    initialDownpaymentPercent={property.downPayment && property.price ? Math.round((property.downPayment / property.price) * 10000) / 100 : 20}
                    initialYears={property.installmentYears || 5}
                    // the listing's own plan is interest-free; a bank rate is the visitor's choice
                    initialInterestRate={Number(property.monthlyInstallment) > 0 ? 0 : 12}
                    initialMonthlyRent={Number(property.commercial?.rentPerSqm) > 0 && Number(property.size) > 0
                      ? Math.round(Number(property.commercial.rentPerSqm) * Number(property.size))
                      : 18000}
                    rentIsEstimate={!(Number(property.commercial?.rentPerSqm) > 0)}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Right / Sticky Agent & Booking Sidebar */}
          <div className="detail-sidebar-col">
            <div className="sticky-booking-card">
              {/* 1. Agent Profile Header */}
              <div className="agent-profile-header">
                <div className="agent-avatar-circle">1L</div>
                <div>
                  <h4>{isAr ? 'مستشار 1Line العقاري' : '1Line Real Estate Advisor'}</h4>
                  {/* Real office hours (siteConfig CONTACT), Cairo time */}
                  <span className={`agent-status-badge ${officeOpen ? '' : 'is-off-hours'}`}>
                    <span className={officeOpen ? 'green-dot' : 'pd-off-dot'} />
                    {officeOpen
                      ? (isAr ? 'متاحون الآن — يومياً 10 ص – 10 م' : 'Available now — daily 10:00–22:00')
                      : (isAr ? 'خارج مواعيد العمل — نرد من 10 صباحاً (عدا الجمعة)' : 'Outside office hours — we reply from 10:00 (closed Friday)')}
                  </span>
                </div>
              </div>

              {/* 2. Direct Instant Contact Hub (Top Priority) */}
              <div className="sidebar-instant-contact-row">
                <a
                  href={getWhatsAppUrl(`مرحباً 1Line، أريد الاستفسار عن كود العقار: ${property.id.toUpperCase()} (${title})`)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-whatsapp-half"
                  title={isAr ? 'تواصل فوري عبر واتساب' : 'Direct WhatsApp'}
                >
                  <MessageSquare size={16} />
                  <span>{isAr ? 'واتساب فوري' : 'WhatsApp'}</span>
                </a>

                <a 
                  href={getPhoneCallUrl()} 
                  className="btn btn-call-half"
                  title={isAr ? 'اتصال هاتفي مباشر' : 'Direct Phone Call'}
                >
                  <Phone size={16} />
                  <span>{isAr ? 'اتصال هاتفي' : 'Call Agent'}</span>
                </a>
              </div>

              {/* 📹 معاينة الغربة — expat remote inspection (live video / street footage / drone) */}
              <button
                type="button"
                className="xs-remote-cta"
                onClick={() => openRemoteInspection(property)}
              >
                <span className="xs-remote-cta-icon"><Video size={18} aria-hidden="true" /></span>
                <span className="xs-remote-cta-text">
                  <strong>{isAr ? 'طلب معاينة الغربة' : 'Book a remote inspection'}</strong>
                  <small>{isAr ? 'فيديو حي / شارع وجيران / درون جوي' : 'Live video · street · drone'}</small>
                </span>
              </button>

              {/* 3. Free viewing request — opens on demand to keep the sidebar focused */}
              {bookingSubmitted ? (
                <div className="booking-success-box" role="status">
                  <CheckCircle2 size={36} className="text-success" />
                  <h4>{isAr ? 'استلمنا طلب المعاينة' : 'Viewing request received'}</h4>
                  <p>{isAr ? 'سيتواصل معك فريق المعاينات على واتساب لتأكيد الموعد والعنوان.' : 'Our team will contact you on WhatsApp to confirm the time and address.'}</p>
                </div>
              ) : !showBookingForm ? (
                <button type="button" className="pd-book-toggle" onClick={() => setShowBookingForm(true)} aria-expanded="false" aria-controls="pd-booking-form">
                  <Calendar size={17} aria-hidden="true" />
                  <span>
                    <strong>{isAr ? 'احجز معاينة مجانية للموقع' : 'Book a free on-site viewing'}</strong>
                    <small>{isAr ? 'اختر اليوم والفترة — نؤكد معك على واتساب' : 'Pick a day and time — we confirm on WhatsApp'}</small>
                  </span>
                </button>
              ) : (
                <form onSubmit={handleBookingSubmit} className="booking-form-wrap" id="pd-booking-form" noValidate>
                  {/* 🍯 Invisible Honeypot Anti-Bot Shield */}
                  <div style={{ position: 'absolute', opacity: 0, zIndex: -1, pointerEvents: 'none', height: 0, overflow: 'hidden' }} aria-hidden="true">
                    <input
                      type="text"
                      name="agent_booking_field_hp"
                      tabIndex="-1"
                      autoComplete="off"
                      value={hpField}
                      onChange={(e) => setHpField(e.target.value)}
                    />
                  </div>

                  <div className="form-group-item">
                    <label htmlFor="pd-book-name">
                      <span>{isAr ? 'الاسم *' : 'Name *'}</span>
                      {isClientAuthenticated && (
                        <span className="client-auto-badge">
                          <ShieldCheck size={11} />
                          <span>{isAr ? 'من حسابك' : 'From your account'}</span>
                        </span>
                      )}
                    </label>
                    <input
                      id="pd-book-name"
                      type="text"
                      autoComplete="name"
                      maxLength={100}
                      placeholder={isAr ? 'مثال: محمد السيد' : 'e.g. John Doe'}
                      value={bookingForm.name}
                      onChange={(e) => setBookingForm({ ...bookingForm, name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group-item">
                    <label htmlFor="pd-book-phone">{isAr ? 'رقم الواتساب *' : 'WhatsApp number *'}</label>
                    <input
                      id="pd-book-phone"
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      dir="ltr"
                      placeholder="01012345678"
                      value={bookingForm.phone}
                      aria-invalid={Boolean(phoneError)}
                      aria-describedby={phoneError ? 'pd-book-phone-err' : undefined}
                      onChange={(e) => { setBookingForm({ ...bookingForm, phone: e.target.value }); if (phoneError) setPhoneError(''); }}
                      required
                    />
                    {phoneError && <span id="pd-book-phone-err" className="pd-field-error" role="alert">{phoneError}</span>}
                  </div>

                  <fieldset className="form-group-item pd-fieldset">
                    <legend>{isAr ? 'نوع المعاينة' : 'Viewing type'}</legend>
                    <div className="booking-type-toggle" role="radiogroup">
                      <button
                        type="button"
                        role="radio"
                        aria-checked={bookingForm.tourType !== 'video'}
                        className={`type-toggle-btn ${bookingForm.tourType !== 'video' ? 'active' : ''}`}
                        onClick={() => setBookingForm({ ...bookingForm, tourType: 'field' })}
                      >
                        <MapPin size={14} aria-hidden="true" />
                        <span>{isAr ? 'ميدانية بالموقع' : 'On site'}</span>
                      </button>
                      <button
                        type="button"
                        role="radio"
                        aria-checked={bookingForm.tourType === 'video'}
                        className={`type-toggle-btn ${bookingForm.tourType === 'video' ? 'active' : ''}`}
                        onClick={() => setBookingForm({ ...bookingForm, tourType: 'video' })}
                      >
                        <Video size={14} aria-hidden="true" />
                        <span>{isAr ? 'فيديو حي' : 'Live video'}</span>
                      </button>
                    </div>
                  </fieldset>

                  <div className="form-row-2col">
                    <div className="form-group-item">
                      <label htmlFor="pd-book-date">{isAr ? 'اليوم المفضل' : 'Preferred day'}</label>
                      <input
                        id="pd-book-date"
                        type="date"
                        min={todayIso()}
                        value={bookingForm.date}
                        onChange={(e) => setBookingForm({ ...bookingForm, date: e.target.value })}
                      />
                    </div>
                    <fieldset className="form-group-item pd-fieldset">
                      <legend>{isAr ? 'الفترة' : 'Time'}</legend>
                      <div className="booking-time-slot-pills" role="radiogroup">
                        <button
                          type="button"
                          role="radio"
                          aria-checked={bookingForm.slot === 'morning'}
                          className={`slot-pill ${bookingForm.slot === 'morning' ? 'active' : ''}`}
                          onClick={() => setBookingForm({ ...bookingForm, slot: 'morning' })}
                          title={isAr ? '10 ص – 2 م' : '10:00–14:00'}
                        >
                          <Sun size={13} aria-hidden="true" />
                          <span>{isAr ? 'صباحاً' : 'Morning'}</span>
                        </button>
                        <button
                          type="button"
                          role="radio"
                          aria-checked={bookingForm.slot !== 'morning'}
                          className={`slot-pill ${bookingForm.slot !== 'morning' ? 'active' : ''}`}
                          onClick={() => setBookingForm({ ...bookingForm, slot: 'evening' })}
                          title={isAr ? '5 م – 9 م' : '17:00–21:00'}
                        >
                          <Moon size={13} aria-hidden="true" />
                          <span>{isAr ? 'مساءً' : 'Evening'}</span>
                        </button>
                      </div>
                    </fieldset>
                  </div>

                  <button type="submit" className="btn btn-primary btn-full btn-confirm-booking" disabled={isBookingSubmitting}>
                    <Calendar size={16} aria-hidden="true" />
                    <span>{isBookingSubmitting ? (isAr ? 'جارٍ الإرسال…' : 'Sending…') : (isAr ? 'أرسل طلب المعاينة' : 'Send viewing request')}</span>
                  </button>
                  <p className="pd-book-fine">{isAr ? 'المعاينة الميدانية مجانية، والموعد يتأكد معك على واتساب.' : 'On-site viewings are free; the time is confirmed with you on WhatsApp.'}</p>
                </form>
              )}

              {/* 4. VIP 24-Hour Hold Banner (Positioned as a dedicated reservation guarantee) */}
              <button type="button" className="sidebar-deposit-banner" onClick={() => setDepositModalOpen(true)}>
                <span className="deposit-banner-left">
                  <ShieldCheck size={18} className="text-gold" aria-hidden="true" />
                  <span>
                    <strong>{isAr ? 'طلب حجز مبدئي' : 'Request a reservation'}</strong>
                    <span>{isAr ? 'نؤكد الإتاحة ونراجع المستندات قبل أي سداد' : 'We confirm availability and documents before any payment'}</span>
                  </span>
                </span>
                <span className="btn-hold-badge">{isAr ? 'اطلب' : 'Request'}</span>
              </button>

              {/* 5. Safe Legal Guarantee Seal */}
              <div className="sidebar-legal-guarantee">
                <ShieldCheck size={15} className="text-gold" />
                <span>{isAr ? 'معاينة مجانية للموقع | الأتعاب مكتوبة قبل التعاقد' : 'Free on-site viewing | Fees in writing before contract'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Similar Properties Section */}
        {similarProperties.length > 0 && (
          <div className="similar-properties-section">
            <div className="section-header-flex">
              <div>
                <h2>{isAr ? 'عقارات مشابهة قد تهمك' : 'Similar Properties You May Like'}</h2>
                <p>{isAr ? 'فرص أخرى في نفس المنطقة أو الفئة السعرية' : 'More options in the same area'}</p>
              </div>
            </div>

            <div className="properties-grid-3">
              {similarProperties.map((p) => (
                <PropertyCard
                  key={p.id}
                  property={p}
                  lang={lang}
                  currency={currency}
                  isFavorite={favorites.includes(p.id)}
                  onToggleFavorite={onToggleFavorite}
                  onQuickView={onQuickView}
                />
              ))}
            </div>
          </div>
        )}

        {/* 💵 Property Deposit & Reservation Modal */}
        <DepositModal
          isOpen={depositModalOpen}
          onClose={() => setDepositModalOpen(false)}
          property={property}
          lang={lang}
          triggerToast={triggerToast}
          onConfirmDeposit={onAddNewLead}
        />

        {/* 📱 Instagram & Facebook 9:16 Social Story Card Modal */}
        <SocialStoryCardModal
          isOpen={storyModalOpen}
          onClose={() => setStoryModalOpen(false)}
          property={property}
          lang={lang}
          triggerToast={triggerToast}
        />

        {/* 🎟️ Official Instant Booking Confirmation & Receipt Modal */}
        <BookingConfirmationModal
          isOpen={bookingConfirmationOpen}
          onClose={() => setBookingConfirmationOpen(false)}
          bookingData={confirmedBookingData}
          property={property}
          lang={lang}
        />

        {/* 📱 Sticky Mobile Quick Action Bar (Solves Scrolling on Phones) */}
        <div className="mobile-detail-sticky-bar">
          <div className="mobile-sticky-price">
            <span className="mob-lbl">{isAr ? 'السعر' : 'Price'}</span>
            <strong>{priceData.primary} {priceData.symbol}</strong>
          </div>

          <div className="mobile-sticky-actions">
            <button
              type="button"
              className="btn btn-deposit-mini"
              onClick={() => setDepositModalOpen(true)}
              title={isAr ? 'طلب حجز مبدئي' : 'Request reservation'}
            >
              <ShieldCheck size={16} />
              <span>{isAr ? 'حجز' : 'Reserve'}</span>
            </button>

            <a
              href={getWhatsAppUrl(`مرحباً 1Line، أريد الاستفسار عن كود: ${property.id.toUpperCase()}`)}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-whatsapp-mini"
              aria-label={isAr ? 'استفسار عبر واتساب' : 'Ask on WhatsApp'}
            >
              <MessageSquare size={16} aria-hidden="true" />
            </a>

            <a href={getPhoneCallUrl()} className="btn btn-call-mini" aria-label={isAr ? 'اتصال هاتفي' : 'Call'}>
              <Phone size={16} aria-hidden="true" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
