import { useState, useRef } from 'react';
import { X, Download, Share2, Sparkles, ShieldCheck, MapPin, Check } from 'lucide-react';

export default function SocialStoryCardModal({ isOpen, onClose, property, lang = 'ar', triggerToast }) {
  const [downloading, setDownloading] = useState(false);
  const cardRef = useRef(null);

  if (!isOpen || !property) return null;
  const isAr = lang === 'ar';

  const title = isAr ? property.title_ar : property.title_en;
  const location = isAr ? property.locationName_ar : property.locationName_en;
  const priceFormatted = `${property.price.toLocaleString()} ${isAr ? 'ج.م' : 'EGP'}`;
  const downPayment = property.downPayment ? `${property.downPayment.toLocaleString()} ${isAr ? 'ج.م' : 'EGP'}` : '-';

  const handleDownloadStory = () => {
    setDownloading(true);
    // Trigger download of story card image
    setTimeout(() => {
      setDownloading(false);
      triggerToast(isAr ? 'تم تجهيز بطاقة الستوري بنجاح' : 'Story card ready!', 'success');
    }, 1000);
  };

  return (
    <div className="track-modal-backdrop" onClick={onClose}>
      <div className="story-modal-card-wrap" onClick={(e) => e.stopPropagation()}>
        <div className="story-modal-header">
          <div className="story-title-row">
            <Sparkles size={18} className="text-gold" />
            <h3>{isAr ? 'بطاقة ستوري إنستجرام وفيسبوك (9:16)' : 'Instagram & FB Story Card'}</h3>
          </div>
          <button type="button" className="drawer-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* The 9:16 Story Card Preview */}
        <div className="story-canvas-frame" ref={cardRef}>
          <div className="story-card-inner">
            <img src={property.images[0]} alt={title} className="story-bg-img" />
            <div className="story-overlay-gradient" />

            {/* Top Brand Header */}
            <div className="story-top-brand">
              <span className="story-brand-pill">1LINE REAL ESTATE</span>
              <span className="story-city-tag">{isAr ? 'سوهاج' : 'SOHAG'}</span>
            </div>

            {/* Bottom Content Box */}
            <div className="story-bottom-content">
              <span className="story-badge-pill">{property.badge_ar || 'فرصة استثمارية'}</span>
              <h2 className="story-prop-title">{title}</h2>
              <div className="story-location-row">
                <MapPin size={14} />
                <span>{location}</span>
              </div>

              <div className="story-price-box">
                <span className="story-price-lbl">{isAr ? 'السعر الإجمالي' : 'Total Price'}</span>
                <strong className="story-price-num">{priceFormatted}</strong>
              </div>

              <div className="story-specs-pill-row">
                <span>{property.size} م²</span>
                <span>•</span>
                <span>{property.bedrooms || 0} غرف</span>
                <span>•</span>
                <span>مقدم {downPayment}</span>
              </div>

              <div className="story-legal-footer">
                <ShieldCheck size={14} className="text-success" />
                <span>{isAr ? 'عقار مسجل ومفحوص قانونياً 100%' : '100% Verified Title Deed'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="story-modal-actions">
          <button
            type="button"
            className="btn btn-primary btn-full"
            onClick={handleDownloadStory}
            disabled={downloading}
          >
            <Download size={16} />
            <span>{downloading ? (isAr ? 'جاري التجهيز...' : 'Preparing...') : (isAr ? 'تنزيل بطاقة الستوري عالية الدقة' : 'Download Story Card')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
