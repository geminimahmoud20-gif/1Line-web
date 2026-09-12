import { useState, useMemo, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  MapPin, 
  BedDouble, 
  Bath, 
  Maximize2, 
  Sparkles, 
  CheckCircle2, 
  Layers, 
  Calendar, 
  Phone, 
  MessageSquare, 
  ShieldCheck, 
  Clock, 
  TrendingUp, 
  Calculator, 
  Eye, 
  Navigation,
  ArrowRight,
  ArrowLeft
} from 'lucide-react';
import { incrementPropertyView, getPropertyViews } from '../utils/visitorTracker';
import PropertyGallery from '../components/properties/PropertyGallery';
import MortgageRoiCalculator from '../components/calculators/MortgageRoiCalculator';
import PropertyCard from '../components/properties/PropertyCard';
import LegalAuditCard from '../components/properties/LegalAuditCard';
import WhatsAppAutomationBar from '../components/properties/WhatsAppAutomationBar';
import DepositModal from '../components/properties/DepositModal';
import PriceBenchmarkIndicator from '../components/properties/PriceBenchmarkIndicator';
import NearbyAmenities from '../components/properties/NearbyAmenities';
import { getWhatsAppUrl, getPhoneCallUrl } from '../utils/founderCmsData';
import SunlightCompassWidget from '../components/properties/SunlightCompassWidget';
import HistoricalPriceChart from '../components/properties/HistoricalPriceChart';
import LegalTaxCalculator from '../components/calculators/LegalTaxCalculator';
import SocialStoryCardModal from '../components/properties/SocialStoryCardModal';
import { updatePageSeo, buildPropertySchema } from '../utils/seoHelper';
import { checkFormSpamProtection } from '../utils/securityShield';
import { formatCurrencyPrice, getPriceBenchmark } from '../utils/currencyAndBenchmark';
import BookingConfirmationModal from '../components/common/BookingConfirmationModal';
import { saveLead } from '../firebaseService';

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
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'legal' | 'valuation' | 'financing'
  const [depositModalOpen, setDepositModalOpen] = useState(false);
  const [storyModalOpen, setStoryModalOpen] = useState(false);
  const [bookingConfirmationOpen, setBookingConfirmationOpen] = useState(false);
  const [confirmedBookingData, setConfirmedBookingData] = useState(null);
  const [viewsCount, setViewsCount] = useState(() => {
    if (id) {
      return getPropertyViews(id) || 150;
    }
    return 150;
  });

  // Find Property
  const property = useMemo(() => {
    return properties.find(p => p.id === id) || properties[0];
  }, [properties, id]);

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

  // Booking Form State
  const [bookingForm, setBookingForm] = useState({
    name: '',
    phone: '',
    date: '',
    timeSlot: 'evening',
    notes: ''
  });
  const [bookingSubmitted, setBookingSubmitted] = useState(false);
  const [isBookingSubmitting, setIsBookingSubmitting] = useState(false);
  const [hpField, setHpField] = useState('');

  if (!property) {
    return (
      <div className="property-not-found-container">
        <h2>{lang === 'ar' ? 'العقار غير موجود' : 'Property Not Found'}</h2>
        <Link to="/properties" className="btn btn-primary">
          {lang === 'ar' ? 'العودة لقائمة العقارات' : 'Back to Properties'}
        </Link>
      </div>
    );
  }

  const title = isAr ? property.title_ar : property.title_en;
  const location = isAr ? property.locationName_ar : property.locationName_en;
  const finishing = isAr ? property.finishing_ar : property.finishing_en;
  const description = isAr ? property.description_ar : property.description_en;
  const features = isAr ? property.features_ar : property.features_en;
  const priceData = formatCurrencyPrice(property.price, currency, lang);
  const benchmark = getPriceBenchmark(property, lang);

  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    if (isBookingSubmitting) return;

    // 🛡️ Anti-Bot & Spam Rate-Limit Shield
    const spamCheck = checkFormSpamProtection(hpField, 'property_inspection_booking');
    if (!spamCheck.allowed) {
      triggerToast(isAr ? spamCheck.message_ar : spamCheck.message_en, 'error');
      return;
    }

    const cleanWhatsapp = (bookingForm.whatsapp || bookingForm.phone || '').trim().replace(/[\s\-()]/g, '');

    if (!bookingForm.name || !bookingForm.name.trim()) {
      triggerToast(isAr ? 'الرجاء إدخال اسمك بالكامل (إلزامي)' : 'Full name is required', 'error');
      return;
    }

    if (!cleanWhatsapp) {
      triggerToast(isAr ? 'الرجاء إدخال رقم الواتساب (إلزامي لتأكيد المعاينة والموقع)' : 'WhatsApp number is required', 'error');
      return;
    }

    setIsBookingSubmitting(true);
    try {
      const serialCode = `1LINE-BK-${Math.floor(1000 + Math.random() * 9000)}`;
      const fullBookingRecord = {
        ...bookingForm,
        name: bookingForm.name.trim(),
        whatsapp: cleanWhatsapp,
        phone: bookingForm.phone || cleanWhatsapp,
        propertyType: property.type || 'residential',
        area: property.areaKey || 'sohag_jadida',
        serialCode,
        propertyId: property.id,
        propertyTitle: title,
        propertyPrice: property.price,
        type: 'viewing_request',
        source: 'حجز معاينة عقار (صفحة العقار)',
        notes: `طلب حجز معاينة ميدانية للعقار: ${title} (كود ${property.id.toUpperCase()}) | التاريخ: ${bookingForm.date || 'أقرب موعد'} | الفترة: ${bookingForm.slot === 'morning' ? 'صباحاً' : 'مساءً'}`,
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

  // Smart Similar Properties recommendation (Same district first, fallback to same property type)
  const similarProperties = useMemo(() => {
    if (!property) return [];
    const sameArea = properties.filter((p) => p.id !== property.id && p.areaKey === property.areaKey);
    if (sameArea.length >= 3) return sameArea.slice(0, 3);
    const sameType = properties.filter((p) => p.id !== property.id && p.type === property.type && !sameArea.some(sa => sa.id === p.id));
    return [...sameArea, ...sameType].slice(0, 3);
  }, [properties, property]);

  return (
    <div className="property-detail-page-wrapper">
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
            <span>/</span>
            <Link to="/properties">{isAr ? 'العقارات' : 'Properties'}</Link>
            <span>/</span>
            <span className="crumb-current">{property.id.toUpperCase()}</span>
          </div>
        </div>

        {/* Main Title & Price Header Banner */}
        <div className="detail-header-block">
          <div className="detail-title-col">
            <div className="detail-badges-row">
              <span className="status-pill-badge">
                <CheckCircle2 size={13} />
                {isAr ? 'مفحوص ومعتمد قانونياً' : 'Legally Verified'}
              </span>
              <span className="type-pill-badge">{property.type}</span>
              {property.badge_ar && <span className="gold-pill-badge">{isAr ? property.badge_ar : property.badge_en}</span>}
              <button 
                type="button" 
                className="code-copy-pill-btn" 
                onClick={() => {
                  navigator.clipboard.writeText(property.id.toUpperCase());
                  triggerToast(isAr ? `تم نسخ كود العقار: ${property.id.toUpperCase()}` : `Copied ID: ${property.id.toUpperCase()}`, 'success');
                }}
                title={isAr ? 'انقر لنسخ كود العقار' : 'Click to copy property ID'}
              >
                <span>{property.id.toUpperCase()}</span>
                <span className="copy-icon-txt">📋</span>
              </button>
            </div>
            <h1 className="detail-main-title">{title}</h1>
            <div className="detail-location-text" style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <MapPin size={16} />
                <span>{location}</span>
              </div>
              {property.coordinates?.lat && (
                <a
                  href={`https://www.google.com/maps?q=${property.coordinates.lat},${property.coordinates.lng}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-sm"
                  style={{
                    padding: '3px 10px',
                    fontSize: '0.74rem',
                    background: 'rgba(217, 119, 6, 0.12)',
                    border: '1px solid rgba(217, 119, 6, 0.35)',
                    color: 'var(--accent-gold)',
                    borderRadius: 'var(--radius-pill)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    textDecoration: 'none'
                  }}
                  title={isAr ? 'فتح اللوكيشن الدقيق على خرائط Google' : 'Open Location in Google Maps'}
                >
                  <Navigation size={11} />
                  <span>{isAr ? '📍 عرض على خرائط Google' : 'Open in Google Maps'}</span>
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
              <span className="price-converted-sub" style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: '700', display: 'block', marginTop: '2px' }}>
                ≈ {priceData.originalEgp}
              </span>
            )}
            {benchmark && (
              <div style={{
                marginTop: '8px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                borderRadius: '6px',
                background: benchmark.badgeBg,
                color: benchmark.badgeColor,
                fontSize: '0.74rem',
                fontWeight: '800',
                border: `1px solid ${benchmark.badgeColor}33`
              }}>
                <span>{benchmark.badgeType === 'deal' ? '🔥' : benchmark.badgeType === 'premium' ? '💎' : '⚖️'}</span>
                <span>{benchmark.badgeLabel}</span>
              </div>
            )}
            {property.pricePerMeter && (
              <span className="price-per-m" style={{ marginTop: '6px' }}>
                {property.pricePerMeter.toLocaleString()} {isAr ? 'ج.م / متر' : 'EGP / sqm'}
              </span>
            )}
          </div>
        </div>

        {/* 📸 Gallery Component */}
        <PropertyGallery
          images={property.images}
          title={title}
          virtualTour={property.virtualTour}
          lang={lang}
        />

        {/* 📱 WhatsApp Automation, Instant PDF Brochure & Story Bar */}
        <WhatsAppAutomationBar
          property={property}
          lang={lang}
          currency={currency}
          triggerToast={triggerToast}
          onOpenStoryCard={() => setStoryModalOpen(true)}
        />

        {/* 🎯 Sticky Compact Section Tabs (Solves Scrolling & Overload) */}
        <div className="detail-section-tabs-bar">
          <button
            type="button"
            className={`section-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            <Layers size={16} />
            <span>{isAr ? 'المواصفات والوصف' : 'Specs & Overview'}</span>
          </button>

          <button
            type="button"
            className={`section-tab-btn ${activeTab === 'legal' ? 'active' : ''}`}
            onClick={() => setActiveTab('legal')}
          >
            <ShieldCheck size={16} />
            <span>{isAr ? 'التوثيق والفحص القانوني' : 'Legal Verification'}</span>
          </button>

          <button
            type="button"
            className={`section-tab-btn ${activeTab === 'valuation' ? 'active' : ''}`}
            onClick={() => setActiveTab('valuation')}
          >
            <TrendingUp size={16} />
            <span>{isAr ? 'التقييم وتاريخ الأسعار والخدمات' : 'Valuation & Amenities'}</span>
          </button>

          <button
            type="button"
            className={`section-tab-btn ${activeTab === 'financing' ? 'active' : ''}`}
            onClick={() => setActiveTab('financing')}
          >
            <Calculator size={16} />
            <span>{isAr ? 'حاسبة الأقساط والضرائب' : 'Financing & Taxes'}</span>
          </button>
        </div>

        {/* 2-Column Content Grid */}
        <div className="detail-content-grid">
          {/* Left / Main Details Column */}
          <div className="detail-main-col">
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
                        <strong>{property.size} {isAr ? 'متر مربع' : 'sqm'}</strong>
                      </div>
                    </div>

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

                    <div className="spec-box">
                      <Layers size={20} className="text-gold" />
                      <div>
                        <span className="spec-lbl">{isAr ? 'الدور / الطابق' : 'Floor'}</span>
                        <strong>{property.floor === 0 ? (isAr ? 'أرضي' : 'Ground') : property.floor}</strong>
                      </div>
                    </div>

                    <div className="spec-box">
                      <Sparkles size={20} className="text-gold" />
                      <div>
                        <span className="spec-lbl">{isAr ? 'مستوى التشطيب' : 'Finishing'}</span>
                        <strong>{finishing}</strong>
                      </div>
                    </div>

                    <div className="spec-box">
                      <Clock size={20} className="text-gold" />
                      <div>
                        <span className="spec-lbl">{isAr ? 'سنة التسليم' : 'Delivery'}</span>
                        <strong>{property.deliveryYear || (isAr ? 'فوري' : 'Ready')}</strong>
                      </div>
                    </div>
                  </div>
                </div>

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

            {/* TAB 4: FINANCING, ROI & TAX BREAKDOWN */}
            {activeTab === 'financing' && (
              <div className="tab-pane-content">
                {/* ⚖️ Transparent Government Taxes & Ownership Breakdown */}
                <LegalTaxCalculator
                  price={property.price}
                  lang={lang}
                />

                {/* Customized Mortgage Calculator for this property */}
                <div className="detail-card-box">
                  <h3>{isAr ? 'حاسبة القسط والتمويل لهذا العقار' : 'Payment & Financing Calculator'}</h3>
                  <MortgageRoiCalculator
                    lang={lang}
                    initialPrice={property.price}
                    initialDownpaymentPercent={Math.round((property.downPayment / property.price) * 100) || 20}
                    initialYears={property.installmentYears || 5}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Right / Sticky Agent & Booking Sidebar */}
          <div className="detail-sidebar-col">
            <div className="sticky-booking-card">
              <div className="agent-profile-header">
                <div className="agent-avatar-circle">1L</div>
                <div>
                  <h4>{isAr ? 'مستشار 1Line العقاري' : '1Line Real Estate Advisor'}</h4>
                  <span className="agent-status-badge">
                    <span className="green-dot" />
                    {isAr ? 'متاح للرد الفوري' : 'Online & Ready'}
                  </span>
                </div>
              </div>

              {/* VIP Hold Pill */}
              <div className="sidebar-deposit-banner" onClick={() => setDepositModalOpen(true)}>
                <div className="deposit-banner-left">
                  <ShieldCheck size={18} className="text-gold" />
                  <div>
                    <strong>{isAr ? 'تثبيت العقار وحجزه 24 ساعة' : 'Lock & Reserve Property (24h)'}</strong>
                    <span>{isAr ? 'عبر InstaPay لمنع حجز الوحدة لمشترٍ آخر' : 'Via InstaPay to prevent competing offers'}</span>
                  </div>
                </div>
                <span className="btn-hold-badge">{isAr ? 'حجز' : 'Hold'}</span>
              </div>

              {/* Instant Contact Direct Row */}
              <div className="sidebar-instant-contact-row">
                <a
                  href={getWhatsAppUrl(`مرحباً 1Line، أريد الاستفسار عن كود العقار: ${property.id.toUpperCase()} (${title})`)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-whatsapp-half"
                >
                  <MessageSquare size={16} />
                  <span>{isAr ? 'واتساب' : 'WhatsApp'}</span>
                </a>

                <a href={getPhoneCallUrl()} className="btn btn-call-half">
                  <Phone size={16} />
                  <span>{isAr ? 'اتصال فوري' : 'Call Agent'}</span>
                </a>
              </div>

              <div className="sidebar-divider">
                <span>{isAr ? 'أو حدد موعد معاينة ميدانية مجانية' : 'Or Book a Free Viewing Tour'}</span>
              </div>

              {/* Booking Form */}
              {bookingSubmitted ? (
                <div className="booking-success-box">
                  <CheckCircle2 size={36} className="text-success" />
                  <h4>{isAr ? 'تم تأكيد موعدك بنجاح' : 'Viewing Booked Successfully'}</h4>
                  <p>{isAr ? 'سيتواصل معك فريق المعاينات قبل الموعد لتأكيد موقع وتفاصيل الزيارة.' : 'Our team will contact you to confirm directions.'}</p>
                </div>
              ) : (
                <form onSubmit={handleBookingSubmit} className="booking-form-wrap">
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
                    <label>{isAr ? 'الاسم بالكامل * (إلزامي)' : 'Full Name * (Required)'}</label>
                    <input
                      type="text"
                      placeholder={isAr ? 'مثال: محمد السيد' : 'John Doe'}
                      value={bookingForm.name}
                      onChange={(e) => setBookingForm({ ...bookingForm, name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group-item">
                    <label>{isAr ? 'رقم الواتساب * (إلزامي لتأكيد المعاينة والموقع)' : 'WhatsApp Number * (Required)'}</label>
                    <input
                      type="tel"
                      placeholder="01012345678"
                      value={bookingForm.phone}
                      onChange={(e) => setBookingForm({ ...bookingForm, phone: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group-item">
                    <label>{isAr ? 'تاريخ المعاينة المفضل' : 'Preferred Date'}</label>
                    <input
                      type="date"
                      value={bookingForm.date}
                      onChange={(e) => setBookingForm({ ...bookingForm, date: e.target.value })}
                    />
                  </div>

                  <div className="form-group-item">
                    <label>{isAr ? 'الفترة الزمنية المفضلة للمعاينة' : 'Preferred Time Slot'}</label>
                    <div className="booking-time-slot-pills">
                      <button
                        type="button"
                        className={`slot-pill ${bookingForm.slot === 'morning' ? 'active' : ''}`}
                        onClick={() => setBookingForm({ ...bookingForm, slot: 'morning' })}
                      >
                        {isAr ? '☀️ صباحاً (10 ص - 2 ظ)' : '☀️ Morning (10AM - 2PM)'}
                      </button>
                      <button
                        type="button"
                        className={`slot-pill ${bookingForm.slot === 'evening' || !bookingForm.slot ? 'active' : ''}`}
                        onClick={() => setBookingForm({ ...bookingForm, slot: 'evening' })}
                      >
                        {isAr ? '🌙 مساءً (5 م - 9 م)' : '🌙 Evening (5PM - 9PM)'}
                      </button>
                    </div>
                  </div>

                  <button type="submit" className="btn btn-primary btn-full" disabled={isBookingSubmitting}>
                    <Calendar size={16} />
                    <span>{isBookingSubmitting ? (isAr ? 'جاري تأكيد الموعد...' : 'Confirming...') : (isAr ? 'تأكيد طلب المعاينة مجاناً' : 'Confirm Free Viewing')}</span>
                  </button>
                </form>
              )}

              {/* Safe Legal Guarantee */}
              <div className="sidebar-legal-guarantee">
                <ShieldCheck size={16} className="text-gold" />
                <span>{isAr ? 'معاينة مجانية بدون أي رسوم أو عمولات خفية' : 'Free inspection with zero hidden fees'}</span>
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
              title={isAr ? 'حجز بإنستاباي' : 'Reserve'}
            >
              <ShieldCheck size={16} />
              <span>{isAr ? 'حجز' : 'Reserve'}</span>
            </button>

            <a
              href={getWhatsAppUrl(`مرحباً 1Line، أريد الاستفسار عن كود: ${property.id.toUpperCase()}`)}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-whatsapp-mini"
            >
              <MessageSquare size={16} />
            </a>

            <a href={getPhoneCallUrl()} className="btn btn-call-mini">
              <Phone size={16} />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
