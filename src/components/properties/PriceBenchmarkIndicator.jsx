import { useState, useEffect } from 'react';
import { TrendingDown, TrendingUp, CheckCircle2, ShieldCheck, BarChart3, Building2, Store, Home, Layers } from 'lucide-react';
import { getDistrictBenchmark, formatCurrencyPrice, isMultiUnitOrBuilding, parseUnitBreakdown } from '../../utils/currencyAndBenchmark';
import { getAreaById } from '../../utils/areasData';

export default function PriceBenchmarkIndicator({ property, lang = 'ar', currency = 'EGP' }) {
  const isAr = lang === 'ar';
  const [, setTick] = useState(0);

  // Live listen for area modifications from CRM
  useEffect(() => {
    const handleUpdate = () => setTick(t => t + 1);
    window.addEventListener('oneline_areas_updated', handleUpdate);
    return () => window.removeEventListener('oneline_areas_updated', handleUpdate);
  }, []);

  const isMultiUnit = isMultiUnitOrBuilding(property);
  const unitBreakdown = isMultiUnit ? parseUnitBreakdown(property, isAr) : null;
  const areaKey = property?.areaKey || 'default';
  const areaData = getAreaById(areaKey);
  const districtAvg = property?.customBenchmarkPrice || (areaData && areaData.avgPricePerMeter) || getDistrictBenchmark(areaKey);
  const currentDistrictName = (isAr ? areaData?.name_ar : areaData?.name_en) || (isAr ? 'سوهاج عام' : 'Sohag Average');

  // Multi-unit mixed-use building view (e.g. 4 apartments + 3 shops, multi-floor house)
  if (isMultiUnit) {
    const totalPriceFormatted = formatCurrencyPrice(property?.price, currency, lang);
    return (
      <div className="price-benchmark-card multi-unit-valuation-card">
        <div className="benchmark-header">
          <div className="benchmark-title-wrap">
            <Building2 size={19} className="text-gold" />
            <h4>
              {isAr
                ? `تقييم الكيان ومكونات العقار (حي ${currentDistrictName})`
                : `Multi-Unit Asset Valuation (${currentDistrictName})`}
            </h4>
          </div>
          <span className="benchmark-pill pill-fair" style={{ background: 'rgba(11, 78, 162, 0.12)', color: '#0b4ea2', borderColor: 'rgba(11, 78, 162, 0.25)' }}>
            <Building2 size={13} style={{ marginInlineEnd: '4px' }} />
            <span>{isAr ? 'عقار كامل (سكني + تجاري)' : 'Multi-Unit Building'}</span>
          </span>
        </div>

        <div style={{
          marginTop: '12px',
          marginBottom: '14px',
          padding: '10px 14px',
          borderRadius: '8px',
          background: 'rgba(11, 78, 162, 0.05)',
          border: '1px solid rgba(11, 78, 162, 0.12)',
          fontSize: '0.82rem',
          lineHeight: '1.55',
          color: 'var(--text-secondary)'
        }}>
          <strong>{isAr ? '💡 خصوصية تقييم المنازل والعمارات:' : '💡 Valuation Framework:'} </strong>
          {isAr
            ? 'هذا العقار يتكون من عدة أدوار ويشمل شققاً سكنية ومحلات تجارية. السعر الإجمالي يشمل مسطح الأرض والمباني بالكامل، ولا يخضع لقسمة السعر على مساحة الأرض فقط لاختلاف تسعير التجاري عن السكني وتعدد الأدوار.'
            : 'This is a multi-story building containing both residential and commercial units. The total lump-sum covers land and built-up area across all floors, so flat (price / footprint area) does not apply.'}
        </div>

        {/* Breakdown Metric Grid */}
        <div className="benchmark-metrics-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
          <div className="benchmark-metric-box">
            <span className="metric-lbl" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Layers size={13} className="text-gold" />
              <span>{isAr ? 'مسطح الأرض' : 'Plot Footprint'}</span>
            </span>
            <strong className="metric-val text-primary">
              {Number(property?.size || 0).toLocaleString('en-US')} {isAr ? 'م²' : 'm²'}
            </strong>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{isAr ? 'حصة الأرض الأساسية' : 'Full land title'}</span>
          </div>

          <div className="benchmark-metric-box">
            <span className="metric-lbl" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Store size={13} className="text-gold" />
              <span>{isAr ? 'الوحدات التجارية' : 'Commercial Shops'}</span>
            </span>
            <strong className="metric-val" style={{ color: '#d97706' }}>
              {unitBreakdown?.commercialUnits ? `${unitBreakdown.commercialUnits} ${isAr ? 'محلات' : 'Shops'}` : (isAr ? 'محلات بالدور الأرضي' : 'Ground Retail')}
            </strong>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{isAr ? 'مناسب للاستثمار والتأجير' : 'Suited to rental investment'}</span>
          </div>

          <div className="benchmark-metric-box">
            <span className="metric-lbl" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Home size={13} className="text-gold" />
              <span>{isAr ? 'الوحدات السكنية' : 'Residential Units'}</span>
            </span>
            <strong className="metric-val text-primary">
              {unitBreakdown?.residentialUnits ? `${unitBreakdown.residentialUnits} ${isAr ? 'شقق' : 'Apts'}` : (isAr ? 'شقق بالأدوار العليا' : 'Upper Floors')}
            </strong>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              {unitBreakdown?.floors ? `${unitBreakdown.floors} ${isAr ? 'طوابق' : 'Floors'}` : (isAr ? 'أدوار متكررة' : 'Multiple floors')}
            </span>
          </div>

          <div className="benchmark-metric-box">
            <span className="metric-lbl">{isAr ? 'إجمالي سعر العقار' : 'Total Package Price'}</span>
            <strong className="metric-val text-primary" style={{ color: 'var(--brand-primary, #0b4ea2)' }}>
              {totalPriceFormatted.primary} {totalPriceFormatted.symbol}
            </strong>
            {totalPriceFormatted.isConverted && (
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                ≈ {totalPriceFormatted.originalEgp}
              </span>
            )}
          </div>
        </div>

        <div style={{
          marginTop: '12px',
          padding: '8px 12px',
          background: 'rgba(11, 78, 162, 0.04)',
          border: '1px solid rgba(11, 78, 162, 0.1)',
          borderRadius: '8px',
          fontSize: '0.75rem',
          color: 'var(--text-secondary)',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}>
          <ShieldCheck size={14} className="text-gold" style={{ flexShrink: 0 }} />
          <span>
            {isAr
              ? 'توجيه استشاري: يتكون العائد الاستثماري لهذا الأصل من التدفق النقدي المستقل للمحلات التجارية مضافاً إليه القيمة الإيجارية أو الرأسمالية للشقق السكنية.'
              : 'Advisory Note: Total investment return is calculated from standalone commercial shop cash flows plus residential apartment capital value.'}
          </span>
        </div>
      </div>
    );
  }

  // Always price ÷ size for single-unit properties
  const propertyPricePerM = Math.round((Number(property?.price) || 0) / (Number(property?.size) || 1));

  // Plain math (no hook): this runs after the multi-unit early return above
  const diffPercent = property && districtAvg ? Math.round(((propertyPricePerM - districtAvg) / districtAvg) * 100) : 0;

  if (!property) return null;

  const isBelowMarket = diffPercent < -5;
  const isFairMarket = diffPercent >= -5 && diffPercent <= 8;

  // Calculate pointer position on 0-100% scale
  // 0% = -25% below avg, 50% = exactly avg, 100% = +25% above avg
  const gaugePercent = Math.max(5, Math.min(95, 50 + (diffPercent * 1.8)));

  const convertedPricePerM = formatCurrencyPrice(propertyPricePerM, currency, lang);
  const convertedAvgPricePerM = formatCurrencyPrice(districtAvg, currency, lang);

  return (
    <div className="price-benchmark-card">
      <div className="benchmark-header">
        <div className="benchmark-title-wrap">
          <BarChart3 size={18} className="text-gold" />
          <h4>{isAr ? 'مؤشر عدالة السعر وتحليل القيمة (حي ' + currentDistrictName + ')' : `Price Benchmark & District Analysis (${currentDistrictName})`}</h4>
        </div>
        <span className={`benchmark-pill ${isBelowMarket ? 'pill-opportunity' : isFairMarket ? 'pill-fair' : 'pill-premium'}`}>
          {isBelowMarket ? (
            <>
              <TrendingDown size={14} />
              <span>{isAr ? `أقل من متوسط الحي بـ ${Math.abs(diffPercent)}%` : `${Math.abs(diffPercent)}% below area average`}</span>
            </>
          ) : isFairMarket ? (
            <>
              <CheckCircle2 size={14} />
              <span>{isAr ? 'سعر عادل ومطابق لمتوسط الحي' : 'Fair District Market Price'}</span>
            </>
          ) : (
            <>
              <TrendingUp size={14} />
              <span>{isAr ? `أعلى من متوسط الحي بـ ${diffPercent}%` : `${diffPercent}% above area average`}</span>
            </>
          )}
        </span>
      </div>

      {/* 📊 Visual Three-Zone Benchmark Meter Gauge */}
      <div className="benchmark-gauge-wrapper" style={{ marginTop: '16px', marginBottom: '16px' }}>
        <div className="benchmark-gauge-labels" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px' }}>
          <span style={{ color: '#10b981' }}>🟢 {isAr ? 'لقطة (أقل من السوق)' : 'Deal (Below Avg)'}</span>
          <span style={{ color: '#0b4ea2' }}>🔵 {isAr ? 'سعر عادل ومتوازن' : 'Fair Market'}</span>
          <span style={{ color: '#d97706' }}>🟡 {isAr ? 'بريميوم وفاخر' : 'Prime Luxury'}</span>
        </div>

        {/* Gauge Track */}
        <div className="benchmark-gauge-track" style={{
          position: 'relative',
          height: '10px',
          borderRadius: '999px',
          background: 'linear-gradient(90deg, #10b981 0%, #34d399 30%, #0b4ea2 50%, #38bdf8 70%, #f59e0b 88%, #ef4444 100%)',
          boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.2)'
        }}>
          {/* Indicator Pointer Needle */}
          <div 
            className="gauge-pointer" 
            style={{
              position: 'absolute',
              top: '-6px',
              left: isAr ? `${100 - gaugePercent}%` : `${gaugePercent}%`,
              transform: 'translateX(-50%)',
              width: '22px',
              height: '22px',
              borderRadius: '50%',
              background: '#ffffff',
              border: '3px solid #0b4ea2',
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'left 0.4s ease'
            }}
            title={isAr ? `موقع العقار: ${diffPercent > 0 ? '+' : ''}${diffPercent}% عن متوسط الحي` : `Position: ${diffPercent > 0 ? '+' : ''}${diffPercent}% vs avg`}
          >
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#0b4ea2' }} />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '6px', opacity: 0.85 }}>
          <span>-25%</span>
          <span>{isAr ? 'متوسط الحي (0%)' : 'District Avg (0%)'}</span>
          <span>+25%</span>
        </div>
      </div>

      {/* Metrics Breakdown Grid */}
      <div className="benchmark-metrics-grid">
        <div className="benchmark-metric-box">
          <span className="metric-lbl">{isAr ? 'سعر المتر في هذه الوحدة' : 'Unit Price / Sqm'}</span>
          <strong className="metric-val text-primary">
            {convertedPricePerM.primary} {convertedPricePerM.symbol}/م²
          </strong>
          {convertedPricePerM.isConverted && (
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              ≈ {convertedPricePerM.originalEgp}/م²
            </span>
          )}
        </div>

        <div className="benchmark-metric-box">
          <span className="metric-lbl">{isAr ? `متوسط م² بحي ${currentDistrictName}` : `${currentDistrictName} Avg / Sqm`}</span>
          <strong className="metric-val text-muted">
            {convertedAvgPricePerM.primary} {convertedAvgPricePerM.symbol}/م²
          </strong>
        </div>

        <div className="benchmark-metric-box">
          {/* A measured difference, not a verdict on the investment */}
          <span className="metric-lbl">{isAr ? 'الفرق عن متوسط المنطقة' : 'Difference vs area average'}</span>
          <strong className={`metric-val ${isBelowMarket ? 'text-success' : 'text-primary'}`}>
            <bdi>{diffPercent > 0 ? '+' : ''}{diffPercent}%</bdi>
          </strong>
        </div>
      </div>

      <div style={{
        marginTop: '12px',
        padding: '8px 12px',
        background: 'rgba(11, 78, 162, 0.04)',
        border: '1px solid rgba(11, 78, 162, 0.1)',
        borderRadius: '8px',
        fontSize: '0.75rem',
        color: 'var(--text-secondary)',
        display: 'flex',
        alignItems: 'center',
        gap: '6px'
      }}>
        <ShieldCheck size={14} className="text-gold" style={{ flexShrink: 0 }} />
        <span>
          {isAr
            ? 'متوسط سعر المتر في المنطقة رقم استرشادي يحدّثه فريق 1Line من لوحة التحكم، ويختلف حسب الدور والتشطيب والواجهة.'
            : 'The area average is an indicative figure maintained by the 1Line team; floor, finishing and frontage change it.'}
        </span>
      </div>
    </div>
  );
}
