import { useState } from 'react';
import { X, MapPin, Maximize2, BedDouble, Bath, MessageSquare, ArrowLeft, ArrowRight, Download, ExternalLink, Loader2, Share2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getWhatsAppUrl } from '../../utils/founderCmsData';
import { formatCurrencyPrice, getPriceBenchmark } from '../../utils/currencyAndBenchmark';
import BrandWatermark from './BrandWatermark';

export default function QuickViewModal({ 
  property, 
  lang = 'ar', 
  currency = 'EGP', 
  onClose,
  onOpenShare,
  triggerToast
}) {
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  if (!property) return null;

  const isAr = lang === 'ar';
  const title = isAr ? property.title_ar : property.title_en;
  const location = isAr ? property.locationName_ar : property.locationName_en;
  const description = isAr ? property.description_ar : property.description_en;
  const priceData = formatCurrencyPrice(property.price, currency, lang);
  const benchmark = getPriceBenchmark(property, lang);
  const downPaymentVal = Number(property.downPayment) || 0;
  const monthlyInstallmentVal = Number(property.monthlyInstallment) || 0;
  const downPaymentData = formatCurrencyPrice(downPaymentVal, currency, lang);
  const monthlyInstallmentData = formatCurrencyPrice(monthlyInstallmentVal, currency, lang);

  const handleDownloadPdf = async () => {
    setIsGeneratingPdf(true);
    try {
      const { generatePropertyPdf } = await import('../../utils/pdfBrochure');
      generatePropertyPdf(property, lang);
    } catch (err) {
      console.error('Failed to generate PDF:', err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleShare = async () => {
    const propUrl = `${window.location.origin}/properties/${property.id}`;
    const shareText = isAr 
      ? `تفقد هذا العقار المعتمد على منصة 1Line: ${title} بسعر ${priceData.primary} ${priceData.symbol}\n${propUrl}`
      : `Check out this verified property on 1Line: ${title} for ${priceData.primary} ${priceData.symbol}\n${propUrl}`;

    if (onOpenShare) {
      onOpenShare({
        url: propUrl,
        title,
        text: shareText,
        subtitle: `${location} • ${priceData.primary} ${priceData.symbol}`
      });
    } else if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title,
          text: shareText,
          url: propUrl
        });
      } catch (err) {
        if (err?.name !== 'AbortError') {
          navigator.clipboard?.writeText(propUrl);
          if (triggerToast) triggerToast(isAr ? 'تم نسخ الرابط بنجاح' : 'Link copied', 'success');
        }
      }
    } else {
      navigator.clipboard?.writeText(propUrl);
      if (triggerToast) triggerToast(isAr ? 'تم نسخ الرابط بنجاح' : 'Link copied', 'success');
    }
  };

  return (
    <div className="quickview-modal-backdrop" onClick={onClose}>
      <div className="quickview-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Top Control Actions Bar */}
        <div className="quickview-top-bar">
          <button 
            type="button" 
            className="modal-action-round-btn" 
            onClick={handleShare}
            title={isAr ? 'مشاركة هذا العقار' : 'Share Property'}
            aria-label="Share Property"
          >
            <Share2 size={16} />
          </button>
          <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="quickview-grid">
          {/* Left / Top Media Section */}
          <div className="quickview-media">
            <img src={property.images[0]} alt={title} className="quickview-img" />
            <BrandWatermark size="md" position="bottom-right" />
            <div className="quickview-price-badge-floating">
              <span className="price-tag-big">{priceData.primary} {priceData.symbol}</span>
              {priceData.isConverted && (
                <span style={{ fontSize: '0.72rem', opacity: 0.9, display: 'block', fontWeight: 600 }}>
                  ≈ {priceData.originalEgp}
                </span>
              )}
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
                <strong className="finance-val">
                  {downPaymentVal > 0 ? `${downPaymentData.primary} ${downPaymentData.symbol}` : (isAr ? 'بدون مقدم' : 'No Downpayment')}
                </strong>
              </div>
              <div className="finance-cell highlight-cell">
                <span className="finance-lbl">{isAr ? 'القسط الشهري' : 'Monthly Installment'}</span>
                <strong className="finance-val text-primary">
                  {monthlyInstallmentVal > 0 ? `${monthlyInstallmentData.primary} ${monthlyInstallmentData.symbol}` : (isAr ? 'كاش فوري' : 'Full Cash')}
                </strong>
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
                  href={getWhatsAppUrl(`مرحباً 1Line، أريد الاستفسار عن كود العقار: ${property.id.toUpperCase()} (${title}) بسوهاج.`)}
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
                  onClick={handleDownloadPdf}
                  disabled={isGeneratingPdf}
                  title={isAr ? 'تحميل بروشور العقار' : 'Download Property PDF'}
                >
                  {isGeneratingPdf ? <Loader2 size={15} className="spin-animation" /> : <Download size={15} />}
                  <span>{isGeneratingPdf ? (isAr ? 'جاري التحميل...' : 'Loading...') : (isAr ? 'بروشور PDF' : 'PDF Brochure')}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
