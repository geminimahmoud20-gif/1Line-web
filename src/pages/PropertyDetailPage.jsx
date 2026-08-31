import { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  MapPin, 
  BedDouble, 
  Bath, 
  Maximize2, 
  Sparkles, 
  Heart, 
  Share2, 
  CheckCircle2, 
  Layers, 
  Calendar, 
  Phone, 
  MessageSquare, 
  ShieldCheck, 
  Clock,
  FileText,
  TrendingUp,
  Compass,
  Calculator,
  DollarSign
} from 'lucide-react';
import PropertyGallery from '../components/properties/PropertyGallery';
import MortgageRoiCalculator from '../components/calculators/MortgageRoiCalculator';
import PropertyCard from '../components/properties/PropertyCard';
import LegalAuditCard from '../components/properties/LegalAuditCard';
import WhatsAppAutomationBar from '../components/properties/WhatsAppAutomationBar';
import DepositModal from '../components/properties/DepositModal';
import PriceBenchmarkIndicator from '../components/properties/PriceBenchmarkIndicator';
import NearbyAmenities from '../components/properties/NearbyAmenities';
import SunlightCompassWidget from '../components/properties/SunlightCompassWidget';
import HistoricalPriceChart from '../components/properties/HistoricalPriceChart';
import LegalTaxCalculator from '../components/calculators/LegalTaxCalculator';
import SocialStoryCardModal from '../components/properties/SocialStoryCardModal';

export default function PropertyDetailPage({
  lang,
  properties,
  favorites,
  onToggleFavorite,
  onQuickView,
  triggerToast
}) {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'legal' | 'valuation' | 'financing'
  const [depositModalOpen, setDepositModalOpen] = useState(false);
  const [storyModalOpen, setStoryModalOpen] = useState(false);

  // Find Property
  const property = useMemo(() => {
    return properties.find(p => p.id === id) || properties[0];
  }, [properties, id]);

  // Booking Form State
  const [bookingForm, setBookingForm] = useState({
    name: '',
    phone: '',
    date: '',
    timeSlot: 'evening',
    notes: ''
  });
  const [bookingSubmitted, setBookingSubmitted] = useState(false);

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

  const isAr = lang === 'ar';
  const title = isAr ? property.title_ar : property.title_en;
  const location = isAr ? property.locationName_ar : property.locationName_en;
  const finishing = isAr ? property.finishing_ar : property.finishing_en;
  const description = isAr ? property.description_ar : property.description_en;
  const features = isAr ? property.features_ar : property.features_en;

  const isFavorite = favorites.includes(property.id);

  const handleBookingSubmit = (e) => {
    e.preventDefault();
    if (!bookingForm.name || !bookingForm.phone) {
      triggerToast(isAr ? 'يرجى إدخال اسمك ورقم هاتفك' : 'Please enter your name and phone', 'error');
      return;
    }

    setBookingSubmitted(true);
    triggerToast(
      isAr 
        ? 'تم تأكيد طلب المعاينة المجانية بنجاح! سيتواصل معك مستشارنا العقاري لتحديد الموعد.' 
        : 'Viewing appointment booked successfully!', 
      'success'
    );
  };

  // Similar properties in same area
  const similarProperties = properties
    .filter((p) => p.id !== property.id && p.areaKey === property.areaKey)
    .slice(0, 3);

  return (
    <div className="property-detail-page-wrapper">
      <div className="detail-container">
        {/* Main Title & Price Header Banner */}
        <div className="detail-header-block">
          <div className="detail-title-col">
            <div className="detail-badges-row">
              {property.badge_ar && <span className="gold-pill-badge">{isAr ? property.badge_ar : property.badge_en}</span>}
              <span className="type-pill-badge">{property.type}</span>
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
              <span className="status-pill-badge">
                <CheckCircle2 size={13} />
                {isAr ? 'مفحوص ومعتمد قانونياً' : 'Legally Verified'}
              </span>
            </div>
            <h1 className="detail-main-title">{title}</h1>
            <div className="detail-location-text">
              <MapPin size={16} />
              <span>{location}</span>
            </div>
          </div>

          <div className="detail-price-box">
            <span className="price-tag-sub">{isAr ? 'السعر الإجمالي' : 'Total Price'}</span>
            <div className="price-num-row">
              <h2>{property.price.toLocaleString()}</h2>
              <span className="curr">{isAr ? 'ج.م' : 'EGP'}</span>
            </div>
            {property.pricePerMeter && (
              <span className="price-per-m">
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
              <div className="tab-pane-content">
                {/* 📉 Smart Market Price Benchmark & Valuation Indicator */}
                <PriceBenchmarkIndicator
                  property={property}
                  lang={lang}
                />

                {/* 📈 Historical Price Trends & Capital Growth Chart */}
                <HistoricalPriceChart
                  areaKey={property.areaKey}
                  lang={lang}
                />

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
                <div className="agent-avatar-circle">OL</div>
                <div>
                  <h4>{isAr ? 'مستشار ون لاين العقاري' : 'One Line Real Estate Advisor'}</h4>
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
                  href={`https://wa.me/201012345678?text=${encodeURIComponent(`مرحباً ون لاين، أريد الاستفسار عن كود العقار: ${property.id.toUpperCase()} (${title})`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-whatsapp-half"
                >
                  <MessageSquare size={16} />
                  <span>{isAr ? 'واتساب' : 'WhatsApp'}</span>
                </a>

                <a href="tel:+201012345678" className="btn btn-call-half">
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
                  <div className="form-group-item">
                    <label>{isAr ? 'الاسم بالكامل' : 'Full Name'}</label>
                    <input
                      type="text"
                      placeholder={isAr ? 'مثال: محمد السيد' : 'John Doe'}
                      value={bookingForm.name}
                      onChange={(e) => setBookingForm({ ...bookingForm, name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group-item">
                    <label>{isAr ? 'رقم الهاتف / الواتساب' : 'Phone / WhatsApp'}</label>
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

                  <button type="submit" className="btn btn-primary btn-full">
                    <Calendar size={16} />
                    <span>{isAr ? 'تأكيد طلب المعاينة مجاناً' : 'Confirm Free Viewing'}</span>
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

        {/* 📱 Sticky Mobile Quick Action Bar (Solves Scrolling on Phones) */}
        <div className="mobile-detail-sticky-bar">
          <div className="mobile-sticky-price">
            <span className="mob-lbl">{isAr ? 'السعر' : 'Price'}</span>
            <strong>{property.price.toLocaleString()} ج.م</strong>
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
              href={`https://wa.me/201012345678?text=${encodeURIComponent(`مرحباً ون لاين، أريد الاستفسار عن كود: ${property.id.toUpperCase()}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-whatsapp-mini"
            >
              <MessageSquare size={16} />
            </a>

            <a href="tel:+201012345678" className="btn btn-call-mini">
              <Phone size={16} />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
