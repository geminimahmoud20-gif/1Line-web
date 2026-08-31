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
  Scale
} from 'lucide-react';

export default function PropertyCard({ 
  property, 
  lang, 
  isFavorite, 
  onToggleFavorite, 
  isCompared = false, 
  onToggleCompare, 
  onQuickView 
}) {
  const [imageLoaded, setImageLoaded] = useState(false);

  const title = lang === 'ar' ? property.title_ar : property.title_en;
  const location = lang === 'ar' ? property.locationName_ar : property.locationName_en;
  const badge = lang === 'ar' ? property.badge_ar : property.badge_en;

  return (
    <div className="property-card-modern">
      {/* Image Wrap */}
      <div className="property-card-media">
        <img
          src={property.images[0]}
          alt={title}
          className={`property-card-img ${imageLoaded ? 'loaded' : 'loading'}`}
          onLoad={() => setImageLoaded(true)}
          loading="lazy"
        />

        {/* Badges */}
        <div className="card-top-badges">
          {badge && <span className="property-badge gold-badge">{badge}</span>}
          {property.virtualTour && (
            <span className="property-badge tour-badge">
              <Sparkles size={12} />
              {lang === 'ar' ? 'جولة 3D' : '3D Tour'}
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

        {/* Bottom Price Tag on Image */}
        <div className="card-price-overlay">
          <span className="price-val">{property.price.toLocaleString()}</span>
          <span className="price-curr">{lang === 'ar' ? 'ج.م' : 'EGP'}</span>
        </div>
      </div>

      {/* Card Content */}
      <div className="property-card-body">
        <div className="property-location-tag">
          <MapPin size={14} />
          <span>{location}</span>
        </div>

        <h3 className="property-card-title">
          <Link to={`/properties/${property.id}`}>{title}</Link>
        </h3>

        {/* Specs Grid */}
        <div className="property-specs-grid">
          <div className="spec-item" title={lang === 'ar' ? 'المساحة' : 'Area'}>
            <Maximize2 size={15} />
            <span>{property.size} {lang === 'ar' ? 'م²' : 'sqm'}</span>
          </div>
          {property.bedrooms > 0 && (
            <div className="spec-item" title={lang === 'ar' ? 'غرف النوم' : 'Bedrooms'}>
              <BedDouble size={15} />
              <span>{property.bedrooms} {lang === 'ar' ? 'غرف' : 'Beds'}</span>
            </div>
          )}
          {property.bathrooms > 0 && (
            <div className="spec-item" title={lang === 'ar' ? 'الحمامات' : 'Bathrooms'}>
              <Bath size={15} />
              <span>{property.bathrooms} {lang === 'ar' ? 'حمام' : 'Baths'}</span>
            </div>
          )}
        </div>

        {/* Payment Plan / Downpayment Summary */}
        <div className="property-card-finance">
          <div className="finance-mini-item">
            <span className="finance-label">{lang === 'ar' ? 'مقدم يبدأ من:' : 'Min Downpayment:'}</span>
            <span className="finance-value">{property.downPayment.toLocaleString()} {lang === 'ar' ? 'ج.م' : 'EGP'}</span>
          </div>
          <div className="finance-mini-item">
            <span className="finance-label">{lang === 'ar' ? 'قسط شهري:' : 'Monthly:'}</span>
            <span className="finance-value highlight">{property.monthlyInstallment.toLocaleString()} {lang === 'ar' ? 'ج.م' : 'EGP'}</span>
          </div>
        </div>

        {/* Card Footer Actions */}
        <div className="property-card-footer">
          <button
            type="button"
            className="btn-quick-view"
            onClick={() => onQuickView(property)}
          >
            <Eye size={14} />
            <span>{lang === 'ar' ? 'نظرة سريعة' : 'Quick View'}</span>
          </button>

          <Link to={`/properties/${property.id}`} className="btn-view-details">
            <span>{lang === 'ar' ? 'التفاصيل' : 'Details'}</span>
            {lang === 'ar' ? <ArrowLeft size={14} /> : <ArrowRight size={14} />}
          </Link>
        </div>
      </div>
    </div>
  );
}
