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
        <div className="card-top-badges">
          {badge && <span className="property-badge gold-badge">{badge}</span>}
          {property.virtualTour && (
            <span className="property-badge tour-badge">
              <Sparkles size={12} />
              {lang === 'ar' ? 'جولة 3D' : '3D Tour'}
            </span>
          )}
          
          {/* Market Momentum Tag */}
          <span 
            className="property-badge momentum-badge"
            style={{
              background: property.featured ? 'rgba(13, 72, 161, 0.92)' : 'rgba(3, 105, 161, 0.90)',
              border: property.featured ? '1px solid rgba(255, 202, 40, 0.55)' : '1px solid rgba(56, 189, 248, 0.5)',
              color: '#ffffff',
              backdropFilter: 'blur(6px)'
            }}
          >
            {property.featured ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                <Sparkles size={11} style={{ color: '#ffca28' }} />
                <span style={{ color: '#ffca28', fontWeight: '800' }}>{lang === 'ar' ? 'فرصة حصرية' : 'Prime Exclusive'}</span>
              </span>
            ) : viewsCount >= 250 ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', color: '#f59e0b' }}>
                <Flame size={11} />
                <span>{lang === 'ar' ? 'طلب مرتفع' : 'High Demand'}</span>
              </span>
            ) : (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', color: '#10b981' }}>
                <ShieldCheck size={11} />
                <span>{lang === 'ar' ? 'سعر عادل' : 'Fair Price'}</span>
              </span>
            )}
          </span>

          {/* Real-time Views Badge */}
          <span 
            className="property-badge" 
            style={{ 
              background: 'rgba(15, 23, 42, 0.75)', 
              color: '#06b6d4', 
              border: '1px solid rgba(6, 182, 212, 0.4)',
              display: 'flex', 
              alignItems: 'center', 
              gap: '3px',
              backdropFilter: 'blur(4px)'
            }}
            title={lang === 'ar' ? `تمت مشاهدة هذا العقار ${viewsCount} مرة` : `Viewed ${viewsCount} times`}
          >
            <Eye size={11} />
            <span>{viewsCount}</span>
            {viewsCount >= 350 && <span style={{ fontSize: '10px' }}>🔥</span>}
          </span>
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
          <div className="property-location-tag" style={{ margin: 0, color: 'var(--text-secondary)', fontWeight: '700' }}>
            <MapPin size={14} style={{ color: 'var(--brand-navy-light, #0284c7)' }} />
            <span>{location}</span>
          </div>
          <span 
            className="verified-shimmer-badge"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '0.7rem',
              color: '#10b981',
              background: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              padding: '3px 8px',
              borderRadius: '6px',
              fontWeight: '800'
            }}
          >
            <ShieldCheck size={12} style={{ color: '#10b981' }} />
            <span>{lang === 'ar' ? '🛡️ سند ملكية وتراخيص مفحوصة 100%' : '100% Verified Legal Deed'}</span>
          </span>
        </div>

        <h3 className="property-card-title">
          <Link to={`/properties/${property.id}`} style={{ color: 'var(--text-primary)', fontWeight: '800' }}>{title}</Link>
        </h3>

        {/* Specs Grid */}
        <div className="property-specs-grid">
          <div className="spec-item" title={lang === 'ar' ? 'المساحة' : 'Area'}>
            <Maximize2 size={15} style={{ color: 'var(--brand-navy-light, #0284c7)' }} />
            <span style={{ color: 'var(--text-secondary)', fontWeight: '700' }}>{property.size} {lang === 'ar' ? 'م²' : 'sqm'}</span>
          </div>
          {property.bedrooms > 0 && (
            <div className="spec-item" title={lang === 'ar' ? 'غرف النوم' : 'Bedrooms'}>
              <BedDouble size={16} style={{ color: 'var(--accent-gold, #f59e0b)' }} />
              <span style={{ color: 'var(--text-secondary)', fontWeight: '700' }}>{property.bedrooms} {lang === 'ar' ? 'غرف' : 'Beds'}</span>
            </div>
          )}
          {property.bathrooms > 0 && (
            <div className="spec-item" title={lang === 'ar' ? 'الحمامات' : 'Bathrooms'}>
              <Bath size={15} style={{ color: 'var(--primary-light, #38bdf8)' }} />
              <span style={{ color: 'var(--text-secondary)', fontWeight: '700' }}>{property.bathrooms} {lang === 'ar' ? 'حمام' : 'Baths'}</span>
            </div>
          )}
        </div>

        {/* 📊 Sohag District Price Benchmark Strip */}
        {benchmark && (
          <div 
            className="card-benchmark-strip" 
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '6px 10px',
              margin: '8px 0 10px',
              borderRadius: '8px',
              background: benchmark.badgeBg,
              border: `1px solid ${benchmark.badgeColor}33`,
              color: benchmark.badgeColor,
              fontSize: '0.74rem',
              fontWeight: '800'
            }}
            title={lang === 'ar' ? `سعر المتر المحسوب: ${benchmark.pricePerMeterFormatted}` : `Price per m²: ${benchmark.pricePerMeterFormatted}`}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              <span>{benchmark.badgeType === 'deal' ? '🔥' : benchmark.badgeType === 'premium' ? '💎' : '⚖️'}</span>
              <span>{benchmark.badgeLabel}</span>
            </span>
            <span style={{ fontSize: '0.72rem', opacity: 0.92, direction: 'ltr', fontWeight: '800' }}>{benchmark.pricePerMeterFormatted}</span>
          </div>
        )}

        {/* Payment Plan / Downpayment Summary */}
        <div className="property-card-finance" style={{
          background: 'var(--bg-card-hover, rgba(11, 78, 162, 0.04))',
          border: '1px solid var(--border-color)',
          borderRadius: '10px'
        }}>
          <div className="finance-mini-item">
            <span className="finance-label" style={{ color: 'var(--text-muted)', fontWeight: '600' }}>{lang === 'ar' ? 'مقدم يبدأ من:' : 'Min Downpayment:'}</span>
            <span className="finance-value" style={{ color: 'var(--text-primary)', fontWeight: '800' }}>{property.downPayment.toLocaleString()} {lang === 'ar' ? 'ج.م' : 'EGP'}</span>
          </div>
          <div className="finance-mini-item">
            <span className="finance-label" style={{ color: 'var(--text-muted)', fontWeight: '600' }}>{lang === 'ar' ? 'قسط شهري:' : 'Monthly:'}</span>
            <span className="finance-value highlight" style={{ color: 'var(--brand-gold-warm, #f59e0b)', fontWeight: '900', fontSize: '0.85rem' }}>{property.monthlyInstallment.toLocaleString()} {lang === 'ar' ? 'ج.م' : 'EGP'}</span>
          </div>
        </div>

        {/* Card Footer Actions */}
        <div className="property-card-footer" style={{ gap: '6px' }}>
          <button
            type="button"
            className="btn-quick-view"
            onClick={() => onQuickView(property)}
            title={lang === 'ar' ? 'معاينة سريعة' : 'Quick View'}
            style={{
              background: '#ffffff',
              border: '1.5px solid rgba(11, 78, 162, 0.22)',
              color: '#0b4ea2',
              fontWeight: '800'
            }}
          >
            <Eye size={13} style={{ color: '#0b4ea2' }} />
            <span>{lang === 'ar' ? 'معاينة' : 'Quick'}</span>
          </button>

          {/* WhatsApp Direct Inquire */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const msg = lang === 'ar'
                ? `مرحباً 1Line، أستفسر عن عقار: "${title}" بسعر ${property.price.toLocaleString()} ج.م (كود: #${property.id}). هل هو متاح للمعاينة؟`
                : `Hello 1Line, inquiring about property "${title}" priced at ${property.price.toLocaleString()} EGP (ID: #${property.id}).`;
              window.open(getWhatsAppUrl(msg), '_blank');
            }}
            style={{
              background: '#ecfdf5',
              border: '1px solid #10b981',
              color: '#065f46',
              borderRadius: 'var(--radius-sm)',
              padding: '6px 9px',
              fontSize: '0.78rem',
              fontWeight: '800',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: '0 2px 6px rgba(16, 185, 129, 0.15)'
            }}
            title={lang === 'ar' ? 'استفسار فوري عبر واتساب' : 'WhatsApp Inquiry'}
          >
            <MessageSquare size={13} style={{ color: '#059669' }} />
            <span>{lang === 'ar' ? 'واتساب' : 'WhatsApp'}</span>
          </button>

          <Link 
            to={`/properties/${property.id}`} 
            className="btn-view-details"
            style={{
              background: 'linear-gradient(135deg, #0b4ea2 0%, #073875 100%)',
              color: '#ffffff',
              fontWeight: '800',
              border: '1px solid rgba(253, 203, 66, 0.25)',
              boxShadow: '0 3px 10px rgba(11, 78, 162, 0.3)'
            }}
          >
            <span>{lang === 'ar' ? 'التفاصيل' : 'Details'}</span>
            {lang === 'ar' ? <ArrowLeft size={14} /> : <ArrowRight size={14} />}
          </Link>
        </div>
      </div>
    </div>
  );
}
