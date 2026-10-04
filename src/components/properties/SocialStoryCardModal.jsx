import { useState, useRef } from 'react';
import { X, Download, Sparkles, ShieldCheck, MapPin } from 'lucide-react';
import useClientDownload from '../../hooks/useClientDownload';

export default function SocialStoryCardModal({ isOpen, onClose, property, lang = 'ar', triggerToast }) {
  const [downloading, setDownloading] = useState(false);
  const cardRef = useRef(null);
  const download = useClientDownload();

  if (!isOpen || !property) return null;
  const isAr = lang === 'ar';

  const title = isAr ? property.title_ar : property.title_en;
  const location = isAr ? property.locationName_ar : property.locationName_en;
  const priceFormatted = `${(Number(property.price) || 0).toLocaleString('en-US')} ${isAr ? 'ج.م' : 'EGP'}`;

  // The 9:16 card as a PNG (registered clients only; the team sees the download)
  const handleDownloadStory = () => download(
    { kind: 'story_card', itemId: String(property.id || ''), itemTitle: property.title_ar || property.title_en || '' },
    async () => {
      if (!cardRef.current) return;
      setDownloading(true);
      try {
        const { default: html2canvas } = await import('html2canvas');
        const canvas = await html2canvas(cardRef.current, { scale: 2, useCORS: true, backgroundColor: null, logging: false });
        const a = document.createElement('a');
        a.href = canvas.toDataURL('image/png');
        a.download = `1Line_story_${String(property.unitCode || property.id || 'unit').replace(/[^\w-]+/g, '_')}.png`;
        document.body.append(a);
        a.click();
        a.remove();
        triggerToast?.(isAr ? 'تم تنزيل بطاقة الستوري' : 'Story card downloaded', 'success');
      } catch (err) {
        triggerToast?.(isAr ? 'تعذّر تجهيز الصورة، جرّب تاني' : 'Could not build the image', 'error');
        throw err;
      } finally {
        setDownloading(false);
      }
    }
  );

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
                <span>كاش</span>
              </div>

              <div className="story-legal-footer">
                <ShieldCheck size={14} className="text-success" />
                <span>
                  {property.legalStatus
                    ? (isAr ? 'مستندات مراجَعة من 1Line' : 'Documents reviewed by 1Line')
                    : (isAr ? 'معاينة مجانية للموقع' : 'Free on-site viewing')}
                </span>
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
