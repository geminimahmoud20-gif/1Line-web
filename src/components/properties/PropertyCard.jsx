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
  Flame,
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
import { getFounderSettings, getWhatsAppUrl } from '../../utils/founderCmsData';
import { formatCurrencyPrice, getPriceBenchmark } from '../../utils/currencyAndBenchmark';
import BrandWatermark from '../common/BrandWatermark';

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

    // Ensure concise landmark representation (<= 20 chars)
    const finalDetail = cleanDetail.length > 20 ? cleanDetail.substring(0, 18).trim() + '…' : cleanDetail;
    return `${city} • ${finalDetail}`;
  }
  return loc.length > 28 ? loc.substring(0, 26).trim() + '…' : loc;
}

// Concise formatters for commercial, office and land specs to guarantee 0% overflow
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
  const badge = lang === 'ar' ? property.badge_ar : property.badge_en;
  const viewsCount = getPropertyViews(property.id);
  const imagesList = (Array.isArray(property.images) && property.images.length > 0) ? property.images : [FALLBACK_PROPERTY_IMG];
  const priceData = formatCurrencyPrice(property.price, currency, lang);
  const benchmark = getPriceBenchmark(property, lang);

  // 🎯 Single Sovereign Status Badge (توحيد الشارات إلى شارة سيادية فاخرة)
  const resolvedBadge = (() => {
    if (property.isOffMarket || property.isPrivateDeal) {
      return {
        label: lang === 'ar' ? 'صفقة خاصة' : 'Off-Market Private',
        Icon: Sparkles,
        className: 'badge-deal'
      };
    }
    return {
      label: lang === 'ar' ? 'معتمد رسمياً من 1Line' : '1Line Verified',
      Icon: ShieldCheck,
      className: 'badge-verified'
    };
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

  const BadgeIcon = resolvedBadge.Icon;

  // Sector separation logic: Strictly distinct land, commercial, office, residential
  const isLand = property.type === 'land' || (title && title.includes('أرض'));
  const isCommercial = !isLand && (property.type === 'commercial' || property.category === 'commercial' || (title && (title.includes('محل') || title.includes('معرض') || title.includes('ريتيل') || title.includes('تجاري'))));
  const isOffice = !isLand && !isCommercial && (property.type === 'office' || property.category === 'administrative' || (title && (title.includes('مكتب') || title.includes('عيادة') || title.includes('إداري'))));

  return (
    <div className="property-card-modern group" data-property-id={property.id}>
      {/* Visual Anchor: Image Header with Smart Media Actions */}
      <div className="card-media-wrapper">
        <Link 
          to={`/properties/${property.id}`} 
          className="card-media-link"
          onClick={() => {
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('oneline_property_viewed', { detail: { id: property.id, title } }));
            }
          }}
        >
          <img 
            src={imagesList[activeImageIndex] || FALLBACK_PROPERTY_IMG} 
            alt={title}
            className={`property-card-img ${imageLoaded ? 'loaded' : 'loading'}`}
            loading="lazy"
            onLoad={() => setImageLoaded(true)}
            onError={(e) => {
              e.currentTarget.src = FALLBACK_PROPERTY_IMG;
              setImageLoaded(true);
            }}
          />
        </Link>

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
              aria-label="Previous photo"
            >
              {lang === 'ar' ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            </button>
            <button 
              type="button" 
              className="carousel-arrow next" 
              onClick={handleNextImage}
              aria-label="Next photo"
            >
              {lang === 'ar' ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
            </button>
          </div>
        )}

        {/* Sovereign Status Badges (Verified + 0% Buyer Commission + 3D Virtual Tour) */}
        <div className="card-top-badges">
          <span className={`property-badge ${resolvedBadge.className}`}>
            <BadgeIcon size={12} className="badge-svg-icon" />
            <span>{resolvedBadge.label}</span>
          </span>
          <div className="card-secondary-badges">
            <span className="property-badge badge-commission">
              <CheckCircle2 size={11} />
              <span>{lang === 'ar' ? '0% عمولة' : '0% Fee'}</span>
            </span>
            {property.virtualTour && (
              <span className="property-badge badge-virtual-tour">
                <Sparkles size={11} />
                <span>{lang === 'ar' ? 'معاينة 3D' : '3D Tour'}</span>
              </span>
            )}
          </div>
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
              aria-label="Quick View"
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
            aria-label="Toggle Favorite"
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
              aria-label="Toggle Compare"
            >
              <Scale size={15} color={isCompared ? '#d97706' : 'currentColor'} />
            </button>
          )}
        </div>

        {/* Bottom Total Price Banner on Image */}
        <div className="card-price-overlay">
          <div style={{ display: 'inline-flex', alignItems: 'baseline', gap: '4px' }}>
            <bdi className="price-val">{priceData.primary}</bdi>
            <bdi className="price-curr">{priceData.symbol}</bdi>
          </div>
          {priceData.isConverted && (
            <span className="price-converted-sub" style={{ fontSize: '0.68rem', opacity: 0.88, display: 'block' }}>
              ≈ <bdi>{priceData.originalEgp}</bdi>
            </span>
          )}
        </div>
      </div>

      {/* Card Body with Standardized Decision Core */}
      <div className="property-card-body">
        {/* District & Area Benchmark */}
        <div className="card-sub-header">
          <div className="property-location-tag" title={location}>
            <MapPin size={13} className="text-muted" style={{ flexShrink: 0 }} />
            <span>{formatCardLocation(location)}</span>
          </div>
          {benchmark?.pricePerMeterFormatted && (
            <span className="benchmark-meter-subtle" title={benchmark.badgeLabel}>
              <bdi>{benchmark.pricePerMeterFormatted}</bdi>
            </span>
          )}
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

        {/* 🏛️ STANDARDIZED ARCHITECTURAL DECISION CORE (Quiet Luxury) */}
        <div className="property-decision-core">
          {/* Top Spec Header: Size & Payment Plan Tag */}
          <div className="core-specs-header">
            <div className="core-size-pill">
              <Maximize2 size={13} className="core-spec-icon" />
              <span className="core-size-val"><bdi>{property.size}</bdi></span>
              <span className="core-size-unit">{lang === 'ar' ? 'م² صافي' : 'sqm net'}</span>
            </div>

            {property.monthlyInstallment > 0 ? (
              <span className="core-plan-tag installment-tag">
                <Sparkles size={11} className="plan-icon" />
                <span>{lang === 'ar' ? 'تقسيط متاح' : 'Installments'}</span>
              </span>
            ) : (
              <span className="core-plan-tag cash-tag">
                <ShieldCheck size={11} className="plan-icon" />
                <span>{lang === 'ar' ? 'كاش معتمد' : 'Full Cash'}</span>
              </span>
            )}
          </div>

          {/* Financial Breakdown: Elegant Dual-Metric Grid or Certified Cash Banner */}
          <div className="core-finance-grid">
            {property.monthlyInstallment > 0 ? (
              <>
                <div className="core-fin-col">
                  <span className="fin-col-label">{lang === 'ar' ? 'المقدم' : 'Down Payment'}</span>
                  <div className="fin-col-value">
                    <bdi>{(Number(property.downPayment) || 0).toLocaleString()}</bdi>
                    <span className="fin-col-currency">{lang === 'ar' ? 'ج.م' : 'EGP'}</span>
                  </div>
                </div>

                <div className="core-fin-divider" aria-hidden="true" />

                <div className="core-fin-col">
                  <span className="fin-col-label">{lang === 'ar' ? 'القسط' : 'Monthly'}</span>
                  <div className="fin-col-value highlight-installment">
                    <bdi>{(Number(property.monthlyInstallment) || 0).toLocaleString()}</bdi>
                    <span className="fin-col-currency">{lang === 'ar' ? 'ج.م' : 'EGP'}</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="core-cash-deal-banner">
                <ShieldCheck size={13} className="cash-shield-icon" />
                <span>{lang === 'ar' ? 'خالص الثمن بدون أقساط • استلام فوري' : 'Fully Paid • Ready for Handover'}</span>
              </div>
            )}
          </div>
        </div>

        {/* Secondary Specs Strip - Strictly Differentiated by Sector */}
        <div className="property-specs-clean secondary-specs">
          {/* 1. Commercial Retail Units: NO Bedrooms, NO Bathrooms */}
          {isCommercial ? (
            <>
              <span className="spec-unit">
                <Store size={13} className="spec-icon text-gold" />
                <span><strong>{formatCommercialSpec(property.commercialType_ar, lang)}</strong></span>
              </span>
              <span className="spec-dot">•</span>
              <span className="spec-unit">
                <span>{property.frontage ? property.frontage : (property.floor === 0 ? (lang === 'ar' ? 'دور أرضي' : 'Ground Floor') : (lang === 'ar' ? `دور ${property.floor}` : `Floor ${property.floor}`))}</span>
              </span>
              <span className="spec-dot">•</span>
              <span className="spec-unit spec-unit-trust">
                <ShieldCheck size={13} className="spec-trust-icon" />
                <span>{lang === 'ar' ? 'ترخيص تجاري' : 'Licensed'}</span>
              </span>
            </>
          ) : isOffice ? (
            /* 2. Administrative & Clinics: NO Bedrooms */
            <>
              <span className="spec-unit">
                <Briefcase size={13} className="spec-icon text-gold" />
                <span><strong>{formatOfficeSpec(property.adminType_ar, lang)}</strong></span>
              </span>
              {property.floor !== undefined && (
                <>
                  <span className="spec-dot">•</span>
                  <span className="spec-unit">
                    <span>{property.floor === 0 ? (lang === 'ar' ? 'أرضي' : 'Ground') : (lang === 'ar' ? `دور ${property.floor}` : `Floor ${property.floor}`)}</span>
                  </span>
                </>
              )}
              <span className="spec-dot">•</span>
              <span className="spec-unit spec-unit-trust">
                <ShieldCheck size={13} className="spec-trust-icon" />
                <span>{lang === 'ar' ? 'ترخيص إداري' : 'Licensed'}</span>
              </span>
            </>
          ) : isLand ? (
            /* 3. Land Plots: NO Bedrooms, NO Bathrooms */
            <>
              <span className="spec-unit">
                <Building size={13} className="spec-icon text-gold" />
                <span><strong>{formatLandSpec(property.landType_ar, lang)}</strong></span>
              </span>
              <span className="spec-dot">•</span>
              <span className="spec-unit">
                <span>{property.frontage ? property.frontage : (lang === 'ar' ? 'موقع متميز' : 'Prime Plot')}</span>
              </span>
              <span className="spec-dot">•</span>
              <span className="spec-unit spec-unit-trust">
                <ShieldCheck size={13} className="spec-trust-icon" />
                <span>{lang === 'ar' ? 'ترخيص رسمي' : 'Licensed'}</span>
              </span>
            </>
          ) : (
            /* 4. Residential: Bedrooms & Bathrooms */
            <>
              {property.bedrooms > 0 && (
                <span className="spec-unit">
                  <BedDouble size={13} className="spec-icon" />
                  <span><strong><bdi>{property.bedrooms}</bdi></strong> {lang === 'ar' ? 'غرف' : 'Beds'}</span>
                </span>
              )}
              {property.bathrooms > 0 && (
                <>
                  {property.bedrooms > 0 && <span className="spec-dot">•</span>}
                  <span className="spec-unit">
                    <Bath size={13} className="spec-icon" />
                    <span><strong><bdi>{property.bathrooms}</bdi></strong> {lang === 'ar' ? 'حمام' : 'Baths'}</span>
                  </span>
                </>
              )}
              <span className="spec-dot">•</span>
              <span className="spec-unit spec-unit-trust">
                <ShieldCheck size={13} className="spec-trust-icon" />
                <span>{lang === 'ar' ? 'فحص قانوني معتمد' : 'Verified Title'}</span>
              </span>
            </>
          )}
        </div>

        {/* Streamlined Footer Actions */}
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
            <span>{lang === 'ar' ? 'حجز معاينة وتفاصيل العقار' : 'Book Tour & Details'}</span>
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
            aria-label="Quick WhatsApp Inquiry"
          >
            <MessageSquare size={17} />
          </button>
        </div>
      </div>
    </div>
  );
}
