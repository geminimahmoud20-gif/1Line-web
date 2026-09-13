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
  ChevronRight,
  ChevronLeft
} from 'lucide-react';
import { getPropertyViews } from '../../utils/visitorTracker';
import { getFounderSettings, getWhatsAppUrl } from '../../utils/founderCmsData';
import { formatCurrencyPrice, getPriceBenchmark } from '../../utils/currencyAndBenchmark';
import BrandWatermark from '../common/BrandWatermark';

const FALLBACK_PROPERTY_IMG = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 500' fill='%23071e3d'%3E%3Crect width='800' height='500' fill='%23071e3d'/%3E%3Cpath d='M400 130 L620 320 L180 320 Z' fill='%230b4ea2' opacity='0.7'/%3E%3Crect x='340' y='220' width='120' height='100' rx='20' fill='%23fdcb42' opacity='0.85'/%3E%3Ctext x='50%25' y='75%25' dominant-baseline='middle' text-anchor='middle' fill='%23ffffff' font-family='sans-serif' font-size='24' font-weight='bold'%3E1LINE REAL ESTATE%3C/text%3E%3Ctext x='50%25' y='85%25' dominant-baseline='middle' text-anchor='middle' fill='%23fdcb42' font-family='sans-serif' font-size='16'%3E%D8%B9%D9%82%D8%A7%D8%B1%D8%A7%D8%AA%20%D8%B3%D9%88%D9%87%D8%A7%D8%AC%20%D8%A7%D9%84%D9%85%D8%B9%D8%AA%D9%85%D8%AF%D8%A9%3C/text%3E%3C/svg%3E";

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

  const title = lang === 'ar' ? property.title_ar : property.title_en;
  const location = lang === 'ar' ? property.locationName_ar : property.locationName_en;
  const badge = lang === 'ar' ? property.badge_ar : property.badge_en;
  const viewsCount = getPropertyViews(property.id);
  const imagesList = property.images && property.images.length > 0 ? property.images : [FALLBACK_PROPERTY_IMG];
  const priceData = formatCurrencyPrice(property.price, currency, lang);
  const benchmark = getPriceBenchmark(property, lang);

  return (
    <div className="property-card-modern cinematic-card">
      {/* 16:9 Cinematic Image Container */}
      <div className="property-card-media aspect-16-9">
        <img
          src={imagesList[activeImageIndex] || imagesList[0] || FALLBACK_PROPERTY_IMG}
          alt={title}
          className={`property-card-img ${imageLoaded ? 'loaded' : 'loading'}`}
          onLoad={() => setImageLoaded(true)}
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = FALLBACK_PROPERTY_IMG;
            setImageLoaded(true);
          }}
          loading="lazy"
        />

        {/* Interactive Thumbnail Indicator Dots */}
        {imagesList.length > 1 && (
          <div className="card-thumb-dots-container" onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
            {imagesList.slice(0, 4).map((_, idx) => (
              <span
                key={idx}
                className={`card-thumb-dot ${activeImageIndex === idx ? 'active' : ''}`}
                onMouseEnter={() => setActiveImageIndex(idx)}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setActiveImageIndex(idx);
                }}
                title={`صورة ${idx + 1}`}
              />
            ))}
          </div>
        )}

        {/* Interactive Next / Prev Photo Cycling Arrows on Hover */}
        {imagesList.length > 1 && (
          <div className="card-media-nav-arrows">
            <button
              type="button"
              className="card-nav-arrow arrow-prev"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setActiveImageIndex((prev) => (prev > 0 ? prev - 1 : imagesList.length - 1));
              }}
              title={lang === 'ar' ? 'الصورة السابقة' : 'Previous photo'}
              aria-label="Previous photo"
            >
              {lang === 'ar' ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            </button>
            <button
              type="button"
              className="card-nav-arrow arrow-next"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setActiveImageIndex((prev) => (prev < imagesList.length - 1 ? prev + 1 : 0));
              }}
              title={lang === 'ar' ? 'الصورة التالية' : 'Next photo'}
              aria-label="Next photo"
            >
              {lang === 'ar' ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
            </button>
          </div>
        )}

        {/* Brand Watermark Overlay */}
        <BrandWatermark size="sm" position="bottom-right" />

        {/* Badges Layer */}
        {/* Badges Layer - Clean & Minimal Luxury */}
        <div className="card-top-badges">
          {(badge || property.featured) && (
            <span className="property-badge gold-badge">
              {badge || (lang === 'ar' ? 'حصري' : 'Exclusive')}
            </span>
          )}
          {property.virtualTour && (
            <span className="property-badge tour-badge">
              <Sparkles size={12} />
              <span>{lang === 'ar' ? 'جولة 3D' : '3D'}</span>
            </span>
          )}
        </div>

        {/* Floating Quick Action Buttons */}
        <div className="card-media-actions">
          <button
            type="button"
            className={`card-circle-btn ${isFavorite ? 'favorite-active' : ''}`}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggleFavorite(property.id);
            }}
            title={lang === 'ar' ? 'حفظ في المفضلة' : 'Save to Favorites'}
          >
            <Heart size={16} fill={isFavorite ? '#ef4444' : 'none'} color={isFavorite ? '#ef4444' : '#ffffff'} />
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
            >
              <Scale size={15} color={isCompared ? '#ffb300' : '#ffffff'} />
            </button>
          )}
        </div>

        {/* Bottom Price Tag on Image with Multi-Currency Support */}
        <div className="card-price-overlay">
          <div style={{ display: 'inline-flex', alignItems: 'baseline', gap: '4px' }}>
            <span className="price-val">{priceData.primary}</span>
            <span className="price-curr">{priceData.symbol}</span>
          </div>
          {priceData.isConverted && (
            <span className="price-converted-sub" style={{ fontSize: '0.68rem', opacity: 0.88, display: 'block' }}>
              ≈ {priceData.originalEgp}
            </span>
          )}
        </div>
      </div>

      {/* Card Content */}
      <div className="property-card-body">
        {/* District & Legal Shield Tag */}
        <div className="card-sub-header">
          <div className="property-location-tag">
            <MapPin size={13} className="text-muted" />
            <span>{location}</span>
          </div>

          <span className="verified-pill-subtle">
            <ShieldCheck size={12} className="text-emerald" />
            <span>{lang === 'ar' ? 'مرخص قانونياً 100%' : '100% Verified'}</span>
          </span>
        </div>

        {/* Title */}
        <h3 className="property-card-title">
          <Link to={`/properties/${property.id}`}>{title}</Link>
        </h3>

        {/* Unified Clean Specs Strip */}
        <div className="property-specs-clean">
          <span className="spec-unit">
            <Maximize2 size={13} className="text-muted" />
            <span><strong>{property.size}</strong> {lang === 'ar' ? 'م²' : 'sqm'}</span>
          </span>
          {property.bedrooms > 0 && (
            <>
              <span className="spec-dot">•</span>
              <span className="spec-unit">
                <BedDouble size={14} className="text-muted" />
                <span><strong>{property.bedrooms}</strong> {lang === 'ar' ? 'غرف' : 'Beds'}</span>
              </span>
            </>
          )}
          {property.bathrooms > 0 && (
            <>
              <span className="spec-dot">•</span>
              <span className="spec-unit">
                <Bath size={13} className="text-muted" />
                <span><strong>{property.bathrooms}</strong> {lang === 'ar' ? 'حمام' : 'Baths'}</span>
              </span>
            </>
          )}
        </div>

        {/* Sohag Benchmark (If applicable) */}
        {benchmark && (
          <div className="card-benchmark-clean">
            <span className="benchmark-tag">
              <span>{benchmark.badgeType === 'deal' ? '🔥' : benchmark.badgeType === 'premium' ? '💎' : '⚖️'}</span>
              <span>{benchmark.badgeLabel}</span>
            </span>
            <span className="benchmark-meter">{benchmark.pricePerMeterFormatted}</span>
          </div>
        )}

        {/* Minimal Finance Info */}
        {(property.downPayment > 0 || property.monthlyInstallment > 0) && (
          <div className="card-finance-row">
            {property.downPayment > 0 && (
              <span className="fin-pill">
                <span className="fin-lbl">{lang === 'ar' ? 'مقدم:' : 'Down:'}</span>
                <strong>{property.downPayment.toLocaleString()} {lang === 'ar' ? 'ج.م' : 'EGP'}</strong>
              </span>
            )}
            {property.monthlyInstallment > 0 && (
              <span className="fin-pill">
                <span className="fin-lbl">{lang === 'ar' ? 'قسط:' : 'Monthly:'}</span>
                <strong className="text-gold">{property.monthlyInstallment.toLocaleString()} {lang === 'ar' ? 'ج.م' : 'EGP'}</strong>
              </span>
            )}
          </div>
        )}

        {/* Streamlined Footer Actions */}
        <div className="property-card-footer-streamlined">
          <Link 
            to={`/properties/${property.id}`} 
            className="btn-card-main"
          >
            <span>{lang === 'ar' ? 'استعراض العقار والتفاصيل' : 'View Details & Book Tour'}</span>
            {lang === 'ar' ? <ArrowLeft size={14} /> : <ArrowRight size={14} />}
          </Link>

          {/* Quick WhatsApp Inquiry */}
          <button
            type="button"
            className="btn-card-wa-icon"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const msg = lang === 'ar'
                ? `مرحباً 1Line، أستفسر عن عقار: "${title}" بسعر ${property.price.toLocaleString()} ج.م (كود: #${property.id}). هل هو متاح للمعاينة؟`
                : `Hello 1Line, inquiring about property "${title}" priced at ${property.price.toLocaleString()} EGP (ID: #${property.id}).`;
              window.open(getWhatsAppUrl(msg), '_blank');
            }}
            title={lang === 'ar' ? 'استفسار فوري عبر واتساب' : 'Quick WhatsApp'}
          >
            <MessageSquare size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
