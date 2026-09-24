import { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  MapPin, 
  BedDouble, 
  Bath, 
  Maximize2, 
  Sparkles, 
  Heart, 
  ArrowRight, 
  ArrowLeft,
  Eye,
  Scale,
  MessageSquare,
  ShieldCheck,
  Building,
  Store,
  Briefcase,
  ChevronRight,
  ChevronLeft,
  CheckCircle2
} from 'lucide-react';
import { getPropertyViews } from '../../utils/visitorTracker';
import { getWhatsAppUrl } from '../../utils/founderCmsData';
import { formatCurrencyPrice, getPriceBenchmark } from '../../utils/currencyAndBenchmark';

const FALLBACK_PROPERTY_IMG = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 500' fill='%23071e3d'%3E%3Crect width='800' height='500' fill='%23071e3d'/%3E%3Cpath d='M400 130 L620 320 L180 320 Z' fill='%230b4ea2' opacity='0.7'/%3E%3Crect x='340' y='220' width='120' height='100' rx='20' fill='%23fdcb42' opacity='0.85'/%3E%3Ctext x='50%25' y='75%25' dominant-baseline='middle' text-anchor='middle' fill='%23ffffff' font-family='sans-serif' font-size='24' font-weight='bold'%3E1LINE REAL ESTATE%3C/text%3E%3Ctext x='50%25' y='85%25' dominant-baseline='middle' text-anchor='middle' fill='%23fdcb42' font-family='sans-serif' font-size='16'%3E%D8%B9%D9%82%D8%A7%D8%B1%D8%A7%D8%AA%20%D8%B3%D9%88%D9%87%D8%A7%D8%AC%20%D8%A7%D9%84%D9%85%D8%B9%D8%AA%D9%85%D8%AF%D8%A9%3C/text%3E%3C/svg%3E";

// Clean formatting for card sub-header location to avoid awkward clipping
function formatCardLocation(loc) {
  if (!loc || typeof loc !== 'string') return '';
  if (loc.includes(' - ')) {
    const parts = loc.split(' - ');
    const city = parts[0].trim();
    let detailed = (parts[1] || '').trim();

    // Strip leading prepositions like "بالقرب من", "قرب", "أمام", "بجوار", "خلف", "قطاع"
    detailed = detailed.replace(/^(?:بالقرب من|قرب من|قرب|أمام|بجوار|خلف|قطاع)\s+/i, '');

    // Extract primary landmark before secondary clauses
    const cleanDetail = detailed
      .split(/\s+(?:بالقرب|قرب|أمام|بجوار|خلف|ومحطة|وعلى)\s+/i)[0]
      .trim();

    // Ensure concise landmark representation (<= 22 chars)
    const finalDetail = cleanDetail.length > 22 ? cleanDetail.substring(0, 20).trim() + '…' : cleanDetail;
    return `${city} • ${finalDetail}`;
  }
  return loc.length > 28 ? loc.substring(0, 26).trim() + '…' : loc;
}

// Concise formatters for commercial, office and land specs
function formatOfficeSpec(adminType, lang) {
  if (!adminType) return lang === 'ar' ? 'مقر إداري' : 'Office';
  if (lang !== 'ar') return adminType.length > 18 ? 'Medical / Clinic' : adminType;
  if (adminType.includes('عيادة')) return 'عيادة طبية مجهزة';
  if (adminType.includes('مكتب') || adminType.includes('مقر')) return 'مقر إداري مجهز';
  return adminType.length > 18 ? adminType.substring(0, 16).trim() + '…' : adminType;
}

function formatCommercialSpec(commType, lang) {
  if (!commType) return lang === 'ar' ? 'محل تجاري واجهة' : 'Retail Shop';
  if (lang !== 'ar') return commType.length > 18 ? 'Retail Store' : commType;
  if (commType.includes('محل')) return 'محل تجاري واجهة';
  if (commType.includes('معرض')) return 'معرض تجاري';
  return commType.length > 18 ? commType.substring(0, 16).trim() + '…' : commType;
}

function formatLandSpec(landType, lang) {
  if (!landType) return lang === 'ar' ? 'أرض استثمارية' : 'Investment Plot';
  if (lang !== 'ar') return landType.length > 18 ? 'Building Plot' : landType;
  if (landType.includes('بناء') || landType.includes('سكنية')) return 'أرض سكنية مرخصة';
  if (landType.includes('تجارية')) return 'أرض تجارية';
  return landType.length > 18 ? landType.substring(0, 16).trim() + '…' : landType;
}

export default function PropertyCard({ 
  property, 
  lang = 'ar', 
  currency = 'EGP', 
  isFavorite = false, 
  onToggleFavorite, 
  isCompared = false, 
  onToggleCompare, 
  onQuickView 
}) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  if (!property) return null;

  const title = lang === 'ar' ? (property.title_ar || property.title_en || '') : (property.title_en || property.title_ar || '');
  const location = lang === 'ar' ? (property.locationName_ar || property.locationName_en || '') : (property.locationName_en || property.locationName_ar || '');
  const imagesList = (Array.isArray(property.images) && property.images.length > 0) ? property.images : [FALLBACK_PROPERTY_IMG];
  const priceData = formatCurrencyPrice(property.price, currency, lang);
  const benchmark = getPriceBenchmark(property, lang);

  // One restrained status badge at most: private deal, or documents reviewed (only when the listing has a legal record)
  const resolvedBadge = (() => {
    if (property.isOffMarket || property.isPrivateDeal) {
      return {
        label: lang === 'ar' ? 'صفقة خاصة' : 'Private deal',
        Icon: Sparkles,
        className: 'badge-deal'
      };
    }
    if (property.legalStatus) {
      return {
        label: lang === 'ar' ? 'مستندات مراجَعة' : 'Documents reviewed',
        Icon: ShieldCheck,
        className: 'badge-verified'
      };
    }
    return null;
  })();

  const handlePrevImage = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveImageIndex((prev) => (prev > 0 ? prev - 1 : imagesList.length - 1));
  };

  const handleNextImage = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveImageIndex((prev) => (prev < imagesList.length - 1 ? prev + 1 : 0));
  };

  const BadgeIcon = resolvedBadge?.Icon;

  // Sector separation logic: Strictly distinct land, commercial, office, residential
  const isLand = property.type === 'land' || (title && title.includes('أرض'));
  const isCommercial = !isLand && (property.type === 'commercial' || property.category === 'commercial' || (title && (title.includes('محل') || title.includes('معرض') || title.includes('ريتيل') || title.includes('تجاري'))));
  const isOffice = !isLand && !isCommercial && (property.type === 'office' || property.category === 'administrative' || (title && (title.includes('مكتب') || title.includes('عيادة') || title.includes('إداري'))));

  const sectorLabel = isCommercial 
    ? (lang === 'ar' ? 'تجاري' : 'Commercial') 
    : isOffice 
      ? (lang === 'ar' ? 'إداري' : 'Office') 
      : isLand 
        ? (lang === 'ar' ? 'أرض' : 'Land') 
        : (lang === 'ar' ? 'سكني' : 'Residential');

  return (
    <div className="property-card-modern group" data-property-id={property.id}>
      {/* 1. Cinematic Media Container */}
      <div className="card-media-wrapper">
        {(() => {
          const img = (
            <img
              src={imagesList[activeImageIndex] || FALLBACK_PROPERTY_IMG}
              alt={title}
              className={`property-card-img ${imageLoaded ? 'loaded' : 'loading'}`}
              loading="lazy"
              decoding="async"
              onLoad={() => setImageLoaded(true)}
              onError={(e) => {
                e.currentTarget.src = FALLBACK_PROPERTY_IMG;
                setImageLoaded(true);
              }}
            />
          );
          // Photo opens the quick view in place when available; the title still links to the full page
          return onQuickView ? (
            <button
              type="button"
              className="card-media-link card-media-quickview"
              onClick={() => onQuickView(property)}
              aria-label={lang === 'ar' ? `معاينة سريعة: ${title}` : `Quick view: ${title}`}
            >
              {img}
            </button>
          ) : (
            <Link
              to={`/properties/${property.id}`}
              className="card-media-link"
              onClick={() => {
                if (typeof window !== 'undefined') {
                  window.dispatchEvent(new CustomEvent('oneline_property_viewed', { detail: { id: property.id, title } }));
                }
              }}
            >
              {img}
            </Link>
          );
        })()}

        {/* Dynamic Multi-photo carousel indicator */}
        {imagesList.length > 1 && (
          <div className="card-thumb-dots-container">
            {imagesList.slice(0, 5).map((_, idx) => (
              <span 
                key={idx} 
                className={`card-thumb-dot ${idx === activeImageIndex ? 'active' : ''}`}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setActiveImageIndex(idx);
                }}
              />
            ))}
          </div>
        )}

        {/* Micro Carousel Nav Arrows */}
        {imagesList.length > 1 && (
          <div className="card-carousel-arrows">
            <button 
              type="button" 
              className="carousel-arrow prev" 
              onClick={handlePrevImage}
              aria-label={lang === 'ar' ? 'الصورة السابقة' : 'Previous photo'}
            >
              {lang === 'ar' ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            </button>
            <button 
              type="button" 
              className="carousel-arrow next" 
              onClick={handleNextImage}
              aria-label={lang === 'ar' ? 'الصورة التالية' : 'Next photo'}
            >
              {lang === 'ar' ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
            </button>
          </div>
        )}

        {/* Sovereign Status Badges */}
        <div className="card-top-badges">
          {resolvedBadge && (
            <span className={`property-badge ${resolvedBadge.className}`}>
              <BadgeIcon size={12} className="badge-svg-icon" aria-hidden="true" />
              <span>{resolvedBadge.label}</span>
            </span>
          )}
          {property.virtualTour && (
            <div className="card-secondary-badges">
              <span className="property-badge badge-virtual-tour">
                <span>{lang === 'ar' ? 'جولة 360°' : '360° tour'}</span>
              </span>
            </div>
          )}
        </div>

        {/* Floating Quick Action Buttons */}
        <div className="card-media-actions">
          {onQuickView && (
            <button
              type="button"
              className="card-circle-btn"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onQuickView(property);
              }}
              title={lang === 'ar' ? 'معاينة سريعة' : 'Quick View'}
              aria-label={lang === 'ar' ? 'معاينة سريعة' : 'Quick view'}
            >
              <Eye size={15} />
            </button>
          )}

          <button
            type="button"
            className={`card-circle-btn ${isFavorite ? 'favorite-active' : ''}`}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggleFavorite(property.id);
            }}
            title={lang === 'ar' ? 'حفظ في المفضلة' : 'Save to Favorites'}
            aria-label={lang === 'ar' ? 'حفظ في المفضلة' : 'Save to favorites'}
            aria-pressed={!!isFavorite}
          >
            <Heart size={16} fill={isFavorite ? '#ef4444' : 'none'} color={isFavorite ? '#ef4444' : 'currentColor'} />
          </button>

          {onToggleCompare && (
            <button
              type="button"
              className={`card-circle-btn ${isCompared ? 'compare-active' : ''}`}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onToggleCompare(property);
              }}
              title={lang === 'ar' ? 'إضافة للمقارنة' : 'Add to Compare'}
              aria-label={lang === 'ar' ? 'إضافة للمقارنة' : 'Add to compare'}
              aria-pressed={!!isCompared}
            >
              <Scale size={15} color={isCompared ? '#d97706' : 'currentColor'} />
            </button>
          )}
        </div>

      </div>

      {/* 2. Card Body: Architectural Editorial Hierarchy */}
      <div className="property-card-body">
        {/* Price sits under the photo — no dark scrim over the architecture */}
        <div className="card-price-row">
          <div className="card-price-main">
            <bdi className="card-price-val">{priceData.primary}</bdi>
            <span className="card-price-curr">{priceData.symbol}</span>
          </div>
          {benchmark?.pricePerMeterFormatted && (
            <span className="card-price-meter" title={benchmark.badgeLabel}>
              <bdi>{benchmark.pricePerMeterFormatted}</bdi>
            </span>
          )}
          {priceData.isConverted && (
            <span className="card-price-converted">≈ <bdi>{priceData.originalEgp}</bdi></span>
          )}
        </div>

        {/* District & Sector Tag */}
        <div className="card-sub-header">
          <div className="property-location-tag" title={location}>
            <MapPin size={14} strokeWidth={1.5} className="loc-pin-icon" />
            <span>{formatCardLocation(location)}</span>
          </div>
          <span className="property-sector-pill">{sectorLabel}</span>
        </div>

        {/* Title */}
        <h3 className="property-card-title">
          <Link 
            to={`/properties/${property.id}`}
            onClick={() => {
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('oneline_property_viewed', { detail: { id: property.id, title } }));
              }
            }}
          >
            {title}
          </Link>
        </h3>

        {/* 📐 Clean Architectural Specifications Strip (No Box Clutter) */}
        <div className="property-specs-clean">
          {/* Size is universal */}
          <div className="spec-unit">
            <Maximize2 size={14} strokeWidth={1.5} className="spec-icon text-gold" />
            <span><strong><bdi>{property.size}</bdi></strong> {lang === 'ar' ? 'م² صافي' : 'sqm net'}</span>
          </div>

          {/* Sector-Specific Specifications */}
          {isCommercial ? (
            <>
              <span className="spec-dot">•</span>
              <div className="spec-unit">
                <Store size={14} strokeWidth={1.5} className="spec-icon" />
                <span>{formatCommercialSpec(property.commercialType_ar, lang)}</span>
              </div>
              <span className="spec-dot">•</span>
              <div className="spec-unit">
                <span>{property.frontage || (property.floor === 0 ? (lang === 'ar' ? 'أرضي' : 'Ground') : (lang === 'ar' ? `دور ${property.floor}` : `F${property.floor}`))}</span>
              </div>
            </>
          ) : isOffice ? (
            <>
              <span className="spec-dot">•</span>
              <div className="spec-unit">
                <Briefcase size={14} strokeWidth={1.5} className="spec-icon" />
                <span>{formatOfficeSpec(property.adminType_ar, lang)}</span>
              </div>
              {property.floor !== undefined && (
                <>
                  <span className="spec-dot">•</span>
                  <div className="spec-unit">
                    <span>{property.floor === 0 ? (lang === 'ar' ? 'أرضي' : 'Ground') : (lang === 'ar' ? `دور ${property.floor}` : `F${property.floor}`)}</span>
                  </div>
                </>
              )}
            </>
          ) : isLand ? (
            <>
              <span className="spec-dot">•</span>
              <div className="spec-unit">
                <Building size={14} strokeWidth={1.5} className="spec-icon" />
                <span>{formatLandSpec(property.landType_ar, lang)}</span>
              </div>
              <span className="spec-dot">•</span>
              <div className="spec-unit">
                <span>{property.frontage || (lang === 'ar' ? 'موقع متميز' : 'Prime Plot')}</span>
              </div>
            </>
          ) : (
            /* Residential */
            <>
              {property.bedrooms > 0 && (
                <>
                  <span className="spec-dot">•</span>
                  <div className="spec-unit">
                    <BedDouble size={14} strokeWidth={1.5} className="spec-icon" />
                    <span><strong><bdi>{property.bedrooms}</bdi></strong> {lang === 'ar' ? 'غرف' : 'Beds'}</span>
                  </div>
                </>
              )}
              {property.bathrooms > 0 && (
                <>
                  <span className="spec-dot">•</span>
                  <div className="spec-unit">
                    <Bath size={14} strokeWidth={1.5} className="spec-icon" />
                    <span><strong><bdi>{property.bathrooms}</bdi></strong> {lang === 'ar' ? 'حمام' : 'Baths'}</span>
                  </div>
                </>
              )}
            </>
          )}
        </div>

        {/* 🏛️ MODERN ARCHITECTURAL FINANCIAL CORE (Single Unified Surface) */}
        <div className="property-decision-core">
          {property.monthlyInstallment > 0 ? (
            <div className="core-finance-grid">
              <div className="core-fin-col">
                <span className="fin-col-label">{lang === 'ar' ? 'المقدم' : 'Down Payment'}</span>
                <div className="fin-col-value">
                  <bdi>{(Number(property.downPayment) || 0).toLocaleString()}</bdi>
                  <span className="fin-col-currency">{lang === 'ar' ? 'ج.م' : 'EGP'}</span>
                </div>
              </div>

              <div className="core-fin-divider" aria-hidden="true" />

              <div className="core-fin-col">
                <span className="fin-col-label">{lang === 'ar' ? 'القسط الشهري' : 'Monthly'}</span>
                <div className="fin-col-value highlight-installment">
                  <bdi>{(Number(property.monthlyInstallment) || 0).toLocaleString()}</bdi>
                  <span className="fin-col-currency">{lang === 'ar' ? 'ج.م' : 'EGP'}</span>
                </div>
              </div>

              <div className="core-fin-tag-col">
                <span className="core-plan-tag installment-tag">
                  <Sparkles size={11} strokeWidth={1.5} className="plan-icon" />
                  <span>{lang === 'ar' ? 'متاح تقسيط' : 'Installments'}</span>
                </span>
              </div>
            </div>
          ) : (
            <div className="core-cash-deal-banner">
              <ShieldCheck size={14} strokeWidth={1.5} className="cash-shield-icon" />
              <span>{lang === 'ar' ? 'خالص الثمن بدون أقساط • استلام فوري ومعاينة' : 'Fully Paid • Ready for Immediate Handover'}</span>
            </div>
          )}
        </div>

        {/* 3. Luxury Integrated Action Suite */}
        <div className="property-card-footer-streamlined">
          <Link 
            to={`/properties/${property.id}`} 
            className="btn-card-main"
            onClick={() => {
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('oneline_property_viewed', { detail: { id: property.id, title } }));
              }
            }}
          >
            <span>{lang === 'ar' ? 'اطلب تفاصيل الوحدة' : 'Request Details'}</span>
            <span className="btn-card-arrow">
              {lang === 'ar' ? <ArrowLeft size={15} /> : <ArrowRight size={15} />}
            </span>
          </Link>

          {/* Quick Inquiry via WhatsApp */}
          <button
            type="button"
            className="btn-card-wa-icon"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('oneline_whatsapp_clicked', { detail: { id: property.id, title, intent: 'quick_inquiry' } }));
              }
              const msg = lang === 'ar'
                ? `مرحباً 1Line، استفسار سريع بخصوص عقار: "${title}" بسعر ${Number(property.price).toLocaleString()} ج.م (كود: #${property.id}). هل هو متاح للمعاينة؟`
                : `Hello 1Line, quick inquiry about property "${title}" priced at ${Number(property.price).toLocaleString()} EGP (ID: #${property.id}).`;
              window.open(getWhatsAppUrl(msg), '_blank');
            }}
            title={lang === 'ar' ? 'استفسار سريع عبر واتساب' : 'Quick Inquiry via WhatsApp'}
            aria-label={lang === 'ar' ? 'استفسار سريع عبر واتساب' : 'WhatsApp inquiry'}
          >
            <MessageSquare size={17} />
          </button>
        </div>
      </div>
    </div>
  );
}

