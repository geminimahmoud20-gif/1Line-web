import { useMemo } from 'react';
import { TrendingDown, TrendingUp, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';

export default function PriceBenchmarkIndicator({ property, lang = 'ar' }) {
  const isAr = lang === 'ar';

  // Benchmark data per area in Sohag (average market price per sqm in EGP)
  const areaAverages = {
    east: { avgPricePerM: 19500, label_ar: 'متوسط أسعار شرق سوهاج والجمهورية', label_en: 'East Sohag & Republic St. Average' },
    west: { avgPricePerM: 14500, label_ar: 'متوسط أسعار غرب سوهاج والمحطة', label_en: 'West Sohag Average' },
    new_sohag: { avgPricePerM: 16000, label_ar: 'متوسط أسعار مدينة سوهاج الجديدة', label_en: 'New Sohag City Average' },
    corniche: { avgPricePerM: 26000, label_ar: 'متوسط أسعار النيل والكورنيش المباشر', label_en: 'Nile Corniche Direct Waterfront Average' },
    akhmim: { avgPricePerM: 11000, label_ar: 'متوسط أسعار أخميم والامتداد العمراني', label_en: 'Akhmim & Urban Extension Average' }
  };

  const propertyPricePerM = property.pricePerMeter || Math.round(property.price / property.size);
  const benchmark = areaAverages[property.areaKey] || areaAverages.east;

  const diffPercent = useMemo(() => {
    const diff = ((propertyPricePerM - benchmark.avgPricePerM) / benchmark.avgPricePerM) * 100;
    return Math.round(diff);
  }, [propertyPricePerM, benchmark]);

  const isBelowMarket = diffPercent < 0;
  const isFairMarket = diffPercent >= 0 && diffPercent <= 5;
  const isPremium = diffPercent > 5;

  return (
    <div className="price-benchmark-card">
      <div className="benchmark-header">
        <div className="benchmark-title-wrap">
          <Sparkles size={18} className="text-gold" />
          <h4>{isAr ? 'مؤشر التقييم السعري ومقارنة أسعار المنطقة' : 'Market Price Benchmark & Valuation'}</h4>
        </div>
        <span className={`benchmark-pill ${isBelowMarket ? 'pill-opportunity' : isFairMarket ? 'pill-fair' : 'pill-premium'}`}>
          {isBelowMarket ? (
            <>
              <TrendingDown size={14} />
              <span>{isAr ? `أقل من سعر السوق بـ ${Math.abs(diffPercent)}% (فرصة استثمارية)` : `${Math.abs(diffPercent)}% Below Market`}</span>
            </>
          ) : isFairMarket ? (
            <>
              <CheckCircle2 size={14} />
              <span>{isAr ? 'سعر عادل ومطابق لسعر السوق' : 'Fair Market Price'}</span>
            </>
          ) : (
            <>
              <TrendingUp size={14} />
              <span>{isAr ? `أعلى من متوسط المنطقة بـ ${diffPercent}% (تشطيب فاخر)` : `${diffPercent}% Above Average`}</span>
            </>
          )}
        </span>
      </div>

      <div className="benchmark-metrics-grid">
        <div className="benchmark-metric-box">
          <span className="metric-lbl">{isAr ? 'سعر المتر في هذه الوحدة' : 'This Unit Price / Sqm'}</span>
          <strong className="metric-val text-primary">{propertyPricePerM.toLocaleString()} {isAr ? 'ج.م / م²' : 'EGP/sqm'}</strong>
        </div>

        <div className="benchmark-metric-box">
          <span className="metric-lbl">{isAr ? benchmark.label_ar : benchmark.label_en}</span>
          <strong className="metric-val text-muted">{benchmark.avgPricePerM.toLocaleString()} {isAr ? 'ج.م / م²' : 'EGP/sqm'}</strong>
        </div>

        <div className="benchmark-metric-box">
          <span className="metric-lbl">{isAr ? 'تقييم الجدوى الاستثمارية' : 'Investment Rating'}</span>
          <strong className={`metric-val ${isBelowMarket ? 'text-success' : 'text-primary'}`}>
            {isBelowMarket ? (isAr ? 'ممتاز (طلب مرتفع)' : 'Excellent') : (isAr ? 'جيد جداً' : 'Very Good')}
          </strong>
        </div>
      </div>
    </div>
  );
}
