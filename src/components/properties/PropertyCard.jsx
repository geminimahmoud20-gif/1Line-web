import { useRef, useState } from 'react';
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
  ShieldCheck,
  Building,
  Store,
  Briefcase,
  ChevronRight,
  ChevronLeft,
  Layers,
  Rotate3d,
  Images,
  TrendingDown,
  Wallet
} from 'lucide-react';
import { getWhatsAppUrl } from '../../utils/founderCmsData';
import { formatCurrencyPrice, getPriceBenchmark } from '../../utils/currencyAndBenchmark';
import '../../styles/property-card.css';

const FALLBACK_PROPERTY_IMG = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 500' fill='%23071e3d'%3E%3Crect width='800' height='500' fill='%23071e3d'/%3E%3Cpath d='M400 130 L620 320 L180 320 Z' fill='%230b4ea2' opacity='0.7'/%3E%3Crect x='340' y='220' width='120' height='100' rx='20' fill='%23fdcb42' opacity='0.85'/%3E%3Ctext x='50%25' y='75%25' dominant-baseline='middle' text-anchor='middle' fill='%23ffffff' font-family='sans-serif' font-size='24' font-weight='bold'%3E1LINE REAL ESTATE%3C/text%3E%3Ctext x='50%25' y='85%25' dominant-baseline='middle' text-anchor='middle' fill='%23fdcb42' font-family='sans-serif' font-size='16'%3E%D8%B9%D9%82%D8%A7%D8%B1%D8%A7%D8%AA%20%D8%B3%D9%88%D9%87%D8%A7%D8%AC%20%D8%A7%D9%84%D9%85%D8%B9%D8%AA%D9%85%D8%AF%D8%A9%3C/text%3E%3C/svg%3E";

// Latin digits everywhere, matching prices on the rest of the site
const fmt = (n) => (Number(n) || 0).toLocaleString('en-US');

// Clean formatting for card location to avoid awkward clipping
function formatCardLocation(loc) {
  if (!loc || typeof loc !== 'string') return '';
  if (loc.includes(' - ')) {
    const parts = loc.split(' - ');
    const city = parts[0].trim();
    let detailed = (parts[1] || '').trim();
    // Strip leading prepositions like "بالقرب من", "قرب", "أمام", "بجوار", "خلف", "قطاع"
    detailed = detailed.replace(/^(?:بالقرب من|قرب من|قرب|أمام|بجوار|خلف|قطاع)\s+/i, '');
    // Keep the primary landmark only
    const cleanDetail = detailed.split(/\s+(?:بالقرب|قرب|أمام|بجوار|خلف|ومحطة|وعلى)\s+/i)[0].trim();
    const finalDetail = cleanDetail.length > 22 ? cleanDetail.substring(0, 20).trim() + '…' : cleanDetail;
    return `${city} • ${finalDetail}`;
  }
  return loc.length > 34 ? loc.substring(0, 32).trim() + '…' : loc;
}

// Concise formatters for commercial, office and land specs
function formatOfficeSpec(adminType, lang) {
  if (!adminType) return lang === 'ar' ? 'مقر إداري' : 'Office';
  if (lang !== 'ar') return adminType.length > 18 ? 'Medical / Clinic' : adminType;
  if (adminType.includes('عيادة')) return 'عيادة طبية';
  if (adminType.includes('مكتب') || adminType.includes('مقر')) return 'مقر إداري';
  return adminType.length > 14 ? adminType.substring(0, 12).trim() + '…' : adminType;
}

function formatCommercialSpec(commType, lang) {
  if (!commType) return lang === 'ar' ? 'محل واجهة' : 'Retail shop';
  if (lang !== 'ar') return commType.length > 18 ? 'Retail store' : commType;
  if (commType.includes('محل')) return 'محل واجهة';
  if (commType.includes('معرض')) return 'معرض تجاري';
  return commType.length > 14 ? commType.substring(0, 12).trim() + '…' : commType;
}

function formatLandSpec(landType, lang) {
  if (!landType) return lang === 'ar' ? 'أرض استثمارية' : 'Investment plot';
  if (lang !== 'ar') return landType.length > 18 ? 'Building plot' : landType;
  if (landType.includes('بناء') || landType.includes('سكنية')) return 'أرض سكنية';
  if (landType.includes('تجارية')) return 'أرض تجارية';
  return landType.length > 14 ? landType.substring(0, 12).trim() + '…' : landType;
}

const floorLabel = (floor, isAr) =>
  Number(floor) === 0 ? (isAr ? 'أرضي' : 'Ground') : (isAr ? `الدور ${floor}` : `Floor ${floor}`);

const announceView = (property, title) => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('oneline_property_viewed', { detail: { id: property.id, title } }));
  }
};

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
  const [loadedSrc, setLoadedSrc] = useState(() => new Set());
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const touchStartX = useRef(null);
  const swiped = useRef(false);

  if (!property) return null;

  const isAr = lang === 'ar';
  const title = isAr ? (property.title_ar || property.title_en || '') : (property.title_en || property.title_ar || '');
  const location = isAr ? (property.locationName_ar || property.locationName_en || '') : (property.locationName_en || property.locationName_ar || '');
  const imagesList = (Array.isArray(property.images) && property.images.length > 0) ? property.images : [FALLBACK_PROPERTY_IMG];
  const photoCount = imagesList.length;
  const currentSrc = imagesList[activeImageIndex] || FALLBACK_PROPERTY_IMG;
  const priceData = formatCurrencyPrice(property.price, currency, lang);
  const benchmark = getPriceBenchmark(property, lang);
  const detailsUrl = `/properties/${property.id}`;

  // "Below area average" chip: only when the listing is clearly under the district benchmark
  const belowAvgPct = (() => {
    const m = benchmark?.badgeType === 'deal' && /(\d+)%/.exec(benchmark.badgeLabel || '');
    return m ? Number(m[1]) : 0;
  })();

  // One restrained status badge at most: private deal, or documents reviewed (only with a legal record)
  const statusBadge = (property.isOffMarket || property.isPrivateDeal)
    ? { label: isAr ? 'صفقة خاصة' : 'Private deal', Icon: Sparkles, tone: 'deal' }
    : property.legalStatus
      ? { label: isAr ? 'مستندات مراجَعة' : 'Documents reviewed', Icon: ShieldCheck, tone: 'verified' }
      : null;

  // Sector separation: land, commercial, office, residential
  const isLand = property.type === 'land' || (title && title.includes('أرض'));
  const isCommercial = !isLand && (property.type === 'commercial' || property.category === 'commercial' || (title && (title.includes('محل') || title.includes('معرض') || title.includes('ريتيل') || title.includes('تجاري'))));
  const isOffice = !isLand && !isCommercial && (property.type === 'office' || property.category === 'administrative' || (title && (title.includes('مكتب') || title.includes('عيادة') || title.includes('إداري'))));

  const sectorLabel = isCommercial
    ? (isAr ? 'تجاري' : 'Commercial')
    : isOffice
      ? (isAr ? 'إداري' : 'Office')
      : isLand
        ? (isAr ? 'أرض' : 'Land')
        : (isAr ? 'سكني' : 'Residential');

  // Up to three specs, laid out as an even grid
  const specs = [
    { key: 'size', Icon: Maximize2, value: fmt(property.size), unit: isAr ? 'م²' : 'm²', label: isAr ? 'المساحة' : 'Area' }
  ];
  if (isCommercial) {
    specs.push({ key: 'kind', Icon: Store, value: formatCommercialSpec(property.commercialType_ar, lang), label: isAr ? 'النوع' : 'Type' });
    specs.push({ key: 'floor', Icon: Layers, value: property.frontage || floorLabel(property.floor ?? 0, isAr), label: isAr ? 'الواجهة / الدور' : 'Frontage' });
  } else if (isOffice) {
    specs.push({ key: 'kind', Icon: Briefcase, value: formatOfficeSpec(property.adminType_ar, lang), label: isAr ? 'النوع' : 'Type' });
    if (property.floor !== undefined) specs.push({ key: 'floor', Icon: Layers, value: floorLabel(property.floor, isAr), label: isAr ? 'الدور' : 'Floor' });
  } else if (isLand) {
    specs.push({ key: 'kind', Icon: Building, value: formatLandSpec(property.landType_ar, lang), label: isAr ? 'النوع' : 'Type' });
    if (property.frontage) specs.push({ key: 'front', Icon: Layers, value: property.frontage, label: isAr ? 'الواجهة' : 'Frontage' });
  } else {
    if (property.bedrooms > 0) specs.push({ key: 'beds', Icon: BedDouble, value: property.bedrooms, label: isAr ? 'غرف' : 'Beds' });
    if (property.bathrooms > 0) specs.push({ key: 'baths', Icon: Bath, value: property.bathrooms, label: isAr ? 'حمام' : 'Baths' });
  }

  const hasInstallments = Number(property.monthlyInstallment) > 0;
  const installmentYears = Number(property.installmentYears) || 0;

  const stop = (e) => { e.preventDefault(); e.stopPropagation(); };
  const goTo = (idx) => setActiveImageIndex((idx + photoCount) % photoCount);
  // Visual direction: in RTL the "next" photo comes from the left
  const handlePrev = (e) => { stop(e); goTo(activeImageIndex - 1); };
  const handleNext = (e) => { stop(e); goTo(activeImageIndex + 1); };

  // Touch swipe between photos (phones)
  const onTouchStart = (e) => { touchStartX.current = e.touches[0].clientX; swiped.current = false; };
  const onTouchEnd = (e) => {
    if (touchStartX.current === null || photoCount < 2) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(dx) < 40) return;
    swiped.current = true;
    // Swiping toward the reading direction's start shows the next photo
    const forward = isAr ? dx > 0 : dx < 0;
    goTo(activeImageIndex + (forward ? 1 : -1));
  };
  // A swipe must not also open the listing
  const guardClick = (e) => {
    if (swiped.current) { e.preventDefault(); swiped.current = false; return true; }
    return false;
  };

  const img = (
    <img
      key={currentSrc}
      src={currentSrc}
      alt={title}
      className={`pcx-img ${loadedSrc.has(currentSrc) ? 'is-loaded' : ''}`}
      loading="lazy"
      decoding="async"
      onLoad={() => setLoadedSrc((s) => (s.has(currentSrc) ? s : new Set(s).add(currentSrc)))}
      onError={(e) => {
        e.currentTarget.src = FALLBACK_PROPERTY_IMG;
        setLoadedSrc((s) => new Set(s).add(currentSrc));
      }}
    />
  );

  const openWhatsApp = (e) => {
    stop(e);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('oneline_whatsapp_clicked', { detail: { id: property.id, title, intent: 'quick_inquiry' } }));
    }
    const msg = isAr
      ? `مرحباً 1Line، استفسار سريع بخصوص عقار: "${title}" بسعر ${fmt(property.price)} ج.م (كود: #${property.id}). هل هو متاح للمعاينة؟`
      : `Hello 1Line, quick inquiry about property "${title}" priced at ${fmt(property.price)} EGP (ID: #${property.id}).`;
    window.open(getWhatsAppUrl(msg), '_blank', 'noopener');
  };

  return (
    <article className="property-card-modern pcx" data-property-id={property.id}>
      {/* ── Media ───────────────────────────────────────────── */}
      <div className="pcx-media" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        {onQuickView ? (
          <button
            type="button"
            className="pcx-media-hit card-media-quickview"
            onClick={(e) => { if (!guardClick(e)) onQuickView(property); }}
            aria-label={isAr ? `معاينة سريعة: ${title}` : `Quick view: ${title}`}
          >
            {img}
          </button>
        ) : (
          <Link
            to={detailsUrl}
            className="pcx-media-hit"
            tabIndex={-1}
            aria-hidden="true"
            onClick={(e) => { if (!guardClick(e)) announceView(property, title); }}
          >
            {img}
          </Link>
        )}

        <span className="pcx-scrim" aria-hidden="true" />

        {/* Top row: status (start) · actions (end) */}
        <div className="pcx-top">
          <div className="pcx-chips">
            {statusBadge && (
              <span className={`pcx-chip pcx-chip--${statusBadge.tone}`}>
                <statusBadge.Icon size={12} strokeWidth={2} aria-hidden="true" />
                <span>{statusBadge.label}</span>
              </span>
            )}
          </div>

          <div className="pcx-actions">
            <button
              type="button"
              className={`pcx-icon-btn pcx-fav ${isFavorite ? 'is-on' : ''}`}
              onClick={(e) => { stop(e); onToggleFavorite?.(property.id); }}
              title={isAr ? 'حفظ في المفضلة' : 'Save to favorites'}
              aria-label={isAr ? 'حفظ في المفضلة' : 'Save to favorites'}
              aria-pressed={!!isFavorite}
            >
              <Heart size={16} strokeWidth={2} fill={isFavorite ? 'currentColor' : 'none'} />
            </button>
            {onToggleCompare && (
              <button
                type="button"
                className={`pcx-icon-btn pcx-compare ${isCompared ? 'is-on' : ''}`}
                onClick={(e) => { stop(e); onToggleCompare(property); }}
                title={isAr ? 'إضافة للمقارنة' : 'Add to compare'}
                aria-label={isAr ? 'إضافة للمقارنة' : 'Add to compare'}
                aria-pressed={!!isCompared}
              >
                <Scale size={15} strokeWidth={2} />
              </button>
            )}
            {onQuickView && (
              <button
                type="button"
                className="pcx-icon-btn pcx-peek"
                onClick={(e) => { stop(e); onQuickView(property); }}
                title={isAr ? 'معاينة سريعة' : 'Quick view'}
                aria-label={isAr ? 'معاينة سريعة' : 'Quick view'}
              >
                <Eye size={15} strokeWidth={2} />
              </button>
            )}
          </div>
        </div>

        {/* Photo arrows (pointer devices; phones swipe) */}
        {photoCount > 1 && (
          <>
            <button type="button" className="pcx-arrow pcx-arrow--prev" onClick={handlePrev} aria-label={isAr ? 'الصورة السابقة' : 'Previous photo'}>
              {isAr ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </button>
            <button type="button" className="pcx-arrow pcx-arrow--next" onClick={handleNext} aria-label={isAr ? 'الصورة التالية' : 'Next photo'}>
              {isAr ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
            </button>
          </>
        )}

        {/* Bottom row: sector & tour (start) · photo progress (end) */}
        <div className="pcx-bottom">
          <div className="pcx-chips">
            <span className="pcx-chip pcx-chip--glass">{sectorLabel}</span>
            {property.virtualTour && (
              <span className="pcx-chip pcx-chip--glass">
                <Rotate3d size={12} strokeWidth={2} aria-hidden="true" />
                <span>{isAr ? 'جولة 360°' : '360° tour'}</span>
              </span>
            )}
          </div>
          {photoCount > 1 && (
            <div className="pcx-progress" aria-label={isAr ? `صورة ${activeImageIndex + 1} من ${photoCount}` : `Photo ${activeImageIndex + 1} of ${photoCount}`}>
              <div className="pcx-dots" aria-hidden="true">
                {imagesList.slice(0, 5).map((_, idx) => (
                  <span key={idx} className={`pcx-dot ${idx === Math.min(activeImageIndex, 4) ? 'is-active' : ''}`} />
                ))}
              </div>
              <span className="pcx-count">
                <Images size={11} strokeWidth={2} aria-hidden="true" />
                <bdi>{activeImageIndex + 1}/{photoCount}</bdi>
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Body ────────────────────────────────────────────── */}
      <div className="pcx-body">
        <div className="pcx-price-row">
          <div className="pcx-price">
            <bdi className="pcx-price-val">{priceData.primary}</bdi>
            <span className="pcx-price-cur">{priceData.symbol}</span>
          </div>
          {benchmark?.pricePerMeterFormatted && (
            <span className="pcx-ppm" title={benchmark.badgeLabel}>
              <bdi>{fmt(benchmark.pricePerMeter)}</bdi>
              <small>{isAr ? 'ج.م/م²' : 'EGP/m²'}</small>
            </span>
          )}
        </div>

        {belowAvgPct > 0 && (
          <span className="pcx-insight" title={isAr ? 'مقارنة استرشادية بمتوسط سعر المتر في المنطقة' : 'Indicative, vs. the district average price per m²'}>
            <TrendingDown size={13} strokeWidth={2} aria-hidden="true" />
            <span>{isAr ? `أقل ${belowAvgPct}% من متوسط المنطقة` : `${belowAvgPct}% below area average`}</span>
          </span>
        )}

        <h3 className="pcx-title">
          <Link to={detailsUrl} onClick={() => announceView(property, title)}>{title}</Link>
        </h3>

        {location && (
          <p className="pcx-loc" title={location}>
            <MapPin size={14} strokeWidth={1.75} aria-hidden="true" />
            <span>{formatCardLocation(location)}</span>
          </p>
        )}

        <ul className="pcx-specs" style={{ '--pcx-cols': specs.length }}>
          {specs.map(({ key, Icon, value, unit, label }) => (
            <li key={key} className="pcx-spec">
              <Icon size={15} strokeWidth={1.75} aria-hidden="true" />
              <span className="pcx-spec-val"><bdi>{value}</bdi>{unit && <small> {unit}</small>}</span>
              <span className="pcx-spec-label">{label}</span>
            </li>
          ))}
        </ul>

        {hasInstallments ? (
          <div className="pcx-finance">
            <div className="pcx-fin-cell">
              <span className="pcx-fin-label">{isAr ? 'المقدم' : 'Down payment'}</span>
              <span className="pcx-fin-val"><bdi>{fmt(property.downPayment)}</bdi> <small>{isAr ? 'ج.م' : 'EGP'}</small></span>
            </div>
            <div className="pcx-fin-cell pcx-fin-cell--accent">
              <span className="pcx-fin-label">
                {isAr ? 'القسط الشهري' : 'Monthly'}
                {installmentYears > 0 && <em>{isAr ? ` · ${installmentYears} سنوات` : ` · ${installmentYears} yrs`}</em>}
              </span>
              <span className="pcx-fin-val"><bdi>{fmt(property.monthlyInstallment)}</bdi> <small>{isAr ? 'ج.م' : 'EGP'}</small></span>
            </div>
          </div>
        ) : (
          <div className="pcx-finance pcx-finance--cash">
            <Wallet size={15} strokeWidth={1.75} aria-hidden="true" />
            <span>{isAr ? 'سداد كاش — بدون أقساط' : 'Cash payment — no installments'}</span>
          </div>
        )}

        <div className="pcx-cta">
          <Link to={detailsUrl} className="pcx-btn-main" onClick={() => announceView(property, title)}>
            <span>{isAr ? 'اطلب تفاصيل الوحدة' : 'Request details'}</span>
            <span className="pcx-btn-arrow" aria-hidden="true">
              {isAr ? <ArrowLeft size={15} /> : <ArrowRight size={15} />}
            </span>
          </Link>
          <button
            type="button"
            className="pcx-btn-wa"
            onClick={openWhatsApp}
            title={isAr ? 'استفسار سريع عبر واتساب' : 'Quick inquiry via WhatsApp'}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="currentColor">
              <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.74 1.21h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm5.8 14.13c-.24.68-1.42 1.3-1.95 1.35-.5.05-.97.23-3.27-.68-2.77-1.09-4.52-3.93-4.66-4.11-.13-.18-1.1-1.47-1.1-2.8 0-1.33.7-1.99.95-2.26.25-.27.54-.34.72-.34h.52c.17 0 .39-.06.61.47.24.56.8 1.94.87 2.08.07.14.12.3.02.48-.09.18-.14.3-.27.46-.14.16-.29.36-.41.48-.14.14-.28.29-.12.56.16.27.71 1.17 1.52 1.9 1.05.93 1.93 1.22 2.2 1.36.27.14.43.11.59-.07.16-.18.68-.79.86-1.07.18-.27.36-.23.61-.14.25.09 1.59.75 1.86.89.27.14.45.2.52.32.07.11.07.66-.17 1.33Z" />
            </svg>
            <span className="pcx-sr">{isAr ? 'واتساب' : 'WhatsApp'}</span>
          </button>
        </div>
      </div>
    </article>
  );
}
