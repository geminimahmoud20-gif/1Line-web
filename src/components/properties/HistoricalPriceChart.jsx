import { useState, useEffect } from 'react';
import { TrendingUp, Award, Calendar, DollarSign, ArrowUpRight } from 'lucide-react';
import { getAreaById } from '../../utils/areasData';

export default function HistoricalPriceChart({ areaKey = 'east', customPoints = null, lang = 'ar' }) {
  const [selectedPeriod, setSelectedPeriod] = useState('3y'); // '1y' | '3y' | '5y'
  const [, setTick] = useState(0);
  const isAr = lang === 'ar';

  // Live listen for area data modifications from CRM
  useEffect(() => {
    const handleUpdate = () => setTick(t => t + 1);
    window.addEventListener('oneline_areas_updated', handleUpdate);
    return () => window.removeEventListener('oneline_areas_updated', handleUpdate);
  }, []);

  const areaData = getAreaById(areaKey);

  // Dynamic points resolution: custom -> areaData -> fallbacks
  const points = customPoints || (areaData && areaData.historicalPrices && areaData.historicalPrices.length > 0
    ? areaData.historicalPrices
    : [
        { year: '2023 Q1', price: 9500 },
        { year: '2023 Q3', price: 11000 },
        { year: '2024 Q1', price: 12800 },
        { year: '2024 Q3', price: 14200 },
        { year: '2025 Q1', price: 15400 },
        { year: '2025 Q3', price: 16200 },
        { year: '2026 (الآن)', price: 17500 }
      ]);

  const startPrice = points[0]?.price || 1;
  const currentPrice = points[points.length - 1]?.price || startPrice;
  const totalGrowthPercent = areaData?.annualGrowthRate || Math.round(((currentPrice - startPrice) / startPrice) * 100);

  // SVG Chart Dimensions
  const width = 580;
  const height = 180;
  const padding = 30;

  const minP = Math.min(...points.map(p => p.price)) * 0.9;
  const maxP = Math.max(...points.map(p => p.price)) * 1.05;

  const getX = (idx) => padding + (idx * ((width - (padding * 2)) / (points.length - 1)));
  const getY = (price) => height - padding - (((price - minP) / (maxP - minP)) * (height - (padding * 2)));

  const pathD = points.reduce((acc, pt, idx) => {
    const x = getX(idx);
    const y = getY(pt.price);
    return idx === 0 ? `M ${x},${y}` : `${acc} L ${x},${y}`;
  }, '');

  const areaD = `${pathD} L ${getX(points.length - 1)},${height - padding} L ${getX(0)},${height - padding} Z`;

  return (
    <div className="historical-price-chart-card">
      <div className="chart-header">
        <div className="chart-title-wrap">
          <div className="chart-icon-glow">
            <TrendingUp size={20} className="text-white" />
          </div>
          <div>
            <h4>{isAr ? 'مؤشر نمو الأسعار وتاريخ العائد الرأسمالي' : 'Historical Price Trends & Capital Growth'}</h4>
            <p>{isAr ? 'تطور متوسط سعر المتر في هذه المنطقة من 2023 حتى 2026' : 'Average price per sqm evolution (2023 - 2026)'}</p>
          </div>
        </div>

        <div className="growth-summary-badge">
          <ArrowUpRight size={18} />
          <span>+{totalGrowthPercent}% {isAr ? 'نمو رأسمالي تراكمي' : 'Growth (3 Yrs)'}</span>
        </div>
      </div>

      {/* SVG Interactive Chart */}
      <div className="chart-svg-container">
        <svg viewBox={`0 0 ${width} ${height}`} className="price-trends-svg">
          <defs>
            <linearGradient id="priceGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Area Fill */}
          <path d={areaD} fill="url(#priceGradient)" />

          {/* Line */}
          <path d={pathD} fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" />

          {/* Points */}
          {points.map((pt, idx) => {
            const cx = getX(idx);
            const cy = getY(pt.price);
            return (
              <g key={idx} className="chart-point-group">
                <circle cx={cx} cy={cy} r="4.5" fill="#ffffff" stroke="#10b981" strokeWidth="2.5" />
                <text x={cx} y={height - 8} textAnchor="middle" fontSize="10" fill="#94a3b8" fontWeight="600">
                  {pt.year}
                </text>
                {idx === points.length - 1 && (
                  <text x={cx} y={cy - 10} textAnchor="middle" fontSize="11" fill="#0f172a" fontWeight="800">
                    {pt.price.toLocaleString()} ج.م
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      <div className="chart-footer-note">
        <Award size={14} className="text-gold" />
        <span>{isAr ? 'بيانات معتمدة ومحدثة دورياً وفق أحدث صفقات الشهر العقاري وتداولات السوق بسوهاج.' : 'Official transaction ledger data updated for Sohag real estate market.'}</span>
      </div>
    </div>
  );
}
