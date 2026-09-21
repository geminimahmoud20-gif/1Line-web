import { useState } from 'react';
import { 
  X, MapPin, Maximize2, BedDouble, Bath, MessageSquare, ArrowLeft, ArrowRight, 
  Download, Loader2, Share2, ChevronLeft, ChevronRight, Layers, Sparkles,
  Store, Briefcase, Building, ShieldCheck
} from 'lucide-react';
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
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [viewMode, setViewMode] = useState('photos'); // 'photos' | 'floorplan'
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [imgError, setImgError] = useState(false);

  if (!property) return null;

  const isAr = lang === 'ar';
  const title = isAr ? property.title_ar : property.title_en;
  const location = isAr ? property.locationName_ar : property.locationName_en;
  const description = isAr ? property.description_ar : property.description_en;
  const finishing = isAr ? property.finishing_ar : property.finishing_en;

  // Sector classification
  const isLand = property.type === 'land' || (title && title.includes('أرض'));
  const isCommercial = !isLand && (property.type === 'commercial' || property.category === 'commercial' || (title && (title.includes('محل') || title.includes('معرض') || title.includes('ريتيل') || title.includes('تجاري'))));
  const isOffice = !isLand && !isCommercial && (property.type === 'office' || property.category === 'administrative' || (title && (title.includes('مكتب') || title.includes('عيادة') || title.includes('إداري'))));
  const priceData = formatCurrencyPrice(property.price, currency, lang);
  const benchmark = getPriceBenchmark(property, lang);
  const downPaymentVal = Number(property.downPayment) || 0;
  const monthlyInstallmentVal = Number(property.monthlyInstallment) || 0;
  const downPaymentData = formatCurrencyPrice(downPaymentVal, currency, lang);
  const monthlyInstallmentData = formatCurrencyPrice(monthlyInstallmentVal, currency, lang);

  const imagesList = Array.isArray(property.images) && property.images.length > 0 
    ? property.images 
    : [property.image || 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80'];

  const currentImage = imgError
    ? 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80'
    : (imagesList[activeImageIdx] || imagesList[0]);

  const handleNextImage = (e) => {
    e.stopPropagation();
    setActiveImageIdx((prev) => (prev + 1) % imagesList.length);
  };

  const handlePrevImage = (e) => {
    e.stopPropagation();
    setActiveImageIdx((prev) => (prev - 1 + imagesList.length) % imagesList.length);
  };

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

  const handleShare = () => {
    const propUrl = `${window.location.origin}/properties/${property.id}`;
    const shareText = isAr 
      ? `تفقد هذا العقار المعتمد على منصة 1Line: ${title} بسعر ${priceData.primary} ${priceData.symbol}\n${propUrl}`
      : `Check out this verified property on 1Line: ${title} for ${priceData.primary} ${priceData.symbol}\n${propUrl}`;

    if (onOpenShare) {
      onOpenShare({
        url: propUrl,
        title,
        text: shareText,
        subtitle: `${location} • ${priceData.primary} ${priceData.symbol}`,
        image: currentImage
      });
    } else if (typeof navigator !== 'undefined' && navigator.share) {
      navigator.share({
        title,
        text: shareText,
        url: propUrl
      }).catch((err) => {
        if (err?.name !== 'AbortError') {
          navigator.clipboard?.writeText(propUrl);
          if (triggerToast) triggerToast(isAr ? 'تم نسخ الرابط بنجاح' : 'Link copied', 'success');
        }
      });
    } else {
      navigator.clipboard?.writeText(propUrl);
      if (triggerToast) triggerToast(isAr ? 'تم نسخ الرابط بنجاح' : 'Link copied', 'success');
    }
  };

  return (
    <div className="quickview-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
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
          <button type="button" className="modal-close-btn" onClick={onClose} aria-label={isAr ? 'إغلاق' : 'Close'}>
            <X size={18} />
          </button>
        </div>

        <div className="quickview-grid">
          {/* Left / Top Media Section */}
          <div className="quickview-media">
            {viewMode === 'photos' ? (
              <>
                <img 
                  src={currentImage} 
                  alt={title} 
                  className="quickview-img" 
                  onError={() => setImgError(true)}
                />
                <BrandWatermark size="md" position="bottom-right" />

                {/* Multi-Image Navigation Controls */}
                {imagesList.length > 1 && (
                  <>
                    <button 
                      type="button" 
                      className="quickview-nav-btn prev-btn" 
                      onClick={isAr ? handleNextImage : handlePrevImage}
                      aria-label="Previous image"
                    >
                      <ChevronRight size={18} />
                    </button>
                    <button 
                      type="button" 
                      className="quickview-nav-btn next-btn" 
                      onClick={isAr ? handlePrevImage : handleNextImage}
                      aria-label="Next image"
                    >
                      <ChevronLeft size={18} />
                    </button>
                    <div className="quickview-img-counter">
                      {activeImageIdx + 1} / {imagesList.length}
                    </div>

                    {/* Mini Thumbnail Dots */}
                    <div className="quickview-thumb-dots">
                      {imagesList.map((_, idx) => (
                        <button
                          key={idx}
                          type="button"
                          className={`thumb-dot ${idx === activeImageIdx ? 'active' : ''}`}
                          onClick={() => setActiveImageIdx(idx)}
                          aria-label={`Photo ${idx + 1}`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </>
            ) : (
              /* Floor Plan CAD Blueprint View */
              <div className="quickview-floorplan-preview">
                <svg viewBox="0 0 800 500" className="quickview-cad-svg" xmlns="http://www.w3.org/2000/svg">
                  <rect width="800" height="500" fill="#081426" />
                  <defs>
                    <pattern id="cadgrid-mini" width="30" height="30" patternUnits="userSpaceOnUse">
                      <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#142e54" strokeWidth="0.8" />
                    </pattern>
                  </defs>
                  <rect width="800" height="500" fill="url(#cadgrid-mini)" />
                  <rect x="50" y="40" width="700" height="420" fill="none" stroke="#38bdf8" strokeWidth="3" rx="4" />
                  <line x1="360" y1="40" x2="360" y2="460" stroke="#38bdf8" strokeWidth="2" />
                  <line x1="50" y1="260" x2="360" y2="260" stroke="#38bdf8" strokeWidth="2" />
                  <text x="200" y="150" fill="#fdcb42" fontFamily="sans-serif" fontSize="18" fontWeight="bold" textAnchor="middle">
                    {isAr ? 'الريسبشن المفتوح' : 'Reception'}
                  </text>
                  <text x="200" y="370" fill="#fdcb42" fontFamily="sans-serif" fontSize="16" fontWeight="bold" textAnchor="middle">
                    {isAr ? 'المطبخ والخدمات' : 'Kitchen'}
                  </text>
                  <text x="580" y="240" fill="#fdcb42" fontFamily="sans-serif" fontSize="18" fontWeight="bold" textAnchor="middle">
                    {isAr ? 'أجنحة النوم والحمام' : 'Bedrooms & Bath'}
                  </text>
                  <rect x="60" y="50" width="220" height="30" rx="6" fill="#0b4ea2" opacity="0.9" />
                  <text x="170" y="70" fill="#ffffff" fontFamily="sans-serif" fontSize="11" fontWeight="bold" textAnchor="middle">
                    1LINE CAD SCHEMATIC
                  </text>
                </svg>
              </div>
            )}

            {/* Mode Toggle Button (Photos vs CAD Floorplan) */}
            <div className="quickview-mode-toggle">
              <button 
                type="button" 
                className={`mode-toggle-btn ${viewMode === 'photos' ? 'active' : ''}`}
                onClick={() => setViewMode('photos')}
              >
                {isAr ? 'الصور' : 'Photos'}
              </button>
              <button 
                type="button" 
                className={`mode-toggle-btn ${viewMode === 'floorplan' ? 'active' : ''}`}
                onClick={() => setViewMode('floorplan')}
              >
                <Layers size={12} />
                <span>{isAr ? 'المخطط' : 'Floor Plan'}</span>
              </button>
            </div>

            {/* Floating Price Tag */}
            <div className="quickview-price-badge-floating">
              <span className="price-tag-big">{priceData.primary} {priceData.symbol}</span>
              <span style={{ fontSize: '0.68rem', display: 'block', fontWeight: 800, color: '#34d399', background: 'rgba(0,0,0,0.5)', padding: '2px 6px', borderRadius: '4px', marginTop: '2px' }}>
                ✓ {isAr ? '0% عمولة للمشتري' : '0% Commission'}
              </span>
            </div>
          </div>

          {/* Right Info Section */}
          <div className="quickview-info">
            <div className="quickview-loc">
              <MapPin size={15} className="text-primary" />
              <span>{location}</span>
            </div>

            <h2 className="quickview-title">{title}</h2>

            {/* Spec Pills with Finishing Badge */}
            <div className="quickview-specs-row">
              <div className="spec-pill">
                <Maximize2 size={14} className="text-primary" />
                <span>{property.size} {isAr ? 'م²' : 'sqm'}</span>
              </div>
              {isLand ? (
                <>
                  <div className="spec-pill">
                    <Building size={14} className="text-gold" />
                    <span>{property.landType_ar || (isAr ? 'أرض استثمارية' : 'Land Plot')}</span>
                  </div>
                  {property.frontage && (
                    <div className="spec-pill">
                      <span>{property.frontage}</span>
                    </div>
                  )}
                </>
              ) : isCommercial ? (
                <>
                  <div className="spec-pill">
                    <Store size={14} className="text-gold" />
                    <span>{property.commercialType_ar || (isAr ? 'محل تجاري' : 'Retail Shop')}</span>
                  </div>
                  {property.frontage && (
                    <div className="spec-pill">
                      <span>{property.frontage}</span>
                    </div>
                  )}
                </>
              ) : isOffice ? (
                <>
                  <div className="spec-pill">
                    <Briefcase size={14} className="text-gold" />
                    <span>{property.adminType_ar || (isAr ? 'مقر إداري' : 'Office')}</span>
                  </div>
                  {property.frontage && (
                    <div className="spec-pill">
                      <span>{property.frontage}</span>
                    </div>
                  )}
                </>
              ) : (
                <>
                  {property.bedrooms > 0 && (
                    <div className="spec-pill">
                      <BedDouble size={14} className="text-primary" />
                      <span>{property.bedrooms} {isAr ? 'غرف' : 'Beds'}</span>
                    </div>
                  )}
                  {property.bathrooms > 0 && (
                    <div className="spec-pill">
                      <Bath size={14} className="text-primary" />
                      <span>{property.bathrooms} {isAr ? 'حمامات' : 'Baths'}</span>
                    </div>
                  )}
                </>
              )}
              {finishing && (
                <div className="spec-pill highlight-pill" title={finishing}>
                  <Sparkles size={13} className="text-gold" />
                  <span>{finishing.split(' ')[0]}</span>
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
