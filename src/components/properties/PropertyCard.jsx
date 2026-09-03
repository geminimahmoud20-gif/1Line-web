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
  ShieldCheck
} from 'lucide-react';
import { getPropertyViews } from '../../utils/visitorTracker';
import { getFounderSettings, getWhatsAppUrl } from '../../utils/founderCmsData';
import BrandWatermark from '../common/BrandWatermark';

export default function PropertyCard({ 
  property, 
  lang = 'ar', 
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
  const imagesList = property.images && property.images.length > 0 ? property.images : ['https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800'];

  return (
    <div className="property-card-modern cinematic-card">
      {/* 16:9 Cinematic Image Container */}
      <div className="property-card-media aspect-16-9">
        <img
          src={imagesList[activeImageIndex] || imagesList[0]}
          alt={title}
          className={`property-card-img ${imageLoaded ? 'loaded' : 'loading'}`}
          onLoad={() => setImageLoaded(true)}
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
              background: 'rgba(8, 18, 38, 0.85)',
              border: '1px solid rgba(255, 202, 40, 0.4)',
              color: '#ffca28',
              backdropFilter: 'blur(6px)'
            }}
          >
            {property.featured ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                <Sparkles size={11} style={{ color: '#ffca28' }} />
                <span>{lang === 'ar' ? 'فرصة حصرية' : 'Prime Exclusive'}</span>
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

        {/* Bottom Price Tag on Image */}
        <div className="card-price-overlay">
          <span className="price-val">{property.price.toLocaleString()}</span>
          <span className="price-curr">{lang === 'ar' ? 'ج.م' : 'EGP'}</span>
        </div>
      </div>

      {/* Card Content */}
      <div className="property-card-body">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
          <div className="property-location-tag" style={{ margin: 0, color: '#1e293b', fontWeight: '700' }}>
            <MapPin size={14} style={{ color: '#0d48a1' }} />
            <span>{location}</span>
          </div>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '0.7rem',
            color: '#065f46',
            background: '#ecfdf5',
            border: '1px solid #10b981',
            padding: '3px 8px',
            borderRadius: '6px',
            fontWeight: '800'
          }}>
            <ShieldCheck size={12} style={{ color: '#059669' }} />
            <span>{lang === 'ar' ? '🛡️ سند ملكية وتراخيص مفحوصة 100%' : '100% Verified Legal Deed'}</span>
          </span>
        </div>

        <h3 className="property-card-title">
          <Link to={`/properties/${property.id}`} style={{ color: '#0a192f', fontWeight: '800' }}>{title}</Link>
        </h3>

        {/* Specs Grid */}
        <div className="property-specs-grid">
          <div className="spec-item" title={lang === 'ar' ? 'المساحة' : 'Area'}>
            <Maximize2 size={15} style={{ color: '#0d48a1' }} />
            <span style={{ color: '#0f172a', fontWeight: '700' }}>{property.size} {lang === 'ar' ? 'م²' : 'sqm'}</span>
          </div>
          {property.bedrooms > 0 && (
            <div className="spec-item" title={lang === 'ar' ? 'غرف النوم' : 'Bedrooms'}>
              <BedDouble size={16} style={{ color: '#d97706' }} />
              <span style={{ color: '#0f172a', fontWeight: '700' }}>{property.bedrooms} {lang === 'ar' ? 'غرف' : 'Beds'}</span>
            </div>
          )}
          {property.bathrooms > 0 && (
            <div className="spec-item" title={lang === 'ar' ? 'الحمامات' : 'Bathrooms'}>
              <Bath size={15} style={{ color: '#0284c7' }} />
              <span style={{ color: '#0f172a', fontWeight: '700' }}>{property.bathrooms} {lang === 'ar' ? 'حمام' : 'Baths'}</span>
            </div>
          )}
        </div>

        {/* Payment Plan / Downpayment Summary */}
        <div className="property-card-finance" style={{
          background: 'linear-gradient(135deg, rgba(13, 72, 161, 0.04) 0%, rgba(241, 245, 249, 0.95) 100%)',
          border: '1px solid rgba(13, 72, 161, 0.12)',
          borderRadius: '10px'
        }}>
          <div className="finance-mini-item">
            <span className="finance-label" style={{ color: '#475569', fontWeight: '600' }}>{lang === 'ar' ? 'مقدم يبدأ من:' : 'Min Downpayment:'}</span>
            <span className="finance-value" style={{ color: '#0f172a', fontWeight: '800' }}>{property.downPayment.toLocaleString()} {lang === 'ar' ? 'ج.م' : 'EGP'}</span>
          </div>
          <div className="finance-mini-item">
            <span className="finance-label" style={{ color: '#475569', fontWeight: '600' }}>{lang === 'ar' ? 'قسط شهري:' : 'Monthly:'}</span>
            <span className="finance-value highlight" style={{ color: '#0d48a1', fontWeight: '900', fontSize: '0.85rem' }}>{property.monthlyInstallment.toLocaleString()} {lang === 'ar' ? 'ج.م' : 'EGP'}</span>
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
              border: '1px solid rgba(13, 72, 161, 0.25)',
              color: '#0d48a1',
              fontWeight: '800'
            }}
          >
            <Eye size={13} style={{ color: '#0d48a1' }} />
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
              background: 'linear-gradient(135deg, #0d48a1, #1565c0)',
              color: '#ffffff',
              fontWeight: '800',
              boxShadow: '0 2px 8px rgba(13, 72, 161, 0.25)'
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
