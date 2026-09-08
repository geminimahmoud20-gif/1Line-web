import { useMemo, useState, useEffect } from 'react';
import { TrendingDown, TrendingUp, Sparkles, CheckCircle2, ShieldCheck, BarChart3 } from 'lucide-react';
import { getDistrictBenchmark, formatCurrencyPrice } from '../../utils/currencyAndBenchmark';
import { getAreaById } from '../../utils/areasData';

export default function PriceBenchmarkIndicator({ property, lang = 'ar', currency = 'EGP' }) {
  if (!property) return null;

  const isAr = lang === 'ar';
  const [, setTick] = useState(0);

  // Live listen for area modifications from CRM
  useEffect(() => {
    const handleUpdate = () => setTick(t => t + 1);
    window.addEventListener('oneline_areas_updated', handleUpdate);
    return () => window.removeEventListener('oneline_areas_updated', handleUpdate);
  }, []);

  const areaKey = property.areaKey || 'default';
  const areaData = getAreaById(areaKey);
  const districtAvg = property.customBenchmarkPrice || (areaData && areaData.avgPricePerMeter) || getDistrictBenchmark(areaKey);

  const propertyPricePerM = property.pricePerMeter || Math.round((Number(property.price) || 0) / (Number(property.size) || 1));

  const diffPercent = useMemo(() => {
    const diff = ((propertyPricePerM - districtAvg) / districtAvg) * 100;
    return Math.round(diff);
  }, [propertyPricePerM, districtAvg]);

  const isBelowMarket = diffPercent < -5;
  const isFairMarket = diffPercent >= -5 && diffPercent <= 8;
  const isPremium = diffPercent > 8;

  // Calculate pointer position on 0-100% scale
  // 0% = -25% below avg, 50% = exactly avg, 100% = +25% above avg
  const gaugePercent = Math.max(5, Math.min(95, 50 + (diffPercent * 1.8)));

  const convertedPricePerM = formatCurrencyPrice(propertyPricePerM, currency, lang);
  const convertedAvgPricePerM = formatCurrencyPrice(districtAvg, currency, lang);

  const currentDistrictName = (isAr ? areaData?.name_ar : areaData?.name_en) || (isAr ? 'سوهاج عام' : 'Sohag Average');

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
              <span>{isAr ? `أقل من متوسط الحي بـ ${Math.abs(diffPercent)}% (سعر لقطة)` : `${Math.abs(diffPercent)}% Below Avg (Hot Deal)`}</span>
            </>
          ) : isFairMarket ? (
            <>
              <CheckCircle2 size={14} />
              <span>{isAr ? 'سعر عادل ومطابق لمتوسط الحي' : 'Fair District Market Price'}</span>
            </>
          ) : (
            <>
              <TrendingUp size={14} />
              <span>{isAr ? `أعلى من المتوسط بـ ${diffPercent}% (تشطيب فاخر / موقع استثنائي)` : `${diffPercent}% Above Avg (Prime Luxury)`}</span>
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
          <span className="metric-lbl">{isAr ? 'الجدوى الاستثمارية الميدانية' : 'Investment Viability'}</span>
          <strong className={`metric-val ${isBelowMarket ? 'text-success' : 'text-primary'}`}>
            {isBelowMarket ? (isAr ? '🔥 فرصة ممتازة (طلب مرتفع)' : '🔥 High Demand') : (isAr ? '🛡️ استثمار آمن ومستقر' : '🛡️ Safe Stable Investment')}
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
            ? 'البيانات الاسترشادية مستخرجة من دراسات الصفقات المبرمة الفعلية بسوهاج لعام 2025/2026 بواسطة فريق 1Line الميداني.'
            : 'Benchmarks sourced from verified actual transactions in Sohag by 1Line Field Advisory Team.'}
        </span>
      </div>
    </div>
  );
}
