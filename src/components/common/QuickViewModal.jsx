import { useState } from 'react';
import { isAgricultural, isIndustrial, isLandType } from '../../utils/propertyKinds';
import { X, MapPin, Maximize2, BedDouble, Bath, MessageSquare, ArrowLeft, ArrowRight, FileText, Share2, ChevronLeft, ChevronRight, Layers, Sparkles, Store, Briefcase, Building, Video, Layers3, Clock3, ShieldCheck, Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useUIModal } from '../../context/UIModalContext';
import '../../styles/expat-suite.css';
import { getWhatsAppUrl } from '../../utils/founderCmsData';
import { formatCurrencyPrice } from '../../utils/currencyAndBenchmark';
import BrandWatermark from './BrandWatermark';
import { isWatermarked } from '../../utils/watermark';
import useClientDownload from '../../hooks/useClientDownload';
import { countLabel } from '../../utils/arabicCount';
import { paymentTerms, termLabel } from '../../utils/paymentTerms';
import { areaLabel } from '../../utils/placeLabels';
import { getAreas } from '../../utils/areasData';
import { listingBadges } from '../../utils/listingBadges';
import { cardFeatures } from '../../utils/buildingFeatures';
import { isMultiUnitOrBuilding } from '../../utils/currencyAndBenchmark';
import './quickview.css';

export default function QuickViewModal({ 
  property, 
  lang = 'ar', 
  currency = 'EGP', 
  onClose,
  onOpenShare,
  triggerToast
}) {
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const download = useClientDownload();
  const [viewMode, setViewMode] = useState('photos'); // 'photos' | 'floorplan'
  const [imgError, setImgError] = useState(false);
  const { openRemoteInspection } = useUIModal();

  if (!property) return null;

  const isAr = lang === 'ar';
  const title = isAr ? property.title_ar : property.title_en;
  const location = isAr ? property.locationName_ar : property.locationName_en;
  const description = isAr ? property.description_ar : property.description_en;
  const finishing = isAr ? property.finishing_ar : property.finishing_en;

  // Sector classification
  const isSpecial = isAgricultural(property) || isIndustrial(property);
  const isLand = isLandType(property.type) || (!isIndustrial(property) && title && title.includes('أرض'));
  const isCommercial = !isLand && !isSpecial && (property.type === 'commercial' || property.category === 'commercial' || (title && (title.includes('محل') || title.includes('معرض') || title.includes('ريتيل') || title.includes('تجاري'))));
  const isOffice = !isLand && !isCommercial && !isSpecial && (property.type === 'office' || property.category === 'administrative' || (title && (title.includes('مكتب') || title.includes('عيادة') || title.includes('إداري'))));
  const priceData = formatCurrencyPrice(property.price, currency, lang);
  // Cash, or the plan set in CRM → طريقة السداد (the monthly is computed there, never typed)
  const terms = paymentTerms(property);
  const money = (n) => { const d = formatCurrencyPrice(n, currency, lang); return `${d.primary} ${d.symbol}`; };
  // Where it is: the written address, else the area's name; nothing when neither is known
  const place = String(location || '').trim() || (property.areaKey ? areaLabel(property.areaKey, isAr, getAreas()) : '');
  // Price per m², the first number buyers compare (not for whole buildings or farmland by feddan)
  const perM2 = !isMultiUnitOrBuilding(property) && !isAgricultural(property) && Number(property.size) > 0 && Number(property.price) > 0
    ? Math.round(Number(property.price) / Number(property.size))
    : 0;
  const hasRooms = !isLand && !isCommercial && !isOffice && !isSpecial;
  const floorText = !hasRooms || property.floor === undefined || property.floor === null || property.floor === ''
    ? ''
    : (Number(property.floor) === 0 ? (isAr ? 'أرضي' : 'Ground floor') : (isAr ? `الدور ${property.floor}` : `Floor ${property.floor}`));
  const handoverText = property.completionStatus === 'ready'
    ? (isAr ? 'استلام فوري' : 'Ready now')
    : property.deliveryYear
      ? (isAr ? `استلام ${property.deliveryYear}` : `Handover ${property.deliveryYear}`)
      : ['under_construction', 'off_plan'].includes(property.completionStatus) ? (isAr ? 'تحت الإنشاء' : 'Under construction') : '';
  const extras = cardFeatures(property, isAr);
  const review = listingBadges(property, isAr).review;
  const updated = property.updatedAt && !property.isDemo ? new Date(property.updatedAt) : null;
  const updatedText = updated && !Number.isNaN(updated.getTime())
    ? updated.toLocaleDateString(isAr ? 'ar-EG-u-nu-latn' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : '';
  const brief = String(description || '').trim();
  // Only a floor plan the team uploaded is shown; there is no generic drawing
  const floorPlan = property.floorPlan || property.floorPlanImage || '';

  const imagesList = Array.isArray(property.images) && property.images.length > 0 
    ? property.images 
    : [property.image || '/no-photo.svg'];

  const currentImage = imgError
    ? '/no-photo.svg'
    : (imagesList[activeImageIdx] || imagesList[0]);

  const handleNextImage = (e) => {
    e.stopPropagation();
    setActiveImageIdx((prev) => (prev + 1) % imagesList.length);
  };

  const handlePrevImage = (e) => {
    e.stopPropagation();
    setActiveImageIdx((prev) => (prev - 1 + imagesList.length) % imagesList.length);
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
            aria-label="مشاركة العقار"
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
                {/* Centred: the corners hold the controls and the price */}
                {!isWatermarked(currentImage) && <BrandWatermark size="sm" position="center" />}

                {/* Multi-Image Navigation Controls */}
                {imagesList.length > 1 && (
                  <>
                    <button 
                      type="button" 
                      className="quickview-nav-btn prev-btn" 
                      onClick={isAr ? handleNextImage : handlePrevImage}
                      aria-label="الصورة السابقة"
                    >
                      <ChevronRight size={18} />
                    </button>
                    <button 
                      type="button" 
                      className="quickview-nav-btn next-btn" 
                      onClick={isAr ? handlePrevImage : handleNextImage}
                      aria-label="الصورة التالية"
                    >
                      <ChevronLeft size={18} />
                    </button>
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
              <div className="quickview-floorplan-preview">
                <img src={floorPlan} alt={isAr ? `مخطط ${title}` : `${title} floor plan`} className="quickview-img is-plan" />
              </div>
            )}

            {/* Photos / floor plan: only when the listing has a floor plan */}
            {floorPlan && <div className="quickview-mode-toggle">
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
            </div>}

          </div>

          {/* Right Info Section */}
          <div className="quickview-info">
            <div className="qv-meta">
              {place && (
                <span className="quickview-loc">
                  <MapPin size={15} className="text-primary" aria-hidden="true" />
                  <span>{place}</span>
                </span>
              )}
              <bdi className="qv-code" dir="ltr">{String(property.id).toUpperCase()}</bdi>
            </div>

            <h2 className="quickview-title">{title}</h2>

            {/* Price, how it is paid and the price per m² */}
            <div className="qv-price">
              <strong className="qv-price-num"><bdi>{priceData.primary}</bdi> <small>{priceData.symbol}</small></strong>
              <span className={`qv-pay-chip ${terms.type === 'cash' ? 'is-cash' : 'is-plan'}`}>
                {terms.type === 'cash' ? (isAr ? 'كاش' : 'Cash') : (isAr ? 'تقسيط' : 'Installments')}
              </span>
              {perM2 > 0 && <span className="qv-per-m2"><bdi>{perM2.toLocaleString('en-US')}</bdi> {isAr ? 'ج.م/م²' : 'EGP/m²'}</span>}
            </div>

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
                      <span>{countLabel('room', property.bedrooms, isAr)}</span>
                    </div>
                  )}
                  {property.bathrooms > 0 && (
                    <div className="spec-pill">
                      <Bath size={14} className="text-primary" />
                      <span>{countLabel('bath', property.bathrooms, isAr)}</span>
                    </div>
                  )}
                </>
              )}
              {floorText && (
                <div className="spec-pill">
                  <Layers3 size={14} className="text-primary" aria-hidden="true" />
                  <span>{floorText}</span>
                </div>
              )}
              {finishing && (
                <div className="spec-pill highlight-pill">
                  <Sparkles size={13} className="text-gold" aria-hidden="true" />
                  <span>{finishing}</span>
                </div>
              )}
              {handoverText && (
                <div className="spec-pill">
                  <Clock3 size={14} className="text-primary" aria-hidden="true" />
                  <span>{handoverText}</span>
                </div>
              )}
            </div>

            {/* Elevator, garage, garden, land share: only what the unit has */}
            {extras.length > 0 && (
              <ul className="qv-extras" aria-label={isAr ? 'مميزات المبنى' : 'Building features'}>
                {extras.map((f) => <li key={f.key}><Check size={13} aria-hidden="true" />{f.label}</li>)}
              </ul>
            )}

            {brief && <p className="quickview-desc qv-brief">{brief}</p>}

            {/* An installment plan's figures; a cash listing says so in the chip by the price */}
            {terms.type === 'installment' && (
              <div className="quickview-finance-grid">
                <div className="finance-cell">
                  <span className="finance-lbl">{isAr ? 'المقدم' : 'Down payment'}</span>
                  <strong className="finance-val">{terms.down > 0 ? money(terms.down) : (isAr ? 'بدون مقدم' : 'None')}</strong>
                </div>
                {terms.monthly > 0 && (
                  <div className="finance-cell highlight-cell">
                    <span className="finance-lbl">
                      {isAr ? 'القسط الشهري' : 'Monthly'}{terms.months > 0 && ` · ${termLabel(terms.months, isAr)}`}
                    </span>
                    <strong className="finance-val text-primary">{money(terms.monthly)}</strong>
                  </div>
                )}
                {terms.months > 0 && terms.total > 0 && (
                  <div className="finance-cell">
                    <span className="finance-lbl">{isAr ? 'إجمالي التقسيط' : 'Installment total'}</span>
                    <strong className="finance-val">{money(terms.total)}</strong>
                  </div>
                )}
              </div>
            )}

            {(review || updatedText) && (
              <div className="qv-trust">
                {review && <span className={`qv-trust-badge is-${review.tone}`}><ShieldCheck size={13} aria-hidden="true" />{review.label}</span>}
                {updatedText && <span>{isAr ? `آخر تحديث: ${updatedText}` : `Updated ${updatedText}`}</span>}
              </div>
            )}

            {/* Clean, Non-Crammed Actions Hierarchy */}
            <div className="quickview-actions-wrapper">
              {/* Primary Full Width Action */}
              <Link 
                to={`/properties/${property.id}`} 
                className="btn btn-primary btn-full quickview-primary-btn"
                onClick={onClose}
              >
                <span>{isAr ? 'عرض كامل تفاصيل العقار' : 'View Full Property Details'}</span>
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
                  onClick={() => download({ kind: 'property_brochure', itemId: String(property.id || ''), itemTitle: property.title_ar || property.title_en || '' }, async () => {
                    const { generatePropertyPdf } = await import('../../utils/brochure/propertyBrochure');
                    await generatePropertyPdf(property);
                  })}
                  title={isAr ? 'تحميل بروشور الوحدة' : 'Download the brochure'}
                >
                  <FileText size={15} />
                  <span>{isAr ? 'بروشور PDF' : 'Brochure PDF'}</span>
                </button>
              </div>

              {/* معاينة الغربة — a quiet link under the main actions */}
              <button type="button" className="qv-remote-link" onClick={() => { onClose?.(); openRemoteInspection(property); }}>
                <Video size={15} aria-hidden="true" />
                <span>{isAr ? 'مسافر؟ اطلب معاينة بالفيديو الحي' : 'Abroad? Book a live video tour'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
