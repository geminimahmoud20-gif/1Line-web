import { getPriceBenchmark, formatCurrencyPrice } from '../../utils/currencyAndBenchmark';
import { X, Star, Maximize2, Calendar, ShieldCheck, FileCheck2, MapPin, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

// One property's column in the comparison matrix.
export default function CompareColumn({ prop, isAr, lang, currency, verdicts, customDownPercent, onRemoveFromCompare, activeTab, setCustomDownPercent, onClose }) {
  const title = isAr ? prop.title_ar : prop.title_en;
  const location = isAr ? prop.locationName_ar : prop.locationName_en;
  const finishing = isAr ? prop.finishing_ar : prop.finishing_en;
  const ppm = prop.pricePerMeter || (prop.size ? Math.round(prop.price / prop.size) : 0);
  const benchmark = getPriceBenchmark(prop, lang);
  const priceData = formatCurrencyPrice(prop.price, currency, lang);
  const isBestPpm = prop.id === verdicts.bestPpmId;
  const isLargest = prop.id === verdicts.largestAreaId;
  const isLowestMonthly = prop.id === verdicts.lowestMonthlyId;

  // Simulator Math
  const simDownVal = Math.round((prop.price * customDownPercent) / 100);
  const simYears = prop.installmentYears || 5;
  const simMonthlyVal = Math.round((prop.price - simDownVal) / (simYears * 12));

  // Area relative bar percentage
  const maxArea = verdicts.maxSize || 1;
  const areaPercent = Math.min(100, Math.round(((Number(prop.size) || 0) / maxArea) * 100));

  return (
    <div className="compare-property-col">
      {/* Top Header Box */}
      <div className="compare-cell cell-header">
        <button
          type="button"
          className="remove-compare-item-btn"
          onClick={() => onRemoveFromCompare(prop.id)}
          title={isAr ? 'إزالة من المقارنة' : 'Remove'}
        >
          <X size={14} />
        </button>

        {/* Top Winner Tag */}
        {isBestPpm && (
          <div className="prop-winner-badge best-ppm">
            <Star size={11} />
            <span>{isAr ? 'أفضل سعر للمتر' : 'Best Value / m²'}</span>
          </div>
        )}
        {!isBestPpm && isLargest && (
          <div className="prop-winner-badge largest-area">
            <Maximize2 size={11} />
            <span>{isAr ? 'أكبر مساحة' : 'Largest Area'}</span>
          </div>
        )}
        {!isBestPpm && !isLargest && isLowestMonthly && (
          <div className="prop-winner-badge lowest-pay">
            <Calendar size={11} />
            <span>{isAr ? 'أقل قسط' : 'Lowest Pay'}</span>
          </div>
        )}

        <div className="compare-thumb-wrap">
          <img 
            src={prop.images && prop.images[0] ? prop.images[0] : ''} 
            alt={title} 
            className="compare-thumb" 
          />
        </div>
        <h4 className="compare-prop-title" title={title}>{title}</h4>
      </div>

      {/* Pricing Section */}
      {(activeTab === 'all' || activeTab === 'financial') && (
        <>
          <div className="compare-section-divider-spacer" />

          {/* Total Price */}
          <div className="compare-cell highlight-gold">
            <strong className="cell-price-big">
              {priceData.primary} {priceData.symbol}
            </strong>
          </div>

          {/* Price Per SqM */}
          <div className="compare-cell">
            <span className={`cell-ppm-val ${isBestPpm ? 'text-gold fw-bold' : ''}`}>
              {ppm.toLocaleString('en-US')} {isAr ? 'ج.م / م²' : 'EGP / m²'}
            </span>
          </div>

          {/* Benchmark Comparison */}
          <div className="compare-cell">
            {benchmark ? (
              <div 
                className="benchmark-badge-compare" 
                style={{ background: benchmark.badgeBg, color: benchmark.badgeColor }}
              >
                {benchmark.badgeLabel}
              </div>
            ) : (
              <span className="text-muted">{isAr ? 'سعر عادل ومعتمد' : 'Standard Market Rate'}</span>
            )}
          </div>

          {/* Downpayment */}
          <div className="compare-cell">
            {prop.downPayment ? (
              <span className="fw-semibold">
                {prop.downPayment.toLocaleString('en-US')} {isAr ? 'ج.م' : 'EGP'}
                <span className="text-muted" style={{ fontSize: '0.75rem', marginRight: '4px' }}>
                  ({Math.round((prop.downPayment / prop.price) * 100)}%)
                </span>
              </span>
            ) : (
              <span className="text-muted">{isAr ? 'كاش / تفاوض' : 'Cash / Special'}</span>
            )}
          </div>

          {/* Monthly Installment */}
          <div className="compare-cell highlight-blue">
            {prop.monthlyInstallment ? (
              <strong className="text-emerald">
                {prop.monthlyInstallment.toLocaleString('en-US')} {isAr ? 'ج.م/شهر' : 'EGP/mo'}
              </strong>
            ) : (
              <span className="text-muted">{isAr ? 'غير متاح (كاش)' : 'N/A (Cash only)'}</span>
            )}
          </div>

          {/* Installment Years */}
          <div className="compare-cell">
            {prop.installmentYears ? (
              <span>{prop.installmentYears} {isAr ? 'سنوات تقسيط مريح' : 'Years flexible'}</span>
            ) : (
              <span className="text-muted">{isAr ? 'سداد فوري كاش' : 'Cash on delivery'}</span>
            )}
          </div>
        </>
      )}

      {/* Interactive Simulator Section */}
      {(activeTab === 'all' || activeTab === 'financial') && (
        <>
          <div className="compare-section-divider-spacer" />

          <div className="compare-cell highlight-simulator" style={{ minHeight: '62px' }}>
            <div className="sim-cell-box">
              <span className="sim-down-val">{simDownVal.toLocaleString('en-US')} {isAr ? 'ج.م' : 'EGP'}</span>
              <div className="sim-slider-wrap">
                <span className="sim-slider-pct">{customDownPercent}%</span>
                <input 
                  type="range" 
                  min="10" 
                  max="50" 
                  step="5" 
                  value={customDownPercent} 
                  onChange={(e) => setCustomDownPercent(Number(e.target.value))}
                  className="sim-range-input"
                  title={isAr ? 'تغيير نسبة المقدم' : 'Adjust Downpayment %'}
                />
              </div>
            </div>
          </div>

          <div className="compare-cell highlight-simulator" style={{ minHeight: '62px' }}>
            <div className="sim-cell-box">
              <span className="sim-monthly-val">~ {simMonthlyVal.toLocaleString('en-US')} {isAr ? 'ج.م/شهر' : 'EGP/mo'}</span>
              <span className="sim-sub-note">
                {isAr ? `على ${simYears} سنوات` : `over ${simYears} yrs`}
              </span>
            </div>
          </div>
        </>
      )}

      {/* Specs Section */}
      {(activeTab === 'all' || activeTab === 'specs') && (
        <>
          <div className="compare-section-divider-spacer" />

          {/* Space with visual bar */}
          <div className="compare-cell">
            <div className="area-cell-container">
              <span className="area-number">{prop.size} {isAr ? 'م²' : 'm²'}</span>
              <div className="area-progress-track">
                <div 
                  className="area-progress-fill" 
                  style={{ width: `${areaPercent}%` }} 
                />
              </div>
            </div>
          </div>

          {/* Bedrooms & Bathrooms / Sector Specific */}
          <div className="compare-cell">
            <span>
              {prop.type === 'land' ? (
                prop.landType_ar || (isAr ? 'أرض استثمارية' : 'Land Plot')
              ) : (prop.type === 'commercial' || prop.category === 'commercial') ? (
                prop.commercialType_ar || (isAr ? 'محل تجاري واجهة' : 'Retail Shop')
              ) : (prop.type === 'office' || prop.category === 'administrative') ? (
                prop.adminType_ar || (isAr ? 'مقر إداري / عيادة' : 'Admin Office / Clinic')
              ) : (
                `${prop.bedrooms || 0} ${isAr ? 'غرف' : 'Beds'} • ${prop.bathrooms || 0} ${isAr ? 'حمام' : 'Baths'}`
              )}
            </span>
          </div>

          {/* Floor */}
          <div className="compare-cell">
            <span>
              {prop.type === 'land' ? (
                isAr ? 'قطعة أرض مستقلة' : 'Independent Plot'
              ) : prop.floor !== undefined && prop.floor !== null ? (
                prop.floor === 0 
                  ? (isAr ? 'دور أرضي' : 'Ground Floor')
                  : (isAr ? `الدور ${prop.floor}` : `Floor ${prop.floor}`)
              ) : (
                isAr ? 'أرضي / متكرر' : 'Typical'
              )}
              {prop.type !== 'land' && prop.totalFloors ? ` (${isAr ? `من أصل ${prop.totalFloors}` : `of ${prop.totalFloors}`})` : ''}
            </span>
          </div>

          {/* Finishing */}
          <div className="compare-cell">
            <span className="finishing-chip-badge">
              {finishing || (isAr ? 'سوبر لوكس' : 'Super Lux')}
            </span>
          </div>

          {/* View & Facade */}
          <div className="compare-cell">
            <span>
              {prop.features_ar?.find(f => f.includes('بحرية') || f.includes('نيل') || f.includes('واجهة') || f.includes('شارع')) 
                || (isAr ? 'واجهة رئيسية مفتوحة' : 'Open Main Facade')}
            </span>
          </div>

          {/* Delivery Status */}
          <div className="compare-cell">
            <span className={prop.completionStatus === 'ready' ? 'text-emerald fw-semibold' : 'text-amber'}>
              {prop.completionStatus === 'ready' 
                ? (isAr ? '✅ جاهز للاستلام الفوري' : '✅ Ready for Immediate Handover') 
                : (isAr ? '🏗️ تحت الإنشاء' : '🏗️ Under Construction')}
            </span>
          </div>
        </>
      )}

      {/* Legal Section */}
      {(activeTab === 'all' || activeTab === 'legal') && (
        <>
          <div className="compare-section-divider-spacer" />

          {/* Ownership Type */}
          <div className="compare-cell text-emerald">
            <div className="cell-legal-item">
              <ShieldCheck size={14} className="legal-icon" />
              <span>{prop.legalStatus?.ownershipType_ar || (isAr ? 'تحت المراجعة' : 'Under review')}</span>
            </div>
          </div>

          {/* License */}
          <div className="compare-cell">
            <div className="cell-legal-item">
              <FileCheck2 size={14} className="legal-icon text-gold" />
              <span>{prop.legalStatus?.licenseStatus_ar || '—'}</span>
            </div>
          </div>

          {/* Land Share */}
          <div className="compare-cell">
            <span>{prop.legalStatus?.landShare_ar || '—'}</span>
          </div>

          {/* Safety Score */}
          <div className="compare-cell">
            <span className="legal-score-pill">
              🛡️ {prop.legalStatus ? (isAr ? 'مستندات مراجَعة' : 'Documents reviewed') : (isAr ? 'المراجعة عند الطلب' : 'Review on request')}
            </span>
          </div>
        </>
      )}

      {/* Location & Action Section */}
      <div className="compare-section-divider-spacer" />

      {/* District Location */}
      <div className="compare-cell text-muted">
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <MapPin size={13} className="text-gold" />
          <span>{location}</span>
        </div>
      </div>

      {/* Action Cell */}
      <div className="compare-cell cell-footer">
        <Link
          to={`/properties/${prop.id}`}
          className="btn btn-primary btn-sm btn-full"
          onClick={onClose}
        >
          <span>{isAr ? 'معاينة العقار' : 'View Unit'}</span>
          <ExternalLink size={13} />
        </Link>
      </div>
    </div>
  );
                
}
