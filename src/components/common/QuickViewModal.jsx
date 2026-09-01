import { X, MapPin, Maximize2, BedDouble, Bath, MessageSquare, ArrowLeft, ArrowRight, Download, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { generatePropertyPdf } from '../../utils/pdfBrochure';
import BrandWatermark from './BrandWatermark';

export default function QuickViewModal({ property, lang = 'ar', onClose }) {
  if (!property) return null;

  const isAr = lang === 'ar';
  const title = isAr ? property.title_ar : property.title_en;
  const location = isAr ? property.locationName_ar : property.locationName_en;
  const description = isAr ? property.description_ar : property.description_en;

  return (
    <div className="quickview-modal-backdrop" onClick={onClose}>
      <div className="quickview-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Close Button */}
        <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>

        <div className="quickview-grid">
          {/* Left / Top Media Section */}
          <div className="quickview-media">
            <img src={property.images[0]} alt={title} className="quickview-img" />
            <BrandWatermark size="md" position="bottom-right" />
            <div className="quickview-price-badge-floating">
              <span className="price-tag-big">{property.price.toLocaleString()} {isAr ? 'ج.م' : 'EGP'}</span>
            </div>
          </div>

          {/* Right Info Section */}
          <div className="quickview-info">
            <div className="quickview-loc">
              <MapPin size={15} className="text-primary" />
              <span>{location}</span>
            </div>

            <h2 className="quickview-title">{title}</h2>

            {/* Spec Pills */}
            <div className="quickview-specs-row">
              <div className="spec-pill">
                <Maximize2 size={14} className="text-primary" />
                <span>{property.size} {isAr ? 'م²' : 'sqm'}</span>
              </div>
              {property.bedrooms > 0 && (
                <div className="spec-pill">
                  <BedDouble size={14} className="text-primary" />
                  <span>{property.bedrooms} {isAr ? 'غرف نوم' : 'Beds'}</span>
                </div>
              )}
              {property.bathrooms > 0 && (
                <div className="spec-pill">
                  <Bath size={14} className="text-primary" />
                  <span>{property.bathrooms} {isAr ? 'حمامات' : 'Baths'}</span>
                </div>
              )}
            </div>

            <p className="quickview-desc">{description}</p>

            {/* Structured 2-Column Finance & Installment Box */}
            <div className="quickview-finance-grid">
              <div className="finance-cell">
                <span className="finance-lbl">{isAr ? 'المقدم المطلوب' : 'Required Downpayment'}</span>
                <strong className="finance-val">{property.downPayment.toLocaleString()} {isAr ? 'ج.م' : 'EGP'}</strong>
              </div>
              <div className="finance-cell highlight-cell">
                <span className="finance-lbl">{isAr ? 'القسط الشهري' : 'Monthly Installment'}</span>
                <strong className="finance-val text-primary">{property.monthlyInstallment.toLocaleString()} {isAr ? 'ج.م' : 'EGP'}</strong>
              </div>
            </div>

            {/* Clean, Non-Crammed Actions Hierarchy */}
            <div className="quickview-actions-wrapper">
              {/* Primary Full Width Action */}
              <Link 
                to={`/properties/${property.id}`} 
                className="btn btn-primary btn-full quickview-primary-btn"
                onClick={onClose}
              >
                <span>{isAr ? 'عرض كامل تفاصيل العقار والمخطط' : 'View Full Property Details'}</span>
                {isAr ? <ArrowLeft size={16} /> : <ArrowRight size={16} />}
              </Link>

              {/* Secondary 2-Column Actions */}
              <div className="quickview-secondary-actions-row">
                <a
                  href={`https://wa.me/201012345678?text=${encodeURIComponent(`مرحباً ون لاين، أريد الاستفسار عن كود العقار: ${property.id.toUpperCase()} (${title}) بسوهاج.`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-whatsapp quickview-half-btn"
                >
                  <MessageSquare size={16} />
                  <span>{isAr ? 'استفسار واتساب' : 'WhatsApp'}</span>
                </a>

                <button
                  type="button"
                  className="btn btn-pdf-action quickview-half-btn"
                  onClick={() => generatePropertyPdf(property, lang)}
                  title={isAr ? 'تحميل بروشور العقار' : 'Download Property PDF'}
                >
                  <Download size={15} />
                  <span>{isAr ? 'بروشور PDF' : 'PDF Brochure'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
