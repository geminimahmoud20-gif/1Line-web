import { useState, useEffect } from 'react';
import { TrendingUp, Award, ArrowUpRight } from 'lucide-react';
import { getAreaById } from '../../utils/areasData';

export default function HistoricalPriceChart({ areaKey = 'east', customPoints = null, lang = 'ar' }) {
  const [, setTick] = useState(0);
  const isAr = lang === 'ar';

  // Live listen for area data modifications from CRM
  useEffect(() => {
    const handleUpdate = () => setTick(t => t + 1);
    window.addEventListener('oneline_areas_updated', handleUpdate);
    return () => window.removeEventListener('oneline_areas_updated', handleUpdate);
  }, []);

  const areaData = getAreaById(areaKey);

  // Points come from the listing or the area data kept in the CRM — never from a built-in series
  const points = (Array.isArray(customPoints) && customPoints.length > 1)
    ? customPoints
    : (areaData?.historicalPrices?.length > 1 ? areaData.historicalPrices : null);

  if (!points) {
    return (
      <div className="historical-price-chart-card">
        <div className="chart-header">
          <div className="chart-title-wrap">
            <div className="chart-icon-glow">
              <TrendingUp size={20} className="text-white" />
            </div>
            <div>
              <h4>{isAr ? 'تاريخ أسعار المنطقة' : 'Area price history'}</h4>
              <p>{isAr ? 'لا توجد بيانات تاريخية منشورة لهذه المنطقة بعد. اطلب من المستشار صفقات مقارنة حديثة.' : 'No published price history for this area yet. Ask an advisor for recent comparable deals.'}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const startPrice = points[0]?.price || 1;
  const currentPrice = points[points.length - 1]?.price || startPrice;
  // Change across the plotted points (not a separate "annual rate" relabelled as cumulative)
  const totalGrowthPercent = Math.round(((currentPrice - startPrice) / startPrice) * 100);
  const firstLabel = String(points[0]?.year || '');
  const lastLabel = String(points[points.length - 1]?.year || '');

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
            <h4>{isAr ? 'تاريخ متوسط سعر المتر في المنطقة' : 'Area average price per m² over time'}</h4>
            <p>{isAr ? `من ${firstLabel} إلى ${lastLabel}` : `From ${firstLabel} to ${lastLabel}`}</p>
          </div>
        </div>

        <div className="growth-summary-badge">
          <ArrowUpRight size={18} />
          <span><bdi>{totalGrowthPercent > 0 ? '+' : ''}{totalGrowthPercent}%</bdi> {isAr ? 'تغيّر خلال الفترة' : 'change over the period'}</span>
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
                    {pt.price.toLocaleString('en-US')} ج.م
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      <div className="chart-footer-note">
        <Award size={14} className="text-gold" />
        <span>{isAr ? 'متوسطات استرشادية يدخلها فريق 1Line في بيانات المنطقة، وليست سجلاً رسمياً للصفقات. الأداء السابق لا يضمن نمواً مستقبلياً.' : 'Indicative averages entered by the 1Line team — not an official transaction ledger. Past changes do not guarantee future growth.'}</span>
      </div>
    </div>
  );
}
